import { test, expect } from '@playwright/test';

// A separate build uses only a fictional API URL. All its requests are intercepted;
// no user accounts, emails, shops or bookings are created in the real project.
async function mockSupabase(page) {
  const user = { id: '99999999-9999-4999-8999-999999999999', email: 'owner@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: { full_name: 'Dono Teste' }, created_at: new Date().toISOString() };
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const accessToken = `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:user.id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.test-signature`;
  const shops = [];
  const bookings = [];
  const requests = [];
  await page.route('**/*',async route=>{
    const request = route.request(); const url = new URL(request.url());
    if (url.hostname === '127.0.0.1') return route.continue();
    if (url.hostname !== 'merchant-tests.supabase.co') throw new Error(`Unexpected remote destination ${url.hostname}`);
    requests.push({path:url.pathname,method:request.method()});
    const send = (body,status=200) => route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'},body:JSON.stringify(body)});
    if (request.method()==='OPTIONS') return send({});
    if (url.pathname==='/auth/v1/signup') return send({user,session:null});
    if (url.pathname==='/auth/v1/token') return send({access_token:accessToken,refresh_token:'fake-test-refresh',expires_in:3600,token_type:'bearer',user});
    if (url.pathname==='/auth/v1/user') return send(user);
    if (url.pathname==='/auth/v1/logout') return send({});
    if (url.pathname==='/rest/v1/rpc/create_tenant') {
      const values = request.postDataJSON();
      if (shops.some(s=>s.slug===values.p_slug)) return send({message:'Este link já está em uso. Escolha outro nome para o link.',code:'23505'},409);
      const n=shops.length+1;
      const shop={id:`aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12,'0')}`,slug:values.p_slug,name:values.p_name,active:true,timezone:'America/Sao_Paulo',address:values.p_address,description:'Seu espaço de cuidado.',popup:{enabled:false},service:{id:`service-${n}`,name:values.p_service_name,price:values.p_price,duration:values.p_duration,category:'Serviços',active:true},professional:{id:`pro-${n}`,name:values.p_professional_name,active:true}};
      shops.push(shop);return send({id:shop.id,slug:shop.slug,name:shop.name});
    }
    if (url.pathname==='/rest/v1/memberships') {
      if (url.searchParams.get('select')==='role') return send(shops.some(s=>`eq.${s.id}`===url.searchParams.get('tenant_id'))?[{role:'admin'}]:[]);
      return send(shops.map(s=>({tenant_id:s.id,role:'admin',tenant:{id:s.id,slug:s.slug,name:s.name,active:true}})));
    }
    if (url.pathname==='/rest/v1/tenants') {
      if(request.method()==='PATCH') { const target=shops.find(s=>`eq.${s.id}`===url.searchParams.get('id')); if(!target)return send({message:'Not found'},404);target.appearance=request.postDataJSON().appearance;return send({appearance:target.appearance}); }
      return send(shops.filter(s=>`eq.${s.slug}`===url.searchParams.get('slug')));
    }
    const shop=shops.find(s=>`eq.${s.id}`===url.searchParams.get('tenant_id'));
    if (url.pathname==='/rest/v1/services') return send(shop?[shop.service]:[]);
    if (url.pathname==='/rest/v1/professionals') return send(shop?[shop.professional]:[]);
    if (url.pathname==='/rest/v1/professional_services') return send(shop?[{professional_id:shop.professional.id,service_id:shop.service.id}]:[]);
    if (url.pathname==='/rest/v1/bookings') {bookings.push(url.search);return send([]);}
    if (url.pathname==='/rest/v1/rpc/available_slots') return send([]);
    throw new Error(`Unhandled test API ${url.pathname}`);
  });
  return {shops,bookings,requests};
}
async function login(page) {
  await page.goto('/entrar');await page.getByLabel('E-mail',{exact:true}).fill('owner@example.test');await page.getByLabel('Senha',{exact:true}).fill('fake-password-123');await page.getByRole('button',{name:'Entrar na minha conta'}).click();await expect(page).toHaveURL(/\/painel$/);
}
async function create(page,name,service) {
  await page.getByRole('link',{name:'Criar uma loja',exact:true}).click();
  await page.getByLabel('Nome da loja',{exact:true}).fill(name);
  await page.getByLabel('Endereço ou local de atendimento').fill('Rua de Teste, 10 · São Paulo');
  await page.getByLabel('Nome do serviço',{exact:true}).fill(service);
  await page.getByLabel('Preço (R$)').fill('50');
  await page.getByLabel('Nome do primeiro profissional').fill('Pessoa Teste');
  await page.getByRole('button',{name:'Criar loja e abrir meu painel'}).click();
}
test('signup is available before any shop exists and requests email confirmation',async({page})=>{
 await mockSupabase(page);await page.goto('/');await page.getByRole('link',{name:'Criar minha loja',exact:true}).click();
 await page.getByLabel('Seu nome').fill('Dono Teste');await page.getByLabel('E-mail',{exact:true}).fill('owner@example.test');await page.getByLabel('Crie uma senha').fill('fake-password-123');await page.getByRole('button',{name:'Criar minha conta',exact:true}).click();await expect(page.getByRole('heading',{name:'Confira seu e-mail.'})).toBeVisible();
});
test('an owner creates two shops with different public links and starter catalogs',async({page})=>{
 const state=await mockSupabase(page);await login(page);await expect(page.getByRole('heading',{name:'Vamos abrir seu espaço?'})).toBeVisible();
 await create(page,'Barbearia do João','Corte do João');await expect(page).toHaveURL(/\/barbearia-do-joao\/admin$/);
 await expect(page.getByLabel('Link para seus clientes')).toHaveValue('http://127.0.0.1:4175/barbearia-do-joao');
 await page.getByRole('link',{name:'Gerenciar minhas lojas'}).click();await create(page,'Salão da Júlia','Manicure da Júlia');await expect(page).toHaveURL(/\/salao-da-julia\/admin$/);
 await page.goto('/barbearia-do-joao');await expect(page.locator('.storefront-brand strong')).toHaveText('Barbearia do João');await expect(page.getByRole('button',{name:/Corte do João/})).toBeVisible();await expect(page.getByRole('button',{name:/Manicure da Júlia/})).toHaveCount(0);
 await page.goto('/salao-da-julia');await expect(page.locator('.storefront-brand strong')).toHaveText('Salão da Júlia');await expect(page.getByRole('button',{name:/Manicure da Júlia/})).toBeVisible();
 await page.goto('/loja-que-nao-existe');await expect(page.getByText('Estabelecimento não encontrado.')).toBeVisible();
 expect(state.shops).toHaveLength(2);expect(state.shops[0].slug).not.toBe(state.shops[1].slug);
});
test('the explicit demo stays local even with Supabase configured and a signed-in owner',async({page})=>{
 const state=await mockSupabase(page);await login(page);await expect(page.getByRole('heading',{name:'Vamos abrir seu espaço?'})).toBeVisible();const before=state.requests.length;
 await page.goto('/demonstracao');await expect(page.getByRole('heading',{name:'Como vamos cuidar de você?'})).toBeVisible();
 await page.getByRole('button',{name:/Corte & finalização/}).click();await page.getByRole('link',{name:'Acesso profissional'}).click();await page.getByRole('button',{name:/Explorar painel/}).click();await expect(page.getByLabel('Link para seus clientes')).toHaveValue('http://127.0.0.1:4175/demonstracao');
 expect(state.requests.slice(before).filter(r=>r.path.startsWith('/rest/'))).toEqual([]);
});
test('creating a shop requires a login and root never opens an arbitrary shop',async({page})=>{
 const state=await mockSupabase(page);await page.goto('/criar-loja');await expect(page).toHaveURL(/\/entrar$/);
 await page.goto('/');await expect(page.getByRole('heading',{name:'Seu negócio. Sua agenda. Um link só seu.'})).toBeVisible();expect(state.requests.filter(r=>r.path.includes('tenants')||r.path.includes('create_tenant'))).toEqual([]);
});

test('publishing a store layout persists through the API and leaves another store unchanged',async({page})=>{
 const {shops}=await mockSupabase(page);await login(page);await create(page,'Identidade Um','Corte');
 await page.getByRole('link',{name:'Gerenciar minhas lojas'}).click();await create(page,'Identidade Dois','Manicure');
 await page.goto('/identidade-um/admin');await page.getByRole('button',{name:'Layout',exact:true}).click();
 await page.getByRole('button',{name:/Pop Studio/}).click();await page.getByRole('button',{name:'Textos',exact:true}).click();await page.getByLabel('Título principal').fill('Criatividade em cada detalhe');
 expect(shops[0].appearance).toBeUndefined();await page.getByRole('button',{name:'Salvar layout'}).click();await expect(page.getByRole('status')).toContainText('Layout publicado');
 expect(shops[0].appearance.template).toBe('pop');expect(shops[1].appearance).toBeUndefined();
 await page.getByRole('link',{name:'Ver página de agendamento'}).click();await expect(page.getByRole('heading',{name:'Criatividade em cada detalhe'})).toBeVisible();
 await page.goto('/identidade-dois');await expect(page.locator('.storefront')).toHaveAttribute('data-template','essencia');await expect(page.getByRole('heading',{name:'Um cuidado. Uma pausa. Um tempo seu.'})).toBeVisible();
});
