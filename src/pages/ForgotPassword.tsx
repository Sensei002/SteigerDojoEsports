import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '@/services/authService';
import { authErrorMessage } from '@/utils/helpers';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';

const ForgotPassword = () => {
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      success('Reset link sent! Check your inbox.');
    } catch (err) {
      error(authErrorMessage((err as { code: string }).code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link to="/"><Logo size={48} /></Link>
        </div>
        <div className="card-surface p-8">
          <h1 className="heading-display mb-1 text-2xl text-white">Reset password</h1>
          <p className="mb-6 text-sm text-brand-gray">
            Enter your email and we'll send you a reset link.
          </p>
          {sent ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              A password reset email has been sent to <strong>{email}</strong>.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              <Button type="submit" fullWidth loading={loading}>Send reset link</Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-brand-gray">
            <Link to="/login" className="font-semibold text-brand-red hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
