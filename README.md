# Ciência Sem Barreiras — V4 (especificação definitiva para implementação)

**Implementação local disponível:** Angular 22, painel administrativo, Worker TypeScript, migrações Supabase, simulador local e testes executáveis. Veja [como executar](docs/EXECUCAO.md) e as [evidências e limitações](docs/ACEITE.md). A ativação dos serviços hospedados depende das contas e dos secrets do responsável.

> **Requisitos de 04/11/2026, com atualização de audiodescrição em 06/11/2026:** GitHub Pages (frontend), Supabase Database + Storage (conteúdo), Cloudflare Worker (admin/autenticação/publicação), painel administrativo com **uma senha** (sem cadastro), atualização pública sem commit, nove espaços, texto/fotos/áudio/vídeo Libras/audiodescrição em áudio, links QR configuráveis, design mobile-first e amigável para crianças.

## 0. LEIA PRIMEIRO
- `AGENTS.md`: regras mandatórias do Codex.
- `INICIO-CODEX.md`: ordem de execução.
- `docs/ARQUITETURA_V4.md`: fluxos e contratos.
- `docs/PAINEL_ADMIN.md`: comportamento do editor.
- `docs/SEGURANCA.md`: proteção real com senha compartilhada.
- `docs/SUPABASE_SETUP.md`, `docs/CLOUDFLARE_SETUP.md`, `docs/GITHUB_PAGES.md`: configuração.
- `docs/QR_CODES.md`, `docs/CONTENT_MATRIX.md`, `docs/JOGOS_FASE_2.md`: conteúdo e evolução.
- `supabase/migrations/0001_init.sql`: modelo SQL de referência, com políticas RLS restritas.

## 1. O produto
**Ciência Sem Barreiras** é projeto acadêmico independente de estudantes de Pedagogia, inspirado nos nove espaços de Biologia da Escola da Ciência – Biologia e História em Vitória/ES. Público prioritário: estudantes do 5º ano do Ensino Fundamental. Uso principal: celular via QR Code durante a visita; também atender adultos e tecnologias assistivas.

**Entregável V1:** site completo e atraente + painel ADMIN DE VERDADE, com publicação online de textos, imagens, áudio e vídeos, sem qualquer GitHub para a estudante. Jogos investigativos: backlog de fase 2 detalhado em `docs/JOGOS_FASE_2.md`, não implementar experiências falsas. Reservar espaço elegante para futuras atividades se apropriado.

**Rodapé EXATO em todas as páginas públicas:**

> Projeto acadêmico independente, desenvolvido para fins educativos. Esta plataforma não representa oficialmente a Escola da Ciência – Biologia e História nem a Prefeitura Municipal de Vitória.

Não usar logotipos oficiais, fotos institucionais sem autorização ou afirmar presença de espécies na exposição sem fonte confirmada. Ilustrações devem ser rotuladas. Sem publicidade, rastreamento de crianças, cadastro de visitantes ou coleta de dados pessoais.

## 2. Stack e hospedagem inegociáveis
| Camada | Tecnologia | Função |
|---|---|---|
| Frontend público e admin | Angular 22 + TypeScript estrito + standalone components + signals | UI responsiva, rotas e editor |
| Design | Tailwind CSS + design tokens CSS | visual científico verde-água/azul, infantil acolhedor |
| Build/host | GitHub Actions + GitHub Pages | distribui **somente frontend estático** |
| Leitura pública | Supabase Postgres + Storage (público para conteúdo aprovado) | conteúdo em tempo quase real, sem rebuild |
| Administração | Cloudflare Worker | verifica senha, emite sessão curta, valida escrita, controla upload e publica |
| Testes | Vitest + Playwright + axe-core | regressão, mobile e acessibilidade |

**NÃO criar commits a cada edição de conteúdo.** O GitHub Pages serve a aplicação; alterar conteúdo no banco/Storage permite que qualquer visitante carregue a versão nova ao abrir/atualizar a página. Não prometer atualização instantânea sem conexão ou cache; após salvar com sucesso a mudança deve aparecer em uma nova leitura/refresh, normalmente em segundos. Definir `Cache-Control`/estratégia de revalidação para conteúdo e URLs versionadas para mídias.

**NÃO salvar senha no Angular, localStorage, bundle, banco público ou git.** Uma tela de senha simples é aceitável, mas autenticação deve ser *server-side*, no Worker. PIN de quatro dígitos como `2207` NÃO é seguro para edição pública; usar senha compartilhada forte, configurada como secret, com limitação de tentativas e sessão curta. Não precisa exigir contas individuais; documentar limitações de uma senha compartilhada.

