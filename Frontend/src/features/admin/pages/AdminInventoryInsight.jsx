import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, Send, RefreshCw, Filter, Search } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { httpClient } from '../../../core/services/httpClient';

const AdminInventoryInsight = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  useEffect(() => {
    fetchInventoryInsights();
  }, []);

  const fetchInventoryInsights = async () => {
    setIsLoading(true);
    try {
      const response = await httpClient.get('/admin/inventory/insights');
      const data = response.data;
      
      if (data.success) {
        setShortages(data.data.shortages || []);
        setInventoryData(data.data.inventory || []);
      }
    } catch (error) {
      console.error('Error fetching inventory insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openRestockAlert = (medicine) => {
    setSelectedMedicine(medicine);
    setNotificationMessage(
      `URGENT: Restock Alert for ${medicine.genericName}\n\n` +
      `Current Status: OUT OF STOCK in ${medicine.outOfStockCount} pharmacies\n` +
      `This is a critical medicine shortage. Please restock immediately.\n\n` +
      `Average Stock Needed: ${medicine.avgQuantity || 50} units per pharmacy`
    );
    setShowNotificationModal(true);
    setAlertSent(false);
  };

  const sendRestockAlert = async () => {
    if (!selectedMedicine) return;
    
    setSendingAlert(true);
    try {
      const response = await httpClient.post('/admin/inventory/restock-alert', {
        genericName: selectedMedicine.genericName,
        message: notificationMessage,
      });

      const data = response.data;
      
      if (data.success) {
        setAlertSent(true);
        setTimeout(() => {
          setShowNotificationModal(false);
          setSelectedMedicine(null);
          setNotificationMessage('');
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending restock alert:', error);
      alert('Failed to send restock alert');
    } finally {
      setSendingAlert(false);
    }
  };

  const filteredShortages = shortages.filter(
    (item) =>
      item.genericName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="text-blue-600" />
                  Global Inventory Insights
                </h1>
                <p className="text-gray-600 mt-1">
                  Monitor stock levels and manage critical shortages across all pharmacies
                </p>
              </div>
              <button
                onClick={fetchInventoryInsights}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {inventoryData.reduce((sum, item) => sum + (item.totalItems || 0), 0)}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Package className="text-blue-600 w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Critical Shortages</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {shortages.filter(s => s.outOfStockCount >= 5).length}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertTriangle className="text-red-600 w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Low Stock Items</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">
                    {shortages.filter(s => s.outOfStockCount < 5 && s.outOfStockCount > 0).length}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <TrendingDown className="text-yellow-600 w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Medicines</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{shortages.length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Package className="text-green-600 w-8 h-8" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search medicines by name or generic name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Shortage Tracker Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-red-600" />
                Shortage Tracker - Critical Medicines
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Medicines with highest out-of-stock count across all pharmacies
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredShortages.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No shortage data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medicine Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Generic Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Out of Stock Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredShortages.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-semibold">{item.genericName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-2xl font-bold text-red-600">{item.outOfStockCount}</div>
                          <div className="text-xs text-gray-500">pharmacies</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.outOfStockCount >= 5 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Critical
                            </span>
                          ) : item.outOfStockCount >= 3 ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              Warning
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Low
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => openRestockAlert(item)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                          >
                            <Send className="w-4 h-4" />
                            Send Restock Alert
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Restock Alert Modal */}
        {showNotificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="text-red-600" />
                  Send Restock Alert
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  This will notify all pharmacies about the critical shortage
                </p>
              </div>

              <div className="p-6">
                {alertSent ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">Alert Sent Successfully!</h4>
                    <p className="text-gray-600">All pharmacies have been notified about the shortage.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Medicine: <span className="font-bold">{selectedMedicine?.genericName}</span>
                      </label>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800">
                          <strong>Out of Stock in:</strong> {selectedMedicine?.outOfStockCount} pharmacies
                        </p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notification Message
                      </label>
                      <textarea
                        value={notificationMessage}
                        onChange={(e) => setNotificationMessage(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter notification message..."
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={sendRestockAlert}
                        disabled={sendingAlert || !notificationMessage.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingAlert ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            Send Alert to All Pharmacies
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowNotificationModal(false);
                          setSelectedMedicine(null);
                          setNotificationMessage('');
                        }}
                        disabled={sendingAlert}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInventoryInsight;
