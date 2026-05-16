# Roadmap Detalhado — Minha Ótica

**Prazo-alvo**: Lançamento completo na 1ª quinzena de julho.
**Estratégia**: Execução paralela por squads, integração contínua e congelamento progressivo de escopo por módulo.

---

## 🗺️ Estrutura Final de Navegação

```
Dashboard
Clientes
  └── CRM / Histórico / Receitas / Pós-venda

Produtos e Estoque
  └── Produtos / Categorias / Marcas / Estoque / Movimentações
      Inventário / Importação-Exportação / Etiquetas

Comercial / Operação
  └── Orçamentos / Vendas-PDV / Ordens de Serviço / Produção
      Entregas / Trocas-Devoluções

Compras e Suprimentos
  └── Solicitações / Pedidos de Compra / Recebimentos / Fornecedores

Financeiro
  └── Caixa Diário / Contas a Receber / Contas a Pagar
      Fluxo de Caixa / Comissões / Conciliação / DRE

Agenda
  └── Atendimentos / Retiradas / Ajustes / Recompra / Aniversários

Atendimento / Omnichannel
  └── Inbox / Conversas / Respostas Rápidas / Templates / Automações

Fiscal
  └── Configurações / Produtos Fiscais / Documentos / XML-DANFE / Integrações

Relatórios / BI
  └── Vendas / Estoque / Clientes / OS / Financeiro / Comissões / Performance

SaaS Admin
  └── Empresas / Unidades / Planos / Assinaturas / Métricas

Laboratórios
  └── Laboratórios / Tabelas / Prazos / Pedidos / Controle de Retorno

Configurações
  └── Empresa / Usuários / Permissões / Unidades
      Formas de Pagamento / Status / Templates / LGPD
```

---

## 🏃 Sprints

### Sprint 0 — Auditoria Técnica e Plano de Guerra
**Período**: 15/05 a 17/05 | **Status**: ✅ Concluída

**Entregas:**
- [x] Indexar e mapear `/frontend` e `/backend`
- [x] Validar scripts de build/dev e variáveis de ambiente
- [x] Criar `.env.example` no frontend e backend
- [x] Criar documentação: roadmap, architecture, modules, database, api-contracts, lgpd-security
- [x] Criar matriz de módulos (23 módulos catalogados)
- [x] Criar matriz de permissões e definição de squads

**Critério de aceite**: Repo roda localmente, documentação mínima existe, rotas e módulos mapeados, squads alinhados.

---

### Sprint 1 — Fundação SaaS, Autenticação, Permissões e Shell
**Período**: 18/05 a 24/05 | **Status**: ✅ Concluída

**Frontend:**
- [x] Layout principal + Sidebar + Header
- [x] Rotas protegidas
- [x] Login / Logout / Sessão persistente
- [x] Estados globais (Zustand) + React Query
- [x] Design System base: Button, Input, Select, Dialog, Table, Card, Badge, Tabs, Dropdown, Toast
- [x] Padrão visual responsivo
- [x] PWA base com Vite PWA
- [x] Skeleton / loading / error states

**Backend:**
- [x] Estrutura de API Express (Helmet, CORS, Rate Limit, Error Handler)
- [x] Auth Guard + Tenant Guard
- [x] Validação com Zod
- [x] Multiempresa: companies, branches, tenant context
- [x] Usuários, Perfis, Permissões
- [x] Logs de auditoria (audit_logs)
- [x] Health check + padrão de resposta

**Módulos entregues**: Login, Usuários, Empresas, Unidades, Permissões, Dashboard shell, Configurações iniciais, Dev OS Dashboard

**Critério de aceite**: Usuário loga, entra na empresa correta, navega no shell, vê permissões aplicadas e toda ação relevante gera log.

---

### Sprint 2 — Clientes, CRM, Receitas, LGPD e Pós-venda Inicial
**Período**: 25/05 a 31/05 | **Status**: 🟡 Em Andamento

