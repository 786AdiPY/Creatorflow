import { Route, Routes } from 'react-router-dom';

import Landing from './pages/Landing';
import Library from './pages/Library';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/library" element={<Library />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
