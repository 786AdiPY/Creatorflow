import { Route, Routes } from 'react-router-dom';

import Landing from './pages/Landing';
import Studio from './pages/Studio';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/studio" element={<Studio />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
