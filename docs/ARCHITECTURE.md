# Architecture

Meridian is a domain-oriented commerce system. The GraphQL gateway is the browser-facing API and delegates ownership to small services.

```text
Next.js storefront
       |
GraphQL gateway ---- Redis (persistent carts, 30-day TTL)
       |
       +---- Catalog API ---- PostgreSQL products
       +---- Order API ------ PostgreSQL orders
                |---- Pricing API ---- Redis quote cache
                |---- Inventory API -- PostgreSQL row locks
                |---- Mock Payment API
                |
             Kafka / Redpanda ---- WebSocket order updates
```

## Transaction workflow

1. A signed-in customer adds catalog products to a Redis-backed cart.
2. Checkout asks Pricing for authoritative totals. Quotes are cached for 60 seconds.
3. The mock payment adapter authorizes a safe test token. It never accepts card data.
4. Inventory reserves stock with a PostgreSQL `SELECT ... FOR UPDATE` transaction.
5. Inventory and Order publish events to Kafka-compatible topics.
6. Order persists the confirmed transaction and broadcasts status over WebSockets.
7. The gateway clears the cart only after confirmation.

Production payment integration belongs behind the Payment service interface. Add Stripe or another provider using hosted fields and webhooks; never send raw card data through Meridian.

## Data ownership

The local environment uses one PostgreSQL instance to reduce setup cost, but services own their tables and APIs. Production can split catalog/order databases without changing client contracts.

## Reliability choices

- Row-level inventory locking prevents overselling under concurrent checkout.
- Kafka events decouple real-time consumers from transactions.
- Health probes, resource limits, autoscaling, and multiple replicas are defined for EKS.
- Redis carts expire after 30 days and pricing entries after 60 seconds.
- Production should add an outbox table so database commits and Kafka publication are atomic.
