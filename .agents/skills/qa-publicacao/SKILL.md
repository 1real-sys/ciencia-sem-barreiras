---
name: qa-publicacao
description: Garantir GitHub Pages + Supabase + Cloudflare, deploy correto, mobile-first, testes de publicação e autenticação.
---
# QA e publicação V4

Leia `docs/ACEITE.md`, `docs/GITHUB_PAGES.md` e `docs/SEGURANCA.md`.
- GitHub Actions publica só frontend. Atualizações editoriais são dinâmicas no Supabase sem commits.
- Testar login incorreto/expiração, admin sem sessão, RLS, upload e tipos inválidos, rascunho invisível, publicar/refresh, cache e erro de rede.
- Testar mobile 320-414px e desktop, teclado, leitores de tela, axe-core, VLibras e links hash QR.
- Verificar build real e saída dist; não marcar deploy executado sem credenciais e confirmação.
