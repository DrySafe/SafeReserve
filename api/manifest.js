import { storeAppManifest } from '../src/lib/pwa.js';
import { validShopSlug } from '../src/lib/tenant.js';
import { demoTenant } from '../src/lib/demo.js';
// Public branding only; never use a service-role key or return private shop data.
export default async function handler(req,res) {
 res.setHeader('Content-Type','application/manifest+json; charset=utf-8');
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const url=new URL(req.url,'https://safereserve.invalid');
 const slug=url.searchParams.get('tenant');const app=url.searchParams.get('app');
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end('{}');}
 if(!slug||(!validShopSlug(slug)&&slug!=='demonstracao')||!['customer','management'].includes(app)){res.statusCode=400;return res.end('{}');}
 try {
  let tenant=slug==='demonstracao'?demoTenant:null;
  if(!tenant){
   const base=process.env.VITE_SUPABASE_URL;const key=process.env.VITE_SUPABASE_ANON_KEY;
   const privileged=key?.startsWith('sb_secret_')||(()=>{try{return JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='service_role';}catch{return false;}})();
   if(!base||!key||privileged){res.statusCode=503;return res.end('{}');}
   const endpoint=new URL('/rest/v1/tenants',base);
   endpoint.search=new URLSearchParams({slug:`eq.${slug}`,active:'eq.true',select:'slug,name,appearance'});
   const response=await fetch(endpoint,{headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new Error('Catalog unavailable');
   tenant=(await response.json())[0];
  }
  if(!tenant){res.statusCode=404;return res.end('{}');}
  return res.end(JSON.stringify(storeAppManifest(tenant,app==='management')));
 }catch{res.statusCode=503;return res.end('{}');}
}
