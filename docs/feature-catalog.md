# Catálogo Completo de Funcionalidades — Minha Ótica

Este documento contém a especificação detalhada de todos os módulos necessários para transformar o sistema em um ERP/SaaS completo para óticas.

---

## 1. Fiscal e Emissão de Documentos
Essencial para a operação legal e profissional da ótica.
- **Documentos**: NF-e, NFC-e, NFS-e (Serviços), SAT/CF-e.
- **Certificação**: Integração com certificado digital A1.
- **Dados Fiscais**: NCM, CFOP, CST/CSOSN, CEST, Alíquotas (ICMS, PIS, COFINS, IPI).
- **Operações**: Natureza da operação, Cancelamento, Carta de Correção, Inutilização, Consulta SEFAZ.
- **Gestão**: Armazenamento de XML, Envio automático por e-mail, Relatório fiscal.

## 2. Compras e Suprimentos
Gestão do relacionamento e aquisição com fornecedores.
- **Fluxo**: Solicitação -> Cotação -> Pedido -> Aprovação -> Recebimento.
- **Conferência**: Batimento entre pedido e Nota Fiscal de entrada.
- **Custos**: Cálculo de custo de aquisição (Frete, Descontos, Impostos).
- **Automação**: Atualização automática de estoque e sugestão de recompra por estoque mínimo.

## 3. Gestão Avançada de Estoque
Controle granular para operações de alto volume.
- **Localização**: Estoque por unidade, prateleira/gaveta física.
- **Estados**: Reservado, Em Produção, Em Laboratório, Consignado, Mostruário, Manutenção/Defeito.
- **Auditoria**: Inventário cíclico e relatório de divergências.
- **Identificação**: Etiquetas de preço, Etiquetas internas, QR Code/Código de Barras.
- **Logística**: Transferência entre lojas e controle de perdas/quebras.

## 4. Multiempresa e Multiunidade (SaaS Core)
Arquitetura para redes de óticas e franquias.
- **Hierarquia**: Matriz e Filiais com isolamento de dados.
- **Acesso**: Permissões por unidade e por empresa.
- **Financeiro**: Caixa e faturamento separado ou consolidado.
- **Relatórios**: Visão por loja ou global da rede.

## 5. Planos, Assinatura e Billing SaaS
Módulo de gestão do produto comercial.
- **Assinaturas**: Planos (Bronze, Prata, Ouro), Trial gratuito, Upgrade/Downgrade.
- **Limites**: Controle de usuários, unidades, notas fiscais e mensagens por plano.
- **Financeiro SaaS**: Cobrança recorrente (Cartão/Pix), Gestão de faturas, Bloqueio por inadimplência.
- **Retenção**: Políticas de guarda de dados após cancelamento.

## 6. LGPD, Segurança e Auditoria
Conformidade legal e proteção da informação.
- **Conformidade**: Termos de Uso, Política de Privacidade, Registro de Consentimento.
- **Direitos**: Anonimização, Exportação de dados, Exclusão/Retificação.
- **Auditoria**: Logs completos (Quem, O que, Quando, IP/Dispositivo).
- **Segurança**: Backup automático, Criptografia de dados sensíveis e proteção de anexos.

## 7. Prontuário Óptico Completo
Módulo técnico de saúde visual.
- **Histórico**: Evolução do grau ao longo do tempo e comparativos.
- **Dados Técnicos**: OD/OE completo, DNP (Monocular/Binocular), Altura de montagem, Curva base, Prisma, Acuidade visual.
- **Finalidade**: Uso (Perto, Longe, Multifocal, Ocupacional, Solar).
- **Validação**: Responsável técnico e assinatura/confirmação do cliente.

## 8. Laboratório e Produção
Controle fino da fabricação dos óculos.
- **Envio**: Pedido ao laboratório, integração via API, controle de envio/retorno.
- **Custos**: Tabela de preços por laboratório e cálculo de margem real por OS.
- **Qualidade**: Checklist de conferência técnica, medidas finais e gestão de retrabalho/reprovação.
- **Notificação**: Comunicação automática com o cliente sobre o status da produção.

