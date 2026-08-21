import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { verifyPassword } from '@/lib/auth/password';
import { startSession } from '@/lib/auth/session';
import { User } from '@/lib/models/User';
import { serializeUser } from '@/lib/serialize';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const POST = apiHandler(async (request) => {
  const { email, password } = await parseBody(request, loginSchema);

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Same message for unknown email and wrong password so the form cannot be
  // used to discover which addresses have accounts.
  const invalid = new ApiError(401, 'Invalid email or password.');
  if (!user) throw invalid;

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) throw invalid;

  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated.');
  }

  await startSession({
    userId: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
  });

  user.lastLoginAt = new Date();
  await user.save();

  return NextResponse.json({ user: serializeUser(user.toObject()) });
});
