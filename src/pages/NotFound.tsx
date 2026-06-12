import { Link } from 'react-router-dom';
import { FiHome } from 'react-icons/fi';
import Button from '@/components/ui/Button';

const NotFound = () => (
  <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
    <p className="heading-display text-7xl font-bold text-brand-red">404</p>
    <h1 className="heading-display text-2xl text-white">Page not found</h1>
    <p className="max-w-sm text-sm text-brand-gray">
      The page you're looking for doesn't exist or has been moved.
    </p>
    <Link to="/"><Button leftIcon={<FiHome />}>Back home</Button></Link>
  </div>
);

export default NotFound;
