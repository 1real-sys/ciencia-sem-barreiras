# Executar e operar a implementação V4

## Desenvolvimento sem contas externas

Requisitos: Node compatível com Angular 22 (usado nesta implementação: 26.11.1), npm e Chrome. Dependências travadas em `package-lock.json`.

```bash
npm ci
npm start
```

Em outro terminal, escolha uma senha **local de teste** de pelo menos 16 caracteres e inicie o simulador:

```bash
read -rs -p 'Senha local de teste: ' DEMO_PASSWORD
export DEMO_PASSWORD
npm run demo
```

Abra `http://localhost:4200/` e `http://localhost:4200/#/admin`. O painel usa a senha escolhida acima, validada pelo servidor local. `public/config.json` aponta inicialmente para `http://localhost:8787`.

O simulador `scripts/demo-api.mjs` escuta exclusivamente em loopback. Persiste em `/tmp/csb-v4-demo/state.json` e guarda arquivos nessa pasta; não inclui conteúdo fictício inicialmente. **É um test double de desenvolvimento, não é o Worker de produção.** Não o publique. Sua validação de arquivos é simplificada; os testes unitários e o smoke do Worker cobrem a fronteira real de segurança separadamente. Os testes E2E usam uma pasta temporária própria e senha de teste exclusiva; não afetam a demonstração.

O site e o painel não guardam senha ou token no armazenamento do navegador. Recarregar o painel exige nova entrada.

## Verificações

```bash
npm run check
npm run lint
npm test
npm run build
npm run test:e2e
npm run worker:check
npm run worker:smoke
```

`npm test` executa Vitest, incluindo PostgreSQL local via PGlite: aplica as quatro migrações, cria roles de teste e verifica permissões e transações. O teste remove apenas a instrução de extensão `pgcrypto`, pois `gen_random_uuid()` já faz parte desse runtime. O schema Storage usado no teste é mínimo; o serviço Storage real depende da validação cloud.

`npm run test:e2e` inicia frontend e simulador automaticamente em portas isoladas (14200 e 18787), sem reutilizar sessões de desenvolvimento. Execute `npm run build` antes: um dos cenários serve o artefato compilado. Usa `/usr/bin/google-chrome` localmente; altere `CHROME_BIN` se necessário. No CI, instala e usa Chromium do Playwright. Gera screenshots em `test-results/` e relatório em `playwright-report/`. O widget externo VLibras é bloqueado nesses testes para resultados reproduzíveis; os testes não avaliam a tradução do widget.

`worker:check` empacota sem publicar. `worker:smoke` inicia o runtime Cloudflare local, com Durable Object real e segredos aleatórios efêmeros, e testa login, logout, revogação, limite persistente e CORS. Não acessa Supabase nem Cloudflare hospedados.

## Configuração real: responsável técnico

1. Crie um projeto Supabase dedicado. Aplique **na ordem** `0001_init.sql`, `0002_publication.sql`, `0003_mata_atlantica_2.sql` e `0004_pdf_documents.sql` pelo SQL Editor do responsável ou CLI. As migrações criam nove ambientes, buckets, RLS e duas funções transacionais. Não repetir a segunda migração em banco já migrado.
2. Em projeto existente, revise políticas em `storage.objects`: não deve haver política de escrita anônima nem leitura do bucket staging. Não reutilize um projeto com políticas permissivas sem revisão. Guarde backup antes de migrar dados existentes.
3. Configure `worker/wrangler.toml`: `ALLOWED_ORIGINS` é uma lista de origins exatos separados por vírgula, sem barra final nem caminho. Exemplo: `https://DONO.github.io`. Deixe localhost apenas se o desenvolvimento remoto for necessário. `EXTERNAL_MEDIA_HOSTS` é uma lista explícita de hostnames autorizados para URLs diretas HTTPS de vídeo, sem espaços; vazia bloqueia vídeos externos.
4. Cadastre os secrets interativamente, sem colocá-los em arquivos públicos:

```bash
npx wrangler login
npx wrangler secret put ADMIN_PASSWORD --config worker/wrangler.toml
npx wrangler secret put SESSION_SIGNING_KEY --config worker/wrangler.toml
npx wrangler secret put SUPABASE_URL --config worker/wrangler.toml
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config worker/wrangler.toml
npm run worker:deploy
```

