import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Suspense, lazy, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import api from './lib/api';
import { setActiveCurrency } from './lib/utils';
import Layout from './components/layout/Layout';

const Login = lazy(() => import('./pages/Login'));
const Landing = lazy(() => import('./pages/landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const Bookings = lazy(() => import('./pages/Bookings'));
const BookingDetail = lazy(() => import('./pages/BookingDetail'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Equipment = lazy(() => import('./pages/Equipment'));
const Invoices = lazy(() => import('./pages/Invoices'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const Payments = lazy(() => import('./pages/Payments'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  const { i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('accessToken')
  );
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Load studio currency once per authenticated session
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setBootstrapped(false);
    api
      .get('/settings/studio')
      .then((res) => {
        if (cancelled) return;
        const grouped = res.data?.data || {};
        const flat: Record<string, string> = {};
        for (const cat of Object.values(grouped)) {
          if (cat && typeof cat === 'object') {
            for (const [k, v] of Object.entries(cat as Record<string, string>)) {
              flat[k] = String(v ?? '');
            }
          }
        }
        if (flat['studio.currency']) setActiveCurrency(flat['studio.currency']);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBootstrapped(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Listen for auth changes (cross-tab)
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(!!localStorage.getItem('accessToken'));
    };
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Listen for same-tab logout
  useEffect(() => {
    const onLogout = () => setIsAuthenticated(false);
    window.addEventListener('auth-logout', onLogout);
    return () => window.removeEventListener('auth-logout', onLogout);
  }, []);

  if (!isAuthenticated) {
    return (
      <Suspense
        fallback={
          <div className="grid min-h-screen place-items-center bg-slate-950">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (!bootstrapped) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <Layout>
      <Suspense
        fallback={
          <div className="grid min-h-[50vh] place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/:id" element={<BookingDetail />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<Users />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
