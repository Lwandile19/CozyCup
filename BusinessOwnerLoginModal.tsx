import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { loginOwner, getStoredOwnerSession } from '../api';
import { loginOwnerWithFirebase, logoutOwnerFromFirebase } from '../firebase';

interface BusinessOwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: { email: string; name: string; token: string }) => void;
  onCustomerRedirect?: (message: string) => void;
}

const AUTHORIZED_OWNER_EMAILS = [
  'roseanemodise@gmail.com',
  'augustlionn1108@gmail.com'
];

export const BusinessOwnerLoginModal: React.FC<BusinessOwnerLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // If already logged in as owner, immediately redirect to dashboard
  useEffect(() => {
    if (isOpen) {
      const existing = getStoredOwnerSession();
      if (existing && existing.role === 'BUSINESS_OWNER') {
        onLoginSuccess(existing);
        onClose();
      }
    }
  }, [isOpen, onLoginSuccess, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      let authenticatedEmail = cleanEmail;
      let token = '';

      // 1. Attempt Firebase Auth first
      let fbSuccess = false;
      try {
        const fbResult = await loginOwnerWithFirebase(cleanEmail, cleanPassword);
        if (fbResult.user?.email) {
          authenticatedEmail = fbResult.user.email.toLowerCase().trim();
          token = fbResult.idToken;
          fbSuccess = true;
        }
      } catch (fbErr: any) {
        console.warn('Firebase authentication notice:', fbErr?.code || fbErr?.message);
      }

      // 2. Fallback to API login if Firebase didn't return a user
      if (!fbSuccess) {
        try {
          const res = await loginOwner(cleanEmail, cleanPassword);
          if (res.token) {
            authenticatedEmail = res.email.toLowerCase().trim();
            token = res.token;
          }
        } catch (apiErr: any) {
          console.warn('API authentication notice:', apiErr?.message);
        }
      }

      // 3. Mandatory Role Check: check authenticated user's email
      const isAuthorized = AUTHORIZED_OWNER_EMAILS.includes(authenticatedEmail);

      if (!isAuthorized) {
        await logoutOwnerFromFirebase();
        setErrorMsg('This email is not authorised for Business Owner access.');
        setIsLoading(false);
        return;
      }

      if (!token) {
        // If neither produced a token (e.g. invalid credentials)
        await logoutOwnerFromFirebase();
        setErrorMsg('Invalid email or password. Please verify your credentials.');
        setIsLoading(false);
        return;
      }

      // 4. Grant BUSINESS_OWNER access and immediately redirect to Owner Dashboard
      const displayName = authenticatedEmail.includes('roseane') ? 'Roseane Modise' : 'August Lionn';
      const session = {
        email: authenticatedEmail,
        name: displayName,
        token: token,
        role: 'BUSINESS_OWNER' as const,
        loginAt: new Date().toISOString()
      };

      setInfoMsg('Authentication successful. Redirecting to Owner Dashboard...');
      onLoginSuccess(session);
      onClose();
    } catch (err: any) {
      await logoutOwnerFromFirebase();
      const rawMsg = err.message || '';
      if (
        rawMsg.includes('not authorised') ||
        rawMsg.includes('not authorized') ||
        rawMsg.includes('Access denied')
      ) {
        setErrorMsg('This email is not authorised for Business Owner access.');
      } else {
        setErrorMsg(rawMsg || 'Authentication error. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#302A38]/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-[#EDE7F8] shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#EDE7F8] px-6 py-5 border-b border-[#B9A7E8]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6B4FA1] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#302A38]">Business Owner Login</h3>
              <p className="text-xs text-[#6B4FA1]">Authorised CozyCup Administration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#302A38]/60 hover:text-[#302A38] hover:bg-white/60 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Neutral, Professional Disclaimer */}
          <div className="p-3.5 bg-[#F8F6FC] rounded-xl border border-[#EDE7F8] text-xs text-[#302A38]/80 leading-relaxed flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[#6B4FA1] shrink-0 mt-0.5" />
            <p className="font-medium text-[#302A38]/90">
              Authorised personnel only. Please enter your Business Owner credentials to continue.
            </p>
          </div>

          {/* Email Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#302A38]">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6B4FA1] absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl pl-9 pr-3 py-2 text-sm text-[#302A38] focus:outline-none focus:ring-2 focus:ring-[#B9A7E8]/30 transition"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#302A38]">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#6B4FA1] absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[#F8F6FC] border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl pl-9 pr-3 py-2 text-sm text-[#302A38] focus:outline-none focus:ring-2 focus:ring-[#B9A7E8]/30 transition"
              />
            </div>
          </div>

          {/* Error & Info Feedback */}
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3 bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8] rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#302A38]/70 hover:text-[#302A38] hover:bg-[#EDE7F8] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Log In as Owner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
