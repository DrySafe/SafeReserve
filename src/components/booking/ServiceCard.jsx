import { Scissors, Sparkles, Droplets, Eye, Flower2, Plus, Check, Clock } from 'lucide-react';
import { money } from '../../lib/availability';
const icons={scissors:Scissors,sparkles:Sparkles,razor:Scissors,drop:Droplets,eye:Eye,flower:Flower2};
export default function ServiceCard({service:s,selected=false,onSelect,readOnly=false,appearance}) {
  const Icon=icons[s.icon]||Sparkles;
  const Tag=readOnly?'div':'button';
  return <Tag className={`service-card ${selected?'selected':''}`} {...(!readOnly?{'aria-pressed':selected,onClick:onSelect}:{})}>
    <div className="service-top"><span className={`service-icon ${s.color||'sage'}`}>{s.photo_url?<img src={s.photo_url} alt=""/>:<Icon size={29} strokeWidth={1.4}/>}</span>{s.tag&&<span className="service-tag">{s.tag}</span>}<span className={`select-circle ${selected?'checked':''}`}>{selected?<Check size={17}/>:<Plus size={17}/>}</span></div>
    <div className="service-copy"><h3>{s.name}</h3>{appearance.showDescriptions&&<p>{s.description}</p>}</div>
    <div className="service-bottom"><span><Clock size={13}/>{s.duration} min</span><strong>{money(s.price)}</strong></div>
  </Tag>;
}
