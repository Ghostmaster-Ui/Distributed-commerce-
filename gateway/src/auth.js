import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { config } from "./config.js";

const users = [
  {
    id: "customer-demo",
    email: "customer@meridian.local",
    password: "meridian123",
    role: "CUSTOMER",
  },
  { id: "admin-demo", email: "admin@meridian.local", password: "admin123", role: "ADMIN" },
];

export function login(email, password) {
  const user = users.find(
    (candidate) => candidate.email === email && candidate.password === password,
  );
  if (!user)
    throw new GraphQLError("Invalid email or password", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  const safe = { id: user.id, email: user.email, role: user.role };
  return {
    token: jwt.sign(safe, config.jwtSecret, { expiresIn: "2h", issuer: "meridian-gateway" }),
    user: safe,
  };
}

export function readUser(header = "") {
  if (!header.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), config.jwtSecret, { issuer: "meridian-gateway" });
  } catch {
    return null;
  }
}

export function requireUser(user) {
  if (!user)
    throw new GraphQLError("Sign in required", { extensions: { code: "UNAUTHENTICATED" } });
  return user;
}

export function requireAdmin(user) {
  requireUser(user);
  if (user.role !== "ADMIN")
    throw new GraphQLError("Admin access required", { extensions: { code: "FORBIDDEN" } });
  return user;
}

export function requireCustomer(user) {
  requireUser(user);
  if (user.role !== "CUSTOMER")
    throw new GraphQLError("Customer access required", { extensions: { code: "FORBIDDEN" } });
  return user;
}
