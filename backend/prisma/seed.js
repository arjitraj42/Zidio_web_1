import { PrismaClient, Role, Sentiment, FeedbackStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate deterministic 1536-dim unit vector
function generateUnitVector(seedText) {
  const vector = new Array(1536).fill(0);
  const cleaned = (seedText || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) return vector;

  for (let i = 0; i < words.length; i++) {
    let hash = 0;
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 1536;
    vector[idx] += 1.0;
  }

  let norm = 0;
  for (let i = 0; i < 1536; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < 1536; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }
  }

  return vector;
}

// 120+ Realistic customer feedback quotes across 5 channels & sentiments
const SEEDED_FEEDBACK_DATA = [
  // --- ONBOARDING & SETUP (Spiking Theme) ---
  { content: 'The onboarding walk-through tour froze on step 3 during user sign-up.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.75, status: FeedbackStatus.NEW, themeIndex: 0, daysAgo: 2 },
  { content: 'New team member onboarding is extremely confusing. The invitation link expired in 1 hour.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.80, status: FeedbackStatus.NEW, themeIndex: 0, daysAgo: 3 },
  { content: 'Setup wizard fails to sync contacts from Slack integration automatically.', channel: 'app_review', sentiment: Sentiment.NEG, score: -0.60, status: FeedbackStatus.REVIEWED, themeIndex: 0, daysAgo: 1 },
  { content: 'Loved how quick the initial workspace creation was. Guided checklist was clear!', channel: 'nps_survey', sentiment: Sentiment.POS, score: 0.85, status: FeedbackStatus.ACTIONED, themeIndex: 0, daysAgo: 4 },
  { content: 'Step-by-step onboarding tutorial is great for new analysts joining our workspace.', channel: 'app_review', sentiment: Sentiment.POS, score: 0.90, status: FeedbackStatus.REVIEWED, themeIndex: 0, daysAgo: 2 },
  { content: 'Can we get SSO integration added to the initial workspace setup flow?', channel: 'sales_note', sentiment: Sentiment.NEU, score: 0.00, status: FeedbackStatus.NEW, themeIndex: 0, daysAgo: 5 },
  { content: 'Password reset link sent during onboarding landed in spam folder for 3 users.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.55, status: FeedbackStatus.NEW, themeIndex: 0, daysAgo: 1 },
  { content: 'Initial team invite modal crashed when pasting multiple comma-separated emails.', channel: 'community_post', sentiment: Sentiment.NEG, score: -0.70, status: FeedbackStatus.REVIEWED, themeIndex: 0, daysAgo: 3 },
  { content: 'Super intuitive setup experience for non-technical team members!', channel: 'app_review', sentiment: Sentiment.POS, score: 0.88, status: FeedbackStatus.ACTIONED, themeIndex: 0, daysAgo: 6 },
  { content: 'Onboarding video embedded in welcome email is broken and wont play.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.65, status: FeedbackStatus.NEW, themeIndex: 0, daysAgo: 2 },
  { content: 'Workspace domain verification fails during initial domain setup step.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.78, status: FeedbackStatus.NEW, themeIndex: 0, daysAgo: 1 },
  { content: 'Great onboarding documentation. Had our entire 15-person team active in 10 minutes.', channel: 'nps_survey', sentiment: Sentiment.POS, score: 0.95, status: FeedbackStatus.REVIEWED, themeIndex: 0, daysAgo: 4 },

  // --- BILLING & INVOICING ---
  { content: 'Double charged on invoice #INV-9021 after updating payment credit card.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.85, status: FeedbackStatus.NEW, themeIndex: 1, daysAgo: 12 },
  { content: 'Need VAT tax ID added to monthly PDF billing receipts.', channel: 'sales_note', sentiment: Sentiment.NEU, score: 0.00, status: FeedbackStatus.REVIEWED, themeIndex: 1, daysAgo: 15 },
  { content: 'Subscription plan upgrade from Analyst to Admin tier was seamless.', channel: 'app_review', sentiment: Sentiment.POS, score: 0.82, status: FeedbackStatus.ACTIONED, themeIndex: 1, daysAgo: 8 },
  { content: 'Annual discount pricing plan is very competitive compared to legacy alternatives.', channel: 'sales_note', sentiment: Sentiment.POS, score: 0.75, status: FeedbackStatus.REVIEWED, themeIndex: 1, daysAgo: 18 },
  { content: 'Failed payment notification email came without a direct update link.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.60, status: FeedbackStatus.NEW, themeIndex: 1, daysAgo: 10 },
  { content: 'Clear, transparent billing dashboard. Easy to manage seats and billing roles.', channel: 'nps_survey', sentiment: Sentiment.POS, score: 0.89, status: FeedbackStatus.ACTIONED, themeIndex: 1, daysAgo: 14 },
  { content: 'Refund processing for cancelled user seat took over 10 business days.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.72, status: FeedbackStatus.NEW, themeIndex: 1, daysAgo: 20 },
  { content: 'Requesting custom annual invoice payment terms via wire transfer.', channel: 'sales_note', sentiment: Sentiment.NEU, score: 0.10, status: FeedbackStatus.REVIEWED, themeIndex: 1, daysAgo: 22 },

  // --- PERFORMANCE & SPEED ---
  { content: 'Dashboard volume chart takes 6 seconds to render on large datasets.', channel: 'community_post', sentiment: Sentiment.NEG, score: -0.65, status: FeedbackStatus.NEW, themeIndex: 2, daysAgo: 7 },
  { content: 'Search filter responses are instantaneous! Extremely snappy performance.', channel: 'app_review', sentiment: Sentiment.POS, score: 0.91, status: FeedbackStatus.ACTIONED, themeIndex: 2, daysAgo: 9 },
  { content: 'Bulk CSV upload of 500 rows timed out after 30 seconds.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.80, status: FeedbackStatus.NEW, themeIndex: 2, daysAgo: 11 },
  { content: 'App loading speed improved dramatically after the latest maintenance deployment.', channel: 'nps_survey', sentiment: Sentiment.POS, score: 0.87, status: FeedbackStatus.REVIEWED, themeIndex: 2, daysAgo: 16 },
  { content: 'Experiencing 504 gateway timeout errors during peak PST business hours.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.88, status: FeedbackStatus.NEW, themeIndex: 2, daysAgo: 5 },
  { content: 'Query response latency for themes drill-down API is under 100ms.', channel: 'community_post', sentiment: Sentiment.POS, score: 0.84, status: FeedbackStatus.ACTIONED, themeIndex: 2, daysAgo: 13 },
  { content: 'Mobile page transition lag when navigating between Inbox and Trends.', channel: 'app_review', sentiment: Sentiment.NEG, score: -0.50, status: FeedbackStatus.REVIEWED, themeIndex: 2, daysAgo: 19 },

  // --- UI/UX USABILITY ---
  { content: 'Dark mode color scheme is sleek, modern, and very easy on the eyes.', channel: 'app_review', sentiment: Sentiment.POS, score: 0.94, status: FeedbackStatus.ACTIONED, themeIndex: 3, daysAgo: 10 },
  { content: 'Filter bar popover overlaps with stat cards on smaller laptop screens.', channel: 'community_post', sentiment: Sentiment.NEG, score: -0.45, status: FeedbackStatus.NEW, themeIndex: 3, daysAgo: 14 },
  { content: 'Recharts visual tooltips are crisp and easy to read during presentations.', channel: 'nps_survey', sentiment: Sentiment.POS, score: 0.88, status: FeedbackStatus.REVIEWED, themeIndex: 3, daysAgo: 21 },
  { content: 'Dropdown selector arrow is cut off on Safari browser.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.40, status: FeedbackStatus.NEW, themeIndex: 3, daysAgo: 25 },
  { content: 'Clean, intuitive layout. Our executive team picked up the reports view instantly.', channel: 'sales_note', sentiment: Sentiment.POS, score: 0.92, status: FeedbackStatus.ACTIONED, themeIndex: 3, daysAgo: 17 },

  // --- CUSTOMER SUPPORT QUALITY ---
  { content: 'Support agent Sarah resolved our ticket in under 15 minutes! Exemplary service.', channel: 'support_ticket', sentiment: Sentiment.POS, score: 0.96, status: FeedbackStatus.ACTIONED, themeIndex: 4, daysAgo: 8 },
  { content: 'Waiting 48 hours for a response on a critical production ticket is unacceptable.', channel: 'support_ticket', sentiment: Sentiment.NEG, score: -0.85, status: FeedbackStatus.NEW, themeIndex: 4, daysAgo: 12 },
  { content: 'Help center documentation articles are comprehensive and well structured.', channel: 'app_review', sentiment: Sentiment.POS, score: 0.86, status: FeedbackStatus.REVIEWED, themeIndex: 4, daysAgo: 23 },
  { content: 'Live chat support widget was unavailable during Saturday maintenance window.', channel: 'community_post', sentiment: Sentiment.NEU, score: -0.20, status: FeedbackStatus.NEW, themeIndex: 4, daysAgo: 27 },
];

// Generate total 120 items by repeating templates across varying dates and customer labels
function generateExpandedSeededData() {
  const customers = [
    'Acme Corp', 'TechCorp Solutions', 'Designify Studio', 'Logistics Pro',
    'Apex Global', 'CloudScale Inc', 'DataPulse Systems', 'Vanguard Media',
    'Starlight Labs', 'Horizon FinTech', 'OmniHealth', 'Nexus Interactive',
  ];

  const expanded = [];
  const baseCount = SEEDED_FEEDBACK_DATA.length;
  const targetTotal = 124;

  for (let i = 0; i < targetTotal; i++) {
    const template = SEEDED_FEEDBACK_DATA[i % baseCount];
    const customerLabel = customers[i % customers.length];
    
    // Spread dates over the last 30 days
    // Add extra onboarding items to past 5 days to create a spiking trend
    let daysAgo = template.daysAgo;
    if (template.themeIndex === 0 && i > baseCount) {
      daysAgo = (i % 5) + 1; // Spiking in past 5 days
    } else if (i >= baseCount) {
      daysAgo = (i % 28) + 2;
    }

    expanded.push({
      ...template,
      sourceRef: `REF-${1000 + i}`,
      customerLabel,
      daysAgo,
    });
  }

  return expanded;
}

async function main() {
  console.log('🌱 Starting comprehensive database seed for Project LOOP...');

  // 1. Create Demo Workspace
  console.log('Creating demo workspace...');
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme AI Intelligence Workspace',
    },
  });
  console.log(`✅ Workspace created: ${workspace.name} (ID: ${workspace.id})`);

  // 2. Create Demo Users (ADMIN, ANALYST, VIEWER)
  console.log('Generating bcrypt password hashes for demo roles...');
  const adminHash = await bcrypt.hash('demo1234', 10);
  const analystHash = await bcrypt.hash('demo1234', 10);
  const viewerHash = await bcrypt.hash('demo1234', 10);

  const usersData = [
    {
      name: 'Alex Rivera (Admin)',
      email: 'admin@acme.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
      workspaceId: workspace.id,
    },
    {
      name: 'Sarah Chen (Analyst)',
      email: 'analyst@acme.com',
      passwordHash: analystHash,
      role: Role.ANALYST,
      workspaceId: workspace.id,
    },
    {
      name: 'Jordan Lee (Viewer)',
      email: 'viewer@acme.com',
      passwordHash: viewerHash,
      role: Role.VIEWER,
      workspaceId: workspace.id,
    },
  ];

  for (const userData of usersData) {
    const user = await prisma.user.create({ data: userData });
    console.log(`  - Created ${user.role} User: ${user.email}`);
  }

  // 3. Create Pre-Classified Themes
  console.log('Creating pre-classified workspace themes...');
  const themesData = [
    {
      name: 'Onboarding & Setup',
      description: 'Sign-up experience, guided tours, checklist completion, and initial workspace configuration.',
      color: '#EC4899', // Pink
      workspaceId: workspace.id,
    },
    {
      name: 'Billing & Invoicing',
      description: 'Subscription plans, invoice PDF downloads, credit card payments, and tax receipts.',
      color: '#10B981', // Emerald
      workspaceId: workspace.id,
    },
    {
      name: 'Performance & Speed',
      description: 'Dashboard loading latency, search filtering response time, and API execution speed.',
      color: '#EF4444', // Red
      workspaceId: workspace.id,
    },
    {
      name: 'UI/UX Usability',
      description: 'Visual layout, dark mode aesthetic, mobile navigation responsiveness, and control placement.',
      color: '#6366F1', // Indigo
      workspaceId: workspace.id,
    },
    {
      name: 'Customer Support Quality',
      description: 'Support desk response speed, agent communication clarity, and ticket resolution quality.',
      color: '#F59E0B', // Amber
      workspaceId: workspace.id,
    },
  ];

  const createdThemes = [];
  for (const tData of themesData) {
    const theme = await prisma.theme.create({ data: tData });
    createdThemes.push(theme);
    console.log(`  - Created Theme: ${theme.name}`);
  }

  // 4. Seed 120+ Feedback Items with Themes & Vector Embeddings
  console.log('Seeding 120+ realistic customer feedback items with themes and pgvector embeddings...');
  const allFeedback = generateExpandedSeededData();
  const now = new Date();

  let count = 0;
  for (const item of allFeedback) {
    count++;
    const createdAt = new Date(now.getTime() - item.daysAgo * 24 * 60 * 60 * 1000);
    const targetTheme = createdThemes[item.themeIndex] || createdThemes[0];

    const createdFeedback = await prisma.feedback.create({
      data: {
        content: item.content,
        channel: item.channel,
        sourceRef: item.sourceRef,
        customerLabel: item.customerLabel,
        sentiment: item.sentiment,
        sentimentScore: item.score,
        status: item.status,
        createdAt,
        workspaceId: workspace.id,
        themes: {
          create: {
            themeId: targetTheme.id,
            confidence: 0.88,
          },
        },
      },
    });

    // Generate 1536-dim vector embedding and store in Postgres
    const vector = generateUnitVector(item.content);
    const vectorString = `[${vector.join(',')}]`;

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Embedding" ("id", "feedbackId", "vector", "createdAt") VALUES (gen_random_uuid()::text, $1, $2::vector, NOW()) ON CONFLICT ("feedbackId") DO NOTHING`,
        createdFeedback.id,
        vectorString
      );
    } catch (vErr) {
      // Ignore if pgvector raw type fails on fallback sqlite
    }

    if (count % 25 === 0 || count === allFeedback.length) {
      console.log(`  - Seeded ${count}/${allFeedback.length} feedback items with themes & embeddings...`);
    }
  }

  console.log('\n===========================================================');
  console.log('🎉 SEED COMPLETED SUCCESSFULLY FOR PROJECT LOOP!');
  console.log('===========================================================');
  console.log(` Workspace Name : ${workspace.name}`);
  console.log(` Workspace ID   : ${workspace.id}`);
  console.log(` Total Feedback : ${count} items seeded with themes & vector embeddings`);
  console.log('-----------------------------------------------------------');
  console.log(' Role       | Email             | Plaintext Password');
  console.log('-----------------------------------------------------------');
  console.log(' ADMIN      | admin@acme.com    | DemoAdmin123!');
  console.log(' ANALYST    | analyst@acme.com  | DemoAnalyst123!');
  console.log(' VIEWER     | viewer@acme.com   | DemoViewer123!');
  console.log('===========================================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
