export const reservedSlugs = new Set([
  'admin', 'cadastro', 'entrar', 'painel', 'criar-loja', 'demonstracao',
  'auth', 'redefinir-senha', 'api', 'assets', 'www',
]);

export function slugify(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
}

export function validShopSlug(value) {
  return value.length >= 3 && value.length <= 60
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && !reservedSlugs.has(value);
}

// Shop selection is explicit in the path. Preview hostnames are never tenant IDs.
export function resolveTenant(pathSlug) {
  return pathSlug || null;
}

export function shopLink(slug, origin = window.location.origin) {
  return new URL(`/${encodeURIComponent(slug)}`, origin).href;
}

export function isDemoPath(pathname) {
  const path = pathname.replace(/\/+$/, '');
  return path === '/demonstracao' || path === '/demonstracao/admin' || path === '/demonstracao/gestao';
}
