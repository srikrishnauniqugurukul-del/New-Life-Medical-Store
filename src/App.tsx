import React from 'react';
import { AppProvider, useApp } from './hooks/useAppContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ServicesPage } from './pages/ServicesPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { BookingPage } from './pages/BookingPage';
import { GalleryPage } from './pages/GalleryPage';
import { ContactPage } from './pages/ContactPage';
import { PolicyPage } from './pages/PolicyPage';
import { AdminLoginPage } from './admin/AdminLoginPage';
import { AdminDashboard } from './admin/AdminDashboard';

function RouterView() {
  const { path } = useApp();

  // Separate Admin Portal routes (no public header/footer clutter)
  if (path === '/admin/login') {
    return <AdminLoginPage />;
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <AdminDashboard />;
  }

  const renderPublicPage = () => {
    switch (path) {
      case '/':
        return <HomePage />;
      case '/about':
        return <AboutPage />;
      case '/services':
        return <ServicesPage />;
      case '/doctors':
        return <DoctorsPage />;
      case '/diagnostics':
        return <DiagnosticsPage />;
      case '/book':
        return <BookingPage />;
      case '/gallery':
        return <GalleryPage />;
      case '/contact':
        return <ContactPage />;
      case '/privacy':
        return <PolicyPage type="privacy" />;
      case '/terms':
        return <PolicyPage type="terms" />;
      case '/booking-policy':
        return <PolicyPage type="booking" />;
      case '/cancellation-policy':
        return <PolicyPage type="cancellation" />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#26352E]">
      <Header />
      <main className="flex-1">{renderPublicPage()}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <RouterView />
      <ToastContainer />
    </AppProvider>
  );
}
