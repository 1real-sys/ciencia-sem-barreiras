# Aceite V4 — evidências locais de 04/11/2026

A aplicação foi implementada e validada localmente. O registro inicial abaixo antecede a ativação cloud descrita nesta atualização. Os testes com simulador não equivalem a validação de Supabase/Cloudflare/GitHub em produção.

## Atualização: ativação Supabase e Cloudflare

- Responsável confirmou execução das três migrações, nove ambientes e dois buckets (staging privado, publicado público) no Supabase hospedado.
- Worker publicado em `https://ciencia-sem-barreiras-admin.cauan-anna.workers.dev`, com Durable Object e cron. Os quatro nomes de secrets foram confirmados pela CLI; valores não foram lidos. CORS inclui `https://1real-sys.github.io`.
- `cloud-smoke.mjs` executado contra serviços reais com chave pública: acesso administrativo sem sessão, leitura de rascunhos/histórico, escrita anônima, RPC e upload anônimo negados; leitura pública retornou HTTP 200, `null` (sem conteúdo publicado) e `Cache-Control: no-store`.
- Storage retornou HTTP 400 com payload `statusCode: 403`, `code: AccessDenied` e mensagem RLS. O smoke aceita essa combinação específica, mantendo rejeição de erros 400 genéricos.
- Permanecem pendentes: configuração/deploy GitHub Pages, login real com a senha escolhida, salvar/publicar e upload autenticado, validação de expiração das URLs assinadas. O smoke não comprova esses fluxos.

As pendências cloud do registro inicial abaixo devem ser interpretadas à luz desta atualização.

## Correção confirmada: Mata Atlântica 1 e 2

São nove ambientes. O diorama existente agora se chama **Diorama da Mata Atlântica 1**, mantendo o slug `diorama-mata-atlantica`. O segundo usa `diorama-mata-atlantica-2`, com página, editor, mídias e QR independentes. A migração `0003_mata_atlantica_2.sql` preserva ID e conteúdo do primeiro; o teste aplica a correção duas vezes e verifica ausência de duplicação e manutenção do rascunho. A aplicação no Supabase hospedado continua pendente de credenciais.

## Implementação entregue

- [x] Angular 22 standalone/strict, signals, Tailwind 4, roteamento hash, build estático.
- [x] Home verde-água/azul com ilustração original e nove ilustrações distintas identificadas; versões mobile e desktop sem scroll horizontal nas verificações executadas.
- [x] Nove ambientes oficiais com slugs fixos; home, listagem, sobre e painel. Texto institucional e rodapé preservados literalmente.
- [x] Componentes de texto, galeria, Libras, vídeo de audiodescrição, áudio, pôster, legendas e transcrições; ausência exibe `Conteúdo em preparação`, sem player fictício ou autoplay.
- [x] VLibras oficial integrado uma vez nas páginas públicas; falha de rede não impede leitura. Verificação humana da tradução e comportamento remoto continua pendente.
- [x] Login validado no Worker, token somente em memória, sessão opaca de uma hora no Durable Object, logout, expiração, revogação por rotação e limites persistentes. Sem PIN fixo no frontend.
- [x] Dashboard de nove espaços; editor visual de blocos com títulos, parágrafos, listas, negrito e links HTTPS, sem exigir Markdown/JSON/Git; prévia móvel privada.
- [x] Salvar rascunho, publicar, desabilitar seções sem apagar mídia, recuperar histórico e rejeitar conflitos de revisão. Reconsulta após persistir e sucesso somente depois da resposta da API.
- [x] Upload direto assinado ao staging privado, progresso real de XHR, substituição/remoção com confirmação, metadados, direitos de uso, transcrições, VTT e URL externa de host autorizado.
- [x] Worker valida lista de slugs, schema, limite de JSON, tipos, tamanho e assinatura de arquivos; sem escrita pública ou renderização de HTML arbitrário.
- [x] Migrações com RLS, buckets privado/público, publicação transacional, histórico e eventos. Promoção de mídia antes de trocar snapshot. Limpeza diária de órfãos sem referências.
- [x] QR geral/texto/Libras/audiodescrição, foco por parâmetro, download PNG/SVG, URL completa, cópia e impressão com legenda. Geração bloqueada enquanto falta endereço final.
- [x] GitHub Actions e `.nojekyll`; baseHref configurável; artefato compilado servido sob subdiretório em teste real de navegador.
- [x] Simulador local persistente disponível para uso sem contas externas; isolado do Worker de produção.

## Comandos executados e resultados

