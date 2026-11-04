---
name: acessibilidade-wcag
description: Usar ao implementar ou auditar navegação, teclado, leitor de tela, jogos inclusivos, mídias, VLibras e WCAG 2.2 AA.
---

# Escopo
WCAG 2.2 nível AA como meta, **não alegar conformidade sem avaliação**. Referências: https://www.w3.org/TR/WCAG22/ e https://vlibras.gov.br/doc/widget/installation/webpageintegration.html.

# Checklist de implementação
- Componentes HTML semânticos e labels associados, ordenação de títulos, landmarks, skip link.
- Navegação/menus/jogos 100% por teclado; ordem de foco lógica, `:focus-visible` destacado e sem armadilhas.
- Textos com contraste adequado, feedback independente de cor/som, área acionável ideal >=44x44px, espaçamento suficiente.
- Descrições alternativas **equivalentes em objetivo**, não apenas imagem com `alt="animal"`.
- Movimentos de arrastar sempre executáveis sem drag; atividades visuais com rota não visual real.
- `aria-live` para feedback dinâmico, sem disparar anúncios excessivos; testar NVDA/VoiceOver/TalkBack quando possível.
- Testar zoom, reflow, redução de movimento, tamanho dos alvos e gestos de toque.
- Áudio com controle explícito, transcrição; vídeo com legendas quando aplicável, transcrição e espaço dedicado para vídeo humano de Libras.
- VLibras oficial carregado apenas uma vez e testado; não substituir a responsabilidade por acessibilidade e tradução humana.
- SpeechSynthesis apenas com detecção de suporte; nunca autoplay nem áudio fictício.

# Validação
Rodar axe automatizado + testes Playwright + verificações manuais; registrar barreiras conhecidas e não declarar acesso universal sem evidência.
