# API Cloudflare Worker V4

Código em `src/index.ts`; config em `wrangler.toml`. A configuração de exemplo antiga é referência inicial; use o arquivo implementado com o binding `GUARD` e migração SQLite.

Na raiz do projeto:

```bash
npm run worker:check
npm run worker:smoke
npm run worker:dev
```

`worker:dev` requer `worker/.dev.vars` para operações de dados. Health e smoke de autenticação não precisam de contas hospedadas.

Todos os passos de secrets, deploy, CORS, migrações e operação estão em [EXECUCAO](../docs/EXECUCAO.md). Tradeoffs de sessão, URLs assinadas e publicação em [DECISOES_IMPLEMENTACAO](../docs/DECISOES_IMPLEMENTACAO.md).

Endpoints implementados: health; leitura pública por slug; sessão POST/GET/DELETE; dashboard; draft GET/PUT; publish; restore; unpublish-section; uploads authorize/complete. Todos os endpoints admin validam Origin exato e, salvo login, token opaco com expiração e revogação no Durable Object. Não registrar bodies, senha ou token em logs. Nunca colocar service role em `vars` públicas ou no Angular.
