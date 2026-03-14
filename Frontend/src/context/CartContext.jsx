import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import patientService from "../features/patient/services/patient.service";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [isLoadingCart, setIsLoadingCart] = useState(false);

  const hydrateCartFromResponse = (cartResponse) => {
    const items = cartResponse?.data?.cart?.items || [];
    setCartItems(items);
    return items;
  };

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated || user?.roleId !== 3) {
      setCartItems([]);
      return;
    }

    setIsLoadingCart(true);
    try {
      const response = await patientService.getCart();
      hydrateCartFromResponse(response);
    } catch (error) {
      console.error("Failed to load cart", error);
    } finally {
      setIsLoadingCart(false);
    }
  }, [isAuthenticated, user?.roleId]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = async (medicine) => {
    const payload = {
      medicineId: String(medicine?.id || medicine?.medicine || medicine?.brandName || "medicine"),
      pharmacyId: String(medicine?.pharmacy?.id || "unknown-pharmacy"),
      medicineName: medicine?.medicine || medicine?.brandName || "Medicine",
      genericName: medicine?.genericName || null,
      price: Number(medicine?.price || 0),
      quantity: 1,
      inStock: Boolean(medicine?.inStock),
      expiryDate: medicine?.expiryDate || medicine?.expiry || null,
      pharmacyName: medicine?.pharmacy?.name || null,
      pharmacyAddress: medicine?.pharmacy?.address || null,
      pharmacyContact: medicine?.pharmacy?.contactNumber || null,
    };

    const response = await patientService.addCartItem(payload);
    return hydrateCartFromResponse(response);
  };

  const isPharmacyMismatchError = (error) => {
    return error?.response?.data?.errorCode === "PHARMACY_MISMATCH";
  };

  const updateCartItem = async (itemId, payload) => {
    const response = await patientService.updateCartItem(itemId, payload);
    return hydrateCartFromResponse(response);
  };

  const removeFromCart = async (itemId) => {
    const previousItems = cartItems;
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== itemId));

    try {
      const response = await patientService.removeCartItem(itemId);
      return hydrateCartFromResponse(response);
    } catch (error) {
      setCartItems(previousItems);
      throw error;
    }
  };

  const clearCart = async () => {
    if (!cartItems.length) return;
    await Promise.all(cartItems.map((item) => patientService.removeCartItem(item.id)));
    setCartItems([]);
  };

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems]
  );

  const selectedCount = useMemo(
    () => cartItems.filter((item) => item.selected).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      selectedCount,
      isLoadingCart,
      addToCart,
      isPharmacyMismatchError,
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
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};

export default CartContext;
