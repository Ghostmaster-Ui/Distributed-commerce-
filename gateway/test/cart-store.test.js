import assert from "node:assert/strict";
import test from "node:test";
import { CartStore } from "../src/cart-store.js";

class MemoryRedis {
  constructor() {
    this.data = new Map();
  }
  async get(k) {
    return this.data.get(k) ?? null;
  }
  async set(k, v) {
    this.data.set(k, v);
  }
}
test("cart persists and calculates totals", async () => {
  const store = new CartStore(new MemoryRedis());
  const product = { id: "p1", slug: "arc-one", name: "Arc One", price: 249 };
  await store.add("u1", product, 2);
  const cart = await store.add("u1", product, 1);
  assert.equal(cart.itemCount, 3);
  assert.equal(cart.subtotal, 747);
  assert.equal((await store.get("u1")).length, 1);
});
test("cart quantity can increase, decrease, and remove", async () => {
  const store = new CartStore(new MemoryRedis());
  const product = { id: "p1", slug: "arc-one", name: "Arc One", price: 249 };
  await store.add("u1", product, 1);
  assert.equal((await store.update("u1", "p1", 4)).itemCount, 4);
  assert.equal((await store.update("u1", "p1", 2)).itemCount, 2);
  assert.equal((await store.update("u1", "p1", 0)).itemCount, 0);
});
