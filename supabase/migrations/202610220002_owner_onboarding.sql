begin;

-- Self-service provisioning is atomic and grants ownership only to the JWT caller.
-- Browsers continue to have no direct INSERT permission on tenants or memberships.
create function public.create_tenant(
 p_name text, p_slug text, p_address text, p_professional_name text,
 p_service_name text, p_price integer, p_duration integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_user uuid := auth.uid();
 v_slug text := lower(trim(p_slug));
 v_tenant public.tenants;
 v_professional uuid;
 v_service uuid;
begin
 if v_user is null then raise exception 'Entre na sua conta para criar uma loja.' using errcode='42501'; end if;
 if p_name is null or char_length(trim(p_name)) not between 2 and 80
 or p_address is null or char_length(trim(p_address)) not between 2 and 200
 or p_professional_name is null or char_length(trim(p_professional_name)) not between 2 and 80
 or p_service_name is null or char_length(trim(p_service_name)) not between 2 and 100
 then raise exception 'Preencha os dados da loja, do profissional e do primeiro serviço.'; end if;
 if v_slug is null or char_length(v_slug) not between 3 and 60
 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
 or v_slug=any(array['admin','cadastro','entrar','painel','criar-loja','demonstracao','auth','redefinir-senha','api','assets','www'])
 then raise exception 'Escolha um link com 3 a 60 letras minúsculas, números ou hífens.'; end if;
 if p_price is null or p_price not between 0 and 10000000
 or p_duration is null or p_duration not between 15 and 480 or p_duration%15<>0
 then raise exception 'Informe preço e duração válidos para o serviço.'; end if;

 perform pg_advisory_xact_lock(hashtextextended(v_user::text,42));
 select * into v_tenant from public.tenants where slug=v_slug;
 if found then
  if public.is_tenant_admin(v_tenant.id) then
   return jsonb_build_object('id',v_tenant.id,'slug',v_tenant.slug,'name',v_tenant.name);
  end if;
  raise exception 'Este link já está em uso. Escolha outro nome para o link.' using errcode='23505';
 end if;
 if (select count(*) from public.memberships where user_id=v_user and role='admin')>=10
 then raise exception 'Sua conta atingiu o limite de 10 lojas. Entre em contato com o suporte.'; end if;

 insert into public.tenants(slug,name,address,description)
 values(v_slug,trim(p_name),trim(p_address),'Um cuidado no seu tempo. Agende seu próximo momento.') returning * into v_tenant;
 insert into public.memberships(tenant_id,user_id,role) values(v_tenant.id,v_user,'admin');
 insert into public.professionals(tenant_id,name,specialty,initials)
 values(v_tenant.id,trim(p_professional_name),'Profissional',upper(left(trim(p_professional_name),2))) returning id into v_professional;
 insert into public.services(tenant_id,name,price,duration,category,icon)
 values(v_tenant.id,trim(p_service_name),p_price,p_duration,'Serviços','scissors') returning id into v_service;
 insert into public.professional_services(tenant_id,professional_id,service_id) values(v_tenant.id,v_professional,v_service);
 return jsonb_build_object('id',v_tenant.id,'slug',v_tenant.slug,'name',v_tenant.name);
exception when unique_violation then
 raise exception 'Este link já está em uso. Escolha outro nome para o link.' using errcode='23505';
end $$;
revoke all on function public.create_tenant(text,text,text,text,text,integer,integer) from public,anon;
grant execute on function public.create_tenant(text,text,text,text,text,integer,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
