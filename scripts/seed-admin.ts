/**
 * Creates the first administrator account.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Optional env overrides:
 *   SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const { connectToDatabase } = await import('../lib/db');
  const { hashPassword } = await import('../lib/auth/password');
  const { User } = await import('../lib/models/User');

  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Admin';
  const email = (
    process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@example.com'
  ).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMeNow1!';

  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
  }

  await connectToDatabase();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    console.log('No changes made.');
    process.exit(0);
  }

  await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
    isActive: true,
  });

  console.log('Created administrator account:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log('');
  console.log('Sign in at /login and change this password immediately.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
