# Arquitetura V4 — fluxos e contratos

Implementação e comandos atuais: [EXECUCAO.md](EXECUCAO.md). Decisões e limites: [DECISOES_IMPLEMENTACAO.md](DECISOES_IMPLEMENTACAO.md). Aplicar as migrações **0001, 0002 e 0003**, nessa ordem; usar `worker/wrangler.toml` implementado, com Durable Object.

```text
VISITANTE (celular)                     EDITORA (celular ou computador)
       |                                          |
       v                                          v
 GitHub Pages: Angular SPA  <------------  /#/admin (Angular SPA)
       |                                          |
       | SELECT conteúdo aprovado                 | POST senha, draft, publish, autoriza upload
       v                                          v
 Supabase Postgres + Storage             Cloudflare Worker (segredos, sessão e rate limit)
       ^                                          |
       |                                          | service_role server-side SOMENTE Worker
       +------------------------------------------+
```

## Decisões
- GitHub Pages hospeda frontend estático e código do editor, mas não armazena arquivos enviados nem valida senha. `/#/admin` é rota pública; somente operações autenticadas são protegidas.
- Dados de leitura em Supabase: `spaces` (nove IDs imutáveis), `space_published` (snapshot público), `space_drafts` (privado), `space_revisions` (histórico privado), `space_media` (referências públicas/pendentes), `publish_events` (auditoria mínima, sem dados infantis).
- Sem contas Supabase Auth para a estudante. Sessão administrada pelo Worker; credencial `SUPABASE_SERVICE_ROLE_KEY` guardada exclusivamente nele. O client público usa somente publishable key e tabelas RLS explicitamente públicas, com grants restritos.
- Dashboard admin obtém dados SOMENTE por Worker autenticado. No public SPA, nunca consultar draft nem credenciais.
- Storage: bucket público `csb-public-media` para objetos **aprovados**; bucket privado `csb-staging-media` para uploads temporários/rascunhos. Conteúdo não validado não deve se tornar público antes de publicar. Worker promove/copia para `public` no publish ou implementa outra estratégia segura documentada; remover órfãos periodicamente, respeitar referências existentes.
- Signed upload: Worker gera URL curta apenas depois de sessão validada e autorização, caminho com `spaceId/UUID.ext`; browser envia binário diretamente ao Supabase, depois Worker confirma extensão/MIME/tamanho e vincula mídia ao rascunho. Não confiar no Content-Type informado pelo browser.
- Publicação transacional no banco: implementar procedure/RPC server-side ou transação equivalente para atualizar snapshot e revisão atomically; Worker não faz múltiplos writes públicos semi-publicados. Backup da revisão anterior para rollback simples.
- Evitar XSS em HTML/Markdown: permitir conjunto restrito de formatação, renderizar texto como texto por padrão, sanitizar links e HTML aceitos. Não confiar no conteúdo do editor.
- Rotas hash: `/#/ambientes/{slug}` + `?recurso=texto|libras|audiodescricao` dentro do fragmento. Foco programático e scroll para seção mesmo com conteúdo carregado assincronamente.
- Atualização: `updated_at` e `revision` a cada publicação; ao navegar / novo refresh buscar snapshot atualizado (`no-store` ou revalidação curta, conforme estratégia). Mídia publicada recebe caminho com UUID/versão imutável para evitar cache velho. Não entregar progresso irreal: prévia instantânea, upload depende de arquivo, salvamento depende de API.

## Endpoints recomendados Worker (a implementar)
- `POST /admin/session` `{password}` -> sessão curta por cookie HttpOnly ou token assinado de curta duração em memória (escolha fundamentada sobre cookies 3rd-party).
- `GET /admin/session` -> estado autenticado; `DELETE /admin/session` -> logout/revogação server-side quando aplicável.
- `GET /admin/spaces` -> resumo de rascunhos; `GET /admin/spaces/:slug` -> draft + published.
- `PUT /admin/spaces/:slug/draft` -> validar schema/limites/version, salvar draft; controle de concorrência por revision.
- `POST /admin/uploads/authorize` -> valida auth, tipo, espaço, tamanho, gera URL assinada curta para bucket staging.
- `POST /admin/uploads/complete` -> verifica objeto real e associa ao draft.
- `POST /admin/spaces/:slug/publish` -> valida consistência, textos alt/legendas, promove mídia, publica transacionalmente.
- `POST /admin/spaces/:slug/unpublish-section` -> retirar conteúdo quando apropriado, mantendo histórico.
- `GET /health` -> sem divulgar secrets ou detalhes de usuários.

## Ambiente local/produção
Frontend: `API_BASE_URL` = Worker public URL, `SUPABASE_URL` = projeto, `SUPABASE_PUBLISHABLE_KEY` = chave pública. Configurar `GITHUB_BASE_HREF` para projeto ou domínio personalizado.
Worker secrets: `ADMIN_PASSWORD` (forte), `SESSION_SIGNING_KEY` (aleatório >=32 bytes), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; bindings de rate limit persistente. CORS allowlist `https://USUARIO.github.io` (origin não inclui path) + localhost portas explícitas para dev. Não confundir CORS com autenticação.

## Falhas possíveis
- Supabase indisponível: texto de indisponibilidade e tentar novamente, sem inventar conteúdo.
- Credenciais não configuradas: admin mostra mensagem de sistema ainda não configurado em DEV; em produção nunca expor detalhes de config ou secrets.
- Upload 50 MB+ no Free: bloquear antes e explicar; arquivo externo ou compressão para vídeos grandes.
- Conflito de edição: mostrar atualização mais recente e opção de revisar em vez de sobrescrever silenciosamente.
- Projeto free pausado/cotas: status operacional, documentação de recuperação/backups.
