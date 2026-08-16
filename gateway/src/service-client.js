export class ServiceClient {
  constructor(baseUrl, serviceName) {
    this.baseUrl = baseUrl;
    this.serviceName = serviceName;
  }

  async request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        signal: AbortSignal.timeout(10_000),
        ...options,
      });
    } catch (error) {
      throw new Error(`${this.serviceName} is unavailable`, { cause: error });
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.detail ?? `${this.serviceName} returned ${response.status}`);
    }
    return body;
  }
}
