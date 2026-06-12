import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { loginWithEmail, loginWithGoogle } from '@/services/authService';
import { authErrorMessage } from '@/utils/helpers';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Logo from '@/components/ui/Logo';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error } = useToast();
  const from = (location.state as { from?: string })?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      error(authErrorMessage((err as { code: string }).code));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      success('Signed in with Google.');
      navigate(from, { replace: true });
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
          <h1 className="heading-display mb-1 text-2xl text-white">Sign in</h1>
          <p className="mb-6 text-sm text-brand-gray">Compete, organize and climb the ranks.</p>

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-brand-red hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" fullWidth loading={loading}>Sign in</Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-brand-gray">
            <span className="h-px flex-1 bg-brand-border" /> OR <span className="h-px flex-1 bg-brand-border" />
          </div>

          <Button variant="secondary" fullWidth leftIcon={<FcGoogle size={18} />} onClick={google} disabled={loading}>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-brand-gray">
            No account?{' '}
            <Link to="/register" className="font-semibold text-brand-red hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
