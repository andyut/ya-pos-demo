<template>
<q-layout view="hHh lpR fFf">
  <q-header class="bg-primary no-print">
    <q-toolbar>
      <img :src="base+'icon-192.png'" style="width:30px;height:30px;border-radius:6px" />
      <q-toolbar-title class="text-subtitle1 text-weight-bold">{{ titles[tab] }}<div class="text-caption" style="line-height:1">{{ settings.shopName }}</div></q-toolbar-title>
      <q-badge v-if="!online" color="orange" label="Offline" />
      <q-btn v-if="tab==='kasir'" flat round icon="shopping_cart" @click="cartOpen=true"><q-badge v-if="cartQty" color="red" floating>{{ cartQty }}</q-badge></q-btn>
    </q-toolbar>
  </q-header>

  <q-page-container class="no-print">
    <q-page class="q-pa-sm" style="padding-bottom:140px">
      <!-- KASIR -->
      <div v-if="tab==='kasir'">
        <q-input v-model="q" dense outlined clearable placeholder="Cari nama / scan SKU-barcode" @keyup.enter="scanAdd"><template #prepend><q-icon name="search"/></template></q-input>
        <div class="row no-wrap q-gutter-xs q-my-sm" style="overflow-x:auto">
          <q-chip v-for="c in ['Semua',...categories]" :key="c" clickable :color="cat===c?'primary':'grey-3'" :text-color="cat===c?'white':'dark'" @click="cat=c">{{ c }}</q-chip>
        </div>
        <div class="row q-col-gutter-sm">
          <div v-for="p in filtered" :key="p.id" class="col-6 col-sm-4 col-md-3">
            <q-card class="cursor-pointer prod" :class="{dim:p.stock<=0}" @click="addCart(p)" v-ripple>
              <div class="thumb" :style="p.image?`background-image:url(${p.image})`:''"><span v-if="!p.image">{{ p.name.slice(0,2).toUpperCase() }}</span>
                <q-badge v-if="inCart(p.id)" color="red" floating>{{ inCart(p.id) }}</q-badge></div>
              <q-card-section class="q-pa-sm">
                <div class="text-body2 ellipsis-2-lines" style="min-height:40px">{{ p.name }}</div>
                <div class="row justify-between items-center"><b class="text-primary">{{ rp(p.price) }}</b><span class="text-caption" :class="p.stock<=5?'text-red':'text-grey'">Stok {{ p.stock }}</span></div>
              </q-card-section>
            </q-card>
          </div>
        </div>
        <div v-if="!products.length" class="text-center q-pa-lg text-grey">Belum ada produk. Buka <b>Setelan → Isi Data Demo</b> atau tambah di menu Produk.</div>
      </div>

      <!-- PRODUK -->
      <div v-if="tab==='produk'">
        <q-input v-model="q" dense outlined clearable placeholder="Cari produk" class="q-mb-sm"><template #prepend><q-icon name="search"/></template></q-input>
        <q-list bordered separator class="rounded-borders bg-white">
          <q-item v-for="p in filtered" :key="p.id" clickable @click="editProd(p)">
            <q-item-section avatar><q-avatar rounded color="teal-1" text-color="primary"><img v-if="p.image" :src="p.image"><span v-else>{{ p.name.slice(0,2) }}</span></q-avatar></q-item-section>
            <q-item-section><q-item-label>{{ p.name }}</q-item-label><q-item-label caption>{{ p.sku }} · {{ p.category }}</q-item-label></q-item-section>
            <q-item-section side><b>{{ rp(p.price) }}</b><span :class="p.stock<=5?'text-red':''">Stok {{ p.stock }}</span></q-item-section>
          </q-item>
        </q-list>
        <q-page-sticky position="bottom-right" :offset="[16,80]"><q-btn fab icon="add" color="primary" @click="editProd(null)" /></q-page-sticky>
      </div>

      <!-- STOK -->
      <div v-if="tab==='stok'">
        <q-card flat bordered class="q-pa-md q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Stok Masuk / Penyesuaian</div>
          <q-select v-model="sm.productId" :options="products.map(p=>({label:p.name+' (stok '+p.stock+')',value:p.id}))" emit-value map-options outlined dense label="Produk" use-input @filter="(v,u)=>u()" />
          <q-btn-toggle v-model="sm.type" spread class="q-my-sm" toggle-color="primary" :options="[{label:'Stok Masuk',value:'in'},{label:'Set Stok (Opname)',value:'adjust'}]" />
          <q-input v-model.number="sm.qty" type="number" outlined dense :label="sm.type==='in'?'Jumlah masuk':'Stok fisik baru'" />
          <q-input v-model="sm.note" outlined dense label="Catatan" class="q-mt-sm" />
          <q-btn color="primary" class="full-width q-mt-sm" label="Simpan" @click="saveMove" />
        </q-card>
        <div class="text-subtitle2">Riwayat Mutasi</div>
        <q-list bordered separator class="bg-white">
          <q-item v-for="m in moves" :key="m.id"><q-item-section><q-item-label>{{ pname(m.productId) }}</q-item-label><q-item-label caption>{{ fmt(m.date) }} · {{ m.note }}</q-item-label></q-item-section>
            <q-item-section side><q-badge :color="m.type==='in'?'green':'orange'">{{ m.type==='in'?'+'+m.qty:'set '+m.qty+' ('+(m.diff>=0?'+':'')+m.diff+')' }}</q-badge></q-item-section></q-item>
          <q-item v-if="!moves.length"><q-item-section class="text-grey">Belum ada mutasi</q-item-section></q-item>
        </q-list>
      </div>

      <!-- RIWAYAT -->
      <div v-if="tab==='riwayat'">
        <q-input v-model="histDate" type="date" outlined dense label="Tanggal" class="q-mb-sm" />
        <q-list bordered separator class="bg-white">
          <q-item v-for="s in histSales" :key="s.id" clickable @click="showReceipt(s)">
            <q-item-section><q-item-label>{{ s.no }} <q-badge v-if="s.status==='void'" color="red">VOID</q-badge></q-item-label><q-item-label caption>{{ fmt(s.date) }} · {{ mlabel[s.method] }} · {{ s.items.length }} item</q-item-label></q-item-section>
            <q-item-section side><b :class="s.status==='void'?'text-strike text-grey':''">{{ rp(s.total) }}</b></q-item-section>
          </q-item>
          <q-item v-if="!histSales.length"><q-item-section class="text-grey">Tidak ada transaksi</q-item-section></q-item>
        </q-list>
      </div>

      <!-- LAPORAN -->
      <div v-if="tab==='laporan'">
        <div class="row q-col-gutter-sm q-mb-sm"><q-input class="col" v-model="repFrom" type="date" outlined dense label="Dari"/><q-input class="col" v-model="repTo" type="date" outlined dense label="Sampai"/></div>
        <div class="row q-col-gutter-sm">
          <div class="col-6"><q-card class="bg-primary text-white q-pa-md"><div class="text-caption">Omzet</div><div class="text-h6">{{ rp(report.omzet) }}</div></q-card></div>
          <div class="col-6"><q-card class="q-pa-md" flat bordered><div class="text-caption">Transaksi</div><div class="text-h6">{{ report.count }}</div></q-card></div>
          <div class="col-6"><q-card class="q-pa-md" flat bordered><div class="text-caption">Item terjual</div><div class="text-h6">{{ report.qty }}</div></q-card></div>
          <div class="col-6"><q-card class="q-pa-md" flat bordered><div class="text-caption">Diskon</div><div class="text-h6">{{ rp(report.disc) }}</div></q-card></div>
        </div>
        <div class="text-subtitle2 q-mt-md">Per Metode Bayar</div>
        <q-list bordered separator dense class="bg-white"><q-item v-for="(v,k) in report.byMethod" :key="k"><q-item-section>{{ mlabel[k] }}</q-item-section><q-item-section side><div class="row no-wrap items-center">{{ v.n }}x ·&nbsp;<b>{{ rp(v.t) }}</b></div></q-item-section></q-item></q-list>
        <div class="text-subtitle2 q-mt-md">Per Produk</div>
        <q-list bordered separator dense class="bg-white"><q-item v-for="r in report.byProd" :key="r.name"><q-item-section>{{ r.name }}</q-item-section><q-item-section side><div class="row no-wrap items-center">{{ r.qty }} ·&nbsp;<b>{{ rp(r.t) }}</b></div></q-item-section></q-item></q-list>
        <q-btn color="primary" icon="grid_on" label="Export Penjualan ke Excel" class="full-width q-mt-md" @click="exportXlsx" />
      </div>

      <!-- SETELAN -->
      <div v-if="tab==='setelan'">
        <q-card flat bordered class="q-pa-md q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Info Toko (tampil di struk)</div>
          <q-input v-model="settings.shopName" outlined dense label="Nama toko" class="q-mb-sm"/>
          <q-input v-model="settings.address" outlined dense label="Alamat" class="q-mb-sm"/>
          <q-input v-model="settings.phone" outlined dense label="Telepon" class="q-mb-sm"/>
          <q-input v-model="settings.footer" outlined dense label="Footer struk"/>
          <q-btn color="primary" class="full-width q-mt-sm" label="Simpan Setelan" @click="saveSet"/>
        </q-card>
        <q-card flat bordered class="q-pa-md q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Backup & Restore</div>
          <q-btn outline color="primary" icon="download" label="Backup ke File JSON" class="full-width q-mb-sm" @click="backup"/>
          <q-file v-model="restoreFile" outlined dense label="Restore dari File JSON" accept=".json" @update:model-value="restore"><template #prepend><q-icon name="upload"/></template></q-file>
        </q-card>
        <q-card flat bordered class="q-pa-md q-mb-md">
          <div class="text-subtitle2 q-mb-sm">Data Demo</div>
          <q-btn color="secondary" icon="auto_awesome" label="Isi Data Demo" class="full-width q-mb-sm" @click="doSeed"/>
          <q-btn flat color="red" icon="delete_forever" label="Kosongkan Semua Data" class="full-width" @click="doReset"/>
        </q-card>
        <div class="text-center q-pa-md"><img :src="base+'logo.png'" style="max-width:180px"/><div class="text-caption text-grey">YA POS v1.0 · Offline PWA · by Yohanes Andy</div></div>
      </div>
    </q-page>
  </q-page-container>

  <!-- Cart summary bar -->
  <div v-if="tab==='kasir' && cart.length" class="cartbar no-print bg-secondary text-white row items-center q-px-md" @click="cartOpen=true">
    <q-icon name="shopping_cart" size="sm" class="q-mr-sm"/><div class="col">{{ cartQty }} item</div><b class="text-h6">{{ rp(total) }}</b><q-icon name="chevron_right"/>
  </div>

  <q-footer bordered class="bg-white text-grey-8 no-print">
    <q-tabs v-model="tab" dense active-color="primary" indicator-color="primary" class="text-caption" no-caps>
      <q-tab name="kasir" icon="point_of_sale" label="Kasir"/><q-tab name="produk" icon="inventory_2" label="Produk"/><q-tab name="stok" icon="move_to_inbox" label="Stok"/>
      <q-tab name="riwayat" icon="receipt_long" label="Riwayat"/><q-tab name="laporan" icon="bar_chart" label="Laporan"/><q-tab name="setelan" icon="settings" label="Setelan"/>
    </q-tabs>
  </q-footer>

  <!-- CART / PAYMENT -->
  <q-dialog v-model="cartOpen" position="bottom" full-width class="no-print">
    <q-card style="max-height:90vh">
      <q-card-section class="row items-center q-pb-none"><div class="text-h6">Keranjang</div><q-space/><q-btn flat dense color="red" label="Kosongkan" @click="cart=[]" v-if="cart.length"/><q-btn icon="close" flat round dense v-close-popup/></q-card-section>
      <q-card-section class="q-pt-sm">
        <q-list separator dense>
          <q-item v-for="(c,i) in cart" :key="c.productId" class="q-px-none">
            <q-item-section><q-item-label>{{ c.name }}</q-item-label><q-item-label caption>{{ rp(c.price) }} × {{ c.qty }} = <b>{{ rp(c.price*c.qty) }}</b></q-item-label></q-item-section>
            <q-item-section side><div class="row items-center no-wrap"><q-btn round dense flat icon="remove" @click="c.qty>1?c.qty--:cart.splice(i,1)"/><b class="q-mx-xs">{{ c.qty }}</b><q-btn round dense flat icon="add" @click="incQty(c)"/></div></q-item-section>
          </q-item>
        </q-list>
        <div v-if="!cart.length" class="text-grey q-pa-md text-center">Keranjang kosong</div>
        <div v-else>
          <div class="row q-col-gutter-sm q-mt-sm">
            <q-input class="col-8" v-model.number="discount" type="number" outlined dense label="Diskon"/>
            <q-btn-toggle class="col-4" v-model="discType" dense toggle-color="primary" :options="[{label:'Rp',value:'rp'},{label:'%',value:'pct'}]"/>
          </div>
          <div class="row justify-between q-mt-sm"><span>Subtotal</span><span>{{ rp(subtotal) }}</span></div>
          <div class="row justify-between" v-if="discAmt"><span>Diskon</span><span>-{{ rp(discAmt) }}</span></div>
          <div class="row justify-between text-h6 text-primary"><span>Total</span><b>{{ rp(total) }}</b></div>
          <q-btn-toggle v-model="method" spread toggle-color="primary" class="q-my-sm" :options="[{label:'Tunai',value:'cash'},{label:'QRIS',value:'qris'},{label:'Transfer',value:'transfer'}]"/>
          <div v-if="method==='cash'">
            <q-input v-model.number="paid" type="number" outlined dense label="Uang diterima"/>
            <div class="row q-gutter-xs q-mt-xs"><q-btn v-for="v in quickCash" :key="v" size="sm" outline color="primary" :label="v===total?'Uang pas':rp(v)" @click="paid=v"/></div>
            <div class="row justify-between q-mt-sm text-subtitle1"><span>Kembalian</span><b :class="change<0?'text-red':'text-green'">{{ rp(change) }}</b></div>
          </div>
          <q-btn color="primary" size="lg" class="full-width q-mt-md" icon="check" :label="'Bayar '+rp(total)" :disable="method==='cash'&&change<0" @click="checkout"/>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>

  <!-- RECEIPT -->
  <q-dialog v-model="rcOpen">
    <q-card style="width:330px">
      <q-card-section class="flex flex-center bg-grey-2">
        <div id="receipt" class="receipt" v-if="rc">
          <div class="c b big">{{ settings.shopName }}</div><div class="c">{{ settings.address }}</div><div class="c" v-if="settings.phone">{{ settings.phone }}</div>
          <div class="hr"></div><div>{{ rc.no }}</div><div>{{ fmt(rc.date) }}</div>
          <div v-if="rc.status==='void'" class="c b">*** VOID ***</div><div class="hr"></div>
          <div v-for="it in rc.items" :key="it.productId"><div>{{ it.name }}</div><div class="r2"><span>{{ it.qty }} x {{ num(it.price) }}</span><span>{{ num(it.qty*it.price) }}</span></div></div>
          <div class="hr"></div>
          <div class="r2"><span>Subtotal</span><span>{{ num(rc.subtotal) }}</span></div>
          <div class="r2" v-if="rc.discount"><span>Diskon</span><span>-{{ num(rc.discount) }}</span></div>
          <div class="r2 b"><span>TOTAL</span><span>{{ num(rc.total) }}</span></div>
          <div class="r2"><span>{{ mlabel[rc.method] }}</span><span>{{ num(rc.paid) }}</span></div>
          <div class="r2" v-if="rc.method==='cash'"><span>Kembali</span><span>{{ num(rc.change) }}</span></div>
          <div class="hr"></div><div class="c">{{ settings.footer }}</div><div class="c small">Powered by YA POS</div>
        </div>
      </q-card-section>
      <q-card-actions align="around" class="no-print">
        <q-btn flat color="primary" icon="print" label="Cetak" @click="printRc"/>
        <q-btn flat color="primary" icon="share" label="Bagikan" @click="shareRc"/>
        <q-btn v-if="rc&&rc.status!=='void'&&rc.id" flat color="red" icon="block" label="Void" @click="voidSale(rc)"/>
        <q-btn flat icon="close" v-close-popup/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- PRODUCT FORM -->
  <q-dialog v-model="pfOpen" class="no-print">
    <q-card style="width:360px">
      <q-card-section class="text-h6">{{ pf.id?'Edit':'Tambah' }} Produk</q-card-section>
      <q-card-section class="q-gutter-sm q-pt-none">
        <q-input v-model="pf.name" outlined dense label="Nama produk *"/>
        <q-input v-model="pf.sku" outlined dense label="SKU / Barcode"/>
        <q-select v-model="pf.category" :options="categories" outlined dense label="Kategori" use-input new-value-mode="add-unique" hide-dropdown-icon input-debounce="0" @new-value="(v,d)=>d(v,'add-unique')"/>
        <q-input v-model.number="pf.price" type="number" outlined dense label="Harga jual *"/>
        <q-input v-model.number="pf.stock" type="number" outlined dense label="Stok" :disable="!!pf.id" :hint="pf.id?'Ubah stok lewat menu Stok':''"/>
        <q-file v-model="imgFile" outlined dense label="Foto (opsional)" accept="image/*" @update:model-value="loadImg"><template #prepend><q-icon name="photo"/></template></q-file>
        <img v-if="pf.image" :src="pf.image" style="max-width:80px;border-radius:8px"/>
      </q-card-section>
      <q-card-actions align="right"><q-btn v-if="pf.id" flat color="red" label="Hapus" @click="delProd"/><q-space/><q-btn flat label="Batal" v-close-popup/><q-btn color="primary" label="Simpan" @click="saveProd"/></q-card-actions>
    </q-card>
  </q-dialog>
