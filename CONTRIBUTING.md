# Contributing

Meridian uses small, reviewable changes and trunk-based development. Keep `main` deployable.

## Workflow

1. Choose a backlog item with a clear user outcome and acceptance criteria.
2. Create a short-lived branch such as `feature/cart-quantity-controls`.
3. Write or update tests before considering the work complete.
4. Run `bash scripts/quality.sh` locally.
5. Open a pull request using the repository template.
6. Merge only after CI passes and the definition of done is satisfied.

## Engineering conventions

- Keep domain ownership inside the responsible service.
- Call services through their public API instead of reading another service's data directly.
- Keep React components focused on rendering and interaction; put transport code in `app/lib`.
- Validate input at every external boundary.
- Use parameterized SQL and never log credentials, tokens, or payment data.
- Prefer descriptive names over comments that repeat the code.
- Add a decision record when changing service boundaries, persistence, security, or deployment strategy.

## Commit guidance

Use one coherent change per commit with an imperative subject, for example:

```text
feat(cart): add persistent quantity controls
fix(inventory): serialize concurrent reservations
docs(architecture): record Kafka event ownership
```

Do not mix formatting, unrelated refactoring, and feature behavior in one review.
