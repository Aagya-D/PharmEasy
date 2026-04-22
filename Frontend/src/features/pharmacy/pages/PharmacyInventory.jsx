import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  Package, 
  AlertTriangle, 
  Search,
  Plus,
  Eye,
  X,
  Trash2,
  Calendar
} from "lucide-react";
import inventoryService from "../../../core/services/inventory.service";
import Modal from "../../../shared/components/ui/Modal";
import ConfirmModal from "../../../shared/components/ui/ConfirmModal";
import LoadingSpinner from "../../../shared/components/ui/LoadingSpinner";
import logger from "../../../utils/logger";
import MedicineForm from "../components/MedicineForm";
import MedicineDetailModal from "../components/MedicineDetailModal";

const LOW_STOCK_THRESHOLD = 20;
const EXPIRING_SOON_DAYS = 30;

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "IN_STOCK", label: "In Stock" },
  { key: "LOW_STOCK", label: "Low Stock" },
  { key: "OUT_OF_STOCK", label: "Out of Stock" },
  { key: "EXPIRING_SOON", label: "Expiring Soon" },
  { key: "EXPIRED", label: "Expired" },
];

const getDaysUntilExpiry = (expiryDate) => {
  return Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
};

const matchesStatusFilter = (item, status) => {
  const qty = Number(item?.quantity || 0);
  const daysUntilExpiry = getDaysUntilExpiry(item?.expiryDate);
  const isExpired = daysUntilExpiry < 0;

  switch (status) {
    case "IN_STOCK":
      // "In Stock" is the healthy bucket: available, not low stock, and not expired.
      return qty >= LOW_STOCK_THRESHOLD && !isExpired;
    case "LOW_STOCK":
      return qty > 0 && qty < LOW_STOCK_THRESHOLD && !isExpired;
    case "OUT_OF_STOCK":
      return qty === 0;
    case "EXPIRING_SOON":
      return daysUntilExpiry >= 0 && daysUntilExpiry <= EXPIRING_SOON_DAYS;
    case "EXPIRED":
      return daysUntilExpiry < 0;
    case "ALL":
    default:
      return true;
  }
};

