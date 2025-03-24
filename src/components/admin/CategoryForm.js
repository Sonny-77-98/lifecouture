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

  // Status options
  const statusOptions = [
    'active',
    'inactive'
  ];
  
  // Load category data if in edit mode
  useEffect(() => {
    const fetchCategory = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        
        const response = await axios.get(`/api/categories/${id}`);
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
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Generate SEO slug from name
  const generateSEOSlug = () => {
    const slug = formData.catName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    setFormData({ ...formData, catSEO: `life-couture-${slug}-streetwear` });
  };
  
  // Form submission
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
      
      let response;
      
      if (isEditMode) {
        // Update existing category
        response = await axios.put(`/api/categories/${id}`, categoryData);
        setSuccess('Category updated successfully');
      } else {
        // Create new category
        response = await axios.post('/api/categories', categoryData);
        setSuccess('Category created successfully');
        
        // Clear form after successful creation
        setFormData({
          catName: '',
          catDes: '',
          catStat: 'active',
          catSEO: ''
        });
      }
      
      // Optional: redirect after a delay
      setTimeout(() => {
        navigate('/admin/categories');
      }, 2000);
      
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="category-form-container">
        <div className="loading-indicator">Loading category data...</div>
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
            value={formData.catDes}
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
              value={formData.catStat}
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
                value={formData.catSEO}
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