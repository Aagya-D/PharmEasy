import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Search,
  Plus,
  Edit2,
  Save,
  X,
  Trash2,
  Calendar
} from "lucide-react";
import inventoryService from "../../../core/services/inventory.service";
import Modal from "../../../shared/components/ui/Modal";
import { Input } from "../../../shared/components/ui/Input";
import LoadingSpinner from "../../../shared/components/ui/LoadingSpinner";
import logger from "../../../utils/logger";

// Common generic medicine names for autocomplete
const COMMON_GENERIC_NAMES = [
  "Paracetamol",
  "Ibuprofen",
  "Acetylsalicylic Acid",
  "Amoxicillin",
  "Azithromycin",
  "Ciprofloxacin",
  "Metformin",
  "Omeprazole",
  "Atorvastatin",
  "Amlodipine",
  "Losartan",
  "Lisinopril",
  "Metoprolol",
  "Levothyroxine",
  "Albuterol",
  "Cetirizine",
  "Loratadine",
  "Ranitidine",
  "Pantoprazole",
  "Diclofenac",
];

export default function PharmacyInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  // Statistics calculated from inventory
  const stats = React.useMemo(() => {
    const totalItems = inventory.length;
    const lowStockItems = inventory.filter(item => item.quantity < 10).length;
    const outOfStockItems = inventory.filter(item => item.quantity === 0).length;
    const expiringItems = inventory.filter(item => {
      const daysUntilExpiry = Math.floor(
        (new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
    }).length;

    return [
      { title: "Total Items", value: totalItems.toString(), icon: Package },
      { title: "Low Stock", value: lowStockItems.toString(), icon: AlertTriangle },
      { title: "Out of Stock", value: outOfStockItems.toString(), icon: X },
      { title: "Expiring Soon", value: expiringItems.toString(), icon: Calendar },
    ];
  }, [inventory]);

  // Fetch inventory on component mount
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      logger.info("INVENTORY", "Fetching inventory", { page });
      
      const response = await inventoryService.getMyInventory(page, 50);
      
      // Validate response structure
      if (!response || !response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid response format from server");
      }

      setInventory(response.data);
      setPagination(response.pagination || {});
      logger.success("INVENTORY", "Inventory fetched successfully", { 
        itemsCount: response.data.length 
      });
    } catch (err) {
      logger.error("INVENTORY", "Failed to fetch inventory", err);
      
      // Extract error message safely
      let errorMessage = "Failed to load inventory";
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      setInventory([]);
      setPagination({ currentPage: 1, totalPages: 0, totalItems: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Filter inventory based on search
  const filteredInventory = inventory.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.genericName.toLowerCase().includes(searchLower)
    );
  });

  // Handle edit mode toggle
  const handleEdit = (item) => {
    setEditingItemId(item.id);
    setEditValues({
      quantity: item.quantity,
      price: item.price,
    });
  };

  // Handle edit cancel
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditValues({});
  };

  // Handle save edit
  const handleSaveEdit = async (itemId) => {
    try {
      logger.info("INVENTORY", "Updating inventory item", { itemId });
      await inventoryService.updateInventoryItem(itemId, editValues);
      logger.success("INVENTORY", "Item updated successfully");
      
      // Refresh inventory
      await fetchInventory(pagination.currentPage);
      setEditingItemId(null);
      setEditValues({});
    } catch (err) {
      logger.error("INVENTORY", "Failed to update item", err);
      const errorMessage = err?.message || "Failed to update item";
      alert(errorMessage);
    }
  };

  // Handle delete
  const handleDelete = async (itemId, itemName) => {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
      return;
    }

    try {
      logger.info("INVENTORY", "Deleting inventory item", { itemId });
      await inventoryService.deleteInventoryItem(itemId);
      logger.success("INVENTORY", "Item deleted successfully");
      
      // Refresh inventory
      await fetchInventory(pagination.currentPage);
    } catch (err) {
      logger.error("INVENTORY", "Failed to delete item", err);
      const errorMessage = err?.message || "Failed to delete item";
      alert(errorMessage);
    }
  };

  // Get status badge based on quantity
  const getStatusBadge = (quantity) => {
    if (quantity === 0) {
      return <span className="px-2.5 py-1 rounded-full text-xs bg-red-50 text-red-600">Out of Stock</span>;
    } else if (quantity < 10) {
      return <span className="px-2.5 py-1 rounded-full text-xs bg-orange-50 text-orange-600">Low Stock</span>;
    } else {
      return <span className="px-2.5 py-1 rounded-full text-xs bg-green-50 text-green-600">In Stock</span>;
    }
  };

  // Get expiry badge
  const getExpiryBadge = (expiryDate) => {
    const daysUntilExpiry = Math.floor(
      (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return <span className="text-xs text-red-600">Expired</span>;
    } else if (daysUntilExpiry <= 30) {
      return <span className="text-xs text-orange-600">Expires in {daysUntilExpiry} days</span>;
    } else {
      return <span className="text-xs text-gray-600">{new Date(expiryDate).toLocaleDateString()}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b border-gray-200 px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        </header>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error?.message || error || 'An error occurred while loading inventory'}</p>
            <button
              onClick={() => fetchInventory()}
              className="mt-2 text-red-600 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-sm text-gray-500">Manage your pharmacy stock and medicines</p>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50">
                  <stat.icon size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search medicines by name or generic name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={20} />
              Add Medicine
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4">Medicine Name</th>
                  <th className="text-left px-6 py-4">Generic Name</th>
                  <th className="text-left px-6 py-4">Quantity</th>
                  <th className="text-left px-6 py-4">Price (₹)</th>
                  <th className="text-left px-6 py-4">Expiry Date</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <Package className="mx-auto mb-3 text-gray-300" size={48} />
                      <p className="text-gray-700 font-semibold text-lg">
                        {searchTerm ? "No matches found" : "No medicines in inventory"}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {searchTerm
                          ? `No medicines match "${searchTerm}". Try a different search term.`
                          : "Add your first medicine to start managing your inventory."}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          <Plus size={16} /> Add Medicine
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-gray-600">{item.genericName}</td>
                      <td className="px-6 py-4">
                        {editingItemId === item.id ? (
                          <input
                            type="number"
                            min="0"
                            value={editValues.quantity}
                            onChange={(e) => setEditValues({ ...editValues, quantity: parseInt(e.target.value) || 0 })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-gray-600">{item.quantity}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {editingItemId === item.id ? (
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editValues.price}
                            onChange={(e) => setEditValues({ ...editValues, price: parseFloat(e.target.value) || 0 })}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-gray-600">₹{item.price.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getExpiryBadge(item.expiryDate)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item.quantity)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {editingItemId === item.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Save changes"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, item.name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {inventory.length} of {pagination.totalItems} items
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchInventory(pagination.currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchInventory(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Medicine Modal */}
      <AddMedicineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchInventory(pagination.currentPage);
        }}
      />
    </div>
  );
}

// Add Medicine Modal Component
function AddMedicineModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    genericName: "",
    quantity: "",
    price: "",
    expiryDate: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [filteredGenericNames, setFilteredGenericNames] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        genericName: "",
        quantity: "",
        price: "",
        expiryDate: "",
      });
      setErrors({});
    }
  }, [isOpen]);

  // Filter generic names based on input
  const handleGenericNameChange = (value) => {
    setFormData({ ...formData, genericName: value });
    
    if (value.length > 0) {
      const filtered = COMMON_GENERIC_NAMES.filter(name =>
        name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredGenericNames(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredGenericNames([]);
      setShowSuggestions(false);
    }
  };

  // Handle form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Medicine name is required";
    }

    if (!formData.genericName.trim()) {
      newErrors.genericName = "Generic name is required";
    }

    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      newErrors.quantity = "Quantity must be 0 or greater";
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = "Price must be greater than 0";
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = "Expiry date is required";
    } else {
      const expiryDate = new Date(formData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        newErrors.expiryDate = "Expiry date must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      logger.info("INVENTORY", "Adding new medicine", { name: formData.name });

      await inventoryService.addMedicine({
        name: formData.name.trim(),
        genericName: formData.genericName.trim(),
        quantity: parseInt(formData.quantity),
        price: parseFloat(formData.price),
        expiryDate: formData.expiryDate,
      });

      logger.success("INVENTORY", "Medicine added successfully");
      onSuccess();
    } catch (err) {
      logger.error("INVENTORY", "Failed to add medicine", err);
      const errorMessage = err?.message || "Failed to add medicine";
      setErrors({ submit: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Medicine" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <Input
          label="Medicine Name"
          placeholder="e.g., Cetamol 500mg"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
          required
        />

        <div className="relative">
          <Input
            label="Generic Name"
            placeholder="e.g., Paracetamol"
            value={formData.genericName}
            onChange={(e) => handleGenericNameChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            error={errors.genericName}
            required
          />
          {showSuggestions && filteredGenericNames.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredGenericNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, genericName: name });
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantity"
            type="number"
            min="0"
            placeholder="e.g., 100"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            error={errors.quantity}
            required
          />

          <Input
            label="Price (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g., 5.99"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            error={errors.price}
            required
          />
        </div>

        <Input
          label="Expiry Date"
          type="date"
          value={formData.expiryDate}
          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
          error={errors.expiryDate}
          required
        />

        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <LoadingSpinner />
                Adding...
              </>
            ) : (
              <>
                <Plus size={18} />
                Add Medicine
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
