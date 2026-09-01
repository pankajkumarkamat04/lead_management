'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { captureError, FormError } from '@/components/FormError';
import { PasswordInput } from '@/components/PasswordInput';
import { apiFetch } from '@/lib/client';
import { clientDebug } from '@/lib/debug';
import { Button, Field, Input, Spinner } from './ui';

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setPending(true);
    clientDebug('login', 'Submitting sign-in', { email: trimmedEmail, redirectTo });

    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      clientDebug('login', 'Sign-in OK — redirecting', { redirectTo });
      router.replace(redirectTo);
      // Server components cache the signed-out state, so refresh after login.
      router.refresh();
    } catch (caught) {
      clientDebug('login', 'Sign-in failed', { message: captureError(caught) });
      setError(captureError(caught));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormError error={error} />

      <Field label="Email address">
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          placeholder="you@company.com"
          required
          autoFocus
          disabled={pending}
        />
      </Field>

      <Field label="Password">
        <PasswordInput
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
          required
          disabled={pending}
        />
      </Field>

      <Button type="submit" disabled={pending} className="w-full py-2.5">
        {pending && <Spinner />}
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
