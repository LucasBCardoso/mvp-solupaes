import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaClient, type Classification, type StrategyStatus, type StrategyType } from '@prisma/client';
import { calculateScore, proposeStrategies } from '@solupaes/shared';

const prisma = new PrismaClient();

function requireSeedPassword(): string {
  const value = process.env.SEED_PASSWORD;
  if (!value || value.length < 8) {
    console.error(
      '❌ SEED_PASSWORD não definida em packages/api/.env (mínimo 8 caracteres).\n' +
        '   Edite packages/api/.env e ajuste a linha SEED_PASSWORD com uma senha de pelo menos 8 caracteres.',
    );
    process.exit(1);
  }
  return value;
}
const DEMO_PASSWORD = requireSeedPassword();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}
function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3600000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86400000);
}

interface VisitFixture {
  clientUuid: string;
  representativeEmail: string;
  clientId: string;
  fantasyName: string;
  phone: string;
  addressLine: string;
  lat: number;
  lng: number;
  worksWithFrozen: boolean;
  currentSupplier?: string;
  dailyVolume?: number;
  currentPrice?: number;
  equipmentLent: string[];
  observations: string;
  hasFacadePhoto: boolean;
  visitedAt: Date;
}

interface ClientFixture {
  id: string;
  fantasyName: string;
  socialReason: string;
  cnpj?: string;
  phone: string;
  whatsapp?: string;
  addressLine: string;
  city: string;
  state: 'RS' | 'SC';
  lat: number;
  lng: number;
  worksWithFrozen: boolean;
  currentSupplier?: string;
}

