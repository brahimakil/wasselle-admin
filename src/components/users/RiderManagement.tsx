import React, { useState, useEffect, useCallback } from 'react';
import { ApiService, User } from '../../utils/api';
import ConfirmationModal from '../common/ConfirmationModal';
import { useConfirmation } from '../../hooks/useConfirmation';

const RiderManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // FIX 2: ADD missing confirmation hook (after line 7)
  const { confirmationState, showConfirmation } = useConfirmation();
  
  const [filters, setFilters] = useState({
    search: '',
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

  // Create user modal states  
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  // Add view modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewUser, setViewUser] = useState<User | null>(null);

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

  // FIX 3: ADD missing handleBanUpdate function (add this anywhere before the return statement)
  const handleBanUpdate = async (userId: number, newStatus: 0 | 1) => {
    const statusText = newStatus === 1 ? 'ban' : 'unban';
    
    const confirmed = await showConfirmation({
      title: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} Rider`,
      message: `Are you sure you want to ${statusText} this rider?`,
      type: newStatus === 1 ? 'danger' : 'info',
      confirmText: statusText.charAt(0).toUpperCase() + statusText.slice(1),
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      setError('');
      const response = await ApiService.updateUser({
        id: userId,
        is_banned: newStatus
      });
      
      if (response.success) {
        fetchUsers();
      } else {
        setError(response.message || `Failed to ${statusText} rider`);
      }
    } catch (err) {
      console.error('Ban update error:', err);
      setError(err instanceof Error ? err.message : `Failed to ${statusText} rider`);
    }
  };

  // FIX 4: Make fetchUsers a useCallback (replace the existing fetchUsers function)
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await ApiService.getUsers({
        ...filters,
        role: 'rider',
        page: pagination.current_page,
        limit: pagination.limit
      });

      if (response.success) {
        setUsers(response.users || []);
        setPagination(prev => ({
          ...prev,
          current_page: response.pagination?.current_page || prev.current_page,
          total_pages: response.pagination?.total_pages || prev.total_pages,
          total_users: response.pagination?.total_users || 0,
          limit: response.pagination?.limit || prev.limit
        }));
      } else {
        setError(response.message || 'Failed to fetch riders');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch riders');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.current_page, pagination.limit]);

  // FIX 5: Update useEffect (replace the existing useEffect)
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUpdateUser = async (userData: Partial<User>) => {
    if (!selectedUser) return;
    
    try {
      setError('');
      await ApiService.updateUser({ id: selectedUser.id, ...userData });
      setShowModal(false);
      setSelectedUser(null);
      fetchUsers();
      alert('Rider updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
          role: 'rider',
          phone: '',
          dob: '',
          place_of_living: '',
          face_photo: undefined,
          passport_photo: undefined
        });
        fetchUsers();
        alert('Rider created successfully!');
      } else {
        setError(response.message || 'Failed to create rider');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create rider');
    }
  };

  const handleAccountStatusUpdate = async (userId: number, newStatus: 'pending' | 'active') => {
    const statusText = newStatus === 'active' ? 'activate' : 'set to pending';
    
    const confirmed = await showConfirmation({
      title: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} Account`,
      message: `Are you sure you want to ${statusText} this rider's account? This will ${newStatus === 'active' ? 'allow the rider to access app features' : 'block the rider from using the app'}.`,
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
      if (user.is_banned === 1) {
        badges.push(
          <span key="banned" className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
            🚫 Banned Rider
          </span>
        );
      } else {
        badges.push(
          <span key="active" className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            ✅ Active Rider
          </span>
        );
      }
    }
    
    return <div className="flex flex-wrap gap-1">{badges}</div>;
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

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Rider Management</h2>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add New Rider
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search riders..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* ADD Account Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
            <select
              value={filters.account_status}
              onChange={(e) => setFilters({...filters, account_status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="pending">Pending Approval</option>
              <option value="active">Active</option>
            </select>
          </div>
          {/* Keep existing ban filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ban Status</label>
            <select
              value={filters.is_banned}
              onChange={(e) => setFilters({...filters, is_banned: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Riders</option>
              <option value="0">Active</option>
              <option value="1">Banned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Riders Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading riders...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No riders found</td>
                </tr>
              ) : (
                users.map((user) => (
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
                      {getStatusBadge(user)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.place_of_living || 'Not specified'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        {/* Account Status Controls (first priority) */}
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
                        
                        {/* MOVED: View Details - Always available */}
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-gray-600 hover:text-gray-900 text-xs"
                        >
                          View Details
                        </button>
                        
                        {/* Ban controls - only show for active accounts */}
                        {user.account_status === 'active' && (
                          <>
                            {user.is_banned === 1 ? (
                              <button
                                onClick={() => handleBanUpdate(user.id, 0)}
                                className="text-green-600 hover:text-green-900 text-xs"
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBanUpdate(user.id, 1)}
                                className="text-red-600 hover:text-red-900 text-xs"
                              >
                                Ban
                              </button>
                            )}
                          </>
                        )}
                      </div>
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
                Showing {((pagination.current_page - 1) * pagination.limit) + 1} to {Math.min(pagination.current_page * pagination.limit, pagination.total_users)} of {pagination.total_users} riders
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

      {/* Edit Rider Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Rider</h3>
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
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  defaultValue={selectedUser.phone || ''}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setSelectedUser(prev => prev ? { ...prev, phone: e.target.value } : null)}
                />
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
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUser(selectedUser)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Rider Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Rider</h3>
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
                      role: 'rider',
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
                  Create Rider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Rider Modal */}
      {showViewModal && viewUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Rider Details</h3>
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
                  
                  {/* FIXED: Show all statuses clearly */}
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Account Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${viewUser.account_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {viewUser.account_status === 'active' ? '✅ Active' : '⏳ Pending Approval'}
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

export default RiderManagement; 