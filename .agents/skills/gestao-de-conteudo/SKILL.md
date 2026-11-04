---
name: gestao-de-conteudo
description: Organizar o conteúdo aprovado e o painel de mídias dos oito ambientes, via Supabase e Worker, sem GitHub para a editora.
---
# Gestão de conteúdo V4

Leia `docs/PAINEL_ADMIN.md` e `docs/MIDIAS_E_EDICAO.md`.
- Fonte de verdade em produção: Supabase, NÃO arquivos JSON no GitHub.
- Draft privado e published público separados; editor com upload de imagens, áudio, vídeos Libras e audiodescrição, legendas/transcrições e prévia.
- Mídia com alt, tipo foto/ilustração e créditos; indisponível = `Conteúdo em preparação`.
- Alterações editoriais sem rebuild/deploy. Supabase Free: limites e vídeo externo conforme necessário.
- 8 slugs fixos; QR a confirmar. Não inventar fatos da exposição.
