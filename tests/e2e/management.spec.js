import {test,expect} from '@playwright/test';
import {dateKey} from '../../src/lib/availability.js';
test('desktop management paginates all results, corrects contacts, reschedules and cancels',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});
 await page.goto('/demonstracao/');
 const today=dateKey(new Date(),'America/Sao_Paulo');const day=n=>{const d=new Date(`${today}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 const bookings=Array.from({length:54},(_,i)=>{const date=day(1+Math.floor(i/9));const hour=9+i%9;return {id:`appointment-${i}`,tenant_id:'demo',name:`Cliente ${String(i).padStart(2,'0')}`,phone:'+5511999999999',professional_id:'p1',service_ids:['s1'],service_snapshot:[{id:'s1',name:'Corte & finalização',price:12000,duration:60}],starts_at:new Date(`${date}T${String(hour).padStart(2,'0')}:00:00-03:00`).toISOString(),ends_at:new Date(`${date}T${String(hour+1).padStart(2,'0')}:00:00-03:00`).toISOString(),total:12000,status:'confirmed'};});
 await page.evaluate(b=>sessionStorage.setItem('sr:demo:bookings',JSON.stringify(b)),bookings);
 await page.goto('/demonstracao/gestao');await expect(page).toHaveURL(/\/demonstracao\/gestao\/$/);await page.getByRole('button',{name:/Explorar painel/}).click();
 await expect(page.getByRole('heading',{name:'Gestão Studio Aurora'})).toBeVisible();await expect(page).toHaveTitle('Gestão Studio Aurora');
 await page.getByRole('button',{name:'Próximos 7 dias',exact:true}).click();await expect(page.getByText('54 atendimentos encontrados')).toBeVisible();await expect(page.locator('tbody tr')).toHaveCount(50);
 await page.getByRole('button',{name:'Próxima',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(4);await expect(page.getByText('Exibindo 51–54 de 54')).toBeVisible();
 await page.getByRole('button',{name:'Anterior',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(50);
 await page.getByLabel('Buscar cliente ou WhatsApp').fill('Cliente 00');await expect(page.locator('tbody tr')).toHaveCount(1);await page.getByRole('button',{name:'Ver detalhes'}).click();
 await page.getByLabel('Nome do cliente').fill('Cliente Corrigido');await page.getByRole('button',{name:'Salvar contato'}).click();await expect(page.getByText('Contato atualizado.')).toBeVisible();await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.getByLabel('Buscar cliente ou WhatsApp').fill('Corrigido');await expect(page.locator('tbody tr')).toHaveCount(1);await page.getByRole('button',{name:'Ver detalhes'}).click();await page.getByRole('button',{name:'Reagendar atendimento'}).click();
 // Choose an unoccupied, working day beyond the seeded appointments.
 let target=day(8);if(new Date(`${target}T12:00:00Z`).getUTCDay()===0)target=day(9);
 await page.getByLabel('Nova data').fill(target);await page.locator('.time-slot').first().click();await page.getByRole('button',{name:'Confirmar novo horário'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByLabel('Até',{exact:true}).fill(day(10));await expect(page.locator('tbody tr')).toHaveCount(1);await page.getByRole('button',{name:'Ver detalhes'}).click();await page.getByRole('button',{name:'Cancelar atendimento',exact:true}).click();await page.getByRole('button',{name:'Confirmar cancelamento'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('tbody .status')).toHaveText('Cancelado');
 await page.getByLabel('Buscar cliente ou WhatsApp').fill('');await page.getByRole('button',{name:'Ver por profissional'}).click();await expect(page.locator('.management-column').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByText('54 atendimentos encontrados')).toBeVisible();await page.screenshot({path:'/tmp/safereserve-management.png'});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('store and management use separate HTTP manifests and install instructions preserve the store path',async({page,request})=>{
 await page.goto('/demonstracao');await expect(page).toHaveURL(/\/demonstracao\/$/);await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','/api/manifest?tenant=demonstracao&app=customer');
 const cdp=await page.context().newCDPSession(page);const parsed=await cdp.send('Page.getAppManifest');expect(parsed.errors).toEqual([]);expect(parsed.url).toContain('/api/manifest?tenant=demonstracao&app=customer');
 const customer=await request.get('/api/manifest?tenant=demonstracao&app=customer');expect(customer.headers()['content-type']).toContain('manifest+json');expect((await customer.json()).start_url).toBe('/demonstracao/');
 await page.getByRole('button',{name:'Adicionar à tela inicial'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('link',{name:'Reabrir esta página para instalar'})).toHaveAttribute('href','/demonstracao/');await page.getByRole('button',{name:'Fechar',exact:true}).click();
 await page.goto('/demonstracao/gestao/');await page.getByRole('button',{name:/Explorar painel/}).click();await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','/api/manifest?tenant=demonstracao&app=management');
 const management=await request.get('/api/manifest?tenant=demonstracao&app=management');const manifest=await management.json();expect(manifest.start_url).toBe('/demonstracao/gestao/');expect(manifest.name).toBe('Gestão Studio Aurora');expect(manifest.id).not.toBe((await customer.json()).id);
 await page.getByRole('button',{name:'Instalar gestão desta loja'}).click();await expect(page.getByRole('link',{name:'Reabrir esta página para instalar'})).toHaveAttribute('href','/demonstracao/gestao/');
});
