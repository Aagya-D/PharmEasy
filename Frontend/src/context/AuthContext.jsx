import React, { createContext, useContext, useReducer, useEffect } from "react";
import authService from "../core/services/auth.service";
import httpClient, { clearAuth } from "../core/services/httpClient";
import logger from "../utils/logger";
import auditor from "../utils/auditor";

const AuthContext = createContext(null);

// Auth reducer action type constants.
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

// Initial auth state before hydration and token verification.
const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isOTPVerified: false,
  isLoading: false,
  error: null,
  isInitializing: true,
};

// Auth reducer that coordinates login/register/refresh state transitions.
function authReducer(state, action) {
  // Record reducer transitions for debug audit trace.
  if (typeof window !== 'undefined' && window.__auditor) {
    auditor.recordState(action.type, state, { ...state, ...action.payload });
  }

  switch (action.type) {
    case ACTIONS.LOGIN_START:
    case ACTIONS.REGISTER_START:
      logger.debug(`Auth action: ${action.type}`);
      return { ...state, isLoading: true, error: null };

    case ACTIONS.REGISTER_SUCCESS:
      // Registration keeps user pending OTP and not yet authenticated.
      logger.authEvent("REGISTER_SUCCESS", { userId: action.payload.user?.id });
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: false,
        isOTPVerified: false,
        isLoading: false,
        error: null,
      };

    case ACTIONS.OTP_VERIFY_SUCCESS:
      // OTP verification completes authentication.
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
        isOTPVerified: true,
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
        isInitializing: false,
      };

    default:
      return state;
  }
}

/**
 * Lightweight JWT payload decoder — no external dependency needed.
 * Returns null on any malformed input so callers can treat it as "invalid".
 */
function decodeTokenPayload(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

/**
 * Returns true when the JWT is structurally valid and its exp claim is
 * in the past (or when the token cannot be decoded at all).
 */
function isTokenExpired(token) {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 < Date.now();
}

function extractRefreshPayload(response) {
  // Support different response wrappers used by service callers.
  const payload = response?.data?.data || response?.data || response;

  const refreshUser = payload?.user
    ? {
        id: payload.user.userId || payload.user.id,
        email: payload.user.email,
        name: payload.user.name,
        avatarUrl: payload.user.avatarUrl || null,
        phone: payload.user.phone || null,
        role: payload.user.role,
        roleId: payload.user.roleId,
        status: payload.user.status,
        isVerified: payload.user.isVerified ?? true,
        shippingAddress: payload.user.shippingAddress || null,
        pharmacy: payload.user.pharmacy || null,
        isOnboarded: payload.user.isOnboarded ?? true,
        needsOnboarding: payload.user.needsOnboarding ?? false,
      }
    : null;

  return {
    accessToken: payload?.accessToken || null,
    refreshToken: payload?.refreshToken || null,
    user: refreshUser,
  };
}

function shouldForceLogoutOnRefreshFailure(refreshError) {
  // Treat definitive invalid/expired token failures as forced logout cases.
  const status = refreshError?.response?.status;
  const message = String(
    refreshError?.response?.data?.message || refreshError?.message || ""
  ).toLowerCase();

  const tokenInvalidSignal =
    message.includes("invalid") ||
    message.includes("expired") ||
    message.includes("revoked") ||
    message.includes("no refresh token");

  return (status === 401 || status === 403) && tokenInvalidSignal;
}

function isTransientRefreshFailure(refreshError) {
  // Retry only for network and temporary server failures.
  const status = refreshError?.response?.status;
  const code = String(refreshError?.code || "").toUpperCase();

  if (!status) return true;
  if (status >= 500) return true;
  if (code === "ECONNABORTED" || code === "ERR_NETWORK") return true;
  return false;
}

function wait(ms) {
  // Small utility used by exponential backoff refresh retries.
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestTokenRefreshWithRetry(maxRetries = 2, baseDelayMs = 500) {
  // Retry refresh with backoff to survive temporary outages.
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await authService.refreshToken();
    } catch (refreshError) {
      const shouldRetry =
        isTransientRefreshFailure(refreshError) && attempt < maxRetries;

      if (!shouldRetry) {
        throw refreshError;
      }

      const delay = baseDelayMs * 2 ** attempt;
      logger.warn("Transient refresh failure, retrying", {
        attempt: attempt + 1,
        delay,
        error: refreshError?.message,
      });
      await wait(delay);
      attempt += 1;
    }
  }

  throw new Error("Token refresh retries exhausted");
}

