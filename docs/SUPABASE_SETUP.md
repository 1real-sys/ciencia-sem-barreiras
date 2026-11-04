# Configuração do Supabase

Implementação e comandos atuais: [EXECUCAO.md](EXECUCAO.md). Decisões e limites: [DECISOES_IMPLEMENTACAO.md](DECISOES_IMPLEMENTACAO.md). Aplicar as migrações **0001, 0002 e 0003**, nessa ordem; usar `worker/wrangler.toml` implementado, com Durable Object.

1. Criar projeto Supabase na conta do responsável (a estudante não precisa acessar Supabase).
2. Copiar Project URL e chave **publishable/anon de leitura** para config PUBLICA do Angular. Configurar segredo **service_role** só no Worker; nunca em `.env` enviado ao GitHub Pages.
3. Aplicar `supabase/migrations/0001_init.sql` pelo SQL editor ou CLI; revisar o schema e ajustar para novas versões do SDK se necessário. Políticas iniciais: SELECT somente em `space_published`, e somente a roles de leitura; absolutamente nenhum write anônimo.
4. Criar buckets `csb-public-media` (public read) e `csb-staging-media` (private) com limites MIME/tamanho. Não ativar escrita anônima. Configuração pode ser feita por migração/CLI, confirmar no dashboard. Isolar staging em privado.
5. Usar Worker para realizar upload assinado e publicação. O SDK deve usar service_role somente em runtime Cloudflare.
6. Verificar quota Free disponível no momento da implementação: **1 GB de Storage incluso** e **50 MB máximo por arquivo Free** (doc oficial verificada nov/2026). Grandes vídeos via link externo autorizado ou plano/storage alternativo. Verificar saída de dados (egress) e pausa de projetos Free.
7. Seed: cadastrar nove IDs/slugs com nomes, conteúdo em branco; não criar fake de conteúdo validado. Usar `content/ambientes/*.json` apenas como referência de IDs/estrutura, NÃO fonte editável pela aluna.
8. Teste real: publicar texto, trocar imagem, fazer upload e confirmar no site por refresh; rascunho fica invisível; anônimo não escreve.
9. Exportar backup e registrar procedimento de recuperação antes do uso público.

Docs oficiais:
- https://supabase.com/docs/guides/storage/uploads/file-limits
- https://supabase.com/docs/guides/storage/uploads/uploading-files
- https://supabase.com/docs/guides/storage/uploads/resumable-uploads
- https://supabase.com/docs/guides/platform/manage-your-usage/storage-size
