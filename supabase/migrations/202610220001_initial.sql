-- Atomic setup: failure rolls back this migration without affecting unrelated tables.
begin;

-- SafeReserve: apply using the Supabase SQL editor or `supabase db push`.
create extension if not exists btree_gist with schema extensions;

create table public.tenants (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid generated always as (id) stored,
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
 name text not null, tagline text, description text, address text not null default '',
 timezone text not null default 'America/Sao_Paulo', active boolean not null default true,
 popup jsonb not null default '{"enabled":false,"title":"","message":""}'
);
create table public.memberships (
 tenant_id uuid not null references public.tenants(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('admin','professional')), primary key(tenant_id,user_id)
);
create table public.services (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 name text not null, description text not null default '', category text not null default 'Cuidado',
 price integer not null check(price>=0 and price<=10000000), duration integer not null check(duration between 15 and 480 and duration%15=0),
 icon text not null default 'sparkles', color text not null default 'sage', tag text, photo_url text check(photo_url is null or photo_url='' or photo_url like 'https://%'),
 active boolean not null default true, unique(tenant_id,id)
);
create table public.professionals (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 name text not null, specialty text not null default '', initials text, photo_url text, color text default 'sage', active boolean not null default true,
 work_start time not null default '09:00', work_end time not null default '18:00', weekdays integer[] not null default array[1,2,3,4,5,6],
 check(work_end>work_start), unique(tenant_id,id)
);
create table public.professional_services (
 tenant_id uuid not null, professional_id uuid not null, service_id uuid not null,
 primary key(tenant_id,professional_id,service_id),
 foreign key(tenant_id,professional_id) references public.professionals(tenant_id,id) on delete cascade,
 foreign key(tenant_id,service_id) references public.services(tenant_id,id) on delete cascade
);
create table public.customers (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 name text not null, phone text not null check(phone ~ '^\+[1-9][0-9]{9,14}$'),
 created_at timestamptz not null default now(), unique(tenant_id,phone), unique(tenant_id,id)
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 professional_id uuid not null, customer_id uuid not null, user_id uuid references auth.users(id),
 name text not null, phone text not null, service_ids uuid[] not null,
 service_snapshot jsonb not null, starts_at timestamptz not null, ends_at timestamptz not null,
 total integer not null check(total>=0), status text not null default 'confirmed' check(status in ('confirmed','cancelled')),
 request_key uuid not null, version integer not null default 1, created_at timestamptz not null default now(),
 check(ends_at>starts_at), unique(tenant_id,request_key), unique(tenant_id,id),
 foreign key(tenant_id,professional_id) references public.professionals(tenant_id,id),
 foreign key(tenant_id,customer_id) references public.customers(tenant_id,id),
 exclude using gist (professional_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (status='confirmed')
);
create index bookings_tenant_start on public.bookings(tenant_id,starts_at);
create index bookings_phone_created on public.bookings(tenant_id,phone,created_at);
create table public.time_blocks (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), professional_id uuid not null,
 starts_at timestamptz not null, ends_at timestamptz not null, reason text not null default '', check(ends_at>starts_at),
 foreign key(tenant_id,professional_id) references public.professionals(tenant_id,id)
);
create table public.waitlist (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 service_ids uuid[] not null, professional_id uuid, requested_date date not null,
 name text not null, phone text not null, status text not null default 'waiting' check(status in ('waiting','notified','booked','expired')),
 consent_at timestamptz not null default now(), created_at timestamptz not null default now(),
 foreign key(tenant_id,professional_id) references public.professionals(tenant_id,id)
);
create index waitlist_queue on public.waitlist(tenant_id,requested_date,created_at) where status='waiting';
create table public.products (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id), name text not null,
 description text not null default '', photo_url text, price integer not null check(price>=0), active boolean not null default true
);
create table public.integration_outbox (
 id uuid primary key default gen_random_uuid(), tenant_id uuid not null references public.tenants(id),
 event_type text not null, event_key text not null unique, payload jsonb not null,
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 locked_until timestamptz, delivered_at timestamptz, created_at timestamptz not null default now()
);
create index outbox_pending on public.integration_outbox(next_attempt_at) where delivered_at is null;

-- Authorization comes from immutable server-managed memberships, never editable user_metadata.
create function public.is_tenant_admin(p_tenant uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where tenant_id=p_tenant and user_id=auth.uid() and role='admin');
$$;
revoke all on function public.is_tenant_admin(uuid) from public;
grant execute on function public.is_tenant_admin(uuid) to anon,authenticated;