## 3. Identidade visual e acessibilidade
**Design obrigatório mobile-first**, testar larguras 320, 360, 375, 390, 414, 768, 1024 e 1440 px. Sem scroll horizontal. Áreas de toque preferencialmente >=44×44 px; navegação com uma mão; evitar hover-only e autoplay. Cartões grandes com imagens, microinterações discretas, títulos curtos, fontes legíveis. Aparência de museu científico interativo para crianças de 10-11 anos, sem visual corporativo ou infantilizado. Hero com ilustração panorâmica original e cinco ambientes distintos: água doce, manguezal, marinho, Mata Atlântica e restinga. Elementos textuais sempre HTML. Arte pode ser fornecida posteriormente: usar SVG/ilustrações próprias e placeholders bonitos **claramente identificados**, sem fingir foto da instituição.

Tokens iniciais: `#087F8C` principal, `#075766` primário escuro, `#176B9A` oceano, `#DDF5ED` verde claro, `#E9F7FA` fundo azulado, `#25714E` floresta, `#F7EBD4` areia, `#17343E` texto, `#FFFFFF` superfície, `#F5A94E` acento. Validar contraste WCAG 2.2 AA e não depender de cor para feedback. Navegação por teclado, rótulos semânticos, foco, `aria-live` para salvamento, legendas/transcrições; testes manuais. Widget oficial VLibras funcional nas páginas públicas, carregado conforme documentação oficial e respeitando falhas de rede. Vídeo Libras próprio é separado do widget. Audiodescrição é conteúdo audiovisual descritivo para pessoas cegas; não equiparar a vídeo em Libras.

## 4. Páginas, rotas e conteúdo
Angular Router **`withHashLocation()`** para GitHub Pages:
- `/#/` início
- `/#/ambientes` listagem
- `/#/ambientes/aquario-nascente-rio` — Aquário Nascente do Rio – Paludário
- `/#/ambientes/aquario-fundo-rio` — Aquário Fundo do Rio – Jumbo
- `/#/ambientes/aquario-lagoa` — Aquário Lagoa
- `/#/ambientes/aquario-marinho` — Aquário Marinho
- `/#/ambientes/aquario-praia` — Aquário Praia
- `/#/ambientes/diorama-manguezal` — Diorama do Manguezal
- `/#/ambientes/diorama-restinga` — Diorama da Restinga
- `/#/ambientes/diorama-mata-atlantica` — Diorama da Mata Atlântica 1
- `/#/ambientes/diorama-mata-atlantica-2` — Diorama da Mata Atlântica 2
- `/#/sobre` — Sobre o projeto
- `/#/admin` — área de gestão; interface só entra após sessão validada pelo Worker (a página e os JS não são secretos).

Cada espaço: título, imagem de capa e galeria, texto-base escrito pela estudante, vídeo em Libras, audiodescrição somente em áudio, **áudio independente opcional** (porque também foi solicitado upload de áudio), metadados de acessibilidade, status de publicação por seção. Não inventar vídeo ou texto. Quando recurso não publicado, dizer `Conteúdo em preparação` e não colocar botão sem ação.

Home: título exato `Explore os espaços de Biologia da Escola da Ciência – Biologia e História`; subtítulo exato `Conheça os animais, explore diferentes ambientes e descubra como a natureza funciona.`; CTA exato `Explorar os ambientes`. Seção `Por que criamos este projeto?` usar texto exato disponível no briefing original e preservado em `docs/TEXTO_INSTITUCIONAL.md`; não substituir por marketing genérico. Página sobre: projeto independente, não oficial, estudantes de Pedagogia, alfabetização científica e diferentes modos de acesso à informação. Não inventar aprovação ou medições.

