# 🌟 Rating System API Documentation

## Overview
The Wasselle rating system allows verified riders to rate drivers on a per-post basis. This creates a comprehensive feedback system that helps maintain service quality and builds trust between users.

## 📊 Rating Features

### Core Functionality
- **Per-Post Rating**: Riders can rate drivers for specific trips/posts
- **Rating Scale**: 1-5 star rating system
- **Comments**: Optional comments with ratings
- **Rating Updates**: Riders can update their ratings for the same post
- **Driver Statistics**: Automatic calculation of average ratings and totals
- **Admin Management**: Admins can view detailed rating analytics

### Business Rules
- ✅ Only **verified riders** can submit ratings
- ✅ Only **active posts** can be rated
- ✅ **Drivers do NOT need to be verified** to receive ratings (allows new drivers to build reputation)
- ✅ **Banned drivers** cannot receive ratings
- ✅ One rating per rider per post (can be updated)
- ✅ Ratings must be between 1-5 stars
- ✅ Driver overall rating = average of all ratings received
- ✅ Post rating = average of ratings for that specific post

---

## 🔗 API Endpoints

### 1. **Submit/Update Rating** `POST /api/rider/ratings/submit.php`

**Access**: Verified Riders Only

**Request Body**:
```json
{
  "post_id": 123,
  "rating": 5,
  "comment": "Excellent service! Very professional driver."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "driver_stats": {
    "driver_name": "John Doe",
    "average_rating": 4.75,
    "total_ratings": 8
  }
}
```

**Validation**:
- `post_id`: Required, must be valid active post
- `rating`: Required, integer 1-5
- `comment`: Optional, max 500 characters

---

### 2. **Get Post Ratings** `GET /api/posts/ratings.php`

**Access**: Public

**Parameters**: `?post_id=123`

**Response**:
```json
{
  "success": true,
  "post_id": 123,
  "driver_name": "John Doe",
  "post_rating": {
    "average_rating": 4.5,
    "total_ratings": 4
  },
  "driver_overall_rating": {
    "average_rating": 4.75,
    "total_ratings": 12
  },
  "ratings": [
    {
      "rating": 5,
      "comment": "Great experience!",
      "rater_name": "Jane Smith",
      "created_at": "2025-08-01 10:30:00",
      "updated_at": null
    }
  ]
}
```

---

### 3. **Admin: Driver Ratings** `GET /api/admin/drivers/ratings.php`

**Access**: Admin Only

**Get Specific Driver**:
`?driver_id=456&page=1&limit=20`

**Response**:
```json
{
  "success": true,
  "driver": {
    "id": 456,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "stats": {
    "average_rating": 4.75,
    "total_ratings": 12,
    "rating_breakdown": {
      "5_star": 8,
      "4_star": 3,
      "3_star": 1,
      "2_star": 0,
      "1_star": 0
    }
  },
  "ratings": [
    {
      "id": 1,
      "rating": 5,
      "comment": "Excellent!",
      "rater_name": "Jane Smith",
      "rater_email": "jane@example.com",
      "from_country": "United States",
      "to_country": "Canada",
      "from_to_description": "Business trip NYC to Toronto",
      "created_at": "2025-08-01 10:30:00"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 12,
    "total_pages": 1
  }
}
```

**Get All Drivers Summary**:
`?page=1&limit=20`

**Response**:
```json
{
  "success": true,
  "drivers": [
    {
      "id": 456,
      "name": "John Doe",
      "email": "john@example.com",
      "is_verified": true,
      "is_banned": false,
      "average_rating": 4.75,
      "total_ratings": 12
    }
  ],
  "pagination": { ... }
}
```

---

## 🎯 Integration with Other APIs

### **Posts List with Ratings**
The public posts API (`/api/posts/list.php`) now includes rating information:

```json
{
  "posts": [
    {
      "id": 123,
      "driver_name": "John Doe",
      "driver_phone": "1234567890",
      "from_country_name": "United States",
      "to_country_name": "Canada",
      "driver_average_rating": 4.75,
      "driver_total_ratings": 12,
      "post_average_rating": 4.5,
      "post_total_ratings": 4,
      "from_to_description": "Business trip",
      "from_to_departure": "2025-08-15"
    }
  ]
}
```

**New Fields**:
- `driver_average_rating`: Driver's overall rating across all posts
- `driver_total_ratings`: Total number of ratings driver has received
- `post_average_rating`: Average rating for this specific post
- `post_total_ratings`: Number of ratings for this specific post

---

## 🔒 Security & Validation

