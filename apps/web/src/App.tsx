import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './routes/Login';
import { DashboardPage } from './routes/Dashboard';
import { MapPage } from './routes/Map';
import { VisitsPage } from './routes/Visits';
import { StrategiesPage } from './routes/Strategies';
import { UsersPage } from './routes/Users';
import { ClientsPage } from './routes/Clients';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/mapa" element={<MapPage />} />
        <Route path="/visitas" element={<VisitsPage />} />
        <Route path="/clientes" element={<ClientsPage />} />
        <Route path="/estrategias" element={<StrategiesPage />} />
        <Route path="/usuarios" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
