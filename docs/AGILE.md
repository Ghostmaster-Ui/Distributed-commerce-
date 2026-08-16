# Agile delivery guide

## Product goal

Demonstrate a reliable, event-driven commerce workflow that is understandable to reviewers, safe to run locally, and deployable to Kubernetes.

## Backlog structure

Work is expressed as a user outcome:

> As a `<role>`, I want `<capability>` so that `<benefit>`.

Every item includes acceptance criteria, operational impact, test notes, and dependencies. Priority order is:

1. Security and data integrity
2. Broken customer or administrator workflows
3. Reliability and observability
4. Product capability
5. Internal maintainability

## Iteration cadence

- One-week iterations for a personal project
- Planning: select only work that fits the iteration goal
- Daily check: record completed work, next action, and blockers
- Review: demonstrate behavior against acceptance criteria
- Retrospective: keep one improvement for the next iteration

## Definition of ready

- User outcome and owner are clear
- Acceptance criteria can be tested
- Dependencies and affected services are known
- Security and data-migration risks are identified

## Definition of done

- Acceptance criteria pass
- Unit or integration coverage protects the behavior
- Formatting, linting, build, and security checks pass
- Metrics, logs, and failure behavior are considered
- Documentation and API contracts are updated
- No credentials or generated artifacts are committed
- The change can be rolled back

## Current product backlog

| Priority | Outcome                        | Acceptance criteria                                                      |
| -------- | ------------------------------ | ------------------------------------------------------------------------ |
| P0       | Replace demo authentication    | Users are stored externally; tokens rotate; roles remain server-enforced |
| P0       | Add transactional outbox       | Order persistence and event publication cannot diverge                   |
| P1       | Add idempotent checkout        | Repeated checkout keys produce exactly one order and charge              |
| P1       | Add database migrations        | Every schema change is versioned and reversible                          |
| P1       | Propagate trace IDs            | One request can be followed across gateway, services, Kafka, and logs    |
| P2       | Add catalog subscriptions      | Product and inventory changes update open browsers automatically         |
| P2       | Add production payment adapter | Hosted payment fields and signed webhooks replace the mock adapter       |

## Suggested next iteration

**Goal:** make checkout retry-safe.

- Add idempotency keys at the GraphQL boundary
- Persist request keys with order results
- Add an order outbox in the same PostgreSQL transaction
- Publish outbox events asynchronously
- Add concurrent retry and failure-recovery tests
