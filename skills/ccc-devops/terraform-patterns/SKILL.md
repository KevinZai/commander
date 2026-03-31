---
name: Terraform Patterns
description: "Terraform patterns — reusable modules, remote state, workspaces, drift detection, cost estimation, and importing existing infrastructure."
version: 1.0.0
category: infrastructure-as-code
parent: ccc-devops
---

# Terraform Patterns

> Infrastructure as Code done right. Modular, versioned, drift-aware Terraform with remote state, environment isolation, and cost visibility.

## Use this skill when

- Designing Terraform module structure for a new project
- Setting up remote state with locking
- Managing multiple environments (dev, staging, production)
- Importing existing infrastructure into Terraform
- Detecting and resolving state drift
- Estimating infrastructure costs before applying

## Do not use this skill when

- Choosing which AWS services to use (use `aws-solution-architect`)
- Setting up CI/CD for Terraform (use `cicd-pipeline-generator`)
- Configuring networking in the cloud (use `network-engineer`)

---

## Module Design

### Directory Structure

```
infrastructure/
├── modules/                    # Reusable modules
│   ├── networking/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── ecs-service/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── iam.tf
│   │   └── README.md
│   ├── rds/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── monitoring/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/               # Environment-specific configs
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   └── production/
│       ├── main.tf
│       ├── terraform.tfvars
│       └── backend.tf
└── global/                     # Shared resources (IAM, DNS)
    ├── main.tf
    ├── terraform.tfvars
    └── backend.tf
```

### Module Design Principles

```hcl
# modules/ecs-service/variables.tf
# 1. Required variables first, optional with defaults after
# 2. Use validation blocks for constraints
# 3. Type everything explicitly

variable "service_name" {
  type        = string
  description = "Name of the ECS service"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,28}[a-z0-9]$", var.service_name))
    error_message = "Service name must be 4-30 lowercase alphanumeric characters or hyphens."
  }
}

variable "container_image" {
  type        = string
  description = "Docker image URI (e.g., 123456789012.dkr.ecr.us-east-1.amazonaws.com/app:latest)"
}

variable "cpu" {
  type        = number
  default     = 256
  description = "CPU units (256 = 0.25 vCPU)"

  validation {
    condition     = contains([256, 512, 1024, 2048, 4096], var.cpu)
    error_message = "CPU must be one of: 256, 512, 1024, 2048, 4096."
  }
}

variable "memory" {
  type        = number
  default     = 512
  description = "Memory in MB"
}

variable "desired_count" {
  type        = number
  default     = 2
  description = "Number of tasks to run"
}

variable "environment_variables" {
  type        = map(string)
  default     = {}
  description = "Environment variables for the container"
}

variable "secrets" {
  type = map(string)
  default     = {}
  description = "Secrets from SSM or Secrets Manager (name → ARN)"
  sensitive   = true
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Additional tags to apply to all resources"
}
```

```hcl
# modules/ecs-service/main.tf
# 1. Use data sources for lookups, not hardcoded values
# 2. Use locals for computed values
# 3. Tag everything with a consistent scheme

locals {
  common_tags = merge(var.tags, {
    Module    = "ecs-service"
    Service   = var.service_name
    ManagedBy = "terraform"
  })
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.service_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name      = var.service_name
    image     = var.container_image
    essential = true

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      for name, value in var.environment_variables : {
        name  = name
        value = value
      }
    ]

    secrets = [
      for name, arn in var.secrets : {
        name      = name
        valueFrom = arn
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.this.name
        awslogs-region        = data.aws_region.current.name
        awslogs-stream-prefix = var.service_name
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = local.common_tags
}

resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }

  tags = local.common_tags
}
```

```hcl
# modules/ecs-service/outputs.tf
# Output everything consumers might need

output "service_arn" {
  value       = aws_ecs_service.this.id
  description = "ARN of the ECS service"
}

output "task_definition_arn" {
  value       = aws_ecs_task_definition.this.arn
  description = "ARN of the current task definition"
}

output "security_group_id" {
  value       = aws_security_group.service.id
  description = "Security group ID for the service"
}

output "log_group_name" {
  value       = aws_cloudwatch_log_group.this.name
  description = "CloudWatch log group name"
}
```

---

## State Management

### Remote State with S3 + DynamoDB

```hcl
# environments/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
    # Use OIDC or instance profile — no hardcoded credentials
  }
}
```

### State locking table

```hcl
# global/state-backend.tf — create this ONCE, manually
resource "aws_s3_bucket" "terraform_state" {
  bucket = "mycompany-terraform-state"

  lifecycle {
    prevent_destroy = true
  }

  tags = { ManagedBy = "terraform" }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = { ManagedBy = "terraform" }
}
```

### Accessing state from other configurations

```hcl
# Reference outputs from another state file
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "mycompany-terraform-state"
    key    = "production/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use outputs from the networking state
module "app" {
  source = "../../modules/ecs-service"

  service_name       = "app"
  cluster_id         = data.terraform_remote_state.networking.outputs.ecs_cluster_id
  private_subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
  vpc_id             = data.terraform_remote_state.networking.outputs.vpc_id
}
```

---

## Environment Separation

### Using tfvars per environment

```hcl
# environments/dev/terraform.tfvars
environment   = "dev"
instance_type = "t3.small"
desired_count = 1
cpu           = 256
memory        = 512

# environments/production/terraform.tfvars
environment   = "production"
instance_type = "t3.large"
desired_count = 3
cpu           = 1024
memory        = 2048
```

