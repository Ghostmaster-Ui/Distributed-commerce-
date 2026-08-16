import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { createClient } from "redis";
import { readUser } from "./auth.js";
import { CartStore } from "./cart-store.js";
import { CatalogClient } from "./catalog-client.js";
import { config } from "./config.js";
import { OrderClient } from "./order-client.js";
import { resolvers } from "./resolvers.js";
import { typeDefs } from "./schema.js";

const redis = createClient({ url: config.redisUrl });
redis.on("error", (error) => console.error("Redis", error));
await redis.connect();
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: !config.isProduction,
});
const { url } = await startStandaloneServer(server, {
  listen: { port: config.port },
  context: async ({ req }) => ({
    user: readUser(req.headers.authorization),
    catalog: new CatalogClient(),
    orders: new OrderClient(),
    carts: new CartStore(redis),
  }),
});
console.log(`Meridian GraphQL gateway ready at ${url}`);