</q-layout>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useQuasar } from 'quasar'
import { liveQuery } from 'dexie'
import * as XLSX from 'xlsx'
import { db, rp, today, getSettings, saveSettings, seedDemo, resetAll } from './db'
const $q = useQuasar(); const base = import.meta.env.BASE_URL
const titles = { kasir: 'Kasir', produk: 'Produk', stok: 'Stok', riwayat: 'Riwayat Penjualan', laporan: 'Laporan', setelan: 'Setelan' }
const mlabel = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer' }
const tab = ref('kasir'), q = ref(''), cat = ref('Semua'), online = ref(navigator.onLine)
addEventListener('online', () => online.value = true); addEventListener('offline', () => online.value = false)
const products = ref([]), sales = ref([]), moves = ref([]), settings = ref({})
liveQuery(() => db.products.orderBy('name').toArray()).subscribe(v => products.value = v)
liveQuery(() => db.sales.orderBy('date').reverse().toArray()).subscribe(v => sales.value = v)
liveQuery(() => db.stockMoves.orderBy('date').reverse().limit(50).toArray()).subscribe(v => moves.value = v)
onMounted(async () => { settings.value = await getSettings(); if (!(await db.settings.get('initialized'))) { await seedDemo(); await db.settings.put({ key: 'initialized', value: true }) } })
const num = n => Math.round(n || 0).toLocaleString('id-ID')
const fmt = d => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
const pname = id => products.value.find(p => p.id === id)?.name || '#' + id
const categories = computed(() => [...new Set(products.value.map(p => p.category).filter(Boolean))])
watch(tab, () => { q.value = '' })
const filtered = computed(() => { const s = (q.value || '').toLowerCase(); return products.value.filter(p => (tab.value !== 'kasir' || cat.value === 'Semua' || p.category === cat.value) && (!s || p.name.toLowerCase().includes(s) || (p.sku || '').toLowerCase().includes(s))) })
// cart
const cart = ref([]), cartOpen = ref(false), discount = ref(0), discType = ref('rp'), method = ref('cash'), paid = ref(0)
const inCart = id => cart.value.find(c => c.productId === id)?.qty || 0
function addCart (p) { if (p.stock <= inCart(p.id)) return $q.notify({ type: 'warning', message: 'Stok ' + p.name + ' tidak cukup' }); const c = cart.value.find(c => c.productId === p.id); c ? c.qty++ : cart.value.push({ productId: p.id, name: p.name, price: p.price, qty: 1 }) }
function incQty (c) { const p = products.value.find(p => p.id === c.productId); if (p && p.stock <= c.qty) return $q.notify({ type: 'warning', message: 'Stok tidak cukup' }); c.qty++ }
function scanAdd () { const p = products.value.find(p => (p.sku || '').toLowerCase() === (q.value || '').toLowerCase()); if (p) { addCart(p); q.value = '' } }
const cartQty = computed(() => cart.value.reduce((a, c) => a + c.qty, 0))
const subtotal = computed(() => cart.value.reduce((a, c) => a + c.qty * c.price, 0))
const discAmt = computed(() => Math.min(subtotal.value, discType.value === 'pct' ? Math.round(subtotal.value * (discount.value || 0) / 100) : (discount.value || 0)))
const total = computed(() => subtotal.value - discAmt.value)
const change = computed(() => (paid.value || 0) - total.value)
const quickCash = computed(() => [...new Set([total.value, ...[10000, 20000, 50000, 100000].map(b => Math.ceil(total.value / b) * b)])].filter(v => v >= total.value).slice(0, 4))
watch(method, m => { if (m !== 'cash') paid.value = total.value })
async function checkout () {
  const d = new Date(); const pre = 'INV-' + local(d).slice(2).replace(/-/g, '') + '-'
  const cnt = await db.sales.filter(s => s.no.startsWith(pre)).count()
  const sale = { no: pre + String(cnt + 1).padStart(3, '0'), date: d.toISOString(), items: cart.value.map(c => ({ ...c })), subtotal: subtotal.value, discount: discAmt.value, total: total.value, method: method.value, paid: method.value === 'cash' ? paid.value : total.value, change: method.value === 'cash' ? change.value : 0, status: 'done' }
  await db.transaction('rw', db.sales, db.products, async () => { sale.id = await db.sales.add(sale); for (const it of sale.items) await db.products.where('id').equals(it.productId).modify(p => { p.stock -= it.qty }) })
  cart.value = []; discount.value = 0; paid.value = 0; method.value = 'cash'; cartOpen.value = false
  showReceipt(sale); $q.notify({ type: 'positive', message: 'Transaksi tersimpan' })
}
// receipt
const rc = ref(null), rcOpen = ref(false)
function showReceipt (s) { rc.value = s; rcOpen.value = true }
function printRc () { window.print() }
function rcText (s) { const L = [settings.value.shopName, settings.value.address, '--------------------------------', s.no, fmt(s.date), '--------------------------------']; s.items.forEach(i => L.push(`${i.name}\n  ${i.qty} x ${num(i.price)} = ${num(i.qty * i.price)}`)); L.push('--------------------------------'); if (s.discount) L.push('Diskon: -' + num(s.discount)); L.push('TOTAL: ' + rp(s.total), mlabel[s.method] + ': ' + rp(s.paid)); if (s.method === 'cash') L.push('Kembali: ' + rp(s.change)); L.push('', settings.value.footer); return L.join('\n') }
async function shareRc () { const t = rcText(rc.value); if (navigator.share) { try { await navigator.share({ title: 'Struk ' + rc.value.no, text: t }) } catch (e) {} } else { await navigator.clipboard?.writeText(t); $q.notify({ message: 'Struk disalin ke clipboard' }) } }
function voidSale (s) { $q.dialog({ title: 'Void transaksi?', message: s.no + ' – stok akan dikembalikan', cancel: true }).onOk(async () => { await db.transaction('rw', db.sales, db.products, async () => { await db.sales.update(s.id, { status: 'void' }); for (const it of s.items) await db.products.where('id').equals(it.productId).modify(p => { p.stock += it.qty }) }); rc.value = { ...s, status: 'void' }; $q.notify({ type: 'negative', message: 'Transaksi di-void' }) }) }
// history & report
const histDate = ref(today())
const local = d => { const x = new Date(d); return new Date(x - x.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) }
const histSales = computed(() => sales.value.filter(s => local(s.date) === histDate.value))
const repFrom = ref(today()), repTo = ref(today())
const repSales = computed(() => sales.value.filter(s => s.status !== 'void' && local(s.date) >= repFrom.value && local(s.date) <= repTo.value))
const report = computed(() => { const r = { omzet: 0, count: 0, qty: 0, disc: 0, byMethod: {}, byProd: [] }; const bp = {}
  repSales.value.forEach(s => { r.omzet += s.total; r.count++; r.disc += s.discount || 0; const m = r.byMethod[s.method] ||= { n: 0, t: 0 }; m.n++; m.t += s.total; s.items.forEach(i => { r.qty += i.qty; const p = bp[i.name] ||= { name: i.name, qty: 0, t: 0 }; p.qty += i.qty; p.t += i.qty * i.price }) })
  r.byProd = Object.values(bp).sort((a, b) => b.t - a.t); return r })