const CLIENTS: ClientFixture[] = [
  // === Rio Grande, RS — território de Carlos Silva ===
  {
    id: 'cli-rg-01',
    fantasyName: 'Padaria Central',
    socialReason: 'Padaria Central Ltda',
    cnpj: '12.345.678/0001-90',
    phone: '(53) 3231-1100',
    whatsapp: '(53) 99811-1100',
    addressLine: 'Rua Andrade Neves, 412',
    city: 'Rio Grande',
    state: 'RS',
    lat: -32.0337,
    lng: -52.0986,
    worksWithFrozen: true,
    currentSupplier: 'Congelados Express',
  },
  {
    id: 'cli-rg-02',
    fantasyName: 'Mercado Atlântico',
    socialReason: 'Comércio Atlântico Sul Ltda',
    cnpj: '23.456.789/0001-01',
    phone: '(53) 3232-2244',
    addressLine: 'Av. Itália, 1820 - Centro',
    city: 'Rio Grande',
    state: 'RS',
    lat: -32.0410,
    lng: -52.1050,
    worksWithFrozen: true,
    currentSupplier: 'Marquespan',
  },
  {
    id: 'cli-rg-03',
    fantasyName: 'Conveniência Posto Bahia',
    socialReason: 'Posto Bahia Combustíveis Ltda',
    phone: '(53) 3233-5566',
    whatsapp: '(53) 99655-5566',
    addressLine: 'BR-392, km 4',
    city: 'Rio Grande',
    state: 'RS',
    lat: -32.0510,
    lng: -52.1180,
    worksWithFrozen: false,
  },
  {
    id: 'cli-rg-04',
    fantasyName: 'Cafeteria Beira Mar',
    socialReason: 'Cafeteria Beira Mar Ltda',
    phone: '(53) 3234-7788',
    addressLine: 'Av. Rio Branco, 350',
    city: 'Rio Grande',
    state: 'RS',
    lat: -32.0290,
    lng: -52.0890,
    worksWithFrozen: false,
  },
  {
    id: 'cli-pe-01',
    fantasyName: 'Supermercado Sul Bom',
    socialReason: 'Sul Bom Comércio de Alimentos S.A.',
    cnpj: '34.567.890/0001-12',
    phone: '(53) 3284-3300',
    addressLine: 'Av. Bento Gonçalves, 1500',
    city: 'Pelotas',
    state: 'RS',
    lat: -31.7654,
    lng: -52.3376,
    worksWithFrozen: true,
    currentSupplier: 'Panesul',
  },
  {
    id: 'cli-pe-02',
    fantasyName: 'Padaria Doce Lar',
    socialReason: 'Doce Lar Panificação ME',
    phone: '(53) 3285-4422',
    whatsapp: '(53) 99744-4422',
    addressLine: 'Rua Marechal Floriano, 800',
    city: 'Pelotas',
    state: 'RS',
    lat: -31.7720,
    lng: -52.3440,
    worksWithFrozen: true,
    currentSupplier: 'Art & Pães',
  },
  {
    id: 'cli-pe-03',
    fantasyName: 'Mini Mercado da Esquina',
    socialReason: 'Mercado Esquina Pelotense ME',
    phone: '(53) 3286-9911',
    addressLine: 'Rua Gonçalves Chaves, 200',
    city: 'Pelotas',
    state: 'RS',
    lat: -31.7580,
    lng: -52.3320,
    worksWithFrozen: false,
  },

  // === Palhoça, SC — território de Ana Souza ===
  {
    id: 'cli-pa-01',
    fantasyName: 'Mercadinho Bela Vista',
    socialReason: 'Bela Vista Comércio ME',
    cnpj: '45.678.901/0001-23',
    phone: '(48) 3242-1100',
    whatsapp: '(48) 99811-1010',
    addressLine: 'Av. Paulo Bauer, 500',
    city: 'Palhoça',
    state: 'SC',
    lat: -27.6457,
    lng: -48.6743,
    worksWithFrozen: true,
    currentSupplier: 'Superpan',
  },
  {
    id: 'cli-pa-02',
    fantasyName: 'Padaria Pão Quente',
    socialReason: 'Pão Quente Panificação Ltda',
    cnpj: '56.789.012/0001-34',
    phone: '(48) 3243-2222',
    addressLine: 'Rua Barão do Rio Branco, 1200',
    city: 'Palhoça',
    state: 'SC',
    lat: -27.6500,
    lng: -48.6800,
    worksWithFrozen: true,
    currentSupplier: 'Marquespan',
  },
  {
    id: 'cli-pa-03',
    fantasyName: 'Conveniência Posto Trevo',
    socialReason: 'Posto Trevo SA',
    phone: '(48) 3244-3333',
    addressLine: 'BR-101, km 215',
    city: 'Palhoça',
    state: 'SC',
    lat: -27.6420,
    lng: -48.6680,
    worksWithFrozen: false,
  },

  // === São José, SC ===
  {
    id: 'cli-sj-01',
    fantasyName: 'Supermercado Família',
    socialReason: 'Família Mercado Ltda',
    cnpj: '67.890.123/0001-45',
    phone: '(48) 3247-4400',
    whatsapp: '(48) 99622-4400',
    addressLine: 'Av. Presidente Kennedy, 2200',
    city: 'São José',
    state: 'SC',
    lat: -27.6147,
    lng: -48.6376,
    worksWithFrozen: true,
    currentSupplier: 'Hiperpan',
  },
  {
    id: 'cli-sj-02',
    fantasyName: 'Cafeteria Aroma do Sul',
    socialReason: 'Aroma do Sul Cafés Especiais ME',
    phone: '(48) 3248-5511',
    addressLine: 'Rua Koesa, 480',
    city: 'São José',
    state: 'SC',
    lat: -27.6080,
    lng: -48.6300,
    worksWithFrozen: false,
  },

  // === Florianópolis, SC — território de Roberto Alves ===
  {
    id: 'cli-fl-01',
    fantasyName: 'Padaria Centro Capital',
    socialReason: 'Centro Capital Panificação Ltda',
    cnpj: '78.901.234/0001-56',
    phone: '(48) 3252-7700',
    whatsapp: '(48) 99533-7700',
    addressLine: 'Rua Felipe Schmidt, 600',
    city: 'Florianópolis',
    state: 'SC',
    lat: -27.5954,
    lng: -48.5480,
    worksWithFrozen: true,
    currentSupplier: 'Padaria Brasil',
  },
  {
    id: 'cli-fl-02',
    fantasyName: 'Mercado Lagoa Conceição',
    socialReason: 'Lagoa Conceição Comércio Ltda',
    phone: '(48) 3253-8800',
    addressLine: 'Av. das Rendeiras, 1500',
    city: 'Florianópolis',
    state: 'SC',
    lat: -27.6050,
    lng: -48.4720,
    worksWithFrozen: true,
    currentSupplier: 'Superpan',
  },
  {
    id: 'cli-fl-03',
    fantasyName: 'Restaurante Vista Mar',
    socialReason: 'Vista Mar Restaurante Ltda',
    phone: '(48) 3254-9900',
    addressLine: 'Av. Beira-Mar Norte, 3200',
    city: 'Florianópolis',
    state: 'SC',
    lat: -27.5780,
    lng: -48.5450,
    worksWithFrozen: false,
  },
];

