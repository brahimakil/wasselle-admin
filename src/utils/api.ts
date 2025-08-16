const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  token?: string;
  admin?: any;
  user?: any;
  users?: any[];
  plans?: any[];
  subscriptions?: any[];
  payments?: any[];
  payment_methods?: PaymentMethod[];
  posts?: Post[];
  countries?: Country[];
  notifications?: Notification[];
  vehicles?: Vehicle[];
  country?: Country; // Add this line
  unread_count?: number;
  plan?: any;
  subscription_id?: number;
  end_date?: string;
  subscription_end_date?: string;
  subscription_count?: number;
  payment_id?: number;
  deactivated_count?: number;
  pagination?: {
    current_page: number;
    total_pages: number;
    total_users?: number;
    total_subscriptions?: number;
    total_payments?: number;
    total_posts?: number;
    total_methods?: number;
    total_vehicles?: number;
    total?: number;
    limit: number;
    per_page?: number;
  };
  filters_applied?: any;
}

export interface Admin {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  dob?: string;
  gender?: 'male' | 'female';
  place_of_living?: string;
  face_photo?: string;
  passport_photo?: string;
  driver_license_photo?: string;  // Add this line
  role: 'rider' | 'driver';
  is_verified: number;
  is_banned: number;
  account_status: 'pending' | 'active';
  created_at: string;
  country_name?: string;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: string;
  max_posts: number;
  duration_days: number;
  created_at: string;
  active_subscriptions?: number;
  current_active_subscriptions?: number;
}

export interface Subscription {
  id: number;
  driver_id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  is_active: number;
  driver_name: string;
  driver_email: string;
  plan_name: string;
  price: string;
  max_posts: number;
  duration_days: number;
  is_expired: number;
}

export interface Payment {
  id: number;
  driver_id: number;
  plan_id: number;
  payment_method_id?: number;
  transaction_id: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
  updated_at: string;
  driver_name: string;
  driver_email: string;
  plan_name: string;
  payment_method_name?: string;
  price: string;
  duration_days: number;
  payment_subscription_status?: string;
  subscription_id?: number;
  subscription_active?: number;
  subscription_start?: string;
  subscription_end?: string;
  active_plan_id?: number;
}

export interface PaymentMethod {
  id: number;
  name: string;
  description?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  total_payments?: number;
  approved_payments?: number;
  active_payments?: number;
}

export interface Post {
  id: number;
  driver_id: number;
  from_country: number;
  to_country: number;
  from_to_departure: string;
  to_from_return?: string;
  from_to_description?: string;
  to_from_description?: string;
  phone_visible: number;
  is_active: number;
  created_at: string;
  driver_name: string;
  driver_email: string;
  driver_phone?: string;
  from_country_name: string;
  to_country_name: string;
  subscription_end?: string;
  has_active_subscription?: number;
  driver_verified?: number;
}

export interface Country {
  id: number;
  name: string;
}

export interface Notification {
  id: number;
  user_id: number;
  role: string;
  message: string;
  data: {
    type: 'payment' | 'post' | 'plan_management' | 'payment_management' | 'post_management' | 'country_management' | 'custom';
    // Driver action fields
    payment_id?: number;
    post_id?: number;
    driver_name?: string;
    plan_name?: string;
    transaction_id?: string;
    from_country?: string;
    to_country?: string;
    // Admin action fields
    plan_id?: number;
    admin_name?: string;
    action?: string;
    reason?: string;
    // Additional fields for custom notifications and enhanced data
    priority?: 'high' | 'medium' | 'low';
    category?: string;
    country_id?: number;
    country_name?: string;
    created_by_admin?: boolean;
    admin_id?: string | number;
    source?: string;
    created_at?: string;
    [key: string]: any; // Allow additional properties
  };
  is_read: number;
  created_at: string;
}

export interface Rating {
  id: number;
  rating: number;
  comment: string;
  rater_name: string;
  rater_email: string;
  from_country: string;
  to_country: string;
  from_to_description: string;
  created_at: string;
}

export interface DriverRatingStats {
  average_rating: number;
  total_ratings: number;
  rating_breakdown: {
    "5_star": number;
    "4_star": number;
    "3_star": number;
    "2_star": number;
    "1_star": number;
  };
}

