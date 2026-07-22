import { PrismaClient, Role, Sentiment, FeedbackStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // --------------------------------------------------------------------------
  // TODO 1: Create Demo Workspace
  // --------------------------------------------------------------------------
  console.log('Creating demo workspace...');
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme AI Intelligence Workspace',
    },
  });
  console.log(`✅ Workspace created: ${workspace.name} (ID: ${workspace.id})`);

  // --------------------------------------------------------------------------
  // TODO 2: Create Demo Users (ADMIN, ANALYST, VIEWER)
  // --------------------------------------------------------------------------
  console.log('Creating demo users...');
  // Dummy password hash placeholder (use bcrypt.hash in production)
  const defaultPasswordHash = '$2b$10$EpRnTzVlqHNP0.fKbXWkDe1JqY.89x/N0p0g8q7r6s5t4u3v2w1x0';

  const usersData = [
    {
      name: 'Alex Rivera (Admin)',
      email: 'admin@acme.com',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      workspaceId: workspace.id,
    },
    {
      name: 'Sarah Chen (Analyst)',
      email: 'analyst@acme.com',
      passwordHash: defaultPasswordHash,
      role: Role.ANALYST,
      workspaceId: workspace.id,
    },
    {
      name: 'Jordan Lee (Viewer)',
      email: 'viewer@acme.com',
      passwordHash: defaultPasswordHash,
      role: Role.VIEWER,
      workspaceId: workspace.id,
    },
  ];

  const createdUsers = [];
  for (const userData of usersData) {
    const user = await prisma.user.create({ data: userData });
    createdUsers.push(user);
    console.log(`  - Created ${user.role} User: ${user.email}`);
  }

  // --------------------------------------------------------------------------
  // TODO 3: Create Themes
  // --------------------------------------------------------------------------
  console.log('Creating sample feedback themes...');
  const themesData = [
    {
      name: 'Performance & Speed',
      description: 'Feedback regarding dashboard loading times, response latency, and system speed.',
      color: '#EF4444', // Red
      workspaceId: workspace.id,
    },
    {
      name: 'UI/UX Usability',
      description: 'Interface navigation, visual design clarity, and user experience feedback.',
      color: '#6366F1', // Indigo
      workspaceId: workspace.id,
    },
    {
      name: 'Pricing & Billing',
      description: 'Inquiries, complaints, or feedback related to subscription tiers and invoicing.',
      color: '#10B981', // Emerald
      workspaceId: workspace.id,
    },
    {
      name: 'Customer Support Quality',
      description: 'Interactions with support agents, response time, and ticket resolution satisfaction.',
      color: '#F59E0B', // Amber
      workspaceId: workspace.id,
    },
  ];

  const createdThemes = [];
  for (const themeData of themesData) {
    const theme = await prisma.theme.create({ data: themeData });
    createdThemes.push(theme);
    console.log(`  - Created Theme: ${theme.name}`);
  }

  // --------------------------------------------------------------------------
  // TODO 4: Loop & Array Structure for 120+ Feedback Items across channels
  // --------------------------------------------------------------------------
  console.log('Seeding sample feedback items...');

  // Sample feedback templates to demonstrate structure (expandable to 120+ items)
  const sampleFeedbackTemplates = [
    {
      content: 'The new analytics dashboard loads significantly faster than before. Great job on performance!',
      channel: 'app_review',
      sourceRef: 'REV-1001',
      customerLabel: 'TechCorp Solutions',
      sentiment: Sentiment.POS,
      sentimentScore: 0.85,
      status: FeedbackStatus.REVIEWED,
      themeId: createdThemes[0].id,
      confidence: 0.92,
    },
    {
      content: 'Faced an issue with monthly billing invoice generation. Need assistance from support.',
      channel: 'support_ticket',
      sourceRef: 'TICKET-4029',
      customerLabel: 'Enterprise Logistics',
      sentiment: Sentiment.NEG,
      sentimentScore: -0.65,
      status: FeedbackStatus.NEW,
      themeId: createdThemes[2].id,
      confidence: 0.88,
    },
    {
      content: 'The mobile navigation menu is slightly confusing when trying to export reports.',
      channel: 'nps_survey',
      sourceRef: 'NPS-9921',
      customerLabel: 'Designify Studio',
      sentiment: Sentiment.NEU,
      sentimentScore: 0.05,
      status: FeedbackStatus.ACTIONED,
      themeId: createdThemes[1].id,
      confidence: 0.79,
    },
  ];

  // TODO: Expand array loop to insert 120+ realistic customer feedback items across channels
  // (support_ticket, app_review, nps_survey, sales_call, social)
  for (const template of sampleFeedbackTemplates) {
    const feedback = await prisma.feedback.create({
      data: {
        content: template.content,
        channel: template.channel,
        sourceRef: template.sourceRef,
        customerLabel: template.customerLabel,
        sentiment: template.sentiment,
        sentimentScore: template.sentimentScore,
        status: template.status,
        workspaceId: workspace.id,
        themes: {
          create: {
            themeId: template.themeId,
            confidence: template.confidence,
          },
        },
        embedding: {
          create: {
            // Sample dummy embedding vector (e.g. 8-dimensional representation sample)
            vector: [0.012, -0.045, 0.128, 0.891, -0.210, 0.005, 0.443, -0.112],
          },
        },
      },
    });

    console.log(`  - Seeded Feedback: ${feedback.id} (${feedback.channel})`);
  }

  console.log('🎉 Seeding completed successfully!');
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
