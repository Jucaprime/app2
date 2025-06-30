export enum TransactionType {
  Income = 'income',
  Expense = 'expense',
}

export enum Page {
  Dashboard = 'dashboard',
  Transactions = 'transactions',
  Reports = 'reports',
  ServiceOrder = 'service-order',
  Settings = 'settings',
}

export interface PaymentMethod {
  method: string;
  amount: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: string; // ISO string
  paymentMethods: PaymentMethod[];
}

export interface Preset {
  id: string;
  description: string;
  type: TransactionType;
}

export interface User {
  uid: string;
  email: string;
  name?: string;
}

export interface GeminiTransaction {
  description: string;
  amount: number;
  type: TransactionType;
  paymentMethod?: string;
}