## 5. Painel — requisitos de aceite prioritários
- Entrada por **uma senha compartilhada** digitada em formulário, validada exclusivamente pelo Worker em HTTPS. Sessão via cookie `HttpOnly; Secure; SameSite=None` se cross-origin (além de `credentials:include` e CORS restrito), ou usar arquitetura same-site com domínio próprio se possível. `SameSite=None` pode sofrer bloqueio por políticas de cookies terceiros: incluir avaliação real e alternativa segura (token de acesso de curta duração mantido *somente em memória*, com CSRF/origin checks e sem persistir). Nunca contar com segurança via URL secreta.
- Área após entrar: dashboard de nove cartões, estado de publicação, último update, acesso de editar e pré-visualizar.
- Editor por espaço: título informativo fixo, campos `texto base` (com títulos, parágrafos, listas e links sanitizados), descrição de imagens e créditos, upload imagem/galeria, upload áudio, upload vídeo Libras, upload áudio de audiodescrição; transcrições; remover/substituir arquivos, com confirmação.
- **Rascunho x publicação**: salvar rascunho privado não altera o site público. Prévia de rascunho restrita à sessão admin; `Publicar` torna o conteúdo aprovado visível ao público. Possibilitar retirar seção do ar sem apagar mídia; histórico mínimo e recuperação básica.
- Em cada upload: selecionar arquivo, validar MIME real/tamanho, barra de progresso e resultado. Para grandes arquivos NÃO passar bytes pelo Worker; Worker autoriza upload assinado de curta duração para Storage; navegador faz upload direto ao Storage, Worker valida e associa ao registro na finalização. Não disponibilizar bucket público para escrita anônima.
- Após publicar: toast + anúncio `aria-live`, atualizar consulta pública e abrir prévia ao vivo. Falhas de upload/salvamento devem ser visíveis e recuperáveis; não dizer salvo antes da confirmação.
- Sem necessidade de mexer no GitHub ou fazer deploy para editar conteúdo. Site deve funcionar com campos vazios sem quebrar.

## 6. QR Codes (a confirmar)
Rota principal estável para cada um dos 9 espaços, e links opcionais `/#/ambientes/{slug}?recurso=texto|libras|audiodescricao`, que abrem e focam o bloco correspondente. Poderão ser **9 ou até 36 QR Codes**, conforme decisão da estudante. Gerar/baixar PNG e SVG individualmente somente quando base URL final for configurada. Mostrar a URL completa e permitir copiar e imprimir com legenda. Não imprimir definitivamente nem afirmar disposição física sem autorização da instituição.

## 7. Modelo de publicação e regras de cache
Frontend lê apenas `published` via Supabase com chave pública/publishable key e RLS segura; ou endpoint público do Worker se for necessário reduzir exposição. SQL de referência em `supabase/migrations/0001_init.sql`. Credencial privilegiada **somente no Worker**, nunca no browser. Cada atualização salva `updated_at`/`revision`, nomes de objetos imutáveis com UUID, revisão atualizada para cache-busting; refetch depois de publicar. Suportar indisponibilidade temporária com mensagens amigáveis e retry, não esconder erros.

## 8. Limites e custos
Supabase Free: até **1 GB de armazenamento** e **50 MB por arquivo** na configuração atual, sujeitos a mudanças; tráfego e limites do Worker também existem. Imagens preferencialmente AVIF/WebP e áudios comprimidos; **vídeos grandes precisam compressão ou hospedagem externa autorizada** (URLs HTTPS com embed acessível, sem publicidade intrusiva), configurada no painel. Não garantir custo zero para qualquer volume. Documentar plano de fallback se atingir cota ou projeto Free for pausado.

## 9. Ordem e definição de pronto
1. Gerar Angular frontend e Worker; instalar dependências, inicializar Vitest/Playwright; testes de compilação.
2. Design tokens e home/mobile; grade de ambientes e uma página completa; usar imagens ilustrativas honestas e bonitas.
3. Esquema SQL + Storage + RLS, seeds **sem conteúdo institucional inventado**; montar API pública com estados vazios.
4. Worker seguro: login por senha compartilhada forte, sessão, rate limit, CORS, endpoints de rascunho/publicação, signed upload, validação.
5. Painel admin funcional com edição, mídia, progresso, prévia, publicação/retirada e erros.
6. Replicar 9 ambientes, rotas QR, VLibras, fallback offline/erros; qualidade visual infantil e responsividade.
7. Testes E2E positivos/negativos (senha, uploads, publicação, RLS, QR, mobile, leitores de tela), documentar verificações manuais.
8. Pipeline GitHub Pages, deploy Worker, procedimento de criação Supabase, variáveis, checklist operacional; fornecer scripts de implantação e passos sem segredo hardcoded.
9. Atualizar checklist `docs/ACEITE.md` com testes executados/pendências REAIS. Não declarar produção pronta se não testado com recursos reais.

**Implementado neste repositório:** fontes em `src/`, `shared/`, `worker/src/`, migrações em `supabase/migrations/`, testes em `tests/` e pipeline em `.github/workflows/deploy-pages.yml`. Infraestrutura cloud continua exigindo contas, secrets e validação real.
