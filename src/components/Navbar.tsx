import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  LogOut, 
  User, 
  Landmark, 
  Cpu,  
  PlusCircle, 
  Layers, 
  AlertTriangle, 
  Trophy,
  Hammer,
} from 'lucide-react';

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, label, icon, active }) => (
  <Link
    to={to}
    title={label}
    aria-label={label}
    className={`group flex h-10 items-center overflow-hidden rounded-xl px-3 transition-all duration-300 ease-out ${
      active
        ? `neumorphic-concave theme-accent font-bold`
        : `theme-text-muted hover:theme-text-main hover:bg-black/5`
    }`}
  >
    <span className="shrink-0">{icon}</span>
    <span className="max-w-0 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-wider opacity-0 transition-all duration-300 ease-out group-hover:ml-2 group-hover:max-w-36 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-36 group-focus-visible:opacity-100">
      {label}
    </span>
  </Link>
);

const FloatingTaskbarItem: React.FC<NavItemProps> = ({ to, label, icon, active }) => (
  <Link
    to={to}
    title={label}
    aria-label={label}
    className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center ${
      active
        ? `neumorphic-concave theme-accent shadow-inner scale-110`
        : `theme-text-muted hover:theme-text-main hover:bg-black/5`
    }`}
  >
    {icon}
  </Link>
);

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    toast.loading('Logging out...', {
      id: 'logout-status',
      position: 'bottom-right',
      className: 'text-xs font-bold theme-text-main theme-bg-card rounded-xl shadow-lg p-4',
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    await logout();
    navigate('/login');
    toast.dismiss('logout-status');
    setIsLoggingOut(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'mp':
        return <Landmark className="w-4 h-4 theme-accent" />;
      case 'developer':
        return <Cpu className="w-4 h-4 theme-accent" />;
      default:
        return <User className="w-4 h-4 theme-accent" />;
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Top Desktop Navigation */}
      <nav className="theme-bg-canvas sticky top-0 z-40 pt-5 px-4 sm:px-6 lg:px-8 transition-colors duration-500" id="global-navbar">
        <div className="max-w-7xl mx-auto neumorphic-convex px-4 py-3 rounded-3xl">
          <div className="flex justify-between items-center h-11">
            
            {/* Logo & Brand */}
            <div className="flex items-center space-x-6">
              <Link to="/" className="flex items-center space-x-3 group">
                <div className="neumorphic-btn-accent p-2 rounded-[14px] flex items-center justify-center">
                  <Hammer className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-base font-black tracking-tight theme-text-main uppercase flex items-center">
                  CivicForge 
                </span>
              </Link>

              {/* Icon-based Desktop Navigation */}
              {user && (
                <div className="hidden lg:flex items-center space-x-2 border-l border-black/10 pl-4">
                  {user.role === 'citizen' && (
                    <NavItem to="/citizen/dashboard" label="Lodge Issue" icon={<PlusCircle className="w-5 h-5" />} active={isActive('/citizen/dashboard')} />
                  )}
                  {user.role === 'developer' && (
                    <NavItem to="/developer/dashboard" label="Workspace" icon={<Cpu className="w-5 h-5" />} active={isActive('/developer/dashboard')} />
                  )}
                  {user.role === 'mp' && (
                    <NavItem to="/mp/dashboard" label="Evaluation Room" icon={<Landmark className="w-5 h-5" />} active={isActive('/mp/dashboard')} />
                  )}

                  {(user.role === 'citizen' || user.role === 'developer') && (
                    <NavItem to="/feed/solutions" label="Solutions Feed" icon={<Layers className="w-5 h-5" />} active={isActive('/feed/solutions')} />
                  )}

                  {user.role === 'developer' && (
                    <NavItem to="/feed/problems" label="Civic Demands" icon={<AlertTriangle className="w-5 h-5" />} active={isActive('/feed/problems')} />
                  )}

                  <NavItem to="/leaderboard" label="Leaderboard" icon={<Trophy className="w-5 h-5" />} active={isActive('/leaderboard')} />
                </div>
              )}
            </div>

            {/* User Profile Info & Actions */}
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] theme-text-muted uppercase tracking-wider font-semibold">User Role</span>
                  <span className="text-xs font-black theme-text-main">{user.name}</span>
                </div>

                {/* Raised Role Pill */}
                <div className="flex items-center space-x-1 px-3 py-1.5 neumorphic-convex rounded-xl">
                  {getRoleIcon(user.role)}
                  <span className="text-[9px] font-black uppercase tracking-wider theme-text-main ml-1">
                    {user.role}
                  </span>
                </div>

                <div className="h-6 w-px bg-black/10"></div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center justify-center rounded-xl neumorphic-convex p-2.5 theme-text-muted hover:text-red-500 active:neumorphic-concave transition-all duration-200 disabled:opacity-50"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {/* INSET/CONCAVE SIGN IN */}
                <Link 
                  to="/login" 
                  className="text-[10px] font-black uppercase tracking-wider text-(--text-muted) hover:text-(--text-main) px-4 py-2.5 rounded-xl neumorphic-concave transition-all"
                >
                  Sign In
                </Link>
                
                {/* RAISED/CONVEX GET STARTED */}
                <Link 
                  to="/register" 
                  className="text-[10px] font-black uppercase tracking-wider text-emerald bg-(--accent-primary) px-5 py-2.5 rounded-xl neumorphic-concave hover:brightness-20 transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Floating Bottom Taskbar for Mobile (The "Capsule Pill") */}
      {user && (
        <div className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-sm">
          <div className="neumorphic-convex rounded-full p-2 flex items-center justify-around shadow-2xl border border-white/10 bg-opacity-90 backdrop-blur-md">
            
            {user.role === 'citizen' && (
              <FloatingTaskbarItem to="/citizen/dashboard" label="Lodge Issue" icon={<PlusCircle className="w-5 h-5" />} active={isActive('/citizen/dashboard')} />
            )}
            
            {user.role === 'developer' && (
              <>
                <FloatingTaskbarItem to="/developer/dashboard" label="Workspace" icon={<Cpu className="w-5 h-5" />} active={isActive('/developer/dashboard')} />
                <FloatingTaskbarItem to="/feed/problems" label="Demands Feed" icon={<AlertTriangle className="w-5 h-5" />} active={isActive('/feed/problems')} />
              </>
            )}
            
            {user.role === 'mp' && (
              <FloatingTaskbarItem to="/mp/dashboard" label="Evaluation" icon={<Landmark className="w-5 h-5" />} active={isActive('/mp/dashboard')} />
            )}

            {(user.role === 'citizen' || user.role === 'developer') && (
              <FloatingTaskbarItem to="/feed/solutions" label="Solutions Feed" icon={<Layers className="w-5 h-5" />} active={isActive('/feed/solutions')} />
            )}

            <FloatingTaskbarItem to="/leaderboard" label="Leaderboard" icon={<Trophy className="w-5 h-5" />} active={isActive('/leaderboard')} />
          </div>
        </div>
      )}
    </>
  );
};