README 1: Admin Panel Gender Support
Purpose
Add gender support to the admin panel so administrators can view and manage user gender information in the drivers and riders tables.
Database Changes Required
Run this SQL migration first:


<?php
// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: PUT');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

require_once '../../../helpers/AuthMiddleware.php';
require_once '../../../config/database.php';

// Verify user authentication
$user = AuthMiddleware::verifyToken(false, false);

$input = json_decode(file_get_contents('php://input'), true);

$database = new Database();
$conn = $database->getConnection();

// Fields users can update (gender cannot be updated after registration)
$allowed_fields = ['name', 'phone', 'place_of_living'];
$update_fields = [];
$params = [];

foreach ($allowed_fields as $field) {
    if (isset($input[$field])) {
        $update_fields[] = "$field = ?";
        $params[] = $input[$field];
    }
}

if (empty($update_fields)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No valid fields to update']);
    exit;
}

$params[] = $user['id']; // Add ID for WHERE clause

$query = "UPDATE users SET " . implode(', ', $update_fields) . " WHERE id = ?";
$stmt = $conn->prepare($query);

if ($stmt->execute($params)) {
    echo json_encode(['success' => true, 'message' => 'Profile updated successfully']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
}
?>



Backend API Changes
1. User List Endpoint Enhanced
Endpoint: GET /api/admin/users/list.php
New Query Parameter:
gender (optional): Filter by gender (male, female, other)
Example Requests:


-- Add gender column to users table
ALTER TABLE users 
ADD COLUMN gender ENUM('male', 'female', 'other') DEFAULT NULL AFTER dob;

-- Add index for filtering performance
CREATE INDEX idx_users_gender ON users(gender);



# Get all female drivers
GET /api/admin/users/list.php?role=driver&gender=female

# Get all male users
GET /api/admin/users/list.php?gender=male

# Get all users with pagination and gender
GET /api/admin/users/list.php?page=1&limit=20&gender=female


2. User Update Endpoint Enhanced
Endpoint: PUT /api/admin/users/update.php
New Field Support:
gender: Can be updated by admin to male, female, or other
Example Request:


{
    "success": true,
    "users": [
        {
            "id": 1,
            "name": "Jane Doe",
            "email": "jane@example.com",
            "phone": "+1234567890",
            "dob": "1990-01-01",
            "gender": "female",
            "place_of_living": "New York",
            "role": "driver",
            "is_verified": 1,
            "is_banned": 0,
            "created_at": "2025-08-01 12:00:00"
        }
    ],
    "pagination": {
        "current_page": 1,
        "total_pages": 5,
        "total_users": 47,
        "limit": 10
    }
}


3. Single User Details Enhanced
Endpoint: GET /api/admin/users/get.php?id={user_id}
Enhanced Response includes gender:

{
    "id": 1,
    "gender": "female",
    "is_verified": 1
}


Frontend Implementation Guide
1. User Table Enhancement
Add Gender Column to Users Table:


{
    "success": true,
    "user": {
        "id": 1,
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "+1234567890",
        "dob": "1990-01-01",
        "gender": "female",
        "place_of_living": "New York",
        "role": "driver",
        "is_verified": 1,
        "is_banned": 0,
        "created_at": "2025-08-01 12:00:00"
    }
}


2. User Edit Form Enhancement


// React/Next.js Example
const UsersTable = () => {
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({
        role: '',
        gender: '',
        is_verified: '',
        search: ''
    });

    const genderOptions = [
        { value: '', label: 'All Genders' },
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' }
    ];

    const fetchUsers = async () => {
        const params = new URLSearchParams();
        Object.keys(filters).forEach(key => {
            if (filters[key]) params.append(key, filters[key]);
        });

        const response = await fetch(`/api/admin/users/list.php?${params}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await response.json();
        setUsers(data.users);
    };

    return (
        <div>
            {/* Filters */}
            <div className="filters">
                <select 
                    value={filters.gender} 
                    onChange={(e) => setFilters({...filters, gender: e.target.value})}
                >
                    {genderOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                
                <select 
                    value={filters.role} 
                    onChange={(e) => setFilters({...filters, role: e.target.value})}
                >
                    <option value="">All Roles</option>
                    <option value="driver">Drivers</option>
                    <option value="rider">Riders</option>
                </select>
            </div>

            {/* Table */}
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Gender</th>
                        <th>Verified</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>
                                <span className={`role-badge ${user.role}`}>
                                    {user.role}
                                </span>
                            </td>
                            <td>
                                <span className={`gender-badge ${user.gender || 'unknown'}`}>
                                    {user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not specified'}
                                </span>
                            </td>
                            <td>
                                <span className={`status-badge ${user.is_verified ? 'verified' : 'unverified'}`}>
                                    {user.is_verified ? '✓ Verified' : '✗ Unverified'}
                                </span>
                            </td>
                            <td>
                                <button onClick={() => editUser(user.id)}>Edit</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const UserEditForm = ({ userId }) => {
    const [user, setUser] = useState({
        name: '',
        email: '',
        phone: '',
        gender: '',
        is_verified: false,
        is_banned: false
    });

    const updateUser = async () => {
        const response = await fetch('/api/admin/users/update.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                id: userId,
                ...user
            })
        });

        if (response.ok) {
            alert('User updated successfully');
        }
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); updateUser(); }}>
            <input 
                type="text" 
                placeholder="Name"
                value={user.name}
                onChange={(e) => setUser({...user, name: e.target.value})}
            />
            
            <input 
                type="email" 
                placeholder="Email"
                value={user.email}
                onChange={(e) => setUser({...user, email: e.target.value})}
            />

            <select 
                value={user.gender}
                onChange={(e) => setUser({...user, gender: e.target.value})}
            >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
            </select>

            <label>
                <input 
                    type="checkbox"
                    checked={user.is_verified}
                    onChange={(e) => setUser({...user, is_verified: e.target.checked})}
                />
                Verified
            </label>

            <button type="submit">Update User</button>
        </form>
    );
};


