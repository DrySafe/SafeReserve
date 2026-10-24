import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { Sun, Moon, WifiOff, ArrowUpRight } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTheme } from './hooks/useTheme';
import BookingPage from './pages/tenant/BookingPage';
import AdminPage from './pages/admin/AdminPage';
import InstallButton from './components/ui/InstallButton';
import { isDemoPath, reservedSlugs } from './lib/tenant';
import HomePage from './pages/business/HomePage';
import AuthPage from './pages/business/AuthPage';
import ShopsPage from './pages/business/ShopsPage';
import CreateShopPage from './pages/business/CreateShopPage';
import ResetPasswordPage from './pages/business/ResetPasswordPage';
const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:true}}});
function Shell() {
 const location=useLocation();
 const isDemo=isDemoPath(location.pathname);
 const segments=location.pathname.split('/').filter(Boolean);
 const publicStore=segments.length===1&&(!reservedSlugs.has(segments[0])||segments[0]==='demonstracao');
 useEffect(()=>{if(publicStore||segments.length===2&&['admin','gestao'].includes(segments[1]))return;const link=document.createElement('link');link.rel='manifest';link.href='/manifest.webmanifest';document.head.append(link);return()=>link.remove();},[location.pathname]);
 const {theme,toggleTheme}=useTheme();const [online,setOnline]=useState(navigator.onLine);
 const {needRefresh:[needRefresh,setNeedRefresh],updateServiceWorker}=useRegisterSW();
 useEffect(()=>{const yes=()=>setOnline(true);const no=()=>setOnline(false);window.addEventListener('online',yes);window.addEventListener('offline',no);return()=>{window.removeEventListener('online',yes);window.removeEventListener('offline',no);};},[]);
 if((publicStore||segments.length===2&&segments[1]==='gestao')&&!location.pathname.endsWith('/'))return <Navigate replace to={`${location.pathname}/${location.search}${location.hash}`}/>;
 return <>{!publicStore&&segments[1]!=='gestao'&&<header className="site-header"><div className="header-inner"><Link className="brand" to="/" aria-label="SafeReserve início"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M6 20c8 12 20-2 9-5C2 12 16 0 23 9" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"/><path d="m20 22 4 4 6-8" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>safe<span>reserve</span><i>®</i></Link><span className="header-tagline">Seu tempo, bem cuidado.</span><div className="header-actions">{segments[1]==='admin'?<Link className="text-button" to={`/${segments[0]}/gestao/`}>Instalar gestão</Link>:<InstallButton/>}{isDemo&&<span className="demo-badge">Demonstração</span>}<button className="icon-button theme-toggle" aria-label={theme==='dark'?'Ativar tema claro':'Ativar tema escuro'} onClick={toggleTheme}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></div></div></header>}{!online&&<div className="offline-banner" role="status"><WifiOff size={16}/> Você está offline. Reconecte para consultar horários e confirmar reservas.</div>}{needRefresh&&<div className="update-banner" role="status">Uma nova versão está pronta.<button onClick={()=>updateServiceWorker(true)}>Atualizar</button><button aria-label="Depois" onClick={()=>setNeedRefresh(false)}>Depois</button></div>}
 <Routes><Route path="/" element={<HomePage/>}/><Route path="/cadastro" element={<AuthPage register/>}/><Route path="/entrar" element={<AuthPage/>}/><Route path="/painel" element={<ShopsPage/>}/><Route path="/criar-loja" element={<CreateShopPage/>}/><Route path="/redefinir-senha" element={<ResetPasswordPage/>}/><Route path="/admin" element={<Navigate to="/painel" replace/>}/><Route path="/demonstracao" element={<BookingPage/>}/><Route path="/demonstracao/gestao" element={<AdminPage management/>}/><Route path="/demonstracao/admin" element={<AdminPage/>}/><Route path="/:tenant/gestao" element={<AdminPage management/>}/><Route path="/:tenant/admin" element={<AdminPage/>}/><Route path="/:tenant" element={<BookingPage/>}/><Route path="*" element={<div className="page-state"><h1>Este caminho não existe.</h1><Link to="/" className="button primary">Ir para o início <ArrowUpRight size={16}/></Link></div>}/></Routes></>;
}
export default function App(){return <QueryClientProvider client={queryClient}><MotionConfig reducedMotion="user"><BrowserRouter><Shell/></BrowserRouter></MotionConfig></QueryClientProvider>;}
