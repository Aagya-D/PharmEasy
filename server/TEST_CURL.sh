#!/bin/bash

# ================================================
# PharmEasy Authentication API - cURL Test Suite
# ================================================
# Complete authentication flow testing with curl
# Update BASE_URL if running on different host/port

BASE_URL="http://localhost:5000/api"

echo "🧪 PharmEasy Authentication Testing"
echo "===================================="

# ================================================
# 1. GET AVAILABLE ROLES
# ================================================
echo -e "\n📋 1. GET AVAILABLE ROLES"
echo "GET /roles"
curl -X GET "$BASE_URL/roles" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

# Store role IDs from response
# You'll need to manually copy PATIENT role ID from response above
# Example: cmjqo6wji0000y0bg5ahqehkh
echo -e "\n⚠️  Copy the PATIENT role ID from response above for next step"

# ================================================
# 2. REGISTER NEW USER
# ================================================
echo -e "\n\n📝 2. REGISTER NEW USER"
echo "POST /auth/register"
echo "Required: Email, Name, Password, Phone, RoleId"

# Generate random email for testing
TIMESTAMP=$(date +%s)
TEST_EMAIL="patient_$TIMESTAMP@example.com"
PATIENT_ROLE_ID="cmjqo6wji0000y0bg5ahqehkh"  # Replace with actual role ID from step 1

REGISTER_RESPONSE=$(curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"name\": \"Test Patient\",
    \"password\": \"TestPass@123\",
    \"phone\": \"+1234567890\",
    \"roleId\": \"$PATIENT_ROLE_ID\"
  }" \
  -w "\n%{http_code}")

echo "$REGISTER_RESPONSE"

# Extract userId from response (you'll need to parse this)
# Example userId: clx1p2q3r4s5t6u7v8w9x0y1z
echo -e "\n⚠️  Copy the userId from response above for next steps"

# ================================================
# 3. VERIFY OTP
# ================================================
echo -e "\n\n✅ 3. VERIFY OTP"
echo "POST /auth/verify-otp"
echo "Required: UserId, OTP Code (6 digits)"

# Example userId and OTP (replace with actual values from DB or registration response)
USER_ID="your_user_id_here"
OTP_CODE="123456"

curl -X POST "$BASE_URL/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"otp\": \"$OTP_CODE\"
  }" \
  -w "\nStatus: %{http_code}\n"

# ================================================
# 4. LOGIN
# ================================================
echo -e "\n\n🔐 4. LOGIN USER"
echo "POST /auth/login"
echo "Returns: accessToken, refreshToken"

LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"TestPass@123\"
  }")

echo "$LOGIN_RESPONSE"
echo -e "\n⚠️  Copy accessToken and refreshToken from response above"

# Example tokens (replace with actual values from login response)
ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
REFRESH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# ================================================
# 5. GET CURRENT USER PROFILE
# ================================================
echo -e "\n\n👤 5. GET CURRENT USER PROFILE"
echo "GET /auth/me"
echo "Authorization: Bearer <accessToken>"

curl -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -w "\nStatus: %{http_code}\n"

# ================================================
# 6. REFRESH ACCESS TOKEN
# ================================================
echo -e "\n\n🔄 6. REFRESH ACCESS TOKEN"
echo "POST /auth/refresh"
echo "Returns: New accessToken"

REFRESH_RESPONSE=$(curl -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo "$REFRESH_RESPONSE"
echo -e "\n⚠️  Copy new accessToken from response"

# ================================================
# 7. FORGOT PASSWORD
# ================================================
echo -e "\n\n🔑 7. FORGOT PASSWORD"
echo "POST /auth/forgot-password"

curl -X POST "$BASE_URL/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\"
  }" \
  -w "\nStatus: %{http_code}\n"

# ================================================
# 8. RESET PASSWORD (requires reset token)
# ================================================
echo -e "\n\n🔑 8. RESET PASSWORD"
echo "POST /auth/reset-password"
echo "Required: Reset token (from email) and new password"

RESET_TOKEN="your_reset_token_from_email_here"

curl -X POST "$BASE_URL/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$RESET_TOKEN\",
    \"newPassword\": \"NewPass@456\"
  }" \
  -w "\nStatus: %{http_code}\n"

# ================================================
# 9. LOGOUT
# ================================================
echo -e "\n\n🚪 9. LOGOUT"
echo "POST /auth/logout"
echo "Authorization: Bearer <accessToken>"

curl -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -w "\nStatus: %{http_code}\n"

echo -e "\n✅ Authentication testing complete!"