function exportXlsx () {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(repSales.value.map(s => ({ 'No Nota': s.no, Tanggal: fmt(s.date), Metode: mlabel[s.method], Subtotal: s.subtotal, Diskon: s.discount, Total: s.total }))), 'Penjualan')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(repSales.value.flatMap(s => s.items.map(i => ({ 'No Nota': s.no, Tanggal: fmt(s.date), Produk: i.name, Qty: i.qty, Harga: i.price, Jumlah: i.qty * i.price })))), 'Detail')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.value.byProd.map(p => ({ Produk: p.name, Qty: p.qty, Omzet: p.t }))), 'Per Produk')
  XLSX.writeFile(wb, `Penjualan_${repFrom.value}_${repTo.value}.xlsx`)
}
// stock
const sm = reactive({ productId: null, type: 'in', qty: null, note: '' })
async function saveMove () { if (!sm.productId || sm.qty == null) return $q.notify({ type: 'warning', message: 'Lengkapi produk & jumlah' }); const p = await db.products.get(sm.productId); const qty = Number(sm.qty); const ns = sm.type === 'in' ? p.stock + qty : qty
  await db.transaction('rw', db.products, db.stockMoves, async () => { await db.products.update(p.id, { stock: ns }); await db.stockMoves.add({ productId: p.id, date: new Date().toISOString(), type: sm.type, qty, diff: ns - p.stock, note: sm.note }) })
  Object.assign(sm, { qty: null, note: '' }); $q.notify({ type: 'positive', message: `Stok ${p.name} sekarang ${ns}` }) }
