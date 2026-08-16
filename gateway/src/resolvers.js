import { login, requireAdmin, requireCustomer, requireUser } from "./auth.js";

const cartFor = async ({ user, carts }) => {
  const owner = requireCustomer(user);
  const items = await carts.get(owner.id);
  return carts.view(owner.id, items);
};

export const resolvers = {
  Query: {
    health: () => "healthy",
    me: (_, __, { user }) => user,
    products: (_, filters, { catalog }) => catalog.list(filters),
    product: (_, { id }, { catalog }) => catalog.get(id),
    cart: (_, __, context) => cartFor(context),
    order: async (_, { id }, { user, orders }) => {
      requireUser(user);
      const o = await orders.get(id);
      return { ...o, userId: o.user_id, createdAt: o.created_at };
    },
    adminOrders: async (_, __, { user, orders }) => {
      requireAdmin(user);
      return (await orders.list()).map((o) => ({
        ...o,
        userId: o.user_id,
        createdAt: o.created_at,
      }));
    },
  },
  Mutation: {
    login: (_, { email, password }) => login(email, password),
    createProduct: (_, { input }, { user, catalog }) => {
      requireAdmin(user);
      return catalog.create(input);
    },
    addToCart: async (_, { productId, quantity }, { user, carts, catalog }) => {
      const owner = requireCustomer(user);
      return carts.add(owner.id, await catalog.get(productId), quantity);
    },
    updateCartItem: (_, { productId, quantity }, { user, carts }) =>
      carts.update(requireCustomer(user).id, productId, quantity),
    removeFromCart: (_, { productId }, { user, carts }) =>
      carts.remove(requireCustomer(user).id, productId),
    clearCart: (_, __, { user, carts }) => carts.clear(requireCustomer(user).id),
    restockProduct: (_, { productId, quantity }, { user, catalog }) => {
      requireAdmin(user);
      if (quantity < 1 || quantity > 10000)
        throw new Error("Restock quantity must be between 1 and 10,000");
      return catalog.restock(productId, quantity);
    },
    checkout: async (_, { coupon, paymentToken }, { user, carts, orders }) => {
      const owner = requireCustomer(user);
      const items = await carts.get(owner.id);
      if (!items.length) throw new Error("Cart is empty");
      const result = await orders.checkout({
        userId: owner.id,
        items: items.map((i) => ({ productId: i.productId, slug: i.slug, quantity: i.quantity })),
        coupon,
        paymentToken,
      });
      await carts.clear(owner.id);
      return { orderId: result.orderId, status: result.status, total: result.total };
    },
  },
};
