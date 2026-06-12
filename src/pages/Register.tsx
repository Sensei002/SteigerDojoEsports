import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { registerWithEmail, loginWithGoogle } from '@/services/authService';
import { authErrorMessage, slugify } from '@/utils/helpers';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';

const Register = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return error('Passwords do not match.');
    if (password.length < 6) return error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await registerWithEmail(email, password, slugify(username));
      success('Account created. Welcome!');
      navigate('/');
    } catch (err) {
      const e2 = err as { code: string; message?: string };
      error(e2.code === 'app/username-taken' ? e2.message! : authErrorMessage(e2.code));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      success('Signed in with Google.');
      navigate('/');
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
          <h1 className="heading-display mb-1 text-2xl text-white">Create account</h1>
          <p className="mb-6 text-sm text-brand-gray">Join the SteigerDojo competitive community.</p>

          <form onSubmit={submit} className="space-y-4">
            <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ProGamer123" required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
            <Button type="submit" fullWidth loading={loading}>Create account</Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-brand-gray">
            <span className="h-px flex-1 bg-brand-border" /> OR <span className="h-px flex-1 bg-brand-border" />
          </div>

          <Button variant="secondary" fullWidth leftIcon={<FcGoogle size={18} />} onClick={google} disabled={loading}>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-brand-gray">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-red hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