## 9. Garantia, Assistência e Pós-venda
Retenção e fidelização pós-entrega.
- **Garantias**: Armação, Lente, Tratamento e Montagem.
- **Assistência**: Registro de trocas, ajustes, consertos e devoluções.
- **Qualidade**: Gestão de reclamações (SAC) e Pesquisa de Satisfação (NPS).
- **Marketing**: Campanhas de recompra e retorno programado.

## 10. Convênios e Parcerias
Gestão de vendas corporativas e parcerias locais.
- **Cadastro**: Convênios e empresas parceiras com tabelas de preços especiais.
- **Operação**: Autorização de convênio, faturamento mensal para empresa.
- **Comissões**: Regras de comissão para parceiros/indicadores.

## 11. Comissões Avançadas
Motivação e controle da equipe comercial.
- **Regras**: Comissão por produto, categoria, margem de lucro ou meta batida.
- **Pagamento**: Comissão por recebimento (baixa do financeiro) e não apenas pela venda.
- **Metas**: Rankings, metas individuais/loja e premiações.

## 12. Marketing e CRM Ativo
Transformação de dados em vendas.
- **Funil**: Gestão de Leads e origem do contato.
- **Segmentação**: Clientes inativos, receitas vencendo, aniversariantes.
- **Automação**: Follow-up de orçamentos perdidos, cupom de desconto e programa de fidelidade/cashback.

## 13. Omnichannel Real
Centralização de todos os canais de atendimento.
- **Canais**: WhatsApp (API), Instagram, Facebook, E-mail, Chat do site.
- **Gestão**: Fila de atendimento, SLA, triagem por IA (Chatbot) e handoff para humano.
- **Histórico**: Conversas unificadas no perfil do cliente.

## 14. E-commerce e Catálogo Online
Presença digital e vendas online.
- **Vitrine**: Catálogo público, link de orçamento e pagamento online.
- **Integração**: Pedido online integrado ao estoque físico e retirada em loja (Omni).

## 15. Integrações de Pagamento
Facilitação do fechamento de venda.
- **Gateways**: Mercado Pago, PagSeguro, Stone, etc.
- **Métodos**: Pix Automático (QR Code), Link de pagamento, Cartão recorrente.
- **Automação**: Baixa automática no financeiro por confirmação do gateway.

## 16. Conciliação Bancária
Fechamento financeiro rigoroso.
- **Importação**: Arquivos OFX e Integração Open Finance.
- **Batimento**: Conciliação automática e manual de taxas bancárias e despesas recorrentes.

## 17. BI e Indicadores Estratégicos (Analytics)
Visão gerencial para tomada de decisão.
- **Financeiro**: DRE completa, EBITDA, Margem líquida.
- **Métricas**: CAC, LTV, Taxa de Recompra, Churn.
- **Performance**: Lucratividade por laboratório/produto/cliente.

## 18. Importação e Migração de Dados
Facilitação do onboarding de novas óticas.
- **Modelos**: Planilhas padrão para Clientes, Produtos, Estoque e Receitas.
- **Segurança**: Validação de duplicados e Rollback de importação.

## 19. Exportação de Dados
Transparência e portabilidade.
- **Formatos**: PDF, Excel, CSV, XML Fiscal.
- **Backup**: Opção de backup manual completo dos dados da empresa.

## 20. App Mobile / PWA
Mobilidade para o vendedor e o dono.
- **Operação**: Leitor de código de barras via câmera, consulta rápida de OS e notificações push.

## 21. Central de Ajuda e Onboarding
Educação do usuário.
- **Ferramentas**: Tour inicial, tutoriais em vídeo, FAQ e base de conhecimento.

## 22. Administração da Plataforma (Backoffice)
Painel para o dono do SaaS gerenciar o negócio.
- **Monitoramento**: Saúde da conta, uso de limites, suporte via impersonate.

## 23. Inteligência Artificial Aplicada
Diferencial competitivo e produtividade.
- **IA**: Resumo de perfil do cliente, previsão de demanda de estoque, análise de sentimentos no atendimento e assistente para o dono da ótica.
