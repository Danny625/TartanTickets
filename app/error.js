'use client';
export default function ErrorPage({ reset }) {
  return <main className="empty-state"><h1>We couldn’t load events.</h1><p>Please try again.</p><button onClick={reset}>Try again</button></main>;
}
