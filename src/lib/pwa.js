import { normalizeAppearance } from './appearance.js';
export function storeAppManifest(tenant, management=false) {
 const slug=tenant.slug;
 const path=`/${slug}/${management?'gestao/':''}`;
 const a=normalizeAppearance(tenant.appearance);
 const name=management?`Gestão ${tenant.name}`:tenant.name;
 return {
  id:`/${slug}/${management?'gestao/':'?app=cliente'}`,name,short_name:name,
  description:management?`Gestão de agendamentos · ${tenant.name}`:`Agende seu horário · ${tenant.name}`,
  start_url:path,scope:path,display:'standalone',lang:'pt-BR',
  theme_color:a.primary,background_color:a.mode==='light'?'#f7f8f2':'#111713',
  icons:a.faviconUrl&&a.icon192Url?[
   {src:a.icon192Url,sizes:'192x192',type:'image/png',purpose:'any'},
   {src:a.faviconUrl,sizes:'512x512',type:'image/png',purpose:'any'},
  ]:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'}],
 };
}
export function manifestUrl(slug,management=false){return `/api/manifest?tenant=${encodeURIComponent(slug)}&app=${management?'management':'customer'}`;}
