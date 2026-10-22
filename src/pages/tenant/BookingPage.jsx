import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Check, Clock3, MapPin, ShieldCheck, Sparkles, Heart, LoaderCircle, CalendarDays, Instagram, MessageCircle } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { useBookingStore } from '../../store/booking';
import { money } from '../../lib/availability';
import { normalizeAppearance } from '../../lib/appearance';
import ServiceList from '../../components/booking/ServiceList';
import ProSelect from '../../components/booking/ProSelect';
import TimeSlotPicker from '../../components/booking/TimeSlotPicker';
import Checkout from '../../components/booking/Checkout';
import Modal from '../../components/ui/Modal';
import StorefrontFrame from '../../components/storefront/StorefrontFrame';
import StorefrontHero from '../../components/storefront/StorefrontHero';

export default function BookingPage() {
  const {data:studio,error,isPending,slug,demo:isDemo}=useTenant();
  const state=useBookingStore();
  const [checkout,setCheckout]=useState(null);const [popup,setPopup]=useState(false);const [about,setAbout]=useState(false);
  const a=normalizeAppearance(studio?.tenant.appearance,{allowData:isDemo});
  useEffect(()=>state.setTenant(slug),[slug,state.setTenant]);
  useEffect(()=>{if(!a.showProfessionals&&state.professionalId)state.setProfessional('');},[a.showProfessionals,state.professionalId,state.setProfessional]);
  useEffect(()=>{
    if(studio?.tenant.popup?.enabled){const key=`sr:popup:${studio.tenant.id}:${JSON.stringify(studio.tenant.popup)}`;if(!sessionStorage.getItem(key)){setPopup(true);sessionStorage.setItem(key,'1');}}
  },[studio]);
  if(isPending)return <div className="page-state"><LoaderCircle className="spin"/><h2>Preparando seu momento…</h2></div>;
  if(error)return <div className="page-state"><h2>Não conseguimos abrir este espaço.</h2><p>{error.message}</p><div className="landing-actions"><Link className="button secondary" to="/">Ir para o início</Link><Link className="button primary" to="/demonstracao">Ver demonstração</Link></div></div>;
  const selected=studio.services.filter(s=>state.serviceIds.includes(s.id));
  const total=selected.reduce((n,s)=>n+s.price,0);const duration=selected.reduce((n,s)=>n+s.duration,0);
  const canBook=selected.length>0&&state.slot;
  return <StorefrontFrame key={studio.tenant.id} tenant={studio.tenant} appearance={a} slug={slug}>
    <main className="booking-page">
      {isDemo&&<div className="demo-store-notice">Você está explorando uma loja de exemplo. <Link to="/cadastro">Criar minha própria loja <ArrowRight size={14}/></Link></div>}
      <div className="store-meta">{a.showAddress&&<span><MapPin size={14}/>{studio.tenant.address}</span>}<button className="text-button" onClick={()=>setAbout(true)}>Conheça o espaço <ArrowUpRight size={14}/></button></div>
      <StorefrontHero key={a.coverUrl} tenant={studio.tenant} professionals={studio.professionals} appearance={a}/>
      {a.showBenefits&&<div className="benefits"><span><Clock3 size={17}/>Agende em poucos toques</span><span><ShieldCheck size={17}/>Sem cadastro obrigatório</span><span><Heart size={17}/>Cuidado do início ao fim</span></div>}
      <div id="booking" className="booking-heading"><div><span className="eyebrow">SIMPLES, DO SEU JEITO</span><h2>Vamos marcar?</h2></div><div className="stepper" aria-label="Etapas do agendamento"><span className="current"><i>{selected.length?<Check size={12}/>:1}</i>Serviços</span><span className={selected.length?'current':''}><i>{state.slot?<Check size={12}/>:2}</i>Dia e horário</span><span><i>3</i>Pronto</span></div></div>
      <div className="booking-layout"><div className="booking-sections">
        <ServiceList services={studio.services} appearance={a}/>
        {a.showProfessionals&&<ProSelect professionals={studio.professionals}/>}
        <TimeSlotPicker studio={studio} onWaitlist={()=>setCheckout('waitlist')}/>
      </div><aside className="summary"><div className="summary-top"><span className="eyebrow">O SEU MOMENTO</span><CalendarDays size={21}/></div><h2>Sua próxima<br/>visita.</h2>
        {selected.length?<div className="summary-services">{selected.map(s=><div key={s.id}><span>{s.name}<small>{s.duration} min</small></span><strong>{money(s.price)}</strong></div>)}</div>:<p className="summary-empty">Selecione seus serviços e encontre o melhor horário para você.</p>}
        <div className="summary-details"><span><Clock3 size={16}/>{duration?`${duration} minutos`:'No seu tempo'}</span><span><MapPin size={16}/>{studio.tenant.name}</span>{state.slot&&<span><CalendarDays size={16}/>{new Intl.DateTimeFormat('pt-BR',{timeZone:studio.tenant.timezone,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(state.slot.starts_at))}</span>}</div>
        <div className="summary-total"><span>Total estimado</span><strong>{money(total)}</strong></div><small className="pay-note">Pagamento direto no estabelecimento</small><button className="button primary full" disabled={!canBook} onClick={()=>setCheckout('booking')}>Reservar meu momento <ArrowRight size={17}/></button><span className="secure-note"><ShieldCheck size={14}/>Sem pagamento antecipado</span>
        {a.showClosing&&<div className="summary-quote"><span>“</span><p>{a.closing}</p><Sparkles size={17}/></div>}
      </aside></div>
      {a.showClosing&&<section className="closing-note"><span>✳</span><h2>{a.closing.split('\n').map((line,i)=><span key={i}>{line}<br/></span>)}</h2><p>A gente cuida dos detalhes.<br/>Você só precisa chegar.</p></section>}
      {(a.instagram||a.whatsapp)&&<nav className="store-social" aria-label="Fale com a loja">{a.instagram&&<a href={a.instagram} target="_blank" rel="noreferrer"><Instagram size={18}/>Nosso Instagram <ArrowUpRight size={14}/></a>}{a.whatsapp&&<a href={`https://wa.me/${a.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"><MessageCircle size={18}/>Fale com a loja <ArrowUpRight size={14}/></a>}</nav>}
      <footer className="studio-footer"><span>© {new Date().getFullYear()} {studio.tenant.name}</span><Link to="/">Agendamentos por <strong>SafeReserve</strong></Link><Link to={`/${slug}/admin`}>Acesso profissional <ArrowUpRight size={12}/></Link></footer>
    </main>
    {selected.length>0&&<div className="mobile-booking-bar"><div><small>{selected.length} serviço{selected.length>1?'s':''} · {duration} min</small><strong>{money(total)}</strong></div><button className="button primary" disabled={!canBook} onClick={()=>setCheckout('booking')}>Reservar <ArrowRight size={16}/></button></div>}
    {checkout&&<Checkout studio={studio} waiting={checkout==='waitlist'} onClose={()=>setCheckout(null)}/>}
    {popup&&<Modal title={studio.tenant.popup.title} onClose={()=>setPopup(false)}><p className="popup-message">{studio.tenant.popup.message}</p><button className="button primary full" onClick={()=>setPopup(false)}>Vamos lá <ArrowRight size={17}/></button></Modal>}
    {about&&<Modal title={studio.tenant.name} onClose={()=>setAbout(false)}><p>{studio.tenant.tagline}</p><p className="muted">{a.description||studio.tenant.description}</p><p><MapPin size={17}/>{studio.tenant.address}</p><p className="muted">Os horários disponíveis para cada profissional aparecem durante o agendamento.</p>{isDemo&&<p className="demo-inline">Estabelecimento fictício para demonstração do SafeReserve.</p>}</Modal>}
  </StorefrontFrame>;
}
