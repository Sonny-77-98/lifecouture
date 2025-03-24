import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Status options
  const statusOptions = [
    'active',
    'inactive'
  ];
  
  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        
        // Build query parameters
        let url = '/api/categories';
        if (filterStatus) {
          url += `?status=${filterStatus}`;
        }
        
        const response = await axios.get(url);
        setCategories(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories');
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, [filterStatus]);
  
  // Handle status change
  const handleStatusChange = async (categoryId, newStatus) => {
    try {
      await axios.patch(`/api/categories/${categoryId}/status`, { status: newStatus });
      
      // Update local state
      setCategories(categories.map(category => 
        category.catID === categoryId 
          ? { ...category, catStat: newStatus } 
          : category
      ));
    } catch (err) {
      console.error('Error updating category status:', err);
      setError('Failed to update category status');
    }
  };
  
  // Handle delete
  const handleDelete = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await axios.delete(`/api/categories/${categoryId}`);
        
        // Remove from local state
        setCategories(categories.filter(category => category.catID !== categoryId));
      } catch (err) {
        console.error('Error deleting category:', err);
        
        // Special handling for the case where category is in use
        if (err.response?.status === 400 && err.response?.data?.count) {
          alert(`Cannot delete this category because it is used by ${err.response.data.count} products.`);
        } else {
          setError('Failed to delete category');
        }
      }
    }
  };
  
  // Filter categories based on search term
  const filteredCategories = categories.filter(category => {
    return (
      category.catName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.catDes && category.catDes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });
  
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
                      value={category.catStat}
                      onChange={(e) => handleStatusChange(category.catID, e.target.value)}
                      className={`status-select status-${category.catStat}`}
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