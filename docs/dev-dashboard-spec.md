# Especificação Técnica: Central de Desenvolvimento (Dev OS)

Este documento define o funcionamento e a evolução do dashboard `/developer`.

## 🎯 Objetivo
Prover uma interface de alta fidelidade para o dono do projeto e desenvolvedores acompanharem o status real da construção do ERP **Minha Ótica**.

## 🏗️ Estrutura de Dados (Mock -> Real)
Atualmente a página usa dados estáticos. O plano de evolução prevê:
1. **Tabela `dev_metrics`**: Armazenar porcentagens de cada um dos 23 módulos.
2. **Tabela `dev_activity_logs`**: Registrar cada ação do agente AI e do usuário.
3. **API `GET /api/v1/dev/status`**: Retornar saúde do sistema (DB, Storage, Latency).

## 📑 Mapeamento dos 23 Módulos (Master List)
O dashboard deve refletir o status de:
1. Fiscal | 2. Compras | 3. Estoque Avançado | 4. Multiempresa | 5. SaaS Billing | 6. LGPD | 7. Prontuário | 8. Produção | 9. Pós-venda | 10. Convênios | 11. Comissões | 12. Marketing/CRM | 13. Omnichannel | 14. E-commerce | 15. Pagamentos | 16. Conciliação | 17. BI/Analytics | 18. Importação | 19. Exportação | 20. Mobile/PWA | 21. Ajuda/Onboarding | 22. Backoffice SaaS | 23. IA Aplicada.

## 🎨 Padrão Estético (UX/UI)
- **Cores**: Base Slate-950, Acentos Blue-600/Indigo-500.
- **Tipografia**: Inter/Sans (Foco em legibilidade de dados).
- **Componentes**: Cards com Glassmorphism, Badges de status vibrantes.
- **Interatividade**: Transições suaves entre abas, gráficos animados (Recharts).

## 📋 Regras para o Agente (Antigravity)
- **Atualização Pós-Tarefa**: Após cada entrega significativa, o agente DEVE atualizar o array `LOGS` e `PROGRESS_DATA` no frontend.
- **Sinceridade Técnica**: O progresso deve refletir o que está realmente funcional no código (ex: 100% apenas se houver CRUD e Testes).
- **Saúde Técnica**: O painel deve alertar caso o banco de dados ou API fiquem offline.

---
*Este documento é a base para o Claude (Antigravity) atuar com coerência e precisão.*
