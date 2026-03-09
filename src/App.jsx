import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BookingProvider } from './context/BookingContext';
import { ActivityLogProvider } from './context/ActivityLogContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppContextProvider } from './context/AppContext';
import DashboardPage from './pages/DashboardPage';
import BookingPage from './pages/BookingPage';
import SearchPage from './pages/SearchPage';
import MapView from './pages/MapView';
import LoginPage from './pages/LoginPage';
import LibraryDashboard from './pages/LibraryDashboard';
import ActivityLogPage from './pages/ActivityLogPage';
import OrgStatsPage from './pages/OrgStatsPage';
import StudentOrgDashboard from './pages/StudentOrgDashboard';
import { Toaster } from '@/components/ui/sonner';

// Protected Route Wrapper with optional role restriction
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Redirect to role-appropriate home
    if (currentUser.role === 'student') return <Navigate to="/library" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
};

// Routing helper: org → new UI, admin → old dashboard
const OrgOrAdminDashboard = () => {
  const { currentUser } = useAuth();
  if (currentUser?.role === 'org') return <StudentOrgDashboard />;
  return <DashboardPage />;
};

function App() {
  return (
    <AuthProvider>
      <ActivityLogProvider>
        <BookingProvider>
          <AppContextProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<LoginPage />} />

                {/* Event space dashboard — org uses new UI, admin keeps old */}
                <Route path="/" element={<ProtectedRoute allowedRoles={['org', 'admin']}><OrgOrAdminDashboard /></ProtectedRoute>} />
                <Route path="/book" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
                <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
                <Route path="/map" element={<ProtectedRoute allowedRoles={['org', 'admin']}><MapView /></ProtectedRoute>} />

                {/* Library dashboard — student + admin */}
                <Route path="/library" element={<ProtectedRoute allowedRoles={['student', 'admin']}><LibraryDashboard /></ProtectedRoute>} />

                {/* Activity log — admin only */}
                <Route path="/activity-log" element={<ProtectedRoute allowedRoles={['admin']}><ActivityLogPage /></ProtectedRoute>} />
                <Route path="/org-stats" element={<ProtectedRoute allowedRoles={['admin']}><OrgStatsPage /></ProtectedRoute>} />
              </Routes>
            </Router>
            <Toaster />
          </AppContextProvider>
        </BookingProvider>
      </ActivityLogProvider>
    </AuthProvider>
  );
}

export default App;
