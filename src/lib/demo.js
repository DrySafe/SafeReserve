export const demoTenant = {
  id: 'demo', slug: 'studio-aurora', name: 'Studio Aurora', tagline: 'Beleza que respeita o seu tempo.',
  description: 'Um respiro na rotina. Um cuidado só seu.', address: 'Rua dos Pinheiros, 870 · São Paulo',
  timezone: 'America/Sao_Paulo', popup: { enabled: false, title: 'Seu momento de cuidado', message: 'Conheça nossos rituais e encontre um tempo para você.' },
};
export const demoServices = [
  { id: 's1', name: 'Corte & finalização', description: 'Um novo olhar para o seu estilo.', category: 'Cabelo', duration: 60, price: 12000, icon: 'scissors', tag: 'Mais escolhido', color: 'sage' },
  { id: 's2', name: 'Manicure essencial', description: 'Cuidado nos mínimos detalhes.', category: 'Unhas', duration: 45, price: 4500, icon: 'sparkles', color: 'rose' },
  { id: 's3', name: 'Barba & cuidado', description: 'Precisão, toalha quente e uma pausa.', category: 'Barbearia', duration: 30, price: 6500, icon: 'razor', color: 'sand' },
  { id: 's4', name: 'Hidratação profunda', description: 'Nutrição e brilho, da raiz às pontas.', category: 'Cabelo', duration: 45, price: 9500, icon: 'drop', color: 'lavender' },
  { id: 's5', name: 'Design de sobrancelhas', description: 'Valorize o que faz você ser você.', category: 'Sobrancelhas', duration: 30, price: 5000, icon: 'eye', color: 'peach' },
  { id: 's6', name: 'Spa dos pés', description: 'Leveza para seguir o seu caminho.', category: 'Unhas', duration: 60, price: 8500, icon: 'flower', color: 'blue' },
];
export const demoProfessionals = [
  { id: 'p1', name: 'Marina Costa', specialty: 'Cabelo & bem-estar', initials: 'MC', color: 'sage', service_ids: ['s1','s4','s5'] },
  { id: 'p2', name: 'Lucas Santos', specialty: 'Cortes & barbearia', initials: 'LS', color: 'sand', service_ids: ['s1','s3'] },
  { id: 'p3', name: 'Júlia Lima', specialty: 'Unhas & autocuidado', initials: 'JL', color: 'rose', service_ids: ['s2','s5','s6'] },
];
