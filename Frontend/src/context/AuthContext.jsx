import React, { createContext, useContext, useReducer, useEffect } from "react";
import authService from "../core/services/auth.service";
import httpClient from "../core/services/httpClient";
import logger from "../utils/logger";
import auditor from "../utils/auditor";

const AuthContext = createContext(null);

// Action types
const ACTIONS = {
  LOGIN_START: "LOGIN_START",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_ERROR: "LOGIN_ERROR",
  LOGOUT: "LOGOUT",
  REGISTER_START: "REGISTER_START",
  REGISTER_SUCCESS: "REGISTER_SUCCESS",
  REGISTER_ERROR: "REGISTER_ERROR",
  OTP_VERIFY_START: "OTP_VERIFY_START",
  OTP_VERIFY_SUCCESS: "OTP_VERIFY_SUCCESS",
  OTP_VERIFY_ERROR: "OTP_VERIFY_ERROR",
  SET_USER: "SET_USER",
  REFRESH_TOKEN_SUCCESS: "REFRESH_TOKEN_SUCCESS",
  RESTORE_SESSION: "RESTORE_SESSION",
};

// Initial state
const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isOTPVerified: false,
  isLoading: false,
  error: null,
  isSessionRestoring: true,
};

// Reducer function
function authReducer(state, action) {
  // Log state change for audit
  if (typeof window !== 'undefined' && window.__auditor) {
    auditor.recordState(action.type, state, { ...state, ...action.payload });
  }

  switch (action.type) {
    case ACTIONS.LOGIN_START:
    case ACTIONS.REGISTER_START:
      logger.debug(`Auth action: ${action.type}`);
      return { ...state, isLoading: true, error: null };

    case ACTIONS.REGISTER_SUCCESS:
      // After register: user is pending OTP, NOT fully authenticated
      logger.authEvent("REGISTER_SUCCESS", { userId: action.payload.user?.id });
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: false, // ✅ NOT authenticated yet
        isOTPVerified: false,
        isLoading: false,
        error: null,
      };

    case ACTIONS.OTP_VERIFY_SUCCESS:
      // After OTP verification: user is now fully authenticated
      logger.authEvent("OTP_VERIFY_SUCCESS", { userId: action.payload.user?.id });
      auditor.auditAuth(action.payload.user, "OTP_VERIFY");
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isOTPVerified: true,
        isLoading: false,
        error: null,
      };

    case ACTIONS.LOGIN_SUCCESS:
      logger.authEvent("LOGIN_SUCCESS", { 
        userId: action.payload.user?.id,
        role: action.payload.user?.roleId 
      });
      auditor.auditAuth(action.payload.user, "LOGIN");
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isOTPVerified: true, // Login means already verified
        isLoading: false,
        error: null,
      };

    case ACTIONS.LOGIN_ERROR:
    case ACTIONS.REGISTER_ERROR:
    case ACTIONS.OTP_VERIFY_ERROR:
      logger.error(`Auth error: ${action.type}`, action.payload);
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    case ACTIONS.LOGOUT:
      logger.authEvent("LOGOUT", { userId: state.user?.id });
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        error: null,
      };

    case ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
      };

    case ACTIONS.REFRESH_TOKEN_SUCCESS:
      return {
        ...state,
        accessToken: action.payload,
      };

    case ACTIONS.RESTORE_SESSION:
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: action.payload.isAuthenticated,
        isOTPVerified: action.payload.isOTPVerified || false,
        isSessionRestoring: false,
      };

    default:
      return state;
  }
}

