import Dexie, { type Table } from 'dexie'
import type {
  Patient, Prescription, Product, ProductCategory,
  ServiceOrder, ServiceOrderItem, LabTracking,
  Supplier, StockMovement, SyncQueueItem,
  Brand, Model, Sale, SaleItem,
} from '@/types'

// ── Tipos locais (com flag de sync) ──────────────────────────
export type LocalRecord<T> = T & { _pending_sync?: boolean }

export type LocalPatient          = LocalRecord<Patient>
export type LocalPrescription     = LocalRecord<Prescription>
export type LocalProduct          = LocalRecord<Product>
export type LocalProductCategory  = LocalRecord<ProductCategory>
export type LocalServiceOrder     = LocalRecord<ServiceOrder>
export type LocalServiceOrderItem = LocalRecord<ServiceOrderItem>
export type LocalLabTracking      = LocalRecord<LabTracking>
export type LocalSupplier         = LocalRecord<Supplier>
export type LocalStockMovement    = LocalRecord<StockMovement>
export type LocalBrand            = LocalRecord<Brand>
export type LocalModel            = LocalRecord<Model>
export type LocalSale             = LocalRecord<Sale>
export type LocalSaleItem         = LocalRecord<SaleItem>

// ── Banco Dexie ───────────────────────────────────────────────
export class MinhaOticaDB extends Dexie {
  patients!:            Table<LocalPatient>
  prescriptions!:       Table<LocalPrescription>
  product_categories!:  Table<LocalProductCategory>
  products!:            Table<LocalProduct>
  suppliers!:           Table<LocalSupplier>
  stock_movements!:     Table<LocalStockMovement>
  brands!:              Table<LocalBrand>
  models!:              Table<LocalModel>
  sales!:               Table<LocalSale>
  sale_items!:          Table<LocalSaleItem>
  service_orders!:      Table<LocalServiceOrder>
  service_order_items!: Table<LocalServiceOrderItem>
  lab_trackings!:       Table<LocalLabTracking>
  sync_queue!:          Table<SyncQueueItem, number>

