# Development Workflow

The pipeline from idea to commit. Git conventions are in [git-workflow.md](./git-workflow.md), test expectations in [testing.md](./testing.md), and the gates behind each step in `rules/fable-method.md`.

## Feature pipeline

1. **Define done.** Write the acceptance criteria and what "broken" looks like before the spec: evals, spec, plan, implement, verify.
2. **Reuse before building.** Check the project's existing utilities and installed dependencies, then mature libraries or prior art (`gh search code`, package registries) when the need is new. Add a dependency only for a demonstrated need and say why.
3. **Plan.** For multi-file or multi-day work, write a plan file with phases, risks, and acceptance criteria (`/ccc-plan`). Small edits do not need one.
4. **Implement test-first** where the project requires it or a regression needs reproducing ([testing.md](./testing.md)).
5. **Review.** Run `/code-review` or a reviewer agent on the diff. Fix critical and high findings; fix medium ones when cheap.
6. **Verify.** Run the project's required checks and inspect the actual output. Report what ran and what passed or failed.
7. **Commit** per [git-workflow.md](./git-workflow.md) when the user asks for a commit.

## Scope

- Make the smallest coherent diff that meets the acceptance criteria.
- Flag adjacent improvements instead of folding them into the change.
- Planning-only and review-only requests end with the plan or the review.