// product form
const pfOpen = ref(false), pf = ref({}), imgFile = ref(null)
function editProd (p) { pf.value = p ? { ...p } : { name: '', sku: '', category: '', price: null, stock: 0, image: '' }; imgFile.value = null; pfOpen.value = true }
function loadImg (f) { if (!f) return; const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const s = 300 / Math.max(img.width, img.height); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); pf.value.image = c.toDataURL('image/jpeg', 0.8) }; img.src = URL.createObjectURL(f) }
async function saveProd () { const p = pf.value; if (!p.name || !(p.price >= 0)) return $q.notify({ type: 'warning', message: 'Nama & harga wajib' }); const d = { ...p, price: Number(p.price), stock: Number(p.stock || 0) }; p.id ? await db.products.put(d) : await db.products.add(d); pfOpen.value = false }
function delProd () { $q.dialog({ title: 'Hapus produk?', cancel: true }).onOk(async () => { await db.products.delete(pf.value.id); pfOpen.value = false }) }
// settings / backup
async function saveSet () { await saveSettings(settings.value); $q.notify({ type: 'positive', message: 'Setelan tersimpan' }) }
async function backup () { const data = { app: 'YA POS', version: 1, exportedAt: new Date().toISOString(), products: await db.products.toArray(), sales: await db.sales.toArray(), stockMoves: await db.stockMoves.toArray(), settings: await db.settings.toArray() }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })); a.download = `YA_POS_backup_${today()}.json`; a.click() }
const restoreFile = ref(null)
async function restore (f) { if (!f) return; try { const d = JSON.parse(await f.text()); if (d.app !== 'YA POS') throw new Error('Bukan file backup YA POS')
  await db.transaction('rw', db.products, db.sales, db.stockMoves, db.settings, async () => { for (const t of ['products', 'sales', 'stockMoves', 'settings']) { await db[t].clear(); await db[t].bulkAdd(d[t] || []) } })
  settings.value = await getSettings(); $q.notify({ type: 'positive', message: 'Restore berhasil' }) } catch (e) { $q.notify({ type: 'negative', message: 'Gagal restore: ' + e.message }) } restoreFile.value = null }
