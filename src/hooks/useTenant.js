import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { loadStudio } from '../services/api';
export function resolveTenant(pathSlug, hostname) {
  if (pathSlug) return pathSlug;
  const parts = hostname.split('.');
  if (parts.length > 2 && !['www','app'].includes(parts[0]) && !/^\d+$/.test(parts[0])) return parts[0];
  return 'studio-aurora';
}
export function useTenant() {
  const { tenant: pathSlug } = useParams();
  const slug = resolveTenant(pathSlug, window.location.hostname);
  return { slug, ...useQuery({ queryKey: ['studio', slug], queryFn: () => loadStudio(slug), staleTime: 60_000 }) };
}