  constructor() {
    super('minha-otica')

    // v1 — schema original
    this.version(1).stores({
      patients:
        'id, company_id, full_name, cpf, phone, is_active, updated_at, _pending_sync',
      prescriptions:
        'id, company_id, patient_id, exam_date, created_at',
      product_categories:
        'id, company_id, slug',
      products:
        'id, company_id, category_id, name, brand, sku, is_active, stock_quantity, updated_at, _pending_sync',
      service_orders:
        'id, company_id, patient_id, order_number, status, service_type, created_at, updated_at, _pending_sync',
      service_order_items:
        'id, service_order_id, product_id',
      lab_trackings:
        'id, company_id, service_order_id, status, created_at, _pending_sync',
      sync_queue:
        '++id, table_name, operation, record_id, synced, created_at, retry_count',
    })

    // v2 — adiciona suppliers e stock_movements
    this.version(2).stores({
      patients:
        'id, company_id, full_name, cpf, phone, is_active, updated_at, _pending_sync',
      prescriptions:
        'id, company_id, patient_id, exam_date, created_at',
      product_categories:
        'id, company_id, slug',
      products:
        'id, company_id, category_id, supplier_id, name, brand, sku, is_active, stock_quantity, updated_at, _pending_sync',
      suppliers:
        'id, company_id, name, cnpj, is_active, updated_at, _pending_sync',
      stock_movements:
        'id, company_id, product_id, type, created_at',
      service_orders:
        'id, company_id, patient_id, order_number, status, service_type, created_at, updated_at, _pending_sync',
      service_order_items:
        'id, service_order_id, product_id',
      lab_trackings:
        'id, company_id, service_order_id, status, created_at, _pending_sync',
      sync_queue:
        '++id, table_name, operation, record_id, synced, created_at, retry_count',
    })

    // v3 — adiciona brands e models; parent_id em categorias; brand_id/model_id em produtos
    this.version(3).stores({
      patients:
        'id, company_id, full_name, cpf, phone, is_active, updated_at, _pending_sync',
      prescriptions:
        'id, company_id, patient_id, exam_date, created_at',
      product_categories:
        'id, company_id, slug, parent_id',
      products:
        'id, company_id, category_id, supplier_id, brand_id, model_id, name, sku, is_active, stock_quantity, updated_at, _pending_sync',
      suppliers:
        'id, company_id, name, cnpj, is_active, updated_at, _pending_sync',
      stock_movements:
        'id, company_id, product_id, type, created_at',
      brands:
        'id, company_id, name, updated_at, _pending_sync',
      models:
        'id, company_id, brand_id, name, updated_at, _pending_sync',
      service_orders:
        'id, company_id, patient_id, order_number, status, service_type, created_at, updated_at, _pending_sync',
      service_order_items:
        'id, service_order_id, product_id',
      lab_trackings:
        'id, company_id, service_order_id, status, created_at, _pending_sync',
      sync_queue:
        '++id, table_name, operation, record_id, synced, created_at, retry_count',
    })

    // v4 — adiciona sales e sale_items
    this.version(4).stores({
      patients:
        'id, company_id, full_name, cpf, phone, is_active, updated_at, _pending_sync',
      prescriptions:
        'id, company_id, patient_id, exam_date, created_at',
      product_categories:
        'id, company_id, slug, parent_id',
      products:
        'id, company_id, category_id, supplier_id, brand_id, model_id, name, sku, is_active, stock_quantity, updated_at, _pending_sync',
      suppliers:
        'id, company_id, name, cnpj, is_active, updated_at, _pending_sync',
      stock_movements:
        'id, company_id, product_id, type, created_at',
      brands:
        'id, company_id, name, updated_at, _pending_sync',
      models:
        'id, company_id, brand_id, name, updated_at, _pending_sync',
      sales:
        'id, company_id, sale_number, patient_id, created_at, updated_at, _pending_sync',
      sale_items:
        'id, sale_id, product_id',
      service_orders:
        'id, company_id, patient_id, order_number, status, service_type, created_at, updated_at, _pending_sync',
      service_order_items:
        'id, service_order_id, product_id',
      lab_trackings:
        'id, company_id, service_order_id, status, created_at, _pending_sync',
      sync_queue:
        '++id, table_name, operation, record_id, synced, created_at, retry_count',
    })

    // v5 — adiciona seller_id em sales
    this.version(5).stores({
      sales: 'id, company_id, sale_number, patient_id, seller_id, created_at, updated_at, _pending_sync',
    })

    // v6 — adiciona sale_type e prescription_id em sales
    this.version(6).stores({
      sales: 'id, company_id, sale_number, patient_id, seller_id, sale_type, prescription_id, created_at, updated_at, _pending_sync',
    })

    // v7 — adiciona seller_id em service_orders
    this.version(7).stores({
      service_orders: 'id, company_id, patient_id, seller_id, order_number, status, service_type, created_at, updated_at, _pending_sync',
    })
  }
}

export const db = new MinhaOticaDB()

// ── Helpers para fila de sincronização ───────────────────────
export async function enqueue(
  table_name: string,
  operation: SyncQueueItem['operation'],
  record_id: string,
  data: Record<string, unknown>,
) {
  await db.sync_queue.add({
    table_name,
    operation,
    record_id,
    data,
    created_at: new Date().toISOString(),
    synced: false,
    retry_count: 0,
  })
}

export async function getPendingCount(): Promise<number> {
  return db.sync_queue.where('synced').equals(0).count()
}

export async function markSynced(id: number) {
  await db.sync_queue.update(id, { synced: true })
}

export async function markError(id: number, error: string) {
  await db.sync_queue.update(id, {
    error,
    retry_count: (await db.sync_queue.get(id))?.retry_count ?? 0 + 1,
  })
}

export async function getPendingItems(): Promise<SyncQueueItem[]> {
  return db.sync_queue
    .where('synced').equals(0)
    .and((item) => (item.retry_count ?? 0) < 5)
    .toArray()
}

export async function clearSyncedItems() {
  await db.sync_queue.where('synced').equals(1).delete()
}
