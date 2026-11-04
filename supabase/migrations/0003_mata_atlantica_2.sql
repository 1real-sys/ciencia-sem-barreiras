-- Correção do briefing: dois dioramas da Mata Atlântica, nove ambientes no total.
-- Preserva ID, slug, rascunhos, publicações e mídias do diorama já existente.
update public.spaces
set title = 'Diorama da Mata Atlântica 1'
where slug = 'diorama-mata-atlantica';

insert into public.spaces(slug,title,position)
values ('diorama-mata-atlantica-2','Diorama da Mata Atlântica 2',9)
on conflict(slug) do update set title=excluded.title;
