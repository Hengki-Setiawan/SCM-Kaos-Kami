import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(3, 'Nama produk minimal 3 karakter'),
  sku: z.string().min(3, 'SKU minimal 3 karakter'),
  categoryId: z.string().min(1, 'Kategori wajib dipilih'),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  thickness: z.string().optional(),
  sleeveType: z.string().optional(),
  buyPrice: z.number().min(0, 'Harga beli tidak boleh negatif').optional(),
  unitPrice: z.number().min(0, 'Harga jual tidak boleh negatif').optional(),
  minStock: z.number().int().min(0, 'Minimal stok tidak boleh negatif').optional(),
  unitValue: z.number().int().min(1, 'Nilai satuan minimal 1').optional(),
  unitType: z.string().min(1, 'Tipe satuan wajib diisi'),
  imageUrl: z.string().url('URL gambar tidak valid').optional().or(z.literal('')),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'Produk wajib dipilih'),
  quantity: z.number().int().min(1, 'Jumlah minimal 1'),
  unitPrice: z.number().int().min(0, 'Harga tidak boleh negatif'),
});

export const orderSchema = z.object({
  customerName: z.string().min(3, 'Nama pelanggan minimal 3 karakter'),
  platform: z.string().refine(
    (val) => ['shopee', 'tiktok', 'tokopedia', 'lazada', 'whatsapp', 'manual'].includes(val),
    { message: 'Platform tidak valid' }
  ),
  totalPrice: z.number().min(0, 'Total harga tidak valid'),
  items: z.array(orderItemSchema).min(1, 'Pesanan harus memiliki minimal 1 produk'),
  resiNumber: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2, 'Nama kategori minimal 2 karakter'),
  slug: z.string().min(2, 'Slug minimal 2 karakter'),
  icon: z.string().optional(),
});
