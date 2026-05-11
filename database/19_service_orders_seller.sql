-- Adiciona vendedor (seller_id) em ordens de serviço
-- Run this in Supabase Studio > SQL Editor

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_orders_seller_id ON service_orders(seller_id);
