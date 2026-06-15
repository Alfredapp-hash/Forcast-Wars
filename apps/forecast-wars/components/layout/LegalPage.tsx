import Link from "next/link";

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <article className="max-w-3xl mx-auto px-4 py-16 space-y-6 text-white/75 leading-relaxed">
      <Link href="/" className="text-sm text-white/50 hover:text-white">
        ← Back to Forecast Wars
      </Link>
      <h1 className="text-3xl font-bold text-white">{title}</h1>
      <div className="space-y-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:text-white/70 [&_a]:text-cyan-400 [&_a]:hover:underline">
        {children}
      </div>
    </article>
  );
}
