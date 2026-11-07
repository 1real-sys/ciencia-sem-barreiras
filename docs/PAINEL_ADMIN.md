# Painel da editora — contrato de UX

## Principal
A estudante **não acessa Github, não sabe Git e não pode editar código**. A tela administrativa é um formulário visual e amigável dentro do próprio site. UX simplificada, acessível e responsiva, sem jargão de dev.

**Fluxo tela por tela:**
1. `/#/admin`: fundo claro, marca Ciência Sem Barreiras, campo `Senha de acesso`, botão Entrar, indicador de erros simples. Não escrever a senha real como dica. Tela só valida via Worker; não é bloqueio por comparar string em TypeScript.
2. Dashboard: título `Gerenciar ambientes`, nove cartões iguais aos do site (com miniatura), selo `Publicado`, `Rascunho` ou `Pendente`, `Editar` e `Ver no site`, data de publicação.
3. Editor: cabeçalho nome fixo do espaço, tabs/seções **Texto**, **Fotos**, **Libras**, **Audiodescrição**, **Áudio (opcional)** e **QR Codes**. Ao lado/acima há preview mobile. Campo conteúdo amigável rich text limitado (cabeçalhos, negrito, listas, links seguros) com suporte a colagem de texto simples; não exigir JSON nem Markdown.
4. `Fotos`: upload uma ou várias, miniaturas, substituir/remover, posição de capa, texto alternativo obrigatório, crédito e flag `fotografia real`/`ilustração`. Não confundir autorização de imagem com disponibilidade; exigir confirmação de direito de uso antes de publicar imagem real.
5. `Libras`: upload vídeo ou URL externa, transcrição opcional, pôster e descrição. Sem arquivo => `Conteúdo em preparação`.
6. `Audiodescrição`: somente upload de áudio MP3, AAC, WAV, WMA, M4A, OGG/Opus ou FLAC, sem campo de transcrição; não rotular uma narração qualquer como audiodescrição sem conteúdo adequado.
7. `Salvar rascunho`: mantém dados privados para edição posterior. Exibir estado saving/success/error acessível. Prévia usa draft e NÃO altera site público.
8. `Publicar`: revisar confirmação e campos de acessibilidade, publicar versão validada e informar quando finalizou; botões `Visualizar versão publicada`, `Copiar link` e `Voltar aos ambientes`.
9. `QR Codes`: interface gera até quatro tipos por ambiente somente após configurar o endereço definitivo; permite habilitar/desabilitar tipos sem quebrar URLs já impressas. Visualização de QR com nome do espaço e destino; download SVG/PNG se funcional, caso contrário não colocar botão falso.
10. `Sair`: revoga sessão ou remove token da memória e bloqueia novos acessos a endpoints administrativos.

## Requisitos técnicos e validações
- A estudante pode fazer upload de imagem, áudio e vídeo via seletor de arquivos; permitir também URL externa autorizada para vídeos que excedam cota.
- Tamanho máximo informado ANTES de enviar e erro claro. Acompanhar progresso de upload direto.
- Não validar apenas extensão; validar MIME e assinatura dos arquivos quando possível, e no servidor. Bloquear SVG enviado como imagem, scripts e HTML ativos, arquivos perigosos. Sanitização do rich text na gravação e exibição.
- Rascunho e versão publicada separados. Exibir prévia com dimensões móveis; abrir imagem/áudio/vídeo no navegador quando disponíveis, sem autoplay.
- Não obrigar todos os três recursos a estarem prontos juntos: publicação por seção sem duplicar conteúdo falso. Sempre mostrar ausência honestamente.
- Sem edição de nomes/slug dos 9 espaços (evita quebrar QR), exceto no código mediante revisão do responsável.
- Formularios semanticamente rotulados, foco correto, aria-live para feedback, keyboard-only e erros associados ao campo. Não usar cor como única pista.

## Critérios de aceite
- Uma pessoa sem saber Git consegue editar texto e publicar e ver após refresh em celular.
- Ela consegue substituir foto, áudio e arquivos de vídeo **com tamanho suportado** e vê o que foi publicado.
- Não há gravação no site público antes de clicar `Publicar`.
- Nenhum segredo aparece em devtools/browser/network em texto claro além da senha digitada no POST HTTPS (não registrar senhas).
- Tentativa errada ou upload desautorizado não altera conteúdo.

## Atualização de 06/11/2026 — documentos e galeria

- Texto recebe também PDFs pelo campo “Anexar PDF do texto”, mantendo o editor existente.
- Atividades é uma nova seção que, nesta etapa, recebe apenas PDFs. Não há jogos ou botões de jogos.
- PDFs usam título, crédito, rascunho, prévia (Texto e Atividades no mesmo popup com leitor dedicado) e publicação; podem ser substituídos, desabilitados ou removidos. Máximo 50 MB por arquivo.
- Fotos aceita várias imagens em uma seleção ou envios sucessivos. Máximo 40 recursos totais por ambiente, incluindo os outros tipos.
- Área pública apresenta links de PDFs em Texto e Atividades, com estado “Conteúdo em preparação” quando não há arquivos publicados. O controle de Texto inclui seus PDFs; Atividades é independente.

Atualização de 06/11/2026: removidos upload e seletor de legendas WebVTT. Audiodescrição não oferece pôster nem endereço de vídeo; usar arquivo de áudio.

## Fonte dos recursos — 06/11/2026

O campo antes chamado “Crédito e licença” agora se chama “Fonte”. Recebe texto livre: autor, nome de instituição, link ou outra referência. Digitar apenas o valor; o site acrescenta o prefixo fixo `fonte: `. Exemplo: campo `eu mesma` → `fonte: eu mesma`. Vale para PDFs, fotos, Libras e audiodescrição. Conteúdo já salvo é preservado e passa a receber o prefixo na apresentação; a chave interna `credit` é mantida, sem migração. A confirmação de direito de uso de fotos continua separada.

Atualização de 07/11/2026: publicar vídeo em Libras com transcrição vazia é permitido. O painel mostra “Transcrição (opcional)”; textos já preenchidos continuam disponíveis.

Atualização de 07/11/2026: Audiodescrição publica sem transcrição e não mostra esse campo no editor nem o bloco de transcrição na página pública. Textos antigos são preservados nos registros; não houve exclusão de histórico.
