import Dexie from 'dexie'
export const db = new Dexie('ya_pos')
db.version(1).stores({
  products: '++id, name, sku, category',
  sales: '++id, no, date, status, method',
  stockMoves: '++id, productId, date, type',
  settings: 'key'
})
export const rp = n => 'Rp' + Math.round(n || 0).toLocaleString('id-ID')
export const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) }
export async function getSettings () {
  const rows = await db.settings.toArray(); const s = { shopName: 'Toko Demo YA', address: 'Jl. Contoh No. 1, Jakarta', footer: 'Terima kasih atas kunjungan Anda!', phone: '' }
  rows.forEach(r => { s[r.key] = r.value }); return s
}
export async function saveSettings (s) { await db.settings.bulkPut(Object.entries(s).map(([key, value]) => ({ key, value }))) }
const DEMO = [
  ['Kopi Susu Gula Aren', 'KP001', 'Minuman', 18000, 50], ['Es Teh Manis', 'KP002', 'Minuman', 6000, 100], ['Americano', 'KP003', 'Minuman', 15000, 40],
  ['Matcha Latte', 'KP004', 'Minuman', 22000, 30], ['Air Mineral', 'KP005', 'Minuman', 5000, 80],
  ['Nasi Goreng Spesial', 'MK001', 'Makanan', 25000, 30], ['Mie Goreng', 'MK002', 'Makanan', 20000, 30], ['Ayam Geprek', 'MK003', 'Makanan', 23000, 25],
  ['Roti Bakar Coklat', 'SN001', 'Snack', 15000, 20], ['Kentang Goreng', 'SN002', 'Snack', 14000, 25], ['Pisang Goreng', 'SN003', 'Snack', 12000, 30], ['Dimsum (4 pcs)', 'SN004', 'Snack', 18000, 20]
]
export async function seedDemo () {
  await db.transaction('rw', db.products, db.sales, db.stockMoves, async () => {
    await db.products.clear(); await db.sales.clear(); await db.stockMoves.clear()
    await db.products.bulkAdd(DEMO.map(([name, sku, category, price, stock]) => ({ name, sku, category, price, stock, image: '' })))
    const ps = await db.products.toArray(); const methods = ['cash', 'qris', 'transfer']
    for (let i = 0; i < 8; i++) {
      const items = [ps[i % ps.length], ps[(i * 5 + 3) % ps.length]].map((p, k) => ({ productId: p.id, name: p.name, price: p.price, qty: 1 + ((i + k) % 3) }))
      const sub = items.reduce((a, b) => a + b.price * b.qty, 0); const m = methods[i % 3]
      const d = new Date(Date.now() - (8 - i) * 3600e3)
      await db.sales.add({ no: 'INV-' + new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(2, 10).replace(/-/g, '') + '-' + String(i + 1).padStart(3, '0'), date: d.toISOString(), items, subtotal: sub, discount: 0, total: sub, method: m, paid: m === 'cash' ? Math.ceil(sub / 50000) * 50000 : sub, change: m === 'cash' ? Math.ceil(sub / 50000) * 50000 - sub : 0, status: 'done' })
      for (const it of items) await db.products.where('id').equals(it.productId).modify(p => { p.stock -= it.qty })
    }
  })
}
export async function resetAll () { await Promise.all([db.products.clear(), db.sales.clear(), db.stockMoves.clear()]) }
