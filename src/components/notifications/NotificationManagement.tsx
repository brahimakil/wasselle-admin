import React, { useState, useEffect } from 'react';
import { ApiService, Notification } from '../../utils/api';

const NotificationManagement: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total: 0,
    limit: 20
  });
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await ApiService.getNotifications({
        page: pagination.current_page,
        limit: pagination.limit,
        unread_only: filter === 'unread'
      });

      if (response.success) {
        let filteredNotifications = response.notifications || [];
        
     

        if (typeFilter !== 'all') {
          filteredNotifications = filteredNotifications.filter(n => 
            n.data?.type === typeFilter
          );
        }

        setNotifications(filteredNotifications);
        setUnreadCount(response.unread_count || 0);
        
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            current_page: response.pagination?.current_page || prev.current_page,
            total_pages: response.pagination?.total_pages || prev.total_pages,
            total: response.pagination?.total || prev.total
          }));
        }
      } else {
        setError(response.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Add missing dependency to useEffect
  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, pagination.current_page]);

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await ApiService.markNotificationAsRead(notificationId);
      if (response.success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? {...n, is_read: 1} : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await ApiService.markNotificationAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({...n, is_read: 1})));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Handle different notification types based on documentation
    switch (notification.data?.type) {
      case 'payment':
        // Navigate to payment approval page
        if (notification.data.payment_id) {
          window.location.href = `/admin/payments?highlight=${notification.data.payment_id}`;
        }
        break;
      case 'post':
        // Navigate to post details
        if (notification.data.post_id) {
          window.location.href = `/admin/posts?highlight=${notification.data.post_id}`;
        }
        break;
      case 'plan_management':
        // Navigate to plans management
        window.location.href = '/admin/plans';
        break;
      case 'payment_management':
        // Navigate to payments list
        window.location.href = '/admin/payments';
        break;
      case 'post_management':
        // Navigate to posts management
        window.location.href = '/admin/posts';
        break;
      case 'country_management':
        // Navigate to countries management
        window.location.href = '/admin/countries';
        break;
      case 'custom':
        // Handle custom notifications
        console.log('Custom notification clicked:', notification);
        break;
      default:
        console.log('Unknown notification type:', notification.data?.type);
    }
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

  const getPriorityColor = (notification: Notification) => {
    const priority = notification.data?.priority;
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-white';
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

  const changePage = (newPage: number) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Notifications</h1>
            {unreadCount > 0 && (
              <span className="inline-block bg-red-100 text-red-800 text-sm px-2 py-1 rounded-full mt-1">
                {unreadCount} unread
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
              >
                ✅ Mark All Read
              </button>
            )}
          </div>
        </div>

      

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading notifications...</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md
                    ${getPriorityColor(notification)}
                    ${notification.is_read ? 'opacity-75' : 'opacity-100 font-semibold'}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">
                        {getNotificationIcon(notification.data?.type)}
                      </span>
                      
                      <div className="flex-1">
                        <p className="text-gray-900">{notification.message}</p>
                        
                        <div className="flex gap-2 mt-1">
                          {notification.data?.category && (
                            <span className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
                              {notification.data.category}
                            </span>
                          )}
                          
                          {notification.data?.action && (
                            <span className="inline-block bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs">
                              {notification.data.action}
                            </span>
                          )}
                          
                          {notification.data?.priority && (
                            <span className={`inline-block px-2 py-1 rounded text-xs ${
                              notification.data.priority === 'high' 
                                ? 'bg-red-200 text-red-700'
                                : notification.data.priority === 'medium'
                                ? 'bg-yellow-200 text-yellow-700'
                                : 'bg-green-200 text-green-700'
                            }`}>
                              {notification.data.priority} priority
                            </span>
                          )}
                        </div>

                        {notification.data?.admin_name && (
                          <p className="text-sm text-gray-600 mt-1">
                            by {notification.data.admin_name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                      
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-auto mt-1"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>


            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                  onClick={() => changePage(Math.max(1, pagination.current_page - 1))}
                  disabled={pagination.current_page === 1}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
                >
                  Previous
                </button>
                
                <span className="px-4 py-1">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                
                <button
                  onClick={() => changePage(Math.min(pagination.total_pages, pagination.current_page + 1))}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
                >
                  Next
                </button>
              </div>
            )}

            {/* Statistics */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{pagination.total}</div>
                  <div className="text-sm text-gray-600">Total Notifications</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{unreadCount}</div>
                  <div className="text-sm text-gray-600">Unread</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{pagination.total - unreadCount}</div>
                  <div className="text-sm text-gray-600">Read</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{pagination.current_page}</div>
                  <div className="text-sm text-gray-600">Current Page</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NotificationManagement; 