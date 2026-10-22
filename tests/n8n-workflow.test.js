import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const workflow=JSON.parse(readFileSync(new URL('../integrations/n8n/whatsapp.workflow.json',import.meta.url)));
const validate=new Function('$json','$vars',workflow.nodes.find(n=>n.name==='Validate event').parameters.jsCode);
const body={event_id:'event-1',event:'Agendamento_Criado',tenant_id:'tenant-a',data:{tenant_id:'tenant-a',name:'Cliente',phone:'+5511999999999',starts_at:'2026-10-23T12:00:00Z'}};
const config={SAFERESERVE_TENANTS:JSON.stringify({'tenant-a':{account_id:1,inbox_id:2,chatwoot_origin:'https://chatwoot.example.test',booking_url:'https://studio.example.test',name:'Studio',timezone:'America/Sao_Paulo',templates:{Agendamento_Criado:{name:'reserva_confirmada',parameters:['name','date','time']}}}})};
it('routes only to a configured tenant inbox and builds a public outgoing WhatsApp template',()=>{const [result]=validate({body},config);expect(result.json.config.inbox_id).toBe(2);expect(result.json.message.private).toBe(false);expect(result.json.message.template_params.processed_params.body['3']).toBe('09:00');expect(workflow.active).toBe(false);});
it('rejects a mismatched tenant envelope',()=>{expect(()=>validate({body:{...body,data:{...body.data,tenant_id:'tenant-b'}}},config)).toThrow('Invalid event');});
it('rejects unknown tenants instead of using a default inbox',()=>{expect(()=>validate({body},{SAFERESERVE_TENANTS:'{}'})).toThrow('Tenant is not configured');});
