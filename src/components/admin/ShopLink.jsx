import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { shopLink } from '../../lib/tenant';

export default function ShopLink({ slug, demo = false }) {
  const [message, setMessage] = useState('');
  const url = shopLink(slug);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setMessage('Link copiado!'); }
    catch { setMessage('Selecione e copie o link no campo acima.'); }
  };
  return <section className="shop-share" aria-label="Link da loja">
    <div><strong>{demo ? 'Link da demonstração' : 'O link exclusivo da sua loja'}</strong>
      <p>Envie este endereço aos clientes. Ele abre diretamente este estabelecimento.</p></div>
    <div className="share-controls">
      <input aria-label="Link para seus clientes" readOnly value={url} onFocus={e => e.target.select()}/>
      <button className="button primary" onClick={copy}>{message === 'Link copiado!' ? <Check size={17}/> : <Copy size={17}/>} Copiar link</button>
      <a className="button secondary" href={url} target="_blank" rel="noreferrer">Abrir loja <ExternalLink size={15}/></a>
    </div>
    {message && <p role="status">{message}</p>}
  </section>;
}
