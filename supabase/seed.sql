-- Optional fictional studio, run once after the migration.
insert into public.tenants(id,slug,name,tagline,description,address) values
('11111111-1111-4111-8111-111111111111','studio-aurora','Studio Aurora','Beleza que respeita o seu tempo.','Um respiro na rotina. Um cuidado só seu.','Rua dos Pinheiros, 870 · São Paulo') on conflict do nothing;
insert into public.services(id,tenant_id,name,description,category,price,duration,icon,color,tag) values
('22222222-2222-4222-8222-222222222221','11111111-1111-4111-8111-111111111111','Corte & finalização','Um novo olhar para o seu estilo.','Cabelo',12000,60,'scissors','sage','Mais escolhido'),
('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Manicure essencial','Cuidado nos mínimos detalhes.','Unhas',4500,45,'sparkles','rose',null),
('22222222-2222-4222-8222-222222222223','11111111-1111-4111-8111-111111111111','Barba & cuidado','Precisão, toalha quente e uma pausa.','Barbearia',6500,30,'razor','sand',null),
('22222222-2222-4222-8222-222222222224','11111111-1111-4111-8111-111111111111','Hidratação profunda','Nutrição e brilho, da raiz às pontas.','Cabelo',9500,45,'drop','lavender',null),
('22222222-2222-4222-8222-222222222225','11111111-1111-4111-8111-111111111111','Design de sobrancelhas','Valorize o que faz você ser você.','Sobrancelhas',5000,30,'eye','peach',null),
('22222222-2222-4222-8222-222222222226','11111111-1111-4111-8111-111111111111','Spa dos pés','Leveza para seguir o seu caminho.','Unhas',8500,60,'flower','blue',null) on conflict do nothing;
insert into public.professionals(id,tenant_id,name,specialty,initials,color) values
('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111','Marina Costa','Cabelo & bem-estar','MC','sage'),
('33333333-3333-4333-8333-333333333332','11111111-1111-4111-8111-111111111111','Lucas Santos','Cortes & barbearia','LS','sand'),
('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Júlia Lima','Unhas & autocuidado','JL','rose') on conflict do nothing;
insert into public.professional_services(tenant_id,professional_id,service_id)
select p.tenant_id,p.id,s.id from public.professionals p join public.services s on s.tenant_id=p.tenant_id
where p.tenant_id='11111111-1111-4111-8111-111111111111' and (
(p.initials='MC' and s.category in ('Cabelo','Sobrancelhas')) or
(p.initials='LS' and s.name in ('Corte & finalização','Barba & cuidado')) or
(p.initials='JL' and s.category in ('Unhas','Sobrancelhas'))) on conflict do nothing;
