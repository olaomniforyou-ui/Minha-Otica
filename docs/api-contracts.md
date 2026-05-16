# Contratos de API e Padrões de Resposta — Minha Ótica

Este documento define como o Frontend e o Backend se comunicam.

## 📡 Padrões REST
- **Base URL**: `/api/v1`
- **Formato**: JSON (UTF-8)
- **Autenticação**: Bearer Token (JWT via Supabase).
- **Tenant ID**: Passado via Header `x-tenant-id` ou extraído do token do usuário.

## 📥 Validação de Entrada (Zod)
Todas as rotas de escrita (POST/PUT) devem validar o `body` usando schemas Zod.
Exemplo:
```typescript
const CustomerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  document: z.string().length(11), // CPF
});
```

## 📤 Padrão de Resposta (Success)
Status HTTP: `200 OK` ou `201 Created`.
```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso"
}
```

## ❌ Padrão de Erro
Status HTTP: `400`, `401`, `403`, `404`, `500`.
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": [ ... ]
  }
}
```

## 🛡️ Middlewares Obrigatórios
1. **AuthGuard**: Verifica se o token é válido.
2. **TenantGuard**: Garante que o usuário tem acesso à `company_id` solicitada.
3. **PermissionGuard**: Verifica se o perfil do usuário permite a ação (`create:customer`, `view:finance`, etc).
4. **RateLimit**: Proteção contra excesso de requisições.

## 📄 Paginação
Padrão para listas:
`GET /customers?page=1&limit=20`
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```
