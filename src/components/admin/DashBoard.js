import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import '../../style/DashBoard.css';


const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    totalOrders: 0,
    lowStockCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        const productsRes = await axios.get('/api/products');
        
        const categoriesRes = await axios.get('/api/categories');

        const lowStockRes = await axios.get('/api/inventory/low-stock');

        const orderCount = await axios.get('/api/orders');
      
        
        setStats({
          totalProducts: productsRes.data.length || 0,
          totalCategories: categoriesRes.data.length || 0,
          totalOrders: orderCount.data.length || 0,
          lowStockCount: lowStockRes.data.length || 0
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setLoading(false);

        setStats({
          totalProducts: 0,
          totalCategories: 0,
          totalOrders: 0,
          lowStockCount: 0
        });
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>LifeCouture Admin Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user?.username}</span>
          <button onClick={logout} className="btn btn-logout">Logout</button>
        </div>
      </header>
      
      {loading ? (
        <div className="dashboard-loading">Loading dashboard data...</div>
      ) : (
        <>
          <div className="stats-container">
            <div className="stat-card">
              <h3>Total Products</h3>
              <p className="stat-value">{stats.totalProducts}</p>
              <Link to="/admin/products" className="stat-link">View All</Link>
            </div>
            
            <div className="stat-card">
              <h3>Categories</h3>
              <p className="stat-value">{stats.totalCategories}</p>
              <Link to="/admin/categories" className="stat-link">Manage</Link>
            </div>
            
            <div className="stat-card">
              <h3>Orders</h3>
              <p className="stat-value">{stats.totalOrders}</p>
              <Link to="/admin/orders" className="stat-link">Manage</Link>
            </div>
            
            <div className="stat-card">
              <h3>Low Stock Items</h3>
              <p className="stat-value">{stats.lowStockCount}</p>
              <Link to="/admin/inventory" className="stat-link">Manage</Link>
            </div>
          </div>
          
          <div className="dashboard-content">
            <div className="dashboard-menu-container">
              <div className="dashboard-menu">
                <h3>Product Management</h3>
                <ul>
                  <li>
                    <Link to="/admin/products">View All Products</Link>
                  </li>
                  <li>
                    <Link to="/admin/products/add">Add New Product</Link>
                  </li>
                  <li>
                    <Link to="/admin/categories">Manage Categories</Link>
                  </li>
                  <li>
                    <Link to="/admin/inventory">Manage Inventory</Link>
                  </li>
                  <li>
                    <Link to="/admin/variants" className="admin-link">Manage Variants</Link>
                  </li>
                </ul>
              </div>
              
              <div className="dashboard-menu">
                <h3>Order Management</h3>
                <ul>
                  <li>
                    <Link to="/admin/orders">View All Orders</Link>
                  </li>
                  <li>
                    <Link to="/admin/orders/create">Create New Order</Link>
                  </li>
                </ul>
              </div>

              <div className="dashboard-menu">
                <h3>User Management</h3>
                <ul>
                  <li>
                    <Link to="/admin/users">View All User</Link>
                  </li>
                  <li>
                    <Link to="/admin/users/create">Create New User</Link>
                  </li>
                </ul>
              </div>
              
              <div className="dashboard-menu">
                <h3>Store Settings</h3>
                <ul>
                  <li>
                    <Link to="/admin/profile">Account Settings</Link>
                  </li>
                  <li>
                    <a href="/" target="_blank" rel="noopener noreferrer">View Store Front</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;