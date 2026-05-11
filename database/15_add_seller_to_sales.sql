-- Adiciona coluna de vendedor à tabela de vendas
ALTER TABLE sales ADD COLUMN seller_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Atualiza a política de segurança (RLS) se necessário
-- (Geralmente as políticas já cobrem novas colunas se forem baseadas em company_id)

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_sales_seller_id ON sales(seller_id);
