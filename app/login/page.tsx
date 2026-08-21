import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in · Lead Desk',
};

export default async function LoginPage(props: PageProps<'/login'>) {
  const params = await props.searchParams;
  const next = params.next;

  // Only accept internal paths so `?next=` cannot bounce users to another site.
  const raw = Array.isArray(next) ? next[0] : next;
  const redirectTo =
    raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';

  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      <section className="relative flex flex-col justify-between bg-slate-900 px-6 py-10 text-white lg:w-1/2 lg:px-14 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-1/3 size-96 rounded-full bg-brand-600/25 blur-3xl"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold">
            LD
          </span>
          <span className="text-lg font-semibold tracking-tight">Lead Desk</span>
        </div>

        <div className="relative mt-10 max-w-md lg:mt-0">
          <h1 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
            Every lead from every website, in one place.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Capture enquiries from all of your sites, route them to the right
            agent, and track each one from first contact through to closed.
          </p>

          <ul className="mt-7 space-y-2.5 text-sm text-slate-300">
            {[
              'Unlimited websites through one secure API key each',
              'Assign and reassign leads across your team',
              'Separate admin and agent permissions',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-10 text-xs text-slate-500 lg:mt-0">
          © {new Date().getFullYear()} Lead Desk
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12 lg:px-14">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Sign in
          </h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">
            Use the credentials your administrator gave you.
          </p>

          <LoginForm redirectTo={redirectTo} />
        </div>
      </section>
    </main>
  );
}
