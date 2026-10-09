import type { ProcedureDTO } from './types';

/**
 * Catálogo inicial de procedimentos, montado a partir da bio e dos destaques do
 * Instagram @dramarjanefranco (+ depilação a laser, informada pela cliente).
 *
 * É usado para popular o banco (seed) e como conteúdo de reserva da landing page
 * caso a API esteja fora do ar. Depois do seed, a fonte da verdade é o banco —
 * edições devem ser feitas lá (futuro painel administrativo).
 *
 * Durações são estimativas para a agenda e devem ser confirmadas pela profissional.
 * Preço null = "valor sob avaliação".
 *
 * Regra editorial: nenhum texto promete resultado. Procedimentos injetáveis e
 * medicamentosos são sempre apresentados como "mediante avaliação".
 */
type CatalogItem = Omit<ProcedureDTO, 'imageUrl' | 'price'> & { sortOrder: number };

const evaluation = 'Mediante avaliação';

export const PROCEDURE_CATALOG: CatalogItem[] = [
  {
    slug: 'tratamento-de-melasma',
    name: 'Tratamento de Melasma',
    category: 'PELE',
    featured: true,
    requiresEvaluation: true,
    durationMinutes: 60,
    shortDescription:
      'Protocolo personalizado para o cuidado das manchas do melasma, com plano definido a partir da avaliação da sua pele.',
    description:
      'O melasma é uma condição que pede acompanhamento e cuidado contínuo. Na avaliação, analisamos sua pele, sua rotina e seu histórico para montar um protocolo individual, que pode combinar procedimentos em consultório e orientações de cuidados em casa.',
    highlights: ['Especialidade da Dra. Marjane', 'Plano de tratamento individual', 'Orientações de cuidados diários'],
    sortOrder: 10,
  },
  {
    slug: 'limpeza-de-pele-com-peeling',
    name: 'Limpeza de Pele com Peeling',
    category: 'PELE',
    featured: false,
    requiresEvaluation: false,
    durationMinutes: 90,
    shortDescription:
      'Limpeza profunda associada ao peeling para renovar a pele e deixá-la com aspecto mais uniforme e viçoso.',
    description:
      'Remove impurezas, cravos e células mortas e é finalizada com um peeling escolhido de acordo com o tipo e a necessidade da sua pele. A frequência ideal é indicada no atendimento.',
    highlights: ['Peeling escolhido para o seu tipo de pele', 'Frequência indicada no atendimento', 'Orientações de cuidados pós-procedimento'],
    sortOrder: 20,
  },
  {
    slug: 'depilacao-a-laser',
    name: 'Depilação a Laser',
    category: 'PELE',
    featured: false,
    requiresEvaluation: false,
    durationMinutes: 30,
    shortDescription:
      'Tratamento desenvolvido para reduzir progressivamente os pelos, proporcionando uma pele mais lisa e praticidade no dia a dia.',
    description:
      'Realizada em sessões, de acordo com a área tratada e as características da sua pele e dos seus pelos. O número de sessões e o intervalo entre elas são definidos no atendimento.',
    highlights: ['Duração varia conforme a área', 'Realizada em sessões', 'Análise do tipo de pele antes de iniciar'],
    sortOrder: 30,
  },
  {
    slug: 'botox',
    name: 'Botox (Toxina Botulínica)',
    category: 'HARMONIZACAO',
    featured: true,
    requiresEvaluation: true,
    durationMinutes: 45,
    shortDescription:
      'Suaviza linhas de expressão e também é indicado em casos como sorriso gengival e sorriso triste.',
    description:
      'Aplicação de toxina botulínica com planejamento individual, respeitando a naturalidade da sua expressão. A indicação, a dose e os pontos de aplicação são definidos na avaliação.',
    highlights: ['Linhas de expressão', 'Sorriso gengival', 'Sorriso triste', evaluation],
    sortOrder: 40,
  },
  {
    slug: 'harmonizacao-de-labios',
    name: 'Lábios',
    category: 'HARMONIZACAO',
    featured: false,
    requiresEvaluation: true,
    durationMinutes: 60,
    shortDescription:
      'Planejamento para contorno e volume dos lábios, buscando harmonia com as proporções do seu rosto.',
    description:
      'Cada boca é única. Na avaliação, conversamos sobre o que você deseja e definimos juntas a técnica e a quantidade de produto mais adequadas, sempre com foco em harmonia.',
    highlights: [evaluation, 'Planejamento individual', 'Foco em harmonia facial'],
    sortOrder: 50,
  },
  {
    slug: 'harmonizacao-de-queixo',
    name: 'Queixo',
    category: 'HARMONIZACAO',
    featured: false,
    requiresEvaluation: true,
    durationMinutes: 60,
    shortDescription: 'Projeção e definição do queixo para mais equilíbrio do perfil facial.',
    description:
      'Procedimento planejado a partir da análise do seu perfil e das proporções do rosto. A técnica e o produto são definidos na avaliação.',
    highlights: [evaluation, 'Análise do perfil facial', 'Planejamento individual'],
    sortOrder: 60,
  },
  {
    slug: 'rinomodelacao',
    name: 'Rinomodelação',
    category: 'HARMONIZACAO',
    featured: false,
    requiresEvaluation: true,
    durationMinutes: 60,
    shortDescription: 'Procedimento não cirúrgico para ajustes no contorno do nariz.',
    description:
      'Realizado sem cirurgia, com planejamento a partir da avaliação do formato do nariz e das proporções do rosto. Nem todos os casos têm indicação; isso é definido na consulta.',
    highlights: [evaluation, 'Procedimento não cirúrgico', 'Indicação definida na consulta'],
    sortOrder: 70,
  },
  {
    slug: 'bigode-chines',
    name: 'Bigode Chinês',
    category: 'HARMONIZACAO',
    featured: false,
    requiresEvaluation: true,
    durationMinutes: 60,
    shortDescription: 'Suavização do sulco nasogeniano, as linhas que vão do nariz ao canto da boca.',
    description:
      'A abordagem é escolhida de acordo com a causa e a profundidade do sulco, avaliando o rosto como um todo para manter a naturalidade.',
    highlights: [evaluation, 'Avaliação do rosto como um todo', 'Planejamento individual'],
    sortOrder: 80,
  },
  {
    slug: 'tratamento-de-olheiras',
    name: 'Olheiras',
    category: 'HARMONIZACAO',
    featured: false,
    requiresEvaluation: true,
    durationMinutes: 60,
    shortDescription: 'Cuidado para suavizar o aspecto de cansaço na região dos olhos.',
    description:
      'Existem diferentes tipos de olheira, e cada uma pede uma abordagem. Na avaliação identificamos o seu tipo e indicamos o tratamento mais adequado.',
    highlights: [evaluation, 'Identificação do tipo de olheira', 'Tratamento indicado caso a caso'],
    sortOrder: 90,
  },
  {
    slug: 'peim-vasinhos',
    name: 'PEIM — Tratamento de Vasinhos',
    category: 'CORPORAL',
    featured: true,
    requiresEvaluation: true,
    durationMinutes: 45,
    shortDescription: 'Procedimento para o tratamento de microvasos (vasinhos) nas pernas.',
    description:
      'O PEIM (Procedimento Estético Injetável para Microvasos) é realizado com aplicações nos vasinhos. A indicação, o número de sessões e os cuidados após o procedimento são definidos na avaliação.',
    highlights: [evaluation, 'Sessões conforme indicação', 'Orientações de cuidados pós-procedimento'],
    sortOrder: 100,
  },
  {
    slug: 'enzimas',
    name: 'Enzimas',
    category: 'CORPORAL',
    featured: false,
    requiresEvaluation: true,
    durationMinutes: 45,
    shortDescription: 'Aplicação de enzimas com indicação individual, definida em avaliação.',
    description:
      'A indicação, a região, o protocolo e o número de sessões são definidos após avaliação, de acordo com o seu objetivo e o seu histórico.',
    highlights: [evaluation, 'Protocolo individual', 'Acompanhamento das sessões'],
    sortOrder: 110,
  },
  {
    slug: 'emagrecimento-mounjaro',
    name: 'Emagrecimento com Acompanhamento (Mounjaro®)',
    category: 'CORPORAL',
    featured: false,
    requiresEvaluation: true,
    durationMinutes: 30,
    shortDescription:
      'Consulta de avaliação para tratamento de emagrecimento com acompanhamento. O uso de Mounjaro® depende de indicação e prescrição.',
    description:
      'O Mounjaro® (tirzepatida) é um medicamento de uso sob prescrição. Na consulta, sua saúde e seu histórico são avaliados para definir se há indicação e qual acompanhamento é adequado. Cada organismo responde de uma forma, por isso não há promessa de resultados.',
    highlights: ['Medicamento sob prescrição', 'Avaliação individual obrigatória', 'Acompanhamento durante o tratamento'],
    sortOrder: 120,
  },
  {
    slug: 'avaliacao',
    name: 'Avaliação / Outros',
    category: 'AVALIACAO',
    featured: false,
    requiresEvaluation: false,
    durationMinutes: 30,
    shortDescription:
      'Não sabe qual procedimento escolher? Agende uma avaliação para conversarmos sobre seus objetivos.',
    description:
      'Um momento para entender o que você deseja, avaliar sua pele e seu rosto e indicar os cuidados mais adequados para você, sem compromisso de realizar procedimentos no mesmo dia.',
    highlights: ['Conversa individual', 'Indicação personalizada', 'Sem compromisso'],
    sortOrder: 999,
  },
];

/** Catálogo no formato da API — conteúdo de reserva para a landing page. */
export const CATALOG_AS_DTO: ProcedureDTO[] = PROCEDURE_CATALOG.map(({ sortOrder: _sortOrder, ...item }) => ({
  ...item,
  price: null,
  imageUrl: null,
}));
