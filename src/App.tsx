import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/routing/ProtectedRoute';
import AdminRoute from '@/components/routing/AdminRoute';

import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import Tournaments from '@/pages/Tournaments';
import TournamentDetail from '@/pages/TournamentDetail';
import CreateTournament from '@/pages/CreateTournament';
import Teams from '@/pages/Teams';
import TeamDetail from '@/pages/TeamDetail';
import CreateTeam from '@/pages/CreateTeam';
import MatchDetail from '@/pages/MatchDetail';
import Profile from '@/pages/Profile';
import News from '@/pages/News';
import NewsArticlePage from '@/pages/NewsArticle';
import Search from '@/pages/Search';
import R6 from '@/pages/games/R6';
import Valorant from '@/pages/games/Valorant';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import NotFound from '@/pages/NotFound';

const App = () => (
  <ErrorBoundary>
    <ToastProvider>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route
              path="/tournaments/create"
              element={
                <AdminRoute>
                  <CreateTournament />
                </AdminRoute>
              }
            />
            <Route
              path="/tournaments/:id/edit"
              element={
                <AdminRoute>
                  <CreateTournament />
                </AdminRoute>
              }
            />

            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route
              path="/teams/create"
              element={
                <ProtectedRoute>
                  <CreateTeam />
                </ProtectedRoute>
              }
            />

            <Route path="/matches/:id" element={<MatchDetail />} />
            <Route path="/profile/:id" element={<Profile />} />

            <Route path="/news" element={<News />} />
            <Route path="/news/:id" element={<NewsArticlePage />} />

            <Route path="/games/r6" element={<R6 />} />
            <Route path="/games/valorant" element={<Valorant />} />

            <Route path="/search" element={<Search />} />

            <Route
              path="/admin/*"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </ToastProvider>
  </ErrorBoundary>
);

export default App;
