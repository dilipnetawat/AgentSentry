import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { UIPreferencesProvider } from './contexts/UIPreferencesContext';
import { ToastProvider } from './contexts/ToastProvider';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Playground from './pages/Playground';
import HoneyTokens from './pages/HoneyTokens';
import ScanHistory from './pages/ScanHistory';
import SecurityActivity from './pages/SecurityActivity';
import HowItWorks from './pages/HowItWorks';
import UserGuide from './pages/UserGuide';
import Brain from './pages/Brain';
import Policies from './pages/Policies';
import Alerts from './pages/Alerts';

// Preserved routes for management and auth
import Agents from './pages/Agents';
import AgentDetails from './pages/AgentDetails';
import Login from './pages/Login';
import AccessDenied from './pages/AccessDenied';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <UIPreferencesProvider>
          <BrowserRouter>
            <Routes>
              {/* Public marketing page */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/403" element={<AccessDenied />} />

              {/* 10 Core Application Navigation Routes */}
              {/* 1. Overview */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/overview" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />

              {/* 2. Playground */}
              <Route path="/playground" element={<ProtectedRoute><Playground /></ProtectedRoute>} />

              {/* 3. Agents */}
              <Route path="/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
              <Route path="/agents/:id" element={<ProtectedRoute><AgentDetails /></ProtectedRoute>} />

              {/* 4. Activity */}
              <Route path="/activity" element={<ProtectedRoute><SecurityActivity /></ProtectedRoute>} />
              <Route path="/security-activity" element={<ProtectedRoute><SecurityActivity /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><SecurityActivity /></ProtectedRoute>} />

              {/* 5. Threats */}
              <Route path="/threats" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />

              {/* 6. Honey Tokens */}
              <Route path="/honeytokens" element={<ProtectedRoute><HoneyTokens /></ProtectedRoute>} />

              {/* 7. Scan History */}
              <Route path="/scan-history" element={<ProtectedRoute><ScanHistory /></ProtectedRoute>} />

              {/* 8. Policies */}
              <Route path="/policies" element={<ProtectedRoute><Policies /></ProtectedRoute>} />

              {/* 9. User Guide */}
              <Route path="/user-guide" element={<ProtectedRoute><UserGuide /></ProtectedRoute>} />
              <Route path="/guide" element={<ProtectedRoute><UserGuide /></ProtectedRoute>} />

              {/* 10. Brain */}
              <Route path="/brain" element={<ProtectedRoute><Brain /></ProtectedRoute>} />
              <Route path="/architecture" element={<ProtectedRoute><Brain /></ProtectedRoute>} />

              {/* Secondary Reference Flows */}
              <Route path="/how-it-works" element={<ProtectedRoute><HowItWorks /></ProtectedRoute>} />
              
              {/* Fallback route for 404 Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </UIPreferencesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
