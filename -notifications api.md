# Admin Notifications System

This document describes the notification system for administrators, which automatically alerts admins when important events occur in the system.

## Overview

The admin notification system provides real-time alerts to administrators when:

### Driver Actions:
- Drivers submit new payment requests
- Drivers create new posts

### Admin Actions:
- Subscription plans management (create, update, delete)
- Payment management (approve, reject)
- Posts management (update, delete)
- Countries management (create, update, delete)

### Custom Notifications:
- Manually created notifications for testing or special announcements

## Database Structure

The system uses the existing `notifications` table with these key fields:
- `user_id`: Set to `0` for admin notifications
- `role`: Set to `'admin'` for admin notifications
- `message`: Human-readable notification message
- `data`: JSON data with additional details
- `is_read`: Boolean flag for read status
- `created_at`: Timestamp of notification creation

## Automatic Notification Triggers

### Driver Actions

#### 1. Payment Submissions
**When**: A driver submits a payment via `POST /api/driver/payments/submit.php`
**Notification Content**:
```json
{
  "message": "New payment submission from John Doe for Premium plan",
  "data": {
    "type": "payment",
    "payment_id": 123,
    "driver_name": "John Doe",
    "plan_name": "Premium",
    "transaction_id": "TXN12345"
  }
}
```

#### 2. Post Creation
**When**: A driver creates a post via `POST /api/driver/posts/create.php`
**Notification Content**:
```json
{
  "message": "New post created by John Doe: Germany → France",
  "data": {
    "type": "post",
    "post_id": 456,
    "driver_name": "John Doe",
    "from_country": "Germany",
    "to_country": "France"
  }
}
```

### Admin Actions

#### 3. Subscription Plans Management

**Plan Creation**: When admin creates a new plan via `POST /api/admin/plans/create.php`
```json
{
  "message": "Admin Alice created new plan: Gold Plan",
  "data": {
    "type": "plan_management",
    "plan_id": 789,
    "plan_name": "Gold Plan",
    "admin_name": "Alice",
    "action": "created"
  }
}
```

**Plan Update**: When admin updates a plan via `PUT /api/admin/plans/update.php`
```json
{
  "message": "Admin Alice updated plan: Premium Plan",
  "data": {
    "type": "plan_management",
    "plan_id": 123,
    "plan_name": "Premium Plan",
    "admin_name": "Alice",
    "action": "updated"
  }
}
```

**Plan Deletion**: When admin deletes a plan via `DELETE /api/admin/plans/delete.php`
```json
{
  "message": "Admin Alice deleted plan: Basic Plan",
  "data": {
    "type": "plan_management",
    "plan_name": "Basic Plan",
    "admin_name": "Alice",
    "action": "deleted"
  }
}
```

#### 4. Payment Management

**Payment Approval**: When admin approves a payment via `PUT /api/admin/payments/approve.php`
```json
{
  "message": "Admin Alice approved payment from John Doe for Premium",
  "data": {
    "type": "payment_management",
    "payment_id": 456,
    "driver_name": "John Doe",
    "plan_name": "Premium",
    "admin_name": "Alice",
    "action": "approved"
  }
}
```

**Payment Rejection**: When admin rejects a payment via `PUT /api/admin/payments/reject.php`
```json
{
  "message": "Admin Alice rejected payment from John Doe for Premium - Reason: Invalid transaction ID",
  "data": {
    "type": "payment_management",
    "payment_id": 456,
    "driver_name": "John Doe",
    "plan_name": "Premium",
    "admin_name": "Alice",
    "action": "rejected",
    "reason": "Invalid transaction ID"
  }
}
```

#### 5. Posts Management

**Post Update**: When admin updates a driver's post via `PUT /api/admin/posts/update.php`
```json
{
  "message": "Admin Alice updated post by John Doe: Germany → France",
  "data": {
    "type": "post_management",
    "post_id": 789,
    "driver_name": "John Doe",
    "from_country": "Germany",
    "to_country": "France",
    "admin_name": "Alice",
    "action": "updated"
  }
}
```

