# Aceite V4 — evidências locais de 04/11/2026

## Atualização: leitor de PDF com foco no texto — 06/11/2026

- Leitor nativo em iframe substituído por PDF.js 6.5.438: página ajustada à largura, canvas e camada de texto selecionável, sem barra do navegador, miniaturas, download, impressão ou menu de três pontos. Retirados a mensagem “Se o leitor...” e o rodapé de download. Único controle de leitura é Fechar, compacto e com alvo de toque mínimo de 44px. Celular usa tela inteira; desktop, até 1280px e 96dvh. Esc, Voltar e retorno do foco preservados.
- Código e CSS do PDF.js carregados sob demanda; worker, renderer, fontes, CMaps, WASM e imagens locais copiados pelo build para `pdfjs/`. Sem CDN/leitor externo. XFA e anotações/formulários interativos não habilitados; não há scripting manager. Renderização usa fila de páginas visíveis, limite de canvas e liberação do documento/worker ao fechar. O formato/layout do arquivo original é preservado.
- Tipos, lint, build com base `/ciencia-sem-barreiras/`, **60 testes unitários e 15 cenários Playwright aprovados**. Browser verifica canvas/texto renderizados, largura do documento em 320/390/1440px, ausência de iframe/controles removidos, falha HTTP do arquivo seguida de Tentar novamente com sucesso, axe-core e navegação Voltar/Avançar. Teste do artefato compilado também abre o PDF e confere worker/CSS no subdiretório do Pages. Capturas `test-results/pdf-popup-{320,390,1440}.png`.
- Revisão local adicional com `imagens/test.pdf`, fornecido pelo responsável: 11 páginas, visualização em 390 e 1440px; captura móvel revisada visualmente (`test-results/pdf-provided-390.png`). Arquivo usado somente em interceptação de rede no navegador de teste, sem upload/publicação e sem inclusão do PDF no commit.
- Build inicial: aproximadamente 282 kB bruto / 78 kB estimados em transferência; módulos PDF.js (aproximadamente 450+173 kB brutos) e CSS do leitor são posteriores ao clique. `npm audit --omit=dev`: zero vulnerabilidades. Mantém-se o aviso de CommonJS de `qrcode`. A primeira instalação/auditoria sem rede falhou por DNS do sandbox; repetidas com acesso autorizado.
- Não foi feita validação em aparelho físico ou revisão humana com leitor de tela. PDFs escaneados e estrutura de leitura dependem do documento de origem; a camada textual não é OCR. Deploy Pages será acionado após push; nenhum deploy de Worker/migração foi necessário nesta mudança.

## Atualização: Voltar fecha o PDF — 06/11/2026

- O popup registra uma entrada temporária no histórico, sem mudar a URL. Voltar fecha primeiro o PDF, preservando o ambiente; o próximo Voltar segue a navegação anterior. Fechar por botão, Esc ou área externa também remove a entrada temporária. Enquanto a remoção está em andamento, o acionador aguarda a conclusão; depois recebe novamente o foco. Avançar reabre o popup enquanto seu componente permanece na página.
- Tipos, lint, build com base `/ciencia-sem-barreiras/` e **15 cenários Playwright aprovados**. Histórico Voltar exercitado em 320 e 390 px, ambiente/URL preservados, retorno de foco, Avançar, segundo Voltar para a listagem e reabertura subsequente conferidos. O teste também cobre fechamento por botão e Esc sem deixar entrada extra no histórico. A primeira execução detectou perda de foco ao desabilitar temporariamente o botão; o retorno agora acontece após renderizar a conclusão da limpeza.
- Automação em Chromium com viewport móvel, sem aparelho Android/iPhone físico. Gestos/botão de sistema e leitores PDF móveis continuam exigindo conferência em dispositivo real.

## Atualização: PDF de Texto em popup — 06/11/2026

