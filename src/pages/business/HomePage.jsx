import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Link2, ShieldCheck, Scissors, Check } from 'lucide-react';

export default function HomePage() {
  return <main className="business-home">
    <section className="platform-hero">
      <div>
        <span className="eyebrow">PARA QUEM CUIDA DE PESSOAS</span>
        <h1>Seu negócio.<br/>Sua agenda.<br/><em>Um link só seu.</em></h1>
        <p>Receba agendamentos na sua barbearia, salão ou espaço de beleza. Crie sua loja e compartilhe o link com seus clientes.</p>
        <div className="landing-actions">
          <Link to="/cadastro" className="button primary">Criar minha loja <ArrowRight size={18}/></Link>
          <Link to="/entrar" className="button secondary">Já tenho conta</Link>
        </div>
        <Link className="text-button demo-entry" to="/demonstracao">Experimentar a demonstração <ArrowRight size={16}/></Link>
        <span className="home-caption"><ShieldCheck size={15}/> Cada loja tem sua própria equipe, seus clientes e sua agenda.</span>
      </div>
      <div className="platform-preview" aria-label="Exemplo do link de uma loja">
        <div className="preview-address"><span/><span/><span/><code>safereserve / <strong>sua-loja</strong></code></div>
        <div className="preview-content"><span className="preview-shop-icon"><Scissors size={32}/></span><span className="eyebrow">SEU ESPAÇO, DO SEU JEITO</span><h2>Sua próxima visita<br/>começa aqui.</h2><div className="preview-service"><div><strong>Corte & cuidado</strong><small>45 minutos · seu profissional favorito</small></div><Check size={18}/></div><div className="preview-days">{['09:00','10:30','14:00'].map((time,i)=><span className={i===1?'active':''} key={time}>{time}</span>)}</div><Link to="/demonstracao" className="button primary full" aria-label="Abrir agendamento de demonstração">Reservar meu momento <ArrowRight size={16}/></Link></div>
        <span className="preview-sticker"><Link2 size={20}/> Um endereço exclusivo<br/>para os seus clientes.</span>
      </div>
    </section>
    <section className="home-steps" aria-label="Como funciona">
      {[['01',Scissors,'Crie seu espaço','Cadastre sua loja, o primeiro serviço e quem vai atender.'],['02',Link2,'Compartilhe seu link','Cada loja recebe um endereço próprio, como /barbearia-do-joao.'],['03',CalendarDays,'Receba agendamentos','Seus clientes escolhem serviço e horário, sem cadastro obrigatório.']].map(([n,Icon,title,text])=><article key={n}><span className="step-number">{n}</span><Icon size={25}/><h2>{title}</h2><p>{text}</p></article>)}
    </section>
    <footer className="platform-footer"><span>SafeReserve · Seu tempo, bem cuidado.</span><Link to="/entrar">Acesso profissional <ArrowRight size={14}/></Link></footer>
  </main>;
}