export default function PharmacyInventory() {
  const [searchParams] = useSearchParams();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const globalSearch = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(globalSearch);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [activeDetailMedicine, setActiveDetailMedicine] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, itemId: null, itemName: "" });

  // Statistics calculated from inventory
  const stats = React.useMemo(() => {
    // Keep the summary cards derived from the current in-memory inventory.
    const totalItems = inventory.length;
    const lowStockItems = inventory.filter(item => item.quantity > 0 && item.quantity < LOW_STOCK_THRESHOLD).length;
    const outOfStockItems = inventory.filter(item => item.quantity === 0).length;
    const expiringItems = inventory.filter(item => {
      const daysUntilExpiry = getDaysUntilExpiry(item.expiryDate);
      return daysUntilExpiry >= 0 && daysUntilExpiry <= EXPIRING_SOON_DAYS;
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

  useEffect(() => {
    setSearchTerm((prev) => (prev === globalSearch ? prev : globalSearch));
  }, [globalSearch]);

  const fetchInventory = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      logger.info("INVENTORY", "Fetching inventory", { page });
      
      // Pull the current page from the backend before rendering the table.
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

  // Filter inventory based on search and selected stock status.
  const filteredInventory = inventory.filter(item => {
    // Search across medicine name, generic name, and category.
    const searchLower = searchTerm.toLowerCase();
    const normalizedCategory = (item.category || "").toLowerCase().replace(/_/g, " ");
    const matchesSearch = (
      item.name.toLowerCase().includes(searchLower) ||
      item.genericName.toLowerCase().includes(searchLower) ||
      normalizedCategory.includes(searchLower)
    );

    return matchesSearch && matchesStatusFilter(item, statusFilter);
  });

  const statusCounts = React.useMemo(() => {
    return STATUS_FILTERS.reduce((acc, filter) => {
      acc[filter.key] = inventory.filter((item) => matchesStatusFilter(item, filter.key)).length;
      return acc;
    }, {});
  }, [inventory]);

  const handleView = async (item) => {
    try {
      setEditLoading(true);
      // Fetch the latest record before showing the detail modal.
      logger.info("INVENTORY", "Fetching medicine details for secure view", { itemId: item.id });
      const response = await inventoryService.getInventoryItemById(item.id);
      setActiveDetailMedicine(response?.data || item);
      setIsDetailModalOpen(true);
    } catch (err) {
      logger.error("INVENTORY", "Failed to load medicine details", err);
      toast.error(err?.message || "Failed to load medicine details");
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddMedicine = async (payload) => {
    try {
      setAddSubmitting(true);
      // Send the form payload straight to the create endpoint.
      logger.info("INVENTORY", "Adding new medicine", { name: payload.name });
      await inventoryService.addMedicine(payload);
      toast.success(`✅ ${payload.name} added to inventory!`);
      setIsAddModalOpen(false);
      await fetchInventory(pagination.currentPage);
    } catch (err) {
      logger.error("INVENTORY", "Failed to add medicine", err);
      toast.error(err?.message || "Failed to add medicine");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleUpdateMedicine = async (payload) => {
    if (!activeDetailMedicine?.id) return null;

    try {
      setEditSubmitting(true);
      // Update first, then re-fetch so the detail modal shows fresh data.
      logger.info("INVENTORY", "Updating medicine", { itemId: activeDetailMedicine.id });
      await inventoryService.updateInventoryItem(activeDetailMedicine.id, payload);
      const refreshedResponse = await inventoryService.getInventoryItemById(activeDetailMedicine.id);
      const refreshedMedicine = refreshedResponse?.data || null;
      toast.success("✅ Medicine details updated successfully");
      await fetchInventory(pagination.currentPage);
      return refreshedMedicine;
    } catch (err) {
      logger.error("INVENTORY", "Failed to update medicine", err);
      toast.error(err?.message || "Failed to update medicine");
      return null;
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle delete — opens ConfirmModal
  const handleDelete = (itemId, itemName) => {
    // Keep deletion behind a confirmation step.
    setConfirmDelete({ open: true, itemId, itemName });
  };

  // Execute deletion after confirmation
  const handleDeleteConfirm = async () => {
    const { itemId } = confirmDelete;
    setConfirmDelete({ open: false, itemId: null, itemName: "" });
    try {
      // Remove the item only after the user confirms the action.
      logger.info("INVENTORY", "Deleting inventory item", { itemId });
      await inventoryService.deleteInventoryItem(itemId);
      logger.success("INVENTORY", "Item deleted successfully");
      toast.success('✅ Medicine removed from inventory successfully!');
      await fetchInventory(pagination.currentPage);
    } catch (err) {
      logger.error("INVENTORY", "Failed to delete item", err);
      const errorMessage = err?.message || "Failed to delete item";
      toast.error(`❌ ${errorMessage}`);
    }
  };

  // Get status badge based on quantity
  const getStatusBadge = (quantity) => {
    // Map quantity to a compact visual status label.
    if (quantity === 0) {
      return <span className="px-2.5 py-1 rounded-full text-xs bg-red-50 text-red-600">Out of Stock</span>;
    } else if (quantity < LOW_STOCK_THRESHOLD) {
      return <span className="px-2.5 py-1 rounded-full text-xs bg-orange-50 text-orange-600">Low Stock</span>;
    } else {
      return <span className="px-2.5 py-1 rounded-full text-xs bg-green-50 text-green-600">In Stock</span>;
    }
  };

  // Get expiry badge
  const getExpiryBadge = (expiryDate) => {
    // Show expiry warnings inline so the table stays readable.
    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

    if (daysUntilExpiry < 0) {
      return <span className="text-xs text-red-600">Expired</span>;
    } else if (daysUntilExpiry <= EXPIRING_SOON_DAYS) {
      return <span className="text-xs text-orange-600">Expires in {daysUntilExpiry} days</span>;
    } else {
      return <span className="text-xs text-slate-600">{new Date(expiryDate).toLocaleDateString()}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-6">
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
        <p className="text-sm text-slate-500">Manage your pharmacy stock and medicines</p>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50">
                  <stat.icon size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search medicines by name, generic name, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => {
                const isActive = statusFilter === filter.key;
                const count = statusCounts?.[filter.key] ?? 0;
                return (
                  <button
                    key={filter.key}
                    onClick={() => setStatusFilter(filter.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4">Medicine Name</th>
                  <th className="text-left px-6 py-4">Generic Name</th>
                  <th className="text-left px-6 py-4">Category</th>
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
                    <td colSpan="8" className="px-6 py-16 text-center">
                      <Package className="mx-auto mb-3 text-gray-300" size={48} />
                      <p className="text-slate-700 font-semibold text-lg">
                        {searchTerm || statusFilter !== "ALL" ? "No matches found" : "No medicines in inventory"}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        {searchTerm || statusFilter !== "ALL"
                          ? `No medicines match your current search/filter criteria.`
                          : "Add your first medicine to start managing your inventory."}
                      </p>
                      {!searchTerm && statusFilter === "ALL" && (
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
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 text-slate-600">{item.genericName}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {(item.category || "general").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4"><span className="text-slate-600">{item.quantity}</span></td>
                      <td className="px-6 py-4"><span className="text-slate-600">₹{item.price.toFixed(2)}</span></td>
                      <td className="px-6 py-4">
                        {getExpiryBadge(item.expiryDate)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(item.quantity)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(item)}
                            disabled={editLoading}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {inventory.length} of {pagination.totalItems} items
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchInventory(pagination.currentPage - 1)}
                  disabled={!pagination.hasPreviousPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchInventory(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
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
        onSubmit={handleAddMedicine}
        submitting={addSubmitting}
      />

      <MedicineDetailModal
        key={`${activeDetailMedicine?.id || "medicine-detail"}-${isDetailModalOpen ? "open" : "closed"}`}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setActiveDetailMedicine(null);
        }}
        medicine={activeDetailMedicine}
        onSave={handleUpdateMedicine}
        submitting={editSubmitting}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, itemId: null, itemName: "" })}
        onConfirm={handleDeleteConfirm}
        title="Remove Medicine"
        message={`Are you sure you want to permanently remove "${confirmDelete.itemName}" from your inventory? This action cannot be undone.`}
        confirmLabel="Yes, Remove"
        variant="danger"
        backdropClassName="bg-slate-900/20 backdrop-blur-sm"
      />

    </div>
  );
}

// Add Medicine Modal Component
function AddMedicineModal({ isOpen, onClose, onSubmit, submitting }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Medicine"
      size="compact"
      backdropClassName="bg-slate-900/20 backdrop-blur-sm"
      contentClassName="bg-white/80 backdrop-blur-lg border border-white/50 rounded-2xl"
      headerClassName="bg-transparent border-slate-200/80"
      bodyClassName="p-0"
    >
      <MedicineForm
        onSubmit={onSubmit}
        onCancel={onClose}
        submitting={submitting}
      />
    </Modal>
  );
}