alter table public.tenants enable row level security;
create policy tenant_read on public.tenants for select using(active or public.is_tenant_admin(id));
create policy tenant_admin_update on public.tenants for update to authenticated using(public.is_tenant_admin(id)) with check(public.is_tenant_admin(id));
alter table public.memberships enable row level security;
create policy membership_read on public.memberships for select to authenticated using(user_id=auth.uid());
-- Membership provisioning is deliberately restricted to a trusted migration/service role.
do $$ declare t text; begin
 foreach t in array array['services','professionals','professional_services','products'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy catalog_read on public.%I for select using(exists(select 1 from public.tenants t where t.id=%I.tenant_id and t.active))',t,t);
  execute format('create policy catalog_admin on public.%I for all to authenticated using(public.is_tenant_admin(tenant_id)) with check(public.is_tenant_admin(tenant_id))',t);
 end loop;
 foreach t in array array['customers','bookings','time_blocks','waitlist'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy private_admin on public.%I for all to authenticated using(public.is_tenant_admin(tenant_id)) with check(public.is_tenant_admin(tenant_id))',t);
 end loop;
end $$;
alter table public.integration_outbox enable row level security;
-- No browser policy or grants for the outbox, even for admins: it contains private delivery payloads.
revoke all on public.tenants, public.memberships, public.services, public.professionals, public.professional_services, public.customers, public.bookings, public.time_blocks, public.waitlist, public.products, public.integration_outbox from anon,authenticated;
grant select on public.tenants,public.services,public.professionals,public.professional_services,public.products to anon,authenticated;
grant select on public.memberships,public.customers,public.bookings,public.time_blocks,public.waitlist to authenticated;
grant update(popup,name,tagline,description,address) on public.tenants to authenticated;
grant insert,update,delete on public.services,public.professionals,public.professional_services,public.products,public.time_blocks to authenticated;
grant update(status) on public.bookings to authenticated;
grant update(status) on public.waitlist to authenticated;
grant all on public.tenants, public.memberships, public.services, public.professionals, public.professional_services, public.customers, public.bookings, public.time_blocks, public.waitlist, public.products, public.integration_outbox to service_role;

-- The only public availability surface. No customer identifiers or booking IDs leave this function.
create function public.available_slots(p_tenant uuid,p_date date,p_services uuid[],p_professional uuid default null,p_exclude uuid default null)
returns table(starts_at timestamptz,professional_id uuid,recommended boolean)
language plpgsql stable security definer set search_path='' as $$
declare v_duration integer; v_count integer; v_zone text;
begin
 if p_services is null or cardinality(p_services) not between 1 and 8 then return; end if;
 select t.timezone into v_zone from public.tenants t where t.id=p_tenant and t.active;
 if v_zone is null or p_date<(now() at time zone v_zone)::date or p_date>(now() at time zone v_zone)::date+60 then return; end if;
 if p_exclude is not null and not public.is_tenant_admin(p_tenant) then raise exception 'Acesso negado' using errcode='42501'; end if;
 select sum(s.duration),count(*) into v_duration,v_count from public.services s where s.tenant_id=p_tenant and s.id=any(p_services) and s.active;
 if v_count<>cardinality(p_services) or v_duration>480 then return; end if;
 if p_exclude is not null then
  select extract(epoch from b.ends_at-b.starts_at)::integer/60 into v_duration from public.bookings b where b.tenant_id=p_tenant and b.id=p_exclude and b.status='confirmed';
  if v_duration is null then return; end if;
 end if;
 return query
 with pros as (
  select p.*, (p_date+p.work_start) at time zone v_zone as day_start,(p_date+p.work_end) at time zone v_zone as day_end
  from public.professionals p where p.tenant_id=p_tenant and p.active and (p_professional is null or p.id=p_professional)
  and extract(dow from p_date)::integer=any(p.weekdays)
  and not exists(select 1 from unnest(p_services) sid where not exists(select 1 from public.professional_services ps where ps.tenant_id=p_tenant and ps.professional_id=p.id and ps.service_id=sid))
 ), slots as (
  select p.id,p.day_start,p.day_end,g as start_at,g+make_interval(mins=>v_duration) as end_at from pros p
  cross join lateral generate_series(p.day_start,p.day_end-make_interval(mins=>v_duration),interval '15 minutes') g
 )
 select s.start_at,s.id,(s.start_at=s.day_start or s.end_at=s.day_end or exists(
  select 1 from public.bookings b where b.tenant_id=p_tenant and b.professional_id=s.id and b.status='confirmed' and (p_exclude is null or b.id<>p_exclude) and (b.ends_at=s.start_at or b.starts_at=s.end_at)
 )) from slots s where s.start_at>now()
 and not exists(select 1 from public.bookings b where b.tenant_id=p_tenant and b.professional_id=s.id and b.status='confirmed' and (p_exclude is null or b.id<>p_exclude) and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(s.start_at,s.end_at,'[)'))
 and not exists(select 1 from public.time_blocks b where b.tenant_id=p_tenant and b.professional_id=s.id and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(s.start_at,s.end_at,'[)'))
 order by s.start_at;
end $$;
revoke all on function public.available_slots(uuid,date,uuid[],uuid,uuid) from public;
grant execute on function public.available_slots(uuid,date,uuid[],uuid,uuid) to anon,authenticated;

create function public.create_booking(p_tenant uuid,p_services uuid[],p_professional uuid,p_starts timestamptz,p_name text,p_phone text,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_zone text; v_duration integer; v_total integer; v_snapshot jsonb; v_customer uuid; v_booking public.bookings; v_prior public.bookings;
begin
 if char_length(trim(p_name)) not between 2 and 80 or p_phone !~ '^\+[1-9][0-9]{9,14}$' or p_name is null or p_phone is null or p_request_key is null then raise exception 'Nome ou WhatsApp inválido.'; end if;
 -- Serialize retries for the same key and cap attempts for a phone number; the exclusion constraint arbitrates competing customers.
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||p_request_key::text,0));
 select * into v_prior from public.bookings b where b.tenant_id=p_tenant and b.request_key=p_request_key;
 if found then return jsonb_build_object('id',v_prior.id,'starts_at',v_prior.starts_at,'ends_at',v_prior.ends_at,'professional_id',v_prior.professional_id,'total',v_prior.total,'status',v_prior.status); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||p_phone,1));
 if (select count(*) from public.bookings b where b.tenant_id=p_tenant and b.phone=p_phone and b.created_at>now()-interval '1 hour')>=5 then raise exception 'Muitas reservas recentes. Entre em contato com o estabelecimento.'; end if;
 select t.timezone into v_zone from public.tenants t where t.id=p_tenant and t.active;
 if v_zone is null then raise exception 'Estabelecimento não encontrado.'; end if;
 -- Also serialize staff/block edits and reservations for this professional.
 perform 1 from public.professionals where tenant_id=p_tenant and id=p_professional for update;
 if not exists(select 1 from public.available_slots(p_tenant,(p_starts at time zone v_zone)::date,p_services,p_professional) s where s.starts_at=p_starts) then raise exception 'Horário indisponível. Escolha outro horário.'; end if;
 select sum(duration),sum(price),jsonb_agg(jsonb_build_object('id',id,'name',name,'duration',duration,'price',price)) into v_duration,v_total,v_snapshot from public.services where tenant_id=p_tenant and id=any(p_services) and active;
 insert into public.customers(tenant_id,name,phone) values(p_tenant,trim(p_name),p_phone) on conflict(tenant_id,phone) do update set phone=excluded.phone returning id into v_customer;
 insert into public.bookings(tenant_id,professional_id,customer_id,user_id,name,phone,service_ids,service_snapshot,starts_at,ends_at,total,request_key)
 values(p_tenant,p_professional,v_customer,auth.uid(),trim(p_name),p_phone,p_services,v_snapshot,p_starts,p_starts+make_interval(mins=>v_duration),v_total,p_request_key) returning * into v_booking;
 return jsonb_build_object('id',v_booking.id,'starts_at',v_booking.starts_at,'ends_at',v_booking.ends_at,'professional_id',v_booking.professional_id,'total',v_booking.total,'status',v_booking.status);
