# Cloudflare Worker (API administrativa)

Implementação e comandos atuais: [EXECUCAO.md](EXECUCAO.md). Decisões e limites: [DECISOES_IMPLEMENTACAO.md](DECISOES_IMPLEMENTACAO.md). Aplicar as migrações **0001, 0002, 0003, 0004 e 0005**, nessa ordem; usar `worker/wrangler.toml` implementado, com Durable Object.

1. Criar Worker na conta do responsável, com `wrangler` usando `worker/` como projeto lógico. Configurar domínio do Worker HTTPS e CORS apenas para **origin** do GitHub Pages e `http://localhost:<porta>` de dev.
2. Segredos, nunca no git: `ADMIN_PASSWORD`, `SESSION_SIGNING_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Usar `npx wrangler secret put ADMIN_PASSWORD` etc.; `worker/.dev.vars` local deve estar em `.gitignore`.
3. Login sem contas: Worker verifica senha forte, aplica rate-limit persistente, cria sessão curta segura (cookie HttpOnly se suportado no browser com frontend em outro domínio, ou token curto em memória do SPA com medidas de segurança). Não guardar senha em texto no código.
4. Todos os endpoints admin checam sessão, Origin, Content-Type, schema, limites e logam erros SEM segredos. A API pública pode consultar Supabase diretamente com RLS; não expor service_role.
5. Upload: Worker autoriza signed URL e o browser envia diretamente ao Storage; evitar streaming de arquivos grandes pelo Worker. Após upload, confirmar metadados e associar a rascunho. Implementar limpeza de objetos órfãos.
6. Testes de autenticação/negação/rate limit, publish atomicidade e CORS. Não publicar Worker com endpoints de gravação abertos.
7. Validar cotas atuais Free e monitorar consumo; Cloudflare Workers tem limites, não prometer ilimitado.

Docs:
- https://developers.cloudflare.com/workers/configuration/secrets/
- https://developers.cloudflare.com/workers/platform/limits/
