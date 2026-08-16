import { config } from "./config.js";
import { ServiceClient } from "./service-client.js";

export class OrderClient extends ServiceClient {
  constructor(baseUrl = config.orderServiceUrl) {
    super(baseUrl, "Order service");
  }
  checkout(payload) {
    return this.request("/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
  get(id) {
    return this.request(`/orders/${encodeURIComponent(id)}`);
  }
  list() {
    return this.request("/orders");
  }
}