function doSeed () { $q.dialog({ title: 'Isi data demo?', message: 'Produk & transaksi yang ada akan diganti data demo.', cancel: true }).onOk(async () => { await seedDemo(); $q.notify({ type: 'positive', message: 'Data demo terisi' }) }) }
function doReset () { $q.dialog({ title: 'Kosongkan semua data?', message: 'Produk, penjualan & mutasi dihapus. Backup dulu!', cancel: true }).onOk(async () => { await resetAll(); $q.notify({ message: 'Data dikosongkan' }) }) }
</script>

<style>
body { background: #f4f7f7 }
.q-footer .q-tab { min-width: 0; padding: 0 2px; flex: 1 } .q-footer .q-tabs__arrow { display: none } .q-item__section--side { white-space: nowrap }
.prod .thumb { height: 84px; background: linear-gradient(135deg, #127475, #2a9d9e) center/cover; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 26px; font-weight: 700; position: relative }
.prod.dim { opacity: .45 }
.cartbar { position: fixed; left: 8px; right: 8px; bottom: 60px; height: 52px; border-radius: 12px; z-index: 2000; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.25) }
.receipt { width: 58mm; padding: 3mm; background: #fff; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.35; color: #000 }
.receipt .c { text-align: center } .receipt .b { font-weight: 700 } .receipt .big { font-size: 14px } .receipt .small { font-size: 9px }
.receipt .r2 { display: flex; justify-content: space-between } .receipt .hr { border-top: 1px dashed #000; margin: 4px 0 }
@media print {
  @page { size: 58mm auto; margin: 0 }
  body * { visibility: hidden !important } #receipt, #receipt * { visibility: visible !important }
  #receipt { position: fixed; left: 0; top: 0; width: 58mm }
  .q-dialog__backdrop { display: none }
}
</style>
