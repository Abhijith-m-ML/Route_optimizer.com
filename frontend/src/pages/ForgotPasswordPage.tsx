import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Compass, 
  Mail, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Send
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { resetPassword, isConfigured, formatAuthError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(email.trim());
      setIsSuccess(true);
    } catch (err) {
      // For security, if error is auth/user-not-found, we still show success
      // so attackers cannot enumerate valid user email addresses
      const firebaseError = err as { code?: string };
      if (firebaseError?.code === 'auth/user-not-found') {
        setIsSuccess(true);
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-radial from-indigo-900/20 via-blue-950/10 to-transparent blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="flex items-center space-x-2.5 group mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-xl shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Compass className="w-6 h-6 text-cyan-400 group-hover:rotate-45 transition-transform duration-500" />
              </div>
            </div>
            <div className="text-left">
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                RouteWise
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider ml-1.5 px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Mumbai
              </span>
            </div>
          </Link>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Reset your password
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
            Enter your registered email and we'll send you a recovery link.
          </p>
        </div>

        {/* Configuration Notice */}
        {!isConfigured && (
          <div className="mt-6 bg-amber-950/40 border border-amber-500/40 rounded-2xl p-3.5 text-xs text-amber-200/90 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-amber-300">Firebase Setup Notice: </span>
              Live Firebase credentials are not yet configured in <code className="bg-amber-900/60 px-1 py-0.5 rounded text-[11px] text-amber-100 font-mono">frontend/.env</code>.
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="mt-6 bg-slate-900/90 backdrop-blur-xl py-8 px-6 sm:px-8 border border-slate-800 rounded-3xl shadow-2xl">
          {isSuccess ? (
            <div className="text-center py-3 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Password Reset Email Sent</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                If an account exists for <strong className="text-white">{email}</strong>, we've sent password reset instructions to your inbox. Please also check your spam or promotions folder.
              </p>
              <div className="pt-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="bg-rose-950/60 border border-rose-500/50 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Your Account Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="name@example.com"
                    className="w-full bg-slate-950/80 text-sm text-slate-100 placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 border border-slate-700/80 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white py-2.5 px-4 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all duration-200 border border-indigo-400/20 disabled:opacity-70 disabled:cursor-not-allowed pt-2.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
