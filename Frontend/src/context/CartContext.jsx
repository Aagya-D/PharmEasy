import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import patientService from "../features/patient/services/patient.service";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  // Read auth state to scope cart operations to patient users only.
  const { isAuthenticated, user } = useAuth();
  // Persist current cart item list in context state.
  const [cartItems, setCartItems] = useState([]);
  // Track network loading state for cart refresh operations.
  const [isLoadingCart, setIsLoadingCart] = useState(false);

  // Normalize backend cart response shape and update local state.
  const hydrateCartFromResponse = (cartResponse) => {
    const items = cartResponse?.data?.cart?.items || [];
    setCartItems(items);
    return items;
  };

  // Fetch latest cart for authenticated patient sessions.
  const refreshCart = useCallback(async () => {
    // Clear cart for unauthenticated users or non-patient roles.
    if (!isAuthenticated || user?.roleId !== 3) {
      setCartItems([]);
      return;
    }

    // Start refresh loading indicator.
    setIsLoadingCart(true);
    try {
      // Retrieve cart snapshot from patient service API.
      const response = await patientService.getCart();
      hydrateCartFromResponse(response);
    } catch (error) {
      console.error("Failed to load cart", error);
    } finally {
      // End refresh loading state.
      setIsLoadingCart(false);
    }
  }, [isAuthenticated, user?.roleId]);

  // Refresh cart on auth or role changes.
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // Add one medicine entry to cart using normalized payload fields.
  const addToCart = async (medicine) => {
    // Build payload defensively from mixed medicine data shapes.
    const payload = {
      medicineId: String(medicine?.id || medicine?.medicine || medicine?.brandName || "medicine"),
      pharmacyId: String(medicine?.pharmacy?.id || "unknown-pharmacy"),
      medicineName: medicine?.medicine || medicine?.brandName || "Medicine",
      genericName: medicine?.genericName || null,
      price: Number(medicine?.price || 0),
      quantity: 1,
      inStock: Boolean(medicine?.inStock),
      expiryDate: medicine?.expiryDate || medicine?.expiry || null,
      imageUrl: medicine?.imageUrl || null,
      pharmacyName: medicine?.pharmacy?.name || null,
      pharmacyAddress: medicine?.pharmacy?.address || null,
      pharmacyContact: medicine?.pharmacy?.contactNumber || null,
    };

    const response = await patientService.addCartItem(payload);
    return hydrateCartFromResponse(response);
  };

  // Update existing cart item fields and rehydrate cart list.
  const updateCartItem = async (itemId, payload) => {
    const response = await patientService.updateCartItem(itemId, payload);
    return hydrateCartFromResponse(response);
  };

  // Remove one item with optimistic UI and rollback on failure.
  const removeFromCart = async (itemId) => {
    // Snapshot current list for rollback path.
    const previousItems = cartItems;
    // Optimistically remove item from UI.
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== itemId));

    try {
      // Persist item removal on backend.
      const response = await patientService.removeCartItem(itemId);
      return hydrateCartFromResponse(response);
    } catch (error) {
      // Revert optimistic removal on API failure.
      setCartItems(previousItems);
      throw error;
    }
  };

  // Remove all cart items one by one and clear local list.
  const clearCart = async () => {
    // Skip API calls when cart is already empty.
    if (!cartItems.length) return;
    await Promise.all(cartItems.map((item) => patientService.removeCartItem(item.id)));
    setCartItems([]);
  };

  // Compute total quantity across all cart lines.
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems]
  );

  // Compute selected quantity used for checkout actions.
  const selectedCount = useMemo(
    () => cartItems.filter((item) => item.selected).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems]
  );

  // Expose cart state and actions via context value.
  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      selectedCount,
      isLoadingCart,
      addToCart,
      updateCartItem,
      removeFromCart,
      clearCart,
      refreshCart,
    }),
    [cartItems, cartCount, selectedCount, isLoadingCart, refreshCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  // Enforce provider usage for cart hook consumers.
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};

export default CartContext;
