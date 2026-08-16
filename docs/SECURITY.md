# Security

## Implemented controls

- JWTs expire after two hours and are verified for issuer and signature.
- Admin GraphQL operations require the `ADMIN` role server-side.
- Payment is intentionally mocked and accepts only `tok_mock_success`; no card data is collected.
- Pydantic and GraphQL validate input sizes, types, quantities, and prices.
- PostgreSQL queries are parameterized.
- Kubernetes containers drop Linux capabilities, disallow privilege escalation, and use resource limits.
- Kubernetes starts from deny-by-default ingress network policy.
- CI scans the repository for high and critical vulnerabilities.
- AWS databases and Redis enable encryption at rest; production Redis enables TLS in transit.

## Before internet deployment

1. Replace demo credentials with an external identity provider (Cognito, Auth0, or OIDC).
2. Store secrets in AWS Secrets Manager and synchronize them with External Secrets Operator. Never apply the placeholder Kubernetes Secret.
3. Put AWS WAF, TLS certificates, rate limiting, and a CDN in front of public endpoints.
4. Restrict EKS public endpoint CIDRs or make the endpoint private.
5. Use MSK IAM authentication in the service clients.
6. Add an order outbox, idempotency keys, audit logs, dependency pin review, and database migrations.
7. Rotate credentials and run a threat model before processing real customer data.

Report security issues privately to the repository owner. Do not include credentials or customer information in reports.
