import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Link2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createShop } from '../../services/business';
import { slugify, validShopSlug, shopLink } from '../../lib/tenant';

export default function CreateShopPage() {
  const { session, loading } = useAuth();
  const [values,setValues] = useState({ name:'', slug:'', address:'', professional:'', service:'', price:'', duration:'30' });
  const [customSlug,setCustomSlug] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const query = useQueryClient();
  const navigate = useNavigate();
  const change = (key,value) => setValues(previous=>({ ...previous, [key]:value }));
  if (loading) return <div className="page-state">Verificando sua conta…</div>;
  if (!session) return <Navigate to="/entrar" replace/>;
  const submit = async e => {
    e.preventDefault();
    if (!validShopSlug(values.slug)) {setError('Escolha um link com 3 a 60 letras minúsculas, números ou hífens. Este nome também pode estar reservado.');return;}
    setBusy(true);setError('');
    try {
      const shop = await createShop(values);
      await query.invalidateQueries({queryKey:['owner-shops']});
      navigate(`/${shop.slug}/admin`,{replace:true});
    } catch(err) {setError(err.message);} finally {setBusy(false);}
  };
  return <main className="create-shop-page"><Link className="text-button" to="/painel"><ArrowLeft size={16}/> Minhas lojas</Link>
    <div className="create-shop-heading"><span className="eyebrow">O PRIMEIRO PASSO DO SEU NEGÓCIO</span><h1>Vamos criar sua loja.</h1><p>Seu espaço ganha um endereço próprio. Os clientes que receberem esse link vão abrir somente a sua loja.</p></div>
    <form className="form create-shop-form" onSubmit={submit}>
      <fieldset><legend>1. Seu estabelecimento</legend>
        <label>Nome da loja<input required minLength={2} maxLength={80} autoComplete="organization" placeholder="Ex.: Barbearia do João" value={values.name} onChange={e=>setValues(previous=>({...previous,name:e.target.value,...(!customSlug?{slug:slugify(e.target.value)}:{})}))}/></label>
        <label>Nome no link<input required minLength={3} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="barbearia-do-joao" value={values.slug} onChange={e=>{setCustomSlug(true);change('slug',e.target.value.toLowerCase());}}/></label>
        <div className="link-preview"><Link2 size={17}/><span>{values.slug?shopLink(values.slug):`${window.location.origin}/nome-da-sua-loja`}</span></div>
        <small className="muted">O link precisa ser único. Evite mudar o endereço depois de divulgá-lo.</small>
        <label>Endereço ou local de atendimento<input required minLength={2} maxLength={200} autoComplete="street-address" placeholder="Rua, número, bairro e cidade" value={values.address} onChange={e=>change('address',e.target.value)}/></label>
      </fieldset>
      <fieldset><legend>2. Seu primeiro serviço</legend><p className="muted">Comece com um serviço pronto para agendar. Você poderá ajustar preço e duração no painel.</p>
        <label>Nome do serviço<input required minLength={2} maxLength={100} placeholder="Ex.: Corte de cabelo" value={values.service} onChange={e=>change('service',e.target.value)}/></label>
        <div className="form-row"><label>Preço (R$)<input required type="number" min="0" max="100000" step="0.01" placeholder="45,00" value={values.price} onChange={e=>change('price',e.target.value)}/></label>
        <label>Duração (minutos)<select value={values.duration} onChange={e=>change('duration',e.target.value)}>{[15,30,45,60,75,90,120,180,240].map(minutes=><option key={minutes} value={minutes}>{minutes} minutos</option>)}</select></label></div>
      </fieldset>
      <fieldset><legend>3. Quem vai atender?</legend>
        <label>Nome do primeiro profissional<input required minLength={2} maxLength={80} placeholder="Seu nome ou de quem faz o atendimento" value={values.professional} onChange={e=>change('professional',e.target.value)}/></label>
        <p className="muted">A agenda inicial atende de segunda a sábado, das 9h às 18h, no horário de São Paulo.</p>
      </fieldset>
      {error&&<p className="notice" role="alert">{error}</p>}
      <button className="button primary full" disabled={busy}>{busy?'Criando sua loja…':'Criar loja e abrir meu painel'}<ArrowRight size={18}/></button>
    </form>
  </main>;
}
