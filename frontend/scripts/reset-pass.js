import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPasswords() {
  console.log('Resetting demo passwords to demo1234 and DemoAdmin123!...');
  const hash1 = await bcrypt.hash('demo1234', 10);

  const adminResult = await prisma.user.updateMany({
    where: { email: 'admin@acme.com' },
    data: { passwordHash: hash1 },
  });

  const analystResult = await prisma.user.updateMany({
    where: { email: 'analyst@acme.com' },
    data: { passwordHash: hash1 },
  });

  const viewerResult = await prisma.user.updateMany({
    where: { email: 'viewer@acme.com' },
    data: { passwordHash: hash1 },
  });

  console.log('✅ Demo accounts updated!');
  console.log(`- Admin updated: ${adminResult.count}`);
  console.log(`- Analyst updated: ${analystResult.count}`);
  console.log(`- Viewer updated: ${viewerResult.count}`);
}

resetPasswords()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error resetting passwords:', e);
    await prisma.$disconnect();
  });
