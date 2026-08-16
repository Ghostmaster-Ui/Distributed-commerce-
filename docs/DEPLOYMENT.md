# Deployment runbook

## Local

1. Start Docker Desktop.
2. Run `docker compose up --build --wait`.
3. Run `bash tests/e2e-commerce.sh`.
4. Start the storefront with `npm run dev`.

Services are exposed on ports 4000, 8000–8004, 9090, and 3002.

## AWS dev environment

Infrastructure creates billable AWS resources. Review the plan and AWS pricing before applying.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Creating the EKS cluster, NAT gateway, RDS database, ElastiCache cluster, and MSK Serverless
cluster incurs AWS charges. Apply only after reviewing the saved plan and the current AWS pricing.

Install the AWS Load Balancer Controller, metrics-server, External Secrets Operator, and Prometheus stack on the EKS cluster. Replace the example ingress domains, container owner, and secret references. Never deploy `stringData` placeholders as production credentials.

## CI/CD

Pull requests compile the storefront and Python services, run gateway tests, execute a containerized checkout, and scan dependencies. The manual deployment workflow builds immutable images, authenticates to AWS through GitHub OIDC, applies Kustomize manifests, and waits for the gateway rollout.

Repository environments require `AWS_DEPLOY_ROLE_ARN`. Protect the production environment with required reviewers.

## Netlify storefront

The root application uses standard Next.js commands and includes `netlify.toml`. Connect the GitHub
repository to Netlify and configure these values in the Netlify project:

- `NEXT_PUBLIC_GRAPHQL_URL`: public HTTPS URL of the deployed GraphQL gateway
- `NEXT_PUBLIC_SITE_URL`: final Netlify or custom-domain URL

Deploy the backend first. The storefront build can succeed without it, but catalog, authentication,
cart, admin, and checkout operations require the public gateway. Allow the final Netlify origin in
the gateway or ingress CORS policy, and use HTTPS for both surfaces to avoid mixed-content blocking.

## Rollback

Use `kubectl rollout undo deployment/<service> -n meridian`, verify `/health`, GraphQL catalog access, and a mock checkout, then document the incident. Database changes must use backward-compatible expand/migrate/contract migrations.
