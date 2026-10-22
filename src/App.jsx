import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { Sun, Moon, WifiOff, ArrowUpRight } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTheme } from './hooks/useTheme';
import { isDemo } from './services/supabase';
import BookingPage from './pages/tenant/BookingPage';
import AdminPage from './pages/admin/AdminPage';
import InstallButton from './components/ui/InstallButton';
const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:true}}});
function Shell() {
 const {theme,toggleTheme}=useTheme();const [online,setOnline]=useState(navigator.onLine);
 const {needRefresh:[needRefresh,setNeedRefresh],updateServiceWorker}=useRegisterSW();
 useEffect(()=>{const yes=()=>setOnline(true);const no=()=>setOnline(false);window.addEventListener('online',yes);window.addEventListener('offline',no);return()=>{window.removeEventListener('online',yes);window.removeEventListener('offline',no);};},[]);
 return <><header className="site-header"><div className="header-inner"><Link className="brand" to="/" aria-label="SafeReserve início"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 20c8 12 20-2 9-5C2 12 16 0 23 9" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/><path d="m20 22 4 4 6-8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>safe<span>reserve</span><i>®</i></Link><span className="header-tagline">Seu tempo, bem cuidado.</span><div className="header-actions"><InstallButton/>{isDemo&&<span className="demo-badge">Demonstração</span>}<button className="icon-button theme-toggle" aria-label={theme==='dark'?'Ativar tema claro':'Ativar tema escuro'} onClick={toggleTheme}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></div></div></header>{!online&&<div className="offline-banner" role="status"><WifiOff size={16}/> Você está offline. Reconecte para consultar horários e confirmar reservas.</div>}{needRefresh&&<div className="update-banner" role="status">Uma nova versão está pronta.<button onClick={()=>updateServiceWorker(true)}>Atualizar</button><button aria-label="Depois" onClick={()=>setNeedRefresh(false)}>Depois</button></div>}
 <Routes><Route path="/" element={<BookingPage/>}/><Route path="/admin" element={<AdminPage/>}/><Route path="/:tenant/admin" element={<AdminPage/>}/><Route path="/:tenant" element={<BookingPage/>}/><Route path="*" element={<div className="page-state"><h1>Este caminho não existe.</h1><Link to="/" className="button primary">Ir para o início <ArrowUpRight size={16}/></Link></div>}/></Routes></>;
}
export default function App(){return <QueryClientProvider client={queryClient}><MotionConfig reducedMotion="user"><BrowserRouter><Shell/></BrowserRouter></MotionConfig></QueryClientProvider>;}
