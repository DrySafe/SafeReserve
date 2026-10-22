\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.memberships(tenant_id,user_id,role) values('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','admin');
insert into public.tenants(id,slug,name) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','outra-identidade','Outra identidade');
insert into public.memberships(tenant_id,user_id,role) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','admin');
set local role authenticated;
set local request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.tenants set appearance='{"template":"barber","primary":"#e0b96b","mode":"dark","showProfessionals":false}' where id='11111111-1111-4111-8111-111111111111';
do $$ begin
 if not exists(select 1 from public.tenants where id='11111111-1111-4111-8111-111111111111' and appearance->>'template'='barber') then raise exception 'Own appearance not saved';end if;
 update public.tenants set appearance='{"template":"pop"}' where id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 if found then raise exception 'Other tenant appearance overwritten';end if;
 begin update public.tenants set appearance='{"primary":"red; background:url(evil)"}' where id='11111111-1111-4111-8111-111111111111';raise exception 'CSS injection accepted';exception when check_violation then null;end;
 begin update public.tenants set appearance='{"logoUrl":"javascript:alert(1)"}' where id='11111111-1111-4111-8111-111111111111';raise exception 'Unsafe URL accepted';exception when check_violation then null;end;
 begin update public.tenants set appearance='{"showBenefits":null}' where id='11111111-1111-4111-8111-111111111111';raise exception 'Null boolean accepted';exception when check_violation then null;end;
 begin update public.tenants set appearance='{"customCss":"arbitrary css"}' where id='11111111-1111-4111-8111-111111111111';raise exception 'Unknown setting accepted';exception when check_violation then null;end;
end $$;
insert into storage.objects(bucket_id,name) values('storefront-media','11111111-1111-4111-8111-111111111111/logo.webp');
do $$ begin
 begin insert into storage.objects(bucket_id,name) values('storefront-media','cccccccc-cccc-4ccc-8ccc-cccccccccccc/foreign.webp');raise exception 'Foreign media upload accepted';exception when insufficient_privilege then null;end;
end $$;
set local request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$ begin
 if exists(select 1 from storage.objects where name='11111111-1111-4111-8111-111111111111/logo.webp') then raise exception 'Foreign private media listing accepted';end if;
 delete from storage.objects where name='11111111-1111-4111-8111-111111111111/logo.webp';if found then raise exception 'Foreign media deleted';end if;
end $$;
reset role;
set local role anon;
do $$ begin
 if not exists(select 1 from public.tenants where slug='studio-aurora' and appearance->>'template'='barber') then raise exception 'Public appearance unavailable';end if;
 begin update public.tenants set appearance='{}' where slug='studio-aurora';raise exception 'Anonymous appearance update accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
\echo 'PASS: per-tenant appearance, public rendering, structured validation, owner-only publication and media isolation.'
