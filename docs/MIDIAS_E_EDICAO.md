# Mídias e edição online (NOVO — V4)

**Este documento SUBSTITUI o antigo procedimento de editar JSON/arquivos no GitHub.** A estudante entra no painel `/#/admin`, autentica-se com senha, escolhe um dos nove espaços, escolhe a seção (texto/fotos/Libras/audiodescrição/áudio), anexa e pré-visualiza, salva um rascunho e publica. A versão pública consulta Supabase; GitHub permanece intacto.

## Recomendações de formatos
- PDFs em Texto e Atividades: `application/pdf`, até 50 MB por arquivo; título e crédito obrigatórios ao publicar. Preferir texto selecionável e estrutura acessível.
- Fotos: múltiplas por seleção, WebP/JPEG/PNG; recomendar compressão, alt e crédito/licença; nunca upload de SVG ativo.
- Audiodescrição e áudio: MP3, AAC, WAV, WMA, M4A, OGG/Opus ou FLAC; transcrição. Até 50 MB. Player de áudio e opção de abrir/baixar para aplicativos externos.
- Vídeo Libras: MP4/WebM com codecs compatíveis; permitir URL externa HTTPS (apenas domínios conhecidos ou URL validada) se arquivo for grande.
- Upload e seletor de legendas WebVTT retirados. Referências de Libras já publicadas são preservadas.
- Supabase Free possui limite atual de **50 MB por arquivo** e **1 GB de Storage total**. Arquivo grande: compressão ou link externo, nunca dividir automaticamente arquivos sem fluxo testado.

## Salvamento/publicação
- `Salvar rascunho` guarda conteúdo sem publicar. `Publicar` promove mídias e troca snapshot público de modo consistente. `Atualização publicada` somente após confirmação de API.
- Na prévia, mostrar texto/arquivo que está no rascunho. No site público, ao recarregar buscar snapshot aprovado. Arquivos recebem nome/versionamento novo para não servir versões antigas em cache.
- Registrar data de publicação e permitir rollback. Não registrar dados pessoais de alunos ou visitantes.
