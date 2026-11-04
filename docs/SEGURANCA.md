# Segurança obrigatória — senha única sem cadastro

Implementação e comandos atuais: [EXECUCAO.md](EXECUCAO.md). Decisões e limites: [DECISOES_IMPLEMENTACAO.md](DECISOES_IMPLEMENTACAO.md). Aplicar as migrações **0001, 0002 e 0003**, nessa ordem; usar `worker/wrangler.toml` implementado, com Durable Object.

**A escolha de senha compartilhada dispensa registro de usuário, NÃO dispensa proteção do backend.** A URL do painel pode ser conhecida por qualquer pessoa; dados publicados são públicos, mas edição precisa autenticação real.

## Regras para Codex
- Nunca `if(password === "2207")` no Angular. O exemplo `2207` serve só para demonstrar UX, não é recomendável como senha real. Criar senha aleatória longa (preferência >=16 caracteres), gravada no Cloudflare Worker Secret `ADMIN_PASSWORD`; pode armazenar/verificar hash server-side se conveniente, mas não deixar senha no repositório. HTTPS obrigatório.
- Comparação em tempo constante quando adequado; erros genéricos; logs NÃO contêm senha/token. Limitação persistente de tentativas por IP e sessão (usar binding apropriado: rate limiter/DO/KV com atenção a consistência, e opção Turnstile se necessário). Não confiar em contador em memória global do Worker.
- Cookie de sessão assinado, expirando em poucas horas, `HttpOnly`, `Secure`, proteção de CSRF e Origin. Como Pages e workers.dev possuem sites distintos, verificar bloqueio de cookies terceiros; se usar cookie cross-site `SameSite=None`, conferir `credentials:include`, CORS allowlist sem wildcard e risco de bloqueio de navegador. Alternativa recomendada se necessário: token de curta duração **em memória** do SPA via `Authorization`, renovação após senha, jamais localStorage; proteger contra XSS e documentar tradeoff.
- Segredos: `SUPABASE_SERVICE_ROLE_KEY` exclusivamente Worker; chave pública do Supabase só pode consultar dados aprovados. Restrição `GRANT` e RLS no banco. Nada de políticas anônimas de INSERT/UPDATE/DELETE nem upload anônimo.
- Worker valida cada caminho, espaço permitido, tamanho, MIME, nome seguro e extensão; URL assinada de upload expira rapidamente e é vinculada ao caminho aleatório. Após upload confirmar metadados do objeto, e idealmente assinatura binária, antes de publicar. Nunca injetar HTML/SVG arbitrário no site.
- Buckets de draft privados e published públicos. Vídeos/áudios públicos são acessíveis por visitantes mesmo se não listados; documentos com dados pessoais nunca armazenar publicamente.
- Rate limits de login, upload, publish. Auditoria mínima sem identificador de crianças, back-up de rascunhos, histórico de revisão, revogação/rotação de senha e chave de sessão.
- Publicação deve ser atômica e idempotente; falhas intermediárias não deixam texto aprovado apontando para objetos inexistentes.
- Retenção: limpar objetos de rascunho órfãos após período documentado. Não apagar objeto publicado ainda referenciado.

## Casos que DEVEM falhar em testes
1. Visitante sem sessão tenta `/admin/spaces` => 401.
2. POST publish sem sessão => 401/403, sem mudança.
3. Senha errada repetida => bloqueio temporário persistente.
4. Frontend com publishable key tenta escrever diretamente em tabelas e storage => negado.
5. Upload acima do limite ou tipo HTML/SVG executável => rejeitado.
6. URL assinada expirada => rejeitada.
7. Requisição cross-origin não permitida => não aceita para mutação; preflight correto.
8. Texto com tags maliciosas => não executa JS, renderização sanitizada.
9. Rascunho não aparece em API pública.
10. Revogação/rotação da senha exige nova autenticação conforme configuração de sessão.
