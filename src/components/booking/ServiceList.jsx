import { useState } from 'react';
import { Search } from 'lucide-react';
import { useBookingStore } from '../../store/booking';
import { defaultAppearance } from '../../lib/appearance';
import ServiceCard from './ServiceCard';
export default function ServiceList({services,appearance=defaultAppearance,readOnly=false}) {
  const [category,setCategory]=useState('Todos');const [search,setSearch]=useState('');
  const {serviceIds,toggleService}=useBookingStore();
  const categories=['Todos',...new Set(services.map(s=>s.category))];
  const visible=services.filter(s=>(category==='Todos'||s.category===category)&&s.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <section className="section" aria-labelledby={readOnly?'preview-services-title':'services-title'}>
    <div className="section-heading"><div><span className="eyebrow">UM TEMPO PARA VOCÊ</span><h2 id={readOnly?'preview-services-title':'services-title'}>Como vamos cuidar de você?</h2><p>Escolha um ou mais serviços para o seu momento.</p></div><label className="search-field"><Search size={18}/><input aria-label="Buscar serviço" placeholder="Buscar serviço" disabled={readOnly} value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
    <div className="category-tabs" aria-label="Categorias de serviços">{categories.map(c=><button key={c} disabled={readOnly} onClick={()=>setCategory(c)} aria-pressed={category===c} className={category===c?'active':''}>{c}</button>)}</div>
    <div className="service-grid" data-view={appearance.servicesView}>{visible.map(s=><ServiceCard key={s.id} service={s} appearance={appearance} readOnly={readOnly} selected={!readOnly&&serviceIds.includes(s.id)} onSelect={()=>{toggleService(s.id);navigator.vibrate?.(10);}}/>)}</div>
    {!visible.length&&<p className="empty-state">Nenhum serviço encontrado. Experimente outra busca.</p>}
  </section>;
}
