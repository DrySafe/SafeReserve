import { Link, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Store, LogOut, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ownerShops } from '../../services/business';
import { supabase } from '../../services/supabase';
import ShopLink from '../../components/admin/ShopLink';

export default function ShopsPage() {
  const { session, loading, error: authError } = useAuth();
  const queryClient = useQueryClient();
  const shops = useQuery({ queryKey: ['owner-shops',session?.user.id], enabled: Boolean(session), queryFn:()=>ownerShops(session.user.id) });
  if (loading) return <div className="page-state">Abrindo seu espaço…</div>;
  if (!session) return <Navigate to="/entrar" replace/>;
  return <main className="owner-dashboard">
    <div className="admin-heading"><div><span className="eyebrow">ESPAÇO PROFISSIONAL</span><h1>Suas lojas.</h1><p className="muted">Cada estabelecimento tem uma agenda e um link exclusivos.</p></div><button className="button secondary" onClick={async()=>{await supabase.auth.signOut();queryClient.clear();}}><LogOut size={16}/> Sair</button></div>
    <Link to="/criar-loja" className="button primary"><Plus size={17}/> Criar uma loja</Link>
    {(shops.error||authError)&&<p className="notice" role="alert">{shops.error?.message||authError}</p>}
    {shops.isPending ? <p className="muted">Buscando suas lojas…</p> : !shops.data?.length && !shops.error ? <section className="owner-empty"><Store size={44}/><h2>Vamos abrir seu espaço?</h2><p>Cadastre sua primeira loja, escolha o link e comece a receber agendamentos.</p><Link className="text-button" to="/criar-loja">Criar minha primeira loja <ArrowRight size={16}/></Link></section> : null}
    <div className="owner-shops">{shops.data?.map(shop=><article className="owner-shop" key={shop.id}><div className="owner-shop-heading"><div><h2>{shop.name}</h2><span className="muted">/{shop.slug}{!shop.active?' · desativada':''}</span></div><div className="management-detail-actions"><Link to={`/${shop.slug}/gestao/`} className="button primary">Abrir agenda <ArrowRight size={16}/></Link>{shop.role==='admin'&&<Link to={`/${shop.slug}/admin`} className="button secondary">Gerenciar loja <ArrowRight size={16}/></Link>}</div></div><ShopLink slug={shop.slug}/></article>)}</div>
  </main>;
}