// AuthProvider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize logger and auditor on mount
  useEffect(() => {
    if (state.user) {
      logger.init(state.user.id, state.user.roleId);
      auditor.init(state);
    }
  }, [state.user]);

  // ✅ ENABLED: Auto-restore session from localStorage on page load
  useEffect(() => {
    const restoreSession = () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedAccessToken = localStorage.getItem("accessToken");
        
        if (storedUser && storedAccessToken) {
          const user = JSON.parse(storedUser);
          
          logger.info("Session restored from localStorage", { 
            userId: user.id,
            role: user.roleId
          });
          
          dispatch({
            type: ACTIONS.RESTORE_SESSION,
            payload: {
              user,
              accessToken: storedAccessToken,
              isAuthenticated: true,
              isOTPVerified: true,
            },
          });
        } else {
          // No session - start unauthenticated
          logger.info("No stored session found");
          dispatch({
            type: ACTIONS.RESTORE_SESSION,
            payload: {
              user: null,
              accessToken: null,
              isAuthenticated: false,
              isOTPVerified: false,
            },
          });
        }
      } catch (error) {
        logger.error("Session restore failed", error);
        dispatch({
          type: ACTIONS.RESTORE_SESSION,
          payload: {
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isOTPVerified: false,
          },
        });
      }
    };

    restoreSession();
  }, []);

  // Setup axios interceptors
  useEffect(() => {
    // Request interceptor - add token to headers
    const requestInterceptor = httpClient.interceptors.request.use(
      (config) => {
        const startTime = performance.now();
        config.metadata = { startTime };
        
        if (state.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
        
        logger.apiCall(config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        logger.apiError("REQUEST", error.config?.url, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle token refresh
    const responseInterceptor = httpClient.interceptors.response.use(
      (response) => {
        const duration = performance.now() - response.config.metadata?.startTime;
        logger.apiCall(
          response.config.method?.toUpperCase(),
          response.config.url,
          response.status,
          duration
        );
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Log API error
        logger.apiError(
          originalRequest?.method?.toUpperCase(),
          originalRequest?.url,
          error
        );

        // ✅ SKIP token refresh for auth endpoints (login, register, verify-otp, etc.)
        // These endpoints fail legitimately and should NOT trigger token refresh
        const authEndpoints = ['/auth/login', '/auth/register', '/auth/verify-otp', '/auth/forgot-password'];
        const isAuthEndpoint = authEndpoints.some(endpoint => originalRequest?.url?.includes(endpoint));

        // If 401 and not already retried, try to refresh token
        // BUT: Skip refresh if this is an auth endpoint (login/register fail legitimately)
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (refreshToken) {
              logger.info("Attempting token refresh");
              const response = await authService.refreshToken({
                refreshToken,
              });

              const { accessToken } = response.data.data;
              localStorage.setItem("accessToken", accessToken);
              logger.authEvent("TOKEN_REFRESHED");

              dispatch({
                type: ACTIONS.REFRESH_TOKEN_SUCCESS,
                payload: accessToken,
              });

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return httpClient(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            dispatch({ type: ACTIONS.LOGOUT });
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      httpClient.interceptors.request.eject(requestInterceptor);
      httpClient.interceptors.response.eject(responseInterceptor);
    };
  }, [state.accessToken]);

  // Login action
  const login = async (email, password) => {
    dispatch({ type: ACTIONS.LOGIN_START });
    logger.userAction("LOGIN_ATTEMPT", { email });
    
    try {
      const timer = logger.startTimer("LOGIN_API_CALL");
      const response = await authService.login({ email, password });
      timer.stop();

      // Extract data from backend response (nested structure)
      const userData = response.data?.data || response.data;
      const user = {
        id: userData.userId,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        roleId: userData.roleId,
        status: userData.status,
        pharmacy: userData.pharmacy,
        isOnboarded: userData.isOnboarded,
        needsOnboarding: userData.needsOnboarding,
      };

      // Store tokens and user info
      if (userData.accessToken) {
        localStorage.setItem("accessToken", userData.accessToken);
      }
      if (userData.refreshToken) {
        localStorage.setItem("refreshToken", userData.refreshToken);
      }
      localStorage.setItem("user", JSON.stringify(user));

      // Clear any pending registration data
      localStorage.removeItem("pendingUserId");
      localStorage.removeItem("pendingEmail");

      dispatch({
        type: ACTIONS.LOGIN_SUCCESS,
        payload: { user, accessToken: userData.accessToken },
      });

      return { success: true, user };
    } catch (error) {
      // ✅ FIX: Extract error message from API response
      // Handle different response structures
      let message = "Login failed";
      let code = null;
      
      if (error.response?.data?.message) {
        // Standard API error response: { success: false, message: "..." }
        message = error.response.data.message;
      } else if (error.response?.data?.error?.message) {
        // Alternative error structure
        message = error.response.data.error.message;
      } else if (error.message) {
        // Fallback to error message
        message = error.message;
      }
      
      // Extract error code if present
      code = error.response?.data?.code;
      
      // ✅ Log error with proper status
      const status = error.response?.status;
      logger.warn("AUTH", `[LOGIN] Authentication failed: ${message}`, { status, email });
      
      // Dispatch structured error object
      const errorPayload = {
        message: message,
        status: status || null,
        code: code || null,
      };

      dispatch({
        type: ACTIONS.LOGIN_ERROR,
        payload: errorPayload,
      });

      // ✅ Also log error safely
      try {
        logger.error("Login failed", error);
      } catch (logError) {
        console.error("Failed to log error:", logError.message);
      }

      // Return code so frontend can redirect to verify OTP page
      if (code === "EMAIL_NOT_VERIFIED") {
        return {
          success: false,
          error: message,
          code: "EMAIL_NOT_VERIFIED",
        };
      }

      // Return error for all other cases (including 401 Invalid credentials)
      return { success: false, error: message };
    }
  };

  // Register action
  const register = async (userData) => {
    dispatch({ type: ACTIONS.REGISTER_START });
    try {
      const response = await authService.register(userData);

      // Backend response structure:
      // Success: { success, message, data: { userId, email, role } }
      // Axios wraps this as: response.data = { success, message, data: { userId, email, role } }
      // So response.data.data contains the user info
      const apiResponse = response.data;
      
      // Extract nested data - handle both cases
      let payload = apiResponse.data || apiResponse;
      
      // If payload is still the wrapper object, try to get data
      if (payload && !payload.userId && apiResponse.data && apiResponse.data.userId) {
        payload = apiResponse.data;
      }

      console.log("[AUTH] API Response:", apiResponse);
      console.log("[AUTH] Extracted Payload:", payload);
      console.log(
        "[AUTH] userId type:",
        typeof payload?.userId,
        "value:",
        payload?.userId
      );

      // Validate we have userId
      if (!payload?.userId) {
        throw new Error("No userId in registration response");
      }

      // Store userId temporarily for OTP verification
      localStorage.setItem("pendingUserId", payload.userId);
      localStorage.setItem("pendingEmail", payload.email);

      dispatch({
        type: ACTIONS.REGISTER_SUCCESS,
        payload: {
          user: {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
          },
          accessToken: null,
        },
      });

      return { success: true, userId: payload.userId };
    } catch (error) {
      // ✅ FIX: Extract error safely and dispatch structured error object
      const errorMessage = error.response?.data?.message || error.message || "Registration failed";
      const errorStatus = error.response?.status || null;
      const errorCode = error.response?.data?.code || null;

      // ✅ Dispatch structured error object, NOT a string
      const errorPayload = {
        message: errorMessage,
        status: errorStatus,
        code: errorCode,
      };

      dispatch({
        type: ACTIONS.REGISTER_ERROR,
        payload: errorPayload,
      });

      // ✅ Also log error safely
      try {
        logger.error("Registration failed", error);
      } catch (logError) {
        console.error("Failed to log error:", logError.message);
      }

      return { success: false, error: errorMessage };
    }
  };

  // ✅ NEW: OTP Verification action
  const verifyOTP = async (email, otp) => {
    dispatch({ type: ACTIONS.OTP_VERIFY_START });
    try {
      const response = await authService.verifyOTP({
        userId: email, // Backend accepts email as userId
        otp: otp,
      });

      // Handle both nested and direct response structures
      const responseData = response.data;
      const apiData = responseData.data || responseData;
      
      const user = {
        id: apiData.user?.id,
        email: apiData.user?.email,
        name: apiData.user?.name,
        roleId: apiData.user?.roleId,
        role: apiData.user?.role,
        status: apiData.user?.status,
        pharmacy: apiData.pharmacy,
        isOnboarded: apiData.isOnboarded,
        needsOnboarding: apiData.needsOnboarding,
      };

      // Store tokens and user info
      if (apiData.accessToken) {
        localStorage.setItem("accessToken", apiData.accessToken);
      }
      if (apiData.refreshToken) {
        localStorage.setItem("refreshToken", apiData.refreshToken);
      }
      localStorage.setItem("user", JSON.stringify(user));

      // Clear pending registration data - OTP is verified
      localStorage.removeItem("pendingUserId");
      localStorage.removeItem("pendingEmail");

      dispatch({
        type: ACTIONS.OTP_VERIFY_SUCCESS,
        payload: {
          user,
          accessToken: apiData.accessToken,
        },
      });

      return { success: true, user, role: user.role, roleId: user.roleId };
    } catch (error) {
      const message =
        error.response?.data?.message || "OTP verification failed";
      dispatch({
        type: ACTIONS.OTP_VERIFY_ERROR,
        payload: message,
      });
      return { success: false, error: message };
    }
  };

  // Logout action
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await authService.logout({ refreshToken });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("pendingUserId");
      localStorage.removeItem("pendingEmail");
      dispatch({ type: ACTIONS.LOGOUT });
    }
  };

  // Update user profile
  const updateUser = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    dispatch({
      type: ACTIONS.SET_USER,
      payload: user,
    });
  };

  // ✅ NEW: Refresh user profile from backend (fetches latest status, pharmacy data, etc.)
  const refreshUser = async () => {
    try {
      const response = await httpClient.get("/auth/me");
      const userData = response.data?.data;

      if (userData?.user) {
        const updatedUser = {
          id: userData.user.id,
          email: userData.user.email,
          name: userData.user.name,
          roleId: userData.user.roleId,
          role: userData.user.role,
          status: userData.user.status,
          isVerified: userData.user.isVerified,
          pharmacy: userData.pharmacy || null,
        };

        // Update state and localStorage
        updateUser(updatedUser);

        logger.info("User profile refreshed", {
          userId: updatedUser.id,
          status: updatedUser.status,
        });

        return { success: true, user: updatedUser };
      }

      return { success: false, error: "Invalid response from server" };
    } catch (error) {
      logger.error("Failed to refresh user profile", error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || "Failed to check status",
      };
    }
  };

  const value = {
    ...state,
    login,
    register,
    verifyOTP,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
