import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-ink-soft">This admin page does not exist.</p>
      <Link href="/" className="mt-4 text-sm font-semibold text-accent underline underline-offset-4">
        Back to the dashboard
      </Link>
    </main>
  );
}
