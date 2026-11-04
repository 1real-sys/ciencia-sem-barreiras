---
name: seguranca-worker-supabase
description: Construir a API Cloudflare Worker, proteção de senha compartilhada, sessão, RLS Supabase, signed upload e publicação segura.
---
# Segurança do painel e dados

Leia `docs/SEGURANCA.md`, `docs/ARQUITETURA_V4.md`, `docs/SUPABASE_SETUP.md` e `docs/CLOUDFLARE_SETUP.md`.
- Senha compartilhada FORTE via Worker secret; nunca comparar `2207` no cliente. Rate limiting persistente, sessão curta, CORS com origin exato, CSRF/Origin validation.
- service_role exclusivo servidor, publishable no frontend, RLS deny anon writes and draft reads.
- URL assinada curta para bucket privado staging; validação MIME/assinatura binária, tamanho, path aleatório. Promover para bucket publicado somente após publicação.
- Não permitir XSS, SVG ativo nem SQL/RPC insegura. Revisão atomicamente, rollback, uploads órfãos e testes de negação obrigatórios.
