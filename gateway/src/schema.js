export const typeDefs = `#graphql
  type Product { id: ID!, slug: String!, name: String!, description: String!, category: String!, price: Float!, currency: String!, inventory: Int!, active: Boolean! }
  type User { id: ID!, email: String!, role: String! }
  type AuthPayload { token: String!, user: User! }
  type CartItem { productId: ID!, slug: String!, name: String!, price: Float!, quantity: Int! }
  type Cart { id: ID!, items: [CartItem!]!, itemCount: Int!, subtotal: Float! }
  type Order { id: ID!, userId: String!, status: String!, total: Float!, currency: String!, createdAt: String }
  type CheckoutResult { orderId: ID!, status: String!, total: Float! }
  input ProductInput { slug: String!, name: String!, description: String!, category: String!, price: Float!, currency: String = "USD", inventory: Int = 0 }

  type Query {
    health: String!
    me: User
    products(category: String, search: String): [Product!]!
    product(id: ID!): Product
    cart: Cart!
    order(id: ID!): Order
    adminOrders: [Order!]!
  }
  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    createProduct(input: ProductInput!): Product!
    addToCart(productId: ID!, quantity: Int = 1): Cart!
    updateCartItem(productId: ID!, quantity: Int!): Cart!
    removeFromCart(productId: ID!): Cart!
    clearCart: Cart!
    restockProduct(productId: ID!, quantity: Int!): Product!
    checkout(coupon: String, paymentToken: String = "tok_mock_success"): CheckoutResult!
  }
`;