exception when exclusion_violation then raise exception 'Este horário acabou de ser reservado. Escolha outro.';
end $$;
revoke all on function public.create_booking(uuid,uuid[],uuid,timestamptz,text,text,uuid) from public;
grant execute on function public.create_booking(uuid,uuid[],uuid,timestamptz,text,text,uuid) to anon,authenticated;

create function public.join_waitlist(p_tenant uuid,p_services uuid[],p_professional uuid,p_date date,p_name text,p_phone text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_zone text;
begin
 select timezone into v_zone from public.tenants where id=p_tenant and active;
 if v_zone is null or p_date is null or p_date<(now() at time zone v_zone)::date or p_date>(now() at time zone v_zone)::date+60 then raise exception 'Data inválida.'; end if;
 if p_name is null or p_phone is null or char_length(trim(p_name)) not between 2 and 80 or p_phone !~ '^\+[1-9][0-9]{9,14}$' then raise exception 'Nome ou WhatsApp inválido.'; end if;
 if p_services is null or cardinality(p_services) not between 1 and 8 or cardinality(p_services)<>(select count(*) from public.services where tenant_id=p_tenant and id=any(p_services) and active) then raise exception 'Serviços inválidos.'; end if;
 if p_professional is not null and not exists(select 1 from public.professionals p where p.tenant_id=p_tenant and p.id=p_professional and p.active and not exists(select 1 from unnest(p_services) sid where not exists(select 1 from public.professional_services ps where ps.tenant_id=p_tenant and ps.professional_id=p.id and ps.service_id=sid))) then raise exception 'Profissional inválido.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||p_phone,1));
 if (select count(*) from public.waitlist where tenant_id=p_tenant and phone=p_phone and created_at>now()-interval '1 day')>=3 then raise exception 'Você já tem solicitações recentes na lista.'; end if;
 insert into public.waitlist(tenant_id,service_ids,professional_id,requested_date,name,phone) values(p_tenant,p_services,p_professional,p_date,trim(p_name),p_phone) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.join_waitlist(uuid,uuid[],uuid,date,text,text) from public;
grant execute on function public.join_waitlist(uuid,uuid[],uuid,date,text,text) to anon,authenticated;

-- Admin-only rescheduling with the original duration/price preserved.
create function public.reschedule_booking(p_tenant uuid,p_booking uuid,p_professional uuid,p_starts timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; v_zone text; v_duration interval; p public.professionals;
begin
 if not public.is_tenant_admin(p_tenant) then raise exception 'Acesso negado.' using errcode='42501'; end if;
 select * into b from public.bookings where tenant_id=p_tenant and id=p_booking for update;
 if not found or b.status<>'confirmed' then raise exception 'Agendamento não encontrado ou cancelado.'; end if;
 select timezone into v_zone from public.tenants where id=p_tenant;
 select * into p from public.professionals where tenant_id=p_tenant and id=p_professional and active for update;
 v_duration:=b.ends_at-b.starts_at;
 if not found or p_starts is null or p_starts<=now() or p_starts>now()+interval '60 days' or extract(dow from p_starts at time zone v_zone)::integer<>all(p.weekdays)
 or (p_starts at time zone v_zone)::time<p.work_start or ((p_starts+v_duration) at time zone v_zone)::date<>(p_starts at time zone v_zone)::date or ((p_starts+v_duration) at time zone v_zone)::time>p.work_end
 or not exists(select 1 from public.available_slots(p_tenant,(p_starts at time zone v_zone)::date,b.service_ids,p_professional,p_booking) s where s.starts_at=p_starts)
 or exists(select 1 from public.bookings x where x.tenant_id=p_tenant and x.professional_id=p_professional and x.id<>b.id and x.status='confirmed' and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(p_starts,p_starts+v_duration,'[)'))
 or exists(select 1 from public.time_blocks x where x.tenant_id=p_tenant and x.professional_id=p_professional and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(p_starts,p_starts+v_duration,'[)')) then raise exception 'Horário indisponível.'; end if;
 update public.bookings set professional_id=p_professional,starts_at=p_starts,ends_at=p_starts+v_duration where id=b.id;
end $$;
revoke all on function public.reschedule_booking(uuid,uuid,uuid,timestamptz) from public;
grant execute on function public.reschedule_booking(uuid,uuid,uuid,timestamptz) to authenticated;

create function public.booking_outbox_trigger() returns trigger language plpgsql security definer set search_path='' as $$
declare v_event text;
begin
 if tg_op='UPDATE' then
  if (new.starts_at,new.ends_at,new.professional_id,new.status) is not distinct from (old.starts_at,old.ends_at,old.professional_id,old.status) then return new; end if;
  new.version:=old.version+1;
 end if;
 v_event:=case when tg_op='INSERT' then 'Agendamento_Criado' when new.status='cancelled' then 'Agendamento_Cancelado' else 'Agendamento_Alterado' end;
 insert into public.integration_outbox(tenant_id,event_type,event_key,payload) values(new.tenant_id,v_event,new.id||':'||new.version,
 jsonb_build_object('booking_id',new.id,'tenant_id',new.tenant_id,'version',new.version,'name',new.name,'phone',new.phone,'professional_id',new.professional_id,'starts_at',new.starts_at,'ends_at',new.ends_at,'services',new.service_snapshot,'status',new.status,'user_id',new.user_id));
 return new;
end $$;
revoke all on function public.booking_outbox_trigger() from public;
create trigger booking_events before insert or update on public.bookings for each row execute function public.booking_outbox_trigger();

-- Lease, retries and SKIP LOCKED support multiple workers. Service-role only.
create function public.claim_integration_events(p_limit integer default 20)
returns setof public.integration_outbox language sql security definer set search_path='' as $$
 update public.integration_outbox set locked_until=now()+interval '5 minutes', attempts=attempts+1
 where id in (select id from public.integration_outbox where delivered_at is null and next_attempt_at<=now() and (locked_until is null or locked_until<now()) and attempts<12 order by created_at for update skip locked limit least(greatest(p_limit,1),50)) returning *;
$$;
-- Run each minute. Unique keys prevent duplicate reminders; late runs do not send after the service starts.
create function public.enqueue_reminders() returns void language sql security definer set search_path='' as $$
 insert into public.integration_outbox(tenant_id,event_type,event_key,payload)
 select b.tenant_id,'Lembrete_Agendamento',b.id||':reminder:'||b.version,jsonb_build_object('booking_id',b.id,'tenant_id',b.tenant_id,'version',b.version,'name',b.name,'phone',b.phone,'professional_id',b.professional_id,'starts_at',b.starts_at,'ends_at',b.ends_at,'services',b.service_snapshot)
 from public.bookings b where b.status='confirmed' and b.starts_at between now()+interval '115 minutes' and now()+interval '120 minutes' on conflict(event_key) do nothing;
$$;
revoke all on function public.claim_integration_events(integer),public.enqueue_reminders() from public,anon,authenticated;
grant execute on function public.claim_integration_events(integer),public.enqueue_reminders() to service_role;

-- Prevent a new block from racing an in-flight booking. Conflicting existing appointments must be moved first.
create function public.check_time_block() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.professionals where tenant_id=new.tenant_id and id=new.professional_id for update;
 if exists(select 1 from public.bookings b where b.tenant_id=new.tenant_id and b.professional_id=new.professional_id and b.status='confirmed' and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(new.starts_at,new.ends_at,'[)')) then raise exception 'O bloqueio conflita com um agendamento existente.'; end if;
 return new;
end $$;
revoke all on function public.check_time_block() from public;
create trigger validate_time_block before insert or update on public.time_blocks for each row execute function public.check_time_block();

-- One time-limited offer per tenant/day; FIFO among customers whose complete service fits.
alter table public.waitlist add column notified_at timestamptz;
create function public.enqueue_waitlist_offers() returns void language plpgsql security definer set search_path='' as $$
declare w public.waitlist; s record;
begin
 update public.waitlist set status='expired' where status='notified' and notified_at<now()-interval '15 minutes';
 update public.waitlist entry set status='expired' from public.tenants t where entry.tenant_id=t.id and entry.status='waiting' and entry.requested_date<(now() at time zone t.timezone)::date;
 for w in select * from public.waitlist where status='waiting' order by created_at for update skip locked limit 50 loop
  perform pg_advisory_xact_lock(hashtextextended(w.tenant_id::text||w.requested_date::text,2));
  if exists(select 1 from public.waitlist x where x.tenant_id=w.tenant_id and x.requested_date=w.requested_date and x.status='notified') then continue; end if;
  select * into s from public.available_slots(w.tenant_id,w.requested_date,w.service_ids,w.professional_id) order by recommended desc,starts_at limit 1;
  if found then
   insert into public.integration_outbox(tenant_id,event_type,event_key,payload) values(w.tenant_id,'Lista_Espera_Disponivel',w.id||':offer',jsonb_build_object('waitlist_id',w.id,'tenant_id',w.tenant_id,'name',w.name,'phone',w.phone,'starts_at',s.starts_at,'professional_id',s.professional_id,'service_ids',w.service_ids,'expires_at',now()+interval '15 minutes')) on conflict(event_key) do nothing;
   update public.waitlist set status='notified',notified_at=now() where id=w.id;
  end if;
 end loop;
end $$;
revoke all on function public.enqueue_waitlist_offers() from public,anon,authenticated;
grant execute on function public.enqueue_waitlist_offers() to service_role;
create function public.complete_waitlist() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.waitlist w set status='booked' from public.tenants t where w.tenant_id=new.tenant_id and t.id=w.tenant_id and w.phone=new.phone and w.requested_date=(new.starts_at at time zone t.timezone)::date and w.service_ids @> new.service_ids and w.service_ids <@ new.service_ids and w.status in ('waiting','notified');
 return new;
end $$;
revoke all on function public.complete_waitlist() from public;
create trigger complete_booking_waitlist after insert on public.bookings for each row execute function public.complete_waitlist();

notify pgrst, 'reload schema';
commit;
