import {describe,it,expect} from 'vitest';
import {templates,palettes,normalizeAppearance,applyTemplate,validateAppearance,appearanceVariables,contrast} from '../src/lib/appearance';
describe('store appearance',()=>{
 it('normalizes structured settings and removes executable or unknown fields',()=>{
  const a=normalizeAppearance({primary:'red;background:red',logoUrl:'javascript:alert(1)',font:'evil',customCss:'x',showBenefits:null});
  expect(a.primary).toBe('#c7e4a4');expect(a.logoUrl).toBe('');expect(a.font).toBe('editorial');expect(a.showBenefits).toBe(true);expect(a).not.toHaveProperty('customCss');
 });
 it('applies distinct models while retaining personalized copy and images',()=>{
  const a=normalizeAppearance({headline:'Minha marca',logoUrl:'https://example.com/logo.png'});
  const b=applyTemplate(a,'barber');expect(b.headline).toBe('Minha marca');expect(b.logoUrl).toBe(a.logoUrl);expect(b.servicesView).toBe('list');expect(b.font).toBe('bold');
  expect(applyTemplate(normalizeAppearance(),'atelier').headline).toBe(templates[2].defaults.headline);
  expect(new Set(templates.map(t=>t.defaults.headline)).size).toBe(5);
 });
 it('keeps chosen button colors readable in both modes and every palette',()=>{
  for(const palette of [...palettes,{primary:'#000000',secondary:'#ffffff'},{primary:'#777777',secondary:'#888888'}])for(const mode of ['light','dark']){
   const v=appearanceVariables(palette,mode);expect(contrast(v['--accent'],v['--accent-text'])).toBeGreaterThanOrEqual(4.5);expect(contrast(v['--accent-ink'],v['--bg'])).toBeGreaterThanOrEqual(4.5);expect(contrast(v['--muted'],v['--bg'])).toBeGreaterThanOrEqual(4.5);
  }
 });
 it('validates images and contact links before publishing',()=>{
  expect(()=>validateAppearance({...normalizeAppearance(),media:'photo'})).toThrow(/capa/);
  expect(()=>validateAppearance({...normalizeAppearance(),instagram:'https://evil.com'})).toThrow(/Instagram/);
  expect(()=>validateAppearance({...normalizeAppearance(),logoUrl:'http://example.com/logo.png'})).toThrow(/HTTPS/);
  expect(normalizeAppearance({logoUrl:'data:image/png;base64,AAAA'}).logoUrl).toBe('');
  expect(normalizeAppearance({logoUrl:'data:image/png;base64,AAAA'},{allowData:true}).logoUrl).toContain('data:image');
 });
});
