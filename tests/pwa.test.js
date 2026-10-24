import {describe,it,expect,vi,afterEach} from 'vitest';
import {storeAppManifest,manifestUrl} from '../src/lib/pwa';
import handler from '../api/manifest';
function response(){return {headers:{},statusCode:200,setHeader(key,value){this.headers[key]=value;},end(value){this.body=JSON.parse(value);}};}
afterEach(()=>vi.unstubAllGlobals());
describe('distinct installable store applications',()=>{
 it('keeps customer and management installations on canonical scoped paths with distinct stable identities',()=>{
  const a={slug:'loja-um',name:'Loja Um'};const b={slug:'loja-dois',name:'Loja Dois'};
  const manifests=[storeAppManifest(a),storeAppManifest(a,true),storeAppManifest(b),storeAppManifest(b,true)];
  expect(new Set(manifests.map(m=>m.id)).size).toBe(4);
  expect(manifests[0].start_url).toBe('/loja-um/');expect(manifests[1].start_url).toBe('/loja-um/gestao/');expect(manifests[1].name).toBe('Gestão Loja Um');
  for(const m of manifests)expect(m.start_url.startsWith(m.scope)).toBe(true);
  expect(manifestUrl(a.slug,true)).toBe('/api/manifest?tenant=loja-um&app=management');
 });
 it('uses published PNG icons and safe fallback icons',()=>{
  const tenant={slug:'marca',name:'Marca',appearance:{faviconUrl:'https://example.com/512.png',icon192Url:'https://example.com/192.png'}};
  expect(storeAppManifest(tenant).icons.map(i=>i.sizes)).toEqual(['192x192','512x512']);
  expect(storeAppManifest({...tenant,appearance:{faviconUrl:'javascript:alert(1)'}}).icons[0].src).toBe('/icon-192.png');
 });
 it('serves a fetchable manifest and rejects unknown routes without pointing at a different store',async()=>{
  const res=response();await handler({method:'GET',url:'/api/manifest?tenant=demonstracao&app=management'},res);expect(res.body.name).toBe('Gestão Studio Aurora');expect(res.headers['Content-Type']).toContain('manifest+json');
  const invalid=response();await handler({method:'GET',url:'/api/manifest?tenant=admin&app=customer'},invalid);expect(invalid.statusCode).toBe(400);
  vi.stubGlobal('fetch',async()=>({ok:true,json:async()=>[]}));const missing=response();await handler({method:'GET',url:'/api/manifest?tenant=nao-existe&app=customer'},missing);expect([404,503]).toContain(missing.statusCode);expect(missing.body).toEqual({});
 });
});
