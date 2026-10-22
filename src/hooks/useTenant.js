import { useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { loadStudio } from '../services/api';
import { resolveTenant, isDemoPath } from '../lib/tenant';
export { resolveTenant } from '../lib/tenant';

export function useTenant() {
  const { tenant: pathSlug } = useParams();
  const { pathname } = useLocation();
  const demo = isDemoPath(pathname);
  const slug = demo ? 'demonstracao' : resolveTenant(pathSlug);
  return {
    slug, demo,
    ...useQuery({ queryKey: ['studio', slug], queryFn: () => loadStudio(slug), enabled: Boolean(slug), staleTime: 60_000 }),
  };
}
