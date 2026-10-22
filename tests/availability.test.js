import { describe, it, expect } from 'vitest';
import { demoAvailability, compatibleProfessionals, normalizePhone, overlaps, uniqueSlots, dateKey } from '../src/lib/availability';
const pro={id:'p1',service_ids:['s1','s2']};
const base={date:'2026-10-23',duration:60,professionals:[pro],now:new Date('2026-10-22T12:00:00Z')};
describe('Scheduling invariants',()=>{
 it('allows adjacent appointments but rejects overlaps',()=>{expect(overlaps(60,120,120,180)).toBe(false);expect(overlaps(60,121,120,180)).toBe(true);});
 it('keeps the full duration within working hours',()=>{const slots=demoAvailability(base);expect(slots[0].starts_at).toBe('2026-10-23T12:00:00.000Z');expect(slots.at(-1).starts_at).toBe('2026-10-23T20:00:00.000Z');});
 it('removes every overlapping candidate and recommends adjacent slots',()=>{const slots=demoAvailability({...base,bookings:[{professional_id:'p1',status:'confirmed',starts_at:'2026-10-23T14:00:00Z',ends_at:'2026-10-23T15:00:00Z'}]});expect(slots.some(s=>s.starts_at==='2026-10-23T13:15:00.000Z')).toBe(false);expect(slots.find(s=>s.starts_at==='2026-10-23T13:00:00.000Z').recommended).toBe(true);expect(slots.find(s=>s.starts_at==='2026-10-23T15:00:00.000Z').recommended).toBe(true);});
 it('ignores cancellations and another professional’s bookings',()=>{expect(demoAvailability({...base,bookings:[{professional_id:'p2',status:'confirmed',starts_at:'2026-10-23T12:00:00Z',ends_at:'2026-10-23T21:00:00Z'},{professional_id:'p1',status:'cancelled',starts_at:'2026-10-23T12:00:00Z',ends_at:'2026-10-23T21:00:00Z'}]})).toHaveLength(demoAvailability(base).length);});
 it('never suggests past slots or closed Sundays',()=>{expect(demoAvailability({...base,now:new Date('2026-10-23T20:01:00Z')})).toHaveLength(0);expect(demoAvailability({...base,date:'2026-10-25'})).toHaveLength(0);});
 it('requires a professional who can do every selected service',()=>{expect(compatibleProfessionals([pro,{id:'p2',service_ids:['s1']}],['s1','s2'])).toEqual([pro]);});
 it('deduplicates slots and chooses the better fit',()=>{expect(uniqueSlots([{starts_at:'a',professional_id:'p1',recommended:false},{starts_at:'a',professional_id:'p2',recommended:true}])).toEqual([{starts_at:'a',professional_id:'p2',recommended:true}]);});
 it('normalizes Brazilian WhatsApp numbers and rejects incomplete ones',()=>{expect(normalizePhone('(11) 99999-9999')).toBe('+5511999999999');expect(normalizePhone('+55 11 99999-9999')).toBe('+5511999999999');expect(()=>normalizePhone('123')).toThrow();});
 it('resolves the calendar day in the studio timezone',()=>{expect(dateKey(new Date('2026-10-23T01:00:00Z'),'America/Sao_Paulo')).toBe('2026-10-22');});
});