- PDFs de “Vamos conhecer este ambiente?” abrem em diálogo modal dentro da página, também no editor e na prévia. Leitor nativo do navegador em iframe com título, botão Fechar PDF, fechamento por Esc/área externa e retorno do foco ao acionador. Fonte descarregada ao fechar; fundo sem rolagem enquanto o popup está aberto.
- URLs de recurso validadas como HTTPS (HTTP somente em loopback para QA) antes de criar o recurso confiável Angular. A origem do PDF continua sendo o upload validado pelo Worker. Download opcional por blob, sem navegação/nova aba, com mensagem de erro recuperável; depende de CORS da mídia. A visualização embutida depende do leitor PDF do navegador; baixar é a alternativa oferecida no popup.
- Tipos, lint e build com base `/ciencia-sem-barreiras/` aprovados. **15 cenários Playwright passaram**, com abertura do modal, foco inicial no botão Fechar, iframe com título e URL do PDF, nenhuma página/aba adicional, URL principal preservada, Esc, botão Fechar, foco restituído, bytes do download conferidos e axe-core sem violações no modal. Layout validado em 320/390/1440 px; captura `test-results/pdf-popup-1440.png` revisada visualmente com PDF renderizado no leitor. API simulada, sem comprovação de comportamento em todos os leitores PDF móveis ou revisão manual com leitor de tela.

## Atualização: Audiodescrição em áudio e retirada do WebVTT — 06/11/2026

- Audiodescrição aceita apenas MP3, AAC, WAV, WMA, M4A, OGG/Opus e FLAC. Painel sem campo de vídeo/endereço externo/pôster nessa seção; público com player de áudio, transcrição e link para abrir/baixar. Sem autoplay. Formatos sem suporte no navegador dependem de aplicativo externo; não há conversão automática.
- Removidos o painel de upload e o seletor WebVTT; novos uploads de legenda são negados. Legendas existentes de Libras permanecem preservadas internamente. Vídeos antigos de audiodescrição não aparecem como áudio no público; o painel orienta substituir por áudio ou desativar. Não foram apagados arquivos existentes.
- Migração `0005_audio_description.sql` testada duas vezes no PGlite: novo tipo interno `audiodescricao_audio`, novos MIME sem duplicação, dados/RLS/privacidade do staging preservados. Responsável confirmou aplicação com sucesso no Supabase hospedado nesta conversa.
- `npm run check`, `npm run lint`, `npm test` (**60 testes**), build com base `/ciencia-sem-barreiras/`, `worker:check` e `worker:smoke` aprovados. Testes de arquivos reais gerados por FFmpeg: sete formatos de silêncio aceitos; MP4/WMV com vídeo rejeitados ao declarar MIME de áudio; confirmação com respostas Range 206 exercitada para M4A/WMA válidos e falsificados. Publicação testa MIME derivado do servidor, remoção de referências a pôster/legenda no áudio, rejeição de vídeo legado habilitado e publicação após desativá-lo.
- **15 cenários Playwright passaram**: sete formatos enviados, aliases MIME de WAV/WMA normalizados, vídeo recusado no seletor, rascunho privado, publicação e refresh, sete players sem vídeo/autoplay, WAV carregado e pausado, link do arquivo com MIME correto, transcrição acessível, WebVTT ausente e axe-core sem violações nesse cenário. Reflow adicional de audiodescrição em 320/390/1440 px. As demais verificações existentes de responsividade, PDFs, fotos e QR continuaram passando. API simulada; upload/publicação autenticados no serviço hospedado não foram realizados nesta execução.
- Validação limitada a formatos e metadados, sem decodificação completa ou antivírus. Leituras de metadados M4A/ASF limitadas a 2 MiB, até 64 caixas MP4 e identificação dos streams iniciais Ogg em até 64 KiB; formatos incomuns além desses limites são recusados. Limitações e referências técnicas em `EXECUCAO.md`.
- Worker publicado na versão `de9ccfe0-d4da-4929-be60-d7d5dd603fac`. Smoke cloud após deploy passou: leitura pública disponível e leituras privadas, mutações/RPC e upload anônimos negados. A confirmação da migração hospedada foi do responsável; não foi feito upload autenticado de áudio na nuvem nesta execução.

## Atualização: ordem dos recursos e título — 06/11/2026

- Navegação e seções públicas na ordem Texto, Fotos, Libras, Audiodescrição e Atividades, também refletida nas seções correspondentes do editor. Título “Vídeo com audiodescrição” reduzido para “Audiodescrição” no site, prévia e painel.
- Tipos, lint e build com base `/ciencia-sem-barreiras/` aprovados. Os 14 cenários Playwright passaram, incluindo conferência da ordem dos links/seções e do título nos nove ambientes, além dos fluxos de PDFs e múltiplas fotos. Validação local com simulador; deploy Pages ainda depende do workflow após o push.

## Atualização: PDFs e seleção de várias fotos — 06/11/2026

