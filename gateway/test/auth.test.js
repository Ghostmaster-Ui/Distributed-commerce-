import assert from "node:assert/strict";
import test from "node:test";
import { login, readUser, requireCustomer } from "../src/auth.js";

test("customer login issues a verifiable token", () => {
  const result = login("customer@meridian.local", "meridian123");
  assert.equal(result.user.role, "CUSTOMER");
  assert.equal(readUser(`Bearer ${result.token}`).email, result.user.email);
});
test("invalid credentials are rejected", () =>
  assert.throws(() => login("customer@meridian.local", "wrong"), /Invalid email/));
test("administrators cannot use customer shopping operations", () =>
  assert.throws(() => requireCustomer({ id: "admin", role: "ADMIN" }), /Customer access required/));
