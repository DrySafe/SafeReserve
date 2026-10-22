import { Sparkles, Check } from 'lucide-react';
import { useBookingStore } from '../../store/booking';
import { compatibleProfessionals } from '../../lib/availability';
export default function ProSelect({ professionals }) {
  const { serviceIds, professionalId, setProfessional } = useBookingStore();
  const available = compatibleProfessionals(professionals,serviceIds);
  return <section className="section" aria-labelledby="pro-title"><div className="section-heading"><div><span className="eyebrow">EM BOAS MÃOS</span><h2 id="pro-title">Com quem você prefere?</h2><p>Seu favorito ou o primeiro horário livre. Você escolhe.</p></div><span className="optional-label">Opcional</span></div>
    <div className="pro-grid"><button className={`pro-card ${!professionalId?'selected':''}`} aria-pressed={!professionalId} onClick={()=>setProfessional('')}><span className="pro-avatar automatic"><Sparkles size={25}/></span><span><strong>Sem preferência</strong><small>Encontre o melhor horário</small></span>{!professionalId && <Check size={17} className="pro-check"/>}</button>
    {available.map(p=><button key={p.id} className={`pro-card ${professionalId===p.id?'selected':''}`} aria-pressed={professionalId===p.id} onClick={()=>setProfessional(p.id)}><span className={`pro-avatar ${p.color || 'sage'}`}>{p.photo_url ? <img src={p.photo_url} alt=""/> : p.initials || p.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</span><span><strong>{p.name}</strong><small>{p.specialty}</small></span>{professionalId===p.id && <Check size={17} className="pro-check"/>}</button>)}</div>
    {!available.length && serviceIds.length>0 && <p className="notice">Nenhum profissional atende essa combinação. Agende esses serviços separadamente.</p>}
  </section>;
}
