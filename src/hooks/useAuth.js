import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let receivedEvent = false;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      receivedEvent = true;
      if (active) { setSession(next); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedEvent) return;
      setSession(data.session);
      if (error) setError('Não conseguimos verificar sua sessão. Entre novamente.');
      setLoading(false);
    }).catch(() => { if (active) { setError('Não conseguimos verificar sua sessão.'); setLoading(false); } });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return { session, loading, error };
}
