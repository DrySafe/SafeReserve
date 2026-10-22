import { create } from 'zustand';
export const useBookingStore = create(set => ({ tenantSlug: null, serviceIds: [], professionalId: '', date: '', slot: null,
  setTenant: tenantSlug => set(s => s.tenantSlug === tenantSlug ? s : { tenantSlug, serviceIds: [], professionalId: '', date: '', slot: null }),
  toggleService: id => set(s => ({ serviceIds: s.serviceIds.includes(id) ? s.serviceIds.filter(x=>x!==id) : [...s.serviceIds,id], professionalId: '', slot: null })),
  setProfessional: professionalId => set({ professionalId, slot: null }),
  setDate: date => set({ date, slot: null }), setSlot: slot => set({ slot }),
  reset: () => set({ serviceIds: [], professionalId: '', date: '', slot: null }),
}));
