export class CartStore {
  constructor(redis) {
    this.redis = redis;
  }
  key(userId) {
    return `cart:${userId}`;
  }
  async get(userId) {
    const raw = await this.redis.get(this.key(userId));
    return raw ? JSON.parse(raw) : [];
  }
  async save(userId, items) {
    await this.redis.set(this.key(userId), JSON.stringify(items), { EX: 60 * 60 * 24 * 30 });
    return this.view(userId, items);
  }
  view(userId, items) {
    return {
      id: userId,
      items,
      itemCount: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
    };
  }
  async add(userId, product, quantity) {
    const items = await this.get(userId);
    const current = items.find((i) => i.productId === product.id);
    if (current) current.quantity = Math.min(25, current.quantity + quantity);
    else
      items.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        quantity,
      });
    return this.save(userId, items);
  }
  async remove(userId, productId) {
    return this.save(
      userId,
      (await this.get(userId)).filter((i) => i.productId !== productId),
    );
  }
  async update(userId, productId, quantity) {
    if (quantity <= 0) return this.remove(userId, productId);
    const items = await this.get(userId);
    const current = items.find((item) => item.productId === productId);
    if (!current) throw new Error("Cart item not found");
    current.quantity = Math.min(25, quantity);
    return this.save(userId, items);
  }
  async clear(userId) {
    return this.save(userId, []);
  }
}
