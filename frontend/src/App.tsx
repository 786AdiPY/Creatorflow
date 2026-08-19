import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import Landing from './pages/Landing';
import Library from './pages/Library';
import NotFound from './pages/NotFound';

// Pulls in three.js + postprocessing (~1.5MB) — code-split so / and
// /library never pay for it.
const Orbit = lazy(() => import('./pages/Orbit'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/library" element={<Library />} />
      <Route
        path="/orbit"
        element={
          <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#07050a' }} />}>
            <Orbit />
          </Suspense>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
