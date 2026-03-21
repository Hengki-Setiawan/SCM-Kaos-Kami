import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, orders, expenses } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'products') {
      const data = await db.select().from(products);
      const headers = ['SKU', 'Name', 'Category', 'Stock', 'Min Stock', 'Price', 'Created At'];
      const rows = data.map(p => [p.sku, `"${p.name}"`, p.categoryId, p.currentStock, p.minStock, p.unitPrice, p.createdAt]);
      return createCSVResponse(headers, rows, 'products_export');
    }

    if (type === 'orders') {
      const data = await db.select().from(orders);
      const headers = ['Order #', 'Customer', 'Status', 'Total', 'Platform', 'Created At'];
      const rows = data.map(o => [o.orderNumber, `"${o.customerName}"`, o.status, o.totalPrice, o.platform, o.createdAt]);
      return createCSVResponse(headers, rows, 'orders_export');
    }

    if (type === 'finance') {
      const data = await db.select().from(expenses);
      const headers = ['Title', 'Category', 'Amount', 'Date', 'Notes'];
      const rows = data.map(e => [`"${e.title}"`, e.category, e.amount, e.date, `"${e.notes || ''}"`]);
      return createCSVResponse(headers, rows, 'expenses_export');
    }

    return NextResponse.json({ success: false, error: 'Invalid export type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function createCSVResponse(headers: string[], rows: any[][], filename: string) {
  const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}
