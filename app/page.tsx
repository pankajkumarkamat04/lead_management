import { redirect } from 'next/navigation';

export default function Home() {
  // The dashboard is the whole product; `proxy.ts` sends signed-out visitors on
  // to the login screen from here.
  redirect('/dashboard');
}
