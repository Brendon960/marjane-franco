/**
 * Conteúdo editável do site — textos, contatos e links em um único lugar.
 *
 * Itens marcados com EDITAR dependem de informações que não estão públicas no
 * Instagram e devem ser confirmados com a Dra. Marjane antes da publicação.
 * Procedimentos, horários e formas de pagamento vêm do banco de dados.
 */
export const site = {
  name: 'Dra. Marjane Franco',
  shortName: 'Marjane Franco',
  tagline: 'Estética & Especialista em Melasma',

  /** Domínio público, usado na URL canônica (definir VITE_SITE_URL no deploy). */
  url: import.meta.env.VITE_SITE_URL as string | undefined,

  whatsapp: {
    number: '5531920003957',
    display: '(31) 92000-3957',
    defaultMessage: 'Olá! Vim pelo site e gostaria de saber mais sobre os procedimentos e horários disponíveis.',
  },

  instagram: {
    handle: '@dramarjanefranco',
    url: 'https://www.instagram.com/dramarjanefranco/',
    /** Destaques reais do perfil — usados na seção "Siga nosso trabalho". */
    highlights: ['Melasma', 'Botox', 'Boca', 'Queixo', 'Rinomodelação', 'Bigode chinês', 'Olheiras', 'Emagrecimento', 'Enzima'],
  },

  hero: {
    title: 'Realce sua beleza.',
    titleAccent: 'Cuide de você.',
    subtitle:
      'Procedimentos estéticos personalizados para valorizar sua beleza e proporcionar mais confiança e bem-estar — com o cuidado de quem é especialista em melasma.',
    /** EDITAR: foto profissional (ex.: '/images/hero.jpg' em apps/web/public/images). */
    image: null as string | null,
  },

  about: {
    /** EDITAR: foto profissional (ex.: '/images/dra-marjane.jpg'). */
    image: null as string | null,
    role: 'Especialista em Melasma',
    /** EDITAR: número do registro no conselho profissional (exibido se preenchido). */
    registration: '',
    /** EDITAR: formação e cursos (exibidos se preenchidos). */
    education: [] as string[],
    paragraphs: [
      'Sou a Dra. Marjane Franco e dedico meu trabalho a cuidar da pele e da autoestima de cada paciente com atenção, ética e acolhimento.',
      'Minha especialidade é o tratamento do melasma — uma condição que pede paciência, acompanhamento e um olhar individual. Essa mesma filosofia guia todos os procedimentos que realizo: antes de qualquer indicação, eu escuto, avalio e explico com transparência o que é possível para você.',
      'Acredito em uma estética que respeita a sua naturalidade. Meu objetivo é que você se sinta segura em cada etapa e se reconheça no espelho — só que mais confiante.',
    ],
    specialties: ['Melasma', 'Botox (incl. sorriso gengival e sorriso triste)', 'PEIM — vasinhos', 'Limpeza de pele com peeling', 'Harmonização facial'],
  },

  /**
   * EDITAR: substituir por depoimentos reais, com autorização das clientes
   * (há um destaque "Depoimento" no Instagram). Enquanto isDemo for true, o site
   * exibe um aviso de que são exemplos ilustrativos.
   */
  testimonials: {
    isDemo: true,
    items: [
      { name: 'Cliente', procedure: 'Tratamento de Melasma', text: 'Espaço reservado para um depoimento real sobre o tratamento de melasma.' },
      { name: 'Cliente', procedure: 'Botox', text: 'Espaço reservado para um depoimento real sobre a aplicação de botox.' },
      { name: 'Cliente', procedure: 'Limpeza de Pele', text: 'Espaço reservado para um depoimento real sobre a limpeza de pele.' },
    ],
  },
} as const;
