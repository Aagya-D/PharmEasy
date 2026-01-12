import React, { createContext, useContext, useReducer, useEffect } from "react";
import axios from "axios";
import { api } from "../services/auth.api";

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
  switch (action.type) {
    case ACTIONS.LOGIN_START:
    case ACTIONS.REGISTER_START:
      return { ...state, isLoading: true, error: null };

    case ACTIONS.REGISTER_SUCCESS:
      // After register: user is pending OTP, NOT fully authenticated
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
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true, // ✅ Now authenticated
        isOTPVerified: true,
        isLoading: false,
        error: null,
      };

    case ACTIONS.LOGIN_SUCCESS:
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
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };

    case ACTIONS.LOGOUT:
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

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = () => {
      const storedAccessToken = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");

      if (storedAccessToken && storedUser) {
        try {
          dispatch({
            type: ACTIONS.RESTORE_SESSION,
            payload: {
              user: JSON.parse(storedUser),
              accessToken: storedAccessToken,
              isAuthenticated: true,
            },
          });
        } catch (error) {
          // Clear invalid stored data
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          localStorage.removeItem("refreshToken");
          dispatch({
            type: ACTIONS.RESTORE_SESSION,
            payload: {
              user: null,
              accessToken: null,
              isAuthenticated: false,
            },
          });
        }
      } else {
        dispatch({
          type: ACTIONS.RESTORE_SESSION,
          payload: {
            user: null,
            accessToken: null,
            isAuthenticated: false,
          },
        });
      }
    };

    restoreSession();
  }, []);

  // Setup axios interceptors
  useEffect(() => {
    // Request interceptor - add token to headers
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (state.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (refreshToken) {
              const response = await api.post("/auth/refresh", {
                refreshToken,
              });

              const { accessToken } = response.data.data;
              localStorage.setItem("accessToken", accessToken);

              dispatch({
                type: ACTIONS.REFRESH_TOKEN_SUCCESS,
                payload: accessToken,
              });

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return api(originalRequest);
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
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [state.accessToken]);

  // Login action
  const login = async (email, password) => {
    dispatch({ type: ACTIONS.LOGIN_START });
    try {
      const response = await api.post("/auth/login", { email, password });

      // Backend returns: { message, user: { id, email, name, roleId, ... } }
      // Tokens are in HTTP-only cookies
      const user = response.data.user;

      // Store user info in localStorage
      localStorage.setItem("user", JSON.stringify(user));

      // Clear any pending registration data
      localStorage.removeItem("pendingUserId");
      localStorage.removeItem("pendingEmail");

      dispatch({
        type: ACTIONS.LOGIN_SUCCESS,
        payload: { user, accessToken: null },
      });

      return { success: true };
    } catch (error) {
      // Check for EMAIL_NOT_VERIFIED error code from backend
      const code = error.response?.data?.code;
      const message =
        error.response?.data?.message ||
        error.response?.data?.error?.message ||
        "Login failed";

      dispatch({
        type: ACTIONS.LOGIN_ERROR,
        payload: message,
      });

      // Return code so frontend can redirect to verify OTP page
      if (code === "EMAIL_NOT_VERIFIED") {
        return {
          success: false,
          error: message,
          code: "EMAIL_NOT_VERIFIED",
        };
      }

      return { success: false, error: message };
    }
  };

  // Register action
  const register = async (userData) => {
    dispatch({ type: ACTIONS.REGISTER_START });
    try {
      const response = await api.post("/auth/register", userData);

      // Registration returns: { success, message, data: { userId, email, role } }
      const apiResponse = response.data;
      const payload = apiResponse.data;

      console.log("[AUTH] Register response data:", apiResponse);
      console.log(
        "[AUTH] userId type:",
        typeof payload.userId,
        "value:",
        payload.userId
      );

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
      const message = error.response?.data?.message || "Registration failed";
      dispatch({
        type: ACTIONS.REGISTER_ERROR,
        payload: message,
      });
      return { success: false, error: message };
    }
  };

  // ✅ NEW: OTP Verification action
  const verifyOTP = async (email, otp) => {
    dispatch({ type: ACTIONS.OTP_VERIFY_START });
    try {
      const response = await api.post("/auth/verify-otp", {
        userId: email, // Backend accepts email as userId
        otp: otp,
      });

      const apiResponse = response.data;
      const user = apiResponse.user;

      // Store user info (but NOT accessToken as it's in cookies)
      localStorage.setItem("user", JSON.stringify(user));

      // Clear pending registration data - OTP is verified
      localStorage.removeItem("pendingUserId");
      localStorage.removeItem("pendingEmail");

      dispatch({
        type: ACTIONS.OTP_VERIFY_SUCCESS,
        payload: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
          },
          accessToken: null, // Tokens are in cookies
        },
      });

      return { success: true };
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
        await api.post("/auth/logout", { refreshToken });
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

  const value = {
    ...state,
    login,
    register,
    verifyOTP,
    logout,
    updateUser,
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