Use senha aleatória com pelo menos 16 caracteres e chave aleatória com pelo menos 32 caracteres. Para testar o Worker local contra Supabase, crie `worker/.dev.vars` a partir do exemplo e preencha secrets localmente; esse arquivo é ignorado pelo Git. Execute `npm run worker:dev`, sem iniciar o simulador na mesma porta.

5. Configure as variáveis públicas do frontend (não precisa de service role):

```bash
export API_BASE_URL='https://SEU-WORKER.workers.dev'
export SUPABASE_URL='https://SEU-PROJETO.supabase.co'
export SUPABASE_PUBLISHABLE_KEY='SUA-CHAVE-PUBLICA'
export PUBLIC_BASE_URL='https://DONO.github.io/REPOSITORIO/'
npm run config
npm run build -- --base-href /REPOSITORIO/
```

A leitura pública usa `/public/spaces/:slug` no Worker e consulta **somente** `space_published`. Essa alternativa está prevista na arquitetura. O frontend não precisa consultar diretamente o banco. As opções públicas Supabase ficam disponíveis em configuração; a chave nunca autoriza escrita. O gerador rejeita chaves privilegiadas e URLs sem HTTPS fora de localhost.

6. No GitHub, crie/associe o repositório e habilite Pages com fonte **GitHub Actions**. Cadastre Repository Variables `API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PUBLIC_BASE_URL`, `PAGES_BASE_HREF`. Para domínio próprio, `PAGES_BASE_HREF=/`; para projeto, `/REPOSITORIO/`. O pipeline de main bloqueia uma publicação sem API e URL pública configuradas; pull requests podem validar localmente sem secrets.
7. O workflow instala dependências, verifica tipos/lint/unit/E2E, compila e envia apenas `dist/ciencia-sem-barreiras/browser` ao Pages. `.nojekyll` acompanha o artefato. Não publica Worker nem banco automaticamente. Nunca cadastre secrets do Worker como variáveis públicas do frontend.
8. Execute verificações cloud com credenciais **públicas**, em projeto de homologação dedicado:

```bash
export PUBLIC_ORIGIN='https://DONO.github.io'
npm run cloud:smoke
```

O smoke verifica negativas de leitura/escrita, RPC e Storage anônimos, além da leitura pública. Faça também login real, envie arquivos pequenos dos formatos suportados, publique, atualize a página pública em outra janela, substitua mídia e confirme rascunho privado. Valide URLs assinadas vencidas no serviço Storage real e reprodutibilidade após reiniciar Worker. Esses passos não foram executados em contas hospedadas nesta entrega.

## Operação da editora

1. Abra `/#/admin`, entre e escolha um dos nove ambientes.
2. Em Texto, adicione parágrafos, títulos, itens de lista ou links HTTPS. O botão Negrito aplica destaque à parte. A colagem é texto simples; HTML nunca é executado. Não é necessário escrever Markdown ou JSON.
3. Anexe fotos, áudios e vídeos. Aguarde o recebimento. Preencha descrição, crédito, transcrição e direito de uso. Adicione legenda VTT e selecione-a no vídeo. Escolha uma imagem enviada como pôster, se desejado. Use **Definir como capa** para mover uma imagem ao primeiro lugar da galeria. Para substituir/remover, confirme no diálogo.
4. Salve o rascunho. Ele continua privado; a prévia reproduz as mesmas seções da página pública. Após 30 minutos, reabra o ambiente para renovar URLs temporárias de prévia.
5. Clique Publicar e confirme. Apenas após a resposta do servidor aparece o sucesso. Abra a versão publicada. A próxima leitura busca a revisão nova sem rebuild ou commit.
6. Para retirar uma seção, desmarque sua exibição e publique. A mídia permanece recuperável. Histórico permite recuperar versões como rascunho; revise e publique novamente para torná-las públicas.
7. QR Codes só ficam disponíveis após configurar `PUBLIC_BASE_URL`. Escolha geral/texto/Libras/audiodescrição, baixe PNG/SVG ou imprima com legenda. O número final e a autorização de instalação física continuam pendentes. Teste leitura em dois celulares antes de impressão definitiva.
8. Sair revoga a sessão no servidor e remove o token da memória. Se a rede estiver indisponível, a cópia local é removida mesmo assim; a sessão remota expira em até uma hora.

