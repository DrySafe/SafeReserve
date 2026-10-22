\set ON_ERROR_STOP on
begin;
insert into public.tenants(id,slug,name,active) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','outro-salao','Outro salão',true),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','salon-inativo','Inativo',false);
insert into public.services(tenant_id,name,price,duration) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Serviço oculto',1000,30);
insert into auth.users(id) values('44444444-4444-4444-8444-444444444444'),('55555555-5555-4555-8555-555555555555');
insert into public.memberships(tenant_id,user_id,role) values
 ('11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444444','admin'),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','55555555-5555-4555-8555-555555555555','admin');
create temporary table ctx(day date,start_at timestamptz,booking_id uuid);
insert into ctx(day) select d::date from generate_series(current_date+1,current_date+7,interval '1 day') d where extract(dow from d) between 1 and 6 limit 1;
update ctx set start_at=(day+time '10:00') at time zone 'America/Sao_Paulo';
grant select,update on ctx to anon,authenticated;

set local role anon;
do $$ declare slots integer; begin
 if (select count(*) from public.services)<>6 then raise exception 'Inactive tenant catalog leaked'; end if;
 select count(*) into slots from public.available_slots('11111111-1111-4111-8111-111111111111',(select day from ctx),array['22222222-2222-4222-8222-222222222221']::uuid[],null);
 if slots<=0 then raise exception 'No public availability'; end if;
 if exists(select 1 from public.available_slots('11111111-1111-4111-8111-111111111111',(select day from ctx),array['22222222-2222-4222-8222-222222222221','22222222-2222-4222-8222-222222222222']::uuid[],null)) then raise exception 'Incompatible multi-service accepted'; end if;
 begin perform * from public.customers;raise exception 'Anonymous customer access accepted';exception when insufficient_privilege then null;end;
 begin perform * from public.bookings;raise exception 'Anonymous booking access accepted';exception when insufficient_privilege then null;end;
 begin perform * from public.integration_outbox;raise exception 'Anonymous outbox access accepted';exception when insufficient_privilege then null;end;
 begin insert into public.bookings(tenant_id) values('11111111-1111-4111-8111-111111111111');raise exception 'Direct insert accepted';exception when insufficient_privilege then null;end;
end $$;
select public.create_booking('11111111-1111-4111-8111-111111111111',array['22222222-2222-4222-8222-222222222221']::uuid[],'33333333-3333-4333-8333-333333333331',(select start_at from ctx),'Teste SQL','+5511999999999','66666666-6666-4666-8666-666666666666');
-- An identical retry returns the same booking, not a second write.
select public.create_booking('11111111-1111-4111-8111-111111111111',array['22222222-2222-4222-8222-222222222221']::uuid[],'33333333-3333-4333-8333-333333333331',(select start_at from ctx),'Teste SQL','+5511999999999','66666666-6666-4666-8666-666666666666');
do $$ begin
 if exists(select 1 from public.available_slots('11111111-1111-4111-8111-111111111111',(select day from ctx),array['22222222-2222-4222-8222-222222222221']::uuid[],'33333333-3333-4333-8333-333333333331') where starts_at between (select start_at-interval '45 minutes' from ctx) and (select start_at+interval '45 minutes' from ctx)) then raise exception 'Overlap exposed as available'; end if;
 begin
 perform public.create_booking('11111111-1111-4111-8111-111111111111',array['22222222-2222-4222-8222-222222222221']::uuid[],'33333333-3333-4333-8333-333333333331',(select start_at from ctx),'Outro cliente','+5511888888888',gen_random_uuid());
 raise exception 'Overlap accepted';
 exception when raise_exception then if sqlerrm not like 'Horário indisponível%' then raise;end if;end;
 begin
 perform public.create_booking('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',array['22222222-2222-4222-8222-222222222221']::uuid[],'33333333-3333-4333-8333-333333333331',(select start_at from ctx),'Outro tenant','+5511888888888',gen_random_uuid());
 raise exception 'Cross tenant services accepted';
 exception when raise_exception then if sqlerrm not like 'Horário indisponível%' then raise;end if;end;
end $$;
reset role;
update ctx set booking_id=(select id from public.bookings limit 1);
do $$ begin
 if (select count(*) from public.bookings)<>1 then raise exception 'Idempotency failed';end if;
 if (select count(*) from public.integration_outbox where event_type='Agendamento_Criado')<>1 then raise exception 'Created event missing or duplicated';end if;
end $$;
set local role authenticated;
set local request.jwt.claim.sub='55555555-5555-4555-8555-555555555555';
do $$ begin
 if exists(select 1 from public.bookings) or exists(select 1 from public.customers) then raise exception 'Cross tenant PII leaked';end if;
 update public.services set price=1 where tenant_id='11111111-1111-4111-8111-111111111111';
 if found then raise exception 'Cross tenant update accepted';end if;
 begin insert into public.memberships(tenant_id,user_id,role) values('11111111-1111-4111-8111-111111111111',auth.uid(),'admin');raise exception 'Self elevation accepted';exception when insufficient_privilege then null;end;
end $$;
set local request.jwt.claim.sub='44444444-4444-4444-8444-444444444444';
do $$ begin
 if (select count(*) from public.bookings)<>1 or (select count(*) from public.customers)<>1 then raise exception 'Admin cannot read own tenant';end if;
 begin update public.bookings set starts_at=now();raise exception 'Unvalidated direct reschedule accepted';exception when insufficient_privilege then null;end;
end $$;
select public.reschedule_booking('11111111-1111-4111-8111-111111111111',(select booking_id from ctx),'33333333-3333-4333-8333-333333333331',(select start_at+interval '2 hours' from ctx));
update public.bookings set status='cancelled' where id=(select booking_id from ctx);
reset role;
do $$ begin
 if (select version from public.bookings limit 1)<>3 then raise exception 'Version did not advance';end if;
 if (select count(*) from public.integration_outbox)<>3 then raise exception 'Updated/cancelled events missing';end if;
 if not exists(select 1 from public.integration_outbox where event_type='Agendamento_Alterado') or not exists(select 1 from public.integration_outbox where event_type='Agendamento_Cancelado') then raise exception 'Event names wrong';end if;
end $$;
set local role anon;
select public.join_waitlist('11111111-1111-4111-8111-111111111111',array['22222222-2222-4222-8222-222222222221']::uuid[],null,(select day from ctx),'Na fila','+5511777777777');
reset role;
set local role service_role;
select public.enqueue_waitlist_offers();
do $$ begin
 if (select count(*) from public.integration_outbox where event_type='Lista_Espera_Disponivel')<>1 then raise exception 'Waitlist offer not enqueued';end if;
 if (select count(*) from public.claim_integration_events(20))<>4 then raise exception 'Outbox lease failed';end if;
 if (select count(*) from public.claim_integration_events(20))<>0 then raise exception 'Outbox leased twice';end if;
end $$;
reset role;
rollback;
\echo 'PASS: catalog visibility, RLS, guest booking, idempotency, overlaps, tenant ownership, admin role, rescheduling, events, waitlist and worker leases.'
