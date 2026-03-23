---
name: aws-iam-security
description: "AWS IAM security — least privilege policies, roles, OIDC, permission boundaries, SCPs, and access audit."
risk: low
source: custom
date_added: '2026-03-20'
---

# AWS IAM Security

Expert guide to AWS IAM policies, roles, and security best practices.

## Use this skill when

- Designing IAM roles and policies with least privilege
- Implementing cross-account access, OIDC federation, or service-linked roles
- Auditing IAM permissions and identifying over-privileged entities
- Setting up permission boundaries, SCPs, and guardrails

## Do not use this skill when

- Working with non-AWS identity providers outside AWS context
- Application-level authorization (use app framework)

---

## Least Privilege Policy Design

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadSpecificBucket",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::myapp-prod-assets",
        "arn:aws:s3:::myapp-prod-assets/*"
      ]
    },
    {
      "Sid": "WriteToDynamoDB",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789:table/orders"
    },
    {
      "Sid": "PublishToSNS",
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:123456789:order-notifications"
    }
  ]
}
```

### Condition Keys for Fine-Grained Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RestrictToOwnObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::uploads/*",
      "Condition": {
        "StringLike": {
          "s3:prefix": "${aws:PrincipalTag/team}/*"
        }
      }
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Action": "s3:PutObject",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "RequireMFA",
      "Effect": "Deny",
      "Action": ["iam:*", "sts:*"],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

## ECS Task Roles

```hcl
# Execution role (ECS agent uses to pull images, push logs)
resource "aws_iam_role" "ecs_execution" {
  name = "${var.name}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task role (application code uses for AWS API calls)
resource "aws_iam_role" "ecs_task" {
  name = "${var.name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Attach only the specific permissions the app needs
resource "aws_iam_role_policy" "app_permissions" {
  name = "app-permissions"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage"]
        Resource = aws_sqs_queue.orders.arn
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.region}:${var.account_id}:secret:${var.env}/*"
      }
    ]
  })
}
```

## GitHub Actions OIDC

```hcl
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_deploy" {
  name = "github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:ref:refs/heads/main"
        }
      }
    }]
  })
}
```

## Permission Boundaries

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowedServices",
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "dynamodb:*",
        "sqs:*",
        "sns:*",
        "lambda:*",
        "logs:*",
        "cloudwatch:*",
        "ecr:*",
        "ecs:*"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyIAMEscalation",
      "Effect": "Deny",
      "Action": [
        "iam:CreateUser",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePermissionsBoundary"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyOrganizationChanges",
      "Effect": "Deny",
      "Action": "organizations:*",
      "Resource": "*"
    }
  ]
}
```

## IAM Access Audit

```bash
# Find unused roles
aws iam generate-credential-report
aws iam get-credential-report --output text --query Content | base64 -d

# Last accessed information
aws iam generate-service-last-accessed-details --arn arn:aws:iam::123456789:role/my-role
aws iam get-service-last-accessed-details --job-id <job-id>

# Find policies with wildcard actions
aws iam list-policies --scope Local --query 'Policies[].Arn' | \
  xargs -I{} aws iam get-policy-version --policy-arn {} --version-id v1

# IAM Access Analyzer (finds external access)
aws accessanalyzer list-findings --analyzer-arn <analyzer-arn>
```

## Security Checklist

- [ ] No root account usage (use SSO/federation)
- [ ] MFA required for all human users
- [ ] No long-lived access keys (use OIDC or instance profiles)
- [ ] Least privilege policies (no `*` actions or resources in prod)
- [ ] Permission boundaries on all developer-created roles
- [ ] SCPs at organization level for guardrails
- [ ] IAM Access Analyzer enabled
- [ ] Credential report reviewed monthly
- [ ] Unused roles and policies cleaned up
- [ ] Cross-account access uses external ID condition

## Common Pitfalls

1. **Wildcard resources** — `"Resource": "*"` grants access to ALL resources of that type.
2. **Missing condition keys** — Always scope S3 to specific buckets, DynamoDB to specific tables.
3. **Confusing task role vs execution role** — Execution role is for ECS agent; task role is for your app.
4. **Long-lived access keys** — Use OIDC, instance profiles, or SSO instead.
5. **No permission boundaries** — Without boundaries, developers can create admin roles.
6. **Overly permissive managed policies** — `AmazonS3FullAccess` grants access to ALL buckets in the account.
