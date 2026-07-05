import { useState } from 'react';
import { User, Lock, Eye, EyeOff, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { UserSession } from '../types';

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json() as { error?: string; token?: string; user?: { email: string } };

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      if (isLogin) {
        if (data.token && data.user) {
          onLoginSuccess({
            email: data.user.email,
            token: data.token
          });
        } else {
          throw new Error('Invalid server response.');
        }
      } else {
        setSuccessMessage('Account created successfully! You can now log in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfaf7] bg-[radial-gradient(#e2d6c9_1px,transparent_1px)] [background-size:24px_24px] px-4">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#dfa283]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-2xl shadow-xl relative overflow-hidden bg-white/90">
        {/* Top Decorative bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#dfa283] via-[#e5bda7] to-[#d7c9e3]" />
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#dfa283]/10 text-[#dfa283] border border-[#dfa283]/20 mb-4">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#3c2f2f]">Avery Label Studio Pro</h1>
          <p className="text-xs text-[#6d5c5a] mt-2">
            {isLogin ? 'Log in to sync your labels & background images' : 'Create an account to save your customized templates'}
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3 mb-5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 mb-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#6d5c5a]">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#9e8b89]">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#3c2f2f] placeholder-[#9e8b89] focus:outline-none focus:ring-2 focus:ring-[#dfa283]/50 focus:border-[#dfa283] transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#6d5c5a]">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#9e8b89]">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#faf6f2] border border-[#e2d6c9] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#3c2f2f] placeholder-[#9e8b89] focus:outline-none focus:ring-2 focus:ring-[#dfa283]/50 focus:border-[#dfa283] transition-all"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9e8b89] hover:text-[#6d5c5a] transition-colors cursor-pointer"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#dfa283] hover:bg-[#d48e6c] active:bg-[#c97d5b] text-white font-medium py-3 rounded-xl shadow-lg shadow-[#dfa283]/10 hover:shadow-[#dfa283]/20 text-sm tracking-wide transition-all duration-200 mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4" /> Log In
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" /> Create Account
              </>
            )}
          </button>
        </form>

        {/* Form Toggle */}
        <div className="mt-6 pt-6 border-t border-[#e2d6c9]/80 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccessMessage(null);
              setPassword('');
            }}
            className="text-xs text-[#dfa283] hover:text-[#d48e6c] font-medium transition-colors cursor-pointer"
            disabled={loading}
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
}
