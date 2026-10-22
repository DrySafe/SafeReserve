import { useEffect, useState } from 'react';
export function useTheme() {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('sr:theme') || 'dark'; } catch { return 'dark'; } });
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('sr:theme', theme); } catch {} }, [theme]);
  return { theme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark') };
}