## Recuperação e limites

- Logs do Worker são configurados em `worker/wrangler.toml` por `[observability]` e `[observability.logs]`, com coleta de invocações habilitada. Consultar Cloudflare → Workers & Pages → `ciencia-sem-barreiras-admin` → Observability. Só há registros coletados após a ativação; não recupera requisições anteriores. Não adicionar senhas, tokens, headers Authorization ou corpos de formulários a logs. Rever amostragem, retenção e cotas conforme o uso e o plano.

- Conflito de revisão: o Worker responde 409. Reabra o ambiente, revise e reaplique as mudanças; não sobrescreve silenciosamente.
- Upload interrompido: selecione novamente. Objetos recebem UUID, sem reutilizar nomes. Staging é privado; arquivos não confirmados não podem ser publicados.
- Limite da aplicação: 50 MiB por arquivo, sujeito ao limite menor configurado no projeto/plano. Comprima vídeos ou use URLs diretas de hosts autorizados. Hospedagem externa precisa permitir CORS para vídeos com legendas e deve ser verificada pelo responsável. Não há embed automático de páginas YouTube.
- O cron diário limpa mídias de staging com mais de sete dias que não aparecem em rascunhos, revisões ou publicação, e eventuais cópias públicas órfãs. Referências históricas são conservadas; monitorar quota e definir retenção com o responsável.
- Exporte banco pelo backup/CLI do Supabase e copie os dois buckets antes de alterar retenção. A recuperação do painel não substitui backup externo.
- Se Supabase pausar ou atingir cota, o site mostra erro e Tentar novamente. Reative o projeto, comprima/remova órfãos após backup ou ajuste plano; não existe conteúdo offline prometido. Não há service worker nem cache eterno.
- Registre rotação da senha/chave via `wrangler secret put`; ambas invalidam sessões existentes. Uma senha compartilhada não identifica qual pessoa fez a alteração. Eventos guardam ambiente, revisão e data, sem dados de visitantes.

## Correção: dois dioramas da Mata Atlântica

O total agora é nove ambientes. O diorama existente passa a se chamar **Diorama da Mata Atlântica 1**, preservando `/#/ambientes/diorama-mata-atlantica` e todos os registros. O segundo usa `/#/ambientes/diorama-mata-atlantica-2`. Em banco já configurado com 0001 e 0002, aplique apenas `0003_mata_atlantica_2.sql`; não refaça as migrações anteriores. Os dois ambientes têm conteúdo, mídias e QR independentes.

## PDFs de Texto e Atividades

Em projeto já atualizado até 0003, executar apenas `supabase/migrations/0004_pdf_documents.sql` no SQL Editor do responsável e publicar o Worker (`npm run worker:deploy`) antes do frontend. A migração é transacional e pode ser repetida: adiciona `text_pdf`/`activity_pdf` ao constraint de mídias e `application/pdf` aos dois buckets, preservando dados, RLS e visibilidade. Não repetir 0002.

Em Texto, o campo “Anexar PDF do texto” complementa o editor de parágrafos. Em Atividades, “Anexar Atividades” recebe PDFs. É possível anexar mais documentos repetindo a seleção. Cada PDF tem título, crédito, exibição, substituição e remoção; a prévia abre o arquivo em nova aba. “Exibir texto ao publicar” controla também os PDFs de Texto. Atividades tem controle independente por arquivo e link público `?recurso=atividades`.

Fotos aceita várias imagens na mesma seleção e adições posteriores. Limite de 50 MB por arquivo e 40 recursos no total por ambiente. Se um envio múltiplo falhar, os arquivos já recebidos ficam no editor para salvar; a mensagem informa quantos chegaram. Selecione apenas os restantes para repetir.

A publicação mantém staging privado e URLs temporárias, promovendo PDFs junto das demais mídias antes da troca atômica do snapshot. O servidor valida MIME, tamanho e assinatura `%PDF-1.x`/`%PDF-2.0`; essa checagem não equivale a análise completa de conteúdo ou antivírus. PDFs são links em nova aba, sem inserir conteúdo no HTML da aplicação. Acessibilidade do documento depende de texto selecionável, estrutura e revisão editorial do próprio PDF.
