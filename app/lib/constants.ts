import type { Cart, ProductDraft } from "./types";

export const EMPTY_CART: Cart = { items: [], itemCount: 0, subtotal: 0 };

export const EMPTY_PRODUCT_DRAFT: ProductDraft = {
  name: "",
  slug: "",
  description: "",
  category: "Workspace",
  price: "",
  inventory: "",
};

export const PRODUCT_VISUALS: Record<string, readonly [string, string]> = {
  Audio: ["violet", "◒"],
  Workspace: ["sand", "⌨"],
  Wearables: ["mint", "◉"],
  Travel: ["blue", "⌁"],
};

export const TECHNOLOGY_STACK = [
  "Next.js",
  "React",
  "TypeScript",
  "Node.js",
  "Apollo GraphQL",
  "FastAPI",
  "Python",
  "PostgreSQL",
  "Redis",
  "Kafka / Redpanda",
  "WebSockets",
  "Docker",
  "Kubernetes",
  "AWS EKS",
  "Terraform",
  "GitHub Actions",
  "Prometheus",
  "Grafana",
] as const;

export const CUSTOMER_DEMO = {
  email: "customer@meridian.local",
  password: "meridian123",
} as const;

export const ADMIN_DEMO = {
  email: "admin@meridian.local",
  password: "admin123",
} as const;
