begin;

-- Store structured presentation choices, never executable HTML or arbitrary CSS.
create function public.valid_storefront_appearance(settings jsonb) returns boolean
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
   when 'logoUrl','coverUrl' then ok:=jsonb_typeof(v)='string' and char_length(t)<=2048 and (t='' or t ~ '^https://[^[:space:]@]+$');
   when 'instagram' then ok:=jsonb_typeof(v)='string' and char_length(t)<=2048 and (t='' or t ~ '^https://(www\.)?instagram\.com(/[^[:space:]]*)?$');
   when 'whatsapp' then ok:=jsonb_typeof(v)='string' and (t='' or t ~ '^[+0-9()[:space:]-]{10,24}$');
   when 'showAddress','showBenefits','showProfessionals','showClosing','showDescriptions','colorfulServices' then ok:=jsonb_typeof(v)='boolean';
   else return false;
  end case;
  if ok is not true then return false;end if;
 end loop;
 return true;
end $$;
revoke all on function public.valid_storefront_appearance(jsonb) from public,anon;
grant execute on function public.valid_storefront_appearance(jsonb) to authenticated,service_role;
alter table public.tenants add column appearance jsonb not null default '{}'::jsonb
 constraint valid_storefront_settings check(public.valid_storefront_appearance(appearance));
grant update(appearance) on public.tenants to authenticated;
-- Existing tenant_admin_update policy still requires membership admin for this tenant.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('storefront-media','storefront-media',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy storefront_media_insert on storage.objects for insert to authenticated
 with check(bucket_id='storefront-media' and exists(select 1 from public.tenants t where t.id::text=split_part(objects.name,'/',1) and objects.name like t.id::text||'/%' and public.is_tenant_admin(t.id)));
create policy storefront_media_read on storage.objects for select to authenticated
 using(bucket_id='storefront-media' and exists(select 1 from public.tenants t where t.id::text=split_part(objects.name,'/',1) and objects.name like t.id::text||'/%' and public.is_tenant_admin(t.id)));
create policy storefront_media_delete on storage.objects for delete to authenticated
 using(bucket_id='storefront-media' and exists(select 1 from public.tenants t where t.id::text=split_part(objects.name,'/',1) and objects.name like t.id::text||'/%' and public.is_tenant_admin(t.id)));
notify pgrst, 'reload schema';
commit;