### **Authentication Requirements**
- **Submit Rating**: Verified rider token required
- **View Ratings**: Public access (no authentication)
- **Admin Analytics**: Admin token required

### **Validation Rules**
- Rating value: Must be integer between 1-5
- Post existence: Post must exist and be active
- Driver status: Driver must NOT be banned (verification not required)
- Duplicate prevention: One rating per rider per post (updates allowed)
- Comment length: Maximum 500 characters

### **Error Responses**
```json
{
  "success": false,
  "message": "Rating must be between 1 and 5"
}
```

**Common Error Messages**:
- `"Rating must be between 1 and 5"`
- `"Post not found or inactive"`
- `"Cannot rate banned drivers"`
- `"Only verified riders can submit ratings"`
- `"Post ID and rating are required"`

---

## 📈 Admin Analytics Features

### **Rating Breakdown**
- 5-star, 4-star, 3-star, 2-star, 1-star counts
- Average rating calculation
- Total ratings received
- Rating trends over time

### **Driver Performance Insights**
- Overall rating across all posts
- Rating per individual post
- Comments and feedback analysis
- Verification and ban status correlation

### **Quality Control**
- Identify consistently low-rated drivers
- Monitor rating patterns
- Track improvement over time
- Flag potential issues

---

## 🧪 Testing

### **Test Coverage**
Run the comprehensive test suite:
```bash
./test_ratings_api.sh
```

**Test Scenarios**:
1. ✅ Rating submission (new and updates)
2. ✅ Rating validation (1-5 range)
3. ✅ Authentication checks
4. ✅ Driver ban status checks (verification not required)
5. ✅ Admin analytics access
6. ✅ Public rating display
7. ✅ Error handling
8. ✅ Performance testing

### **Performance Metrics**
- Rating submission: < 500ms
- Rating retrieval: < 200ms
- Admin analytics: < 1s
- Multiple ratings update: < 3s

---

## 🔄 Workflow Examples

### **Typical Rating Flow**
1. **Rider finds post**: Views public posts with rating info
2. **Rider submits rating**: Rates driver after trip (driver doesn't need to be verified)
3. **System updates**: Calculates new averages
4. **Public display**: Rating appears in future post listings
5. **Admin monitoring**: Admin can view detailed analytics

### **Rating Update Flow**
1. **Rider changes mind**: Submits new rating for same post
2. **System updates**: Replaces old rating with new one
3. **Recalculation**: Updates driver's average rating
4. **Notification**: Confirms rating update

### **New Driver Experience**
1. **Driver registers**: Creates account and posts (unverified)
2. **Riders can rate**: Immediately start rating the new driver
3. **Reputation builds**: Driver builds rating history before verification
4. **Admin verifies**: Eventually admin verifies driver (doesn't affect existing ratings)

---

## 📊 Database Schema

### **Ratings Table**
```sql
ratings:
- id (Primary Key)
- rater_id (Foreign Key to users)
- rated_id (Foreign Key to users - driver)
- post_id (Foreign Key to posts)
- rating (1-5)
- comment (Optional text)
- created_at
- updated_at
```

### **Key Relationships**
- `rater_id` → `users.id` (rider who gave rating)
- `rated_id` → `users.id` (driver who received rating)
- `post_id` → `posts.id` (specific post being rated)

---

## 🎯 Future Enhancements

### **Potential Features**
- 📱 Push notifications for new ratings
- 📊 Rating analytics dashboard
- 🏆 Driver achievement badges
- 📝 Rating response system (drivers reply to feedback)
- 📈 Rating trends and insights
- 🔍 Rating search and filtering
- ⭐ Featured highly-rated drivers
- 🔄 Rating verification badges (show if driver is admin-verified)

### **Integration Opportunities**
- Email notifications for ratings
- Mobile app rating widgets
- Social media sharing of ratings
- Review moderation system
- Rating-based driver recommendations
- Verified vs unverified driver rating indicators

---

## 🔧 Recent Updates

### **✅ Driver Verification Requirement Removed**
- **Previous**: Drivers needed to be verified to receive ratings
- **Current**: Drivers can receive ratings immediately after registration
- **Benefits**: 
  - New drivers can build reputation faster
  - More flexible onboarding process
  - Increased user engagement
- **Safety**: Banned drivers still cannot receive ratings

---

*This rating system ensures quality service, builds trust, and provides valuable feedback for continuous improvement in the Wasselle platform. The flexible verification system allows new drivers to participate immediately while maintaining safety through ban controls.* 