**Post Deletion**: When admin deletes a driver's post via `DELETE /api/admin/posts/delete.php`
```json
{
  "message": "Admin Alice deleted post by John Doe: Germany → France",
  "data": {
    "type": "post_management",
    "post_id": 789,
    "driver_name": "John Doe",
    "from_country": "Germany",
    "to_country": "France",
    "admin_name": "Alice",
    "action": "deleted"
  }
}
```

#### 6. Countries Management

**Country Creation**: When admin creates a new country via `POST /api/admin/countries/create.php`
```json
{
  "message": "Admin Alice created new country: Netherlands",
  "data": {
    "type": "country_management",
    "country_id": 25,
    "country_name": "Netherlands",
    "admin_name": "Alice",
    "action": "created"
  }
}
```

**Country Update**: When admin updates a country via `PUT /api/admin/countries/update.php`
```json
{
  "message": "Admin Alice updated country: Germany",
  "data": {
    "type": "country_management",
    "country_id": 12,
    "country_name": "Germany",
    "admin_name": "Alice",
    "action": "updated"
  }
}
```

**Note**: Country deletion notifications were removed from the system as per the current implementation.

## Complete API Reference

### 1. List Admin Notifications

**Endpoint**: `GET /api/admin/notifications/list.php`

**Purpose**: Retrieve admin notifications with pagination and filtering options

**Authentication**: Admin token required

**Query Parameters**:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of notifications per page (default: 20, max: 100)
- `unread_only` (optional): Set to `'true'` to get only unread notifications

**Request Example**:
```bash
GET /api/admin/notifications/list.php?page=1&limit=10&unread_only=true
Authorization: Bearer admin_token_here
```

**Response Structure**:
```json
{
  "success": true,
  "notifications": [
    {
      "id": 1,
      "user_id": 0,
      "role": "admin",
      "message": "New payment submission from John Doe for Premium plan",
      "data": {
        "type": "payment",
        "payment_id": 123,
        "driver_name": "John Doe",
        "plan_name": "Premium",
        "transaction_id": "TXN12345"
      },
      "is_read": 0,
      "created_at": "2024-01-15 10:30:00"
    }
  ],
  "unread_count": 5,
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total": 25,
    "total_pages": 3
  }
}
```

**Frontend Usage**:
```javascript
// Get all notifications
const getAllNotifications = async (page = 1, limit = 20) => {
  try {
    const response = await fetch(`/api/admin/notifications/list.php?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return await response.json();
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Get only unread notifications
const getUnreadNotifications = async () => {
  try {
    const response = await fetch('/api/admin/notifications/list.php?unread_only=true', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch unread notifications');
    return await response.json();
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    throw error;
  }
};

// Get notification count for badge
const getUnreadCount = async () => {
  try {
    const response = await fetch('/api/admin/notifications/list.php?unread_only=true&limit=1', {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch notification count');
    const data = await response.json();
    return data.unread_count;
  } catch (error) {
    console.error('Error fetching notification count:', error);
    return 0;
  }
};
```

### 2. Create Admin Notification

**Endpoint**: `POST /api/admin/notifications/create.php`

**Purpose**: Manually create custom admin notifications for testing or announcements

**Authentication**: Admin token required

**Request Body**:
```json
{
  "message": "Custom notification message",
  "type": "custom",
  "data": {
    "priority": "high",
    "category": "announcement"
  }
}
```

**Valid Notification Types**:
- `payment` - Driver payment submissions
- `post` - Driver post creation
- `plan_management` - Admin plan actions
- `payment_management` - Admin payment actions
- `post_management` - Admin post actions
- `country_management` - Admin country actions
- `custom` - Manual notifications

**Request Example**:
```bash
POST /api/admin/notifications/create.php
Authorization: Bearer admin_token_here
Content-Type: application/json

{
  "message": "System maintenance scheduled for tonight",
  "type": "custom",
  "data": {
    "priority": "high",
    "scheduled_time": "2024-01-15 23:00:00",
    "category": "maintenance"
  }
}
```

**Response Structure**:
```json
{
  "success": true,
  "message": "Notification created successfully",
  "notification_id": 789,
  "notification": {
    "id": 789,
    "message": "System maintenance scheduled for tonight",
    "type": "custom",
    "data": {
      "priority": "high",
      "scheduled_time": "2024-01-15 23:00:00",
      "category": "maintenance",
      "admin_name": "Alice",
      "created_by_admin": true
    },
    "created_by": "Alice"
  }
}
```

**Frontend Usage**:
```javascript
// Create custom notification
const createNotification = async (message, type = 'custom', data = {}) => {
  try {
    const response = await fetch('/api/admin/notifications/create.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        type,
        data
      })
    });
    
    if (!response.ok) throw new Error('Failed to create notification');
    return await response.json();
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Usage examples:
await createNotification(
  "System maintenance starting in 1 hour", 
  "custom", 
  { priority: "high", category: "maintenance" }
);

await createNotification(
  "New feature released: Advanced search filters", 
  "custom", 
  { priority: "medium", category: "feature", url: "/features/search" }
);

await createNotification(
  "Security update completed successfully", 
  "custom", 
  { priority: "low", category: "security" }
);
```

### 3. Mark Notifications as Read

**Endpoint**: `PUT /api/admin/notifications/mark-read.php`

**Purpose**: Mark single or all notifications as read

**Authentication**: Admin token required

**Request Body Options**:

#### Mark Single Notification as Read:
```json
{
  "notification_id": 123
}
```

#### Mark All Notifications as Read:
```json
{}
```

**Request Example**:
```bash
PUT /api/admin/notifications/mark-read.php
Authorization: Bearer admin_token_here
Content-Type: application/json

{
  "notification_id": 123
}
```

**Response Structure**:
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

**Frontend Usage**:
```javascript
// Mark single notification as read
const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await fetch('/api/admin/notifications/mark-read.php', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notification_id: notificationId })
    });
    
    if (!response.ok) throw new Error('Failed to mark notification as read');
    return await response.json();
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async () => {
  try {
    const response = await fetch('/api/admin/notifications/mark-read.php', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
    return await response.json();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Auto-mark notification as read when clicked
const handleNotificationClick = async (notification) => {
  if (!notification.is_read) {
    await markNotificationAsRead(notification.id);
    // Update UI to reflect read status
    updateNotificationUI(notification.id, true);
  }
  
  // Handle notification action based on type
  handleNotificationAction(notification);
};
```

## Complete Frontend Implementation Example

### React Component for Admin Notifications

```javascript
import React, { useState, useEffect, useCallback } from 'react';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const adminToken = localStorage.getItem('adminToken');

  // Fetch notifications
  const fetchNotifications = useCallback(async (currentPage = 1, unreadOnly = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...(unreadOnly && { unread_only: 'true' })
      });

      const response = await fetch(`/api/admin/notifications/list.php?${params}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');
      
      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      setTotalPages(data.pagination.total_pages);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch('/api/admin/notifications/mark-read.php', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notification_id: notificationId })
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: 1 }
            : notif
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/admin/notifications/mark-read.php', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: 1 }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Create test notification
  const createTestNotification = async () => {
    try {
      const response = await fetch('/api/admin/notifications/create.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: "Test notification created from dashboard",
          type: "custom",
          data: {
            priority: "medium",
            category: "test",
            created_at: new Date().toISOString()
          }
        })
      });

      if (!response.ok) throw new Error('Failed to create notification');

      // Refresh notifications
      fetchNotifications(page, showUnreadOnly);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Handle different notification types
    switch (notification.data?.type) {
      case 'payment':
        // Navigate to payment approval page
        window.location.href = `/admin/payments/${notification.data.payment_id}`;
        break;
      case 'post':
        // Navigate to post details
        window.location.href = `/admin/posts/${notification.data.post_id}`;
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
      default:
        console.log('Custom notification clicked:', notification);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
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

  // Get notification priority color
  const getPriorityColor = (notification) => {
    const priority = notification.data?.priority;
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  useEffect(() => {
    fetchNotifications(page, showUnreadOnly);
  }, [page, showUnreadOnly, fetchNotifications]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications(page, showUnreadOnly);
    }, 30000);

    return () => clearInterval(interval);
  }, [page, showUnreadOnly, fetchNotifications]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Admin Notifications 
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-sm">
              {unreadCount}
            </span>
          )}
        </h1>
        
        <div className="flex gap-2">
          <button
            onClick={createTestNotification}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Test Notification
          </button>
          
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`px-4 py-2 rounded ${
              showUnreadOnly 
                ? 'bg-orange-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {showUnreadOnly ? 'Show All' : 'Unread Only'}
          </button>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading notifications...</div>
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
                      
                      {notification.data?.category && (
                        <span className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs mt-1">
                          {notification.data.category}
                        </span>
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

          {notifications.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {showUnreadOnly ? 'No unread notifications' : 'No notifications found'}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="px-4 py-1">
                Page {page} of {totalPages}
              </span>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminNotifications;
```

### Notification Badge Component

```javascript
import React, { useState, useEffect } from 'react';

const NotificationBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const adminToken = localStorage.getItem('adminToken');

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/admin/notifications/list.php?unread_only=true&limit=1', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button className="p-2 text-gray-600 hover:text-gray-900">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default NotificationBadge;
```

## Helper Class

### AdminNotificationHelper

Located at: `helpers/AdminNotificationHelper.php`

**Core Methods**:

#### `createNotification($message, $type, $data = null)`
Creates a new admin notification.

**Parameters**:
- `$message`: Human-readable notification message
- `$type`: Notification type
- `$data`: Additional data array (optional)

**Returns**: Notification ID or false on failure

#### Driver Action Methods:
- `notifyNewPayment($paymentId, $driverName, $planName, $transactionId)`
- `notifyNewPost($postId, $driverName, $fromCountry, $toCountry)`

#### Admin Action Methods:

**Plans Management**:
- `notifyPlanCreated($planId, $planName, $admin)`
- `notifyPlanUpdated($planId, $planName, $admin)`
- `notifyPlanDeleted($planName, $admin)`

**Payment Management**:
- `notifyPaymentApproved($paymentId, $driverName, $planName, $admin)`
- `notifyPaymentRejected($paymentId, $driverName, $planName, $admin, $reason = null)`

**Posts Management**:
- `notifyPostUpdated($postId, $driverName, $fromCountry, $toCountry, $admin)`
- `notifyPostDeleted($postId, $driverName, $fromCountry, $toCountry, $admin)`

**Countries Management**:
- `notifyCountryCreated($countryId, $countryName, $admin)`
- `notifyCountryUpdated($countryId, $countryName, $admin)`

**Note**: All admin action methods accept the full `$admin` array and safely extract the admin name using the internal `getAdminName()` method.

## Notification Categories

| Category | Types | Purpose | Frontend Action |
|----------|-------|---------|----------------|
| **Driver Actions** | `payment`, `post` | Actions performed by drivers that require admin attention | Navigate to approval/review pages |
| **Plan Management** | `plan_management` | Admin actions on subscription plans | Navigate to plans management |
| **Payment Processing** | `payment_management` | Admin decisions on payment approvals/rejections | Navigate to payments dashboard |
| **Content Moderation** | `post_management` | Admin actions on driver posts | Navigate to posts management |
| **System Configuration** | `country_management` | Admin changes to system settings | Navigate to countries management |
| **Custom Notifications** | `custom` | Manual notifications for announcements, testing, etc. | Custom handling based on data |

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description here"
}
```

**Common HTTP Status Codes**:
- `200`: Success
- `201`: Created (for notification creation)
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (invalid/missing admin token)
- `403`: Forbidden (not an admin)
- `405`: Method Not Allowed
- `500`: Internal Server Error

**Frontend Error Handling**:
```javascript
const handleApiError = (error, context = '') => {
  console.error(`${context} error:`, error);
  
  // Show user-friendly error messages
  if (error.message.includes('401')) {
    // Redirect to login
    window.location.href = '/admin/login';
  } else if (error.message.includes('403')) {
    alert('Access denied. Admin privileges required.');
  } else if (error.message.includes('500')) {
    alert('Server error. Please try again later.');
  } else {
    alert(`Error: ${error.message}`);
  }
};
```

## Security Features

1. **Admin Authentication**: All endpoints require valid admin authentication
2. **CORS Handling**: Proper CORS headers for cross-origin requests
3. **Input Validation**: All inputs are validated and sanitized
4. **SQL Injection Protection**: Prepared statements used throughout
5. **Action Tracking**: All admin actions are logged with admin identity
6. **Type Validation**: Notification types are validated against allowed values
7. **Safe Name Extraction**: Admin names are safely extracted with fallbacks

## Complete Event Matrix

| Trigger Event | API Endpoint | Notification Type | Auto-Created | Manual API |
|---------------|--------------|-------------------|--------------|------------|
| Driver submits payment | `POST /api/driver/payments/submit.php` | `payment` | ✅ | N/A |
| Driver creates post | `POST /api/driver/posts/create.php` | `post` | ✅ | N/A |
| Admin creates plan | `POST /api/admin/plans/create.php` | `plan_management` | ✅ | N/A |
| Admin updates plan | `PUT /api/admin/plans/update.php` | `plan_management` | ✅ | N/A |
| Admin deletes plan | `DELETE /api/admin/plans/delete.php` | `plan_management` | ✅ | N/A |
| Admin approves payment | `PUT /api/admin/payments/approve.php` | `payment_management` | ✅ | N/A |
| Admin rejects payment | `PUT /api/admin/payments/reject.php` | `payment_management` | ✅ | N/A |
| Admin updates post | `PUT /api/admin/posts/update.php` | `post_management` | ✅ | N/A |
| Admin deletes post | `DELETE /api/admin/posts/delete.php` | `post_management` | ✅ | N/A |
| Admin creates country | `POST /api/admin/countries/create.php` | `country_management` | ✅ | N/A |
| Admin updates country | `PUT /api/admin/countries/update.php` | `country_management` | ✅ | N/A |
| Manual notification | `POST /api/admin/notifications/create.php` | `custom` | N/A | ✅ |
| View notifications | `GET /api/admin/notifications/list.php` | All types | N/A | ✅ |
| Mark as read | `PUT /api/admin/notifications/mark-read.php` | All types | N/A | ✅ |

## Testing Examples

### API Testing with cURL

```bash
# Get all notifications
curl -X GET "http://localhost/api/admin/notifications/list.php" \
  -H "Authorization: Bearer your_admin_token"

# Get unread notifications only
curl -X GET "http://localhost/api/admin/notifications/list.php?unread_only=true" \
  -H "Authorization: Bearer your_admin_token"

# Create test notification
curl -X POST "http://localhost/api/admin/notifications/create.php" \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test notification from cURL",
    "type": "custom",
    "data": {
      "priority": "high",
      "category": "test"
    }
  }'

# Mark notification as read
curl -X PUT "http://localhost/api/admin/notifications/mark-read.php" \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"notification_id": 123}'

# Mark all notifications as read
curl -X PUT "http://localhost/api/admin/notifications/mark-read.php" \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Best Practices

1. **Real-time Updates**: Poll the list endpoint every 30 seconds for real-time updates
2. **Auto-mark as Read**: Mark notifications as read when user clicks on them
3. **Visual Indicators**: Use badges, colors, and icons to indicate notification types and priorities
4. **Error Handling**: Implement comprehensive error handling for all API calls
5. **Caching**: Cache notification count and implement optimistic updates
6. **Pagination**: Always implement pagination for better performance
7. **Filtering**: Provide unread/all filter options for better user experience
8. **Navigation**: Navigate to relevant pages when notifications are clicked
9. **Testing**: Use the create endpoint for testing UI components
10. **Performance**: Limit notification history to prevent database bloat

## Recent Updates

### System Improvements
- **Admin Name Handling**: Improved admin name extraction with fallbacks (email, ID)
- **JWT Token**: Added admin name to JWT payload for better identification
- **Error Handling**: Enhanced error handling and debugging capabilities
- **Code Consistency**: Updated all admin files to pass full admin array instead of just name
- **Safety**: Added safe name extraction methods to prevent undefined index errors

### Implementation Notes
- All admin notification methods now accept the full `$admin` array
- The system gracefully handles missing admin names with appropriate fallbacks
- Country deletion notifications were removed as per current implementation
- Enhanced debugging and error logging for troubleshooting

## Future Enhancements

- Real-time WebSocket notifications
- Push notifications integration
- Email notifications for critical events
- Notification categories and advanced filtering
- Bulk operations for notifications
- Notification templates system
- Admin notification preferences
- Notification analytics and metrics
- Scheduled notifications
- Notification expiration dates 