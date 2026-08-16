# Observability

Every FastAPI service publishes Prometheus metrics at `/metrics` and structured access logs to stdout. Docker Compose scrapes those services every 15 seconds and provisions Prometheus as Grafana's default data source.

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3002` (`admin` / `meridian`, local only)

Recommended alerts:

- HTTP 5xx rate above 2% for five minutes
- p95 checkout latency above two seconds
- inventory reservation conflicts above baseline
- Kafka consumer lag increasing for ten minutes
- PostgreSQL connections above 80%
- Redis memory above 75%
- Kubernetes unavailable replicas greater than zero

Production logs should be shipped with Fluent Bit to CloudWatch or OpenSearch and include request ID, service, route, status, duration, user ID where allowed, and order ID. Never log tokens, passwords, or payment data. Add OpenTelemetry trace propagation before high-volume production use.
