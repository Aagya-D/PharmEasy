import React, { useState, useEffect } from 'react';
import { Ticket, MessageSquare, Clock, CheckCircle, XCircle, Search, Filter, User } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const url = filterStatus === 'all' 
        ? 'http://localhost:3000/api/admin/tickets'
        : `http://localhost:3000/api/admin/tickets?status=${filterStatus}`;
        
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setTickets(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveTicket = async (ticketId, newStatus) => {
    setResolving(true);
    try {
      const response = await fetch(`http://localhost:3000/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          status: newStatus,
          resolution: resolution || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchTickets();
        setSelectedTicket(null);
        setResolution('');
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Failed to update ticket');
    } finally {
      setResolving(false);
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const response = await fetch(`http://localhost:3000/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        await fetchTickets();
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      OPEN: { color: 'bg-blue-100 text-blue-800', icon: MessageSquare },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      RESOLVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CLOSED: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
    };
    
    const badge = badges[status] || badges.OPEN;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[priority] || colors.medium}`}>
        {priority.toUpperCase()}
      </span>
    );
  };

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter(t => t.status === 'RESOLVED').length,
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
                  <Ticket className="text-blue-600" />
                  Support & Ticketing System
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage user support tickets and resolve issues
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Tickets</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-full">
                  <Ticket className="text-gray-600 w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Open</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{stats.open}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <MessageSquare className="text-blue-600 w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.inProgress}</p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Clock className="text-yellow-600 w-8 h-8" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Resolved</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{stats.resolved}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="text-green-600 w-8 h-8" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tickets by subject or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('OPEN')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'OPEN'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setFilterStatus('IN_PROGRESS')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'IN_PROGRESS'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setFilterStatus('RESOLVED')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'RESOLVED'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Resolved
                </button>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No tickets found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-500">
                            #{ticket.id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{ticket.subject}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {ticket.message}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {ticket.userId?.slice(0, 8) || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPriorityBadge(ticket.priority)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(ticket.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Details
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

        {/* Ticket Details Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Ticket Details</h3>
                  <button
                    onClick={() => {
                      setSelectedTicket(null);
                      setResolution('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Ticket Header */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-mono text-gray-500">
                      #{selectedTicket.id.slice(0, 8)}
                    </span>
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedTicket.subject}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Created on {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Ticket Message */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">Message</h5>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>
                </div>

                {/* User Info */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">User Information</h5>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-700">
                      <strong>User ID:</strong> {selectedTicket.userId}
                    </p>
                  </div>
                </div>

                {/* Resolution (if resolved) */}
                {selectedTicket.resolution && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Resolution</h5>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.resolution}</p>
                      {selectedTicket.resolvedAt && (
                        <p className="text-sm text-gray-600 mt-2">
                          Resolved on {new Date(selectedTicket.resolvedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Section */}
                {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Take Action</h5>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={4}
                      placeholder="Enter resolution notes (optional for status updates)..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                    />
                    <div className="flex gap-3">
                      {selectedTicket.status === 'OPEN' && (
                        <button
                          onClick={() => handleResolveTicket(selectedTicket.id, 'IN_PROGRESS')}
                          disabled={resolving}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                        >
                          <Clock className="w-4 h-4" />
                          Mark In Progress
                        </button>
                      )}
                      <button
                        onClick={() => handleResolveTicket(selectedTicket.id, 'RESOLVED')}
                        disabled={resolving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Resolve Ticket
                      </button>
                      <button
                        onClick={() => handleResolveTicket(selectedTicket.id, 'CLOSED')}
                        disabled={resolving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Close Ticket
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminSupport;