export interface DriverRatingsResponse {
  success: boolean;
  driver: {
    id: number;
    name: string;
    email: string;
  };
  stats: DriverRatingStats;
  ratings: Rating[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface Vehicle {
  id: number;
  driver_id: number;
  driver_name?: string;
  driver_email?: string;
  vehicle_type: 'car' | 'motorcycle' | 'van' | 'truck';
  license_plate: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  doors?: '2' | '4';
  seats?: number;
  description?: string;
  photo1: string;
  photo2: string;
  registration_photo: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export class ApiService {
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private static async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    let data;
    
    try {
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Server response:', text);
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      throw new Error(`Failed to read response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    if (!response.ok) {
      throw new Error(data?.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  // Replace your makeProxyRequest method in api.ts with this improved version

private static async makeProxyRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  console.log('🔍 makeProxyRequest called with:', { endpoint, options });
  
  try {
    // First, try the proxy approach
    const response = await fetch('/api/proxy', {
      ...options,
      headers: {
        ...options.headers,
        'X-API-Path': endpoint,
      },
    });
    
    console.log('🔍 Proxy response status:', response.status);
    console.log('🔍 Proxy response ok:', response.ok);
    
    // If proxy worked, return it
    if (response.ok) {
      return response;
    }
    
    // If proxy failed, log the error and try direct approach (for development only)
    console.warn('🔍 Proxy failed, trying direct approach...');
    const responseText = await response.text();
    console.warn('🔍 Proxy error response:', responseText);
    
    // For development: try direct HTTP call (this won't work in production due to CORS)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Attempting direct call (development only)...');
      
      const directResponse = await fetch(`http://161.97.179.72/wasselle/api/${endpoint}`, {
        ...options,
        mode: 'cors'
      });
      
      if (directResponse.ok) {
        console.log('🔍 Direct call succeeded!');
        return directResponse;
      }
    }
    
    // If both failed, throw the original proxy error
    throw new Error(`Proxy failed with status ${response.status}: ${responseText}`);
    
  } catch (error) {
    console.error('🔍 makeProxyRequest failed:', error);
    throw error;
  }
}
  // Admin Authentication
  static async adminLogin(email: string, password: string): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const result = await this.handleResponse(response);
    
    if (result.success && result.token) {
      localStorage.setItem('admin_token', result.token);
      localStorage.setItem('admin_user', JSON.stringify(result.admin));
    }
    
