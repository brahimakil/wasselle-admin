import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import PlanManagement from './components/plans/PlanManagement';
import PaymentManagement from './components/payments/PaymentManagement';
import PostManagement from './components/posts/PostManagement';
import CountryManagement from './components/countries/CountryManagement';
import NotificationManagement from './components/notifications/NotificationManagement';
import DriverManagement from './components/users/DriverManagement';
import RiderManagement from './components/users/RiderManagement';
import './App.css';

// Main Dashboard Layout
const DashboardLayout: React.FC = () => {
  // Get the saved page from localStorage, default to 'dashboard'
  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem('admin_active_page') || 'dashboard';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Save the active page to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('admin_active_page', activePage);
  }, [activePage]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard onPageChange={handlePageChange} />;
      case 'notifications':
        return <NotificationManagement />;
      case 'drivers':
        return <DriverManagement />;
      case 'riders':
        return <RiderManagement />;
      case 'plans':
        return <PlanManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'posts':
        return <PostManagement />;
      case 'countries':
        return <CountryManagement />;
      case 'settings':
        return (
          <div className="admin-card p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        );
      default:
        return <Dashboard onPageChange={handlePageChange} />;
    }
  };

  const handlePageChange = (page: string) => {
    setActivePage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onPageChange={handlePageChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      {/* Main Content Area - No gap, directly adjacent to sidebar */}
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="p-4 lg:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

// Auth Wrapper Component
const AuthWrapper: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-white text-lg">Loading Wasselle Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authMode === 'login' ? (
      <Login onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  return <DashboardLayout />;
};

// Main App Component
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
};

export default App;
