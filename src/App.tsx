import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import MapApplication from './pages/MapApplication';
import ErrorBoundary from './components/ErrorBoundary';
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<MapApplication />} />
        <Route path="/about" element={<Landing />} />
        <Route path="/map" element={<MapApplication />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="*" element={<MapApplication />} />
      </Routes>
    </ErrorBoundary>
  );
}
