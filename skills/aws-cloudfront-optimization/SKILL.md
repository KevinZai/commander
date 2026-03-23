---
name: aws-cloudfront-optimization
description: "AWS CloudFront — distribution configuration, cache policies, origin access, Lambda@Edge, performance optimization, and security."
risk: low
source: custom
date_added: '2026-03-20'
---

# AWS CloudFront Optimization

Expert guide to CloudFront CDN configuration and performance optimization.

## Use this skill when

- Setting up CloudFront distributions for static assets, SPAs, or APIs
- Optimizing cache hit ratios and reducing origin load
- Implementing Lambda@Edge or CloudFront Functions
- Securing content delivery with WAF, geo-restrictions, or signed URLs

## Do not use this skill when

- Using Cloudflare, Fastly, or other CDN providers
- Simple S3 static website without CDN requirements

---

## Distribution with S3 Origin (OAC)

```hcl
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"  # US, Canada, Europe only
  aliases             = [var.domain_name]

  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "s3-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # API origin
  origin {
    domain_name = "api.${var.domain_name}"
    origin_id   = "api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # SPA: route all paths to index.html
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  # Static assets — long cache
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-assets"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = aws_cloudfront_cache_policy.assets.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.cors.id

    function_association {
      event_type   = "viewer-response"
      function_arn = aws_cloudfront_function.security_headers.arn
    }
  }

  # API paths — no caching
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "api"
    viewer_protocol_policy = "https-only"
    compress               = true

    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  web_acl_id = aws_wafv2_web_acl.main.arn

  tags = local.common_tags
}
```

## Cache Policies

```hcl
resource "aws_cloudfront_cache_policy" "assets" {
  name        = "${var.project}-assets-cache"
  default_ttl = 86400     # 1 day
  max_ttl     = 31536000  # 1 year
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"  # Don't vary cache by cookies
    }
    headers_config {
      header_behavior = "none"  # Don't vary by headers
    }
    query_strings_config {
      query_string_behavior = "none"  # Don't vary by query strings
    }
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
  }
}
```

## CloudFront Functions (Viewer-Side)

```javascript
// Security headers function
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubDomains; preload' };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['x-xss-protection'] = { value: '1; mode=block' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
  headers['permissions-policy'] = { value: 'camera=(), microphone=(), geolocation=()' };

  return response;
}
```

```javascript
// URL rewrite for SPA (cleaner than custom error responses)
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // If URI has no extension, serve index.html (SPA routing)
  if (!uri.includes('.')) {
    request.uri = '/index.html';
  }

  return request;
}
```

## Cache Invalidation

```bash
# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/index.html" "/assets/main.css"

# Invalidate everything (expensive at scale)
aws cloudfront create-invalidation \
  --distribution-id E1234567890 \
  --paths "/*"
```

### Cache Busting Strategy (Preferred over Invalidation)

```
# Use content hashes in filenames — never needs invalidation
assets/main.a1b2c3d4.js     # Cached forever
assets/styles.e5f6g7h8.css  # Cached forever
index.html                   # Short TTL (5 min) or no-cache
```

## Performance Optimization Checklist

- [ ] Compression enabled (Brotli + Gzip)
- [ ] Cache policy tuned per path pattern (assets: long TTL, API: no cache, HTML: short TTL)
- [ ] Content-hashed filenames for static assets (cache forever, no invalidation)
- [ ] HTTP/2 and HTTP/3 enabled (default)
- [ ] Origin Shield enabled for multi-region origins
- [ ] Price class appropriate for audience geography
- [ ] Connection keep-alive on custom origins

## Common Pitfalls

1. **Caching API responses** — Use `CachingDisabled` policy for API paths.
2. **No compression** — Enable both Brotli and Gzip. Saves 60-80% bandwidth.
3. **Invalidation as deployment strategy** — Use content-hashed filenames instead.
4. **Missing CORS headers** — Configure origin request policy to forward `Origin` header.
5. **No WAF** — Attach WAF Web ACL for rate limiting, IP blocking, and bot protection.
6. **Overly broad cache policies** — Forwarding cookies/query strings to cache key reduces hit ratio.