#### Clientes / CRM
- [x] Cadastro completo (nome, CPF, RG, telefone, WhatsApp, e-mail, gênero, endereço, observações)
- [x] Edição e inativação
- [x] Busca por nome, CPF, telefone, WhatsApp e e-mail
- [x] Linha do tempo do cliente
- [ ] Filtros por origem, status, vendedor e data
- [ ] Tags
- [ ] Preferências de armação e lente
- [ ] Histórico de compras e atendimentos
- [ ] Observações internas (separadas das notas gerais)
- [ ] Origem do cliente
- [ ] Próxima recompra sugerida
- [ ] Flag de cliente recorrente/inativo

#### Receitas Oftalmológicas
- [x] Cadastro: OD/OE (esférico, cilíndrico, eixo, adição, DNP, altura)
- [x] Médico + CRM + data da receita + validade
- [x] Histórico de receitas com badge de validade (vencida / a vencer / válida)
- [x] Scan por IA (Gemini) via câmera ou upload de imagem
- [x] Alerta visual de receita vencida
- [ ] Upload de imagem/PDF da receita original
- [ ] Comparativo simples entre receitas
- [ ] Tipo de lente (monofocal, bifocal, multifocal, ocupacional)
- [ ] Receita reutilizável em orçamento, venda e OS

#### LGPD
- [x] Consentimento do cliente com registro de data/hora e versão dos termos
- [x] Exportação de dados do titular (JSON com cadastro + receitas + consentimentos)
- [x] Anonimização / direito ao esquecimento (LGPD art. 18)
- [x] Logs de auditoria de acesso a dados sensíveis
- [ ] Termo de aceite formal (PDF)
- [ ] Registro de base legal explícito por finalidade

#### Pós-venda Inicial
- [ ] Garantia básica vinculada à venda/OS
- [ ] Assistência e ajuste
- [ ] Registro de reclamação
- [ ] NPS simples (nota + comentário pós-entrega)
- [ ] Recompra manual

**Critério de aceite**: Cliente tem cadastro completo, receita vinculada, histórico visível, consentimento registrado e dados reutilizáveis no fluxo comercial.

---

### Sprint 3 — Produtos, Estoque Avançado, Compras e Suprimentos
**Período**: 01/06 a 07/06 | **Status**: ⚪ Pendente

#### Produtos
Cadastro completo: categoria, marca, SKU, código de barras, QR Code, foto, modelo, cor, material, tamanho, gênero, custo, preço, margem, fornecedor, status.
Dados fiscais iniciais: NCM, CFOP padrão, CST/CSOSN, CEST.

#### Estoque
Por unidade, atual/mínimo/reservado/em produção/em laboratório.
Entrada, saída, ajuste manual, inventário, transferência entre unidades.
Perdas, avarias, devoluções, custo médio, valor total.
Curva ABC, histórico de movimentação, alerta de estoque baixo.

#### Importação / Exportação
CSV/XLSX para produtos e estoque. Validação de duplicados. Rollback simples.

#### Compras / Suprimentos
Solicitação → Cotação → Pedido → Aprovação → Recebimento → Conferência.
Entrada automática no estoque. Histórico por fornecedor.

**Critério de aceite**: Produto entra por compra/importação, movimenta estoque por unidade, alerta baixo estoque, reserva item em venda/OS e mantém histórico rastreável.

---

### Sprint 4 — Comercial / Operação: Orçamentos, Vendas, PDV e Pagamentos
**Período**: 08/06 a 14/06 | **Status**: ⚪ Pendente

#### Orçamentos
Criar, duplicar, vincular cliente e receita. Armação, lente, tratamentos, serviços.
Desconto por item e total. Validade, vendedor, observações.
Status: aberto / aprovado / recusado / vencido. Motivo de perda.
PDF (jsPDF), envio WhatsApp/e-mail, conversão em venda, relatório de conversão.

#### Vendas / PDV
Venda rápida/vinculada/com receita/de orçamento. Múltiplos produtos e formas de pagamento.
Dinheiro, Pix, débito, crédito, boleto, link, convênio, parcelamento interno.
Recibo, comissão básica, baixa e reserva de estoque.
Cancelamento, troca, devolução.
Geração automática de OS para óculos de grau/lente.
Geração automática de contas a receber e lançamento no caixa.