// Read local session from storage during reducer initialization.
// This runs before the first render so auth state is immediately hydrated.
function initAuthState(initial) {
  console.log('[AUTH INIT] Starting initialization from localStorage...');
  
  try {
    const storedUser = localStorage.getItem("user");
    const storedAccessToken = localStorage.getItem("accessToken");
    
    if (storedUser && storedAccessToken) {
      try {
        const user = JSON.parse(storedUser);
        
        // Keep the session visible immediately, then verify it in the background.
        console.log('[AUTH INIT] ✅ Successfully loaded from localStorage:', {
          userId: user.id,
          roleId: user.roleId,
          isAuthenticated: true,
          isInitializing: true, // Still need to verify with server
        });
        
        // Return hydrated session while backend verification is still pending.
        return {
          ...initial,
          user,
          accessToken: storedAccessToken,
          isAuthenticated: true,
          isOTPVerified: true,
          isInitializing: true, // Still verifying with backend
        };
      } catch (parseError) {
        console.error('[AUTH INIT] Failed to parse stored user:', parseError);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
      }
    } else {
      console.log('[AUTH INIT] No stored session found - starting unauthenticated');
    }
  } catch (error) {
    console.error('[AUTH INIT] Error reading localStorage:', error);
  }
  
  // No local session found, so initialization can finish immediately.
  return {
    ...initial,
    isInitializing: false,
  };
}

