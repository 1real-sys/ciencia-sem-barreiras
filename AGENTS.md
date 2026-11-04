# AGENTS.md — instruções obrigatórias ao Codex

## Contexto
Construir do zero o projeto **Ciência Sem Barreiras V4**. Antes de começar, leia `README.md`, `INICIO-CODEX.md`, `docs/ARQUITETURA_V4.md`, `docs/SEGURANCA.md`, `docs/PAINEL_ADMIN.md` e `docs/ACEITE.md`. A V4 SUBSTITUI toda regra antiga da V3 que exija editar GitHub para publicar conteúdo. Não pedir para a estudante abrir GitHub ou editar JSON.

## Regras de produto
- Público do site: crianças do 5º ano e demais visitantes. UI **mobile-first**, com ilustrações/cores verde-água e azul, toque confortável, boa leitura e acessibilidade real. Não copiar aparência de painel corporativo para a área pública.
- Exatamente nove ambientes oficiais do briefing, slug estável. Cada espaço terá texto base, imagem/galeria, vídeo Libras, vídeo audiodescrição e áudio opcional. Campo não publicado => `Conteúdo em preparação`.
- **A estudante deve gerenciar conteúdos inteiramente no navegador por painel `/admin`**: entrar com uma senha compartilhada, anexar/substituir mídias, editar textos, pré-visualizar, salvar rascunho e publicar. Sem contas individuais e **sem GitHub para editar**. Recepção de conteúdo quase imediata após refresh, sem rebuild.
- **GitHub Pages hospeda apenas SPA; Supabase armazena conteúdos; Cloudflare Worker valida sessão e escrita.** Nada de JWT secreto, senha admin, `service_role` ou tokens privilegiados no frontend.
- Não aceitar senha de quatro dígitos fixa, mesmo que solicitada como exemplo; senha forte em secret no Worker, tentativa limitada e mensagens neutras. Segredo client-side não é segredo. Não prometer que URL escondida protege a área.
- Backend deve controlar todas as mutações e manter rascunhos separados de conteúdo publicado; garantir RLS negando gravação anônima; Storage escrita por URLs assinadas de curto prazo.
- Não gerar conteúdo científico sobre animais presentes na exposição sem confirmação. Nunca inventar fotografia, gravação, Libras, audiodescrição, autorização institucional, dados de avaliação.
- QR Codes ainda sujeitos à confirmação: suportar geral e entradas separadas por recurso, todos apontando para URLs reais após definir base. Não prometer instalação física.
- V1 é **site + editor + publicação**. 24 jogos originais estão documentados em `docs/JOGOS_FASE_2.md` para depois; não implementar botões que finjam jogos.
- Conservar texto exato da seção `Por que criamos este projeto?` (veja docs) e do rodapé.

## Qualidade técnica
- Angular 22 standalone/strict + Tailwind + signals; `provideRouter(routes, withHashLocation())`; Vitest + Playwright + axe-core; usar URLs configuráveis para API e Supabase.
- Types/interfaces tipadas, validação de schema de entrada no Worker, lista branca de tipos, limites de tamanho. Proteção XSS para texto formatado; não usar `innerHTML` com material sem sanitização.
- Segurança para editar: rate limit persistente, CORS fixo, sessão assinada/servidor, CSRF, cookies cross-site ou token em memória com tradeoffs documentados, rotação de senha, logout, upload assinado e confirmação.
- Revalidar dados depois de salvar/publicar; nomear arquivos por UUID, usar revision; não depender de cache eterno ou service worker.
- Testar 320/360/390/414/768/1024/1440px, teclado, leitores de tela, sem áudio automático. Renderizar estados loading/error/empty sem deixar espaço feio.
- Documentar e **executar** build/tests quando possível; registrar evidências/limitações reais em `docs/ACEITE.md`.
- Se o acesso a contas Supabase/Cloudflare/GitHub não estiver configurado, desenvolver implementação com mocks e testes locais, deixar comandos e variáveis documentados e relatar apenas o que não pode validar no cloud. NÃO inventar deploy concluído.

## Skills a consultar conforme área
`.agents/skills/design-system-educativo/`, `acessibilidade-wcag/`, `conteudo-cientifico/`, `gestao-de-conteudo/`, `painel-administrativo/`, `seguranca-worker-supabase/`, `qa-publicacao/`, `jogos-investigativos/` (fase 2).
