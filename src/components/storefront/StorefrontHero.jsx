import { useState } from 'react';
import { ArrowRight, Scissors, Sparkles, Star, Flower2 } from 'lucide-react';

function Artwork({tenant,appearance}) {
  const type=appearance.template;
  return <div className={`store-artwork artwork-${type}`} aria-hidden="true">
    <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
    <div className="art-monogram">{tenant.name.slice(0,1)}</div>
    <div className="art-symbol">{type==='barber'?<Scissors size={70} strokeWidth={1}/>:type==='atelier'?<Flower2 size={90} strokeWidth={.8}/>:type==='pop'?<Star size={100} strokeWidth={1.2}/>:<Sparkles size={75} strokeWidth={1}/>}</div>
    <span className="art-store-name">{tenant.name}</span><span className="art-detail">FEITO PARA VOCÊ</span>
    {type==='essencia'&&<><div className="art-leaf leaf-one"/><div className="art-leaf leaf-two"/><div className="art-leaf leaf-three"/></>}
    {type==='pop'&&<span className="art-pop-note">do seu<br/>jeito!</span>}
    {type==='barber'&&<div className="barber-lines"/>}
  </div>;
}
export default function StorefrontHero({tenant,professionals=[],appearance:a,preview=false}) {
  const [failed,setFailed]=useState(false);
  const photo=a.media==='photo'&&a.coverUrl&&!failed;
  const media=a.media!=='none';
  const lines=(a.headline.trim()||tenant.name).split('\n');
  return <section className={`store-hero ${media?'has-media':'no-media'}`}>
    <div className="store-hero-copy">
      {a.eyebrow&&<span className="store-eyebrow"><span/>{a.eyebrow}</span>}
      <h1 aria-label={lines.join(' ')}>{lines.map((line,i)=><span key={i}>{i===lines.length-1?<em>{line}</em>:line}</span>)}</h1>
      <p>{a.description||tenant.description||'Escolha seu serviço e encontre o melhor horário para você.'}</p>
      <a href={preview?undefined:'#booking'} tabIndex={preview?-1:undefined} className="button primary store-hero-cta">{a.cta.trim()||'Agendar meu horário'}<ArrowRight size={18}/></a>
      {a.showBenefits&&professionals.length>0&&<div className="store-hero-team"><span>{professionals.slice(0,3).map(p=><i key={p.id}>{p.initials||p.name.slice(0,2)}</i>)}</span><div><strong>Uma equipe para cuidar de você.</strong><small>{a.showProfessionals?'Escolha seu profissional durante o agendamento.':'Encontre o melhor horário com a nossa equipe.'}</small></div></div>}
    </div>
    {media&&<div className="store-hero-media">{photo?<img key={a.coverUrl} src={a.coverUrl} alt={`Conheça ${tenant.name}`} style={{objectPosition:a.coverPosition}} onError={()=>setFailed(true)}/>:<Artwork tenant={tenant} appearance={a}/>}<div className="store-media-caption"><span>{tenant.name}</span><Sparkles size={16}/><span>SEU MOMENTO</span></div></div>}
  </section>;
}
