---
name: painel-administrativo
description: Implementar o editor visual do Ciência Sem Barreiras V4 com texto e mídias, rascunho, prévia, publicação e UX sem conhecimento de Git.
---
# Painel administrativo V4

Leia `docs/PAINEL_ADMIN.md`, `docs/ARQUITETURA_V4.md` e `docs/SEGURANCA.md`.
- Design do admin simples e claro (área pública mais ilustrada), confortável em celular e desktop.
- A estudante entra com senha única no Worker sem cadastro de usuário; sessão verificada server-side.
- Oito espaços fixos; editor de texto visual + galeria + áudio + vídeo Libras + vídeo audiodescrição; alt, créditos, legendas e transcrições.
- Upload assinado, progresso, limites de 50 MB no Free (validar cotas); estados de rascunho vs publicado; preview real; `Publicar` só conclui após persistência.
- SEM commits editoriais, SEM arquivos JSON para a estudante, SEM senha no TypeScript do navegador.
- Checklist de aceitação e acessibilidade nos docs.
