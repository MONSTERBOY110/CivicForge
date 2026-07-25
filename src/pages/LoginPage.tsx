import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Landmark, User, Cpu, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PASSWORD_REGEX = /^\d{6}$/;

  const validateEmail = (value: string) => EMAIL_REGEX.test(value.trim());
  const validatePassword = (value: string) => PASSWORD_REGEX.test(value.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!validateEmail(normalizedEmail)) { setError('Please enter a valid email address.'); return; }
    if (!validatePassword(normalizedPassword)) { setError('Password must be exactly 6 numeric digits.'); return; }

    setIsSubmitting(true);

    try {
      const response = await login(normalizedEmail, normalizedPassword);
      toast.success(`Welcome back, ${response.user.name}!`);
      
      if (response.user.role === 'citizen') navigate('/citizen/dashboard');
      else if (response.user.role === 'developer') navigate('/developer/dashboard');
      else if (response.user.role === 'mp') navigate('/mp/dashboard');
      else navigate('/');
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password.');
      toast.error('Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await login(demoEmail, '123456');
      toast.success(`Logged in as demo ${response.user.role}: ${response.user.name}`);
      
      if (response.user.role === 'citizen') navigate('/citizen/dashboard');
      else if (response.user.role === 'developer') navigate('/developer/dashboard');
      else if (response.user.role === 'mp') navigate('/mp/dashboard');
    } catch (err: any) {
      setError(err.message || 'Seeded user login failed. Please verify seed script status.');
      toast.error('Quick Login Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] theme-bg-canvas theme-text-main flex flex-col justify-center items-center px-4 py-12 transition-colors duration-500" id="login-page">
      <div className="w-full max-w-md neumorphic-convex rounded-4xl p-8 space-y-6 relative transition-all duration-500">
        
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight theme-text-main">Sign In</h2>
          <p className="text-xs theme-text-muted mt-1 font-bold uppercase tracking-wider">Access your CivicForge bento portal</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-500 text-xs px-4 py-3 rounded-xl border border-red-500/20 font-bold" id="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <label htmlFor="login-email" className="text-[10px] font-black uppercase tracking-wider theme-text-muted">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 theme-text-muted">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                autoComplete="email"
                className="w-full neumorphic-concave pl-10 pr-4 py-3 text-sm text-(--text-main) placeholder:text-(--text-muted) placeholder:opacity-60 font-medium focus:ring-1 focus:ring-(--accent-primary) transition-all"
                id="login-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="text-[10px] font-black uppercase tracking-wider theme-text-muted">Security Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 theme-text-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
                pattern="\d{6}"
                autoComplete="current-password"
                className="w-full neumorphic-concave pl-10 pr-4 py-3 text-sm text-(--text-main) placeholder:text-(--text-muted) placeholder:opacity-60 font-medium focus:ring-1 focus:ring-(--accent-primary) transition-all"
                id="login-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full neumorphic-btn-accent rounded-2xl py-4 px-4 font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 mt-6 disabled:opacity-50"
            id="login-submit-btn"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In Securely</span>
            )}
          </button>
        </form>

        <div className="text-center pt-3 border-t border-black/5 dark:border-white/5 mt-6">
          <p className="text-xs theme-text-muted font-bold">
            Don't have an account?{' '}
            <Link to="/register" className="text-(--accent-primary) hover:underline font-black">
              Register now
            </Link>
          </p>
        </div>

        {/* Demo Fast Login Panel */}
        <div className="border-t border-black/10 dark:border-white/10 pt-5 space-y-4 mt-6">
          <div className="flex items-center space-x-2 justify-center">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest theme-text-muted">Demo Fast Ingress Login</span>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs">
            <button
              onClick={() => handleQuickLogin('mp@civicforge.in')}
              disabled={isSubmitting}
              className="flex items-center justify-between neumorphic-convex p-3.5 rounded-2xl transition-all text-left cursor-pointer hover:brightness-105 disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 neumorphic-concave rounded-xl">
                  <Landmark className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="font-black theme-text-main text-sm">Amit Roy</p>
                  <p className="text-[10px] theme-text-muted font-bold mt-0.5">Cabinet evaluation & budget</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase bg-red-500/10 text-red-500 px-3 py-1 rounded-md border border-red-500/20">MP</span>
            </button>

            <button
              onClick={() => handleQuickLogin('citizen1@gmail.com')}
              disabled={isSubmitting}
              className="flex items-center justify-between neumorphic-convex p-3.5 rounded-2xl transition-all text-left cursor-pointer hover:brightness-105 disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 neumorphic-concave rounded-xl">
                  <User className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-black theme-text-main text-sm">Vikram Chatterjee</p>
                  <p className="text-[10px] theme-text-muted font-bold mt-0.5">Citizen lodging demands</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase bg-blue-500/10 text-blue-500 px-3 py-1 rounded-md border border-blue-500/20">Citizen</span>
            </button>

            <button
              onClick={() => handleQuickLogin('dev1@gmail.com')}
              disabled={isSubmitting}
              className="flex items-center justify-between neumorphic-convex p-3.5 rounded-2xl transition-all text-left cursor-pointer hover:brightness-105 disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 neumorphic-concave rounded-xl">
                  <Cpu className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="font-black theme-text-main text-sm">TechForge (Arijit)</p>
                  <p className="text-[10px] theme-text-muted font-bold mt-0.5">Developer building prototypes</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-md border border-emerald-500/20">Dev</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};