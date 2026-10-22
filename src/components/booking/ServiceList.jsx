import { useState } from 'react';
import { Scissors, Sparkles, Droplets, Eye, Flower2, Plus, Check, Clock, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { money } from '../../lib/availability';
import { useBookingStore } from '../../store/booking';
const icons = { scissors: Scissors, sparkles: Sparkles, razor: Scissors, drop: Droplets, eye: Eye, flower: Flower2 };
export default function ServiceList({ services }) {
  const [category, setCategory] = useState('Todos'); const [search,setSearch] = useState('');
  const { serviceIds, toggleService } = useBookingStore();
  const categories = ['Todos', ...new Set(services.map(s=>s.category))];
  const visible = services.filter(s => (category === 'Todos' || s.category === category) && s.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <section className="section" aria-labelledby="services-title"><div className="section-heading"><div><span className="eyebrow">UM TEMPO PARA VOCÊ</span><h2 id="services-title">Como vamos cuidar de você?</h2><p>Escolha um ou mais serviços para o seu momento.</p></div><label className="search-field"><Search size={18}/><input aria-label="Buscar serviço" placeholder="Buscar serviço" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
    <div className="category-tabs" aria-label="Categorias de serviços">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} aria-pressed={category === c} className={category===c?'active':''}>{c}</button>)}</div>
    <div className="service-grid">{visible.map((s,i) => { const Icon = icons[s.icon] || Sparkles; const selected = serviceIds.includes(s.id); return <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*.035 }} key={s.id} className={`service-card ${selected?'selected':''}`} aria-pressed={selected} onClick={()=>{ toggleService(s.id); navigator.vibrate?.(10); }}>
      <div className="service-top"><span className={`service-icon ${s.color || 'sage'}`}>{s.photo_url ? <img src={s.photo_url} alt=""/> : <Icon size={29} strokeWidth={1.4}/>}</span>{s.tag && <span className="service-tag">{s.tag}</span>}<span className={`select-circle ${selected?'checked':''}`}>{selected ? <Check size={17}/> : <Plus size={17}/>}</span></div>
      <h3>{s.name}</h3><p>{s.description}</p><div className="service-bottom"><span><Clock size={13}/> {s.duration} min</span><strong>{money(s.price)}</strong></div>
    </motion.button>; })}</div>{!visible.length && <p className="empty-state">Nenhum serviço encontrado. Experimente outra busca.</p>}
  </section>;
}
