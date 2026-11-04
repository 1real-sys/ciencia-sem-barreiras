# SQL de referência

`migrations/0001_init.sql` é o esqueleto de banco seguro, com tabela pública de conteúdo aprovado, tabelas privadas de rascunho, índice de revisão e bloqueio de DML anônimo. O Codex deve revisar/adaptar para implementação da publicação transacional e testar RLS com conta anônima. Não afirmar que o schema sozinho implementa o painel ou o upload assinado.
