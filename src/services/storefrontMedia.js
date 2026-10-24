import { supabase, isDemoTenant } from './supabase';
const allowed=['image/jpeg','image/png','image/webp'];
export async function uploadStorefrontImage(tenantId,file) {
 if(!allowed.includes(file.type))throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
 if(file.size>5*1024*1024)throw new Error('A imagem precisa ter no máximo 5 MB.');
 const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('Não conseguimos abrir essa imagem. Tente outro arquivo.');});
 try{
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext('2d');if(!context)throw new Error('Seu navegador não conseguiu preparar a imagem.');
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.85));
  if(!blob)throw new Error('Não conseguimos preparar a imagem.');
  if(isDemoTenant(tenantId))return canvas.toDataURL('image/webp',.8);
  const path=`${tenantId}/${crypto.randomUUID()}.webp`;
  const {error}=await supabase.storage.from('storefront-media').upload(path,blob,{contentType:blob.type,upsert:false,cacheControl:'3600'});
  if(error)throw new Error('Não foi possível enviar a imagem. Confira sua conexão e tente novamente.');
  return supabase.storage.from('storefront-media').getPublicUrl(path).data.publicUrl;
 }finally{bitmap.close();}
}

export async function uploadAppIcon(tenantId,file) {
 if(!allowed.includes(file.type)||file.size>5*1024*1024)throw new Error('Escolha uma imagem JPG, PNG ou WebP de até 5 MB.');
 const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('Não conseguimos abrir essa imagem.');});
 try {
  const images={};const batch=crypto.randomUUID();
  for(const size of [192,512]){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
   const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível preparar o ícone.');
   // Contain the whole brand mark inside a square; never crop the logo.
   context.fillStyle='#ffffff';context.fillRect(0,0,size,size);
   const scale=size*.84/Math.max(bitmap.width,bitmap.height);const w=bitmap.width*scale,h=bitmap.height*scale;
   context.drawImage(bitmap,(size-w)/2,(size-h)/2,w,h);
   const key=size===512?'faviconUrl':'icon192Url';
   if(isDemoTenant(tenantId)){images[key]=canvas.toDataURL('image/png');continue;}
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Não foi possível preparar o ícone.');
   const path=`${tenantId}/${batch}-${size}.png`;
   const {error}=await supabase.storage.from('storefront-media').upload(path,blob,{contentType:'image/png',upsert:false});
   if(error)throw new Error('Não foi possível enviar o ícone. Tente novamente.');
   images[key]=supabase.storage.from('storefront-media').getPublicUrl(path).data.publicUrl;
  }
  return images;
 }finally{bitmap.close();}
}
