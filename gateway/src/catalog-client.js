import { config } from "./config.js";
import { ServiceClient } from "./service-client.js";

export class CatalogClient extends ServiceClient {
  constructor(baseUrl = config.catalogServiceUrl) {
    super(baseUrl, "Catalog service");
  }

  list({ category, search }) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    const query = params.toString();
    return this.request(`/products${query ? `?${query}` : ""}`);
  }

  get(id) {
    return this.request(`/products/${encodeURIComponent(id)}`);
  }
  create(input) {
    return this.request("/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
  }
  restock(id, quantity) {
    return this.request(`/products/${encodeURIComponent(id)}/restock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
  }
}
