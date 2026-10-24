\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.memberships(tenant_id,user_id,role) values('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','receptionist');
insert into public.tenants(id,slug,name) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','outra-gestao','Outra gestão');
insert into public.memberships(tenant_id,user_id,role) values('cccccccc-cccc-4ccc-8ccc-cccccccccccc','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','admin');
insert into public.customers(id,tenant_id,name,phone) values('dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111','Cliente Gestão','+5511999999999');
insert into public.bookings(tenant_id,professional_id,customer_id,name,phone,service_ids,service_snapshot,starts_at,ends_at,total,request_key)
select '11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333331','dddddddd-dddd-4ddd-8ddd-dddddddddddd','Cliente Gestão','+5511999999999',array['22222222-2222-4222-8222-222222222221']::uuid[],'[{"name":"Corte","price":12000}]',((current_date+n)+time '09:00') at time zone 'America/Sao_Paulo',((current_date+n)+time '10:00') at time zone 'America/Sao_Paulo',12000,gen_random_uuid() from generate_series(1,52) n;
set local role authenticated;
set local request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
do $$ declare result jsonb;b public.bookings;slot record;
begin
 result:=public.management_bookings('11111111-1111-4111-8111-111111111111',current_date,current_date+60);
 if (result->>'total')::int<>52 or jsonb_array_length(result->'rows')<>50 or (result->>'revenue')::int<>624000 then raise exception 'Pagination or totals broken';end if;
 result:=public.management_bookings('11111111-1111-4111-8111-111111111111',current_date,current_date+60,'',null,'',50);
 if jsonb_array_length(result->'rows')<>2 then raise exception 'Second page broken';end if;
 result:=public.management_bookings('11111111-1111-4111-8111-111111111111',current_date,current_date+60,'Cliente 11');
 if (result->>'total')::int<>0 then raise exception 'Name search matched an unrelated phone';end if;
 select * into b from public.bookings order by starts_at limit 1;
 perform public.update_booking_contact(b.tenant_id,b.id,'Nome corrigido','+5521988888888');
 if not exists(select 1 from public.bookings where id=b.id and name='Nome corrigido') then raise exception 'Contact not updated';end if;
 select s.* into slot from generate_series(current_date+1,current_date+7,interval '1 day') d cross join lateral public.available_slots(b.tenant_id,d::date,b.service_ids,b.professional_id,b.id) s limit 1;
 if slot.starts_at is null then raise exception 'Receptionist cannot query reschedule availability';end if;
 perform public.reschedule_booking(b.tenant_id,b.id,b.professional_id,slot.starts_at);
 update public.bookings set status='cancelled' where id=b.id;
 if not exists(select 1 from public.bookings where id=b.id and status='cancelled') then raise exception 'Receptionist cannot cancel';end if;
 update public.tenants set appearance='{"template":"pop"}' where id=b.tenant_id;
 if found then raise exception 'Receptionist changed branding';end if;
 begin perform public.management_bookings('cccccccc-cccc-4ccc-8ccc-cccccccccccc',current_date,current_date+1);raise exception 'Foreign bookings accessible';exception when insufficient_privilege then null;end;
 begin perform public.update_booking_contact('cccccccc-cccc-4ccc-8ccc-cccccccccccc',b.id,'Intruso','+5511999999999');raise exception 'Foreign contact edited';exception when insufficient_privilege then null;end;
 begin perform public.management_bookings(b.tenant_id,current_date,current_date+500);raise exception 'Unbounded range accepted';exception when raise_exception then if sqlerrm='Unbounded range accepted' then raise;end if;end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.management_bookings('11111111-1111-4111-8111-111111111111',current_date,current_date+60);raise exception 'Anonymous management access';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
\echo 'PASS: receptionist permissions, tenant isolation, pagination with full totals, contact correction, rescheduling and cancellation.'
