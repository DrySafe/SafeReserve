import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { loadProducts, saveProduct } from '../../services/api';
const blank={name:'',description:'',price:0,photo_url:'',active:true};
function ProductForm({tenantId,product,onSaved}) {
 const [draft,setDraft]=useState(product);const [price,setPrice]=useState(String(product.price/100));const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 return <form className="admin-service form" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{await saveProduct(tenantId,{...draft,price:Math.round(Number(price)*100)});setMessage('Produto salvo.');onSaved();if(!product.id){setDraft(blank);setPrice('0');}}catch(err){setMessage(err.message);}finally{setBusy(false);}}}><h3>{product.id?'Editar produto':'Adicionar produto'}</h3><label>Nome do produto<input required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>Descrição<input maxLength={300} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label><label>Preço (R$)<input type="number" min="0" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Foto (URL HTTPS)<input type="url" pattern="https://.*" value={draft.photo_url||''} onChange={e=>setDraft({...draft,photo_url:e.target.value})}/></label><label className="checkbox-label"><input type="checkbox" checked={draft.active} onChange={e=>setDraft({...draft,active:e.target.checked})}/>Produto ativo</label><button className="button secondary" disabled={busy}><Plus size={16}/>{busy?'Salvando…':'Salvar produto'}</button>{message&&<p role="status">{message}</p>}</form>;
}
export default function ProductsEditor({tenantId}) {
 const query=useQueryClient();const {data=[],isPending,error}=useQuery({queryKey:['products',tenantId],queryFn:()=>loadProducts(tenantId)});const saved=()=>query.invalidateQueries({queryKey:['products',tenantId]});
 return <><p className="muted">Gerencie seu catálogo. Produtos são pagos e retirados no estabelecimento.</p>{isPending&&<p>Carregando produtos…</p>}{error&&<p role="alert">{error.message}</p>}<div className="admin-service-grid"><ProductForm tenantId={tenantId} product={blank} onSaved={saved}/>{data.map(p=><ProductForm key={p.id} tenantId={tenantId} product={p} onSaved={saved}/>)}</div></>;
}
