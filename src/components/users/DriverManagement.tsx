import React, { useState, useEffect } from 'react';
import { ApiService, User, Plan } from '../../utils/api';
import ConfirmationModal from '../common/ConfirmationModal';
import { useConfirmation } from '../../hooks/useConfirmation';

const DriverManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    gender: '',
    is_verified: '',
    is_banned: '',
    account_status: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_users: 0,
    limit: 10
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState<{[key: number]: any[]}>({});
  
  // Create payment modal states
  const [showCreatePaymentModal, setShowCreatePaymentModal] = useState(false);
  const [createPaymentForm, setCreatePaymentForm] = useState({
    driver_id: 0,
    plan_id: 0,
    transaction_id: '',
    status: 'approved' as 'pending' | 'approved' | 'rejected',
    admin_note: ''
  });

  // Create user modal states  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'driver' as 'driver' | 'rider',
    phone: '',
    dob: '',
    place_of_living: '',
    face_photo: undefined as File | undefined,
    passport_photo: undefined as File | undefined
  });

  // Add view modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);

  // Add state to track if selected driver has active plan
  const [driverHasActivePlan, setDriverHasActivePlan] = useState(false);
  const [activeDriverPlan, setActiveDriverPlan] = useState<any>(null);

  // Add new state for ratings modal
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [selectedDriverForRatings, setSelectedDriverForRatings] = useState<User | null>(null);
  const [driverRatings, setDriverRatings] = useState<any>(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);
  const [ratingsPagination, setRatingsPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total: 0,
    per_page: 20
  });

  // Add function to check driver's current plan when selected
  const handleDriverSelection = (driverId: number) => {
    setCreatePaymentForm(prev => ({ ...prev, driver_id: driverId }));
    
    // Check if this driver has an active plan
    const driverSubs = userSubscriptions[driverId] || [];
    const activeSub = driverSubs.find(sub => sub.is_active === 1);
    
    if (activeSub) {
      setDriverHasActivePlan(true);
      setActiveDriverPlan(activeSub);
    } else {
      setDriverHasActivePlan(false);
      setActiveDriverPlan(null);
    }
  };

  // Reset warning when modal closes
  const closeCreatePaymentModal = () => {
    setShowCreatePaymentModal(false);
    setCreatePaymentForm({
      driver_id: 0,
      plan_id: 0,
      transaction_id: '',
      status: 'approved',
      admin_note: ''
    });
    setDriverHasActivePlan(false);
    setActiveDriverPlan(null);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await ApiService.getUsers({
        ...filters,
        role: 'driver', // Only fetch drivers
        page: pagination.current_page,
        limit: pagination.limit
      });

      if (response.success) {
        setUsers(response.users || []);
        
        // Fetch subscriptions for each driver
        const subscriptionData: {[key: number]: any[]} = {};
        for (const user of response.users || []) {
          try {
            const userDetails = await ApiService.getUser(user.id);
            if (userDetails.success && userDetails.subscriptions) {
              subscriptionData[user.id] = userDetails.subscriptions;
            }
          } catch (err) {
            console.warn(`Failed to fetch subscriptions for user ${user.id}`);
          }
        }
        setUserSubscriptions(subscriptionData);
        
        setPagination(prev => ({
          ...prev,
          current_page: response.pagination?.current_page || prev.current_page,
          total_pages: response.pagination?.total_pages || prev.total_pages,
          total_users: response.pagination?.total_users || 0,
          limit: response.pagination?.limit || prev.limit
        }));
      } else {
        setError(response.message || 'Failed to fetch drivers');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters, pagination.current_page]);

  useEffect(() => {
    // Fetch plans for payment creation
    ApiService.getPlans().then(response => {
      if (response.success) {
        setPlans(response.plans || []);
      }
    });
  }, []);

  const handleUpdateUser = async (userData: Partial<User>) => {
    if (!selectedUser) return;
    
    try {
      setError('');
      await ApiService.updateUser({ id: selectedUser.id, ...userData });
      setShowModal(false);
      setSelectedUser(null);
      fetchUsers();
      alert('Driver updated successfully!');
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
      
      // Step 1: If driver has active plan and we're approving, remove old plan first
      if (driverHasActivePlan && activeDriverPlan && createPaymentForm.status === 'approved') {
        try {
          console.log(`Removing existing plan ${activeDriverPlan.id} for driver ${createPaymentForm.driver_id}`);
          await ApiService.removeSubscription(activeDriverPlan.id);
          console.log('✅ Old plan removed successfully');
          
          // Also reject old payments for this plan
          try {
            const driverPaymentsResponse = await ApiService.getDriverPayments(createPaymentForm.driver_id);
            if (driverPaymentsResponse.success && driverPaymentsResponse.payments) {
              const oldPlanPayments = driverPaymentsResponse.payments.filter(
                (payment: any) => payment.plan_id === activeDriverPlan.plan_id && payment.status === 'approved'
              );
              
              for (const payment of oldPlanPayments) {
                try {
                  await ApiService.rejectPayment(
                    payment.id, 
                    `Plan replaced by admin on ${new Date().toLocaleString()}`
                  );
                  console.log(`✅ Rejected old payment: ${payment.transaction_id}`);
                } catch (paymentErr) {
                  console.warn(`⚠️ Failed to reject payment ${payment.id}:`, paymentErr);
                }
              }
            }
          } catch (paymentErr) {
            console.warn('Failed to reject old payments:', paymentErr);
          }
          
        } catch (removeErr) {
          console.error('Failed to remove old plan:', removeErr);
          setError('Failed to remove existing plan. Please try again.');
          return;
        }
      }
      
      // Step 2: Create payment record
      const response = await ApiService.createPayment(createPaymentForm);
      console.log('Payment creation response:', response);
      
      if (response.success) {
        // Step 3: If approved, create new subscription
        if (createPaymentForm.status === 'approved') {
          try {
            const subscriptionResponse = await ApiService.assignDriverToPlan({
              driver_id: createPaymentForm.driver_id,
              plan_id: createPaymentForm.plan_id,
              start_date: new Date().toISOString().split('T')[0]
            });
            
            if (subscriptionResponse.success) {
              console.log('✅ New subscription created successfully:', subscriptionResponse.message);
            } else {
              throw new Error(subscriptionResponse.message || 'Failed to create subscription');
            }
            
          } catch (subscriptionErr: any) {
            console.error('Failed to create subscription after payment:', subscriptionErr);
            setError(`Payment created but failed to activate subscription: ${subscriptionErr.message}`);
            return;
          }
        }
        
        closeCreatePaymentModal();
        fetchUsers();
        
        const selectedDriver = users.find(u => u.id === createPaymentForm.driver_id);
        const selectedPlan = plans.find(p => p.id === createPaymentForm.plan_id);
        
        const successMessage = driverHasActivePlan 
          ? `✅ Plan REPLACED successfully!\n\n${selectedDriver?.name} now has: ${selectedPlan?.name}\n\nPrevious plan (${activeDriverPlan?.plan_name}) was deactivated.`
          : `✅ Plan ASSIGNED successfully!\n\n${selectedDriver?.name} now has: ${selectedPlan?.name}`;
        
        alert(successMessage);
        
      } else {
        setError(response.message || 'Failed to create payment');
      }
    } catch (err: any) {
      console.error('Payment creation error:', err);
      setError(err.message || 'Failed to create payment');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setError('Name, email, and password are required');
      return;
    }

    try {
      setError('');
      const response = await ApiService.createUser(createForm);
      
      if (response.success) {
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          email: '',
          password: '',
          role: 'driver',
          phone: '',
          dob: '',
          place_of_living: '',
          face_photo: undefined,
          passport_photo: undefined
        });
        fetchUsers();
        alert('Driver created successfully!');
      } else {
        setError(response.message || 'Failed to create driver');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create driver');
    }
  };

  // Add this function to open view modal
  const handleViewUser = async (user: User) => {
    try {
      setError('');
      // Get full user details including photos
      const response = await ApiService.getUser(user.id);
      if (response.success && response.user) {
        setViewUser(response.user);
        setShowViewModal(true);
      } else {
        setError('Failed to load user details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load user details');
    }
  };

  // Add function to handle viewing ratings
  const handleViewRatings = async (user: User, page: number = 1) => {
    try {
      setRatingsLoading(true);
      setSelectedDriverForRatings(user);
      setShowRatingsModal(true);
      
      const response = await ApiService.getDriverRatings(user.id, { page, limit: 20 });
      
      if (response.success) {
        setDriverRatings(response);
        setRatingsPagination({
          current_page: response.pagination.current_page,
          total_pages: response.pagination.total_pages,
          total: response.pagination.total,
          per_page: response.pagination.per_page
        });
      } else {
        setError('Failed to load driver ratings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load driver ratings');
    } finally {
      setRatingsLoading(false);
    }
  };

  // Add function to close ratings modal
  const closeRatingsModal = () => {
    setShowRatingsModal(false);
    setSelectedDriverForRatings(null);
    setDriverRatings(null);
    setRatingsPagination({
      current_page: 1,
      total_pages: 1,
      total: 0,
      per_page: 20
    });
  };

  // Add function to render star rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  const getStatusBadge = (user: User) => {
    const badges = [];
    
    // ADD Account Status Badge (highest priority)
    if (user.account_status === 'pending') {
      badges.push(
        <span key="account" className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
          ⏳ Pending Approval
        </span>
      );
    } else if (user.account_status === 'active') {
      badges.push(
        <span key="account" className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
          ✅ Active Account
        </span>
      );
    }
    
    // Keep existing verification logic
    if (user.is_banned) {
      badges.push(<span key="banned" className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Banned</span>);
    } else if (user.is_verified) {
      badges.push(<span key="verified" className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">✓ Verified Driver</span>);
    } else {
      badges.push(<span key="unverified" className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">Unverified</span>);
    }
    
    return <div className="flex flex-wrap gap-1">{badges}</div>;
  };

  const getPlanStatus = (user: User) => {
    const driverSubs = userSubscriptions[user.id] || [];
    const activeSub = driverSubs.find(sub => sub.is_active === 1);
    
    if (!activeSub) {
      return <span className="text-gray-400 text-xs">No active plan</span>;
    }
    
    const isExpired = new Date(activeSub.end_date) < new Date();
    
    return (
      <div className="text-xs">
        <div className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
          {activeSub.plan_name}
        </div>
        <div className="text-gray-500">
          {isExpired ? 'Expired: ' : 'Expires: '}{formatDate(activeSub.end_date)}
        </div>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const { confirmationState, showConfirmation } = useConfirmation();

  const handleAccountStatusUpdate = async (userId: number, newStatus: 'pending' | 'active') => {
    const statusText = newStatus === 'active' ? 'activate' : 'set to pending';
    
    const confirmed = await showConfirmation({
      title: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} Account`,
      message: `Are you sure you want to ${statusText} this driver's account? This will ${newStatus === 'active' ? 'allow the driver to access app features' : 'block the driver from using the app'}.`,
      type: newStatus === 'active' ? 'info' : 'warning',
      confirmText: statusText.charAt(0).toUpperCase() + statusText.slice(1),
      cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    try {
      setError('');
      const response = await ApiService.updateUser({
        id: userId,
        account_status: newStatus
      });
      
      if (response.success) {
        fetchUsers(); // Refresh the list
      } else {
        setError(response.message || `Failed to ${statusText} account`);
      }
    } catch (err) {
      console.error('Account status update error:', err);
      setError(err instanceof Error ? err.message : `Failed to ${statusText} account`);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Driver Management</h2>
        <div className="mt-4 sm:mt-0 space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add New Driver
          </button>
          <button
            onClick={() => setShowCreatePaymentModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Assign to Plan
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={filters.gender}
              onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
            <select
              value={filters.is_verified}
              onChange={(e) => setFilters(prev => ({ ...prev, is_verified: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Drivers</option>
              <option value="1">Verified</option>
              <option value="0">Unverified</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ban Status</label>
            <select
              value={filters.is_banned}
              onChange={(e) => setFilters(prev => ({ ...prev, is_banned: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="0">Active</option>
              <option value="1">Banned</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
            <select
              value={filters.account_status}
              onChange={(e) => setFilters({...filters, account_status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending Approval</option>
              <option value="active">Active</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setPagination(prev => ({ ...prev, current_page: 1 }))}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">Loading drivers...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">No drivers found</td>
                </tr>
              ) : (
                users.map(user => {
                  const userSubs = userSubscriptions[user.id] || [];
                  const activeSub = userSubs.find(sub => sub.is_active === 1);
                  
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                        <div className="text-sm text-gray-500">{user.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.gender === 'male' 
                            ? 'bg-blue-100 text-blue-700' 
                            : user.gender === 'female'
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not specified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPlanStatus(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleViewRatings(user)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            View Ratings
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          {(() => {
                            const driverSubs = userSubscriptions[user.id] || [];
                            const activeSub = driverSubs.find(sub => sub.is_active === 1);
                            return activeSub ? (
                              <button
                                onClick={() => handleRemovePlan(user)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Remove Plan
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setCreatePaymentForm(prev => ({ ...prev, driver_id: user.id }));
                                  setShowCreatePaymentModal(true);
                                }}
                                className="text-green-600 hover:text-green-900"
                              >
                                Assign Plan
                              </button>
                            );
                          })()}
                          {user.account_status === 'pending' ? (
                            <button
                              onClick={() => handleAccountStatusUpdate(user.id, 'active')}
                              className="text-green-600 hover:text-green-900 text-xs"
                            >
                              Activate Account
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAccountStatusUpdate(user.id, 'pending')}
                              className="text-yellow-600 hover:text-yellow-900 text-xs"
                            >
                              Set to Pending
                            </button>
                          )}
                        </div>
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
                Showing {((pagination.current_page - 1) * pagination.limit) + 1} to {Math.min(pagination.current_page * pagination.limit, pagination.total_users)} of {pagination.total_users} drivers
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current_page: Math.max(1, prev.current_page - 1) }))}
                  disabled={pagination.current_page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current_page: Math.min(pagination.total_pages, prev.current_page + 1) }))}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Driver Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Driver</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  defaultValue={selectedUser.name}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  defaultValue={selectedUser.email}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  value={selectedUser.gender || ''}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, gender: e.target.value as 'male' | 'female' } : null)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  defaultValue={selectedUser.phone || ''}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, phone: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  defaultValue={selectedUser.dob || ''}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, dob: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Place of Living</label>
                <input
                  type="text"
                  defaultValue={selectedUser.place_of_living || ''}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, place_of_living: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Verification Status</label>
                <select
                  value={selectedUser.is_verified ? '1' : '0'}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, is_verified: parseInt(e.target.value) } : null)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Unverified</option>
                  <option value="1">Verified</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ban Status</label>
                <select
                  value={selectedUser.is_banned ? '1' : '0'}
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, is_banned: parseInt(e.target.value) } : null)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0">Active</option>
                  <option value="1">Banned</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUser(selectedUser)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Payment Modal */}
      {showCreatePaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Driver to Plan</h3>
            
            {/* Warning for existing active plan */}
            {driverHasActivePlan && activeDriverPlan && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      ⚠️ Driver Has Active Plan
                    </h4>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p><strong>Current Plan:</strong> {activeDriverPlan.plan_name}</p>
                      <p><strong>Expires:</strong> {formatDate(activeDriverPlan.end_date)}</p>
                      <p className="mt-2 font-medium">
                        🔄 Assigning a new plan will:
                      </p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>❌ Deactivate the current plan</li>
                        <li>❌ Reject current plan payments</li>
                        <li>✅ Activate the new plan immediately</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Driver</label>
                <select
                  value={createPaymentForm.driver_id}
                  onChange={(e) => handleDriverSelection(parseInt(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={0}>Select Driver</option>
                  {users.map(user => {
                    const driverSubs = userSubscriptions[user.id] || [];
                    const activeSub = driverSubs.find(sub => sub.is_active === 1);
                    return (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) {activeSub ? '⚠️ Has Active Plan' : '✅ Available'}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Plan</label>
                <select
                  value={createPaymentForm.plan_id}
                  onChange={(e) => setCreatePaymentForm(prev => ({ ...prev, plan_id: parseInt(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value={0}>Select Plan</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                <input
                  type="text"
                  value={createPaymentForm.transaction_id}
                  onChange={(e) => setCreatePaymentForm(prev => ({ ...prev, transaction_id: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter transaction ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={createPaymentForm.status}
                  onChange={(e) => setCreatePaymentForm(prev => ({ ...prev, status: e.target.value as 'pending' | 'approved' | 'rejected' }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="approved">Approved (Activate Immediately)</option>
                  <option value="pending">Pending (Requires Approval)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Admin Note</label>
                <textarea
                  value={createPaymentForm.admin_note}
                  onChange={(e) => setCreatePaymentForm(prev => ({ ...prev, admin_note: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional admin note"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeCreatePaymentModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-md ${
                    driverHasActivePlan 
                      ? 'bg-orange-600 hover:bg-orange-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {driverHasActivePlan ? '⚠️ Replace Plan' : 'Assign & Finish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Driver Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Driver</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  value={createForm.dob}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, dob: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Place of Living</label>
                <input
                  type="text"
                  value={createForm.place_of_living}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, place_of_living: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Face Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCreateForm(prev => ({ ...prev, face_photo: e.target.files?.[0] }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Passport/ID Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCreateForm(prev => ({ ...prev, passport_photo: e.target.files?.[0] }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      name: '',
                      email: '',
                      password: '',
                      role: 'driver',
                      phone: '',
                      dob: '',
                      place_of_living: '',
                      face_photo: undefined,
                      passport_photo: undefined
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Driver Modal */}
      {showViewModal && viewUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Driver Details</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <p className="text-sm text-gray-900">{viewUser.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{viewUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm text-gray-900">{viewUser.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                    <p className="text-sm text-gray-900">{viewUser.dob || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Place of Living</label>
                    <p className="text-sm text-gray-900">{viewUser.place_of_living || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Role</label>
                    <p className="text-sm text-gray-900 capitalize">{viewUser.role}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Gender</label>
                    <p className="text-sm text-gray-900 capitalize">{viewUser.gender || 'Not specified'}</p>
                  </div>
                  {/* FIXED: Show all statuses clearly for drivers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Account Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${viewUser.account_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {viewUser.account_status === 'active' ? '✅ Active' : '⏳ Pending Approval'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Verification Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${viewUser.is_verified === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {viewUser.is_verified === 1 ? '⭐ Verified Driver' : 'Unverified'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ban Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${viewUser.is_banned === 1 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {viewUser.is_banned === 1 ? '🚫 Banned' : '✅ Not Banned'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Joined Date</label>
                    <p className="text-sm text-gray-900">{formatDate(viewUser.created_at)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">User ID</label>
                    <p className="text-sm text-gray-900">#{viewUser.id}</p>
                  </div>
                </div>

                {/* Current Plan Status */}
                <div className="pt-4">
                  <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Current Plan Status</h4>
                  <div className="mt-2">
                    {getPlanStatus(viewUser)}
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-800 border-b pb-2">Uploaded Documents</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Face Photo</label>
                  {viewUser.face_photo ? (
                    <div className="border rounded-lg p-2">
                      <img 
                        src={`/api/proxy?path=uploads/image.php&image=${encodeURIComponent(viewUser.face_photo)}`}
                        alt="Face ID"
                        className="w-full h-48 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%236b7280">No Image</text></svg>';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <p className="text-gray-500">No face photo uploaded</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Passport/ID Photo</label>
                  {viewUser.passport_photo ? (
                    <div className="border rounded-lg p-2">
                      <img 
                        src={`/api/proxy?path=uploads/image.php&image=${encodeURIComponent(viewUser.passport_photo)}`}
                        alt="ID Document"
                        className="w-full h-48 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%236b7280">No Image</text></svg>';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <p className="text-gray-500">No passport/ID photo uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setViewUser(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Ratings Modal */}
      {showRatingsModal && selectedDriverForRatings && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Driver Ratings - {selectedDriverForRatings.name}
              </h3>
              <button
                onClick={closeRatingsModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {ratingsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading ratings...</span>
              </div>
            ) : driverRatings ? (
              <div className="space-y-6">
                {/* Driver Info & Stats */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Driver Basic Info */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Driver Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Name:</span> {driverRatings.driver.name}</p>
                        <p><span className="font-medium">Email:</span> {driverRatings.driver.email}</p>
                        <p><span className="font-medium">ID:</span> #{driverRatings.driver.id}</p>
                      </div>
                    </div>

                    {/* Rating Stats */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Rating Statistics</h4>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          {renderStars(driverRatings.stats.average_rating)}
                          <span className="ml-2 text-lg font-bold text-gray-900">
                            {driverRatings.stats.average_rating.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Based on {driverRatings.stats.total_ratings} rating{driverRatings.stats.total_ratings !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Rating Breakdown */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Rating Breakdown</h4>
                      <div className="space-y-1 text-sm">
                        {[5, 4, 3, 2, 1].map(star => (
                          <div key={star} className="flex items-center justify-between">
                            <span className="flex items-center">
                              <span className="w-4 text-right">{star}</span>
                              <svg className="w-3 h-3 ml-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </span>
                            <span className="font-medium">
                              {driverRatings.stats.rating_breakdown[`${star}_star`] || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Ratings */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-4">Individual Ratings & Comments</h4>
                  
                  {driverRatings.ratings && driverRatings.ratings.length > 0 ? (
                    <div className="space-y-4">
                      {driverRatings.ratings.map((rating: any, index: number) => (
                        <div key={rating.id || index} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center mb-1">
                                {renderStars(rating.rating)}
                                <span className="ml-2 text-sm text-gray-500">
                                  {formatDate(rating.created_at)}
                                </span>
                              </div>
                              <p className="font-medium text-gray-900">{rating.rater_name}</p>
                              <p className="text-sm text-gray-600">{rating.rater_email}</p>
                            </div>
                            <div className="text-right text-sm text-gray-600">
                              <p><span className="font-medium">Trip:</span> {rating.from_country} → {rating.to_country}</p>
                              {rating.from_to_description && (
                                <p className="text-xs mt-1">{rating.from_to_description}</p>
                              )}
                            </div>
                          </div>
                          
                          {rating.comment && (
                            <div className="bg-gray-50 rounded p-3 mt-3">
                              <p className="text-sm text-gray-700 italic">"{rating.comment}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No ratings found for this driver</p>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {ratingsPagination.total_pages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-gray-700">
                      Showing {((ratingsPagination.current_page - 1) * ratingsPagination.per_page) + 1} to {Math.min(ratingsPagination.current_page * ratingsPagination.per_page, ratingsPagination.total)} of {ratingsPagination.total} ratings
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewRatings(selectedDriverForRatings, Math.max(1, ratingsPagination.current_page - 1))}
                        disabled={ratingsPagination.current_page === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm">
                        Page {ratingsPagination.current_page} of {ratingsPagination.total_pages}
                      </span>
                      <button
                        onClick={() => handleViewRatings(selectedDriverForRatings, Math.min(ratingsPagination.total_pages, ratingsPagination.current_page + 1))}
                        disabled={ratingsPagination.current_page === ratingsPagination.total_pages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Failed to load ratings data</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeRatingsModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmationModal
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        onConfirm={confirmationState.onConfirm}
        onCancel={confirmationState.onCancel}
        type={confirmationState.type}
      />
    </div>
  );
};

export default DriverManagement; 