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

Install the AWS Load Balancer Controller, metrics-server, External Secrets Operator, and Prometheus stack on the EKS cluster. Replace the example ingress domains, container owner, and secret references. Never deploy `stringData` placeholders as production credentials.

## CI/CD

Pull requests compile the storefront and Python services, run gateway tests, execute a containerized checkout, and scan dependencies. The manual deployment workflow builds immutable images, authenticates to AWS through GitHub OIDC, applies Kustomize manifests, and waits for the gateway rollout.

Repository environments require `AWS_DEPLOY_ROLE_ARN`. Protect the production environment with required reviewers.

## Rollback

Use `kubectl rollout undo deployment/<service> -n meridian`, verify `/health`, GraphQL catalog access, and a mock checkout, then document the incident. Database changes must use backward-compatible expand/migrate/contract migrations.
