import React, { useState, useEffect } from 'react';
import { ApiService, Post, User, Country } from '../../utils/api';

const PostManagement: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    driver_id: '',
    country: '',
    is_active: '',
    driver_search: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_posts: 0,
    limit: 10
  });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    from_country: '',
    to_country: '',
    from_to_departure: '',
    to_from_return: '',
    from_to_description: '',
    to_from_description: '',
    phone_visible: 1,
    is_active: 1
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
    fetchDrivers();
    fetchCountries();
  }, [filters, pagination.current_page]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Convert string values to numbers for API call
      const apiParams: {
        page: number;
        limit: number;
        driver_id?: number;
        country?: number;
        is_active?: number;
      } = {
        page: pagination.current_page,
        limit: pagination.limit
      };

      // Only add params if they have values and convert to numbers
      if (filters.driver_id) {
        apiParams.driver_id = parseInt(filters.driver_id);
      }
      if (filters.country) {
        apiParams.country = parseInt(filters.country);
      }
      if (filters.is_active !== '') {
        apiParams.is_active = parseInt(filters.is_active);
      }

      const response = await ApiService.getPosts(apiParams);

      if (response.success) {
        setPosts(response.posts || []);
        if (response.pagination) {
          setPagination({
            current_page: response.pagination.current_page || pagination.current_page,
            total_pages: response.pagination.total_pages || pagination.total_pages,
            total_posts: response.pagination.total_posts || response.pagination.total || 0,
            limit: response.pagination.limit || response.pagination.per_page || pagination.limit
          });
        }
      } else {
        setError(response.message || 'Failed to fetch posts');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await ApiService.getUsers({ role: 'driver', limit: 100 });
      if (response.success) {
        setDrivers(response.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await ApiService.getCountries();
      if (response.success && response.countries) {
        setCountries(response.countries);
      }
    } catch (error) {
      console.error('Failed to fetch countries:', error);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    const selectedPost = posts.find(p => p.id === postId);
    
    try {
      setError('');
      const response = await ApiService.deletePost(postId);
      
      if (response.success) {
        // Backend automatically creates notification
        fetchPosts();
      } else {
        setError(response.message || 'Failed to delete post');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;

    try {
      setError('');
      
      const postData = {
        from_country: parseInt(editFormData.from_country),
        to_country: parseInt(editFormData.to_country),
        from_to_departure: editFormData.from_to_departure,
        to_from_return: editFormData.to_from_return || undefined,
        from_to_description: editFormData.from_to_description,
        to_from_description: editFormData.to_from_description || undefined,
        phone_visible: editFormData.phone_visible ? 1 : 0,
        is_active: editFormData.is_active ? 1 : 0
      };

      const response = await ApiService.updatePost(selectedPost.id, postData);
      
      if (response.success) {
        // Backend automatically creates notification
        setShowEditModal(false);
        setSelectedPost(null);
        fetchPosts();
      } else {
        setError(response.message || 'Failed to update post');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const openEditModal = (post: Post) => {
    setSelectedPost(post);
    setEditFormData({
      from_country: post.from_country.toString(),
      to_country: post.to_country.toString(),
      from_to_departure: post.from_to_departure,
      to_from_return: post.to_from_return || '',
      from_to_description: post.from_to_description || '',
      to_from_description: post.to_from_description || '',
      phone_visible: post.phone_visible,
      is_active: post.is_active
    });
    setShowEditModal(true);
  };

  const resetEditForm = () => {
    setEditFormData({
      from_country: '',
      to_country: '',
      from_to_departure: '',
      to_from_return: '',
      from_to_description: '',
      to_from_description: '',
      phone_visible: 1,
      is_active: 1
    });
  };

  const resetFilters = () => {
    setFilters({
      driver_id: '',
      country: '',
      is_active: '',
      driver_search: ''
    });
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, current_page: page }));
  };

  const getStatusBadge = (isActive: number, hasActiveSubscription?: number) => {
    if (!isActive) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Deactivated</span>;
    }
    if (hasActiveSubscription === 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Expired Plan</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>;
  };

  const getVerificationBadge = (isVerified?: number) => {
    if (isVerified) {
      return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">✓ Verified</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Unverified</span>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateForInput = (dateString: string) => {
    return new Date(dateString).toISOString().split('T')[0];
  };

  const filteredDrivers = drivers.filter(driver => 
    driver.name.toLowerCase().includes(filters.driver_search.toLowerCase()) ||
    driver.email.toLowerCase().includes(filters.driver_search.toLowerCase())
  );

  const handleReactivatePost = async (post: Post) => {
    if (!window.confirm(`Are you sure you want to reactivate this post?\n\nPost: #${post.id}\nDriver: ${post.driver_name}\nRoute: ${post.from_country_name} → ${post.to_country_name}`)) {
      return;
    }

    try {
      setError('');
      setActionLoading(true);
      
      const response = await ApiService.updatePost(post.id, {
        is_active: 1
      });
      
      if (response.success) {
        // Backend automatically creates notification
        fetchPosts();
        alert('Post reactivated successfully!');
      } else {
        setError(response.message || 'Failed to reactivate post');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Posts Management</h1>
        <p className="text-gray-600">Monitor and manage driver posts across the platform</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Driver Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Driver
            </label>
            <input
              type="text"
              value={filters.driver_search}
              onChange={(e) => setFilters(prev => ({ ...prev, driver_search: e.target.value }))}
              placeholder="Driver name or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Driver Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specific Driver
            </label>
            <select
              value={filters.driver_id}
              onChange={(e) => setFilters(prev => ({ ...prev, driver_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Drivers</option>
              {filteredDrivers.map(driver => (
                <option key={driver.id} value={driver.id.toString()}>
                  {driver.name} ({driver.email})
                </option>
              ))}
            </select>
          </div>

          {/* Country Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={filters.country}
              onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Countries</option>
              {countries.map(country => (
                <option key={country.id} value={country.id.toString()}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Post Status
            </label>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters(prev => ({ ...prev, is_active: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Posts</option>
              <option value="1">Active Posts</option>
              <option value="0">Deactivated Posts</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Posts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Posts ({pagination.total_posts})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No posts found matching your criteria.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Post Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">Post #{post.id}</div>
                          <div className="text-gray-500">Created: {formatDate(post.created_at)}</div>
                          {post.phone_visible ? (
                            <div className="text-xs text-green-600">📞 Phone Visible</div>
                          ) : (
                            <div className="text-xs text-gray-500">📞 Phone Hidden</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{post.driver_name}</div>
                          <div className="text-gray-500">{post.driver_email}</div>
                          {post.driver_phone && (
                            <div className="text-xs text-gray-500">{post.driver_phone}</div>
                          )}
                          <div className="mt-1">
                            {getVerificationBadge(post.driver_verified)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {post.from_country_name} → {post.to_country_name}
                          </div>
                          {post.to_from_return && (
                            <div className="text-gray-500">
                              ← Return trip available
                            </div>
                          )}
                          {post.from_to_description && (
                            <div className="text-xs text-gray-600 mt-1 max-w-xs truncate">
                              {post.from_to_description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            Departure: {formatDate(post.from_to_departure)}
                          </div>
                          {post.to_from_return && (
                            <div className="text-gray-500">
                              Return: {formatDate(post.to_from_return)}
                            </div>
                          )}
                          {post.subscription_end && (
                            <div className="text-xs text-gray-500 mt-1">
                              Plan expires: {formatDate(post.subscription_end)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(post.is_active, post.has_active_subscription)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {post.is_active ? (
                            <>
                              <button
                                onClick={() => openEditModal(post)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                              >
                                Edit
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => {
                                  setSelectedPost(post);
                                  setShowDeleteModal(true);
                                }}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                Deactivate
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => openEditModal(post)}
                                className="text-blue-600 hover:text-blue-900 transition-colors"
                              >
                                Edit
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleReactivatePost(post)}
                                className="text-green-600 hover:text-green-900 transition-colors"
                              >
                                Reactivate
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {pagination.current_page} of {pagination.total_pages}
                  ({pagination.total_posts} total posts)
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page <= 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {[...Array(Math.min(5, pagination.total_pages))].map((_, i) => {
                    const page = Math.max(1, pagination.current_page - 2) + i;
                    if (page > pagination.total_pages) return null;
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          page === pagination.current_page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page >= pagination.total_pages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Post Modal */}
      {showEditModal && selectedPost && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Post #{selectedPost.id}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* From Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Country *
                  </label>
                  <select
                    value={editFormData.from_country}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, from_country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select origin country</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.id.toString()}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* To Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Country *
                  </label>
                  <select
                    value={editFormData.to_country}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, to_country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select destination country</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.id.toString()}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Departure Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departure Date *
                  </label>
                  <input
                    type="date"
                    value={editFormData.from_to_departure}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, from_to_departure: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Return Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={editFormData.to_from_return}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, to_from_return: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outbound Trip Description
                </label>
                <textarea
                  value={editFormData.from_to_description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, from_to_description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description for outbound trip..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Trip Description
                </label>
                <textarea
                  value={editFormData.to_from_description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, to_from_description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description for return trip..."
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Visibility
                  </label>
                  <select
                    value={editFormData.phone_visible}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, phone_visible: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Show Phone Number</option>
                    <option value={0}>Hide Phone Number</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post Status
                  </label>
                  <select
                    value={editFormData.is_active}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, is_active: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive/Deleted</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedPost(null);
                    resetEditForm();
                    setError('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePost}
                  disabled={actionLoading || !editFormData.from_country || !editFormData.to_country || !editFormData.from_to_departure}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Updating...' : 'Update Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeleteModal && selectedPost && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Deactivate Post
              </h3>
              <div className="text-left bg-gray-50 p-4 rounded-md mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Post:</strong> #{selectedPost.id}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Driver:</strong> {selectedPost.driver_name}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Route:</strong> {selectedPost.from_country_name} → {selectedPost.to_country_name}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Departure:</strong> {formatDate(selectedPost.from_to_departure)}
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Are you sure you want to deactivate this post?
              </p>
              <p className="text-xs text-blue-600 mb-6">
                💡 Note: Deactivated posts can be reactivated later through the Edit function or the Reactivate button.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedPost(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePost(selectedPost.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Deactivating...' : 'Deactivate Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostManagement; 