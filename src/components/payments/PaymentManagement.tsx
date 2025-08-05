import React, { useState, useEffect } from 'react';
import { ApiService, Payment, User } from '../../utils/api';

const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    driver_search: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_payments: 0,
    limit: 10
  });
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [adminNote, setAdminNote] = useState('');

  // Track active subscriptions for each driver
  const [driverSubscriptions, setDriverSubscriptions] = useState<{[key: number]: any[]}>({});

  useEffect(() => {
    fetchPayments();
    fetchDrivers();
  }, [filters, pagination.current_page]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await ApiService.getPayments({
        ...filters,
        page: pagination.current_page,
        limit: pagination.limit
      });

      if (response.success) {
        setPayments(response.payments || []);
        const newPagination = {
          current_page: response.pagination?.current_page || pagination.current_page,
          total_pages: response.pagination?.total_pages || pagination.total_pages,
          total_payments: response.pagination?.total_payments || 0,
          limit: response.pagination?.limit || pagination.limit
        };
        setPagination(newPagination);
        
        // After getting payments, fetch subscription data for each driver
        await fetchDriverSubscriptions(response.payments || []);
      } else {
        setError(response.message || 'Failed to fetch payments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await ApiService.getUsers({ role: 'driver', limit: 1000 });
      if (response.success) {
        setDrivers(response.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
    }
  };

  const fetchDriverSubscriptions = async (paymentList: Payment[]) => {
    const subscriptionData: {[key: number]: any[]} = {};
    // Fix: Use Array.from instead of spread operator
    const uniqueDriverIds = Array.from(new Set(paymentList.map(p => p.driver_id)));

    for (const driverId of uniqueDriverIds) {
      try {
        const userDetails = await ApiService.getUser(driverId);
        if (userDetails.success && userDetails.subscriptions) {
          subscriptionData[driverId] = userDetails.subscriptions;
        }
      } catch (err) {
        console.warn(`Failed to fetch subscriptions for driver ${driverId}:`, err);
      }
    }
    setDriverSubscriptions(subscriptionData);
  };

  const handlePaymentAction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPayment) return;
    
    try {
      setError('');
      
      // Check if payment is in a valid state for action
      if (selectedPayment.payment_subscription_status === 'removed' || 
          selectedPayment.payment_subscription_status === 'superseded') {
        setError('Cannot process payments that have been removed or superseded');
        return;
      }
      
      // Block actions on blocked payments
      if (selectedPayment.payment_subscription_status === 'blocked') {
        setError('Cannot approve blocked payments - driver already has an active subscription');
        return;
      }
      
      // Additional validation for reject action
      if (actionType === 'reject' && selectedPayment.status !== 'pending') {
        setError('Can only reject pending payments');
        return;
      }
      
      // Additional validation for approve action  
      if (actionType === 'approve' && selectedPayment.status !== 'pending') {
        setError('Can only approve pending payments');
        return;
      }
      
      let response;
      
      if (actionType === 'approve') {
        response = await ApiService.approvePayment(selectedPayment.id, adminNote);
      } else {
        if (!adminNote.trim()) {
          setError('Admin note is required when rejecting payments');
          return;
        }
        response = await ApiService.rejectPayment(selectedPayment.id, adminNote);
      }
      
      if (response.success) {
        fetchPayments(); // Refresh all data
        setShowModal(false);
        setSelectedPayment(null);
        setAdminNote('');
        
        // Show success message
        const action = actionType === 'approve' ? 'approved' : 'rejected';
        alert(`✅ Payment ${action} successfully!`);
      } else {
        setError(response.message || 'Action failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Payment action error:', err);
    }
  };

  // Add refresh function
  const handleRefresh = async () => {
    await fetchPayments();
  };

  const openActionModal = (payment: Payment, action: 'approve' | 'reject') => {
    setSelectedPayment(payment);
    setActionType(action);
    setAdminNote('');
    setShowModal(true);
  };

  // Add deactivate handler
  const handleDeactivatePlan = async (payment: Payment) => {
    const confirmMessage = `⚠️ DEACTIVATE PLAN for ${payment.driver_name}?\n\nPlan: ${payment.plan_name}\nTransaction: ${payment.transaction_id}\n\nThis will:\n• Remove active subscription\n• Block posting access\n• Allow driver to purchase new plans\n\nContinue?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setError('');
      
      // Find the subscription ID for this driver's active plan
      const driverSubs = driverSubscriptions[payment.driver_id] || [];
      const activeSub = driverSubs.find(sub => sub.is_active === 1);
      
      if (!activeSub) {
        setError('No active subscription found to deactivate');
        return;
      }
      
      // Remove the subscription
      await ApiService.removeSubscription(activeSub.id);
      
      // Refresh the data
      await fetchPayments();
      
      alert(`✅ Plan deactivated successfully!\n\n${payment.driver_name} can now purchase new plans.`);
      
    } catch (err: any) {
      console.error('Error deactivating plan:', err);
      setError(err.message || 'Failed to deactivate plan');
    }
  };

  // Use backend-calculated status with the new timing-based logic
  const getStatusBadge = (payment: Payment) => {
    let statusElement;
    let warningElement = null;
    
    // Use the backend-calculated payment_subscription_status
    const backendStatus = payment.payment_subscription_status;
    
    switch (payment.status) {
      case 'pending':
        if (backendStatus === 'blocked') {
          statusElement = <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">Pending</span>;
          warningElement = <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">🔒 Blocked</span>;
        } else {
          statusElement = <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">Pending</span>;
        }
        break;
        
      case 'approved':
        switch (backendStatus) {
          case 'active':
            statusElement = <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">✓ Active Plan</span>;
            break;
          case 'superseded':
            statusElement = <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">📋 Old Plan</span>;
            break;
          case 'removed':
            statusElement = <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">Removed by Admin</span>;
            break;
          default:
            statusElement = <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">Ended</span>;
        }
        break;
        
      case 'rejected':
        statusElement = <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Rejected</span>;
        break;
        
      default:
        statusElement = <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">{payment.status}</span>;
    }

    return (
      <div className="flex flex-col space-y-1">
        {statusElement}
        {warningElement}
      </div>
    );
  };

  const getDriverPlanInfo = (payment: Payment) => {
    const driverSubs = driverSubscriptions[payment.driver_id] || [];
    const activeSub = driverSubs.find(sub => sub.is_active === 1);
    
    if (!activeSub) {
      return <span className="text-gray-400 text-xs">No active plan</span>;
    }
    
    // FIX: Only show as "this payment" if it's actually the ACTIVE payment according to backend
    const isActivePayment = payment.payment_subscription_status === 'active';
    const isPlanMatch = activeSub.plan_id === payment.plan_id;
    
    return (
      <div className="text-xs">
        <div className={`font-medium ${isActivePayment ? 'text-green-600' : 'text-orange-600'}`}>
          Current: {activeSub.plan_name}
        </div>
        <div className="text-gray-500">
          Expires: {formatDate(activeSub.end_date)}
        </div>
        {isActivePayment && (
          <div className="text-green-600 font-medium">← This Payment</div>
        )}
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

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Payment Management</h2>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Total: {pagination.total_payments} payments
          </span>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm flex items-center"
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Info Panel - New protection info */}
      <div className="admin-card p-4">
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
          <h4 className="font-medium mb-2">🔒 Payment Protection System:</h4>
          <ul className="text-sm space-y-1">
            <li>• <strong>Protected Payments:</strong> Drivers with active plans cannot submit new payments via app</li>
            <li>• <strong>Active Plan:</strong> Only one approved payment can be active per driver</li>
            <li>• <strong>Admin Override:</strong> You can approve protected payments (will deactivate old plan)</li>
            <li>• <strong>Status Guide:</strong> "Active Plan" = currently giving posting access, "Approved (Inactive)" = superseded by newer plan</li>
          </ul>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Driver Search</label>
            <input
              type="text"
              placeholder="Search driver name..."
              value={filters.driver_search}
              onChange={(e) => setFilters({...filters, driver_search: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Payments Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 admin-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Plan Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="loading-spinner w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading payments...</p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments
                  .filter(payment => {
                    if (filters.driver_search) {
                      return payment.driver_name.toLowerCase().includes(filters.driver_search.toLowerCase());
                    }
                    return true;
                  })
                  .map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{payment.driver_name}</div>
                        <div className="text-sm text-gray-500">{payment.driver_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{payment.plan_name}</div>
                        <div className="text-sm text-gray-500">{payment.duration_days} days</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getDriverPlanInfo(payment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">{payment.transaction_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatPrice(payment.price)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {payment.status === 'pending' && payment.payment_subscription_status !== 'blocked' ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openActionModal(payment, 'approve')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openActionModal(payment, 'reject')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      ) : payment.status === 'pending' && payment.payment_subscription_status === 'blocked' ? (
                        <span className="text-red-500 text-xs">🔒 Blocked</span>
                      ) : payment.status === 'approved' && payment.payment_subscription_status === 'active' ? (
                        <div className="flex flex-col space-y-1">
                          <span className="text-green-600 font-medium text-xs">✓ Active</span>
                          <button
                            onClick={() => handleDeactivatePlan(payment)}
                            className="text-red-600 hover:text-red-900 text-xs underline"
                          >
                            Deactivate
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500">No Action Available</span>
                      )}
                    </td>
                  </tr>
                ))
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

      {/* Action Modal */}
      {showModal && selectedPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
                </h3>
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

            <div className="px-6 py-4">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900">Payment Details:</h4>
                <div className="mt-2 text-sm text-gray-600">
                  <p><strong>Driver:</strong> {selectedPayment.driver_name}</p>
                  <p><strong>Plan:</strong> {selectedPayment.plan_name}</p>
                  <p><strong>Amount:</strong> {formatPrice(selectedPayment.price)}</p>
                  <p><strong>Transaction ID:</strong> {selectedPayment.transaction_id}</p>
                </div>
              </div>

              {/* Show protection warning if applicable */}
              {actionType === 'approve' && (() => {
                const driverSubs = driverSubscriptions[selectedPayment.driver_id] || [];
                const activeSub = driverSubs.find(sub => sub.is_active === 1);
                return activeSub ? (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                    <strong>⚠️ Protection Override Warning:</strong><br/>
                    This driver has an active plan: {activeSub.plan_name}<br/>
                    Approving will deactivate the current plan and activate this one.
                  </div>
                ) : null;
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Note {actionType === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    actionType === 'approve' 
                      ? 'Optional note about approval...' 
                      : 'Required: Reason for rejection...'
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentAction}
                className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagement; 