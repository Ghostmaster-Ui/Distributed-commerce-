"use client";

import { useEffect, useMemo, useState } from "react";
import { ProjectOverview } from "./components/ProjectOverview";
import {
  addCartItem,
  authenticate,
  checkoutCart,
  createCatalogProduct,
  fetchAdminDashboard,
  fetchCart,
  fetchCurrentUser,
  fetchProducts,
  removeCartItem,
  restockCatalogProduct,
  updateCartItem,
} from "./lib/commerce-api";
import {
  ADMIN_DEMO,
  CUSTOMER_DEMO,
  EMPTY_CART,
  EMPTY_PRODUCT_DRAFT,
  PRODUCT_VISUALS,
} from "./lib/constants";
import type { Cart, CartItem, Order, Product, User } from "./lib/types";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]),
    [category, setCategory] = useState("All"),
    [query, setQuery] = useState("");
  const [cart, setCart] = useState<Cart>(EMPTY_CART),
    [cartOpen, setCartOpen] = useState(false),
    [authOpen, setAuthOpen] = useState(false),
    [adminOpen, setAdminOpen] = useState(false);
  const [token, setToken] = useState(""),
    [user, setUser] = useState<User | null>(null),
    [email, setEmail] = useState<string>(CUSTOMER_DEMO.email),
    [password, setPassword] = useState<string>(CUSTOMER_DEMO.password);
  const [orders, setOrders] = useState<Order[]>([]),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [checkoutStatus, setCheckoutStatus] = useState("");
  const [adminProducts, setAdminProducts] = useState<Product[]>([]),
    [restock, setRestock] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState(EMPTY_PRODUCT_DRAFT);

  useEffect(() => {
    async function restoreSession() {
      const saved = localStorage.getItem("meridian-token");
      if (!saved) return;
      try {
        const restoredUser = await fetchCurrentUser(saved);
        setToken(saved);
        setUser(restoredUser);
        if (restoredUser?.role === "CUSTOMER") {
          setCart(await fetchCart(saved));
        }
      } catch {
        localStorage.removeItem("meridian-token");
      }
    }
    void restoreSession();
  }, []);
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        setProducts(
          await fetchProducts({
            category: category === "All" ? null : category,
            search: query || null,
          }),
        );
      } catch (error) {
        flash((error as Error).message);
      } finally {
        setLoading(false);
      }
    }
    void loadProducts();
  }, [category, query]);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );
  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }
  async function login() {
    try {
      const session = await authenticate(email, password);
      setToken(session.token);
      setUser(session.user);
      localStorage.setItem("meridian-token", session.token);
      setAuthOpen(false);
      if (session.user.role === "CUSTOMER") {
        setCart(await fetchCart(session.token));
      } else {
        setCart(EMPTY_CART);
        flash("Admin mode enabled — shopping is disabled");
        return;
      }
      flash("Welcome to Meridian");
    } catch (e) {
      flash((e as Error).message);
    }
  }
  function logout() {
    setToken("");
    setUser(null);
    setCart(EMPTY_CART);
    localStorage.removeItem("meridian-token");
    flash("Signed out");
  }
  async function add(product: Product) {
    if (user?.role === "ADMIN") {
      await loadAdmin();
      return;
    }
    if (!token) {
      setAuthOpen(true);
      flash("Sign in as a customer to shop");
      return;
    }
    try {
      setCart(await addCartItem(token, product.id));
      flash(`${product.name} added to your bag`);
    } catch (e) {
      flash((e as Error).message);
    }
  }
  async function remove(id: string) {
    setCart(await removeCartItem(token, id));
  }
  async function changeQuantity(item: CartItem, quantity: number) {
    try {
      setCart(await updateCartItem(token, item.productId, quantity));
    } catch (e) {
      flash((e as Error).message);
    }
  }
  async function checkout() {
    setCheckoutStatus("Processing secure mock payment…");
    try {
      const order = await checkoutCart(token);
      setCart(EMPTY_CART);
      setCheckoutStatus(
        `Order ${order.orderId.slice(0, 8)} confirmed · $${order.total.toFixed(2)}`,
      );
      flash("Order confirmed");
      setProducts(await fetchProducts());
      const socket = new WebSocket(`ws://localhost:8003/ws/orders/${order.orderId}`);
      socket.onmessage = (e) => {
        const event = JSON.parse(e.data);
        if (event.status) setCheckoutStatus(`Order ${order.orderId.slice(0, 8)} · ${event.status}`);
      };
      window.setTimeout(() => socket.close(), 15000);
    } catch (e) {
      setCheckoutStatus((e as Error).message);
    }
  }
  async function loadAdmin() {
    if (user?.role !== "ADMIN") {
      setEmail(ADMIN_DEMO.email);
      setPassword(ADMIN_DEMO.password);
      setAuthOpen(true);
      flash("Sign in with the admin demo account");
      return;
    }
    const dashboard = await fetchAdminDashboard(token);
    setOrders(dashboard.orders);
    setAdminProducts(dashboard.products);
    setAdminOpen(true);
  }
  async function createProduct() {
    try {
      const createdProduct = await createCatalogProduct(token, draft);
      setAdminProducts((items) =>
        [...items, createdProduct].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setProducts((items) =>
        [...items, createdProduct].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setDraft(EMPTY_PRODUCT_DRAFT);
      flash(`${createdProduct.name} is now live`);
    } catch (e) {
      flash((e as Error).message);
    }
  }
  async function restockProduct(product: Product) {
    const quantity = Number(restock[product.id] || 0);
    if (quantity < 1) {
      flash("Enter a restock quantity");
      return;
    }
    try {
      const updatedProduct = await restockCatalogProduct(token, product.id, quantity);
      setAdminProducts((items) =>
        items.map((item) => (item.id === product.id ? updatedProduct : item)),
      );
      setProducts((items) => items.map((item) => (item.id === product.id ? updatedProduct : item)));
      setRestock((values) => ({ ...values, [product.id]: "" }));
      flash(`${product.name} restocked to ${updatedProduct.inventory}`);
    } catch (e) {
      flash((e as Error).message);
    }
  }

  return (
    <main>
      <header className="nav shell">
        <a className="brand" href="#top">
          <span>M</span> Meridian
        </a>
        <nav>
          <a href="#shop">Shop</a>
          <a href="#architecture">Architecture</a>
          <button className="nav-link" onClick={loadAdmin}>
            Admin
          </button>
        </nav>
        <div className="nav-actions">
          <label className="search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search products"
            />
          </label>
          {user ? (
            <div className="signed-in">
              <span>
                {user.email.split("@")[0]} · {user.role.toLowerCase()}
              </span>
              <button className="signout" onClick={logout}>
                Sign out
              </button>
            </div>
          ) : (
            <button className="signin" onClick={() => setAuthOpen(true)}>
              Sign in
            </button>
          )}
          {user?.role === "CUSTOMER" && (
            <button className="bag" onClick={() => setCartOpen(true)}>
              Bag <b>{cart.itemCount}</b>
            </button>
          )}
          {user?.role === "ADMIN" && (
            <button className="admin-header" onClick={loadAdmin}>
              Inventory
            </button>
          )}
        </div>
      </header>
      <ProjectOverview />
      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Thoughtful technology · Live collection</p>
          <h1>
            Objects that make
            <br />
            every day <em>flow.</em>
          </h1>
          <p className="lede">
            Considered tools for work, sound, and life—now powered by real-time inventory and
            transactional checkout.
          </p>
          <a className="primary" href="#shop">
            Explore the collection <span>↗</span>
          </a>
          <div className="hero-meta">
            <span>Free shipping over $100</span>
            <span>30-day returns</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="headphones">
            <div className="band" />
            <div className="cup left" />
            <div className="cup right" />
          </div>
          <div className="feature-card">
            <span>Featured</span>
            <strong>Arc One</strong>
            <small>Immersive, all day.</small>
          </div>
        </div>
      </section>
      <section className="trust">
        <div className="shell trust-inner">
          <p>Live inventory</p>
          <p>Persistent cart</p>
          <p>Event-driven orders</p>
          <p>Secure mock checkout</p>
        </div>
      </section>
      <section className="collection shell" id="shop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The live collection</p>
            <h2>Find your everyday essentials.</h2>
          </div>
          <p>{products.length} pieces available</p>
        </div>
        <div className="filters">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="loading">Loading the collection…</div>
        ) : (
          <div className="product-grid">
            {products.map((p, i) => {
              const [color, icon] = PRODUCT_VISUALS[p.category] ?? [["coral", "amber"][i % 2], "◐"];
              const inBag = cart.items.find((item) => item.productId === p.id)?.quantity ?? 0;
              const available = Math.max(0, p.inventory - inBag);
              return (
                <article className="product" key={p.id}>
                  <div className={`product-visual ${color}`}>
                    <span className="tag live-stock">
                      {available > 0 ? `${available} available` : "Sold out"}
                      {inBag > 0 && <small>{inBag} in your bag</small>}
                    </span>
                    <button className="heart">♡</button>
                    <span className="product-icon">{icon}</span>
                    <button
                      className="quick"
                      disabled={!available && user?.role !== "ADMIN"}
                      onClick={() => add(p)}
                    >
                      {user?.role === "ADMIN"
                        ? "Manage inventory"
                        : available
                          ? "Add to bag"
                          : "Sold out"}
                    </button>
                  </div>
                  <div className="product-info">
                    <div>
                      <h3>{p.name}</h3>
                      <p>
                        {p.category} · {p.description}
                      </p>
                    </div>
                    <div className="price">
                      <strong>${p.price}</strong>
                      <span>Live price</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className="manifesto shell" id="story">
        <p className="eyebrow">Why Meridian</p>
        <blockquote>
          “The best technology doesn’t ask for attention. It quietly makes room for what matters.”
        </blockquote>
        <a href="#shop">Our approach →</a>
      </section>
      <footer className="footer shell">
        <a className="brand" href="#top">
          <span>M</span> Meridian
        </a>
        <p>Technology, thoughtfully selected.</p>
        <div>
          <a href="#shop">Support</a>
          <button className="nav-link" onClick={loadAdmin}>
            Admin console
          </button>
        </div>
        <small>© 2026 Meridian Goods</small>
      </footer>

      {user?.role === "CUSTOMER" && !cartOpen && (
        <button
          className="floating-bag"
          onClick={() => setCartOpen(true)}
          aria-label={`Open shopping bag with ${cart.itemCount} items`}
        >
          <span>Bag</span>
          <b>{cart.itemCount}</b>
          <small>${cart.subtotal.toFixed(2)}</small>
        </button>
      )}

      <button
        className={`overlay ${cartOpen || authOpen || adminOpen ? "show" : ""}`}
        aria-label="Close open panel"
        onClick={() => {
          setCartOpen(false);
          setAuthOpen(false);
          setAdminOpen(false);
        }}
      />
      <aside className={`drawer ${cartOpen ? "open" : ""}`} aria-label="Shopping bag">
        <button className="close" onClick={() => setCartOpen(false)}>
          ×
        </button>
        <p className="eyebrow">Your bag</p>
        <h2>
          {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
        </h2>
        <div className="cart-items">
          {cart.items.map((i) => (
            <div className="cart-row" key={i.productId}>
              <div>
                <strong>{i.name}</strong>
                <div className="quantity-control" aria-label={`Quantity for ${i.name}`}>
                  <button
                    aria-label="Decrease quantity"
                    onClick={() => changeQuantity(i, i.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{i.quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    onClick={() => changeQuantity(i, i.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <span>${(i.price * i.quantity).toFixed(2)}</span>
                <button className="remove-item" onClick={() => remove(i.productId)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          {!cart.items.length && (
            <p className="empty-cart">Your bag is ready for something thoughtful.</p>
          )}
        </div>
        <div className="cart-total">
          <span>Subtotal</span>
          <strong>${cart.subtotal.toFixed(2)}</strong>
        </div>
        <button className="checkout" disabled={!cart.items.length} onClick={checkout}>
          Complete mock checkout
        </button>
        {checkoutStatus && <p className="status">{checkoutStatus}</p>}
        <small className="safe">Demo only—no real payment details are collected.</small>
      </aside>
      <section className={`modal auth-modal ${authOpen ? "open" : ""}`}>
        <button className="close" onClick={() => setAuthOpen(false)}>
          ×
        </button>
        <p className="eyebrow">Meridian account</p>
        <h2>Welcome back.</h2>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="checkout" onClick={login}>
          Sign in
        </button>
        <p className="demo">
          Customer: customer@meridian.local / meridian123
          <br />
          Admin: admin@meridian.local / admin123
        </p>
      </section>
      <section className={`modal admin-modal ${adminOpen ? "open" : ""}`}>
        <button className="close" onClick={() => setAdminOpen(false)}>
          ×
        </button>
        <p className="eyebrow">Admin operations</p>
        <h2>Inventory management</h2>
        <div className="admin-grid">
          <div className="new-product">
            <h3>Add a new product</h3>
            <div className="admin-form">
              <label>
                Product name
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Drift Mouse"
                />
              </label>
              <label>
                Slug <small>Optional</small>
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  placeholder="Generated automatically"
                />
              </label>
              <label className="wide">
                Description
                <input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="What makes this product useful?"
                />
              </label>
              <label>
                Category
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                >
                  <option>Audio</option>
                  <option>Workspace</option>
                  <option>Wearables</option>
                  <option>Travel</option>
                  <option>Accessories</option>
                </select>
              </label>
              <label>
                Price ($)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                />
              </label>
              <label>
                Opening stock
                <input
                  type="number"
                  min="0"
                  value={draft.inventory}
                  onChange={(e) => setDraft({ ...draft, inventory: e.target.value })}
                />
              </label>
            </div>
            <button className="admin-action" onClick={createProduct}>
              Create product card + inventory
            </button>
          </div>
          <div className="inventory-list">
            <h3>Restock inventory</h3>
            {adminProducts.map((p) => (
              <div className="inventory-row" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {p.category} · ${p.price}
                  </small>
                </div>
                <b>{p.inventory} units</b>
                <input
                  type="number"
                  min="1"
                  placeholder="Add qty"
                  value={restock[p.id] ?? ""}
                  onChange={(e) => setRestock({ ...restock, [p.id]: e.target.value })}
                />
                <button onClick={() => restockProduct(p)}>Add stock</button>
              </div>
            ))}
          </div>
        </div>
        <div className="order-console">
          <h3>Recent orders</h3>
          <div className="order-table">
            <div className="order-head">
              <b>Order</b>
              <b>Customer</b>
              <b>Status</b>
              <b>Total</b>
            </div>
            {orders.map((o) => (
              <div className="order-row" key={o.id}>
                <span>{o.id.slice(0, 8)}</span>
                <span>{o.userId}</span>
                <span className="order-status">{o.status}</span>
                <strong>${o.total.toFixed(2)}</strong>
              </div>
            ))}
            {!orders.length && <p>No orders yet. Complete a customer checkout to see one here.</p>}
          </div>
        </div>
      </section>
      <div className={`toast ${notice ? "show" : ""}`} role="status">
        <span>✓</span>
        {notice}
      </div>
    </main>
  );
}
