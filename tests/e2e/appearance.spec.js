import {test,expect} from '@playwright/test';
test('merchant previews, personalizes and publishes a distinct mobile storefront',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/demonstracao/admin');await page.getByRole('button',{name:/Explorar painel/}).click();
 await page.getByRole('button',{name:'Layout',exact:true}).click();
 const preview=page.frameLocator('iframe[title="Pré-visualização da loja"]');
 for(const name of ['Barber Club','Ateliê','Pop Studio','Direto ao ponto','Essência']){
  await page.getByRole('button',{name:new RegExp(name)}).click();
  await expect(preview.locator('.storefront')).toBeVisible();
  expect(await preview.locator('body').evaluate(el=>el.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.getByRole('button',{name:/Barber Club/}).click();
 await expect(preview.locator('.storefront')).toHaveAttribute('data-template','barber');
 await page.getByRole('button',{name:'Identidade',exact:true}).click();await page.getByRole('textbox',{name:'Cor principal',exact:true}).fill('#112233');
 const image=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=8;canvas.getContext('2d').fillRect(0,0,8,8);return canvas.toDataURL('image/png').split(',')[1];});
 await page.getByLabel('Enviar logo da loja').setInputFiles({name:'marca.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await expect(page.locator('.layout-image-thumbnail')).toBeVisible();
 await page.getByRole('button',{name:'Textos',exact:true}).click();await page.getByLabel('Título principal').fill('A sua melhor versão');
 await expect(preview.getByRole('heading',{name:'A sua melhor versão'})).toBeVisible();
 await page.getByRole('button',{name:'Prévia em computador'}).click();await expect(page.locator('iframe')).toHaveCSS('width','1100px');
 await page.getByRole('button',{name:'Apresentação',exact:true}).click();await page.getByLabel('Escolha de profissional').uncheck();
 await page.getByRole('button',{name:'Salvar layout'}).click();await expect(page.getByRole('status')).toContainText('Layout publicado');
 await page.getByRole('link',{name:'Ver página de agendamento'}).click();
 await expect(page.getByRole('heading',{name:'A sua melhor versão'})).toBeVisible();await expect(page.locator('.storefront')).toHaveAttribute('data-template','barber');
 expect(await page.locator('.storefront').evaluate(el=>getComputedStyle(el).getPropertyValue('--accent').trim())).toBe('#112233');
 await expect(page.locator('.service-grid')).toHaveAttribute('data-view','list');
 await page.getByRole('button',{name:/Corte & finalização/}).click();await expect(page.getByRole('button',{name:/Marina Costa/})).toHaveCount(0);const days=page.locator('.day');for(let i=1;i<7;i++){await days.nth(i).click();await expect(page.locator('.slots')).toHaveAttribute('aria-busy','false');if(await page.locator('.time-slot').count())break;}await expect(page.locator('.time-slot').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.storefront-logo img')).toHaveAttribute('src',/^data:image\/webp/);await page.reload();await expect(page.getByRole('heading',{name:'A sua melhor versão'})).toBeVisible();
 expect(errors).toEqual([]);
});
