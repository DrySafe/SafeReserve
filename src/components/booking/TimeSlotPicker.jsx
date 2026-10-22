import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Sparkles, RefreshCw } from 'lucide-react';
import { nextDays, uniqueSlots } from '../../lib/availability';
import { useBookingStore } from '../../store/booking';
import { useBooking } from '../../hooks/useBooking';
export default function TimeSlotPicker({ studio, onWaitlist }) {
  const { date, setDate, serviceIds, slot, setSlot } = useBookingStore();
  const days = nextDays(21,studio.tenant.timezone); const { data = [], isFetching, isError, error, refetch } = useBooking(studio);
  useEffect(()=>{ if (!date || !days.includes(date)) setDate(days[0]); }, [date,days[0],setDate]);
  const slots = uniqueSlots(data);
  const moveDays = direction => document.querySelector('.day-strip')?.scrollBy({ left:direction*300, behavior:'smooth' });
  return <section className="section time-section" aria-labelledby="time-title"><div className="section-heading"><div><span className="eyebrow">NA SUA ROTINA</span><h2 id="time-title">Qual o melhor momento?</h2><p>Escolha o dia e encontre um horário que cabe na sua vida.</p></div><CalendarDays size={23} className="muted"/></div>
    <div className="month-heading"><strong>{new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${date||days[0]}T12:00:00Z`))}</strong><div><button className="icon-button" aria-label="Ver dias anteriores" onClick={()=>moveDays(-1)}><ChevronLeft size={18}/></button><button className="icon-button" aria-label="Ver próximos dias" onClick={()=>moveDays(1)}><ChevronRight size={18}/></button></div></div>
    <div className="day-strip" aria-label="Escolha o dia">{days.map((d,i)=><button className={`day ${date===d?'active':''}`} key={d} aria-pressed={date===d} onClick={()=>setDate(d)}><small>{i===0?'Hoje':new Intl.DateTimeFormat('pt-BR',{weekday:'short',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`)).replace('.','')}</small><strong>{d.slice(-2)}</strong><span className={new Date(`${d}T12:00:00Z`).getUTCDay()===0?'closed-dot':'open-dot'}/></button>)}</div>
    {!serviceIds.length ? <div className="empty-state"><CalendarDays size={25}/><p>Escolha um serviço para ver os horários disponíveis.</p></div> : isError ? <div className="notice" role="alert">{error.message}<button className="text-button" onClick={()=>refetch()}><RefreshCw size={15}/> Tentar novamente</button></div> : <>
      <div className="slots-heading"><span>Horários disponíveis</span><small><span className="legend-dot"/> Melhor encaixe</small></div>
      <div className={`slots ${isFetching?'loading':''}`} aria-busy={isFetching}>{slots.map(s=><button key={s.starts_at} className={`time-slot ${slot?.starts_at===s.starts_at?'active':''} ${s.recommended?'recommended':''}`} aria-pressed={slot?.starts_at===s.starts_at} onClick={()=>setSlot(s)}>{new Intl.DateTimeFormat('pt-BR',{timeZone:studio.tenant.timezone,hour:'2-digit',minute:'2-digit'}).format(new Date(s.starts_at))}{s.recommended && <Sparkles size={11}/>}</button>)}</div>
      {!slots.length && <div className="empty-state">{isFetching?'Buscando os melhores horários…':'Nenhum horário disponível neste dia.'}</div>}
      <div className="waitlist-note"><span>Não encontrou seu horário?</span><button className="text-button" onClick={onWaitlist}>Entrar na lista de espera <ChevronRight size={14}/></button></div>
    </>}
  </section>;
}
