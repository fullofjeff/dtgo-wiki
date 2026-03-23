export interface OrgEntity {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  leader?: { name: string; title: string };
  accentColor: string;
  wikiSlug?: string;
  summary?: string;
  keyMetrics?: { label: string; value: string }[];
}

export const initialOrgEntities: OrgEntity[] = [
  // ── Root ──
  {
    id: 'dtgo',
    name: 'DTGO Corporation',
    description: 'Apex Holding Company',
    parentId: null,
    leader: { name: 'Thippaporn Ahriyavraromp', title: 'Founder & Chairman' },
    accentColor: 'var(--dtgo-green)',
    wikiSlug: 'index',
    summary:
      'Diversified Thai conglomerate founded in 1993 by Thippaporn Ahriyavraromp, youngest daughter of CP Group Senior Chairman Dhanin Chearavanont. Operates across property, entertainment, technology, and global investment under the philosophy "For All Well-Being." First Thai business named one of the World\'s Most Ethical Companies by Ethisphere.',
    keyMetrics: [
      { label: 'Founded', value: '1993' },
      { label: 'Portfolio', value: '฿165B+' },
      { label: 'Social', value: '2% Revenue' },
    ],
  },

  // ── Pillar 1: MQDC ──
  {
    id: 'mqdc',
    name: 'MQDC',
    description: 'Property Development',
    parentId: 'dtgo',
    leader: { name: 'Visit Malaisirirat', title: 'Co-Chairman & Co-CEO' },
    accentColor: 'var(--mqdc-blue)',
    wikiSlug: 'mqdc',
    summary:
      'Property arm of DTGO Corporation, developing pioneering projects that blend living standards with sustainable environmental solutions. Projects span residential, commercial, hospitality, and mixed-use developments. Key research arms include RISC (sustainable building), FutureTales Lab (futurology), and Creative Lab.',
    keyMetrics: [
      { label: 'Forestias', value: '฿125B' },
      { label: 'Cloud 11', value: '฿40B' },
      { label: 'Sales', value: '฿22B+' },
    ],
  },
  {
    id: 'mfc',
    name: 'Magnolia Finest Corp',
    description: 'Hotels & Serviced Residences',
    parentId: 'mqdc',
    leader: { name: 'Paisit Kaenchan', title: 'President' },
    accentColor: 'var(--mqdc-blue)',
    summary:
      'Subsidiary of MQDC that develops and manages premier hotel and serviced apartment assets. Assets include the Waldorf Astoria Bangkok and Magnolias Ratchadamri Boulevard Serviced Residences — the properties sold into DTPHREIT and subsequently DTPBB REIT.',
  },
  {
    id: 'risc',
    name: 'RISC',
    description: 'Research & Innovation Center',
    parentId: 'mqdc',
    leader: { name: 'Singh Intrachooto', title: 'Director' },
    accentColor: 'var(--mqdc-blue)',
    summary:
      "Asia's first research base for sustainable building with a focus on well-being. Researchers in science, engineering, industrial design, and art devise environmentally and socially sustainable solutions. Collaborated with Baycrest on brain health and happiness science for The Aspen Tree.",
  },
  {
    id: 'futuretales',
    name: 'FutureTales Lab',
    description: 'Futurology Research',
    parentId: 'mqdc',
    accentColor: 'var(--mqdc-blue)',
    summary:
      'Futurology centre at True Digital Park. Gathers, analyzes, and interprets key data to produce studies on the future of living, learning, leisure, travel, and sustainability. Works alongside RISC, Urban Action Lab, and Creative Lab to inform MQDC project designs.',
  },
  {
    id: 'quinnnova',
    name: 'Quinnnova',
    description: 'AI & IoT (DTLM)',
    parentId: 'mqdc',
    leader: { name: 'Kittikun Potivanakul', title: 'CTO DTGO' },
    accentColor: 'var(--mqdc-blue)',
    summary:
      "Established by DTGO to pursue IoT and AI development. Partnered with SenseTime to develop DTLM, the world's first Thai-Chinese-English trilingual LLM, leveraging Quinnnova's local expertise with SenseTime's SenseNova infrastructure.",
  },
  {
    id: 'worldmark',
    name: 'Worldmark',
    description: 'Pattaya / Na Jomtien Projects',
    parentId: 'mqdc',
    accentColor: 'var(--mqdc-blue)',
    summary:
      'Registered in 2014 with ฿5.39B capital. Develops projects in the Pattaya and Na Jomtien area under the MQDC portfolio.',
  },
  {
    id: 'idyllias',
    name: 'Idyllias',
    description: 'Metaverse Platform',
    parentId: 'mqdc',
    accentColor: 'var(--mqdc-blue)',
    summary:
      'MQDC\'s proprietary metaverse, developed with Accenture. Concept: "metta-verse" (from Thai word for kindness). Four layers at The Forestias: digital twin, virtual forest with MR gamification, virtual real estate, and fantasy realm with immersive experiences.',
  },

  // ── Pillar 2: T&B Media Global ──
  {
    id: 'tnb',
    name: 'T&B Media Global',
    description: 'Entertainment & Media',
    parentId: 'dtgo',
    leader: { name: 'Dr. Jwanwat Ahriyavraromp', title: 'CEO & Founder' },
    accentColor: 'var(--tnb-orange)',
    wikiSlug: 'tnb',
    summary:
      'Family-friendly entertainment media and innovation group with four core investment verticals: talent management, content creation, technological innovations, and traditional investments. Revenue-generating units include GIBS (incubation, live activations, IP) and BDCSS (sales, sponsorship, content).',
    keyMetrics: [
      { label: 'Staff', value: '~100+' },
      { label: 'Monthly OpEx', value: '฿16M' },
      { label: 'Subsidiaries', value: '7' },
    ],
  },
  {
    id: 'shellhut',
    name: 'Shellhut Entertainment',
    description: 'Production House',
    parentId: 'tnb',
    accentColor: 'var(--tnb-orange)',
    summary:
      'Core production house within T&B Media Global. Origin of the Shelldon IP — the only animated series from Thailand aired in 180+ countries and translated into 35+ languages. Also contributed to immersive animation within The Forestias Forest Pavilion.',
    keyMetrics: [{ label: 'Staff', value: '~25' }],
  },
  {
    id: 'rabbitmoon',
    name: 'Rabbit Moon',
    description: 'Talent Management',
    parentId: 'tnb',
    accentColor: 'var(--tnb-orange)',
    summary:
      'Talent management entity within T&B Media Global. Emerged from the Last Idol Thailand competition which collapsed during COVID. Dr. Ton maintained care of talent through the downturn, eventually formalizing as Rabbit Moon. Part of T&B World Artists program.',
    keyMetrics: [{ label: 'Staff', value: '~9' }],
  },
  {
    id: 'treeroots',
    name: 'Tree Roots Entertainment',
    description: 'JV with MQDC — Entertainment Tech',
    parentId: 'tnb',
    accentColor: 'var(--tnb-orange)',
    summary:
      'Established by T&B for the Translucia metaverse and broader entertainment technology ventures. Developed the SMO platform (interactive community hub) and BonBon fandom platform. Houses Dreamcrafter, the JV operating IP retail at The Forestias.',
  },
  {
    id: 'nightsedge',
    name: "Night's Edge",
    description: 'Horror Film Distribution',
    parentId: 'tnb',
    accentColor: 'var(--tnb-orange)',
    summary:
      'Acquires and distributes horror film titles. Currently scaled down to 2 staff from a previous headcount of 10.',
    keyMetrics: [{ label: 'Staff', value: '2' }],
  },
  {
    id: 'okd',
    name: 'OKD',
    description: 'Social Media Production',
    parentId: 'tnb',
    accentColor: 'var(--tnb-orange)',
    summary: 'Social media content production unit within T&B Media Global.',
    keyMetrics: [{ label: 'Staff', value: '~7' }],
  },
  {
    id: 'dya',
    name: 'DYA',
    description: 'Distribution (ex-Web3)',
    parentId: 'tnb',
    accentColor: 'var(--tnb-orange)',
    summary:
      'Originally NFT/Web3 focused. Pivoted to distribution and consultancy for product distribution into Thailand. Now run by Benz.',
    keyMetrics: [{ label: 'Staff', value: '~7' }],
  },
  {
    id: 'dreamcrafter',
    name: 'Dreamcrafter',
    description: 'IP Retail at Forestias',
    parentId: 'tnb',
    accentColor: 'var(--tnb-orange)',
    summary:
      "Joint venture between T&B and MQDC for experiential retail and IP-driven experiences at The Forestias. Operates the theme shop and gelato shop within Whimsical Market. Positioned to operate Belle's Cafe and Festy Town when operational.",
  },

  // ── Pillar 3: DTP / DTGO Prosperous ──
  {
    id: 'dtp',
    name: 'DTP (DTGO Prosperous)',
    description: 'Global Investment',
    parentId: 'dtgo',
    leader: { name: 'Hansa Susayan', title: 'Chairman & CIO' },
    accentColor: 'var(--dtp-pink)',
    wikiSlug: 'dtp',
    summary:
      'Established ~2017 to diversify DTGO into recurring income investments. Four business lines: global investment (hospitality 50%, healthcare, retail & office, student accommodation, technology), asset management, fund management (DTPRM, two REITs), and venture capital. Strategy: "Acquire, Develop, Monetize."',
    keyMetrics: [
      { label: 'REITs', value: '฿8.2B' },
      { label: 'UK Staff', value: '1,200+' },
      { label: 'Hotel Brands', value: '10' },
    ],
  },
  {
    id: 'dtprm',
    name: 'DTPRM',
    description: 'REITs Management',
    parentId: 'dtp',
    leader: { name: 'Wanida Suksuwan', title: 'Managing Director' },
    accentColor: 'var(--dtp-pink)',
    summary:
      'DTP Global REITs Management manages two buy-back REITs totaling ฿8.2B. DTPHREIT (Sep 2022, ฿4.1B, 3-year buy-back, 7% return) and DTPBB (Sep 2025, ฿4.1B, 5-year buy-back, 7.0-7.2% return). Assets include Waldorf Astoria Bangkok and MRB Serviced Residences.',
    keyMetrics: [
      { label: 'DTPHREIT', value: '฿4.1B' },
      { label: 'DTPBB', value: '฿4.1B' },
    ],
  },
  {
    id: 'ukhotels',
    name: 'UK Hotel Portfolio',
    description: 'Glasgow to Plymouth',
    parentId: 'dtp',
    accentColor: 'var(--dtp-pink)',
    summary:
      'Acquired 2019, two months before COVID-19. Hotels span from Glasgow to Plymouth comprising 10 brands managed by 3 international chains. Zero layoffs during COVID (1,200+ staff). Applied heat-to-power conversion technology to cope with the UK energy crisis.',
    keyMetrics: [
      { label: 'Staff', value: '1,200+' },
      { label: 'Brands', value: '10' },
    ],
  },
  {
    id: 'redds',
    name: 'REDDS Technology Fund',
    description: 'Global Tech VC',
    parentId: 'dtp',
    accentColor: 'var(--dtp-pink)',
    summary:
      'Global technology investment fund covering North America, Israel, Asia, and Europe. Part of DTP\'s venture capital and innovative investment arm.',
  },
  {
    id: 'mindai',
    name: 'Mind AI',
    description: 'AI Investment',
    parentId: 'dtp',
    accentColor: 'var(--dtp-pink)',
    summary:
      'Artificial intelligence engine investment. Part of DTP\'s innovative investment portfolio alongside the REDDS Technology Fund and SenseTime partnership on DTLM.',
  },
];
