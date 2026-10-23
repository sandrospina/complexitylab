import { Suspense } from 'react';
import { HOME, useAppStore } from '../store/app';
import { Home, SITE_TITLE } from './Home';
import { ROUTES } from './routes';

export function App() {
  const moduleId = useAppStore((s) => s.moduleId);
  const navigate = useAppStore((s) => s.navigate);
  const route = ROUTES.find((r) => r.id === moduleId);
  const Module = route?.component;

  return (
    <>
      <header className="app-header">
        <h1>{SITE_TITLE}</h1>
        <nav aria-label="Modules">
          <button className="home-button" aria-current={route ? undefined : 'page'} onClick={() => navigate(HOME)}>
            ⌂ Home
          </button>
          {ROUTES.map((r) => (
            <button
              key={r.id}
              aria-current={r.id === route?.id ? 'page' : undefined}
              onClick={() => navigate(r.id)}
            >
              {r.title}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {Module ? (
          <Suspense fallback={<p className="muted">Loading…</p>}>
            <Module />
          </Suspense>
        ) : (
          <Home onOpen={navigate} />
        )}
      </main>
    </>
  );
}
