import React, { useState, useEffect } from 'react';
import { ApiService, Notification } from '../../utils/api';

const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch unread count for badge
  const fetchUnreadCount = async () => {
    try {
      const response = await ApiService.getNotifications({
        unread_only: true,
        limit: 1
      });

      if (response.success) {
        setUnreadCount(response.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Fetch recent notifications for dropdown
  const fetchRecentNotifications = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await ApiService.getNotifications({
        limit: 5,
        page: 1
      });

      if (response.success) {
        setRecentNotifications(response.notifications || []);
        setUnreadCount(response.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching recent notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Refresh every 30 seconds as per documentation
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBellClick = () => {
    if (!showDropdown) {
      fetchRecentNotifications();
    }
    setShowDropdown(!showDropdown);
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      try {
        await ApiService.markNotificationAsRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setRecentNotifications(prev => 
          prev.map(n => n.id === notification.id ? {...n, is_read: 1} : n)
        );
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on notification type
    switch (notification.data?.type) {
      case 'payment':
        window.location.href = '/admin/payments';
        break;
      case 'post':
        window.location.href = '/admin/posts';
        break;
      case 'plan_management':
        window.location.href = '/admin/plans';
        break;
      case 'payment_management':
        window.location.href = '/admin/payments';
        break;
      case 'post_management':
        window.location.href = '/admin/posts';
        break;
      case 'country_management':
        window.location.href = '/admin/countries';
        break;
      default:
        window.location.href = '/admin/notifications';
    }
    
    setShowDropdown(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment': return '💰';
      case 'post': return '📝';
      case 'plan_management': return '📊';
      case 'payment_management': return '✅';
      case 'post_management': return '🛠️';
      case 'country_management': return '🌍';
      case 'custom': return '🔔';
      default: return '📢';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="p-2 text-gray-600 hover:text-gray-900 transition-colors relative"
        title={`${unreadCount} unread notifications`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-3-3V9a6 6 0 1 0-12 0v5l-3 3h5a6 6 0 1 0 12 0z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => {
                  window.location.href = '/admin/notifications';
                  setShowDropdown(false);
                }}
                className="text-blue-600 text-sm hover:text-blue-800"
              >
                View All
              </button>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600 mt-1">{unreadCount} unread</p>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <p className="text-sm text-gray-600 mt-2">Loading...</p>
              </div>
            ) : recentNotifications.length > 0 ? (
              recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">
                      {getNotificationIcon(notification.data?.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold' : ''} text-gray-900 truncate`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                        {notification.data?.priority && (
                          <span className={`text-xs px-1 py-0.5 rounded ${
                            notification.data.priority === 'high' 
                              ? 'bg-red-100 text-red-700'
                              : notification.data.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {notification.data.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                <div className="text-2xl mb-2">🔔</div>
                <p className="text-sm">No notifications</p>
              </div>
            )}
          </div>

          {recentNotifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <button
                onClick={() => {
                  window.location.href = '/admin/notifications';
                  setShowDropdown(false);
                }}
                className="w-full text-center text-blue-600 text-sm hover:text-blue-800 font-medium"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell; 