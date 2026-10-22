import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
export default function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  useEffect(() => { const handler = e => { e.preventDefault(); setPrompt(e); }; const installed = () => setPrompt(null); window.addEventListener('beforeinstallprompt', handler); window.addEventListener('appinstalled', installed); return () => { window.removeEventListener('beforeinstallprompt',handler); window.removeEventListener('appinstalled',installed); }; }, []);
  if (!prompt) return null;
  return <button className="text-button" onClick={async () => { await prompt.prompt(); setPrompt(null); }}><Download size={16}/> Adicionar à tela inicial</button>;
}