**Critério de aceite**: Orçamento vira venda, venda baixa/reserva estoque, gera financeiro, comissão e OS quando aplicável.

---

### Sprint 5 — Ordem de Serviço, Produção, Entrega e Qualidade
**Período**: 15/06 a 21/06 | **Status**: ⚪ Pendente

#### OS
Criação automática (pós-venda) e manual. Número único, receita vinculada, prazo, responsável, observações, anexos, impressão.
Status completo: Pedido criado → Aguardando pagamento → Aguardando armação/lente → Enviado ao lab → Em produção → Recebido → Em conferência → Pronto → Entregue → Cancelado / Retrabalho / Garantia.

#### Produção
Kanban por status. Filtros por prazo/responsável/laboratório.
Conferência técnica, medidas finais, reprovação, retrabalho.

#### Entregas
Registro de retirada, responsável, confirmação do cliente, pós-venda disparado.

**Critério de aceite**: Toda venda com lente/óculos gera OS, passa por produção, registra status, controla atraso e fecha entrega.

---

### Sprint 6 — Financeiro, Fiscal, Conciliação e Comissões Avançadas
**Período**: 22/06 a 28/06 | **Status**: ⚪ Pendente

#### Financeiro
Caixa diário (abertura, fechamento, sangria, suprimento). Contas a receber/pagar, fluxo de caixa, DRE simplificada.
Receita bruta/líquida, custos, despesas, lucro estimado, margem, ticket médio, inadimplência.
Parcelas: baixa manual/parcial, estorno, juros/multa, taxas de cartão.

#### Comissões Avançadas
Por vendedor/produto/categoria/margem/meta/recebimento. Estorno em cancelamento.
Rankings, metas individuais e por loja.

#### Fiscal
Dados fiscais da empresa, regime tributário, certificado A1.
Cadastro fiscal de produtos: NCM, CFOP, CST/CSOSN, CEST, alíquotas.
Estrutura para NF-e / NFC-e / NFS-e. XML, DANFE, cancelamento, carta de correção, consulta SEFAZ.

#### Conciliação
Contas bancárias, saldo inicial, importação OFX, conciliação manual, saldo conciliado.

**Critério de aceite**: Venda gera financeiro, parcelas fecham, caixa bate, comissão calcula, fiscal estruturado e relatórios respondem o básico.

---

### Sprint 7 — Atendimento, Omnichannel, Agenda, Marketing, SaaS Admin e BI
**Período**: 29/06 a 05/07 | **Status**: ⚪ Pendente

#### Agenda
Atendimento, exame, retirada, ajuste/manutenção, recompra, troca de lente, aniversário.
Status: agendado / confirmado / compareceu / não compareceu / reagendado / cancelado.

#### Atendimento / Omnichannel
Inbox única, cliente vinculado, histórico, tags, SLA, respostas rápidas, funil, templates.
Avisos automáticos: OS pronta, orçamento, pagamento pendente, retirada.
Preparação para: WhatsApp oficial/API, Instagram, Facebook, site chat, e-mail.

#### Marketing / CRM Ativo
Leads, funil comercial, segmentação (inativos, receita vencendo, aniversariantes, orçamentos perdidos).
Campanhas manuais, recuperação de orçamento/cliente, cupom simples, indicação manual.

#### Relatórios / BI
Vendas por período/vendedor/produto/categoria/forma de pagamento.
Orçamentos (aprovados, perdidos, conversão). Clientes (novos, recorrentes).
Estoque (mais vendidos, parados, baixo). OS (atraso, status). Financeiro mensal.
DRE, EBITDA, CAC manual, LTV estimado, taxa de recompra, lucratividade por produto/cliente/laboratório.

#### SaaS Admin
Painel Super Admin: empresas, unidades, usuários, planos, trial, assinaturas, limites, bloqueio, faturas, métricas globais, impersonate.

#### IA Aplicada
Resumo do cliente, sugestão de recompra, análise de vendas, sugestão de campanha, classificação de leads, geração de mensagens comerciais, explicação de indicadores.

**Critério de aceite**: Sistema agenda, atende, comunica, mede, administra empresas SaaS e gera visão gerencial acionável.

---