const VISITS: VisitFixture[] = [
  // Carlos Silva — Rio Grande / Pelotas
  {
    clientUuid: '11111111-0000-4000-8000-000000000001',
    representativeEmail: 'carlos@ouropaes.com.br',
    clientId: 'cli-rg-01',
    fantasyName: 'Padaria Central',
    phone: '(53) 3231-1100',
    addressLine: 'Rua Andrade Neves, 412',
    lat: -32.0337,
    lng: -52.0986,
    worksWithFrozen: true,
    currentSupplier: 'Congelados Express',
    dailyVolume: 60,
    currentPrice: 16.5,
    equipmentLent: ['Freezer 2 portas'],
    observations:
      'Cliente insatisfeito com atraso de entregas recentes do fornecedor atual. Demonstrou forte interesse em conhecer prazos da Ouro Pães. Próximo passo: enviar tabela de preços e marcar degustação.',
    hasFacadePhoto: true,
    visitedAt: hoursAgo(3),
  },
  {
    clientUuid: '11111111-0000-4000-8000-000000000002',
    representativeEmail: 'carlos@ouropaes.com.br',
    clientId: 'cli-rg-02',
    fantasyName: 'Mercado Atlântico',
    phone: '(53) 3232-2244',
    addressLine: 'Av. Itália, 1820 - Centro',
    lat: -32.0410,
    lng: -52.1050,
    worksWithFrozen: true,
    currentSupplier: 'Marquespan',
    dailyVolume: 45,
    currentPrice: 14.2,
    equipmentLent: ['Forno', 'Câmara Climática', 'Freezer'],
    observations:
      'Cliente bem servido pelo concorrente, mas mostra interesse em diversificar fornecedores. Preço competitivo. Foco em diferenciação por qualidade.',
    hasFacadePhoto: true,
    visitedAt: hoursAgo(8),
  },
  {
    clientUuid: '11111111-0000-4000-8000-000000000003',
    representativeEmail: 'carlos@ouropaes.com.br',
    clientId: 'cli-rg-03',
    fantasyName: 'Conveniência Posto Bahia',
    phone: '(53) 3233-5566',
    addressLine: 'BR-392, km 4',
    lat: -32.0510,
    lng: -52.1180,
    worksWithFrozen: false,
    equipmentLent: [],
    observations:
      'Conveniência de posto não trabalha com panificação congelada. Apresentei vídeo institucional e catálogo. Gerente pediu para falar com o dono na próxima visita.',
    hasFacadePhoto: true,
    visitedAt: daysAgo(1),
  },
  {
    clientUuid: '11111111-0000-4000-8000-000000000004',
    representativeEmail: 'carlos@ouropaes.com.br',
    clientId: 'cli-rg-04',
    fantasyName: 'Cafeteria Beira Mar',
    phone: '(53) 3234-7788',
    addressLine: 'Av. Rio Branco, 350',
    lat: -32.0290,
    lng: -52.0890,
    worksWithFrozen: false,
    equipmentLent: [],
    observations:
      'Cafeteria gourmet com público classe A. Apresentei portfólio de pães especiais e salgados premium. Sócia ficou animada com a margem proposta.',
    hasFacadePhoto: true,
    visitedAt: daysAgo(2),
  },
  {
    clientUuid: '11111111-0000-4000-8000-000000000005',
    representativeEmail: 'carlos@ouropaes.com.br',
    clientId: 'cli-pe-01',
    fantasyName: 'Supermercado Sul Bom',
    phone: '(53) 3284-3300',
    addressLine: 'Av. Bento Gonçalves, 1500',
    lat: -31.7654,
    lng: -52.3376,
    worksWithFrozen: true,
    currentSupplier: 'Panesul',
    dailyVolume: 90,
    currentPrice: 13.8,
    equipmentLent: ['Forno', 'Armário de Crescimento', 'Câmara Climática', 'Freezer', 'Telas/Formas'],
    observations:
      'Volume altíssimo. Cliente bem equipado pelo Panesul. Estratégia: bonificação + diferencial de pós-venda.',
    hasFacadePhoto: true,
    visitedAt: daysAgo(3),
  },
  {
    clientUuid: '11111111-0000-4000-8000-000000000006',
    representativeEmail: 'carlos@ouropaes.com.br',
    clientId: 'cli-pe-02',
    fantasyName: 'Padaria Doce Lar',
    phone: '(53) 3285-4422',
    addressLine: 'Rua Marechal Floriano, 800',
    lat: -31.7720,
    lng: -52.3440,
    worksWithFrozen: true,
    currentSupplier: 'Art & Pães',
    dailyVolume: 28,
    currentPrice: 17.5,
    equipmentLent: ['Freezer'],
    observations:
      'Cliente paga caro pelo concorrente local. Possui apenas 1 equipamento — oportunidade clara de oferta de forno e armário.',
    hasFacadePhoto: true,
    visitedAt: daysAgo(5),
  },
  {
    clientUuid: '11111111-0000-4000-8000-000000000007',
    representativeEmail: 'carlos@ouropaes.com.br',
    clientId: 'cli-pe-03',
    fantasyName: 'Mini Mercado da Esquina',
    phone: '(53) 3286-9911',
    addressLine: 'Rua Gonçalves Chaves, 200',
    lat: -31.7580,
    lng: -52.3320,
    worksWithFrozen: false,
    equipmentLent: [],
    observations:
      'Mercadinho pequeno, fluxo baixo. Dono diz que clientes não procuram pão fresco. Tentar abordagem com produtos prontos (pão de queijo, salgados).',
    hasFacadePhoto: false,
    visitedAt: daysAgo(7),
  },

  // Ana Souza — Palhoça
  {
    clientUuid: '22222222-0000-4000-8000-000000000001',
    representativeEmail: 'ana@ouropaes.com.br',
    clientId: 'cli-pa-01',
    fantasyName: 'Mercadinho Bela Vista',
    phone: '(48) 3242-1100',
    addressLine: 'Av. Paulo Bauer, 500',
    lat: -27.6457,
    lng: -48.6743,
    worksWithFrozen: true,
    currentSupplier: 'Superpan',
    dailyVolume: 35,
    currentPrice: 16.8,
    equipmentLent: ['Freezer Horizontal'],
    observations:
      'Fluxo médio, espaço reduzido. Cliente reclamou de falhas de entrega do Superpan na última semana. Bom momento para abordagem.',
    hasFacadePhoto: true,
    visitedAt: hoursAgo(6),
  },
  {
    clientUuid: '22222222-0000-4000-8000-000000000002',
    representativeEmail: 'ana@ouropaes.com.br',
    clientId: 'cli-pa-02',
    fantasyName: 'Padaria Pão Quente',
    phone: '(48) 3243-2222',
    addressLine: 'Rua Barão do Rio Branco, 1200',
    lat: -27.6500,
    lng: -48.6800,
    worksWithFrozen: true,
    currentSupplier: 'Marquespan',
    dailyVolume: 55,
    currentPrice: 15.0,
    equipmentLent: ['Forno', 'Câmara Climática'],
    observations:
      'Padaria tradicional com clientela fiel. Bem equipada. Estratégia: produto premium + degustação com clientes finais.',
    hasFacadePhoto: true,
    visitedAt: daysAgo(1),
  },
  {
    clientUuid: '22222222-0000-4000-8000-000000000003',
    representativeEmail: 'ana@ouropaes.com.br',
    clientId: 'cli-pa-03',
    fantasyName: 'Conveniência Posto Trevo',
    phone: '(48) 3244-3333',
    addressLine: 'BR-101, km 215',
    lat: -27.6420,
    lng: -48.6680,
    worksWithFrozen: false,
    equipmentLent: [],
    observations:
      'Posto não vende pão fresco. Gerente interessado em testar salgados pré-prontos para microondas. Marcar reunião com proprietário.',
    hasFacadePhoto: true,
    visitedAt: daysAgo(2),
  },

  // Roberto Alves — São José / Florianópolis
  {
    clientUuid: '33333333-0000-4000-8000-000000000001',
    representativeEmail: 'roberto@ouropaes.com.br',
    clientId: 'cli-sj-01',
    fantasyName: 'Supermercado Família',
    phone: '(48) 3247-4400',
    addressLine: 'Av. Presidente Kennedy, 2200',
    lat: -27.6147,
    lng: -48.6376,
    worksWithFrozen: true,
    currentSupplier: 'Hiperpan',
    dailyVolume: 110,
    currentPrice: 13.5,
    equipmentLent: ['Forno', 'Armário de Crescimento', 'Câmara Climática', 'Freezer', 'Telas/Formas'],
    observations:
      'Maior cliente potencial da rota. Volume excepcional. Estratégia: bonificação agressiva e degustação periódica para fortalecer relação.',
    hasFacadePhoto: true,
    visitedAt: hoursAgo(5),
  },
  {
    clientUuid: '33333333-0000-4000-8000-000000000002',
    representativeEmail: 'roberto@ouropaes.com.br',
    clientId: 'cli-sj-02',
    fantasyName: 'Cafeteria Aroma do Sul',
    phone: '(48) 3248-5511',
    addressLine: 'Rua Koesa, 480',
    lat: -27.6080,
    lng: -48.6300,
    worksWithFrozen: false,
    equipmentLent: [],
    observations:
      'Cafeteria especializada em cafés. Apresentei nosso portfólio de croissants e salgados gourmet. Demonstraram interesse, mas precisam aprovar com matriz.',
    hasFacadePhoto: true,
    visitedAt: daysAgo(1),
  },
  {
    clientUuid: '33333333-0000-4000-8000-000000000003',
    representativeEmail: 'roberto@ouropaes.com.br',
    clientId: 'cli-fl-01',
    fantasyName: 'Padaria Centro Capital',
    phone: '(48) 3252-7700',
    addressLine: 'Rua Felipe Schmidt, 600',
    lat: -27.5954,
    lng: -48.5480,
    worksWithFrozen: true,
    currentSupplier: 'Padaria Brasil',
    dailyVolume: 70,
    currentPrice: 16.2,
    equipmentLent: ['Forno', 'Câmara Climática', 'Freezer'],
    observations:
      'Padaria do centro com bom giro. Cliente reclamou do preço da Padaria Brasil. Boa oportunidade para entrada via diferenciação de preço.',
    hasFacadePhoto: true,
    visitedAt: daysAgo(2),
  },
  {
    clientUuid: '33333333-0000-4000-8000-000000000004',
    representativeEmail: 'roberto@ouropaes.com.br',
    clientId: 'cli-fl-02',
    fantasyName: 'Mercado Lagoa Conceição',
    phone: '(48) 3253-8800',
    addressLine: 'Av. das Rendeiras, 1500',
    lat: -27.6050,
    lng: -48.4720,
    worksWithFrozen: true,
    currentSupplier: 'Superpan',
    dailyVolume: 40,
    currentPrice: 15.5,
    equipmentLent: ['Freezer Vertical', 'Armário de Crescimento'],
    observations:
      'Mercado em região turística — pico no verão. Bom potencial sazonal. Conversar sobre logística reforçada de dezembro a fevereiro.',
    hasFacadePhoto: true,
    visitedAt: daysAgo(4),
  },
  {
    clientUuid: '33333333-0000-4000-8000-000000000005',
    representativeEmail: 'roberto@ouropaes.com.br',
    clientId: 'cli-fl-03',
    fantasyName: 'Restaurante Vista Mar',
    phone: '(48) 3254-9900',
    addressLine: 'Av. Beira-Mar Norte, 3200',
    lat: -27.5780,
    lng: -48.5450,
    worksWithFrozen: false,
    equipmentLent: [],
    observations:
      'Restaurante de alto padrão. Não trabalha com congelados hoje, mas chef ficou curioso com a linha gourmet. Enviei catálogo via WhatsApp.',
    hasFacadePhoto: false,
    visitedAt: daysAgo(6),
  },

  // Visita histórica para mostrar follow-up (mesma padaria, 4 meses atrás)
  {
    clientUuid: '11111111-0000-4000-8000-000000000099',
    representativeEmail: 'carlos@ouropaes.com.br',
    clientId: 'cli-rg-01',
    fantasyName: 'Padaria Central',
    phone: '(53) 3231-1100',
    addressLine: 'Rua Andrade Neves, 412',
    lat: -32.0337,
    lng: -52.0986,
    worksWithFrozen: true,
    currentSupplier: 'Congelados Express',
    dailyVolume: 55,
    currentPrice: 16.0,
    equipmentLent: ['Freezer 2 portas'],
    observations:
      'Primeira visita: cliente satisfeito com fornecedor atual. Mantemos contato para revisão futura.',
    hasFacadePhoto: false,
    visitedAt: daysAgo(120),
  },
];

