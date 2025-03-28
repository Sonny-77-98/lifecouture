import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <>
      <header className="admin-header">
        <h1>LifeCouture Admin</h1>
        <div className="user-info">
          <span id="welcome-user">Welcome, Admin</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>
      
      <div className="admin-content">
        <div className="sidebar">
          <div className="menu-section">
            <h3>Manage Products</h3>
            <ul>
              <li><Link to="/admin/products" className="admin-link">View All Products</Link></li>
              <li><Link to="/admin/products/add" className="admin-link">Add New Product</Link></li>
              <li><Link to="/admin/categories" className="admin-link">Manage Categories</Link></li>
              <li><Link to="/admin/inventory" className="admin-link">Manage Inventory</Link></li>
            </ul>
          </div>
        </div>
        
        <div id="main-content" className="main-content">
          {children}
        </div>
      </div>
    </>
  );
};

export default AdminLayout;