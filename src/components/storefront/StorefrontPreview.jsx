import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import StorefrontFrame from './StorefrontFrame';
import StorefrontHero from './StorefrontHero';
import ServiceList from '../booking/ServiceList';

export default function StorefrontPreview({studio,appearance,device}) {
 const container=useRef(null);const [width,setWidth]=useState(390);const [doc,setDoc]=useState(null);
 const viewport=device==='desktop'?1100:390;
 useEffect(()=>{const observer=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));observer.observe(container.current);return()=>observer.disconnect();},[]);
 const scale=Math.min(1,width/viewport);
 const prepare=event=>{
  const document=event.currentTarget.contentDocument;
  for(const style of window.document.querySelectorAll('style,link[rel="stylesheet"]'))document.head.append(style.cloneNode(true));
  document.documentElement.dataset.theme='dark';
  setDoc(document);
 };
 return <div ref={container} className="layout-preview-stage" style={{height:Math.min(760,1050*scale)}}>
  <iframe title="Pré-visualização da loja" className="layout-preview-frame" sandbox="allow-same-origin" srcDoc={'<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body style="margin:0"><div id="preview-root"></div></body></html>'} onLoad={prepare} style={{width:viewport,height:1050,transform:`scale(${scale})`}}/>
  {doc&&createPortal(<StorefrontFrame tenant={studio.tenant} appearance={appearance} slug={studio.tenant.slug} preview>
    <main className="booking-page">
      <div className="store-meta">{appearance.showAddress&&<span><MapPin size={14}/>{studio.tenant.address}</span>}</div>
      <StorefrontHero key={appearance.coverUrl} tenant={studio.tenant} professionals={studio.professionals} appearance={appearance} preview/>
      <div className="booking-heading"><div><span className="eyebrow">SIMPLES, DO SEU JEITO</span><h2>Vamos marcar?</h2></div></div>
      <ServiceList services={studio.services.slice(0,4)} appearance={appearance} readOnly/>
      <div className="preview-booking-note">Prévia visual · seus clientes verão os horários disponíveis na loja.</div>
    </main>
  </StorefrontFrame>,doc.getElementById('preview-root'))}
 </div>;
}