- Texto agora aceita PDFs além dos blocos do editor; nova seção/atalho Atividades recebe PDFs. Links públicos identificam o formato e a abertura em nova aba. PDF com título e crédito, substituição, remoção, exibição por arquivo, prévia privada e publicação pelo mesmo fluxo de mídia. Desabilitar Texto também retira seus PDFs da publicação; Atividades é independente. Não foram criados jogos.
- Fotos já permitia vários envios sucessivos; agora também permite selecionar várias fotos juntas. Uploads sequenciais preservam o progresso e os arquivos recebidos se houver falha parcial. Limites: 50 MB por arquivo e 40 mídias totais por ambiente.
- Migração `0004_pdf_documents.sql` adiciona os tipos de documentos ao constraint de mídias e PDF ao MIME permitido dos dois buckets. Testada duas vezes no PGlite, sem duplicar MIME, preservando RLS, formatos existentes e staging privado. Responsável confirmou execução com sucesso no Supabase hospedado nesta conversa.
- `npm run check`, `npm run lint`, `npm test` (**36 testes**), build com base `/ciencia-sem-barreiras/`, `worker:check` e `worker:smoke` aprovados. Os testes cobrem PDF autorizado, MIME incorreto, falso PDF, limite de tamanho e promoção de PDFs antes da publicação atômica.
- **14 cenários Playwright aprovados** com Chromium local: upload dos dois PDFs, rascunho invisível ao visitante, publicação e refresh, resposta PDF com bytes conferidos, substituição com URL nova, retirada do PDF de Texto sem afetar Atividades, duas fotos numa seleção e axe-core. A suíte também preservou as verificações existentes de responsividade, teclado, QR, galerias, login e isolamento de rascunho. API simulada nesses cenários; não foi realizado upload autenticado no serviço hospedado.
- O smoke inicial falhou porque as 6.500 requisições sequenciais não atingiram o limite nativo de 6.000 dentro da janela de um minuto. O teste agora usa configuração temporária com limite 20, faz até 40 sondagens e passou. A configuração de produção permanece 6.000/minuto; login, sessão, logout, revogação, limite persistente e CORS também passaram.
- PDF recebe validação de MIME, tamanho e cabeçalho de formato no Worker. Não é análise completa ou antivírus; acessibilidade do documento exige revisão editorial. A aplicação disponibiliza links e não injeta conteúdo PDF no HTML.
- Worker publicado na versão `ac7a8685-fc09-492d-b9ea-858e28e1fb1c`. Smoke cloud repetido após deploy: API pública disponível, acesso a rascunhos/histórico, mutações e upload anônimos negados. Não utiliza senha nem comprova upload/publicação autenticados de PDF em produção.

## Atualização: retirada da seção de áudio de 06/11/2026

- A pedido do responsável, removidos “Ouça o conteúdo” e o atalho “Áudio” da apresentação dos ambientes. “Vídeo com audiodescrição” e Libras continuam disponíveis. Registros de mídia existentes não foram apagados.
- `npm run check`, `npm run lint`, `npm test` (30 testes) e build com base `/ciencia-sem-barreiras/` aprovados. Os 13 cenários Playwright passaram com o Chromium local indicado abaixo, incluindo verificação nos nove ambientes de ausência da seção/atalho de áudio e permanência do título de vídeo com audiodescrição. Validação local com API simulada; deploy hospedado não verificado nesta execução.

## Atualização: capas fotográficas de 06/11/2026

- Sete JPEGs fornecidos em `imagens/` associados pelo nome aos ambientes na home, listagem e dashboard administrativo; origem e mapeamento registrados em `imagens/README.md`. Fotos identificadas como “Fotografia”, sem filtro de cor; os dois ambientes sem foto mantêm as ilustrações. Os originais foram preservados.
- `npm run check`, `npm run lint` e `npm test`: aprovados, **30 testes unitários**. Build com `npm run build -- --base-href /ciencia-sem-barreiras/` aprovado; permanece o aviso conhecido de CommonJS de `qrcode`.
- **13 cenários Playwright aprovados**, incluindo carregamento real das nove capas no build sob subdiretório, mapeamento dos sete JPEGs, rótulos e ausência de filtro; dashboard com sete fotografias e Mata Atlântica 1/2 independentes. Responsividade em 320/360/375/390/414/768/1024/1440 px, axe-core, teclado, QR e fluxo local de edição/publicação continuaram aprovados. Captura desktop revisada visualmente.
- Ambiente desta execução: o sandbox bloqueou a abertura das portas locais e `/usr/bin/google-chrome` não existe. Testes executados fora do sandbox com o Chromium já instalado: `CHROME_BIN=/home/jlm1real/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome npm run test:e2e`.
- Verificação feita localmente com API simulada; não constitui validação de publicação autenticada no Supabase nem revisão humana com leitor de tela.

