export interface TimelineEvent {
  id: string;
  year: string;
  title: string;
  description: string;
  source: string;
  sortOrder: number;
  entityTag?: string;
}

export const initialTimelineEvents: TimelineEvent[] = [
  {
    id: 'evt-1993-founding',
    year: '1993',
    title: 'DTGO Corporation Founded',
    description: 'Thippaporn Ahriyavraromp establishes DTGO, initially offering architectural design, construction management, and project development services.',
    source: '',
    sortOrder: 1,
    entityTag: 'dtgo',
  },
  {
    id: 'evt-2003-china',
    year: '2003',
    title: 'China Expansion',
    description: 'DT Plans (Shanghai) Consulting Co Ltd established — construction, design, and building consultancy in China.',
    source: '',
    sortOrder: 2,
    entityTag: 'dtgo',
  },
  {
    id: 'evt-2014-worldmark',
    year: '2014',
    title: 'The Worldmark Founded',
    description: 'Thippaporn founds The Worldmark with ฿5.39B registered capital for Pattaya/Na Jomtien mixed-use developments.',
    source: '',
    sortOrder: 3,
    entityTag: 'mqdc',
  },
  {
    id: 'evt-2015-shelldon',
    year: 'Pre-2015',
    title: 'Shelldon Animated Series',
    description: 'Dr. Jwanwat Ahriyavraromp creates the award-winning Shelldon animated series — the only Thai animation aired in 180+ countries and translated into 35+ languages.',
    source: '',
    sortOrder: 4,
    entityTag: 'tnb',
  },
  {
    id: 'evt-2017-dtp',
    year: '~2017',
    title: 'DTP Established',
    description: 'DTGO Prosperous (DTP) set up as the global investment arm to diversify into recurring income: hotels, healthcare, retail, offices, and technology.',
    source: '',
    sortOrder: 5,
    entityTag: 'dtp',
  },
  {
    id: 'evt-2018-forestias',
    year: '2018',
    title: 'The Forestias Announced',
    description: 'MQDC announces its flagship ฿125B mixed-use development on 398 rai at Bang Na-Trat KM7 — billed as the world\'s first town designed for healthier living.',
    source: '',
    sortOrder: 6,
    entityTag: 'mqdc',
  },
  {
    id: 'evt-2019-uk-hotels',
    year: '2019',
    title: 'UK Hotel Acquisitions',
    description: 'DTP acquires multiple hotels across the UK (Glasgow to Plymouth) — 10 brands, 3 international hotel chains, 1,200+ staff. Two months before COVID-19.',
    source: '',
    sortOrder: 7,
    entityTag: 'dtp',
  },
  {
    id: 'evt-2021-translucia',
    year: '2021',
    title: 'Translucia Metaverse & Forestias Sales',
    description: 'T&B Media Global announces ฿10B investment in Translucia, Thailand\'s first metaverse, partnering with MQDC. The Forestias logs ฿13B+ in total deposited sales.',
    source: '',
    sortOrder: 8,
    entityTag: 'tnb',
  },
  {
    id: 'evt-2022-reit',
    year: '2022',
    title: 'DTPHREIT Launch & Metaverse Expansion',
    description: 'DTP launches DTPHREIT (฿4.1B REIT) investing in Waldorf Astoria Bangkok, MRB, and U Khao Yai. MQDC Idyllias metaverse development begins with Accenture. Sygnum leads $300M hybrid equity-NFT raise for Translucia.',
    source: '',
    sortOrder: 9,
    entityTag: 'dtp',
  },
  {
    id: 'evt-2023-signature',
    year: '2023',
    title: 'Signature Series & Happitat',
    description: 'Forestias Signature Series (฿5.9B, 122 units) launched. Total residential sales exceed ฿22B. The Happitat (฿20B+ town centre) construction reaches 70%. Cloud 11 valued at ฿40B.',
    source: '',
    sortOrder: 10,
    entityTag: 'mqdc',
  },
  {
    id: 'evt-2024-ai',
    year: '2024',
    title: 'AI, Partnerships & Cloud 11 Financing',
    description: 'DTGO partners with SenseTime to develop DTLM trilingual AI. MQDC signs ฿3B deal with Super Siam for Whizdom Mytopia foreign quota. Cloud 11 secures Bangkok Bank financing. CP Axtra invests ฿12-15B in The Happitat.',
    source: '',
    sortOrder: 11,
    entityTag: 'dtgo',
  },
  {
    id: 'evt-2025-reit-cloud11',
    year: '2025',
    title: 'DTPBB REIT & Cloud 11 CEO',
    description: 'DTPBB REIT launched at ฿4.1B for Waldorf Astoria and MRB. Paul Sirisant appointed CEO of Cloud 11. Cloud 11 reaches 80% completion.',
    source: '',
    sortOrder: 12,
    entityTag: 'dtp',
  },
  {
    id: 'evt-2026-strategy',
    year: '2026',
    title: '3-Year Growth Strategy',
    description: 'MQDC announces strategic focus on completing projects, accelerating revenue recognition, expanding city development consultancy, and advancing longevity living strategies.',
    source: '',
    sortOrder: 13,
    entityTag: 'mqdc',
  },
];
