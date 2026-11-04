# QR Codes — decisão aberta (NÃO fixar ainda)

A estudante informou QR para cada um dos nove espaços e **possivelmente** QR separados por recurso: texto, Libras e vídeo audiodescrição. Necessita confirmar antes de impressão.

## Modelo provisório compatível com as opções
- Geral: `https://USUARIO.github.io/REPO/#/ambientes/aquario-marinho`
- Texto: `https://USUARIO.github.io/REPO/#/ambientes/aquario-marinho?recurso=texto`
- Libras: `https://USUARIO.github.io/REPO/#/ambientes/aquario-marinho?recurso=libras`
- Audiodescrição: `https://USUARIO.github.io/REPO/#/ambientes/aquario-marinho?recurso=audiodescricao`

Repetir para os 9 slugs. **O número final pode ser 9 ou 36**; não assumir que os 4 códigos por espaço serão obrigatórios. URLs devem ser estáveis e funcionar mesmo se mídia estiver em preparação. Rota com parâmetro de recurso foca/seleta o recurso específico de maneira acessível. Não fazer QR apontar ao arquivo cru do Supabase, mas à página HTML acessível (com opção de reprodução, transcrição e contexto). Gerar QR em SVG/PNG com biblioteca leve, margens adequadas e testes em dois celulares após confirmar domínio. Não inventar autorização da instituição para instalação física.
