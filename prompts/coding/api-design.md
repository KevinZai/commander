---
name: api-design
category: coding
skills: [api-design, backend-patterns, schema-design]
mode: plan
estimated_tokens: 600
---

# API Design

## When to Use
When designing new REST or GraphQL API endpoints from scratch. Use this before writing any implementation code to ensure the contract is solid.

## Template

```
Design the API for the following feature. Define the contract first — implementation comes after approval.

**Feature:**
{{what_the_feature_does}}

**API style:**
{{REST|GraphQL|both}}

**Auth model:**
{{JWT|API key|OAuth|session — or describe your auth setup}}

**Consumers:**
{{who_calls_this — web app, mobile app, third-party, internal service}}

**Step 1: Resource modeling**
- Identify the core resources (nouns) involved
- Define relationships between resources (1:1, 1:N, N:N)
- Determine which fields are required vs optional
- Establish naming conventions (camelCase, snake_case)

**Step 2: Endpoint design**
For each endpoint, specify:
- **Method + Path:** `POST /api/v1/{{resource}}`
- **Request body:** JSON schema with types and validation rules
- **Response body:** JSON schema with envelope format
- **Status codes:** all possible codes (200, 201, 400, 401, 403, 404, 409, 422, 500)
- **Auth:** required role/scope
- **Rate limit:** requests per window

**Step 3: Validation rules**
- Input validation schema (Zod, JSON Schema, or equivalent)
- Business rule validation (e.g., "cannot delete if has active subscriptions")
- Error response format (consistent across all endpoints)

**Step 4: Edge cases**
- Pagination strategy (cursor vs offset)
- Filtering and sorting parameters
- Bulk operations (if applicable)
- Idempotency (for POST/PUT — idempotency keys?)
- Versioning strategy

**Step 5: Output**
Write the API spec as:
1. A markdown table of all endpoints
2. TypeScript request/response types
3. Example curl commands for each endpoint
4. Zod validation schemas (if TypeScript project)
```

## Tips
- Use the `api-design` skill for automated API pattern validation
- Always version your API from day one (`/api/v1/`) even if you think you won't need it
- Design the error responses as carefully as the success responses

## Example

```
Design the API for the following feature. Define the contract first — implementation comes after approval.

**Feature:**
Team invitation system — users can invite others by email, invitees accept/decline, admins can revoke pending invitations.

**API style:** REST
**Auth model:** JWT with role-based access (admin, member)
**Consumers:** React web app (SPA)
```
