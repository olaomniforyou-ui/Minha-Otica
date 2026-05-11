-- Vincula Ordens de Serviço ↔ Vendas
-- Run this in Supabase Studio > SQL Editor

-- Adiciona sale_id em service_orders (OS pode gerar uma Venda)
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS sale_id uuid REFERENCES sales(id) ON DELETE SET NULL;

-- Adiciona service_order_id em sales (Venda pode originar de uma OS)
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS service_order_id uuid REFERENCES service_orders(id) ON DELETE SET NULL;

-- Índices para as foreign keys
CREATE INDEX IF NOT EXISTS idx_service_orders_sale_id ON service_orders(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_service_order_id ON sales(service_order_id);
