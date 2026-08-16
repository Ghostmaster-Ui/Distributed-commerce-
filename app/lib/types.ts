export type UserRole = "CUSTOMER" | "ADMIN";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  inventory: number;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface Order {
  id: string;
  userId: string;
  status: string;
  total: number;
  currency: string;
  createdAt?: string;
}

export interface ProductDraft {
  name: string;
  slug: string;
  description: string;
  category: string;
  price: string;
  inventory: string;
}
