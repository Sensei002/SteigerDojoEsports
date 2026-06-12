import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

/** App shell: sticky navbar + page content + footer. */
const Layout = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen flex-col bg-brand-black">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

export default Layout;