async function main() {
  console.log('🌾 Solupães · iniciando seed...');

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const [admin, gestor, carlos, ana, roberto] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@solupaes.com.br' },
      update: {},
      create: {
        email: 'admin@solupaes.com.br',
        name: 'Admin Solupães',
        role: 'ADMIN',
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'gestor@ouropaes.com.br' },
      update: {},
      create: {
        email: 'gestor@ouropaes.com.br',
        name: 'Marcos Gestor',
        role: 'GESTOR',
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'carlos@ouropaes.com.br' },
      update: {},
      create: {
        email: 'carlos@ouropaes.com.br',
        name: 'Carlos Silva',
        role: 'REPRESENTANTE',
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'ana@ouropaes.com.br' },
      update: {},
      create: {
        email: 'ana@ouropaes.com.br',
        name: 'Ana Souza',
        role: 'REPRESENTANTE',
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'roberto@ouropaes.com.br' },
      update: {},
      create: {
        email: 'roberto@ouropaes.com.br',
        name: 'Roberto Alves',
        role: 'REPRESENTANTE',
        passwordHash,
      },
    }),
  ]);

  void admin;
  console.log('👥 5 usuários (admin, gestor, 3 representantes)');

  for (const c of CLIENTS) {
    await prisma.client.upsert({
      where: { id: c.id },
      update: {
        fantasyName: c.fantasyName,
        socialReason: c.socialReason,
        phone: c.phone,
        whatsapp: c.whatsapp,
        addressLine: c.addressLine,
        city: c.city,
        state: c.state,
        lat: c.lat,
        lng: c.lng,
        worksWithFrozen: c.worksWithFrozen,
        currentSupplier: c.currentSupplier,
      },
      create: {
        id: c.id,
        fantasyName: c.fantasyName,
        socialReason: c.socialReason,
        cnpj: c.cnpj,
        phone: c.phone,
        whatsapp: c.whatsapp,
        addressLine: c.addressLine,
        city: c.city,
        state: c.state,
        lat: c.lat,
        lng: c.lng,
        worksWithFrozen: c.worksWithFrozen,
        currentSupplier: c.currentSupplier,
      },
    });
  }
  console.log(`🏪 ${CLIENTS.length} estabelecimentos em RS e SC`);

  const userByEmail: Record<string, string> = {
    'carlos@ouropaes.com.br': carlos.id,
    'ana@ouropaes.com.br': ana.id,
    'roberto@ouropaes.com.br': roberto.id,
  };

  let strategiesCreated = 0;

  for (const v of VISITS) {
    const repId = userByEmail[v.representativeEmail];
    if (!repId) continue;

    const scoreInput = {
      worksWithFrozen: v.worksWithFrozen,
      dailyVolume: v.dailyVolume,
      currentPrice: v.currentPrice,
      equipmentLent: v.equipmentLent,
      hasFacadePhoto: v.hasFacadePhoto,
      hasGps: true,
    };

    const score = calculateScore(scoreInput);

    const visit = await prisma.visit.upsert({
      where: { clientUuid: v.clientUuid },
      update: {},
      create: {
        clientId: v.clientId,
        representativeId: repId,
        fantasyName: v.fantasyName,
        phone: v.phone,
        addressLine: v.addressLine,
        lat: v.lat,
        lng: v.lng,
        worksWithFrozen: v.worksWithFrozen,
        currentSupplier: v.currentSupplier,
        dailyVolume: v.dailyVolume,
        currentPrice: v.currentPrice,
        equipmentLent: v.equipmentLent,
        observations: v.observations,
        viabilityScore: score.score,
        classification: score.classification as Classification,
        status: 'SYNCED',
        clientUuid: v.clientUuid,
        visitedAt: v.visitedAt,
      },
    });

    const proposals = proposeStrategies(scoreInput);
    for (const p of proposals) {
      const existing = await prisma.strategy.findFirst({
        where: { visitId: visit.id, type: p.type as StrategyType },
      });
      if (existing) continue;
      await prisma.strategy.create({
        data: {
          clientId: v.clientId,
          visitId: visit.id,
          title: p.title,
          description: p.description,
          type: p.type as StrategyType,
          status: 'PROPOSED' as StrategyStatus,
          followUpAt: p.followUpDays ? daysFromNow(p.followUpDays) : null,
          createdById: gestor.id,
          generatedByAi: false,
        },
      });
      strategiesCreated += 1;
    }
  }

  console.log(`📝 ${VISITS.length} visitas registradas`);
  console.log(`💡 ${strategiesCreated} estratégias geradas pelo engine`);

  // Move algumas estratégias para outros estados para mostrar Kanban variado
  const allProposed = await prisma.strategy.findMany({
    where: { status: 'PROPOSED' },
    orderBy: { createdAt: 'asc' },
  });

  const transitions: Array<{ index: number; status: StrategyStatus }> = [
    { index: 0, status: 'IN_PROGRESS' },
    { index: 2, status: 'IN_PROGRESS' },
    { index: 4, status: 'WON' },
    { index: 6, status: 'POSTPONED' },
    { index: 8, status: 'LOST' },
    { index: 10, status: 'IN_PROGRESS' },
  ];

  for (const t of transitions) {
    const target = allProposed[t.index];
    if (!target) continue;
    await prisma.strategy.update({
      where: { id: target.id },
      data: { status: t.status },
    });
  }
  console.log('🧩 Kanban populado com 5 estados diferentes');

  console.log('');
  console.log('✅ Seed concluído.');
  console.log('');
  console.log('📧 Usuários criados (senha = valor de SEED_PASSWORD no .env):');
  console.log('   admin@solupaes.com.br      (ADMIN)');
  console.log('   gestor@ouropaes.com.br     (GESTOR)');
  console.log('   carlos@ouropaes.com.br     (REPRESENTANTE — Rio Grande/Pelotas)');
  console.log('   ana@ouropaes.com.br        (REPRESENTANTE — Palhoça)');
  console.log('   roberto@ouropaes.com.br    (REPRESENTANTE — Florianópolis)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
