import React, { useEffect } from 'react';
// 1. Swapped HashRouter to MemoryRouter to completely hide URL paths
import { MemoryRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CitizenDashboard } from './pages/citizen/CitizenDashboard';
import { SolutionFeed } from './pages/citizen/SolutionFeed';
import { DeveloperDashboard } from './pages/developer/DeveloperDashboard';
import { ProblemFeed } from './pages/developer/ProblemFeed';
import { DeveloperLeaderboard } from './pages/developer/DeveloperLeaderboard';
import { MPDashboard } from './pages/mp/MPDashboard';
import { Toaster } from 'react-hot-toast';

// New Component to handle dynamic theme injection
const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  useEffect(() => {
    // Determine theme based on role, default to citizen (light mint green)
    const activeTheme = user?.role === 'developer' ? 'developer' : user?.role === 'mp' ? 'mp' : 'citizen';
    
    // Inject theme token into the HTML document root
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, [user]);

  return (
    <div className="min-h-screen theme-bg-canvas flex flex-col font-sans transition-colors duration-500" id="app-root-container">
      {children}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeWrapper>
          <Navbar />
          
          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Citizen Only Routes */}
              <Route 
                path="/citizen/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['citizen']}>
                    <CitizenDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/feed/solutions" 
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'developer']}>
                    <SolutionFeed />
                  </ProtectedRoute>
                } 
              />

              {/* Developer Only Routes */}
              <Route 
                path="/developer/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['developer']}>
                    <DeveloperDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/feed/problems" 
                element={
                  <ProtectedRoute allowedRoles={['developer']}>
                    <ProblemFeed />
                  </ProtectedRoute>
                } 
              />

              {/* MP Evaluator Only Routes */}
              <Route 
                path="/mp/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['mp']}>
                    <MPDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Public/Shared Routes for Authenticated Users */}
              <Route 
                path="/leaderboard" 
                element={
                  <ProtectedRoute allowedRoles={['citizen', 'developer', 'mp']}>
                    <DeveloperLeaderboard />
                  </ProtectedRoute>
                } 
              />

              {/* Fallback Catch All */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Toast Notification Provider - Uses Dynamic Theme Variables */}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              className: 'text-xs font-bold theme-text-main theme-bg-card rounded-xl shadow-lg p-4 border border-white/5',
              duration: 4000,
              success: {
                iconTheme: {
                  primary: 'var(--accent-primary)',
                  secondary: 'var(--bg-canvas)'
                }
              },
              error: {
                iconTheme: {
                  primary: '#E76F51',
                  secondary: '#FFFFFF'
                }
              }
            }}
          />
        </ThemeWrapper>
      </AuthProvider>
    </Router>
  );
}