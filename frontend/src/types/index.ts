// ============================================================
// Minha Ótica — Tipos TypeScript globais
// Espelham o schema Supabase (snake_case)
// ============================================================

export interface Address {
  cep?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
}

// ── EMPRESA ──────────────────────────────────────────────────
export interface Company {
  id: string
  name: string
  cnpj?: string
  phone?: string
  email?: string
  address?: Address
  logo_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── PERFIL ───────────────────────────────────────────────────
export type UserRole = 'admin' | 'gerente' | 'atendente' | 'tecnico'

export interface Profile {
  id: string
  company_id: string
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
  company?: Company
}

// ── PACIENTE ─────────────────────────────────────────────────
export type Gender = 'M' | 'F' | 'outro'
export type PatientOrigin = 'indicacao' | 'instagram' | 'google' | 'facebook' | 'walk_in' | 'whatsapp' | 'convenio' | 'outro'
export type LensType = 'monofocal' | 'bifocal' | 'multifocal' | 'ocupacional' | 'solar' | 'contato'

export interface Patient {
  id: string
  company_id: string
  full_name: string
  cpf?: string
  rg?: string
  phone: string
  whatsapp?: string
  email?: string
  birth_date?: string
  gender?: Gender
  address?: Address
  notes?: string
  // CRM
  origin?: PatientOrigin
  tags?: string[]
  frame_preference?: string
  lens_preference?: string
  next_repurchase_date?: string
  is_recurring?: boolean
  last_purchase?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PatientFormData = Omit<Patient, 'id' | 'company_id' | 'created_at' | 'updated_at'>

// ── RECEITA ──────────────────────────────────────────────────
export interface Prescription {
  id: string
  company_id: string
  patient_id: string
  od_esf?: number
  od_cil?: number
  od_eixo?: number
  od_add?: number
  od_dnp?: number
  od_altura?: number
  oe_esf?: number
  oe_cil?: number
  oe_eixo?: number
  oe_add?: number
  oe_dnp?: number
  oe_altura?: number
  lens_type?: LensType
  doctor_name?: string
  crm?: string
  exam_date?: string
  valid_until?: string
  notes?: string
  attachment_url?: string
  created_by?: string
  created_at: string
  patient?: Patient
}

export type PrescriptionFormData = Omit<Prescription, 'id' | 'company_id' | 'created_at'>

// ── FORNECEDOR ───────────────────────────────────────────────
export interface Supplier {
  id: string
  company_id: string
  name: string
  cnpj?: string
  phone?: string
  whatsapp?: string
  email?: string
  contact_name?: string
  address?: Address
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SupplierFormData = Omit<Supplier, 'id' | 'company_id' | 'created_at' | 'updated_at'>

// ── MARCA ────────────────────────────────────────────────────
export interface Brand {
  id: string
  company_id: string
  name: string
  created_at: string
  updated_at: string
}

export type BrandFormData = Omit<Brand, 'id' | 'company_id' | 'created_at' | 'updated_at'>

// ── MODELO ───────────────────────────────────────────────────
export interface Model {
  id: string
  company_id: string
  brand_id?: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  brand?: Brand
}

export type ModelFormData = Omit<Model, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'brand'>

// ── PRODUTO ──────────────────────────────────────────────────
export interface ProductCategory {
  id: string
  company_id: string
  name: string
  slug: string
  icon?: string
  parent_id?: string
  created_at: string
  parent?: ProductCategory
}

export interface Product {
  id: string
  company_id: string
  category_id?: string
  supplier_id?: string
  brand_id?: string
  model_id?: string
  name: string
  brand?: string
  model?: string
  sku?: string
  barcode?: string
  description?: string
  color?: string
  size?: string
  sale_price: number
  cost_price?: number
  stock_quantity: number
  min_stock_quantity: number
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
  category?: ProductCategory
  supplier_rel?: Supplier
  brand_rel?: Brand
  model_rel?: Model
}

export type ProductFormData = Omit<Product, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'category' | 'supplier_rel' | 'brand_rel' | 'model_rel'>

// ── MOVIMENTAÇÃO DE ESTOQUE ───────────────────────────────────
export type StockMovementType = 'entrada' | 'saida' | 'ajuste' | 'devolucao'

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  entrada:   'Entrada',
  saida:     'Saída',
  ajuste:    'Ajuste',
  devolucao: 'Devolução',
}

export interface StockMovement {
  id: string
  company_id: string
  product_id: string
  type: StockMovementType
  quantity: number
  previous_qty: number
  new_qty: number
  unit_cost?: number
  reason?: string
  reference_id?: string
  reference_type?: string
  created_by?: string
  created_at: string
  product?: Product
}

export type CategoryFormData = Omit<ProductCategory, 'id' | 'company_id' | 'created_at' | 'parent'>

// ── VENDA DIRETA ─────────────────────────────────────────────
export interface SaleItem {
  id: string
  sale_id: string
  product_id?: string
  description: string
  quantity: number
  unit_price: number
  discount: number
  total_price: number
  product?: Product
}

export type SaleItemFormData = Omit<SaleItem, 'id' | 'sale_id' | 'product'>

export interface Sale {
  id: string
  company_id: string
  sale_number: string
  patient_id?: string
  seller_id?: string
  customer_name?: string
  sale_type?: ServiceType
  prescription_id?: string
  service_order_id?: string
  total_amount: number
  discount_amount: number
  paid_amount: number
  payment_method?: PaymentMethod
  payments?: PaymentEntry[]
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  patient?: Patient
  seller?: Profile
  prescription?: Prescription
  items?: SaleItem[]
}

export type SaleFormData = {
  patient_id?: string
  seller_id?: string
  customer_name?: string
  sale_type?: ServiceType
  prescription?: PrescriptionFormData
  service_order_id?: string
  total_amount: number
  discount_amount: number
  paid_amount: number
  payment_method?: PaymentMethod
  payments?: PaymentEntry[]
  notes?: string
  items: SaleItemFormData[]
}

// ── ORDEM DE SERVIÇO ─────────────────────────────────────────
export type ServiceType =
  | 'oculos_grau'
  | 'oculos_solar'
  | 'lentes_contato'
  | 'reparo'
  | 'ajuste'
  | 'consulta'
  | 'outro'

export type ServiceOrderStatus =
  | 'orcamento'
  | 'aprovado'
  | 'producao'
  | 'laboratorio'
  | 'pronto'
  | 'entregue'
  | 'cancelado'

export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'boleto'
  | 'convenio'
  | 'outro'

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  oculos_grau:     'Óculos de Grau',
  oculos_solar:    'Óculos Solar',
  lentes_contato:  'Lentes de Contato',
  reparo:          'Reparo',
  ajuste:          'Ajuste',
  consulta:        'Consulta',
  outro:           'Outro',
}

export const STATUS_LABELS: Record<ServiceOrderStatus, string> = {
  orcamento:   'Orçamento',
  aprovado:    'Aprovado',
  producao:    'Em Produção',
  laboratorio: 'Em Laboratório',
  pronto:      'Pronto',
  entregue:    'Entregue',
  cancelado:   'Cancelado',
}

export interface PaymentEntry {
  method: PaymentMethod
  amount: number
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  dinheiro:       'Dinheiro',
  pix:            'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito:  'Cartão de Débito',
  boleto:         'Boleto',
  convenio:       'Convênio',
  outro:          'Outro',
}

export interface ServiceOrderItem {
  id: string
  service_order_id: string
  product_id?: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  product?: Product
}

export interface ServiceOrder {
  id: string
  company_id: string
  patient_id: string
  prescription_id?: string
  sale_id?: string
  seller_id?: string
  order_number: string
  service_type: ServiceType
  status: ServiceOrderStatus
  total_amount: number
  discount_amount: number
  paid_amount: number
  payment_method?: PaymentMethod
  payments?: PaymentEntry[]
  estimated_delivery?: string
  delivered_at?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  patient?: Patient
  seller?: Profile
  prescription?: Prescription
  items?: ServiceOrderItem[]
}

export type ServiceOrderFormData = Omit<
  ServiceOrder,
  'id' | 'company_id' | 'order_number' | 'created_at' | 'updated_at' | 'patient' | 'prescription' | 'items'
>

// ── LABORATÓRIO ──────────────────────────────────────────────
export type LabStatus =
  | 'aguardando_envio'
  | 'enviado'
  | 'em_producao'
  | 'pronto_retorno'
  | 'retornado'
  | 'com_defeito'

export const LAB_STATUS_LABELS: Record<LabStatus, string> = {
  aguardando_envio: 'Aguardando Envio',
  enviado:          'Enviado',
  em_producao:      'Em Produção',
  pronto_retorno:   'Pronto p/ Retorno',
  retornado:        'Retornado',
  com_defeito:      'Com Defeito',
}

export interface LabTracking {
  id: string
  company_id: string
  service_order_id: string
  lab_name: string
  lab_order_number?: string
  status: LabStatus
  sent_at?: string
  expected_return?: string
  returned_at?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  service_order?: ServiceOrder
}

// ── PÓS-VENDA ────────────────────────────────────────────────
export type PostSaleType = 'nps' | 'garantia' | 'assistencia' | 'ajuste' | 'reclamacao' | 'recompra'

export const POST_SALE_LABELS: Record<PostSaleType, string> = {
  nps:         'NPS / Satisfação',
  garantia:    'Garantia',
  assistencia: 'Assistência',
  ajuste:      'Ajuste',
  reclamacao:  'Reclamação',
  recompra:    'Recompra',
}

export interface PostSale {
  id: string
  company_id: string
  patient_id: string
  type: PostSaleType
  nps_score?: number
  notes?: string
  resolved: boolean
  created_by?: string
  created_at: string
}

export type PostSaleFormData = Omit<PostSale, 'id' | 'company_id' | 'created_at'>

// ── DESPESAS / CONTAS A PAGAR ────────────────────────────────
export type ExpenseCategory =
  | 'aluguel'
  | 'energia'
  | 'agua'
  | 'internet'
  | 'fornecedor'
  | 'salario'
  | 'marketing'
  | 'manutencao'
  | 'impostos'
  | 'outro'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  aluguel:     'Aluguel',
  energia:     'Energia',
  agua:        'Água',
  internet:    'Internet/Tel',
  fornecedor:  'Fornecedor',
  salario:     'Salário/Pró-labore',
  marketing:   'Marketing',
  manutencao:  'Manutenção',
  impostos:    'Impostos',
  outro:       'Outro',
}

