---
name: api-design
category: coding
skills: [api-design, backend-patterns, database-designer]
mode: plan
estimated_tokens: 600
---

# API Design

## When to Use
Use before writing implementation code for new REST or GraphQL endpoints, so the contract is reviewed and approved first. Skip it for a one-line change to an existing endpoint.

## Template

```
Design the API for the feature below. Produce the contract only; do not write implementation code until I approve it.

**Feature:**
{{what_the_feature_does}}

**API style:**
{{REST|GraphQL|both}}

**Auth model:**
{{JWT|API key|OAuth|session — or describe your auth setup}}

**Consumers:**
{{who_calls_this — web app, mobile app, third-party, internal service}}

Step 1: Model the resources.
- List the core resources (nouns) and their relationships (1:1, 1:N, N:N).
- Mark each field required or optional.
- Follow the naming convention already used in this codebase (camelCase or snake_case); read an existing route or schema to confirm it.

Step 2: Define each endpoint.
- Method and path, for example `POST /api/v1/{{resource}}`.
- Request body: JSON schema with types and validation rules.
- Response body: JSON schema, using the response envelope the project already uses.
- Status codes: every code the endpoint can return (200, 201, 400, 401, 403, 404, 409, 422, 500).
- Auth: required role or scope.
- Rate limit: requests per window.

Step 3: Specify validation.
- Input validation schema (Zod, JSON Schema, or the project's equivalent).
- Business rules, for example "cannot delete while it has active subscriptions".
- One error response format shared by every endpoint.

Step 4: Resolve edge cases.
- Pagination (cursor or offset) and why.
- Filtering and sorting parameters.
- Bulk operations, if needed.
- Idempotency for POST and PUT (idempotency keys or not).
- Versioning strategy.

Step 5: Write the spec.
1. A markdown table of every endpoint.
2. TypeScript request and response types.
3. One example curl command per endpoint.
4. Zod validation schemas, if the project uses TypeScript.

End with the open questions that need my decision before implementation starts.
```

## Tips
- Pair with the `api-design` skill to check the contract against common API patterns.
- Version the API from the first release (`/api/v1/`); adding a version later breaks existing consumers.
- Design error responses as carefully as success responses; clients depend on both.

## Example

```
Design the API for the feature below. Produce the contract only; do not write implementation code until I approve it.

**Feature:**
Team invitation system — users can invite others by email, invitees accept/decline, admins can revoke pending invitations.

**API style:** REST
**Auth model:** JWT with role-based access (admin, member)
**Consumers:** React web app (SPA)
```