Auditoria posterior: [segurança, testes e limites da proteção contra abuso](AUDITORIA_SEGURANCA.md). Inclui 30 testes unitários, 13 cenários de navegador, 28 verificações cloud e limitadores nativos no Worker; não representa garantia contra DDoS nem substitui backup.

A aplicação foi implementada e validada localmente. O registro inicial abaixo antecede a ativação cloud descrita nesta atualização. Os testes com simulador não equivalem a validação de Supabase/Cloudflare/GitHub em produção.

## Atualização: ativação Supabase e Cloudflare

- Responsável confirmou execução das três migrações, nove ambientes e dois buckets (staging privado, publicado público) no Supabase hospedado.
- Worker publicado em `https://ciencia-sem-barreiras-admin.cauan-anna.workers.dev`, com Durable Object e cron. Os quatro nomes de secrets foram confirmados pela CLI; valores não foram lidos. CORS inclui `https://1real-sys.github.io`.
- `cloud-smoke.mjs` executado contra serviços reais com chave pública: acesso administrativo sem sessão, leitura de rascunhos/histórico, escrita anônima, RPC e upload anônimo negados; leitura pública retornou HTTP 200, `null` (sem conteúdo publicado) e `Cache-Control: no-store`.
- Storage retornou HTTP 400 com payload `statusCode: 403`, `code: AccessDenied` e mensagem RLS. O smoke aceita essa combinação específica, mantendo rejeição de erros 400 genéricos.
- Correção após tentativa real de imagem: `/admin/uploads/authorize` retornava 503 porque a validação exigia `data` não nulo em mutações PostgREST, que retornam `data: null` por padrão. Autorização, confirmação e exclusão de registros órfãos agora conferem o erro da gravação. Regressão cobre autorização e confirmação com resposta mínima bem-sucedida e erro real, sem aceitar falha de persistência; 22 testes, tipos e lint passaram. Novo teste de upload no navegador hospedado ainda pendente.
- GitHub Pages publicado: execução `41940598929` do commit `25faecd` concluiu build e deploy com sucesso, incluindo testes de navegador. `https://1real-sys.github.io/ciencia-sem-barreiras/` e `config.json` responderam HTTP 200; baseHref, URL do Worker, URL Supabase, chave pública e URL pública final conferidos no artefato servido. Workflow usa `PAGES_BASE_HREF` porque o prefixo `GITHUB_` é reservado para variáveis do GitHub.
- Permanecem pendentes: login real com a senha escolhida, salvar/publicar e upload autenticado, validação de expiração das URLs assinadas. O smoke não comprova esses fluxos.

As pendências cloud do registro inicial abaixo devem ser interpretadas à luz desta atualização.

## Métricas e otimização de consultas do Worker

- GraphQL Analytics real, janela 2026-11-04 00:40 a 2026-11-05 00:40 UTC: 109 requests, 168 subrequests e zero erros de execução; CPU P50 3,005 ms / P99 19,084 ms, wall time P50 140,281 ms / P99 1.816,393 ms. Unidades em microssegundos confirmadas por introspecção do schema. Zero erros de execução não significa zero respostas HTTP de erro tratadas pela aplicação.
- Consulta pública passou de duas chamadas sequenciais para uma consulta com relação `spaces!inner(slug)`, retornando os mesmos campos públicos. Consultas independentes do dashboard e do editor agora são paralelas. Conteúdo segue `no-store`.
- Quatro leituras reais do mesmo endpoint público antes: 507/493/819/491 ms; depois: 884/297/270/292 ms. Mediana aproximada 500 → 295 ms (41% menor), mas a primeira leitura posterior foi mais lenta. Amostra pequena, de um único cliente, sem carga: não comprova ganho global nem latência máxima.
- 25 testes, tipos e lint passaram; smoke cloud de proteção e leitura pública repetido após deploy. Upload/publicação e sessão mantêm os mesmos controles. Dashboard/editor otimizados ainda requerem comparação manual de tempo autenticado.

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
