import { TECHNOLOGY_STACK } from "../lib/constants";

const DOMAIN_SERVICES = [
  ["Catalog", "Products + discovery"],
  ["Pricing", "Quotes + discounts"],
  ["Inventory", "Atomic reservations"],
  ["Orders", "Checkout + workflow"],
  ["Payments", "Safe mock adapter"],
] as const;

const DELIVERY_STEPS = ["GitHub Actions", "Docker Images", "Kubernetes", "AWS EKS"] as const;

export function ProjectOverview() {
  return (
    <section className="project-disclosure shell" id="architecture">
      <p className="project-kicker">Engineering portfolio · Personal project</p>
      <h1>
        This is a personal project.
        <br />
        <em>Not a real shopping website.</em>
      </h1>
      <p className="project-intro">
        Meridian is a full-stack system-design demonstration built to explore microservices,
        event-driven commerce, cloud infrastructure, and reliable transactional workflows. No real
        products are sold and no real payments are collected.
      </p>

      <div className="stack-block">
        <div className="stack-title">
          <p className="eyebrow">Technology stack</p>
          <h2>Built across the entire stack.</h2>
        </div>
        <div className="stack-list" aria-label="Project technology stack">
          {TECHNOLOGY_STACK.map((technology, index) => (
            <span key={technology}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              {technology}
            </span>
          ))}
        </div>
      </div>

      <div className="system-design">
        <div className="design-heading">
          <div>
            <p className="eyebrow">End-to-end workflow</p>
            <h2>How the system works.</h2>
          </div>
          <p>From storefront interaction to asynchronous events and cloud delivery.</p>
        </div>
        <div
          className="architecture-map"
          aria-label="Meridian commerce system architecture diagram"
        >
          <div className="arch-lane client-lane">
            <span className="lane-label">Experience</span>
            <ArchitectureNode
              className="featured"
              label="Customer + Admin"
              title="Next.js Storefront"
              detail="React · TypeScript"
            />
            <span className="flow-arrow">→</span>
            <ArchitectureNode
              className="dark"
              label="Single API surface"
              title="GraphQL Gateway"
              detail="Node.js · Apollo · JWT"
            />
          </div>
          <FlowDown label="Queries · mutations · authentication" />
          <div className="arch-lane service-lane">
            <span className="lane-label">Domain services</span>
            {DOMAIN_SERVICES.map(([title, detail], index) => (
              <ArchitectureNode
                key={title}
                className="service"
                label={`0${index + 1}`}
                title={title}
                detail={detail}
              />
            ))}
          </div>
          <FlowDown label="State · cache · asynchronous messages" />
          <div className="arch-lane data-lane">
            <span className="lane-label">Data + events</span>
            <ArchitectureNode
              className="data"
              label="System of record"
              title="PostgreSQL"
              detail="Catalog · inventory · orders"
            />
            <ArchitectureNode
              className="data lime"
              label="Fast state"
              title="Redis"
              detail="Persistent carts · price cache"
            />
            <ArchitectureNode
              className="data coral"
              label="Event backbone"
              title="Kafka / Redpanda"
              detail="Order + inventory events"
            />
            <span className="return-arrow">
              ↗ <small>WebSockets send live order status back to the storefront</small>
            </span>
          </div>
          <div className="delivery-flow">
            <div className="delivery-track">
              <span className="lane-label">Delivery</span>
              {DELIVERY_STEPS.map((step, index) => (
                <div key={step} className="delivery-step">
                  <b>{step}</b>
                  {index < DELIVERY_STEPS.length - 1 && <span>→</span>}
                </div>
              ))}
            </div>
            <div className="ops-track">
              <span className="lane-label">Operations</span>
              <b>Terraform provisions AWS</b>
              <span>·</span>
              <b>Prometheus measures</b>
              <span>·</span>
              <b>Grafana visualizes</b>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ArchitectureNodeProps {
  className: string;
  label: string;
  title: string;
  detail: string;
}

function ArchitectureNode({ className, label, title, detail }: ArchitectureNodeProps) {
  return (
    <div className={`arch-node ${className}`}>
      <small>{label}</small>
      <strong>{title}</strong>
      <em>{detail}</em>
    </div>
  );
}

function FlowDown({ label }: { label: string }) {
  return (
    <div className="down-flow">
      <span>{label}</span>
      <b>↓</b>
    </div>
  );
}
