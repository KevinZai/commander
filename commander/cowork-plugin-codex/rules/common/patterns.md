# Architecture Patterns

Use the repository's established architecture and public contracts. Introduce a pattern only for a demonstrated need, not because it appears below.

## Starting from a skeleton

When a new project or subsystem could start from an existing template:

1. Search for maintained candidates that match the requirements.
2. Evaluate each for license, dependencies, security assumptions, and extensibility (read-only agents can run these in parallel).
3. Adopt the best match only if it materially reduces work; otherwise start small.
4. Never replace an existing project with a template just because one exists.

## Data access behind an interface

When business logic must not depend on storage details:

- Define the operations the domain needs (`findById`, `create`, ...), not a generic CRUD surface.
- Keep storage-specific code in implementations; tests substitute a fake.

## API responses

When the project has no response convention yet, a consistent envelope helps clients:

- A success or status indicator.
- The data payload (null on error).
- An error message (null on success).
- Pagination metadata (`total`, `page`, `limit`) on list endpoints.

Preserve an existing convention over this one.

## New interfaces

Make ownership, error behavior, and compatibility explicit. Changing an existing consumer contract is a decision to call out, not a side effect.
