import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Phone, MapPin, Landmark, Cpu, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'citizen' | 'developer' | 'mp'>('citizen');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', role);
    return () => {
      if (!localStorage.getItem('token')) {
        document.documentElement.setAttribute('data-theme', 'citizen');
      }
    };
  }, [role]);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PASSWORD_REGEX = /^\d{6}$/;
  const PHONE_REGEX = /^\d{10}$/;

  const validateEmail = (value: string) => EMAIL_REGEX.test(value.trim());
  const validatePassword = (value: string) => PASSWORD_REGEX.test(value.trim());
  const validatePhone = (value: string) => PHONE_REGEX.test(value.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const normalizedPhone = phone.trim();
    const normalizedRegion = region.trim();

    if (normalizedName.length < 2) { setError('Please enter your full name.'); return; }
    if (!validateEmail(normalizedEmail)) { setError('Please enter a valid email address.'); return; }
    if (!validatePassword(normalizedPassword)) { setError('Password must be exactly 6 numeric digits.'); return; }
    if (!validatePhone(normalizedPhone)) { setError('Phone number must be exactly 10 numeric digits.'); return; }
    if (!normalizedRegion) { setError('Please enter your region, ward, or constituency.'); return; }

    setIsSubmitting(true);

    try {
      await register({ name: normalizedName, email: normalizedEmail, password: normalizedPassword, role, phone: normalizedPhone, region: normalizedRegion });
      toast.success('Registration successful! Welcome to CivicForge.');
      
      if (role === 'citizen') navigate('/citizen/dashboard');
      else if (role === 'developer') navigate('/developer/dashboard');
      else if (role === 'mp') navigate('/mp/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Try using a unique email address.');
      toast.error('Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] theme-bg-canvas theme-text-main flex flex-col justify-center items-center px-4 py-12 transition-colors duration-500" id="register-page">
      <div className="w-full max-w-xl neumorphic-convex rounded-4xl p-8 space-y-6 relative transition-all duration-500">
        
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight theme-text-main">Create Account</h2>
          <p className="text-xs theme-text-muted mt-1 font-bold uppercase tracking-wider">Join the CivicForge platform</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-500 text-xs px-4 py-3 rounded-xl border border-red-500/20 font-bold" id="register-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            <div className="space-y-2">
              <label htmlFor="register-name" className="text-[10px] font-black uppercase tracking-wider theme-text-muted">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 theme-text-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priyan Sen"
                  autoComplete="name"
                  id="register-name"
                  className="w-full neumorphic-concave pl-10 pr-4 py-3 text-sm text-(--text-main) placeholder:text-(--text-muted) placeholder:opacity-60 font-medium focus:ring-1 focus:ring-(--accent-primary) transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="register-email" className="text-[10px] font-black uppercase tracking-wider theme-text-muted">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 theme-text-muted">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  autoComplete="email"
                  id="register-email"
                  className="w-full neumorphic-concave pl-10 pr-4 py-3 text-sm text-(--text-main) placeholder:text-(--text-muted) placeholder:opacity-60 font-medium focus:ring-1 focus:ring-(--accent-primary) transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="register-password" className="text-[10px] font-black uppercase tracking-wider theme-text-muted">Password</label>
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
                  autoComplete="new-password"
                  id="register-password"
                  className="w-full neumorphic-concave pl-10 pr-4 py-3 text-sm text-(--text-main) placeholder:text-(--text-muted) placeholder:opacity-60 font-medium focus:ring-1 focus:ring-(--accent-primary) transition-all"
                />
              </div>
            </div>

            {/* FIXED ACCOUNT ROLE TOGGLE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider theme-text-muted">Account Role</label>
              <div className="flex items-center justify-around neumorphic-concave p-1 rounded-2xl w-full overflow-hidden">
                
                {/* Citizen Button */}
                <button
                  type="button"
                  onClick={() => setRole('citizen')}
                  className={`group flex items-center justify-center py-2.5 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
                    role === 'citizen' ? 'neumorphic-convex text-(--accent-primary)' : 'text-(--text-muted) opacity-70 hover:opacity-100 hover:text-(--text-main)'
                  }`}
                >
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-24 group-hover:opacity-100 text-[10px] font-black uppercase tracking-wider">
                    Citizen
                  </span>
                </button>

                {/* Developer Button */}
                <button
                  type="button"
                  onClick={() => setRole('developer')}
                  className={`group flex items-center justify-center py-2.5 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
                    role === 'developer' ? 'neumorphic-convex text-(--accent-primary)' : 'text-(--text-muted) opacity-70 hover:opacity-100 hover:text-(--text-main)'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 shrink-0" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-24 group-hover:opacity-100 text-[10px] font-black uppercase tracking-wider">
                    Developer
                  </span>
                </button>

                {/* Evaluator Button */}
                <button
                  type="button"
                  onClick={() => setRole('mp')}
                  className={`group flex items-center justify-center py-2.5 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
                    role === 'mp' ? 'neumorphic-convex text-(--accent-primary)' : 'text-(--text-muted) opacity-70 hover:opacity-100 hover:text-(--text-main)'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5 shrink-0" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-24 group-hover:opacity-100 text-[10px] font-black uppercase tracking-wider">
                    Evaluator
                  </span>
                </button>
              </div>
            </div>            
            {/* END FIXED ACCOUNT ROLE TOGGLE */}
            
            <div className="space-y-2">
              <label htmlFor="register-region" className="text-[10px] font-black uppercase tracking-wider theme-text-muted">Region / Constituency</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 theme-text-muted">
                  <MapPin className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Kolkata South"
                  className="w-full neumorphic-concave pl-10 pr-4 py-3 text-sm text-(--text-main) placeholder:text-(--text-muted) placeholder:opacity-60 font-medium focus:ring-1 focus:ring-(--accent-primary) transition-all"
                  id="register-region"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="register-phone" className="text-[10px] font-black uppercase tracking-wider theme-text-muted">Phone Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 theme-text-muted">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit number"
                  maxLength={10}
                  inputMode="numeric"
                  pattern="\d{10}"
                  className="w-full neumorphic-concave pl-10 pr-4 py-3 text-sm text-(--text-main) placeholder:text-(--text-muted) placeholder:opacity-60 font-medium focus:ring-1 focus:ring-(--accent-primary) transition-all"
                  id="register-phone"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full neumorphic-btn-accent py-4 px-4 font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-2 disabled:opacity-50 mt-6 rounded-2xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create CivicForge Account</span>
            )}
          </button>
        </form>

        <div className="text-center pt-3 border-t border-black/5 dark:border-white/5 mt-6">
          <p className="text-xs theme-text-muted font-bold">
            Already have an account?{' '}
            <Link to="/login" className="text-(--accent-primary) hover:underline font-black">
              Sign in here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};