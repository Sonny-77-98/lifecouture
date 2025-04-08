import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import '../../style/CategoryForm.css';

const CategoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    catName: '',
    catDes: '',
    catStat: 'active',
    catSEO: ''
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(false);

  const statusOptions = [
    'active',
    'inactive'
  ];

  useEffect(() => {
    const fetchCategory = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);

        const response = await axios.get(`/api/categories/${id}`);
        
        console.log('Category data loaded:', response.data);
        const category = response.data;
        
        setFormData({
          catName: category.catName || '',
          catDes: category.catDes || '',
          catStat: category.catStat || 'active',
          catSEO: category.catSEO || ''
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching category:', err);
        setError('Failed to load category information');
        setLoading(false);
      }
    };
    
    fetchCategory();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };
  
  const generateSEOSlug = () => {
    const slug = formData.catName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    setFormData(prevState => ({
      ...prevState,
      catSEO: `life-couture-${slug}-streetwear`
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const categoryData = {
        catName: formData.catName,
        catDes: formData.catDes,
        catStat: formData.catStat,
        catSEO: formData.catSEO
      };
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        setAuthError(true);
        setSubmitting(false);
        return;
      }
      
      console.log('Submitting category data:', categoryData);

      const headers = { 'x-auth-token': token };
      
      let response;
      
      if (isEditMode) {

        response = await axios.put(`/api/categories/${id}`, categoryData, { headers });
        setSuccess('Category updated successfully');
      } else {
        response = await axios.post('/api/categories', categoryData, { headers });
        setSuccess('Category created successfully');

        setFormData({
          catName: '',
          catDes: '',
          catStat: 'active',
          catSEO: ''
        });
      }
      
      setTimeout(() => {
        navigate('/admin/categories');
      }, 2000);
      
    } catch (err) {
      console.error('Error saving category:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setAuthError(true);
      } else {
        setError(err.response?.data?.message || 'Failed to save category');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  // Show login form if auth error
  const handleLogin = () => {
    navigate('/login');
  };
  
  if (loading) {
    return (
      <div className="category-form-container">
        <div className="loading-indicator">Loading category data...</div>
      </div>
    );
  }
  
  if (authError) {
    return (
      <div className="category-form-container">
        <div className="form-header">
          <h2>{isEditMode ? 'Edit Category' : 'Add New Category'}</h2>
          <Link to="/admin/categories" className="back-link">
            &larr; Back to Categories
          </Link>
        </div>
        
        <div className="auth-error-message">
          <h3>Admin access required</h3>
          <p>You must be logged in as an admin to {isEditMode ? 'edit' : 'add'} categories.</p>
          <div className="auth-actions">
            <button onClick={handleLogin} className="login-button">
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="category-form-container">
      <div className="form-header">
        <h2>{isEditMode ? 'Edit Category' : 'Add New Category'}</h2>
        <Link to="/admin/categories" className="back-link">
          &larr; Back to Categories
        </Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="category-form">
        <div className="form-group">
          <label htmlFor="catName">Category Name*</label>
          <input
            type="text"
            id="catName"
            name="catName"
            value={formData.catName}
            onChange={handleChange}
            placeholder="Enter category name"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="catDes">Description</label>
          <textarea
            id="catDes"
            name="catDes"
            value={formData.catDes || ''}
            onChange={handleChange}
            placeholder="Enter category description"
            rows="4"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="catStat">Status*</label>
            <select
              id="catStat"
              name="catStat"
              value={formData.catStat || 'active'}
              onChange={handleChange}
              required
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="catSEO">SEO String</label>
            <div className="seo-input-group">
              <input
                type="text"
                id="catSEO"
                name="catSEO"
                value={formData.catSEO || ''}
                onChange={handleChange}
                placeholder="SEO-friendly string"
              />
              <button 
                type="button" 
                className="generate-seo-button" 
                onClick={generateSEOSlug}
              >
                Generate
              </button>
            </div>
            <p className="field-help">Used for search engine optimization</p>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-button"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : isEditMode ? 'Update Category' : 'Create Category'}
          </button>
          
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/admin/categories')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryForm;