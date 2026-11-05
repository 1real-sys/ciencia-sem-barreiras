# Auditoria de segurança e proteção contra abuso — 05/11/2026 UTC

Escopo: revisão de código da aplicação/Worker/migrações, testes locais e verificações anônimas controladas no Supabase e Worker hospedados. Sem geração de carga em produção, sem exclusão de conteúdo, sem uso de senha ou chave privilegiada pelo auditor. Não é certificação, pentest independente ou garantia de ausência de falhas.

## Evidências executadas

| Verificação | Resultado |
|---|---|
| Vitest | 30 testes passaram, incluindo banco PostgreSQL local, RLS, RPCs, rascunhos, conflito de revisão, publicação, sessão, rotação/logout, arquivos e limites de entrada. |
| Tipos/lint | `npm run check` e `npm run lint` passaram. |
| Build | `npm run build -- --base-href /ciencia-sem-barreiras/` passou. |
| Navegador local | 13 cenários passaram com `CI=true npm run test:e2e`, usando Chromium do Playwright após instalação; a primeira tentativa não iniciou por ausência de `/usr/bin/google-chrome`. Inclui XSS renderizado como texto, isolamento de rascunho, publicação e logout com simulador. |
| Runtime Worker | `worker:check` e `worker:smoke` passaram. Durable Object real local, sessão, logout, bloqueio de tentativas e novo limitador nativo de leitura exercitados. O teste de rajada ocorre exclusivamente em localhost, sem consultas ao banco. |
| Serviços hospedados | `npm run security:cloud`: 28 verificações passaram. Sem sessão: editor, rascunho, publicar, retirar seção, restaurar e uploads bloqueados. Credenciais falsas e origins indevidos bloqueados. Tabelas privadas, PATCH e DELETE diretos bloqueados; tentativas usam ID inexistente. Respostas públicas têm apenas os campos esperados. |
| Dependências | `npm audit --omit=dev`: zero alertas. Auditoria completa: nove moderados transitivos em minimatch/ESLint/typescript-eslint; zero altos/críticos. A correção automática sugeria mudanças incompatíveis; não aplicada. |
| Bundle | Três JS compilados sem os marcadores `ADMIN_PASSWORD`, `SESSION_SIGNING_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_`. Verificação por padrões não substitui revisão de todos os dados sensíveis. |

O teste cloud usa PATCH não vazio: PostgREST pode retornar sucesso sem efeito para `{}` antes de avaliar uma gravação; esse atalho não comprova permissão de escrita.

## Reforços implementados

- Authorization exige formato Bearer com o comprimento/alfabeto do token emitido. Valores malformados são recusados antes de consultar o Durable Object.
- Respostas da API incluem `Referrer-Policy: no-referrer` e `X-Frame-Options: DENY`, além de `nosniff` e `no-store`. Esses headers não configuram o HTML hospedado no GitHub Pages.
- Rate Limiting nativo do Cloudflare antes de banco/sessão: leitura pública com alvo de 600 chamadas por IP/60 s; administração com alvo de 120 por IP/60 s. Excesso retorna 429 e `Retry-After: 60`. Usa `CF-Connecting-IP` fornecido pela borda, não `X-Forwarded-For` controlado pelo cliente.
- Continuam os limites persistentes de cinco tentativas de login/IP/10 min e cem mutações/sessão/10 min. Falha no serviço de limitação não libera acesso: retorna indisponibilidade.

## Limites importantes e pendências

1. **Não há blindagem DDoS completa.** O binding é executado dentro do Worker: mesmo rejeições podem consumir a franquia. Seus contadores são aproximados e por localização Cloudflare; não são teto global. IPs distribuídos podem contornar um limite por IP. OPTIONS, health, tráfego estático e arquivos diretos do Storage também têm caminhos/cotas próprios.
2. Para regras WAF/bots antes do Worker, preparar domínio próprio em uma zona Cloudflare, regras compatíveis com o plano e bloquear entradas alternativas `workers.dev`/preview depois de migrar e testar. O frontend continua SPA no GitHub Pages. Essa configuração de domínio/WAF não foi realizada. Não habilitar Cloudflare Access sobre a API pública inteira, pois bloquearia visitantes.
3. Os limites por IP são compartilhados por pessoas no mesmo Wi-Fi. Validar uma visita escolar antes de reduzir valores. Não foi executado teste de carga nem demonstrada capacidade para 1.000 req/s.
4. **Rotação da senha do painel pendente de confirmação:** um valor semelhante a senha foi enviado na conversa. Alterar `ADMIN_PASSWORD` diretamente no Cloudflare invalida sessões existentes. Não registrar a nova senha em chat, Git ou relatório.
5. Login/upload/publicação autenticados hospedados foram exercitados pelo responsável em etapas anteriores, mas não foram repetidos nesta auditoria com sua senha. Expiração efetiva/reuso das URLs assinadas no Storage real, codecs e arquivos maliciosos completos exigem validações adicionais. A assinatura binária não é antivírus.
6. Backup independente do banco **e** mídias, restauração testada, monitoramento/alertas de disponibilidade e cotas ainda não configurados. Histórico no mesmo projeto não substitui backup.
7. MFA/recuperação das contas Supabase, Cloudflare e GitHub, permissões de colaboradores e políticas da organização não foram auditadas. A senha compartilhada não permite atribuir ações a pessoas individuais.
8. HTML/JS do frontend e mídias publicadas são públicos por projeto. Segurança protege mutações e rascunhos; não impede copiar código público ou baixar mídias publicadas. Desabilitar uma seção não torna privadas URLs públicas de mídia já distribuídas.
9. Dependência externa VLibras e ausência de CSP integral no HTML Pages permanecem superfícies a revisar. Não foi inserida política CSP restritiva sem testar seus domínios e a acessibilidade com rede real.

Referências: [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/), [limites Workers](https://developers.cloudflare.com/workers/platform/limits/), [regras de produção e domínio próprio](https://www.cloudflare.com/connect/2026/session/automating-app-development-the-secure-way-velocity-meets-defense-in-depth/), [backups Supabase](https://supabase.com/docs/guides/platform/backups).