export interface Expense {
  id: string
  company_id: string
  description: string
  amount: number
  category: ExpenseCategory
  due_date: string
  paid_at?: string
  is_paid: boolean
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type ExpenseFormData = Omit<Expense, 'id' | 'company_id' | 'created_at' | 'updated_at'>

// ── COMPRAS ──────────────────────────────────────────────────
export type PurchaseOrderStatus = 'rascunho' | 'enviado' | 'parcial' | 'recebido' | 'cancelado'

export const PURCHASE_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  rascunho:  'Rascunho',
  enviado:   'Enviado',
  parcial:   'Recebido Parcialmente',
  recebido:  'Recebido',
  cancelado: 'Cancelado',
}

export interface PurchaseItem {
  id: string
  purchase_order_id: string
  product_id?: string
  description: string
  quantity: number
  quantity_received?: number
  unit_cost: number
  total_cost: number
  product?: Product
}

export type PurchaseItemFormData = Omit<PurchaseItem, 'id' | 'purchase_order_id' | 'product'>

export interface PurchaseOrder {
  id: string
  company_id: string
  order_number: string
  supplier_id?: string
  status: PurchaseOrderStatus
  total_amount: number
  notes?: string
  expected_delivery?: string
  received_at?: string
  created_by?: string
  created_at: string
  updated_at: string
  supplier?: Supplier
  items?: PurchaseItem[]
}