// Auth context provider.
export function AuthProvider({ children }) {
  // Initialize reducer with localStorage bootstrap function.
  const [state, dispatch] = useReducer(authReducer, initialState, initAuthState);

  // Initialize logger and auditor once user identity exists.
  useEffect(() => {
    if (state.user) {
      logger.init(state.user.id, state.user.roleId);
      auditor.init(state);
    }
  }, [state.user]);

  // Restore session from localStorage and verify it with backend.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        let storedAccessToken = localStorage.getItem("accessToken");
        
        if (storedUser && storedAccessToken) {
          const user = JSON.parse(storedUser);

          // If access token is expired, try refresh before forcing logout.
          if (isTokenExpired(storedAccessToken)) {
            logger.warn("Stored access token expired during hydration, trying refresh", {
              userId: user.id,
            });

            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) {
              // Without a refresh token, the cached session cannot be recovered safely.
              clearAuth();
              dispatch({
                type: ACTIONS.RESTORE_SESSION,
                payload: {
                  user: null,
                  accessToken: null,
                  isAuthenticated: false,
                  isOTPVerified: false,
                },
              });
              return;
            }

            try {
              const refreshResponse = await requestTokenRefreshWithRetry();
              const {
                accessToken: refreshedAccessToken,
                refreshToken: rotatedRefreshToken,
                user: refreshedUser,
              } = extractRefreshPayload(refreshResponse);

              if (!refreshedAccessToken) {
                throw new Error("Hydration refresh returned no access token");
              }

              // Persist the rotated tokens before the next request runs.
              storedAccessToken = refreshedAccessToken;
              localStorage.setItem("accessToken", refreshedAccessToken);
              if (rotatedRefreshToken) {
                localStorage.setItem("refreshToken", rotatedRefreshToken);
              }
              if (refreshedUser?.id) {
                localStorage.setItem("user", JSON.stringify(refreshedUser));
              }
            } catch (refreshError) {
              logger.warn("Hydration refresh failed", {
                userId: user.id,
                status: refreshError?.response?.status,
                error: refreshError?.message,
              });

              clearAuth();
              dispatch({
                type: ACTIONS.RESTORE_SESSION,
                payload: {
                  user: null,
                  accessToken: null,
                  isAuthenticated: false,
                  isOTPVerified: false,
                },
              });
              return;
            }
          }

          logger.info("Session found in localStorage, verifying token", { 
            userId: user.id,
            role: user.roleId
          });

          // Set the token in the httpClient for the verification request
          // Attach the token so /auth/me can validate the stored session.
          httpClient.defaults.headers.common["Authorization"] = `Bearer ${storedAccessToken}`;

          try {
            // Confirm the session with the backend before trusting the cached user.
            const response = await authService.getProfile();
            const responseData = response.data || response;
            const userData = responseData.user || responseData;
            const pharmacyData = responseData.pharmacy || null;

            // Rebuild the user object from the verified backend payload.
            const verifiedUser = {
              id: userData.userId || userData.id,
              email: userData.email,
              name: userData.name,
              avatarUrl: userData.avatarUrl || user?.avatarUrl || null,
              phone: userData.phone || user?.phone || null,
              role: userData.role,
              roleId: userData.roleId,
              status: userData.status,
              isVerified: userData.isVerified ?? true,
              shippingAddress: userData.shippingAddress || null,
              pharmacy: pharmacyData,
              isOnboarded: userData.isOnboarded ?? true,
              needsOnboarding: userData.needsOnboarding ?? false,
            };

            logger.authEvent("TOKEN_VERIFIED", { 
              userId: verifiedUser.id,
              role: verifiedUser.roleId 
            });
            
            // Replace the cached session with the verified version.
            dispatch({
              type: ACTIONS.RESTORE_SESSION,
              payload: {
                user: verifiedUser,
                accessToken: storedAccessToken,
                isAuthenticated: true,
                isOTPVerified: true,
              },
            });
          } catch (verificationError) {
            // Verification failed, so the cached session is no longer trusted.
            const status = verificationError.response?.status;
            logger.warn("Token verification failed during hydration", {
              status,
              error: verificationError.message,
              userId: user.id,
            });

            // Clear all auth artifacts tied to the invalid token.
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            localStorage.removeItem("pendingUserId");
            localStorage.removeItem("pendingEmail");
            // Remove the stale bearer token from the shared client.
            delete httpClient.defaults.headers.common["Authorization"];

            dispatch({
              type: ACTIONS.RESTORE_SESSION,
              payload: {
                user: null,
                accessToken: null,
                isAuthenticated: false,
                isOTPVerified: false,
              },
            });

            // Redirect immediately when the backend rejects the session.
            if ((status === 401 || status === 403) && typeof window !== "undefined") {
              window.location.replace("/login");
            }
          }
        } else {
          // No session found, proceed unauthenticated.
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

  // Configure API request/response interceptors.
  useEffect(() => {
    // Add bearer token and request timing metadata.
    const requestInterceptor = httpClient.interceptors.request.use(
      (config) => {
        const startTime = performance.now();
        config.metadata = { startTime };
        
        if (state.accessToken) {
          // Keep every outgoing request authenticated while the user is signed in.
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

    // Handle API logging and automatic token refresh on 401.
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

        // Log failed API response.
        logger.apiError(
          originalRequest?.method?.toUpperCase(),
          originalRequest?.url,
          error
        );

        // Skip refresh for auth endpoints that can fail legitimately.
        const authEndpoints = [
          "/auth/login",
          "/auth/register",
          "/auth/verify-otp",
          "/auth/forgot-password",
          "/auth/refresh",
        ];
        const isAuthEndpoint = authEndpoints.some((endpoint) =>
          originalRequest?.url?.includes(endpoint)
        );

        // Refresh once on unauthorized responses from non-auth endpoints.
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;

          const refreshToken = localStorage.getItem("refreshToken");
          if (!refreshToken) {
            // Missing refresh token means session cannot be recovered.
            logger.warn("No refresh token in storage, clearing auth");
            dispatch({ type: ACTIONS.LOGOUT });
            clearAuth();
            return Promise.reject(error);
          }

          try {
            logger.info("Attempting token refresh");
            const response = await requestTokenRefreshWithRetry();

            // Extract tokens and optional user snapshot from refresh response.
            const {
              accessToken,
              refreshToken: rotatedRefreshToken,
              user: refreshUser,
            } = extractRefreshPayload(response);
            if (!accessToken) {
              throw new Error("Refresh succeeded but accessToken was missing in response");
            }

            localStorage.setItem("accessToken", accessToken);
            if (rotatedRefreshToken) {
              localStorage.setItem("refreshToken", rotatedRefreshToken);
            }

            if (refreshUser?.id) {
              // Refresh the stored user snapshot so the UI stays in sync.
              localStorage.setItem("user", JSON.stringify(refreshUser));
              dispatch({ type: ACTIONS.SET_USER, payload: refreshUser });
            }

            // Keep default auth header in sync immediately.
            httpClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

            // Refresh /auth/me snapshot for latest role/status/pharmacy fields.
            try {
              const meResponse = await authService.getProfile();
              const mePayload = meResponse?.data || meResponse;
              const profileUser = mePayload?.user || mePayload;
              const profilePharmacy = mePayload?.pharmacy || null;

              if (profileUser?.id || profileUser?.userId) {
                // Merge the latest profile and pharmacy data into auth state.
                const refreshedUser = {
                  id: profileUser.userId || profileUser.id,
                  email: profileUser.email,
                  name: profileUser.name,
                  avatarUrl: profileUser.avatarUrl || state.user?.avatarUrl || null,
                  phone: profileUser.phone || state.user?.phone || null,
                  role: profileUser.role,
                  roleId: profileUser.roleId,
                  status: profileUser.status,
                  isVerified: profileUser.isVerified ?? true,
                  shippingAddress: profileUser.shippingAddress || null,
                  pharmacy: profilePharmacy,
                  isOnboarded: profileUser.isOnboarded ?? state.user?.isOnboarded ?? true,
                  needsOnboarding: profileUser.needsOnboarding ?? state.user?.needsOnboarding ?? false,
                };
                localStorage.setItem("user", JSON.stringify(refreshedUser));
                dispatch({ type: ACTIONS.SET_USER, payload: refreshedUser });
              }
            } catch (meError) {
              logger.warn("Failed to refresh /auth/me after token rotation", {
                error: meError?.message,
              });
            }

            logger.authEvent("TOKEN_REFRESHED");

            dispatch({
              type: ACTIONS.REFRESH_TOKEN_SUCCESS,
              payload: accessToken,
            });

            // Retry original request with updated bearer token.
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return httpClient(originalRequest);
          } catch (refreshError) {
            // Force logout only for definitive refresh token failures.
            logger.warn("Token refresh failed", {
              error: refreshError.message,
              status: refreshError?.response?.status,
            });

            if (shouldForceLogoutOnRefreshFailure(refreshError)) {
              dispatch({ type: ACTIONS.LOGOUT });
              clearAuth();
            }

            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      httpClient.interceptors.request.eject(requestInterceptor);
      httpClient.interceptors.response.eject(responseInterceptor);
    };
  }, [state.accessToken, state.isAuthenticated]);

  // Proactive silent refresh one minute before token expiry.
  useEffect(() => {
    if (!state.accessToken || !state.isAuthenticated) return;

    const payload = decodeTokenPayload(state.accessToken);
    if (!payload?.exp) return;

    // Refresh 60 seconds before expiry, or immediately if already near expiry.
    const msUntilRefresh = payload.exp * 1000 - Date.now() - 60 * 1000;
    const delay = msUntilRefresh > 0 ? msUntilRefresh : 0;

    const timer = setTimeout(async () => {
      try {
        logger.info("Silent token refresh triggered");
        const response = await requestTokenRefreshWithRetry();
        const {
          accessToken,
          refreshToken: rotatedRefreshToken,
          user: refreshUser,
        } = extractRefreshPayload(response);
        if (!accessToken) {
          throw new Error("Silent refresh succeeded but accessToken missing in response");
        }

        localStorage.setItem("accessToken", accessToken);
        if (rotatedRefreshToken) {
          localStorage.setItem("refreshToken", rotatedRefreshToken);
        }
        if (refreshUser?.id) {
          localStorage.setItem("user", JSON.stringify(refreshUser));
          dispatch({ type: ACTIONS.SET_USER, payload: refreshUser });
        }
        httpClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
        dispatch({ type: ACTIONS.REFRESH_TOKEN_SUCCESS, payload: accessToken });
        logger.authEvent("SILENT_REFRESH_SUCCESS");
      } catch (err) {
        logger.warn("Silent token refresh failed", {
          error: err.message,
          status: err?.response?.status,
        });

        if (shouldForceLogoutOnRefreshFailure(err)) {
          dispatch({ type: ACTIONS.LOGOUT });
          clearAuth();
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [state.accessToken]);

  // Login action.
  const login = async (email, password) => {
    dispatch({ type: ACTIONS.LOGIN_START });
    logger.userAction("LOGIN_ATTEMPT", { email });
    
    try {
      const timer = logger.startTimer("LOGIN_API_CALL");
      const response = await authService.login({ email, password });
      timer.stop();

      // Normalize backend response into frontend user shape.
      const userData = response.data?.data || response.data;
      const user = {
        id: userData.userId,
        email: userData.email,
        name: userData.name,
        avatarUrl: userData.avatarUrl || null,
        role: userData.role,
        roleId: userData.roleId,
        status: userData.status,
        isVerified: userData.isVerified ?? true,
        shippingAddress: userData.shippingAddress || null,
        pharmacy: userData.pharmacy,
        isOnboarded: userData.isOnboarded ?? true,
        needsOnboarding: userData.needsOnboarding ?? false,
      };

      // Persist session tokens and user snapshot.
      if (userData.accessToken) {
        localStorage.setItem("accessToken", userData.accessToken);
      }
      if (userData.refreshToken) {
        localStorage.setItem("refreshToken", userData.refreshToken);
      }
      localStorage.setItem("user", JSON.stringify(user));

      // Clear temporary OTP registration state so the next flow starts cleanly.
      localStorage.removeItem("pendingUserId");
      localStorage.removeItem("pendingEmail");

      dispatch({
        type: ACTIONS.LOGIN_SUCCESS,
        payload: { user, accessToken: userData.accessToken },
      });

      return { success: true, user };
    } catch (error) {
      // Resolve API error message from supported response shapes.
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
      
      // Log login failure with status metadata.
      const status = error.response?.status;
      logger.warn("AUTH", `[LOGIN] Authentication failed: ${message}`, { status, email });
      
      // Save structured error object to auth state.
      const errorPayload = {
        message: message,
        status: status || null,
        code: code || null,
      };

      dispatch({
        type: ACTIONS.LOGIN_ERROR,
        payload: errorPayload,
      });

      // Guard logger call so error handling never crashes UI.
      try {
        logger.error("Login failed", error);
      } catch (logError) {
        console.error("Failed to log error:", logError.message);
      }

      // Preserve OTP-not-verified signal for login screen routing.
      if (code === "EMAIL_NOT_VERIFIED") {
        return {
          success: false,
          error: message,
          code: "EMAIL_NOT_VERIFIED",
        };
      }

      // Return generic error payload for all other failures.
      return { success: false, error: message };
    }
  };

  // Register action.
  const register = async (userData) => {
    dispatch({ type: ACTIONS.REGISTER_START });
    try {
      const response = await authService.register(userData);

      // Handle both nested and flat response payloads.
      const apiResponse = response.data;
      
      // Extract nested data - handle both cases
      let payload = apiResponse.data || apiResponse;
      
      // Fallback when payload is still wrapped once more.
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

      // Ensure registration returned required identifiers.
      if (!payload?.userId) {
        throw new Error("No userId in registration response");
      }

      // Store pending registration identifiers for OTP step.
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
      // Extract structured registration error details.
      const errorMessage = error.response?.data?.message || error.message || "Registration failed";
      const errorStatus = error.response?.status || null;
      const errorCode = error.response?.data?.code || null;

      // Dispatch structured error object to reducer.
      const errorPayload = {
        message: errorMessage,
        status: errorStatus,
        code: errorCode,
      };

      dispatch({
        type: ACTIONS.REGISTER_ERROR,
        payload: errorPayload,
      });

      // Guard logger invocation.
      try {
        logger.error("Registration failed", error);
      } catch (logError) {
        console.error("Failed to log error:", logError.message);
      }

      return { success: false, error: errorMessage };
    }
  };

  // OTP verification action.
  const verifyOTP = async (email, otp) => {
    dispatch({ type: ACTIONS.OTP_VERIFY_START });
    try {
      const response = await authService.verifyOTP({
        userId: email, // Backend accepts email as userId
        otp: otp,
      });

      // Handle nested and flat response structures.
      const responseData = response.data;
      const apiData = responseData.data || responseData;
      
      const user = {
        id: apiData.user?.id,
        email: apiData.user?.email,
        name: apiData.user?.name,
        avatarUrl: apiData.user?.avatarUrl || null,
        roleId: apiData.user?.roleId,
        role: apiData.user?.role,
        status: apiData.user?.status,
        isVerified: apiData.user?.isVerified ?? true,
        shippingAddress: apiData.user?.shippingAddress || null,
        pharmacy: apiData.pharmacy,
        isOnboarded: apiData.isOnboarded ?? true,
        needsOnboarding: apiData.needsOnboarding ?? false,
      };

      // Persist verified session.
      if (apiData.accessToken) {
        localStorage.setItem("accessToken", apiData.accessToken);
      }
      if (apiData.refreshToken) {
        localStorage.setItem("refreshToken", apiData.refreshToken);
      }
      localStorage.setItem("user", JSON.stringify(user));

      // OTP is complete, clear temporary registration markers.
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

  // Logout action.
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await authService.logout({ refreshToken });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear local session state on logout completion.
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("pendingUserId");
      localStorage.removeItem("pendingEmail");
      dispatch({ type: ACTIONS.LOGOUT });
    }
  };

  // Update local user snapshot in storage and reducer.
  const updateUser = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
    dispatch({
      type: ACTIONS.SET_USER,
      payload: user,
    });
  };

  // Refresh user profile from backend to get latest status and pharmacy data.
  const refreshUser = async () => {
    try {
      const response = await httpClient.get("/auth/me");
      const userData = response.data?.data;

      if (userData?.user) {
        const updatedUser = {
          id: userData.user.id,
          email: userData.user.email,
          name: userData.user.name,
          avatarUrl: userData.user.avatarUrl || null,
          roleId: userData.user.roleId,
          role: userData.user.role,
          status: userData.user.status,
          isVerified: userData.user.isVerified,
          shippingAddress: userData.user.shippingAddress || null,
          pharmacy: userData.pharmacy || null,
        };

        // Sync refreshed profile into local state and storage.
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

  // Expose auth state and actions to children.
  const value = {
    ...state,
    login,
    register,
    verifyOTP,
    logout,
    updateUser,
    refreshUser,
    // Save shipping address and merge updated user payload.
    updateShippingAddress: async (shippingAddress) => {
      const response = await authService.updateShippingAddress(shippingAddress);
      const updatedUserFromApi = response?.data?.user;

      const nextUser = {
        ...(state.user || {}),
        ...(updatedUserFromApi || {}),
        shippingAddress:
          updatedUserFromApi?.shippingAddress ?? shippingAddress ?? null,
      };

      updateUser(nextUser);
      return { success: true, user: nextUser };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Auth hook for consuming AuthContext safely.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
