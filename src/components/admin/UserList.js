import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import '../../style/UserList.css';

const UserList = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [authError, setAuthError] = useState(false);

  const roleOptions = [
    'customer',
    'admin'
  ];
  
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = getAuthToken();
        if (!token) {
          setAuthError(true);
          setLoading(false);
          return;
        }
        
        const response = await axios.get('/api/users', {
          headers: { 'x-auth-token': token }
        });
        
        setUsers(Array.isArray(response.data) ? response.data : []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching users:', err);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          setAuthError(true);
        } else {
          setError('Failed to load users');
        }
        
        setLoading(false);
      }
    };
    
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated]);

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const token = getAuthToken();
        if (!token) {
          setAuthError(true);
          return;
        }

        await axios.delete(`/api/users/${userId}`, {
          headers: { 'x-auth-token': token }
        });
        
        setUsers(users.filter(user => user.usID !== userId));
      } catch (err) {
        console.error('Error deleting user:', err);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          setAuthError(true);
        } else if (err.response?.status === 400 && err.response?.data?.hasOrders) {
          alert(`Cannot delete this user because they have existing orders.`);
        } else {
          setError('Failed to delete user');
        }
      }
    }
  };
  
  // Filter users based on search term and role filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      `${user.usFname} ${user.usLname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.usEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.usPNum?.includes(searchTerm)
    );
    
    const matchesRole = roleFilter ? user.usRole === roleFilter : true;
    
    return matchesSearch && matchesRole;
  });
  
  if (loading) {
    return (
      <div className="user-list-container">
        <div className="loading-indicator">Loading users...</div>
      </div>
    );
  }
  
  return (
    <div className="user-list-container">
      <div className="list-header">
        <h2>User Management</h2>
        <Link to="/admin/users/create" className="add-user-button">
          Create New User
        </Link>
      </div>
      <div className="back-to-dashboard">
        <Link to="/admin/dashboard">← Back to Dashboard</Link>
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
            placeholder="Search users by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <label>Role:</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Roles</option>
              {roleOptions.map(role => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {filteredUsers.length === 0 ? (
        <div className="no-users-found">
          <p>No users found matching your criteria.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="reload-button"
          >
            Reload Users
          </button>
        </div>
      ) : (
        <div className="user-table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.usID}>
                  <td>{user.usID}</td>
                  <td>{user.usFname} {user.usLname}</td>
                  <td>{user.usEmail}</td>
                  <td>{user.usPNum}</td>
                  <td>
                    <span className={`role-badge role-${user.usRole}`}>
                      {user.usRole.charAt(0).toUpperCase() + user.usRole.slice(1)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <Link to={`/admin/users/${user.usID}/addresses`} className="addresses-button">
                      Addresses
                    </Link>
                    <Link to={`/admin/users/edit/${user.usID}`} className="edit-button">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(user.usID)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="back-to-dashboard">
        <Link to="/admin/dashboard">← Back to Dashboard</Link>
      </div>
    </div>
  );
};

export default UserList;