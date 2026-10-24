begin;
create or replace function public.valid_storefront_appearance(settings jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text; v jsonb; t text; ok boolean;
begin
 if jsonb_typeof(settings) is distinct from 'object' then return false; end if;
 for k,v in select key,value from jsonb_each(settings) loop
  t:=v #>> '{}';
  case k
   when 'version' then ok:=jsonb_typeof(v)='number' and t='1';
   when 'template' then ok:=jsonb_typeof(v)='string' and t=any(array['essencia','barber','atelier','pop','minimal']);
   when 'font' then ok:=jsonb_typeof(v)='string' and t=any(array['editorial','modern','rounded','bold']);
   when 'shape' then ok:=jsonb_typeof(v)='string' and t=any(array['square','soft','round']);
   when 'mode' then ok:=jsonb_typeof(v)='string' and t=any(array['dark','light','system']);
   when 'background' then ok:=jsonb_typeof(v)='string' and t=any(array['neutral','warm','tinted']);
   when 'servicesView' then ok:=jsonb_typeof(v)='string' and t=any(array['cards','list']);
   when 'density' then ok:=jsonb_typeof(v)='string' and t=any(array['comfortable','compact']);
   when 'media' then ok:=jsonb_typeof(v)='string' and t=any(array['illustration','photo','none']);
   when 'coverPosition' then ok:=jsonb_typeof(v)='string' and t=any(array['top','center','bottom']);
   when 'primary','secondary' then ok:=jsonb_typeof(v)='string' and t ~ '^#[0-9a-fA-F]{6}$';
   when 'headline' then ok:=jsonb_typeof(v)='string' and char_length(t)<=120;
   when 'eyebrow' then ok:=jsonb_typeof(v)='string' and char_length(t)<=60;
   when 'cta' then ok:=jsonb_typeof(v)='string' and char_length(t)<=40;
   when 'description' then ok:=jsonb_typeof(v)='string' and char_length(t)<=300;
   when 'closing' then ok:=jsonb_typeof(v)='string' and char_length(t)<=140;
   when 'logoUrl','coverUrl','faviconUrl','icon192Url' then ok:=jsonb_typeof(v)='string' and char_length(t)<=2048 and (t='' or t ~ '^https://[^[:space:]@]+$');
   when 'instagram' then ok:=jsonb_typeof(v)='string' and char_length(t)<=2048 and (t='' or t ~ '^https://(www\.)?instagram\.com(/[^[:space:]]*)?$');
   when 'whatsapp' then ok:=jsonb_typeof(v)='string' and (t='' or t ~ '^[+0-9()[:space:]-]{10,24}$');
   when 'showAddress','showBenefits','showProfessionals','showClosing','showDescriptions','colorfulServices' then ok:=jsonb_typeof(v)='boolean';
   else return false;
  end case;
  if ok is not true then return false;end if;
 end loop;
 return true;
end $$;

alter table public.memberships drop constraint memberships_role_check;
alter table public.memberships add constraint memberships_role_check check(role in ('admin','professional','receptionist'));
create function public.is_tenant_operator(p_tenant uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.memberships where tenant_id=p_tenant and user_id=auth.uid() and role in ('admin','receptionist'));
$$;
revoke all on function public.is_tenant_operator(uuid) from public;
grant execute on function public.is_tenant_operator(uuid) to authenticated;
create policy booking_operator_read on public.bookings for select to authenticated using(public.is_tenant_operator(tenant_id));
create policy booking_operator_update on public.bookings for update to authenticated using(public.is_tenant_operator(tenant_id)) with check(public.is_tenant_operator(tenant_id));
create or replace function public.reschedule_booking(p_tenant uuid,p_booking uuid,p_professional uuid,p_starts timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare b public.bookings; v_zone text; v_duration interval; p public.professionals;
begin
 if not public.is_tenant_operator(p_tenant) then raise exception 'Acesso negado.' using errcode='42501'; end if;
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


create or replace function public.available_slots(p_tenant uuid,p_date date,p_services uuid[],p_professional uuid default null,p_exclude uuid default null)
returns table(starts_at timestamptz,professional_id uuid,recommended boolean)
language plpgsql stable security definer set search_path='' as $$
declare v_duration integer; v_count integer; v_zone text;
begin
 if p_services is null or cardinality(p_services) not between 1 and 8 then return; end if;
 select t.timezone into v_zone from public.tenants t where t.id=p_tenant and t.active;
 if v_zone is null or p_date<(now() at time zone v_zone)::date or p_date>(now() at time zone v_zone)::date+60 then return; end if;
 if p_exclude is not null and not public.is_tenant_operator(p_tenant) then raise exception 'Acesso negado' using errcode='42501'; end if;
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


-- Date boundaries use the establishment timezone, including daylight-saving rules.
create function public.management_bookings(p_tenant uuid,p_from date,p_until date,p_search text default '',p_professional uuid default null,p_status text default '',p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; zone text;
begin
 if not public.is_tenant_operator(p_tenant) then raise exception 'Acesso negado.' using errcode='42501';end if;
 if p_from is null or p_until is null or p_until<p_from or p_until-p_from>365 or p_offset<0 or p_offset is null or char_length(p_search)>100 or p_status not in ('','confirmed','cancelled') then raise exception 'Filtros inválidos. Escolha até 366 dias.';end if;
 select timezone into zone from public.tenants where id=p_tenant;
 with filtered as (
  select b.* from public.bookings b where b.tenant_id=p_tenant
  and b.starts_at>=p_from::timestamp at time zone zone and b.starts_at<(p_until+1)::timestamp at time zone zone
  and (p_professional is null or b.professional_id=p_professional) and (p_status='' or b.status=p_status)
  and (coalesce(p_search,'')='' or strpos(lower(b.name),lower(p_search))>0 or p_search ~ '^[+0-9()[:space:]-]+$' and strpos(b.phone,regexp_replace(p_search,'[^0-9]','','g'))>0 and regexp_replace(p_search,'[^0-9]','','g')<>'')
 ), page as (select * from filtered order by starts_at,id limit 50 offset p_offset)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page) order by starts_at,id) from page),'[]'::jsonb),'total',count(*),'confirmed',count(*) filter(where status='confirmed'),'cancelled',count(*) filter(where status='cancelled'),'revenue',coalesce(sum(total) filter(where status='confirmed'),0)) into result from filtered;
 return result;
end $$;
revoke all on function public.management_bookings(uuid,date,date,text,uuid,text,integer) from public;
grant execute on function public.management_bookings(uuid,date,date,text,uuid,text,integer) to authenticated;

create function public.update_booking_contact(p_tenant uuid,p_booking uuid,p_name text,p_phone text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_tenant_operator(p_tenant) then raise exception 'Acesso negado.' using errcode='42501';end if;
 if p_name is null or char_length(trim(p_name))<2 or char_length(trim(p_name))>100 or p_phone is null or p_phone !~ '^\+55[0-9]{10,11}$' then raise exception 'Nome ou WhatsApp inválido.';end if;
 update public.bookings set name=trim(p_name),phone=p_phone where tenant_id=p_tenant and id=p_booking;
 if not found then raise exception 'Agendamento não encontrado.';end if;
end $$;
revoke all on function public.update_booking_contact(uuid,uuid,text,text) from public;
grant execute on function public.update_booking_contact(uuid,uuid,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
