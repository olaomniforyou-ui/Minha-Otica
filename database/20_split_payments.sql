-- Suporte a múltiplas formas de pagamento (pagamento combinado)
-- Formato: [{ "method": "pix", "amount": 100 }, { "method": "cartao_credito", "amount": 150 }]
-- Run this in Supabase Studio > SQL Editor

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS payments jsonb;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payments jsonb;
