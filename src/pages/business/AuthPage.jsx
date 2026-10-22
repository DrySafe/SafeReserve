import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MailCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase, unwrap } from '../../services/supabase';

export default function AuthPage({ register = false }) {
  const { session, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  if (loading) return <div className="page-state">Verificando sua conta…</div>;
  if (session) return <Navigate to={register ? '/criar-loja' : '/painel'} replace/>;

  const submit = async e => {
    e.preventDefault();
    if (!supabase || busy) return;
    setBusy(true); setError('');
    try {
      if (register) {
        await unwrap(supabase.auth.signUp({ email: email.trim(), password, options: {
          data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/criar-loja`,
        } }));
        setConfirmed(true);
      } else {
        await unwrap(supabase.auth.signInWithPassword({ email: email.trim(), password }));
      }
    } catch (err) {
      setError(register ? err.message : 'Não foi possível entrar. Confira o e-mail, a senha e a confirmação da sua conta.');
    } finally { setBusy(false); }
  };
  const resetPassword = async () => {
    if (!email || !supabase || busy) { setError('Preencha seu e-mail para recuperar a senha.'); return; }
    setBusy(true); setError('');
    try {
      await unwrap(supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/redefinir-senha` }));
      setResetMessage('Se houver uma conta com esse e-mail, você receberá as instruções para redefinir a senha.');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <main className="business-form-page">
    <Link to="/" className="text-button"><ArrowLeft size={16}/> Voltar para o início</Link>
    <section className="business-form-card">
      <span className="eyebrow">SEU NEGÓCIO, BEM CUIDADO</span>
      <h1>{register ? 'Comece pelo seu cadastro.' : 'Bom ter você de volta.'}</h1>
      <p className="muted">{register ? 'Crie sua conta e, em seguida, monte a loja com o seu próprio link.' : 'Entre para criar uma loja ou gerenciar seus estabelecimentos.'}</p>
      {!supabase && <div className="notice" role="status">O cadastro e o acesso estão temporariamente indisponíveis. Você pode <Link to="/demonstracao">explorar a demonstração</Link>.</div>}
      {confirmed ? <div className="signup-confirmation" role="status"><MailCheck size={36}/><h2>Confira seu e-mail.</h2><p>Confirme o cadastro pelo link recebido. Depois, entre na sua conta para criar a loja.</p><Link className="button primary" to="/entrar">Ir para o login <ArrowRight size={17}/></Link></div> : <form className="form" onSubmit={submit}>
        {register && <label>Seu nome<input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>}
        <label>E-mail<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>{register ? 'Crie uma senha' : 'Senha'}<input type="password" autoComplete={register?'new-password':'current-password'} required minLength={register?8:undefined} value={password} onChange={e=>setPassword(e.target.value)}/>{register && <small className="muted">Use pelo menos 8 caracteres.</small>}</label>
        <button className="button primary full" disabled={!supabase||busy}>{busy?'Aguarde…':register?'Criar minha conta':'Entrar na minha conta'}<ArrowRight size={17}/></button>
      </form>}
      {!register && <button className="text-button" disabled={!supabase||busy} onClick={resetPassword}>Esqueci minha senha</button>}
      {error && <p className="notice" role="alert">{error}</p>}
      {resetMessage && <p className="notice" role="status">{resetMessage}</p>}
      <p className="auth-switch">{register?'Já tem uma conta?':'Ainda não tem uma conta?'} <Link to={register?'/entrar':'/cadastro'}>{register?'Entrar':'Cadastre-se'}</Link></p>
    </section>
  </main>;
}
