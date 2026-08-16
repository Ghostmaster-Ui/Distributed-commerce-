const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET ?? "local-development-secret-change-me";

if (isProduction && jwtSecret === "local-development-secret-change-me") {
  throw new Error("JWT_SECRET must be configured in production");
}

export const config = Object.freeze({
  port: Number(process.env.PORT ?? 4000),
  isProduction,
  jwtSecret,
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  catalogServiceUrl: process.env.CATALOG_SERVICE_URL ?? "http://localhost:8000",
  orderServiceUrl: process.env.ORDER_SERVICE_URL ?? "http://localhost:8003",
});
