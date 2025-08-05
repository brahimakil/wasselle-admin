import React, { useState, useEffect } from 'react';
import { ApiService } from '../../utils/api';

interface DashboardProps {
  onPageChange?: (page: string) => void;
}

interface DashboardStats {
  // User Statistics
  totalUsers: number;
  totalDrivers: number;
  totalRiders: number;
  verifiedUsers: number;
  bannedUsers: number;
  pendingApprovals: number;
  
  // Payment Statistics
  totalPayments: number;
  pendingPayments: number;
  approvedPayments: number;
  rejectedPayments: number;
  
  // Post Statistics
  totalPosts: number;
  activePosts: number;
  
  // Plan Statistics
  totalPlans: number;
  activeSubscriptions: number;
  
  // Country Statistics
  totalCountries: number;
  
  // Notification Statistics
  unreadNotifications: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDrivers: 0,
    totalRiders: 0,
    verifiedUsers: 0,
    bannedUsers: 0,
    pendingApprovals: 0,
    totalPayments: 0,
    pendingPayments: 0,
    approvedPayments: 0,
    rejectedPayments: 0,
    totalPosts: 0,
    activePosts: 0,
    totalPlans: 0,
    activeSubscriptions: 0,
    totalCountries: 0,
    unreadNotifications: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]); // Add this back
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Reduce API calls to only essential ones
      const [
        allUsers,
        allPayments,
        allPosts,
        plans,
        unreadNotifications
      ] = await Promise.all([
        ApiService.getUsers({ limit: 100 }), // Get more users to calculate stats
        ApiService.getPayments({ limit: 50, status: 'approved' }), // Only get approved payments
        ApiService.getPosts({ limit: 50 }), // Get recent posts
        ApiService.getPlans(),
        ApiService.getNotifications({ limit: 1, unread_only: true }) // Just unread count
      ]);

      // Calculate stats from the fetched data instead of making separate API calls
      const users = allUsers.users || [];
      const payments = allPayments.payments || [];
      const posts = allPosts.posts || [];
      
      // User stats
      const drivers = users.filter(u => u.role === 'driver');
      const riders = users.filter(u => u.role === 'rider');
      const verified = users.filter(u => u.is_verified === 1);
      const banned = users.filter(u => u.is_banned === 1);
      const pending = users.filter(u => u.is_verified === 0 && u.role === 'driver');
      
      // Payment stats
      const pendingPayments = payments.filter(p => p.status === 'pending');
      const approvedPayments = payments.filter(p => p.status === 'approved');
      const rejectedPayments = payments.filter(p => p.status === 'rejected');
      
      // Post stats
      const activePosts = posts.filter(p => p.is_active === 1);
      
      // Active subscriptions count
      const activeSubsCount = users.filter(u => u.current_subscription_id).length;

      setStats({
        totalUsers: users.length,
        totalDrivers: drivers.length,
        totalRiders: riders.length,
        verifiedUsers: verified.length,
        bannedUsers: banned.length,
        pendingApprovals: pending.length,
        totalPayments: payments.length,
        pendingPayments: pendingPayments.length,
        approvedPayments: approvedPayments.length,
        rejectedPayments: rejectedPayments.length,
        totalPosts: posts.length,
        activePosts: activePosts.length,
        totalPlans: plans.plans?.length || 0,
        activeSubscriptions: activeSubsCount,
        totalCountries: 0,
        unreadNotifications: unreadNotifications.unread_count || 0
      });

      // Set recent data
      setRecentUsers(users.slice(0, 5));
      setRecentPayments(payments.slice(0, 5)); // Add this line back

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    if (!onPageChange) {
      console.warn('onPageChange prop not provided to Dashboard component');
      return;
    }

    switch (action) {
      case 'drivers':
        onPageChange('drivers');
        break;
      case 'riders':
        onPageChange('riders');
        break;
      case 'payments':
        onPageChange('payments');
        break;
      case 'plans':
        onPageChange('plans');
        break;
      case 'posts':
        onPageChange('posts');
        break;
      case 'countries':
        onPageChange('countries');
        break;
      case 'notifications':
        onPageChange('notifications');
        break;
      // For actions that don't have direct pages, navigate to the closest page
      case 'pending-payments':
        onPageChange('payments'); // Will show all payments, user can filter
        break;
      case 'pending-users':
        onPageChange('drivers'); // Will show all drivers, user can filter for unverified
        break;
      default:
        console.warn(`Unknown action: ${action}`);
        break;
    }
  };

  const renderRecentPayments = () => {
    // Filter for only active payments (like in PaymentManagement.tsx)
    const activePayments = recentPayments.filter(payment => 
      payment.status === 'approved' && 
      payment.payment_subscription_status === 'active'
    );

    if (activePayments.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">💳</div>
          <p>No active payments found</p>
          <p className="text-xs mt-1">Only payments with active subscriptions are shown</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {activePayments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex-1">
              <p className="font-medium text-gray-900">{payment.driver_name || 'Unknown Driver'}</p>
              <p className="text-sm text-gray-600">{payment.plan_name || 'Unknown Plan'}</p>
              <p className="text-xs text-gray-500">
                {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'Unknown date'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">${payment.amount || payment.price || '0.00'}</p>
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                ✓ Active Plan
              </span>
            </div>
          </div>
        ))}
        
        {/* View All Link */}
        <div className="pt-3 border-t border-gray-200">
          <button
            onClick={() => handleQuickAction('payments')}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View All Payments →
          </button>
        </div>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your platform.</p>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* User Stats */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <span className="text-xs bg-blue-400 bg-opacity-50 px-2 py-1 rounded-full">
                  {stats.verifiedUsers} verified
                </span>
              </div>
            </div>
            <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Drivers</p>
              <p className="text-3xl font-bold">{stats.totalDrivers.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <span className="text-xs bg-green-400 bg-opacity-50 px-2 py-1 rounded-full">
                  {stats.activeSubscriptions} active plans
                </span>
              </div>
            </div>
            <div className="bg-green-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Riders</p>
              <p className="text-3xl font-bold">{stats.totalRiders.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <span className="text-xs bg-purple-400 bg-opacity-50 px-2 py-1 rounded-full">
                  Active users
                </span>
              </div>
            </div>
            <div className="bg-purple-400 bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-r ${stats.pendingApprovals > 0 ? 'from-yellow-500 to-yellow-600' : 'from-emerald-500 to-emerald-600'} rounded-lg shadow-lg p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${stats.pendingApprovals > 0 ? 'text-yellow-100' : 'text-emerald-100'} text-sm font-medium`}>
                Pending Approvals
              </p>
              <p className="text-3xl font-bold">{stats.pendingApprovals.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <span className={`text-xs ${stats.pendingApprovals > 0 ? 'bg-yellow-400' : 'bg-emerald-400'} bg-opacity-50 px-2 py-1 rounded-full`}>
                  {stats.pendingApprovals > 0 ? 'Action needed' : 'All clear'}
                </span>
              </div>
            </div>
            <div className={`${stats.pendingApprovals > 0 ? 'bg-yellow-400' : 'bg-emerald-400'} bg-opacity-30 rounded-full p-3`}>
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-indigo-100 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPayments}</p>
              <p className="text-sm text-gray-600">Total Payments</p>
              <p className="text-xs text-yellow-600">{stats.pendingPayments} pending</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-pink-100 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
              <p className="text-sm text-gray-600">Total Posts</p>
              <p className="text-xs text-green-600">{stats.activePosts} active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-orange-100 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPlans}</p>
              <p className="text-sm text-gray-600">Plans Available</p>
              <p className="text-xs text-blue-600">{stats.activeSubscriptions} subscriptions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-teal-100 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCountries}</p>
              <p className="text-sm text-gray-600">Countries</p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM4.828 7l2.828 2.828M9.172 9.172L12 12m0 0l2.828 2.828M15 9.172L12 12m0 0L9.172 14.828M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.unreadNotifications}</p>
              <p className="text-sm text-gray-600">Notifications</p>
              <p className="text-xs text-red-600">{stats.unreadNotifications} unread</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => handleQuickAction('drivers')}
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center mr-3 transition-colors">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Manage Drivers</span>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button 
              onClick={() => handleQuickAction('payments')}
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-yellow-50 hover:border-yellow-300 transition-all duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-100 group-hover:bg-yellow-200 rounded-lg flex items-center justify-center mr-3 transition-colors">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Review Payments</span>
              </div>
              {stats.pendingPayments > 0 && (
                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full mr-2">
                  {stats.pendingPayments}
                </span>
              )}
              <svg className="w-4 h-4 text-gray-400 group-hover:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button 
              onClick={() => handleQuickAction('riders')}
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center mr-3 transition-colors">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Manage Riders</span>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button 
              onClick={() => handleQuickAction('plans')}
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center mr-3 transition-colors">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Manage Plans</span>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button 
              onClick={() => handleQuickAction('notifications')}
              className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center mr-3 transition-colors">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM4.828 7l2.828 2.828M9.172 9.172L12 12m0 0l2.828 2.828M15 9.172L12 12m0 0L9.172 14.828M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">View Notifications</span>
              </div>
              {stats.unreadNotifications > 0 && (
                <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full mr-2">
                  {stats.unreadNotifications}
                </span>
              )}
              <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h3>
          <div className="space-y-4">
            {recentUsers.length > 0 ? (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-gray-400">{formatDate(user.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      user.role === 'driver' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {user.role}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${
                      user.is_verified ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent users</p>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
          <div className="space-y-4">
            {renderRecentPayments()}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">API Status</span>
            </div>
            <span className="text-green-700 text-sm font-medium">Operational</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">Database</span>
            </div>
            <span className="text-green-700 text-sm font-medium">Connected</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">File Storage</span>
            </div>
            <span className="text-green-700 text-sm font-medium">Available</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-sm font-medium text-gray-700">Last Updated</span>
            </div>
            <span className="text-blue-700 text-sm font-medium">Just now</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 