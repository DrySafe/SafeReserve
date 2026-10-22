import { describe,it,expect } from 'vitest';
import { slugify,validShopSlug,resolveTenant,shopLink,isDemoPath } from '../src/lib/tenant';
describe('Shop links and routing',()=>{
 it('does not turn a deployment hostname into a shop',()=>{
  expect(resolveTenant(undefined,'safereserve-preview-user.vercel.app')).toBeNull();
  expect(resolveTenant(undefined,'app.example.com')).toBeNull();
  expect(resolveTenant('barbearia-do-joao','preview.vercel.app')).toBe('barbearia-do-joao');
 });
 it('creates readable slugs from shop names',()=>{expect(slugify('  Salão da Júlia & Cia  ')).toBe('salao-da-julia-cia');});
 it('rejects reserved routes and invalid URLs',()=>{
  for(const slug of ['admin','cadastro','demonstracao','painel','criar-loja','ab','-joao','joao--silva','João','loja/errada'])expect(validShopSlug(slug)).toBe(false);
  expect(validShopSlug('barbearia-do-joao')).toBe(true);
 });
 it('keeps trailing-slash demo links explicit',()=>{expect(isDemoPath('/demonstracao/')).toBe(true);expect(isDemoPath('/demonstracao/admin/')).toBe(true);expect(isDemoPath('/demonstracao-outra')).toBe(false);});
 it('gives each shop its own link on the current deployment',()=>{
  expect(shopLink('loja-a','https://safereserve.example')).toBe('https://safereserve.example/loja-a');
  expect(shopLink('loja-b','https://safereserve.example')).toBe('https://safereserve.example/loja-b');
 });
});
