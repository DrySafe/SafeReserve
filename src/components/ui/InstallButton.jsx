import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import Modal from './Modal';
let pending=null;
const currentManifest=()=>document.querySelector('link[rel="manifest"]')?.href;
const subscribers=new Set();
const publish=()=>subscribers.forEach(fn=>fn(pending));
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending={event,manifest:currentManifest()};publish();});
window.addEventListener('appinstalled',()=>{pending=null;publish();});
new MutationObserver(()=>{if(pending&&pending.manifest!==currentManifest()){pending=null;publish();}}).observe(document.head,{subtree:true,childList:true,attributes:true,attributeFilter:['href']});
export default function InstallButton({label='Adicionar à tela inicial'}) {
 const [prompt,setPrompt]=useState(pending);const [help,setHelp]=useState(false);const [busy,setBusy]=useState(false);
 useEffect(()=>{subscribers.add(setPrompt);setPrompt(pending);return()=>subscribers.delete(setPrompt);},[]);
 const install=async()=>{
  if(!prompt||prompt.manifest!==currentManifest()){setHelp(true);return;}
  setBusy(true);try{await prompt.event.prompt();await prompt.event.userChoice;}catch{setHelp(true);}finally{pending=null;publish();setBusy(false);}
 };
 return <><button className="text-button" disabled={busy} onClick={install}><Download size={16}/>{label}</button>{help&&<Modal title="Instalar este aplicativo" onClose={()=>setHelp(false)}><p>A instalação usa a loja aberta nesta página. Para instalar outra loja, abra o link dela e repita o processo.</p><p><strong>Android ou computador:</strong> use “Instalar aplicativo” ou “Criar atalho” no menu do navegador.</p><p><strong>iPhone/iPad:</strong> no Safari, toque em Compartilhar → Adicionar à Tela de Início.</p><p className="muted">Se a opção ainda não aparecer, reabra esta página. O suporte a vários aplicativos no mesmo domínio varia por navegador e sistema.</p><a className="button primary full" href={window.location.pathname}>Reabrir esta página para instalar</a></Modal>}</>;
}
