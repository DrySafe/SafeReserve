\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('77777777-7777-4777-8777-777777777777'),('88888888-8888-4888-8888-888888888888');
set local role anon;
do $$ begin
 begin perform public.create_tenant('Loja teste','loja-teste','Rua teste','Profissional','Corte',4500,30);raise exception 'Anonymous provision accepted';exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='77777777-7777-4777-8777-777777777777';
do $$ declare shop jsonb; retry jsonb; begin
 shop:=public.create_tenant('Loja teste','loja-teste','Rua teste','Profissional','Corte',4500,30);
 retry:=public.create_tenant('Loja teste','loja-teste','Rua teste','Profissional','Corte',4500,30);
 if shop->>'id'<>retry->>'id' then raise exception 'Provision retry duplicated tenant';end if;
 if not public.is_tenant_admin((shop->>'id')::uuid) then raise exception 'Creator not admin';end if;
 if (select count(*) from public.memberships where tenant_id=(shop->>'id')::uuid and user_id=auth.uid() and role='admin')<>1 then raise exception 'Membership not created';end if;
 if (select count(*) from public.services where tenant_id=(shop->>'id')::uuid)<>1 or (select count(*) from public.professionals where tenant_id=(shop->>'id')::uuid)<>1 or (select count(*) from public.professional_services where tenant_id=(shop->>'id')::uuid)<>1 then raise exception 'Starter catalog incomplete';end if;
 if not exists(select 1 from generate_series(current_date+1,current_date+7,interval '1 day') d cross join lateral public.available_slots((shop->>'id')::uuid,d::date,array[(select id from public.services where tenant_id=(shop->>'id')::uuid)],null) s) then raise exception 'New shop cannot be booked';end if;
 if public.is_tenant_admin('11111111-1111-4111-8111-111111111111') then raise exception 'Provision elevated another tenant';end if;
 begin perform public.create_tenant('Loja reservada','demonstracao','Rua teste','Profissional','Corte',4500,30);raise exception 'Reserved slug accepted';exception when raise_exception then if sqlerrm not like 'Escolha um link%' then raise;end if;end;
 begin insert into public.tenants(slug,name) values('insert-direto','Loja direta');raise exception 'Direct tenant insert accepted';exception when insufficient_privilege then null;end;
end $$;
set local request.jwt.claim.sub='88888888-8888-4888-8888-888888888888';
do $$ begin
 begin perform public.create_tenant('Loja de outro dono','loja-teste','Rua teste','Profissional','Corte',4500,30);raise exception 'Slug takeover accepted';exception when unique_violation then null;end;
 update public.services set price=1 where tenant_id=(select id from public.tenants where slug='loja-teste');
 if found then raise exception 'Other owner updated catalog';end if;
 perform public.create_tenant('Segunda loja','segunda-loja','Outra rua','Outra pessoa','Manicure',5500,45);
end $$;
reset role;
do $$ begin
 if (select count(*) from public.tenants where slug in ('loja-teste','segunda-loja'))<>2 then raise exception 'Independent shops missing';end if;
 if (select count(*) from public.memberships m join public.tenants t on t.id=m.tenant_id where t.slug='loja-teste')<>1 then raise exception 'Foreign owner acquired membership';end if;
 if (select count(*) from public.tenants where slug='demonstracao')<>0 then raise exception 'Reserved demo route provisioned';end if;
end $$;
rollback;
\echo 'PASS: authenticated shop provisioning, owner role, distinct links, starter availability, retries, reserved slugs and tenant isolation.'
