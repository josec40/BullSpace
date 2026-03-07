import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BookingProvider } from './context/BookingContext';
import { ActivityLogProvider } from './context/ActivityLogContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardPage from './pages/DashboardPage';
import BookingPage from './pages/BookingPage';
import SearchPage from './pages/SearchPage';
import MapView from './pages/MapView';
import LoginPage from './pages/LoginPage';
import LibraryDashboard from './pages/LibraryDashboard';
import ActivityLogPage from './pages/ActivityLogPage';

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

function App() {
  return (
    <AuthProvider>
      <ActivityLogProvider>
        <BookingProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Event space dashboard — org + admin */}
              <Route path="/" element={<ProtectedRoute allowedRoles={['org', 'admin']}><DashboardPage /></ProtectedRoute>} />
              <Route path="/book" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
              <Route path="/map" element={<ProtectedRoute allowedRoles={['org', 'admin']}><MapView /></ProtectedRoute>} />

              {/* Library dashboard — student + admin */}
              <Route path="/library" element={<ProtectedRoute allowedRoles={['student', 'admin']}><LibraryDashboard /></ProtectedRoute>} />

              {/* Activity log — admin only */}
              <Route path="/activity-log" element={<ProtectedRoute allowedRoles={['admin']}><ActivityLogPage /></ProtectedRoute>} />
            </Routes>
          </Router>
        </BookingProvider>
      </ActivityLogProvider>
    </AuthProvider>
  );
}

export default App;
