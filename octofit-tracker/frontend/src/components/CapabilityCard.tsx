import type { ReactNode } from 'react';

type Props = { title: string; description: string; children?: ReactNode; loading?: boolean; error?: string; empty?: boolean; emptyText?: string };
export function CapabilityCard({ title, description, children, loading, error, empty, emptyText }: Props) {
  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {loading && <p role="status">Loading {title.toLowerCase()}...</p>}
        {error && <p role="alert">Unable to load {title.toLowerCase()}: {error}</p>}
        {!loading && !error && empty && <p>{emptyText}</p>}
        {!loading && !error && !empty && children}
      </div>
    </section>
  );
}
