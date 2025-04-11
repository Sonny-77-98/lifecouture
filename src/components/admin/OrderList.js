import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import '../../style/OrderList.css';

const OrderList = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [authError, setAuthError] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });

  const statusOptions = [
    'Pending',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled'
  ];
  
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };
  
  const fetchOrders = async (page = 1, limit = 10, status = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (page - 1) * limit;
      let url = `/api/orders?limit=${limit}&offset=${offset}`;
      
      if (status) {
        url += `&status=${status}`;
      }
      
      const token = getAuthToken();
      if (!token) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      
      const response = await axios.get(url, {
        headers: { 'x-auth-token': token }
      });
      
      const { orders: orderData, total, page: currentPage } = response.data;
      
      setOrders(orderData);
      setPagination({
        page: currentPage,
        limit,
        total
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setAuthError(true);
      } else {
        setError('Failed to load orders');
      }
      
      setLoading(false);
      setOrders([]);
    }
  };
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders(pagination.page, pagination.limit, filterStatus);
    }
  }, [isAuthenticated, filterStatus]);
  
  const handleStatusChange = async (orderId, newStatus) => {
    if (!isAuthenticated) {
      setAuthError(true);
      return;
    }
    
    try {
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setAuthError(true);
        return;
      }
      
      await axios.patch(
        `/api/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { 'x-auth-token': token } }
      );

      setOrders(orders.map(order => 
        order.orderID === orderId 
          ? { ...order, orderStat: newStatus } 
          : order
      ));
      
    } catch (err) {
      console.error('Error updating order status:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setAuthError(true);
      } else {
        setError('Failed to update order status');
      }
    }
  };
  const handleDeleteOrder = async (orderId) => {
    if (!isAuthenticated) {
      setAuthError(true);
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      try {
        setError(null);
        
        const token = getAuthToken();
        if (!token) {
          setAuthError(true);
          return;
        }
        
        await axios.delete(`/api/orders/${orderId}`, {
          headers: { 'x-auth-token': token }
        });

        setOrders(orders.filter(order => order.orderID !== orderId));
        
      } catch (err) {
        console.error('Error deleting order:', err);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          setAuthError(true);
        } else {
          setError('Failed to delete order');
        }
      }
    }
  };

  const handlePageChange = (newPage) => {
    fetchOrders(newPage, pagination.limit, filterStatus);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };
  
  // Filter orders based on search term
  const filteredOrders = orders.filter(order => {
    return (
      order.orderID.toString().includes(searchTerm) ||
      `${order.usFname} ${order.usLname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.usEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  if (loading) {
    return (
      <div className="order-list-container">
        <div className="loading-indicator">Loading orders...</div>
      </div>
    );
  }
  
  return (
    <div className="order-list-container">
      <div className="list-header">
        <h2>Order Management</h2>
        <Link to="/admin/orders/create" className="create-order-button">
          Create New Order
        </Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {authError && (
        <div className="auth-error-message">
          <p>Admin access required for this action. Please log in with an admin account.</p>
          <Link to="/login" className="login-link">Log In</Link>
        </div>
      )}
      
      <div className="filters-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by Order ID, Customer Name, or Email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="no-orders-found">
          <p>No orders found matching your criteria.</p>
          <button 
            onClick={() => fetchOrders(1, pagination.limit)}
            className="reload-button"
          >
            Reload Orders
          </button>
        </div>
      ) : (
        <div className="order-table-container">
          <table className="order-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.orderID}>
                  <td>{order.orderID}</td>
                  <td>
                    {order.usFname} {order.usLname}<br />
                    <span className="user-email">{order.usEmail}</span>
                  </td>
                  <td>{formatCurrency(order.orderTotalAmt)}</td>
                  <td>{formatDate(order.orderCreatedAt)}</td>
                  <td>
                    <select
                      value={order.orderStat}
                      onChange={(e) => handleStatusChange(order.orderID, e.target.value)}
                      className={`status-select status-${order.orderStat.toLowerCase()}`}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="actions-cell">
                    <Link to={`/admin/orders/${order.orderID}`} className="view-button">
                      View
                    </Link>
                    <Link to={`/admin/orders/edit/${order.orderID}`} className="edit-button">
                      Edit
                    </Link>
                    {/* Add the Delete button */}
                    <button 
                      onClick={() => handleDeleteOrder(order.orderID)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination controls */}
          <div className="pagination-controls">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="pagination-button"
            >
              Previous
            </button>
            
            <span className="pagination-info">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="pagination-button"
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      <div className="back-to-dashboard">
        <Link to="/admin/dashboard">← Back to Dashboard</Link>
      </div>
    </div>
  );
};

export default OrderList;