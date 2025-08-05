import React, { useState, useEffect } from 'react';
import { ApiService, User, Plan } from '../../utils/api';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    is_verified: '',
    is_banned: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_users: 0,
    limit: 10
  });
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  
  // User subscriptions data
  const [userSubscriptions, setUserSubscriptions] = useState<{[key: number]: any[]}>({});
  
  // Create user form state
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'rider' as 'driver' | 'rider',
    phone: '',
    dob: '',
    place_of_living: '',
    face_photo: undefined as File | undefined,
    passport_photo: undefined as File | undefined
  });

  // Create payment form state (removed assign plan - now only payments)
  const [createPaymentForm, setCreatePaymentForm] = useState({
    driver_id: 0,
    plan_id: 0,
    transaction_id: '',
    status: 'approved' as 'pending' | 'approved' | 'rejected',
    admin_note: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, [filters, pagination.current_page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await ApiService.getUsers({
        ...filters,
        page: pagination.current_page,
        limit: pagination.limit
      });

      if (response.success) {
        setUsers(response.users || []);
        
        // Fetch subscription data for each driver
        const subscriptionData: {[key: number]: any[]} = {};
        for (const user of response.users || []) {
          if (user.role === 'driver') {
            try {
              const userDetails = await ApiService.getUser(user.id);
              if (userDetails.success && userDetails.subscriptions) {
                subscriptionData[user.id] = userDetails.subscriptions;
              }
            } catch (err) {
              console.warn(`Failed to fetch subscriptions for user ${user.id}:`, err);
            }
          }
        }
        setUserSubscriptions(subscriptionData);
        
        const newPagination = {
          current_page: response.pagination?.current_page || pagination.current_page,
          total_pages: response.pagination?.total_pages || pagination.total_pages,
          total_users: response.pagination?.total_users || 0,
          limit: response.pagination?.limit || pagination.limit
        };
        setPagination(newPagination);
      } else {
        setError(response.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await ApiService.getPlans();
      if (response.success) {
        setPlans(response.plans || []);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  // Check if driver has active subscription
  const hasActiveSubscription = (userId: number): boolean => {
    const subscriptions = userSubscriptions[userId] || [];
    return subscriptions.some(sub => sub.is_active === 1);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.face_photo || !createForm.passport_photo) {
      setError('Both face photo and document photo are required');
      return;
    }

    try {
      setError('');
      
      const userData = {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        phone: createForm.phone || undefined,
        dob: createForm.dob || undefined,
        place_of_living: createForm.place_of_living || undefined,
        face_photo: createForm.face_photo,
        passport_photo: createForm.passport_photo
      };
      
      const response = await ApiService.createUser(userData);
      
      if (response.success) {
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          email: '',
          password: '',
          role: 'rider',
          phone: '',
          dob: '',
          place_of_living: '',
          face_photo: undefined,
          passport_photo: undefined
        });
        fetchUsers();
      } else {
        setError(response.message || 'Failed to create user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (createPaymentForm.driver_id === 0) {
      setError('Please select a driver');
      return;
    }
    
    if (createPaymentForm.plan_id === 0) {
      setError('Please select a plan');
      return;
    }
    
    if (!createPaymentForm.transaction_id.trim()) {
      setError('Please enter a transaction ID');
      return;
    }

    try {
      setError('');
      console.log('Creating payment with admin:', createPaymentForm);
      
      // Step 1: Create payment record
      const response = await ApiService.createPayment(createPaymentForm);
      console.log('Payment creation response:', response);
      
      if (response.success) {
        // Step 2: If approved, create new subscription (backend automatically handles old plan cleanup)
        if (createPaymentForm.status === 'approved') {
          try {
            const subscriptionResponse = await ApiService.assignDriverToPlan({
              driver_id: createPaymentForm.driver_id,
              plan_id: createPaymentForm.plan_id,
              start_date: new Date().toISOString().split('T')[0]
            });
            
            if (subscriptionResponse.success) {
              console.log('✅ Backend automatically handled plan cleanup:', subscriptionResponse.message);
            }
            
          } catch (subscriptionErr) {
            console.error('Failed to create subscription after payment:', subscriptionErr);
            setError('Payment created but failed to activate subscription. Please check manually.');
            return;
          }
        }
        
        setShowCreatePaymentModal(false);
        setCreatePaymentForm({
          driver_id: 0,
          plan_id: 0,
          transaction_id: '',
          status: 'approved',
          admin_note: ''
        });
        fetchUsers();
        
        const selectedDriver = users.find(u => u.id === createPaymentForm.driver_id);
        const selectedPlan = plans.find(p => p.id === createPaymentForm.plan_id);
        
        alert(`✅ Payment ${createPaymentForm.status} for ${selectedDriver?.name} - ${selectedPlan?.name}. Backend automatically deactivated any old plans.`);
        
      } else {
        setError(response.message || 'Failed to create payment');
      }
    } catch (err: any) {
      console.error('Payment creation error:', err);
      setError(err.message || 'Failed to create payment');
    }
  };

  const handleUserAction = async (user: User, action: 'verify' | 'unverify' | 'ban' | 'unban' | 'delete') => {
    try {
      let updateData: any = { id: user.id };
      
      switch (action) {
        case 'verify':
          if (user.role !== 'driver') {
            setError('Only drivers can have verification badges');
            return;
          }
          updateData.is_verified = 1;
          break;
        case 'unverify':
          if (user.role !== 'driver') {
            setError('Only drivers can be unverified');
            return;
          }
          updateData.is_verified = 0;
          break;
        case 'ban':
          updateData.is_banned = 1;
          break;
        case 'unban':
          updateData.is_banned = 0;
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            await ApiService.deleteUser(user.id);
            fetchUsers();
            return;
          } else {
            return;
          }
      }

      const response = await ApiService.updateUser(updateData);
      
      if (response.success) {
        fetchUsers();
        setShowModal(false);
        setError('');
      } else {
        setError(response.message || 'Action failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleRemovePlan = async (user: User) => {
    const driverSubs = userSubscriptions[user.id] || [];
    const activeSub = driverSubs.find(sub => sub.is_active === 1);
    
    if (!activeSub) {
      setError('No active plan to remove');
      return;
    }
    
    const confirmMessage = `⚠️ REMOVE PLAN for ${user.name}?\n\nCurrent Plan: ${activeSub.plan_name}\nExpires: ${formatDate(activeSub.end_date)}\n\nThis will:\n• ❌ Remove the subscription\n• ❌ Reject all approved payments for this plan\n• ✅ Allow driver to purchase new plans\n\nContinue?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setError('');
      
      // Step 1: Remove the subscription first
      console.log(`Removing subscription ${activeSub.id} for driver ${user.id}`);
      await ApiService.removeSubscription(activeSub.id);
      
      // Step 2: Get fresh payment data after subscription removal
      const driverPaymentsResponse = await ApiService.getDriverPayments(user.id);
      
      if (driverPaymentsResponse.success && driverPaymentsResponse.payments) {
        // Find approved payments for the removed plan
        const planPayments = driverPaymentsResponse.payments.filter(
          (payment: any) => payment.plan_id === activeSub.plan_id && payment.status === 'approved'
        );
        
        console.log(`Found ${planPayments.length} approved payments to reject for plan ${activeSub.plan_id}`);
        
        // Step 3: Try to reject payments (if any exist)
        if (planPayments.length > 0) {
          for (const payment of planPayments) {
            try {
              console.log(`Attempting to reject payment ${payment.id} with transaction ${payment.transaction_id}`);
              
              await ApiService.rejectPayment(
                payment.id, 
                `Plan removed by admin on ${new Date().toLocaleString()}`
              );
              
              console.log(`✅ Successfully rejected payment: ${payment.transaction_id}`);
            } catch (paymentErr: any) {
              console.warn(`⚠️ Failed to reject payment ${payment.id}:`, paymentErr);
              // Continue with other payments even if one fails
            }
          }
        } else {
          console.log('No approved payments found to reject');
        }
      }
      
      // Step 4: Refresh data
      fetchUsers();
      
      alert(`✅ Plan REMOVED!\n\n${user.name} can now purchase new plans.\n\nActions taken:\n• Subscription removed\n• Payment processing attempted`);
      
    } catch (err: any) {
      console.error('Error removing plan:', err);
      setError(err.message || 'Failed to remove plan');
    }
  };

  const getStatusBadge = (user: User) => {
    if (user.is_banned) {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Banned</span>;
    }
    
    if (user.role === 'rider') {
      return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">Active Rider</span>;
    }
    
    // For drivers: Show badge status (separate from plan status)
    if (user.is_verified) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">✓ Verified Driver</span>;
    }
    return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">No Badge</span>;
  };

  const getPlanStatusBadge = (userId: number) => {
    const subscriptions = userSubscriptions[userId] || [];
    const activeSub = subscriptions.find(sub => sub.is_active === 1);
    
    if (activeSub) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">✓ Can Post</span>;
    }
    return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">No Posting Access</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header with Create Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Total: {pagination.total_users} users
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </button>
          <button
            onClick={() => setShowCreatePaymentModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Create Payment
          </button>
        </div>
      </div>

      {/* Info Panel - Updated for new protection logic */}
      <div className="admin-card p-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          <h4 className="font-medium mb-2">🔒 Active Plan Protection System:</h4>
          <ul className="text-sm space-y-1">
            <li>• <strong>Driver Protection:</strong> Drivers cannot submit payments if they have an active plan</li>
            <li>• <strong>Automatic Rejection:</strong> Backend automatically rejects duplicate plan attempts</li>
            <li>• <strong>Admin Override:</strong> Admins can manually override protection to switch plans</li>
            <li>• <strong>Clean Switching:</strong> Old plan deactivated before new plan activation</li>
            <li>• <strong>Plan Expiry:</strong> Drivers must wait for expiry or contact admin for changes</li>
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Name, email, or phone..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="driver">Driver</option>
              <option value="rider">Rider</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Verification Badge</label>
            <select
              value={filters.is_verified}
              onChange={(e) => handleFilterChange('is_verified', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="1">Has Badge</option>
              <option value="0">No Badge</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ban Status</label>
            <select
              value={filters.is_banned}
              onChange={(e) => handleFilterChange('is_banned', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Users</option>
              <option value="0">Active</option>
              <option value="1">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 admin-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Badge Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="loading-spinner w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading users...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const userSubs = userSubscriptions[user.id] || [];
                  const activeSub = userSubs.find(sub => sub.is_active === 1);
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {user.phone && (
                              <div className="text-xs text-gray-400">{user.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'driver' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === 'driver' ? getPlanStatusBadge(user.id) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.role === 'driver' ? (
                          activeSub ? (
                            <div>
                              <div className="font-medium text-green-600">{activeSub.plan_name}</div>
                              <div className="text-xs">Ends: {formatDate(activeSub.end_date)}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">No active plan</span>
                          )
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          View
                        </button>
                        
                        {/* Badge Management for drivers */}
                        {user.role === 'driver' && (
                          <>
                            {!user.is_verified ? (
                              <button
                                onClick={() => handleUserAction(user, 'verify')}
                                className="text-green-600 hover:text-green-900 mr-3"
                                title="Give verification badge (quality indicator)"
                              >
                                Give Badge
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUserAction(user, 'unverify')}
                                className="text-orange-600 hover:text-orange-900 mr-3"
                                title="Remove verification badge"
                              >
                                Remove Badge
                              </button>
                            )}
                            
                            {/* Plan Management */}
                            {hasActiveSubscription(user.id) ? (
                              <button
                                onClick={() => handleRemovePlan(user)}
                                className="text-red-600 hover:text-red-900 mr-3"
                                title="Remove active plan (enables new plan purchases)"
                              >
                                Remove Plan
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setCreatePaymentForm(prev => ({ ...prev, driver_id: user.id }));
                                  setShowCreatePaymentModal(true);
                                }}
                                className="text-purple-600 hover:text-purple-900 mr-3"
                                title="Create payment record for plan access"
                              >
                                Add Payment
                              </button>
                            )}
                          </>
                        )}
                        
                        {/* Ban/Unban for all users */}
                        {!user.is_banned ? (
                          <button
                            onClick={() => handleUserAction(user, 'ban')}
                            className="text-red-600 hover:text-red-900 mr-3"
                            title="Ban user (removes all access)"
                          >
                            Ban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUserAction(user, 'unban')}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Unban user"
                          >
                            Unban
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.current_page} of {pagination.total_pages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                  disabled={pagination.current_page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value as 'driver' | 'rider' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="rider">Rider</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={createForm.dob}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Place of Living</label>
                <input
                  type="text"
                  value={createForm.place_of_living}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, place_of_living: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Face Photo *</label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setCreateForm(prev => ({ 
                      ...prev, 
                      face_photo: e.target.files?.[0] || undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Photo *</label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setCreateForm(prev => ({ 
                      ...prev, 
                      passport_photo: e.target.files?.[0] || undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Payment Modal (Updated) */}
      {showCreatePaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Create Payment Record</h3>
                <button
                  onClick={() => setShowCreatePaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreatePayment} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <select
                  value={createPaymentForm.driver_id}
                  onChange={(e) => {
                    const driverId = parseInt(e.target.value);
                    setCreatePaymentForm(prev => ({ ...prev, driver_id: driverId }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value={0}>Select a driver</option>
                  {users.filter(user => user.role === 'driver').map(driver => {
                    const driverSubs = userSubscriptions[driver.id] || [];
                    const activeSub = driverSubs.find(sub => sub.is_active === 1);
                    return (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} ({driver.email}){activeSub ? ` - Current: ${activeSub.plan_name}` : ' - No active plan'}
                      </option>
                    );
                  })}
                </select>
                
                {/* Show current plan warning with protection info */}
                {createPaymentForm.driver_id > 0 && (() => {
                  const driverSubs = userSubscriptions[createPaymentForm.driver_id] || [];
                  const activeSub = driverSubs.find(sub => sub.is_active === 1);
                  return activeSub ? (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                      <div className="flex items-start space-x-2">
                        <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <div className="font-medium">🔒 Active Plan Protection Enabled</div>
                          <div className="mt-1">
                            <strong>Current:</strong> {activeSub.plan_name} (expires {formatDate(activeSub.end_date)})
                          </div>
                          <div className="mt-2 text-xs">
                            • <strong>Driver Protection:</strong> This driver cannot submit new payments via the app<br/>
                            • <strong>Admin Override:</strong> You can force plan switching here<br/>
                            • <strong>Recommendation:</strong> Wait for plan expiry or manually deactivate first
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                      ✅ No active plan - driver can freely purchase new plans via app or admin panel.
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={createPaymentForm.plan_id}
                  onChange={(e) => setCreatePaymentForm(prev => ({ ...prev, plan_id: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value={0}>Select a plan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ${plan.price} ({plan.duration_days} days, {plan.max_posts} posts)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID *</label>
                <input
                  type="text"
                  value={createPaymentForm.transaction_id}
                  onChange={(e) => setCreatePaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                  placeholder="Enter payment transaction ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={createPaymentForm.status}
                  onChange={(e) => setCreatePaymentForm(prev => ({ ...prev, status: e.target.value as 'pending' | 'approved' | 'rejected' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="approved">Approved (Grants posting access)</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Note</label>
                <textarea
                  value={createPaymentForm.admin_note}
                  onChange={(e) => setCreatePaymentForm(prev => ({ ...prev, admin_note: e.target.value }))}
                  placeholder="Optional note about this payment"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-sm">
                <strong>⚠️ One Plan Rule:</strong> Each driver can only have one active plan at a time. 
                Approving a new payment will automatically replace any existing active plan.
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreatePaymentModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  Create Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail Modal (existing code) */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedUser.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.dob || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Place of Living</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.place_of_living || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1">{getStatusBadge(selectedUser)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Member Since</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedUser.created_at)}</p>
                </div>
              </div>

              {/* Document Photos */}
              <div className="space-y-4">
                {selectedUser.face_photo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Face Photo</label>
                    <img
                      src={ApiService.getImageUrl(selectedUser.face_photo)}
                      alt="User's face"
                      className="w-32 h-32 object-cover rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NCA0OEM4NCA1OS4wNDU3IDc1LjA0NTcgNjggNjQgNjhDNTIuOTU0MyA2OCA0NCA1OS4wNDU3IDQ0IDQ4QzQ0IDM2Ljk1NDMgNTIuOTU0MyAyOCA2NCAyOEM3NS4wNDU3IDI4IDg0IDM2Ljk1NDMgODQgNDhaIiBmaWxsPSIjOUI5QkEzIi8+CjxwYXRoIGQ9Ik0yNCA5NkM0MC44IDk2IDU2IDkwLjQgNjQgODBDNzIgOTAuNCA4Ny4yIDk2IDEwNCA5NlYxMjhIMjRWOTZaIiBmaWxsPSIjOUI5QkEzIi8+Cjwvc3ZnPgo=';
                      }}
                    />
                  </div>
                )}

                {selectedUser.passport_photo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Document Photo</label>
                    <img
                      src={ApiService.getImageUrl(selectedUser.passport_photo)}
                      alt="User's document"
                      className="w-32 h-32 object-cover rounded-lg border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiAzMkg5NlY5NkgzMlYzMloiIHN0cm9rZT0iIzlCOUJBMyIgc3Ryb2tlLXdpZHRoPSI0IiBmaWxsPSJub25lIi8+CjxwYXRoIGQ9Ik00OCA0OEg4MFY1Nkg0OFY0OFoiIGZpbGw9IiM5QjlCQTMiLz4KPHN0cm9rZSBkPSJNNDggNjRIODBWNzJINDhWNjRaIiBmaWxsPSIjOUI5QkEzIi8+CjxwYXRoIGQ9Ik00OCA4MEg4MFY4OEg0OFY4MFoiIGZpbGw9IiM5QjlCQTMiLz4KPC9zdmc+Cg==';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              {/* Show verification controls for drivers */}
              {selectedUser.role === 'driver' && (
                <>
                  {!selectedUser.is_verified ? (
                    <button
                      onClick={() => handleUserAction(selectedUser, 'verify')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                    >
                      Verify Driver
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserAction(selectedUser, 'unverify')}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200"
                    >
                      Unverify Driver
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setCreatePaymentForm(prev => ({ ...prev, driver_id: selectedUser.id }));
                      setShowModal(false);
                      setShowCreatePaymentModal(true);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                  >
                    Assign to Plan
                  </button>
                </>
              )}
              {!selectedUser.is_banned ? (
                <button
                  onClick={() => handleUserAction(selectedUser, 'ban')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Ban User
                </button>
              ) : (
                <button
                  onClick={() => handleUserAction(selectedUser, 'unban')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  Unban User
                </button>
              )}
              <button
                onClick={() => handleUserAction(selectedUser, 'delete')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement; 