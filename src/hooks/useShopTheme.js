import { useEffect, useState } from 'react';
export function useShopTheme(tenantId,defaultMode='dark',forcedMode) {
  const key=`sr:shop-theme:${tenantId}`;
  const [preference,setPreference]=useState(()=>{try{return localStorage.getItem(key)||'';}catch{return '';}});
  const [system,setSystem]=useState(()=>window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
  useEffect(()=>{const query=window.matchMedia('(prefers-color-scheme: light)');const update=()=>setSystem(query.matches?'light':'dark');query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
  const mode=forcedMode||preference||(defaultMode==='system'?system:defaultMode);
  return {mode,toggle:()=>{const next=mode==='dark'?'light':'dark';setPreference(next);try{localStorage.setItem(key,next);}catch{}}};
}
