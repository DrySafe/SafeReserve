import { useQuery } from '@tanstack/react-query';
import { getAvailability } from '../services/api';
import { useBookingStore } from '../store/booking';
export function useBooking(studio) {
  const { date, serviceIds, professionalId } = useBookingStore();
  return useQuery({ queryKey: ['availability', studio?.tenant.id, date, [...serviceIds].sort(), professionalId], queryFn: () => getAvailability({ ...studio, date, serviceIds, professionalId }), enabled: Boolean(studio && date && serviceIds.length), staleTime: 0, refetchInterval: 30_000, retry: 1 });
}
