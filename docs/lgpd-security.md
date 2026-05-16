# LGPD e Segurança de Dados — Minha Ótica

Este documento descreve as medidas de conformidade com a Lei Geral de Proteção de Dados e segurança da informação.

## ⚖️ Conformidade LGPD
O sistema trata dados sensíveis (saúde/receitas) e deve garantir:

1. **Base Legal**: Todo cadastro de cliente deve ter uma finalidade clara (Execução de Contrato ou Consentimento).
2. **Consentimento**: Registro de data/hora e IP do aceite dos Termos de Uso e Política de Privacidade.
3. **Direitos do Titular**:
   - **Acesso**: Exportação de dados em formato legível (JSON/PDF).
   - **Exclusão (Esquecimento)**: Anonimização ou exclusão definitiva após o prazo legal de guarda.
   - **Correção**: Interface para atualização de dados.
4. **Dados Sensíveis**: Receitas oftalmológicas são dados de saúde. Acesso restrito e logado.

## 🔒 Segurança da Informação

### Criptografia
- **Em Trânsito**: Uso obrigatório de HTTPS/TLS 1.2+.
- **Em Repouso**: Banco de dados criptografado (padrão Supabase/AWS).

### Autenticação e Acesso
- **MFA (Multi-fator)**: Recomendado para administradores.
- **Sessões**: Expiração automática de tokens.
- **RBAC (Role-Based Access Control)**: Acesso baseado estritamente na função do usuário.

### Isolamento (Multi-tenancy)
- **RLS (Row Level Security)**: Uso de políticas do PostgreSQL para garantir que uma empresa nunca veja dados de outra, mesmo em caso de falha na aplicação.

### Logs e Auditoria
- Registro de:
  - Login/Logout.
  - Acesso a dados sensíveis (visualização de receita).
  - Alterações em registros financeiros.
  - Exportação de relatórios.

## 📂 Retenção de Dados
- Dados fiscais: Mínimo 5 anos.
- Receitas: Conforme regulamentação de saúde.
- Clientes inativos: Anonimização após 2 anos sem movimentação (configurável).
 bitumen
