import { InlineKeyboard, Keyboard } from 'grammy';

export const followUpStock = new InlineKeyboard()
  .text('🔙 Kembali ke Kategori', 'show_categories_menu').text('⚠️ Low Stock', 'btn_lowstock').row()
  .text('📄 Buat PO', 'btn_po_link').text('🏠 Menu', 'btn_mainmenu');

export const followUpOrder = new InlineKeyboard()
  .text('📋 Pesanan', 'btn_orders').text('📦 Stok Kategori', 'show_categories_menu').row()
  .text('↩️ Undo', 'btn_undo').text('🏠 Menu', 'btn_mainmenu');

export const followUpGeneral = new InlineKeyboard()
  .text('📦 Stok', 'show_categories_menu').text('📋 Pesanan', 'btn_orders').row()
  .text('📈 Laporan', 'btn_report').text('🏠 Menu', 'btn_mainmenu');

export const mainMenu = new Keyboard()
  .text('📦 Cek Stok').text('⚠️ Low Stock').row()
  .text('📋 Pesanan').text('📈 Laporan').row()
  .text('💸 Catat Biaya').text('🤖 Tanya AI').row()
  .text('⚙️ Menu Lain').row()
  .resized().persistent();

export const menuLain = new Keyboard()
  .text('🧮 Kalkulator').text('📜 Riwayat').row()
  .text('📸 Scan Resi').text('🔍 Cari Produk').row()
  .webApp('🌐 Buka Dashboard', process.env.NEXT_PUBLIC_APP_URL || 'https://scm-kaos-kami.vercel.app').row()
  .text('🏠 Menu Utama').row()
  .resized().persistent();