export type PurchaseOrderFormData = {
  supplier_id?: string
  notes?: string
  expected_delivery?: string
  items: PurchaseItemFormData[]
}

// ── LGPD ─────────────────────────────────────────────────────
export interface ConsentLog {
  id: string
  company_id: string
  patient_id: string
  user_id?: string
  terms_version: string
  created_at: string
}

export type AuditAction =
  | 'view_prescription'
  | 'export_patient_data'
  | 'forget_patient'
  | 'create_patient'
  | 'update_patient'

export interface AuditLog {
  id: string
  company_id: string
  user_id?: string
  action: AuditAction | string
  table_name: string
  record_id: string
  created_at: string
}

// ── SINCRONIZAÇÃO ─────────────────────────────────────────────
export type SyncOperation = 'insert' | 'update' | 'delete'

export interface SyncQueueItem {
  id?: number
  table_name: string
  operation: SyncOperation
  record_id: string
  data: Record<string, unknown>
  created_at: string
  synced: boolean
  error?: string
  retry_count: number
}

export interface SyncLog {
  id: string
  company_id: string
  synced_at: string
  records_synced: number
  status: 'success' | 'partial' | 'error'
  error_message?: string
  source: 'manual' | 'scheduled'
}

export interface SyncState {
  is_syncing: boolean
  last_synced_at: string | null
  pending_count: number
  error: string | null
}

