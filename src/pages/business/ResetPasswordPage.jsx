import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase, unwrap } from '../../services/supabase';

export default function ResetPasswordPage() {
  const { session, loading } = useAuth();
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const navigate = useNavigate();
  if (loading) return <div className="page-state">Verificando seu link…</div>;
  return <main className="business-form-page"><section className="business-form-card"><h1>Uma nova senha.</h1>{session ? <form className="form" onSubmit={async e=>{
    e.preventDefault();setBusy(true);setError('');
    try { await unwrap(supabase.auth.updateUser({password}));navigate('/painel',{replace:true}); }
    catch(err){setError(err.message);}finally{setBusy(false);}
  }}><label>Nova senha<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="button primary" disabled={busy}>Salvar nova senha</button></form> : <><p>Abra o link de recuperação recebido por e-mail para criar uma nova senha.</p><Link to="/entrar" className="button primary">Voltar para entrar</Link></>}{error&&<p className="notice" role="alert">{error}</p>}</section></main>;
}
