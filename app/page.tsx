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

      {/* Architecture section */}
      <section className="arch-section shell">
        <h2 className="arch-title">Platform Architecture</h2>
        <p className="arch-subtitle">
          Meridian is a distributed commerce system — each concern is its own service, wired together through a GraphQL gateway.
        </p>

        <div className="arch-diagrams">
          {/* System architecture diagram */}
          <div className="arch-card">
            <h3>System Overview</h3>
            <div className="arch-diagram">
              <svg viewBox="0 0 820 560" xmlns="http://www.w3.org/2000/svg" aria-label="System architecture diagram">
                {/* defs */}
                <defs>
                  <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#555" />
                  </marker>
                  <marker id="arrow-rev" markerWidth="8" markerHeight="8" refX="2" refY="3" orient="auto">
                    <path d="M8,0 L8,6 L0,3 z" fill="#555" />
                  </marker>
                </defs>

                {/* Browsers row */}
                <rect x="260" y="20" width="160" height="40" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="340" y="45" textAnchor="middle" fill="#fff" fontSize="12">Customer browser</text>

                <rect x="580" y="20" width="140" height="40" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="650" y="45" textAnchor="middle" fill="#fff" fontSize="12">Admin browser</text>

                <rect x="740" y="20" width="70" height="40" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="775" y="45" textAnchor="middle" fill="#fff" fontSize="10">Platform services</text>

                {/* Arrow: browsers → storefront */}
                <line x1="340" y1="60" x2="340" y2="100" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <line x1="650" y1="60" x2="450" y2="100" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>

                {/* Storefront */}
                <rect x="260" y="100" width="200" height="50" rx="6" fill="#252520" stroke="#888" strokeWidth="2"/>
                <text x="360" y="122" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Next.js-compatible</text>
                <text x="360" y="138" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">storefront</text>

                {/* Platform services column */}
                <line x1="775" y1="60" x2="680" y2="120" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <rect x="720" y="120" width="90" height="36" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="765" y="143" textAnchor="middle" fill="#fff" fontSize="11">Prometheus</text>
                <line x1="765" y1="156" x2="765" y2="190" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <rect x="720" y="190" width="90" height="36" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="765" y="213" textAnchor="middle" fill="#fff" fontSize="11">Grafana</text>

                {/* Arrow: storefront → gateway */}
                <line x1="290" y1="150" x2="210" y2="200" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>

                {/* Gateway */}
                <rect x="100" y="200" width="180" height="40" rx="6" fill="#252520" stroke="#888" strokeWidth="2"/>
                <text x="190" y="225" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Node.js GraphQL gateway</text>

                {/* JWT */}
                <line x1="130" y1="240" x2="130" y2="280" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <rect x="40" y="280" width="170" height="44" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="125" y="298" textAnchor="middle" fill="#fff" fontSize="11">JWT role-based</text>
                <text x="125" y="313" textAnchor="middle" fill="#fff" fontSize="11">authentication</text>

                {/* Redis carts */}
                <line x1="215" y1="240" x2="280" y2="280" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <rect x="220" y="280" width="130" height="40" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="285" y="305" textAnchor="middle" fill="#fff" fontSize="11">Redis persistent carts</text>

                {/* Arrows to microservices */}
                <line x1="250" y1="240" x2="310" y2="350" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <line x1="270" y1="240" x2="450" y2="350" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <line x1="310" y1="240" x2="590" y2="280" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>

                {/* Order service */}
                <ellipse cx="590" cy="300" rx="90" ry="26" fill="#252520" stroke="#888" strokeWidth="2"/>
                <text x="590" y="305" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">FastAPI Order service</text>

                {/* Catalog */}
                <rect x="230" y="350" width="150" height="40" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="305" y="375" textAnchor="middle" fill="#fff" fontSize="11">FastAPI Catalog service</text>

                {/* Pricing */}
                <rect x="390" y="350" width="140" height="40" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="460" y="375" textAnchor="middle" fill="#fff" fontSize="11">FastAPI Pricing service</text>

                {/* Inventory */}
                <line x1="590" y1="326" x2="590" y2="348" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <rect x="530" y="350" width="140" height="40" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="600" y="375" textAnchor="middle" fill="#fff" fontSize="11">FastAPI Inventory service</text>

                {/* Payment */}
                <rect x="680" y="350" width="130" height="44" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="745" y="369" textAnchor="middle" fill="#fff" fontSize="11">FastAPI Mock</text>
                <text x="745" y="383" textAnchor="middle" fill="#fff" fontSize="11">Payment service</text>

                {/* Order ↔ payment */}
                <line x1="680" y1="340" x2="670" y2="326" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <line x1="700" y1="326" x2="710" y2="340" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>

                {/* Redis quote cache */}
                <line x1="460" y1="390" x2="420" y2="440" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <rect x="340" y="440" width="150" height="40" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="415" y="465" textAnchor="middle" fill="#fff" fontSize="11">Redis quote cache</text>

                {/* PostgreSQL */}
                <line x1="305" y1="390" x2="480" y2="455" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <line x1="600" y1="390" x2="540" y2="450" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <ellipse cx="520" cy="475" rx="70" ry="26" fill="#252520" stroke="#888" strokeWidth="2"/>
                <text x="520" y="480" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">PostgreSQL</text>

                {/* Kafka/Redpanda */}
                <line x1="745" y1="394" x2="680" y2="450" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <line x1="620" y1="390" x2="660" y2="450" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <rect x="630" y="450" width="140" height="44" rx="6" fill="#252520" stroke="#888" strokeWidth="2"/>
                <text x="700" y="469" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Kafka-compatible</text>
                <text x="700" y="483" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">Redpanda</text>

                {/* WebSocket */}
                <line x1="700" y1="494" x2="700" y2="520" stroke="#555" strokeWidth="1.5" markerEnd="url(#arrow)"/>
                <rect x="620" y="520" width="160" height="36" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5"/>
                <text x="700" y="543" textAnchor="middle" fill="#fff" fontSize="11">WebSocket status updates</text>
              </svg>
            </div>
          </div>

          {/* Checkout sequence diagram */}
          <div className="arch-card">
            <h3>Checkout Sequence</h3>
            <div className="arch-diagram">
              <svg viewBox="0 0 820 520" xmlns="http://www.w3.org/2000/svg" aria-label="Checkout sequence diagram">
                <defs>
                  <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#888" />
                  </marker>
                  <marker id="arr2-dash" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="#555" />
                  </marker>
                </defs>

                {/* Participant boxes — top */}
                {[
                  [30, "Customer"],
                  [145, "Storefront"],
                  [255, "GraphQL\nGateway"],
                  [365, "Pricing"],
                  [455, "Mock\nPayment"],
                  [545, "Inventory"],
                  [635, "Orders"],
                  [725, "Kafka /\nWebSocket"],
                ].map(([x, label], i) => {
                  const lx = x as number;
                  const lines = (label as string).split("\n");
                  return (
                    <g key={i}>
                      {i === 0 ? (
                        <>
                          <circle cx={lx + 20} cy="22" r="12" fill="none" stroke="#888" strokeWidth="1.5"/>
                          <line x1={lx+20} y1="34" x2={lx+20} y2="46" stroke="#888" strokeWidth="1.5"/>
                          <line x1={lx+5} y1="56" x2={lx+35} y2="56" stroke="#888" strokeWidth="1.5"/>
                          <line x1={lx+20} y1="46" x2={lx+5} y2="60" stroke="#888" strokeWidth="1.5"/>
                          <line x1={lx+20} y1="46" x2={lx+35} y2="60" stroke="#888" strokeWidth="1.5"/>
                          <text x={lx+20} y="78" textAnchor="middle" fill="#ccc" fontSize="10">Customer</text>
                        </>
                      ) : (
                        <>
                          <rect x={lx} y="10" width="80" height={lines.length > 1 ? 36 : 28} rx="4" fill="#1e1e1a" stroke="#666" strokeWidth="1.5"/>
                          {lines.map((line, li) => (
                            <text key={li} x={lx+40} y={lines.length > 1 ? 24+li*13 : 28} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">{line}</text>
                          ))}
                        </>
                      )}
                    </g>
                  );
                })}

                {/* Lifelines */}
                {[50, 185, 295, 405, 495, 585, 675, 765].map((x, i) => (
                  <line key={i} x1={x} y1="90" x2={x} y2="490" stroke="#333" strokeWidth="1" strokeDasharray="4,4"/>
                ))}

                {/* Messages */}
                {[
                  [50, 185, 110, "Review cart and checkout", false, false],
                  [185, 295, 135, "Submit checkout mutation", false, false],
                  [295, 405, 158, "Request authoritative quote", false, false],
                  [405, 295, 181, "Return cached or calculated total", true, true],
                  [295, 495, 204, "Authorize safe test payment", false, false],
                  [495, 295, 227, "Return mock authorization", true, true],
                  [295, 585, 250, "Reserve inventory transactionally", false, false],
                  [585, 295, 273, "Confirm reservation", true, true],
                  [295, 675, 296, "Persist confirmed order", false, false],
                  [675, 765, 319, "Publish order event", false, false],
                  [765, 295, 342, "Stream status update", true, true],
                  [295, 185, 365, "Clear cart after confirmation", true, true],
                ].map(([x1, x2, y, label, isDash, isReturn], i) => {
                  const lx1 = x1 as number, lx2 = x2 as number, ly = y as number;
                  const isLeft = lx2 < lx1;
                  return (
                    <g key={i}>
                      <line
                        x1={lx1} y1={ly} x2={lx2} y2={ly}
                        stroke={isDash ? "#555" : "#888"}
                        strokeWidth="1.5"
                        strokeDasharray={isDash ? "5,4" : undefined}
                        markerEnd="url(#arr2)"
                      />
                      <text
                        x={(lx1+lx2)/2} y={ly-5}
                        textAnchor="middle"
                        fill={isDash ? "#888" : "#bbb"}
                        fontSize="9.5"
                        fontStyle={isDash ? "italic" : "normal"}
                      >{label as string}</text>
                    </g>
                  );
                })}

                {/* Participant boxes — bottom */}
                {[
                  [30, "Customer"],
                  [145, "Storefront"],
                  [255, "GraphQL\nGateway"],
                  [365, "Pricing"],
                  [455, "Mock\nPayment"],
                  [545, "Inventory"],
                  [635, "Orders"],
                  [725, "Kafka /\nWebSocket"],
                ].map(([x, label], i) => {
                  const lx = x as number;
                  const lines = (label as string).split("\n");
                  return (
                    <g key={i}>
                      {i === 0 ? (
                        <>
                          <circle cx={lx + 20} cy="498" r="12" fill="none" stroke="#888" strokeWidth="1.5"/>
                          <text x={lx+20} y="514" textAnchor="middle" fill="#ccc" fontSize="10">Customer</text>
                        </>
                      ) : (
                        <>
                          <rect x={lx} y="490" width="80" height={lines.length > 1 ? 36 : 28} rx="4" fill="#1e1e1a" stroke="#666" strokeWidth="1.5"/>
                          {lines.map((line, li) => (
                            <text key={li} x={lx+40} y={lines.length > 1 ? 504+li*13 : 508} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600">{line}</text>
                          ))}
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