// ── DASHBOARD ────────────────────────────────────────────────
export interface DashboardStats {
  sales_today: number
  sales_today_growth: number
  orders_generated: number
  orders_pending: number
  orders_completed: number
  orders_goal_pct: number
  low_stock_products: Product[]
  weekly_data: WeeklyDataPoint[]
  recent_orders: ServiceOrder[]
}

export interface WeeklyDataPoint {
  day: string
  current: number
  previous: number
}

// ── PAGINAÇÃO ────────────────────────────────────────────────
export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

// ── API ──────────────────────────────────────────────────────
export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

// ── SAAS ADMIN ───────────────────────────────────────────────
export interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  price_monthly: number
  price_yearly: number
  max_users: number
  max_patients: number
  features: string[]
  is_active: boolean
  is_popular: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type PlanFormData = Omit<Plan, 'id' | 'created_at' | 'updated_at'>

export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled' | 'past_due'
export type BillingCycle = 'monthly' | 'yearly'

export interface Subscription {
  id: string
  company_id: string
  plan_id: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  amount: number
  trial_ends_at?: string
  current_period_start: string
  current_period_end: string
  cancelled_at?: string
  notes?: string
  created_at: string
  updated_at: string
  plan?: Plan
  company?: Company
}

export interface SubscriptionHistory {
  id: string
  company_id: string
  plan_id: string
  status: string
  amount: number
  changed_by?: string
  notes?: string
  created_at: string
  plan?: Plan
}

export interface SaasAdmin {
  id: string
  full_name: string
  email: string
  avatar_url?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface SaasStats {
  total_companies: number
  active_companies: number
  trial_companies: number
  suspended_companies: number
  total_users: number
  mrr: number
  arr: number
  new_companies_30d: number
  trials_expiring_7d: number
}

export interface CompanyWithSubscription extends Company {
  subscription?: Subscription
  user_count?: number
  patient_count?: number
}

// ── CONVÊNIOS ────────────────────────────────────────────────
export type ConvenioTipo = 'saude' | 'odonto' | 'assistencia' | 'outro'

export const CONVENIO_TIPO_LABELS: Record<ConvenioTipo, string> = {
  saude:       'Plano de Saúde',
  odonto:      'Plano Odontológico',
  assistencia: 'Assistência Técnica',
  outro:       'Outro',
}

export interface Convenio {
  id: string
  company_id: string
  name: string
  cnpj?: string
  tipo: ConvenioTipo
  desconto_percentual: number
  contato_nome?: string
  contato_telefone?: string
  contato_email?: string
  observacoes?: string
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export type ConvenioFormData = Omit<Convenio, 'id' | 'company_id' | 'created_at' | 'updated_at'>

// ── AUTORIZAÇÕES DE CONVÊNIO ──────────────────────────────────
export type AutorizacaoStatus = 'pendente' | 'aprovado' | 'negado' | 'vencido'

export const AUTORIZACAO_STATUS_LABELS: Record<AutorizacaoStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  negado:   'Negado',
  vencido:  'Vencido',
}

export interface ConvenioAutorizacao {
  id: string
  company_id: string
  convenio_id: string
  patient_id: string
  auth_number: string
  procedure?: string
  valid_from?: string
  valid_until?: string
  status: AutorizacaoStatus
  notes?: string
  created_at: string
  updated_at: string
  convenio?: { id: string; name: string }
  patient?: { id: string; full_name: string }
}

export type ConvenioAutorizacaoFormData = {
  convenio_id: string
  patient_id: string
  auth_number: string
  procedure?: string
  valid_from?: string
  valid_until?: string
  status: AutorizacaoStatus
  notes?: string
}

// ── COMISSÕES ────────────────────────────────────────────────
export interface CommissionRule {
  seller_id: string
  seller_name: string
  percentual: number
}

export interface SellerPerformance {
  seller_id: string
  seller_name: string
  total_vendas: number
  qtd_vendas: number
  percentual_comissao: number
  valor_comissao: number
}
