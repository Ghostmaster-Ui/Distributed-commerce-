import { executeGraphQL } from "./graphql-client";
import type { Cart, Order, Product, ProductDraft, User } from "./types";

const PRODUCT_FIELDS = `
  id slug name description category price currency inventory
`;

const CART_FIELDS = `
  items { productId slug name price quantity }
  itemCount
  subtotal
`;

export async function fetchCurrentUser(token: string): Promise<User | null> {
  const data = await executeGraphQL<{ me: User | null }>(
    `query CurrentUser { me { id email role } }`,
    {},
    token,
  );
  return data.me;
}

export async function fetchProducts(
  filters: {
    category?: string | null;
    search?: string | null;
  } = {},
): Promise<Product[]> {
  const data = await executeGraphQL<{ products: Product[] }>(
    `query Products($category: String, $search: String) {
      products(category: $category, search: $search) { ${PRODUCT_FIELDS} }
    }`,
    filters,
  );
  return data.products;
}

export async function authenticate(
  email: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const data = await executeGraphQL<{ login: { token: string; user: User } }>(
    `mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) { token user { id email role } }
    }`,
    { email, password },
  );
  return data.login;
}

export async function fetchCart(token: string): Promise<Cart> {
  const data = await executeGraphQL<{ cart: Cart }>(
    `query Cart { cart { ${CART_FIELDS} } }`,
    {},
    token,
  );
  return data.cart;
}

export async function addCartItem(token: string, productId: string): Promise<Cart> {
  const data = await executeGraphQL<{ addToCart: Cart }>(
    `mutation AddCartItem($productId: ID!) {
      addToCart(productId: $productId) { ${CART_FIELDS} }
    }`,
    { productId },
    token,
  );
  return data.addToCart;
}

export async function updateCartItem(
  token: string,
  productId: string,
  quantity: number,
): Promise<Cart> {
  const data = await executeGraphQL<{ updateCartItem: Cart }>(
    `mutation UpdateCartItem($productId: ID!, $quantity: Int!) {
      updateCartItem(productId: $productId, quantity: $quantity) { ${CART_FIELDS} }
    }`,
    { productId, quantity },
    token,
  );
  return data.updateCartItem;
}

export async function removeCartItem(token: string, productId: string): Promise<Cart> {
  const data = await executeGraphQL<{ removeFromCart: Cart }>(
    `mutation RemoveCartItem($productId: ID!) {
      removeFromCart(productId: $productId) { ${CART_FIELDS} }
    }`,
    { productId },
    token,
  );
  return data.removeFromCart;
}

export async function checkoutCart(token: string): Promise<{
  orderId: string;
  status: string;
  total: number;
}> {
  const data = await executeGraphQL<{
    checkout: { orderId: string; status: string; total: number };
  }>(
    `mutation Checkout { checkout(paymentToken: "tok_mock_success") { orderId status total } }`,
    {},
    token,
  );
  return data.checkout;
}

export async function fetchAdminDashboard(token: string): Promise<{
  orders: Order[];
  products: Product[];
}> {
  const data = await executeGraphQL<{ adminOrders: Order[]; products: Product[] }>(
    `query AdminDashboard {
      adminOrders { id userId status total currency createdAt }
      products { ${PRODUCT_FIELDS} }
    }`,
    {},
    token,
  );
  return { orders: data.adminOrders, products: data.products };
}

export async function createCatalogProduct(token: string, draft: ProductDraft): Promise<Product> {
  const slug = draft.slug || slugify(draft.name);
  const input = {
    ...draft,
    slug,
    price: Number(draft.price),
    inventory: Number(draft.inventory),
    currency: "USD",
  };
  const data = await executeGraphQL<{ createProduct: Product }>(
    `mutation CreateProduct($input: ProductInput!) {
      createProduct(input: $input) { ${PRODUCT_FIELDS} }
    }`,
    { input },
    token,
  );
  return data.createProduct;
}

export async function restockCatalogProduct(
  token: string,
  productId: string,
  quantity: number,
): Promise<Product> {
  const data = await executeGraphQL<{ restockProduct: Product }>(
    `mutation RestockProduct($productId: ID!, $quantity: Int!) {
      restockProduct(productId: $productId, quantity: $quantity) { ${PRODUCT_FIELDS} }
    }`,
    { productId, quantity },
    token,
  );
  return data.restockProduct;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
