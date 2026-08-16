import assert from "node:assert/strict";
import test from "node:test";

import { CatalogClient } from "../src/catalog-client.js";

test("builds catalog filter query", async () => {
  const client = new CatalogClient("http://catalog.test");
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    assert.equal(url, "http://catalog.test/products?category=Audio&search=Arc");
    return new Response(JSON.stringify([]), { status: 200 });
  };
  try {
    assert.deepEqual(await client.list({ category: "Audio", search: "Arc" }), []);
  } finally {
    global.fetch = originalFetch;
  }
});
