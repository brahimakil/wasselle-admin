import React, { useState, useEffect } from 'react';
import { ApiService, Vehicle } from '../../utils/api';

const VehiclePhotoCell: React.FC<{ photoPath?: string; alt?: string }> = ({ photoPath, alt = "Vehicle Photo" }) => {
  if (!photoPath) {
    return (
      <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
        No Image
      </div>
    );
  }

  return (
    <img
      src={`/api/proxy?path=uploads/image.php&image=${encodeURIComponent(photoPath)}`}
      alt={alt}
      className="w-16 h-16 object-cover rounded"
      onError={(e) => {
        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23374141'%3ENo Image%3C/text%3E%3C/svg%3E";
      }}
    />
  );
};

const VehicleManagement: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    vehicle_type: '',
    brand: '',
    model: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_vehicles: 0,
    limit: 20
  });

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusVehicle, setStatusVehicle] = useState<Vehicle | null>(null);
  const [statusAction, setStatusAction] = useState<'approved' | 'rejected'>('approved');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, [filters, pagination.current_page]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await ApiService.getVehicles({
        page: pagination.current_page,
        limit: pagination.limit,
        search: filters.search,
        status: filters.status,
        vehicle_type: filters.vehicle_type,
        brand: filters.brand,
        model: filters.model
      });

      if (response.success) {
        setVehicles(response.vehicles || []);
        
        if (response.pagination) {
          setPagination({
            current_page: response.pagination.current_page || 1,
            total_pages: response.pagination.total_pages || 1,
            total_vehicles: response.pagination.total_vehicles || 0,
            limit: response.pagination.limit || 20
          });
        }
      } else {
        setError(response.message || 'Failed to fetch vehicles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleViewVehicle = (vehicle: Vehicle) => {
    setViewVehicle(vehicle);
    setShowViewModal(true);
  };

  const handleStatusAction = (vehicle: Vehicle, action: 'approved' | 'rejected') => {
    setStatusVehicle(vehicle);
    setStatusAction(action);
    setRejectionReason('');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!statusVehicle) return;

    if (statusAction === 'rejected' && !rejectionReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setError('');
      
      // Log the request data for debugging
      const requestData = {
        vehicle_id: statusVehicle.id,
        status: statusAction,
        rejection_reason: statusAction === 'rejected' ? rejectionReason : undefined
      };
      
      console.log('🚗 Updating vehicle status:', requestData);
      console.log('🚗 Vehicle details:', statusVehicle);
      
      const response = await ApiService.updateVehicleStatus(requestData);
      
      console.log('🚗 API Response:', response);

      if (response.success) {
        console.log('✅ Vehicle status updated successfully');
        setShowStatusModal(false);
        setStatusVehicle(null);
        fetchVehicles();
      } else {
        const errorMessage = `Failed to update vehicle status: ${response.message || 'Unknown error'}`;
        console.error('❌ Vehicle update failed:', response);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('🔥 Vehicle update error details:', err);
      console.error('🔥 Error type:', typeof err);
      console.error('🔥 Error instanceof Error:', err instanceof Error);
      
      let errorMessage = 'An error occurred while updating vehicle status';
      
      if (err instanceof Error) {
        errorMessage = `Error: ${err.message}`;
        console.error('🔥 Error message:', err.message);
        console.error('🔥 Error stack:', err.stack);
      } else {
        console.error('🔥 Non-Error object thrown:', err);
        errorMessage = `Unexpected error: ${JSON.stringify(err)}`;
      }
      
      setError(errorMessage);
    }
  };

  const closeModals = () => {
    setShowViewModal(false);
    setShowStatusModal(false);
    setViewVehicle(null);
    setStatusVehicle(null);
    setRejectionReason('');
    setError('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
            ✅ Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
            ❌ Rejected
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
            ⏳ Pending Review
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'car':
        return '🚗';
      case 'motorcycle':
        return '🏍️';
      case 'van':
        return '🚐';
      case 'truck':
        return '🚚';
      default:
        return '🚗';
    }
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Vehicle Management</h2>
          <p className="text-gray-600 mt-1">Review and manage driver vehicle applications</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <span className="text-sm text-gray-500">
            Total Vehicles: {pagination.total_vehicles}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="License plate, driver, brand..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
            <select
              value={filters.vehicle_type}
              onChange={(e) => setFilters(prev => ({ ...prev, vehicle_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="car">🚗 Car</option>
              <option value="motorcycle">🏍️ Motorcycle</option>
              <option value="van">🚐 Van</option>
              <option value="truck">🚚 Truck</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
            <input
              type="text"
              value={filters.brand}
              onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
              placeholder="e.g., BMW, Toyota"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <input
              type="text"
              value={filters.model}
              onChange={(e) => setFilters(prev => ({ ...prev, model: e.target.value }))}
              placeholder="e.g., Camry, X5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Enhanced Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Vehicle Update Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <pre className="whitespace-pre-wrap font-mono text-xs bg-red-100 p-2 rounded mt-2">
                  {error}
                </pre>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => {
                    console.log('🔍 Copying error to clipboard...');
                    navigator.clipboard.writeText(error);
                  }}
                  className="text-xs bg-red-200 hover:bg-red-300 text-red-800 px-2 py-1 rounded mr-2"
                >
                  Copy Error
                </button>
                <button
                  onClick={() => setError('')}
                  className="text-xs bg-red-200 hover:bg-red-300 text-red-800 px-2 py-1 rounded"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicles Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 admin-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="loading-spinner w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading vehicles...</p>
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No vehicles found
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <VehiclePhotoCell photoPath={vehicle.photo1} alt="Vehicle Photo" />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {vehicle.license_plate}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {getVehicleIcon(vehicle.vehicle_type)} {vehicle.vehicle_type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{vehicle.driver_name}</div>
                        <div className="text-sm text-gray-500">{vehicle.driver_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {vehicle.brand && vehicle.model ? (
                          <div>{vehicle.brand} {vehicle.model}</div>
                        ) : (
                          <div className="text-gray-400">No brand/model</div>
                        )}
                        <div className="text-sm text-gray-500">
                          {vehicle.year && <span>{vehicle.year} • </span>}
                          {vehicle.color && <span>{vehicle.color} • </span>}
                          {vehicle.doors && <span>{vehicle.doors} doors</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(vehicle.status)}
                      {vehicle.status === 'rejected' && vehicle.rejection_reason && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs truncate">
                          {vehicle.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(vehicle.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewVehicle(vehicle)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      {vehicle.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusAction(vehicle, 'approved')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusAction(vehicle, 'rejected')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </>
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
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current_page - 1) * pagination.limit) + 1} to {Math.min(pagination.current_page * pagination.limit, pagination.total_vehicles)} of {pagination.total_vehicles} vehicles
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current_page: 1 }))}
                  disabled={pagination.current_page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-l text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current_page: Math.max(1, prev.current_page - 1) }))}
                  disabled={pagination.current_page === 1}
                  className="px-3 py-2 border-t border-b border-gray-300 text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-2 border-t border-b border-gray-300 text-sm bg-white">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current_page: Math.min(pagination.total_pages, prev.current_page + 1) }))}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="px-3 py-2 border-t border-b border-gray-300 text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current_page: pagination.total_pages }))}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="px-3 py-2 border border-gray-300 rounded-r text-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Vehicle Modal */}
      {showViewModal && viewVehicle && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Vehicle Details - {viewVehicle.license_plate}
                </h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vehicle Information */}
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Vehicle Information</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Type:</span>
                      <span className="ml-2 text-sm text-gray-900 capitalize">
                        {getVehicleIcon(viewVehicle.vehicle_type)} {viewVehicle.vehicle_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">License Plate:</span>
                      <span className="ml-2 text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                        {viewVehicle.license_plate}
                      </span>
                    </div>
                    {viewVehicle.brand && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Brand:</span>
                        <span className="ml-2 text-sm text-gray-900">{viewVehicle.brand}</span>
                      </div>
                    )}
                    {viewVehicle.model && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Model:</span>
                        <span className="ml-2 text-sm text-gray-900">{viewVehicle.model}</span>
                      </div>
                    )}
                    {viewVehicle.year && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Year:</span>
                        <span className="ml-2 text-sm text-gray-900">{viewVehicle.year}</span>
                      </div>
                    )}
                    {viewVehicle.color && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Color:</span>
                        <span className="ml-2 text-sm text-gray-900">{viewVehicle.color}</span>
                      </div>
                    )}
                    {viewVehicle.doors && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Doors:</span>
                        <span className="ml-2 text-sm text-gray-900">{viewVehicle.doors} doors</span>
                      </div>
                    )}
                    {viewVehicle.seats && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Seats:</span>
                        <span className="ml-2 text-sm text-gray-900">{viewVehicle.seats} seats</span>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-600">Status:</span>
                      <span className="ml-2">{getStatusBadge(viewVehicle.status)}</span>
                    </div>
                    {viewVehicle.status === 'rejected' && viewVehicle.rejection_reason && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Rejection Reason:</span>
                        <div className="ml-2 text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                          {viewVehicle.rejection_reason}
                        </div>
                      </div>
                    )}
                    {viewVehicle.description && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Description:</span>
                        <div className="ml-2 text-sm text-gray-900 bg-gray-50 p-2 rounded mt-1">
                          {viewVehicle.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Driver Information */}
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Driver Information</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Name:</span>
                      <span className="ml-2 text-sm text-gray-900">{viewVehicle.driver_name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Email:</span>
                      <span className="ml-2 text-sm text-gray-900">{viewVehicle.driver_email}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Submitted:</span>
                      <span className="ml-2 text-sm text-gray-900">{formatDate(viewVehicle.created_at)}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Last Updated:</span>
                      <span className="ml-2 text-sm text-gray-900">{formatDate(viewVehicle.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle Photos */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-800 mb-4">Vehicle Photos</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Photo 1</p>
                    {viewVehicle.photo1 ? (
                      <img
                        src={`/api/proxy?path=uploads/image.php&image=${encodeURIComponent(viewVehicle.photo1)}`}
                        alt="Vehicle Photo 1"
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                        onClick={() => window.open(`/api/proxy?path=uploads/image.php&image=${encodeURIComponent(viewVehicle.photo1)}`, '_blank')}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%236b7280">No Image</text></svg>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500 rounded-lg border">
                        No Photo 1
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Photo 2 (with License Plate)</p>
                    {viewVehicle.photo2 ? (
                      <img
                        src={`/api/proxy?path=uploads/image.php&image=${encodeURIComponent(viewVehicle.photo2)}`}
                        alt="Vehicle Photo 2 with License Plate"
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                        onClick={() => window.open(`/api/proxy?path=uploads/image.php&image=${encodeURIComponent(viewVehicle.photo2)}`, '_blank')}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%236b7280">No Image</text></svg>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500 rounded-lg border">
                        No Photo 2
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Registration Photo</p>
                    {viewVehicle.registration_photo ? (
                      <img
                        src={`/api/proxy?path=uploads/image.php&image=${encodeURIComponent(viewVehicle.registration_photo)}`}
                        alt="Vehicle Registration"
                        className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                        onClick={() => window.open(`/api/proxy?path=uploads/image.php&image=${encodeURIComponent(viewVehicle.registration_photo)}`, '_blank')}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%236b7280">No Image</text></svg>';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-500 rounded-lg border">
                        No Registration Photo
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {viewVehicle.status === 'pending' && (
                <div className="mt-6 flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      closeModals();
                      handleStatusAction(viewVehicle, 'approved');
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                  >
                    ✅ Approve Vehicle
                  </button>
                  <button
                    onClick={() => {
                      closeModals();
                      handleStatusAction(viewVehicle, 'rejected');
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    ❌ Reject Vehicle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && statusVehicle && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {statusAction === 'approved' ? 'Approve Vehicle' : 'Reject Vehicle'}
                </h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateStatus} className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Vehicle: <span className="font-medium">{statusVehicle.license_plate}</span></p>
                <p className="text-sm text-gray-600">Driver: <span className="font-medium">{statusVehicle.driver_name}</span></p>
                <p className="text-sm text-gray-600">Type: <span className="font-medium capitalize">{statusVehicle.vehicle_type}</span></p>
              </div>

              {statusAction === 'approved' ? (
                <div className="text-center">
                  <div className="text-green-600 text-6xl mb-4">✅</div>
                  <p className="text-lg font-medium text-gray-900">Approve this vehicle?</p>
                  <p className="text-sm text-gray-600 mt-2">
                    The driver will be notified and can use this vehicle for trips.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-4">
                    <div className="text-red-600 text-6xl mb-4">❌</div>
                    <p className="text-lg font-medium text-gray-900">Reject this vehicle?</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      rows={4}
                      placeholder="Explain why this vehicle is being rejected (e.g., license plate not visible, unclear photos, invalid registration, etc.)"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 ${
                    statusAction === 'approved'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {statusAction === 'approved' ? 'Approve Vehicle' : 'Reject Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;