| Verificação | Evidência |
|---|---|
| Runtime | Node 26.11.1, npm 11.20.0 |
| Stack | Angular 22.2.4, CLI/build 22.2.5, TypeScript 6.0.3, Tailwind 4.3.4 |
| `npm run check` | Frontend e Worker passaram na verificação TypeScript estrita. |
| `npm run lint` | Passou, sem erros. |
| `npm test` | **20 testes passaram** em dois arquivos; Vitest 4.1.12. |
| PostgreSQL local | PGlite 0.5.15 aplicou 0001+0002+0003; nove seeds, staging privado, leitura pública permitida, leitura privada/escrita/RPC anônimas negadas, conflito e publicação transacional verificados. Storage real não é emulado por esse teste. |
| `npm run test:e2e` | **13 cenários passaram**, Playwright 1.64.1 com Chrome local. Frontend real + simulador de API em portas isoladas (14200/18787), sem reutilizar a senha de servidores já abertos, e um cenário do build compilado. |
| Responsividade | Home: 320/360/375/390/414/768/1024/1440 px. Editor: 320/360/390/414/768/1024/1440 px. Sem overflow horizontal nas verificações. |
| Acessibilidade automatizada | axe-core: nenhuma violação nos escopos auditados (home 390 e 1440, página pública, login e editor). Teclado: skip link, foco no conteúdo, QR, formulários e fluxo de edição exercitados pelo Playwright. |
| Edição/publicação E2E | Senha inválida, entrada, nove cards, rascunho invisível ao público, imagem enviada com progresso, substituição com URL nova e metadados preservados, publicação e refresh sem rebuild, XSS como texto literal, retirada de texto, recuperação e logout. |
| QR | PNG com assinatura correta e SVG real baixados pelo navegador; destino com query dentro do hash; foco/reabertura de páginas dos nove ambientes. |
| Falhas de rede | Página apresenta mensagem de erro e Tentar novamente. |
| `npm run build -- --base-href /ciencia-sem-barreiras/` | Passou. Saída: `dist/ciencia-sem-barreiras/browser`; carregamento inicial aproximadamente 269 kB bruto / 75 kB estimados em transferência; admin sob demanda. |
| Build Pages em navegador | Servidor estático temporário leu o baseHref do artefato; imagens/assets carregaram e rota hash com recurso reabriu após refresh. |
| `npm run worker:check` | Wrangler 4.157.0 empacotou sem deploy; binding GUARD reconhecido. |
| `npm run worker:smoke` | Runtime Cloudflare local + Durable Object real: login, sessão, logout, revogação, limite persistente e CORS passaram; secrets efêmeros, sem banco hospedado. |
| Segurança adicional | Upload sem sessão, tipo/tamanho inválido, confirmação vencida, binário SVG declarado PNG, origem indevida, senha fraca e rotação rejeitados em testes. Publicação com legenda/pôster preserva IDs privados e resolve URLs públicas; falha na promoção impede RPC. |
| Bundle | Busca nos JS/config compilados não encontrou `ADMIN_PASSWORD`, `SESSION_SIGNING_KEY`, `SUPABASE_SERVICE_ROLE_KEY` ou `service_role`. |
| Dependências | `npm audit --omit=dev`: zero vulnerabilidades; auditoria completa registrou 10 alertas moderados transitivos nas ferramentas de lint (`minimatch` e dependentes). Sem aplicação de downgrade/force automático. |

O build informa que `qrcode` usa CommonJS; a biblioteca fica no chunk administrativo. Não bloqueia a compilação.

Evidências geradas: `test-results/home-{largura}.png`, `test-results/admin-390.png`, relatório `playwright-report/index.html`. Artefatos de teste são locais/ignorados pelo Git; CI faz upload do relatório e resultados. Os SVGs locais são documentados em `public/ILUSTRACOES.md`.

## Etapas que exigem credenciais externas

- [ ] Criar/selecionar projeto Supabase; aplicar 0001, 0002 e 0003 no serviço real; conferir políticas existentes e limites/cotas.
- [ ] Configurar secrets do Worker e ALLOWED_ORIGINS do domínio final; publicar Worker com o Durable Object e cron.
- [ ] Executar `npm run cloud:smoke` com chave pública, URL da API e origin reais; confirmar RLS/Storage reais e expiração efetiva de URLs assinadas.
- [ ] Fazer fluxo de publicação real de texto, imagem, áudio, Libras, audiodescrição, legenda e pôster, com substituição e revisão em segunda janela.
- [ ] Associar repositório remoto GitHub, cadastrar variáveis, habilitar Pages/Actions e conferir URL HTTPS final. O repositório local usa a branch `main` e o remoto SSH `git@github.com:1real-sys/ciencia-sem-barreiras.git`. O envio do código foi autorizado; a publicação hospedada depende das variáveis e serviços descritos neste checklist.
- [ ] Configurar PUBLIC_BASE_URL e validar QR em dois celulares antes da impressão definitiva.

Comandos e variáveis em [EXECUCAO.md](EXECUCAO.md). Essas pendências não são componentes ausentes; são ativação e validação em serviços de terceiros.

## Pendências humanas e editoriais

- [ ] Revisão com NVDA/VoiceOver/TalkBack, teclado por pessoa, zoom/reflow 200% e usuários do público-alvo. Automação não comprova conformidade WCAG 2.2 AA completa.
- [ ] Validar VLibras com rede real e avaliar a tradução; widget não substitui vídeo humano em Libras.
- [ ] Fornecer e aprovar textos científicos, fotografias autorizadas, gravações, traduções, audiodescrições, transcrições e legendas. Os ambientes nascem vazios; nada disso foi inventado.
- [ ] Confirmar quantidade de QR e autorização institucional para instalação física.
- [ ] Definir backup externo, retenção de histórico e monitoramento de quota antes de operação pública.

Validades e tradeoffs estão em [DECISOES_IMPLEMENTACAO.md](DECISOES_IMPLEMENTACAO.md): capability de upload do SDK dura duas horas, confirmação dez minutos, prévias trinta minutos, sessão uma hora. Não foi alegada instalação física, atualização offline, custo ilimitado ou deploy concluído.
