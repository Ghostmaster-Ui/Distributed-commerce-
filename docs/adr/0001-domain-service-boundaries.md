# ADR 0001: Organize backend capabilities by commerce domain

- Status: Accepted
- Date: 2026-08-16

## Context

Catalog browsing, pricing, stock reservation, order orchestration, and payment adaptation change for different reasons and have different reliability requirements.

## Decision

Maintain separate Catalog, Pricing, Inventory, Orders, and Payment services behind one GraphQL gateway. Services communicate synchronously for the checkout request and publish business events through Kafka-compatible infrastructure. PostgreSQL remains the system of record; Redis stores disposable cart and quote state.

## Consequences

- Each service has a narrow API and independent container image.
- The gateway remains a composition layer and does not own domain state.
- Local development is more complex than a monolith.
- Cross-service transactions require idempotency and an outbox before production use.
- Operational ownership and observability must be consistent across all services.
