import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import '../../style/CategoryList.css';

const CategoryList = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [authError, setAuthError] = useState(false);

  // Status options
  const statusOptions = [
    'active',
    'inactive'
  ];
  
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        let url = '/api/categories';
        if (filterStatus) {
          url += `?status=${filterStatus}`;
        }
        
        console.log('Fetching categories from:', url);
        const response = await axios.get(url);
        console.log('Categories response:', response.data);

        const categoriesData = Array.isArray(response.data) 
          ? response.data 
          : [];
          
        setCategories(categoriesData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching categories:', err);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          setAuthError(true);
        } else {
          setError('Failed to load categories');
        }
        
        setLoading(false);
        setCategories([]); 
      }
    };
    
    fetchCategories();
  }, [filterStatus]);

  const handleStatusChange = async (categoryId, newStatus) => {
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
        `/api/categories/${categoryId}/status`, 
        { status: newStatus },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'x-auth-token': token
          } 
        }
      );
      
      setCategories(categories.map(category => 
        category.catID === categoryId 
          ? { ...category, catStat: newStatus } 
          : category
      ));
    } catch (err) {
      console.error('Error updating category status:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setAuthError(true);
      } else {
        setError('Failed to update category status');
      }
    }
  };

  const handleDelete = async (categoryId) => {
    if (!isAuthenticated) {
      setAuthError(true);
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        setError(null);
        const token = getAuthToken();
        
        if (!token) {
          setAuthError(true);
          return;
        }

        await axios.delete(`/api/categories/${categoryId}`, {
          headers: {
            'x-auth-token': token
          }
        });

        setCategories(categories.filter(category => category.catID !== categoryId));
      } catch (err) {
        console.error('Error deleting category:', err);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          setAuthError(true);
        } else if (err.response?.status === 400 && err.response?.data?.count) {
          alert(`Cannot delete this category because it is used by ${err.response.data.count} products.`);
        } else {
          setError('Failed to delete category');
        }
      }
    }
  };
  
  // Filter categories based on search term 
  const filteredCategories = Array.isArray(categories) 
    ? categories.filter(category => {
        return (
          (category.catName && category.catName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (category.catDes && category.catDes.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      })
    : [];
  
  if (loading) {
    return (
      <div className="category-list-container">
        <div className="loading-indicator">Loading categories...</div>
      </div>
    );
  }
  
  return (
    <div className="category-list-container">
      <div className="list-header">
        <h2>Category Management</h2>
        <Link to="/admin/categories/add" className="add-category-button">
          Add New Category
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
            placeholder="Search categories..."
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
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {filteredCategories.length === 0 ? (
        <div className="no-categories-found">
          <p>No categories found matching your criteria.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="reload-button"
          >
            Reload Categories
          </button>
        </div>
      ) : (
        <div className="category-table-container">
          <table className="category-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr key={category.catID}>
                  <td>{category.catID}</td>
                  <td>{category.catName}</td>
                  <td className="description-cell">
                    {category.catDes ? (
                      category.catDes.length > 100 
                        ? `${category.catDes.substring(0, 100)}...` 
                        : category.catDes
                    ) : (
                      <span className="no-content">No description</span>
                    )}
                  </td>
                  <td>
                    <select
                      value={category.catStat || 'active'}
                      onChange={(e) => handleStatusChange(category.catID, e.target.value)}
                      className={`status-select status-${category.catStat || 'active'}`}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="actions-cell">
                    <Link to={`/admin/categories/edit/${category.catID}`} className="edit-button">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(category.catID)}
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

export default CategoryList;