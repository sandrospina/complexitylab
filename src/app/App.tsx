import { Suspense } from 'react';
import { useAppStore } from '../store/app';
import { ROUTES } from './routes';

export function App() {
  const moduleId = useAppStore((s) => s.moduleId);
  const navigate = useAppStore((s) => s.navigate);
  const route = ROUTES.find((r) => r.id === moduleId) ?? ROUTES[0]!;
  const Module = route.component;

  return (
    <>
      <header className="app-header">
        <h1>Complexity Lab</h1>
        <nav aria-label="Modules">
          {ROUTES.map((r) => (
            <button
              key={r.id}
              aria-current={r.id === route.id ? 'page' : undefined}
              onClick={() => navigate(r.id)}
            >
              {r.title}
            </button>
          ))}
        </nav>
      </header>
      <main>
        <Suspense fallback={<p className="muted">Loading…</p>}>
          <Module />
        </Suspense>
      </main>
    </>
  );
}