### Sprint 8 — Laboratórios, Integrações Finais, QA, Hardening e Lançamento
**Período**: 06/07 a 15/07 | **Status**: ⚪ Pendente

#### Laboratórios / Fornecedores
Cadastro completo (lab, fornecedor, distribuidor). CNPJ, responsável, contatos, endereço.
Tabela de preços, prazo por tipo de lente, vínculo com produtos/OS.
Pedido ao laboratório, controle de envio/retorno, histórico, custo, margem por OS.
Retrabalho, garantia, checklist de qualidade.

#### QA Funcional (fluxo obrigatório completo)
Criar empresa → unidade → usuário → permissões → cliente → consentimento LGPD → receita → produto → estoque → orçamento → venda → pagamento → contas a receber → baixar estoque → OS → produção → laboratório → retorno → conferência → pronto → entrega → pós-venda → comissão → fechar caixa → relatórios.

#### QA Técnico
Build, lint, teste de rotas/permissões/multiempresa/isolamento/upload/PDF/importação/offline/performance/responsividade/segurança/rate limit/logs/dados sensíveis/backup.

#### Hardening
CORS, Helmet, Rate Limit, permissões, tenant isolation, anexos, logs, LGPD, fiscal, tratamento de erros, estados vazios, mensagens, loading states, fallbacks.

#### Release
Staging → produção, domínio, SSL, banco produção, storage, seed, Super Admin, dados demo, checklist de implantação, guia rápido, treinamento por perfil, monitoramento, go-live.

**Critério de aceite final**: Fluxo completo Cliente → Receita → Produto → Estoque → Orçamento → Venda → Pagamento → OS → Produção → Laboratório → Entrega → Financeiro → Relatórios → Pós-venda → Gestão SaaS.

---

## 📅 Marcos de Controle

| Data | Marco | Status |
| :--- | :--- | :--- |
| 24/05 | Fundação congelada (Auth, multiempresa, permissões, layout, API base) | ✅ |
| 31/05 | CRM e receitas congelados (clientes, receitas, LGPD, pós-venda) | 🟡 |
| 07/06 | Estoque e compras congelados | ⚪ |
| 14/06 | Comercial congelado (orçamentos, vendas, PDV, pagamentos) | ⚪ |
| 21/06 | OS e produção congeladas | ⚪ |
| 28/06 | Financeiro e fiscal congelados | ⚪ |
| 05/07 | Gestão e comunicação congeladas (agenda, atendimento, BI, SaaS admin, IA) | ⚪ |
| 15/07 | **Lançamento completo** | ⚪ |

---

## 👥 Squads e Prioridades

| Squad | Responsabilidade |
| :--- | :--- |
| **Core/Auth** | Multiempresa, Auth, Usuários, Permissões, Logs, Segurança, Config |
| **CRM/Receitas** | Clientes, Timeline, Receitas, LGPD, Pós-venda, Garantias |
| **Estoque/Compras** | Produtos, Estoque, Inventário, Importação/Exportação, Compras, Fornecedores |
| **Comercial/OS** | Orçamentos, Vendas, PDV, OS, Produção, Entregas, Trocas/Devoluções |
| **Financeiro/Fiscal** | Caixa, Recebíveis, Pagáveis, Fluxo de Caixa, Comissões, DRE, Fiscal, Conciliação |
| **Atendimento/BI/SaaS** | Agenda, Atendimento, Omnichannel, Marketing, Relatórios, BI, SaaS Admin, IA |
| **QA/Release** | Testes, Massa de dados, Deploy, Hardening, Treinamento, Documentação, Go-live |

---

## 📊 Níveis de Prioridade

**Nível A — Operacional obrigatório** (não lança sem):
Auth, Usuários, Clientes, Receitas, Produtos, Estoque, Orçamentos, Vendas, OS, Financeiro.

**Nível B — Completo funcional** (lança sem, entrega em seguida):
Compras, Fiscal, Relatórios, Agenda, Atendimento, Pós-venda, SaaS Admin.

**Nível C — Heroico controlado** (diferencial competitivo):
Omnichannel real, IA, BI avançado, Conciliação, Laboratório avançado, Fiscal completo.
