export const palettes = [
  { id:'sage', name:'Sálvia natural', primary:'#c7e4a4', secondary:'#b6cbbf' },
  { id:'gold', name:'Ouro & café', primary:'#e0b96b', secondary:'#b88768' },
  { id:'rose', name:'Rosa delicado', primary:'#e9a7bc', secondary:'#b8a3d4' },
  { id:'ocean', name:'Azul oceano', primary:'#69c7e5', secondary:'#7ce2c6' },
  { id:'lavender', name:'Lavanda', primary:'#b6a0ed', secondary:'#ebaac9' },
  { id:'citrus', name:'Energia cítrica', primary:'#d7ee59', secondary:'#ff9b77' },
  { id:'terracotta', name:'Terracota', primary:'#dc987b', secondary:'#c4b191' },
  { id:'mono', name:'Preto & branco', primary:'#ededeb', secondary:'#b8b8b0' },
];
export const templates = [
  { id:'essencia', name:'Essência', description:'Orgânico, acolhedor e cheio de respiro. Para espaços de cuidado.', defaults:{primary:'#c7e4a4',secondary:'#b6cbbf',font:'editorial',shape:'soft',mode:'dark',background:'tinted',servicesView:'cards',density:'comfortable',media:'illustration',headline:'Um cuidado.\nUma pausa.\nUm tempo seu.',eyebrow:'SEU BEM-ESTAR TEM HORA MARCADA',cta:'Encontrar meu momento'} },
  { id:'barber', name:'Barber Club', description:'Tipografia forte, linhas retas e presença. Clássico com atitude.', defaults:{primary:'#e0b96b',secondary:'#b88768',font:'bold',shape:'square',mode:'dark',background:'warm',servicesView:'list',density:'comfortable',media:'illustration',headline:'Seu estilo.\nSua marca.',eyebrow:'PRECISÃO EM CADA DETALHE',cta:'Marcar meu horário'} },
  { id:'atelier', name:'Ateliê', description:'Composição editorial, título central e detalhes elegantes.', defaults:{primary:'#8d4167',secondary:'#b39972',font:'editorial',shape:'soft',mode:'light',background:'warm',servicesView:'cards',density:'comfortable',media:'illustration',headline:'Beleza, nos seus\npróprios termos.',eyebrow:'FEITO PARA VALORIZAR VOCÊ',cta:'Reservar minha experiência'} },
  { id:'pop', name:'Pop Studio', description:'Cores expressivas, formas redondas e uma energia criativa.', defaults:{primary:'#d7ee59',secondary:'#c39af0',font:'rounded',shape:'round',mode:'dark',background:'neutral',servicesView:'cards',density:'comfortable',media:'illustration',headline:'Seu próximo look\ncomeça aqui.',eyebrow:'SEJA VOCÊ. DO SEU JEITO.',cta:'Quero esse momento'} },
  { id:'minimal', name:'Direto ao ponto', description:'Apresentação compacta, limpa e focada nos seus serviços.', defaults:{primary:'#397f71',secondary:'#7d91b5',font:'modern',shape:'soft',mode:'light',background:'neutral',servicesView:'list',density:'compact',media:'none',headline:'Seu horário.\nDo seu jeito.',eyebrow:'SIMPLES DE ESCOLHER. FÁCIL DE AGENDAR.',cta:'Ver serviços e horários'} },
];
export const defaultAppearance = {
  version:1, template:'essencia', ...templates[0].defaults,
  description:'', logoUrl:'', coverUrl:'', coverPosition:'center',
  showAddress:true, showBenefits:true, showProfessionals:true, showClosing:true,
  showDescriptions:true, colorfulServices:false,
  closing:'Seu tempo é precioso.\nO seu cuidado também.', instagram:'', whatsapp:'',
};
const choices = {
  template:templates.map(t=>t.id), font:['editorial','modern','rounded','bold'],
  shape:['square','soft','round'], mode:['dark','light','system'], background:['neutral','warm','tinted'],
  servicesView:['cards','list'], density:['comfortable','compact'],
  media:['illustration','photo','none'], coverPosition:['top','center','bottom'],
};
const textLimits = {headline:120,eyebrow:60,cta:40,description:300,closing:140,whatsapp:24};
export const isHex = value => typeof value==='string' && /^#[0-9a-f]{6}$/i.test(value);
export function safeImageUrl(value, allowData=false) {
  if (typeof value!=='string' || !value) return '';
  if (allowData && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
  try { const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&value.length<=2048?value:''; } catch { return ''; }
}
export function safeInstagram(value) {
  try { const url=new URL(value);return url.protocol==='https:'&&['instagram.com','www.instagram.com'].includes(url.hostname)&&!url.username&&!url.password&&value.length<=2048?value:''; } catch { return ''; }
}
export function normalizeAppearance(input={}, {allowData=false}={}) {
  const raw=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  const template=templates.find(t=>t.id===raw.template)||templates[0];
  const result={...defaultAppearance,...template.defaults,template:template.id};
  for (const [key,allowed] of Object.entries(choices)) if (allowed.includes(raw[key])) result[key]=raw[key];
  for (const key of ['primary','secondary']) if (isHex(raw[key])) result[key]=raw[key].toLowerCase();
  for (const [key,limit] of Object.entries(textLimits)) if (typeof raw[key]==='string') result[key]=raw[key].slice(0,limit);
  for (const key of ['showAddress','showBenefits','showProfessionals','showClosing','showDescriptions','colorfulServices']) if (typeof raw[key]==='boolean')result[key]=raw[key];
  result.logoUrl=safeImageUrl(raw.logoUrl,allowData);result.coverUrl=safeImageUrl(raw.coverUrl,allowData);
  result.instagram=safeInstagram(raw.instagram);
  if (result.whatsapp && !/^[+\d()\s-]{10,24}$/.test(result.whatsapp))result.whatsapp='';
  return result;
}
export function applyTemplate(current,id) {
  const target=templates.find(t=>t.id===id)||templates[0];
  const previous=templates.find(t=>t.id===current.template)||templates[0];
  const next={...current,...target.defaults,template:target.id};
  for(const key of ['headline','eyebrow','cta'])if(current[key]!==previous.defaults[key])next[key]=current[key];
  return next;
}
export function validateAppearance(value,{allowData=false}={}) {
  if(!isHex(value.primary)||!isHex(value.secondary))throw new Error('Use cores no formato #123ABC.');
  for(const key of ['logoUrl','coverUrl'])if(value[key]&&!safeImageUrl(value[key],allowData))throw new Error('Use uma imagem enviada ou uma URL HTTPS válida.');
  if(value.media==='photo'&&!value.coverUrl)throw new Error('Envie uma capa ou escolha uma ilustração.');
  if(value.instagram&&!safeInstagram(value.instagram))throw new Error('Informe um link HTTPS do Instagram.');
  if(value.whatsapp&&!/^[+\d()\s-]{10,24}$/.test(value.whatsapp))throw new Error('Informe o WhatsApp da loja com DDD e código do país.');
  return normalizeAppearance(value,{allowData});
}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
export const mix=(a,b,ratio)=>'#'+rgb(a).map((x,i)=>Math.round(x*(1-ratio)+rgb(b)[i]*ratio).toString(16).padStart(2,'0')).join('');
function luminance(hex){const values=rgb(hex).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return values[0]*.2126+values[1]*.7152+values[2]*.0722;}
export function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export const inkFor=bg=>contrast('#000000',bg)>=contrast('#ffffff',bg)?'#000000':'#ffffff';
export function readable(color,bg,target=4.5){if(contrast(color,bg)>=target)return color;const end=inkFor(bg);for(let i=1;i<=20;i++){const candidate=mix(color,end,i/20);if(contrast(candidate,bg)>=target)return candidate;}return end;}
export function appearanceVariables(settings,mode='dark') {
  const a=normalizeAppearance(settings,{allowData:true});
  const light=mode==='light';
  let bg=light?'#f7f8f2':'#111713';
  if(a.background==='warm')bg=light?'#faf5ed':'#1d1713';
  if(a.background==='tinted')bg=mix(a.primary,light?'#ffffff':'#080d10',light ? .95 : .94);
  const text=light?'#18221c':'#f4f3ee';
  const panel=light?'#ffffff':mix(bg,'#ffffff',.045);
  const fonts={editorial:'Georgia, "Times New Roman", serif',modern:'"Segoe UI", Arial, sans-serif',rounded:'"Trebuchet MS", Verdana, sans-serif',bold:'Impact, "Arial Black", sans-serif'};
  return {
    '--bg':bg,'--panel':panel,'--panel-hover':mix(panel,a.primary,.07),'--text':text,
    '--muted':readable(mix(text,bg,.35),bg),'--faint':readable(mix(text,bg,.42),bg),
    '--line':mix(bg,text,.2),'--accent':a.primary,'--accent-text':inkFor(a.primary),
    '--accent-ink':readable(a.primary,bg),'--secondary':a.secondary,'--secondary-ink':readable(a.secondary,bg),
    '--hero':mix(bg,a.primary,light ? .07 : .1),'--soft':mix(panel,a.primary,.07),
    '--heading-font':fonts[a.font],'--body-font':a.font==='rounded'?fonts.rounded:fonts.modern,
    '--radius':{square:'3px',soft:'12px',round:'26px'}[a.shape],
    '--shadow':light?'0 20px 60px #1723190d':'0 20px 60px #0003',
    colorScheme:light?'light':'dark',
  };
}
