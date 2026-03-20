import { config } from 'dotenv';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { categories, products, autoDeductRules } from './schema';
import { v4 as uuidv4 } from 'uuid';

config({ path: '.env.local' });

async function seed() {
  console.log('🌱 Starting seed...');

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const db = drizzle(client);

  try {
    // 1. Seed Categories
    console.log('📦 Seeding categories...');
    const categoryData = [
      { id: uuidv4(), name: 'Baju Polos (Blank)', slug: 'baju-polos', icon: '🧵', description: 'Stok bahan kaos mentah' },
      { id: uuidv4(), name: 'DTF Print', slug: 'dtf-print', icon: '🎨', description: 'Stok sablon DTF' },
      { id: uuidv4(), name: 'Aksesoris Jadi', slug: 'aksesoris-jadi', icon: '✅', description: 'Ganci NFC, stiker jadi, casing ganci jadi' },
      { id: uuidv4(), name: 'Bahan Aksesoris', slug: 'bahan-aksesoris', icon: '🔩', description: 'Casing ganci kosong, chip NFC, bahan stiker' },
      { id: uuidv4(), name: 'Baju Jadi', slug: 'baju-jadi', icon: '👕', description: 'Produk kaos siap jual' },
      { id: uuidv4(), name: 'Alat & Perlengkapan', slug: 'alat-perlengkapan', icon: '🛠️', description: 'Kertas termal, solasi, plastik zipper' },
      { id: uuidv4(), name: 'Packaging', slug: 'packaging', icon: '📦', description: 'Plastik polymailer, stiker packing' }
    ];

    await db.insert(categories).values(categoryData).onConflictDoNothing();
    
    // Get inserted categories for foreign keys
    const insertedCategories = await db.select().from(categories);
    const getCatId = (slug: string) => insertedCategories.find(c => c.slug === slug)?.id!;

    // 2. Seed Initial Products
    console.log('👕 Seeding products...');
    
    const productData: any[] = [];

    // Baju Polos
    const polosId = getCatId('baju-polos');
    const sizes = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];
    const colors = ['Hitam', 'Putih'];
    const materials = ['Cotton Combed 24s', 'Cotton Combed 30s', 'Polyester'];
    
    let skuCounter = 1;
    for (const color of colors) {
      for (const size of sizes) {
        for (const material of materials) {
          productData.push({
            id: uuidv4(),
            categoryId: polosId,
            name: `Kaos Polos ${color} ${size} ${material}`,
            sku: `POLOS-${color.toUpperCase().substring(0,3)}-${size}-${material.split(' ')[2]}-${skuCounter++}`,
            color,
            size,
            material,
            sleeveType: 'Pendek',
            unit: 'pcs',
            currentStock: 0,
            minStock: 10
          });
        }
      }
    }

    // DTF
    const dtfId = getCatId('dtf-print');
    const dtfs = ['Random', 'Kami Depresi', 'Kami Skizo', 'Kami Bahagia'];
    for (const dtf of dtfs) {
      productData.push({
        id: uuidv4(),
        categoryId: dtfId,
        name: `DTF ${dtf}`,
        sku: `DTF-${dtf.replace(' ', '').toUpperCase()}`,
        unit: 'lembar',
        currentStock: 0,
        minStock: 20
      });
    }

    // Aksesoris Jadi
    const accJadiId = getCatId('aksesoris-jadi');
    productData.push(
      { id: uuidv4(), categoryId: accJadiId, name: 'Ganci NFC Jadi', sku: 'ACC-GANCI-NFC', unit: 'pcs', currentStock: 0, minStock: 20 },
      { id: uuidv4(), categoryId: accJadiId, name: 'Stiker Anime', sku: 'STIKER-ANIME', unit: 'pcs', currentStock: 0, minStock: 50 },
      { id: uuidv4(), categoryId: accJadiId, name: 'Stiker Kami Skizo', sku: 'STIKER-SKIZO', unit: 'pcs', currentStock: 0, minStock: 50 }
    );

    // Bahan Aksesoris
    const bahanAccId = getCatId('bahan-aksesoris');
    productData.push(
      { id: uuidv4(), categoryId: bahanAccId, name: 'Casing Ganci Kosong', sku: 'BAHAN-CASING', unit: 'pcs', currentStock: 0, minStock: 50 },
      { id: uuidv4(), categoryId: bahanAccId, name: 'Chip NFC', sku: 'BAHAN-CHIP-NFC', unit: 'pcs', currentStock: 0, minStock: 50 },
      { id: uuidv4(), categoryId: bahanAccId, name: 'Ring Ganci', sku: 'BAHAN-RING', unit: 'pcs', currentStock: 0, minStock: 100 }
    );

    // Packaging & Alat
    const toolsId = getCatId('alat-perlengkapan');
    const packId = getCatId('packaging');
    
    const polymailerId = uuidv4();
    const zipperId = uuidv4();
    const stikerBonusId = uuidv4();
    const termalId = uuidv4();

    productData.push(
      { id: polymailerId, categoryId: packId, name: 'Plastik Polymailer', sku: 'PACK-POLY', unit: 'pcs', currentStock: 0, minStock: 100 },
      { id: zipperId, categoryId: packId, name: 'Plastik Zipper', sku: 'PACK-ZIP', unit: 'pcs', currentStock: 0, minStock: 100 },
      { id: stikerBonusId, categoryId: packId, name: 'Stiker Bonus Packing', sku: 'PACK-STIKER', unit: 'lembar', currentStock: 0, minStock: 200 },
      { id: termalId, categoryId: toolsId, name: 'Kertas Termal', sku: 'TOOL-TERMAL', unit: 'roll', currentStock: 0, minStock: 5 },
      { id: uuidv4(), categoryId: toolsId, name: 'Solasi Double Tape', sku: 'TOOL-TAPE', unit: 'roll', currentStock: 0, minStock: 5 }
    );

    // Insert all products
    for (let i = 0; i < productData.length; i += 50) {
      const chunk = productData.slice(i, i + 50);
      await db.insert(products).values(chunk).onConflictDoNothing();
    }

    // 3. Seed Auto Deduct Rules
    console.log('⚙️ Seeding auto-deduct rules...');
    
    // Default Rule: 4x stiker + 1x polymailer + 1x zipper + 1 kertas termal
    const defaultRuleItems = [
      { productId: stikerBonusId, quantity: 4 },
      { productId: polymailerId, quantity: 1 },
      { productId: zipperId, quantity: 1 },
      { productId: termalId, quantity: 1 }
    ];

    await db.insert(autoDeductRules).values({
      id: uuidv4(),
      name: 'Pengiriman Standar',
      description: 'Rule default otomatis per pesanan',
      items: JSON.stringify(defaultRuleItems),
      isActive: true
    }).onConflictDoNothing();

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    process.exit(0);
  }
}

seed();
