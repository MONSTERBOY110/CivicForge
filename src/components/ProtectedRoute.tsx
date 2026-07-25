import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('citizen' | 'developer' | 'mp')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAF6ED]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#3F6C51] border-t-transparent rounded-full animate-spin" id="loader-spinner"></div>
          <p className="text-[#9A8C7F] font-bold">Securing session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to default page based on actual role
    if (user.role === 'citizen') return <Navigate to="/citizen/dashboard" replace />;
    if (user.role === 'developer') return <Navigate to="/developer/dashboard" replace />;
    if (user.role === 'mp') return <Navigate to="/mp/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
