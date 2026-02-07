import React, { useState, useEffect } from 'react';
import { Heart, Megaphone, Plus, Edit2, Trash2, Eye, EyeOff, Calendar, RefreshCw } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { httpClient } from '../../../core/services/httpClient';

const AdminCMS = () => {
  const [activeTab, setActiveTab] = useState('healthTips');
  const [healthTips, setHealthTips] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('healthTip'); // 'healthTip' or 'announcement'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    imageUrl: '',
    type: 'info',
    priority: 'normal',
    targetRole: '',
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'healthTips') {
        const response = await httpClient.get('/admin/health-tips');
        if (response.data.success) setHealthTips(response.data.data || []);
      } else {
        const response = await httpClient.get('/admin/announcements');
        if (response.data.success) setAnnouncements(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    setFormData({
      title: '',
      content: '',
      category: '',
      imageUrl: '',
      type: 'info',
      priority: 'normal',
      targetRole: '',
      publishDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (item, type) => {
    setModalType(type);
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      content: item.content || item.message || '',
      category: item.category || '',
      imageUrl: item.imageUrl || '',
      type: item.type || 'info',
      priority: item.priority || 'normal',
      targetRole: item.targetRole || '',
      publishDate: item.publishDate ? new Date(item.publishDate).toISOString().split('T')[0] : '',
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
      isActive: item.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const endpoint = modalType === 'healthTip' ? 'health-tips' : 'announcements';
      
      const payload = modalType === 'healthTip'
        ? {
            title: formData.title,
            content: formData.content,
            category: formData.category || null,
            imageUrl: formData.imageUrl || null,
            publishDate: formData.publishDate || new Date().toISOString(),
            expiryDate: formData.expiryDate || null,
            isActive: formData.isActive,
          }
        : {
            title: formData.title,
            message: formData.content,
            type: formData.type,
            priority: formData.priority,
            targetRole: formData.targetRole || null,
            publishDate: formData.publishDate || new Date().toISOString(),
            expiryDate: formData.expiryDate || null,
            isActive: formData.isActive,
          };

      let response;
      if (editingItem) {
        response = await httpClient.patch(`/admin/${endpoint}/${editingItem.id}`, payload);
      } else {
        response = await httpClient.post(`/admin/${endpoint}`, payload);
      }
      
      if (response.data.success) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save');
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const endpoint = type === 'healthTip' ? 'health-tips' : 'announcements';
      await httpClient.delete(`/admin/${endpoint}/${id}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete');
    }
  };

  const toggleActive = async (id, isActive, type) => {
    try {
      const endpoint = type === 'healthTip' ? 'health-tips' : 'announcements';
      await httpClient.patch(`/admin/${endpoint}/${id}`, { isActive: !isActive });
      fetchData();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Heart className="text-pink-600" />
                  Content Management System
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage health tips and system announcements
                </p>
              </div>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('healthTips')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'healthTips'
                    ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Heart className="w-5 h-5" />
                Health Tips
              </button>
              <button
                onClick={() => setActiveTab('announcements')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'announcements'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Megaphone className="w-5 h-5" />
                Announcements
              </button>
            </div>
          </div>

          {/* Create Button */}
          <div className="mb-6">
            <button
              onClick={() => openCreateModal(activeTab === 'healthTips' ? 'healthTip' : 'announcement')}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg font-semibold"
            >
              <Plus className="w-5 h-5" />
              Create New {activeTab === 'healthTips' ? 'Health Tip' : 'Announcement'}
            </button>
          </div>

          {/* Content List */}
          <div className="grid grid-cols-1 gap-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
            ) : activeTab === 'healthTips' ? (
              healthTips.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                  <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No health tips available</p>
                </div>
              ) : (
                healthTips.map((tip) => (
                  <div key={tip.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{tip.title}</h3>
                          {tip.isActive ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Eye className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <EyeOff className="w-3 h-3" />
                              Inactive
                            </span>
                          )}
                          {tip.category && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {tip.category}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 mb-3">{tip.content}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Published: {new Date(tip.publishDate).toLocaleDateString()}
                          </span>
                          {tip.expiryDate && (
                            <span>Expires: {new Date(tip.expiryDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => toggleActive(tip.id, tip.isActive, 'healthTip')}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={tip.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {tip.isActive ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => openEditModal(tip, 'healthTip')}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tip.id, 'healthTip')}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              announcements.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                  <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No announcements available</p>
                </div>
              ) : (
                announcements.map((announcement) => (
                  <div key={announcement.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                          {announcement.isActive ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Eye className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <EyeOff className="w-3 h-3" />
                              Inactive
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            announcement.type === 'urgent' ? 'bg-red-100 text-red-800' :
                            announcement.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {announcement.type.toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            announcement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {announcement.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3">{announcement.message}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Published: {new Date(announcement.publishDate).toLocaleDateString()}
                          </span>
                          {announcement.expiryDate && (
                            <span>Expires: {new Date(announcement.expiryDate).toLocaleDateString()}</span>
                          )}
                          {announcement.targetRole && (
                            <span>Target: {announcement.targetRole}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => toggleActive(announcement.id, announcement.isActive, 'announcement')}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={announcement.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {announcement.isActive ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => openEditModal(announcement, 'announcement')}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id, 'announcement')}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingItem ? 'Edit' : 'Create'} {modalType === 'healthTip' ? 'Health Tip' : 'Announcement'}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {modalType === 'healthTip' ? 'Content' : 'Message'} *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {modalType === 'healthTip' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Nutrition, Exercise, Mental Health"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                      <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="info">Info</option>
                          <option value="warning">Warning</option>
                          <option value="urgent">Urgent</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                        <select
                          value={formData.priority}
                          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Target Role (Optional)</label>
                      <select
                        value={formData.targetRole}
                        onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Users</option>
                        <option value="PATIENT">Patients Only</option>
                        <option value="PHARMACY_ADMIN">Pharmacies Only</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Publish Date</label>
                    <input
                      type="date"
                      value={formData.publishDate}
                      onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active (visible to users)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCMS;
