import { useEffect } from 'react';
import { manifestUrl } from '../lib/pwa';
import { safeImageUrl } from '../lib/appearance';
// Stable HTTP manifest URLs allow browsers to distinguish installations per shop.
export function useStoreApp(tenant,management=false,disabled=false) {
 useEffect(()=>{
  if(!tenant||disabled)return;
  const oldTitle=document.title;const snapshots=[];
  const set=(selector,tag,attrs)=>{
   let node=document.head.querySelector(selector);const created=!node;
   if(!node){node=document.createElement(tag);document.head.append(node);}
   snapshots.push({node,created,attrs:Object.fromEntries(Object.keys(attrs).map(key=>[key,node.getAttribute(key)]))});
   Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value));
  };
  document.title=management?`Gestão ${tenant.name}`:tenant.name;
  set('link[rel="manifest"]','link',{rel:'manifest',href:manifestUrl(tenant.slug,management)});
  const icon=safeImageUrl(tenant.appearance?.faviconUrl,tenant.id==='demo')||'/icon-512.png';
  set('link[rel="icon"]','link',{rel:'icon',href:icon});
  set('link[rel="apple-touch-icon"]','link',{rel:'apple-touch-icon',href:icon});
  set('meta[name="apple-mobile-web-app-title"]','meta',{name:'apple-mobile-web-app-title',content:management?`Gestão ${tenant.name}`:tenant.name});
  return()=>{document.title=oldTitle;snapshots.forEach(({node,created,attrs})=>{if(created)node.remove();else Object.entries(attrs).forEach(([key,value])=>value===null?node.removeAttribute(key):node.setAttribute(key,value));});};
 },[tenant?.slug,tenant?.name,tenant?.appearance?.faviconUrl,management,disabled]);
}