    return result;
  }

  static async adminRegister(name: string, email: string, password: string): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/register.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    const result = await this.handleResponse(response);
    
    if (result.success && result.token) {
      localStorage.setItem('admin_token', result.token);
      localStorage.setItem('admin_user', JSON.stringify(result.admin));
    }
    
    return result;
  }

  static adminLogout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }

  static isAdminAuthenticated(): boolean {
    return !!localStorage.getItem('admin_token');
  }

  static getAdminData(): Admin | null {
    const adminData = localStorage.getItem('admin_user');
    return adminData ? JSON.parse(adminData) : null;
  }

  // User Management
  static async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    gender?: string;
    is_verified?: string;
    is_banned?: string;
    account_status?: string;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `admin/users/list.php${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await this.makeProxyRequest(endpoint, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  static async getUser(id: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest(`admin/users/get.php?id=${id}`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  static async updateUser(userData: Partial<User> & { id: number }): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/users/update.php', {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    
    return this.handleResponse(response);
  }

  static async deleteUser(id: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/users/delete.php', {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id })
    });
    
    return this.handleResponse(response);
  }

  // Enhanced User Management - Create new users
  static async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role: 'driver' | 'rider';
    phone?: string;
    dob?: string;
    gender?: string;
    place_of_living?: string;
    face_photo?: File;
    passport_photo?: File;
    driver_license_photo?: File;  // Add this line
  }): Promise<ApiResponse> {
    
    // Helper function to convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          // Remove the "data:image/jpeg;base64," prefix
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });
    };

    // Convert files to base64 if they exist
    let facePhotoBase64 = '';
    let facePhotoFilename = '';
    let passportPhotoBase64 = '';
    let passportPhotoFilename = '';
    let driverLicensePhotoBase64 = '';
    let driverLicensePhotoFilename = '';

    if (userData.face_photo) {
      facePhotoBase64 = await fileToBase64(userData.face_photo);
      facePhotoFilename = userData.face_photo.name;
    }

    if (userData.passport_photo) {
      passportPhotoBase64 = await fileToBase64(userData.passport_photo);
      passportPhotoFilename = userData.passport_photo.name;
    }

    if (userData.driver_license_photo) {
      driverLicensePhotoBase64 = await fileToBase64(userData.driver_license_photo);
      driverLicensePhotoFilename = userData.driver_license_photo.name;
    }

    // Create JSON payload
    const jsonData = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      phone: userData.phone || '',
      dob: userData.dob || '',
      gender: userData.gender || '',
      place_of_living: userData.place_of_living || '',
      face_photo_base64: facePhotoBase64,
      face_photo_filename: facePhotoFilename,
      passport_photo_base64: passportPhotoBase64,
      passport_photo_filename: passportPhotoFilename,
      driver_license_base64: driverLicensePhotoBase64,
      driver_license_filename: driverLicensePhotoFilename
    };

    const response = await this.makeProxyRequest('user/register-with-documents.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(jsonData)
    });
    
    return this.handleResponse(response);
  }

  static async createUserByAdmin(userData: {
    name: string;
    email: string;
    password: string;
    role: 'driver' | 'rider';
    phone?: string;
    dob?: string;
    gender?: string;
    place_of_living?: string;
    face_photo?: File;
    passport_photo?: File;
    driver_license_photo?: File;  // Add this line
  }): Promise<ApiResponse> {
    
    // Helper function to convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          // Remove the "data:image/jpeg;base64," prefix
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = error => reject(error);
      });
    };

    // Convert files to base64 if they exist
    let facePhotoBase64 = '';
    let facePhotoFilename = '';
    let passportPhotoBase64 = '';
    let passportPhotoFilename = '';
    let driverLicensePhotoBase64 = '';
    let driverLicensePhotoFilename = '';

    if (userData.face_photo) {
      facePhotoBase64 = await fileToBase64(userData.face_photo);
      facePhotoFilename = userData.face_photo.name;
    }

    if (userData.passport_photo) {
      passportPhotoBase64 = await fileToBase64(userData.passport_photo);
      passportPhotoFilename = userData.passport_photo.name;
    }

    if (userData.driver_license_photo) {
      driverLicensePhotoBase64 = await fileToBase64(userData.driver_license_photo);
      driverLicensePhotoFilename = userData.driver_license_photo.name;
    }

    // Create JSON payload
    const jsonData = {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role,
      phone: userData.phone || '',
      dob: userData.dob || '',
      gender: userData.gender || '',
      place_of_living: userData.place_of_living || '',
      face_photo_base64: facePhotoBase64,
      face_photo_filename: facePhotoFilename,
      passport_photo_base64: passportPhotoBase64,
      passport_photo_filename: passportPhotoFilename,
      driver_license_base64: driverLicensePhotoBase64,
      driver_license_filename: driverLicensePhotoFilename
    };

    const response = await this.makeProxyRequest('admin/users/create.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(jsonData)
    });
    
    return this.handleResponse(response);
  }

  // Plan Management
  static async getPlans(): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/plans/list.php', {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  static async createPlan(planData: {
    name: string;
    description: string;
    price: number;
    max_posts: number;
    duration_days: number;
  }): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/plans/create.php', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(planData)
    });
    
    return this.handleResponse(response);
  }

  static async updatePlan(planData: {
    id: number;
    name?: string;
    description?: string;
    price?: number;
    max_posts?: number;
    duration_days?: number;
  }): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/plans/update.php', {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(planData)
    });
    
    return this.handleResponse(response);
  }

  static async deletePlan(id: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/plans/delete.php', {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id })
    });
    
    return this.handleResponse(response);
  }

  // Subscription Management
  static async getSubscriptions(params: {
    page?: number;
    limit?: number;
    plan_id?: number;
    is_active?: string;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `admin/subscriptions/list.php${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await this.makeProxyRequest(endpoint, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  static async createSubscription(subscriptionData: {
    driver_id: number;
    plan_id: number;
    start_date: string;
  }): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/subscriptions/create.php', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(subscriptionData)
    });
    
    return this.handleResponse(response);
  }

  // Remove/deactivate subscription
  static async removeSubscription(subscription_id: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/subscriptions/remove.php', {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ subscription_id })
    });
    
    return this.handleResponse(response);
  }

  // Remove the old assignDriverToPlan method that auto-verified
  // Keep only the subscription creation without verification
  static async assignDriverToPlan(driverData: {
    driver_id: number;
    plan_id: number;
    start_date?: string;
  }): Promise<ApiResponse> {
    const subscriptionData = {
      driver_id: driverData.driver_id,
      plan_id: driverData.plan_id,
      start_date: driverData.start_date || new Date().toISOString().split('T')[0]
    };

    console.log('Creating subscription with data:', subscriptionData);

    const response = await this.makeProxyRequest('admin/subscriptions/create.php', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(subscriptionData)
    });
    
    console.log('Raw response status:', response.status);
    
    const result = await this.handleResponse(response);
    console.log('Parsed response:', result);
    
    return result;
  }

  // Get driver subscriptions
  static async getDriverSubscriptions(driver_id: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest(`admin/users/get.php?id=${driver_id}`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // Payment Management
  static async getPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `admin/payments/list.php${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await this.makeProxyRequest(endpoint, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  static async approvePayment(payment_id: number, admin_note?: string): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/payments/approve.php', {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ payment_id, admin_note })
    });
    
    return this.handleResponse(response);
  }

  static async rejectPayment(payment_id: number, admin_note: string): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/payments/reject.php', {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ payment_id, admin_note })
    });
    
    return this.handleResponse(response);
  }

  // Manual payment creation by admin
  static async createPayment(paymentData: {
    driver_id: number;
    plan_id: number;
    transaction_id: string;
    status?: 'pending' | 'approved' | 'rejected';
    admin_note?: string;
  }): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/payments/create.php', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        ...paymentData,
        status: paymentData.status || 'pending'
      })
    });
    
    return this.handleResponse(response);
  }

  // Delete payment record completely
  static async deletePayment(paymentId: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/payments/delete.php', {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ payment_id: paymentId })
    });
    
    return this.handleResponse(response);
  }

  // Get payments for a specific driver (to find payments to delete)
  static async getDriverPayments(driverId: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest(`admin/payments/list.php?driver_id=${driverId}&limit=100`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // Deactivate all previous payments and subscriptions for a driver when switching plans
  static async deactivateDriverPreviousPlans(driver_id: number, exclude_payment_id?: number): Promise<{
    success: boolean;
    deactivated_payments: number;
    deactivated_subscriptions: number;
    errors: string[];
  }> {
    const results = {
      success: true,
      deactivated_payments: 0,
      deactivated_subscriptions: 0,
      errors: [] as string[]
    };

    try {
      // Step 1: Get all payments for this driver
      const paymentsResponse = await this.getDriverPayments(driver_id);
      
      if (paymentsResponse.success && paymentsResponse.payments) {
        // Step 2: Reject all approved payments (except the new one we're creating)
        for (const payment of paymentsResponse.payments) {
          if (payment.status === 'approved' && payment.id !== exclude_payment_id) {
            try {
              await this.rejectPayment(payment.id, 'Automatically deactivated due to plan change');
              results.deactivated_payments++;
              console.log(`Deactivated payment ${payment.id} for plan: ${payment.plan_name}`);
            } catch (err) {
              results.errors.push(`Failed to deactivate payment ${payment.id}: ${err}`);
            }
          }
        }
      }

      // Step 3: Get driver details to find active subscriptions
      const driverResponse = await this.getUser(driver_id);
      
      if (driverResponse.success && driverResponse.subscriptions) {
        // Step 4: Deactivate all active subscriptions
        for (const subscription of driverResponse.subscriptions) {
          if (subscription.is_active === 1) {
            try {
              await this.removeSubscription(subscription.id);
              results.deactivated_subscriptions++;
              console.log(`Deactivated subscription ${subscription.id} for plan: ${subscription.plan_name}`);
            } catch (err) {
              results.errors.push(`Failed to deactivate subscription ${subscription.id}: ${err}`);
            }
          }
        }
      }

      if (results.errors.length > 0) {
        results.success = false;
      }

    } catch (err) {
      results.success = false;
      results.errors.push(`Failed to deactivate previous plans: ${err}`);
    }

    return results;
  }

  // Alternative: Update specific payment status 
  static async updatePaymentStatus(payment_id: number, status: 'pending' | 'approved' | 'rejected'): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/payments/update-status.php', {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ 
        payment_id,
        status 
      })
    });
    
    return this.handleResponse(response);
  }

  // File/Image access
  static getImageUrl(path: string): string {
    return `${API_BASE_URL}/uploads/image.php?path=${encodeURIComponent(path)}`;
  }

  // Ensure only one active plan per driver (cleanup function)
  static async enforceOnePlanPerDriver(driver_id: number): Promise<ApiResponse> {
    try {
      // Get driver's current subscriptions
      const driverResponse = await this.getUser(driver_id);
      
      if (!driverResponse.success || !driverResponse.subscriptions) {
        return { success: true, message: 'No subscriptions to check' };
      }

      const subscriptions = driverResponse.subscriptions;
      const activeSubscriptions = subscriptions.filter((sub: any) => sub.is_active === 1);

      if (activeSubscriptions.length <= 1) {
        return { success: true, message: 'Driver has 0 or 1 active plans (correct)' };
      }

      // If multiple active subscriptions, keep the newest one and deactivate others
      console.warn(`Driver ${driver_id} has ${activeSubscriptions.length} active plans! Fixing...`);
      
      // Sort by start_date, keep the newest
      activeSubscriptions.sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
      const keepSubscription = activeSubscriptions[0];
      const deactivateSubscriptions = activeSubscriptions.slice(1);

      console.log(`Keeping newest subscription: ${keepSubscription.plan_name} (ID: ${keepSubscription.id})`);

      // Deactivate older subscriptions
      let deactivatedCount = 0;
      for (const sub of deactivateSubscriptions) {
        try {
          await this.removeSubscription(sub.id);
          console.log(`Deactivated older subscription: ${sub.plan_name} (ID: ${sub.id})`);
          deactivatedCount++;
        } catch (err) {
          console.error(`Failed to deactivate subscription ${sub.id}:`, err);
        }
      }

      return { 
        success: true, 
        message: `Fixed multiple active plans. Kept 1, deactivated ${deactivatedCount}`,
        deactivated_count: deactivatedCount
      };

    } catch (err) {
      console.error('Failed to enforce one plan per driver:', err);
      return { success: false, message: `Failed to enforce one plan rule: ${err}` };
    }
  }

  // Posts Management
  static async getPosts(params: {
    page?: number;
    limit?: number;
    driver_id?: number;
    country?: number;
    is_active?: number;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.driver_id) queryParams.append('driver_id', params.driver_id.toString());
    if (params.country) queryParams.append('country', params.country.toString());
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

    const response = await this.makeProxyRequest(`admin/posts/list.php?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async deletePost(postId: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest(`admin/posts/delete.php?id=${postId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async updatePost(postId: number, postData: {
    from_country?: number;
    to_country?: number;
    from_to_departure?: string;
    to_from_return?: string;
    from_to_description?: string;
    to_from_description?: string;
    phone_visible?: number;
    is_active?: number;
  }): Promise<ApiResponse> {
    const response = await this.makeProxyRequest(`admin/posts/update.php?id=${postId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(postData)
    });
    return this.handleResponse(response);
  }

  // Get countries for filtering/display (Public endpoint - no auth required)
  static async getCountries(): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('countries/list.php');
    return this.handleResponse(response);
  }

  // Admin Countries Management
  static async getAdminCountries(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);

    const response = await this.makeProxyRequest(`admin/countries/list.php?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async createCountry(name: string): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/countries/create.php', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name })
    });
    return this.handleResponse(response);
  }

  static async updateCountry(id: number, name: string): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/countries/update.php', {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id, name })
    });
    return this.handleResponse(response);
  }

  static async deleteCountry(id: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest(`admin/countries/delete.php?id=${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  // Admin Notifications Management
  static async getNotifications(params: {
    page?: number;
    limit?: number;
    unread_only?: boolean;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.unread_only) queryParams.append('unread_only', 'true');

    const response = await this.makeProxyRequest(`admin/notifications/list.php?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse(response);
  }

  static async markNotificationAsRead(notificationId?: number): Promise<ApiResponse> {
    const body = notificationId ? { notification_id: notificationId } : {};
    
    const response = await this.makeProxyRequest('admin/notifications/mark-read.php', {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body)
    });
    return this.handleResponse(response);
  }

  // Create custom notifications (for testing or manual announcements only)
  // Note: Admin action notifications are automatically created by the backend
  static async createAdminNotification(type: string, message: string, data: any): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/notifications/create.php', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        type,
        message,
        data
      })
    });
    return this.handleResponse(response);
  }

  // Driver Ratings
  static async getDriverRatings(driverId: number, params: {
    page?: number;
    limit?: number;
  } = {}): Promise<DriverRatingsResponse> {
    const queryParams = new URLSearchParams({
      driver_id: driverId.toString(),
      page: (params.page || 1).toString(),
      limit: (params.limit || 20).toString()
    });

    const response = await this.makeProxyRequest(`admin/drivers/ratings.php?${queryParams}`, {
      headers: this.getAuthHeaders()
    });
    
    const result = await this.handleResponse(response);
    return result as unknown as DriverRatingsResponse;
  }

  // Payment Methods Management
  static async getPaymentMethods(params: {
    show_deleted?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // For booleans, only append if true
        if (typeof value === 'boolean') {
          if (value) {
            queryParams.append(key, 'true');
          }
        } else {
          // For numbers and strings, convert to string and append
          queryParams.append(key, String(value));
        }
      }
    });

    const response = await this.makeProxyRequest(`admin/payment-methods/list.php?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  static async createPaymentMethod(data: {
    name: string;
    description?: string;
    is_active: boolean;
  }): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/payment-methods/create.php', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    return this.handleResponse(response);
  }

  static async updatePaymentMethod(data: {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
  }): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/payment-methods/update.php', {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    return this.handleResponse(response);
  }

  static async deletePaymentMethod(id: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('admin/payment-methods/delete.php', {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ id })
    });
    
    return this.handleResponse(response);
  }

  // Public endpoint for users to get active payment methods
  static async getActivePaymentMethods(): Promise<ApiResponse> {
    const response = await this.makeProxyRequest('payment-methods/list.php', {
      method: 'GET'
    });
    
    return this.handleResponse(response);
  }

  // Add this method to get fresh subscription data
  static async refreshDriverSubscription(driverId: number): Promise<ApiResponse> {
    const response = await this.makeProxyRequest(`admin/users/get.php?id=${driverId}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // Update the vehicle management methods to call backend directly instead of using proxy
  // Vehicle Management APIs - Force HTTP calls to avoid proxy issues
  static async getVehicles(params: {
    page?: number;
    limit?: number;
    status?: string;
    vehicle_type?: string;
    brand?: string;
    model?: string;
    search?: string;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    // Force HTTP call directly to backend
    const response = await fetch(`http://161.97.179.72/wasselle/api/admin/vehicles/list.php?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      }
    });
    
    return this.handleResponse(response);
  }

  static async updateVehicleStatus(data: {
    vehicle_id: number;
    status: 'approved' | 'rejected';
    rejection_reason?: string;
  }): Promise<ApiResponse> {
    try {
      console.log('🚗 updateVehicleStatus called with:', data);
      console.log('🚗 Auth headers:', this.getAuthHeaders());
      
      // Force HTTP call directly to backend
      const response = await fetch('http://161.97.179.72/wasselle/api/admin/vehicles/update-status.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify(data)
      });
      
      console.log('🚗 Response status:', response.status);
      console.log('🚗 Response ok:', response.ok);
      console.log('🚗 Response headers:', Object.fromEntries(response.headers.entries()));
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('🚗 updateVehicleStatus error:', error);
      throw error;
    }
  }

  static async getVehicleById(id: number): Promise<ApiResponse> {
    // Force HTTP call directly to backend
    const response = await fetch(`http://161.97.179.72/wasselle/api/admin/vehicles/get.php?id=${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      }
    });
    
    return this.handleResponse(response);
  }
}