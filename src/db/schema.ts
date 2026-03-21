import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon'),
  description: text('description'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').references(() => categories.id).notNull(),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  description: text('description'),
  imageUrl: text('image_url'),
  color: text('color'),
  size: text('size'),
  material: text('material'),
  thickness: text('thickness'),
  sleeveType: text('sleeve_type'),
  variantType: text('variant_type'),
  unit: text('unit').notNull(),
  unitPrice: real('unit_price'),
  buyPrice: real('buy_price'),
  minStock: integer('min_stock').notNull().default(0),
  currentStock: integer('current_stock').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const stockMovements = sqliteTable('stock_movements', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id).notNull(),
  type: text('type').notNull(), // IN, OUT, ADJUSTMENT, UNDONE
  quantity: integer('quantity').notNull(),
  reason: text('reason').notNull(),
  referenceId: text('reference_id'),
  notes: text('notes'),
  createdBy: text('created_by'),
  undoToken: text('undo_token'), // Added for Phase 7
  canBeUndone: integer('can_be_undone', { mode: 'boolean' }).default(false), // Added for Phase 7
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerName: text('customer_name').notNull(),
  platform: text('platform').notNull(),
  status: text('status').notNull(), // pending, processing, shipped, completed, cancelled
  totalPrice: real('total_price'),
  receiptImageUrl: text('receipt_image_url'),
  receiptData: text('receipt_data'), // JSON strings
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id).notNull(),
  productId: text('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull()
});

export const priceReferences = sqliteTable('price_references', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id),
  rawInput: text('raw_input').notNull(),
  parsedUnitPrice: real('parsed_unit_price'),
  totalPrice: real('total_price'),
  quantity: integer('quantity'),
  unit: text('unit'),
  aiResponse: text('ai_response'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  source: text('source'), // web, telegram
  role: text('role').notNull(), // user, assistant, system
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  contextType: text('context_type'),
  metadata: text('metadata'), // JSON string
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id),
  type: text('type').notNull(),
  message: text('message').notNull(),
  isSent: integer('is_sent', { mode: 'boolean' }).default(false),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const autoDeductRules = sqliteTable('auto_deduct_rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  items: text('items').notNull(), // JSON array: [{productId, quantity}]
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const telegramUsers = sqliteTable('telegram_users', {
  id: text('id').primaryKey(),
  telegramId: text('telegram_id').notNull().unique(),
  username: text('username'),
  firstName: text('first_name'),
  role: text('role').notNull().default('staff'), // admin, staff
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactPerson: text('contact_person'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(), // gaji, bahanbaku, sewa, iklan, operasional, dll
  amount: real('amount').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD format usually
  supplierId: text('supplier_id').references(() => suppliers.id),
  notes: text('notes'),
  receiptUrl: text('receipt_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});
