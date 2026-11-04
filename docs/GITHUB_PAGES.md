# GitHub Pages — apenas frontend, não os uploads

Implementação e comandos atuais: [EXECUCAO.md](EXECUCAO.md). Decisões e limites: [DECISOES_IMPLEMENTACAO.md](DECISOES_IMPLEMENTACAO.md). Aplicar as migrações **0001, 0002 e 0003**, nessa ordem; usar `worker/wrangler.toml` implementado, com Durable Object.

A V4 mantém hospedagem gratuita no GitHub Pages **somente da aplicação Angular estática**. A publicação dos conteúdos ocorre no Supabase por meio do painel; **nenhuma edição de texto/foto/áudio/vídeo exige git commit**.

Regras:
- Angular build estático, sem SSR, router `withHashLocation()`.
- Site em repositório de projeto: `--base-href /NOME-REPO/`; em domínio dedicado/site raíz: `--base-href /`. Não hardcodar nome de repo.
- GitHub Actions deploy do diretório correto, geralmente `dist/<app>/browser` dependendo do builder; detectar saída real.
- `.nojekyll` no artefato se adequado; artefatos Pages não incluem secrets Supabase privileged.
- `API_BASE_URL`, `SUPABASE_URL` e chave **pública** podem aparecer em JS; service_role e senha JAMAIS.
- Se public frontend mudar: novo deploy via GitHub; se sua amiga apenas atualizar conteúdo no painel: update no Supabase e refresh pública sem deploy.
- Revisar limites do GitHub Pages e CORS do Worker antes de publicação.
- QR Codes devem usar URL definitiva `https://DONO.github.io/REPO/#/ambientes/{slug}` e opcionalmente `?recurso=` dentro do hash.

## Workflow ativo

Use `.github/workflows/deploy-pages.yml`, que verifica o projeto e exige a configuração real antes de publicar. O modelo antigo foi preservado em `deploy.yml.disabled` para evitar dois deploys concorrentes e publicação com a API localhost.
