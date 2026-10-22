import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { appearanceVariables } from '../../lib/appearance';
import { useShopTheme } from '../../hooks/useShopTheme';
import InstallButton from '../ui/InstallButton';

export function BrandImage({url,name}) {
  const [failed,setFailed]=useState(false);
  return url&&!failed?<img src={url} alt="" onError={()=>setFailed(true)}/>:<span>{name.slice(0,2).toUpperCase()}</span>;
}
export default function StorefrontFrame({tenant,appearance,slug,preview=false,children}) {
  const {mode,toggle}=useShopTheme(tenant.id,appearance.mode,preview?(appearance.mode==='system'?'dark':appearance.mode):undefined);
  return <div className="storefront" data-storefront="" data-mode={mode} data-template={appearance.template} data-shape={appearance.shape} data-density={appearance.density} data-font={appearance.font} data-category-colors={appearance.colorfulServices} style={appearanceVariables(appearance,mode)}>
    <header className="storefront-header"><div className="storefront-header-inner">
      <Link to={`/${slug}`} className="storefront-brand" tabIndex={preview?-1:undefined}>
        <span className="storefront-logo"><BrandImage key={appearance.logoUrl} url={appearance.logoUrl} name={tenant.name}/></span>
        <span><strong>{tenant.name}</strong><small>{tenant.tagline||'Seu próximo horário começa aqui.'}</small></span>
      </Link>
      <div className="storefront-header-actions">{!preview&&<InstallButton/>}{tenant.id==='demo'&&<span className="demo-badge">Demonstração</span>}<button className="icon-button" disabled={preview} aria-label={mode==='dark'?'Ativar tema claro':'Ativar tema escuro'} onClick={toggle}>{mode==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></div>
    </div></header>
    {children}
  </div>;
}
