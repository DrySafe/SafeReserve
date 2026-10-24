import { test, expect } from '@playwright/test';
test('mobile guest booking, admin cancellation and popup configuration',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/demonstracao');await expect(page.getByRole('heading',{name:'Um cuidado. Uma pausa. Um tempo seu.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Ativar tema claro'}).click();await expect(page.locator('.storefront')).toHaveAttribute('data-mode','light');
 await page.getByRole('button',{name:/Corte & finalização/}).click();
 await expect(page.getByRole('button',{name:/Marina Costa/})).toBeVisible();await expect(page.getByRole('button',{name:/Júlia Lima/})).toHaveCount(0);
 await page.getByRole('button',{name:/Marina Costa/}).click();
 const days=page.locator('.day');for(let i=1;i<7;i++){await days.nth(i).click();await expect(page.locator('.slots')).toHaveAttribute('aria-busy','false');if(await page.locator('.time-slot').count())break;}
 await page.locator('.time-slot').first().click();await page.locator('.mobile-booking-bar').getByRole('button',{name:'Reservar',exact:true}).click();
 await page.getByLabel('Como você se chama?').fill('Cliente Teste');await page.getByLabel('Seu WhatsApp').fill('(11) 99999-9999');await page.getByLabel(/Aceito receber/).check();await page.getByRole('button',{name:'Confirmar meu agendamento'}).click();
 await expect(page.getByRole('heading',{name:'Seu momento está reservado.'})).toBeVisible();await expect(page.getByRole('link',{name:/Adicionar ao Google Agenda/})).toHaveAttribute('href',/calendar.google.com/);
 await page.getByRole('button',{name:'Voltar para o início'}).click();
 await page.getByRole('link',{name:'Acesso profissional'}).click();await page.getByRole('button',{name:/Explorar painel/}).click();await expect(page.getByText('Cliente Teste',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Reagendar',exact:true}).click();await page.getByRole('dialog').locator('.time-slot').last().click();await page.getByRole('button',{name:'Confirmar novo horário'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(page.getByText('Cancelado',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Serviços',exact:true}).click();const service=page.locator('.admin-service').first();await service.getByLabel('Preço (R$)').fill('135');await service.getByRole('button',{name:'Salvar serviço'}).click();await expect(service.getByText('Serviço atualizado.')).toBeVisible();
 await page.getByRole('button',{name:'Produtos',exact:true}).click();const product=page.locator('.admin-service').first();await product.getByLabel('Nome do produto').fill('Óleo essencial');await product.getByLabel('Preço (R$)').fill('35');await product.getByRole('button',{name:'Salvar produto'}).click();await expect(page.getByLabel('Nome do produto').nth(1)).toHaveValue('Óleo essencial');
 await page.getByRole('button',{name:'Avisos & promoções'}).click();await page.getByLabel('Ativar aviso na abertura').check();await page.getByLabel('Título',{exact:true}).fill('Terça de autocuidado');await page.getByLabel('Mensagem',{exact:true}).fill('Reserve seu momento nesta semana.');await page.getByRole('button',{name:'Salvar aviso'}).click();await expect(page.getByText('Aviso atualizado.')).toBeVisible();
 await page.getByRole('link',{name:'Ver página de agendamento'}).click();await expect(page.getByRole('heading',{name:'Terça de autocuidado'})).toBeVisible();await page.getByRole('button',{name:'Vamos lá'}).click();await expect(page.getByRole('button',{name:/Corte & finalização/})).toContainText('R$ 135');
 expect(errors).toEqual([]);
});
test('desktop layout, tenant rejection and waitlist flow',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto('/demonstracao');await expect(page.locator('.summary')).toBeVisible();
 await page.screenshot({path:'/tmp/safereserve-desktop.png',fullPage:true});
 await page.getByRole('button',{name:/Manicure essencial/}).click();await page.getByRole('button',{name:'Entrar na lista de espera',exact:true}).click();await page.getByLabel('Como você se chama?').fill('Cliente Fila');await page.getByLabel('Seu WhatsApp').fill('11988888888');await page.getByLabel(/Aceito receber/).check();await page.getByRole('dialog').getByRole('button',{name:'Entrar na lista de espera',exact:true}).click();await expect(page.getByRole('heading',{name:'Você está na lista!'})).toBeVisible();
 await page.getByRole('button',{name:'Voltar para o início'}).click();await page.goto('/outro-salao');await expect(page.getByRole('heading',{name:'Não conseguimos abrir este espaço.'})).toBeVisible();
});
test('installed shell loads offline and never confirms offline bookings',async({page,context})=>{
 await page.goto('/demonstracao');await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();
 await page.getByRole('button',{name:/Corte & finalização/}).click();const days=page.locator('.day');for(let i=1;i<7;i++){await days.nth(i).click();await expect(page.locator('.slots')).toHaveAttribute('aria-busy','false');if(await page.locator('.time-slot').count())break;}
 await page.locator('.time-slot').first().click();await page.locator('.mobile-booking-bar').getByRole('button',{name:'Reservar',exact:true}).click();await page.getByLabel('Como você se chama?').fill('Offline Teste');await page.getByLabel('Seu WhatsApp').fill('11999999999');await page.getByLabel(/Aceito receber/).check();
 await context.setOffline(true);await page.getByRole('button',{name:'Confirmar meu agendamento'}).click();await expect(page.getByText('Você está offline. Reconecte para confirmar um horário atualizado.')).toBeVisible();await page.getByRole('button',{name:'Fechar',exact:true}).click();await page.reload();await expect(page.getByRole('heading',{name:'Um cuidado. Uma pausa. Um tempo seu.'})).toBeVisible();await expect(page.locator('.offline-banner')).toBeVisible();await context.setOffline(false);
});

test('the platform root offers signup, login and a working explicit demo',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Seu negócio. Sua agenda. Um link só seu.'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Criar minha loja',exact:true})).toHaveAttribute('href','/cadastro');
 await page.getByRole('link',{name:'Já tenho conta'}).click();
 await expect(page.getByRole('heading',{name:'Bom ter você de volta.'})).toBeVisible();
 await page.goto('/');await page.getByRole('link',{name:'Experimentar a demonstração'}).click();
 await expect(page).toHaveURL(/\/demonstracao\/?$/);
 await expect(page.getByRole('heading',{name:'Como vamos cuidar de você?'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto('/demonstracao/');await expect(page.getByRole('heading',{name:'Como vamos cuidar de você?'})).toBeVisible();
});
