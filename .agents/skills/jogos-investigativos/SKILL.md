> **Fase 2:** Esta skill foi preservada do escopo inicial. Não é bloqueadora da v1.

---
name: jogos-investigativos
description: Usar ao implementar ou revisar mecânicas, dados, feedback e testes das 24 atividades investigativas do Ciência Sem Barreiras.
---

# Workflow
1. Abrir `docs/CONTENT_MATRIX.md` e seção 5 do README; selecionar ID e objetivo pedagógico.
2. Escrever uma frase sobre *o que o aluno deverá compreender* e qual observação fará.
3. Escolher mecânica coerente com fenômeno (comparação, sequência, identificação, decisão, simulação). Reutilizar motor, não repetir experiência superficial.
4. Modelar dados tipados e status; manter informações verificáveis e não atribuir animais à exposição real sem confirmação.
5. Implementar `intro -> playing -> feedback -> completed` + retry, sem controles decorativos.
6. Garantir seleção por toque, mouse e teclado; para drag sempre oferecer alternativa por seleção/reordenação; para hotspot oferecer lista semanticamente equivalente.
7. Feedback textual explica *por quê*; permitir erro sem punição. Uma etapa por vez, tempo de visita curto.
8. Unit tests: acerto, erro, retry, ordem, dados incompletos. E2E: teclado, touch, feedback anunciado, retorno à página.
9. Só marcar concluído após arte/descrição acessível, lógica testada e revisão de conteúdo.

# Anti-patterns
Quizzes de alternativas repetidos com nova aparência; sorteios aleatórios de respostas sem persistência de estado; drag-only; aria-label redundante; feedback apenas verde/vermelho; textos científicos não validados; fingir que mídia provisória está pronta.
