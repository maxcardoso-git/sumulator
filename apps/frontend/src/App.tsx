import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { ChatSimulatorPage } from './pages/ChatSimulator';
import { FormsPage } from './pages/Forms';
import { DataGeneratorPage } from './pages/DataGenerator';
import { SemanticDomainPage } from './pages/SemanticDomain';
import { SimulatedApisPage } from './pages/SimulatedApis';
import { ObservabilityPage } from './pages/Observability';
import { EnvironmentsPage } from './pages/Environments';
import { ScenariosPage } from './pages/Scenarios';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="chat" element={<ChatSimulatorPage />} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="data-generator" element={<DataGeneratorPage />} />
        <Route path="semantic-domain" element={<SemanticDomainPage />} />
        <Route path="simulated-apis" element={<SimulatedApisPage />} />
        <Route path="observability" element={<ObservabilityPage />} />
        <Route path="environments" element={<EnvironmentsPage />} />
        <Route path="scenarios" element={<ScenariosPage />} />
      </Route>
    </Routes>
  );
}