### Using workspaces (simpler environments)

```bash
# Create workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# Switch workspace
terraform workspace select production

# Use workspace in config
locals {
  env_config = {
    dev = {
      instance_type = "t3.small"
      desired_count = 1
    }
    staging = {
      instance_type = "t3.medium"
      desired_count = 2
    }
    production = {
      instance_type = "t3.large"
      desired_count = 3
    }
  }

  config = local.env_config[terraform.workspace]
}
```

### When to use workspaces vs. directories

| Approach | When to Use |
|----------|------------|
| **Directories** (`environments/dev/`, `environments/prod/`) | Different backends, different providers, significantly different resources |
| **Workspaces** | Same resources, different sizes/counts, shared backend |

---

## Resource Naming Conventions

```hcl
locals {
  # Consistent naming: {project}-{environment}-{resource}-{qualifier}
  name_prefix = "${var.project}-${var.environment}"

  # Examples:
  # myapp-production-vpc
  # myapp-production-ecs-cluster
  # myapp-production-rds-primary
  # myapp-production-s3-assets
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  tags = {
    Name        = "${local.name_prefix}-vpc"
    Environment = var.environment
    Project     = var.project
    ManagedBy   = "terraform"
  }
}
```

---

## Secret Management

### AWS Secrets Manager

```hcl
# Store secrets
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${local.name_prefix}/db-password"
  recovery_window_in_days = 7

  tags = local.common_tags
}

# Reference in ECS task (via module variable)
module "app" {
  source = "../../modules/ecs-service"

  secrets = {
    DATABASE_PASSWORD = aws_secretsmanager_secret.db_password.arn
  }
}
```

### HashiCorp Vault

```hcl
provider "vault" {
  address = "https://vault.internal.example.com"
  # Auth via VAULT_TOKEN env var or AppRole
}

data "vault_generic_secret" "db" {
  path = "secret/data/${var.environment}/database"
}

resource "aws_ssm_parameter" "db_url" {
  name  = "/${var.environment}/app/database-url"
  type  = "SecureString"
  value = data.vault_generic_secret.db.data["connection_string"]
}
```

---

## Import Existing Infrastructure

```bash
# 1. Write the resource block first
cat >> main.tf <<'EOF'
resource "aws_s3_bucket" "existing" {
  bucket = "my-existing-bucket"
}
EOF

# 2. Import the resource into state
terraform import aws_s3_bucket.existing my-existing-bucket

# 3. Run plan to see drift
terraform plan

# 4. Adjust the config until plan shows no changes
# 5. Commit the config — infrastructure is now managed by Terraform
```

### Bulk import with import blocks (Terraform 1.5+)

```hcl
# imports.tf — declarative import
import {
  to = aws_s3_bucket.assets
  id = "my-existing-assets-bucket"
}

import {
  to = aws_iam_role.app
  id = "my-existing-app-role"
}

# Generate config from imports
# terraform plan -generate-config-out=generated.tf
```

---

## Drift Detection

### Scheduled drift detection in CI

```yaml
# .github/workflows/drift-detection.yml
name: Terraform Drift Detection
on:
  schedule:
    - cron: '0 8 * * 1-5'  # weekdays at 8am

jobs:
  drift-check:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: '1.7'

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform init
        working-directory: environments/${{ matrix.environment }}
        run: terraform init -input=false

      - name: Check for drift
        working-directory: environments/${{ matrix.environment }}
        id: plan
        run: |
          terraform plan -detailed-exitcode -input=false -no-color 2>&1 | tee plan.txt
          echo "exitcode=$?" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Notify on drift
        if: steps.plan.outputs.exitcode == '2'
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"Terraform drift detected in ${{ matrix.environment }}. Review the plan output.\"}"
```

---

## Cost Estimation

### Infracost integration

```yaml
# .github/workflows/infracost.yml
name: Infracost
on: pull_request

jobs:
  cost:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      - name: Generate cost estimate
        run: |
          infracost breakdown \
            --path=environments/production \
            --format=json \
            --out-file=/tmp/infracost.json

      - name: Post PR comment
        run: |
          infracost comment github \
            --path=/tmp/infracost.json \
            --repo=${{ github.repository }} \
            --pull-request=${{ github.event.pull_request.number }} \
            --github-token=${{ secrets.GITHUB_TOKEN }} \
            --behavior=update
```

### Cost-aware module design

```hcl
# Include cost tags on every resource
variable "cost_center" {
  type        = string
  description = "Cost center for billing allocation"
}

locals {
  cost_tags = {
    CostCenter = var.cost_center
    ManagedBy  = "terraform"
    Module     = "ecs-service"
  }
}
```

---

## Terraform Best Practices Checklist

- [ ] Remote state with S3 + DynamoDB locking (never local state in production)
- [ ] State encryption enabled (SSE-KMS)
- [ ] Modules are versioned (use git tags or registry versions)
- [ ] Variables have types, descriptions, and validation blocks
- [ ] All resources tagged with environment, project, and managed-by
- [ ] `prevent_destroy` on critical resources (state buckets, databases)
- [ ] Drift detection running on a schedule
- [ ] Cost estimation (infracost) on every PR
- [ ] Secrets managed via Secrets Manager or Vault (never in tfvars)
- [ ] Import blocks used for existing infrastructure (no manual state surgery)
- [ ] `terraform fmt` and `terraform validate` in CI
- [ ] Plan output reviewed before every apply
