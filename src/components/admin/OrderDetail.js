import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import '../../style/OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const { isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authError, setAuthError] = useState(false);
  
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
  
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = getAuthToken();
        if (!token) {
          setAuthError(true);
          setLoading(false);
          return;
        }
        
        const response = await axios.get(`/api/orders/${id}`, {
          headers: { 'x-auth-token': token }
        });
        
        setOrder(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching order details:', err);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          setAuthError(true);
        } else if (err.response?.status === 404) {
          setError('Order not found');
        } else {
          setError('Failed to load order details');
        }
        
        setLoading(false);
      }
    };
    
    if (isAuthenticated && id) {
      fetchOrderDetails();
    }
  }, [isAuthenticated, id]);
  
  const handleStatusChange = async (newStatus) => {
    try {
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        setAuthError(true);
        return;
      }
      
      await axios.patch(
        `/api/orders/${id}/status`,
        { status: newStatus },
        { headers: { 'x-auth-token': token } }
      );
      
      setOrder({ ...order, orderStat: newStatus });
      
    } catch (err) {
      console.error('Error updating order status:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setAuthError(true);
      } else {
        setError('Failed to update order status');
      }
    }
  };
  
  const handleDeleteOrder = async () => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      try {
        setError(null);
        
        const token = getAuthToken();
        if (!token) {
          setAuthError(true);
          return;
        }
        
        await axios.delete(`/api/orders/${id}`, {
          headers: { 'x-auth-token': token }
        });
        
        navigate('/admin/orders');
        
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
  const formatPrice = (price) => {
    if (price === undefined || price === null) {
      return '$0.00';
    }
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `$${numPrice.toFixed(2)}`;
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
  
  // Format currency for display
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100); 
  };
  
  if (loading) {
    return (
      <div className="order-detail-container">
        <div className="loading-indicator">Loading order details...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="order-detail-container">
        <div className="error-message">{error}</div>
        <div className="back-to-orders">
          <Link to="/admin/orders">← Back to Orders</Link>
        </div>
      </div>
    );
  }
  
  if (authError) {
    return (
      <div className="order-detail-container">
        <div className="auth-error-message">
          <p>Admin access required for this action. Please log in with an admin account.</p>
          <Link to="/login" className="login-link">Log In</Link>
        </div>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="order-detail-container">
        <div className="error-message">Order not found</div>
        <div className="back-to-orders">
          <Link to="/admin/orders">← Back to Orders</Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="order-detail-container">
      <div className="detail-header">
        <h2>Order #{order.orderID}</h2>
        <div className="header-actions">
          <Link to={`/admin/orders/edit/${order.orderID}`} className="edit-order-button">
            Edit Order
          </Link>
          <button onClick={handleDeleteOrder} className="delete-order-button">
            Delete Order
          </button>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="order-summary">
        <div className="summary-card">
          <h3>Order Information</h3>
          <div className="info-group">
            <div className="info-item">
              <span className="label">Status:</span>
              <select
                value={order.orderStat}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`status-select status-${order.orderStat.toLowerCase()}`}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="info-item">
              <span className="label">Date Created:</span>
              <span>{formatDate(order.orderCreatedAt)}</span>
            </div>
            <div className="info-item">
              <span className="label">Last Updated:</span>
              <span>{formatDate(order.orderUpdatedAt)}</span>
            </div>
            <div className="info-item">
              <span className="label">Total Amount:</span>
              <span className="order-total">{formatCurrency(order.orderTotalAmt)}</span>
            </div>
          </div>
        </div>
        
        <div className="summary-card">
        <h3>Customer Information</h3>
          <div className="info-group">
            <div className="info-item">
              <span className="label">Name:</span>
              <span>{order.user ? `${order.user.usFname} ${order.user.usLname}` : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">Email:</span>
              <span>{order.user ? order.user.usEmail : 'N/A'}</span>
            </div>
            {order.user && order.user.usPNum && (
              <div className="info-item">
                <span className="label">Phone:</span>
                <span>{order.user.usPNum}</span>
              </div>
            )}
          </div>
        </div>
        
        {order.address && (
          <div className="summary-card">
            <h3>Shipping Address</h3>
            <div className="info-group">
              <div className="address-block">
                <p>{order.address.usAdStr}</p>
                <p>
                  {order.address.usAdCity}, {order.address.usAdState} {order.address.usAdPCode}
                </p>
                <p>{order.address.usAdCountry}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="order-items-section">
        <h3>Order Items</h3>
        <table className="order-items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Unit Price</th>
              <th>Quantity</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items && order.items.map((item) => (
              <tr key={item.orderItemID}>
                <td>
                  <div className="product-info">
                    <span className="product-name">{item.prodTitle}</span>
                  </div>
                </td>
                <td>{item.varSKU}</td>
                <td>{formatCurrency(item.prodUPrice)}</td>
                <td>{item.orderVarQty}</td>
                <td>{formatCurrency(item.prodUPrice * item.orderVarQty)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4" className="total-label">Total</td>
              <td className="total-value">{formatCurrency(order.orderTotalAmt)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div className="back-to-orders">
        <Link to="/admin/orders">← Back to Orders</Link>
      </div>
    </div>
  );
};

export default OrderDetail;