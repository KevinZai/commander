---
name: aws-s3-patterns
description: "AWS S3 — bucket design, lifecycle policies, presigned URLs, cross-region replication, encryption, and access patterns."
risk: low
source: custom
date_added: '2026-03-20'
---

# AWS S3 Patterns

Expert guide to S3 bucket design, access patterns, and cost optimization.

## Use this skill when

- Designing S3 bucket architecture and naming conventions
- Implementing presigned URLs, lifecycle policies, or replication
- Configuring encryption, access controls, and bucket policies
- Optimizing S3 costs with storage classes and intelligent tiering

## Do not use this skill when

- Working with non-AWS object storage
- Need a file system (use EFS or FSx)

---

## Bucket Design

```hcl
resource "aws_s3_bucket" "assets" {
  bucket = "${var.project}-${var.environment}-assets"

  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3.arn
    }
    bucket_key_enabled = true  # Reduce KMS costs
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Key Prefix Design for Performance

```
# Use hashed or date-based prefixes for high-throughput workloads
# S3 partitions by prefix — distributed prefixes = better throughput

# GOOD: Date-based partitioning
logs/2024/03/20/server-1/access.log
uploads/2024/03/user-1234/photo-001.jpg

# GOOD: Hash prefix for random access
data/a1b2/user-1234/profile.json
data/c3d4/user-5678/profile.json

# BAD: Sequential prefixes causing hot partitions
data/00001/file.json
data/00002/file.json
```

## Presigned URLs

```typescript
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({ region: 'us-east-1' })

// Download presigned URL (15 min expiry)
async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: key,
  })
  return getSignedUrl(s3, command, { expiresIn: 900 })
}

// Upload presigned URL with size limit
async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'aws:kms',
  })
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}

// Presigned POST (better for browser uploads — supports size constraints)
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'

async function getPresignedPost(key: string) {
  return createPresignedPost(s3, {
    Bucket: process.env.BUCKET_NAME!,
    Key: key,
    Conditions: [
      ['content-length-range', 0, 10 * 1024 * 1024], // Max 10MB
      ['starts-with', '$Content-Type', 'image/'],
    ],
    Expires: 3600,
  })
}
```

## Lifecycle Policies

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"
    filter { prefix = "uploads/" }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"  # ~40% cheaper
    }
    transition {
      days          = 90
      storage_class = "GLACIER_IR"   # ~68% cheaper, ms retrieval
    }
    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE" # ~95% cheaper, 12h retrieval
    }
  }

  rule {
    id     = "delete-temp-files"
    status = "Enabled"
    filter { prefix = "tmp/" }
    expiration { days = 7 }
  }

  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload { days_after_initiation = 3 }
  }

  rule {
    id     = "expire-old-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }
    noncurrent_version_expiration { noncurrent_days = 90 }
  }
}
```

## Intelligent Tiering (Automatic Cost Optimization)

```hcl
resource "aws_s3_bucket_intelligent_tiering_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  name   = "full-tiering"

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }
}
```

## Event Notifications

```hcl
resource "aws_s3_bucket_notification" "events" {
  bucket = aws_s3_bucket.uploads.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.process_upload.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
    filter_suffix       = ".jpg"
  }

  queue {
    queue_arn     = aws_sqs_queue.process_csv.arn
    events        = ["s3:ObjectCreated:*"]
    filter_suffix = ".csv"
  }
}
```

## Cross-Region Replication

```hcl
resource "aws_s3_bucket_replication_configuration" "assets" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.assets.id

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.assets_replica.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

## Common Pitfalls

1. **Public buckets** — Always block public access. Use CloudFront + OAC for public content.
2. **No versioning** — Enable versioning for important data. Combined with lifecycle rules for cost control.
3. **Missing encryption** — Enable default encryption (SSE-S3 minimum, KMS for compliance).
4. **No lifecycle policies** — Objects accumulate indefinitely. Set transitions and expirations.
5. **Incomplete multipart uploads** — These cost money. Always set abort rule.
6. **Sequential key names** — Use distributed prefixes for high-throughput workloads.
7. **Direct public upload without validation** — Always validate file type/size via presigned POST conditions.
