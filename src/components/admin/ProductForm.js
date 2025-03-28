import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import '../../style/ProductForm.css';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    prodTitle: '',
    prodDesc: '',
    prodStat: 'active',
    prodURL: '',
    imageUrl: '',
    imageAlt: '',
    selectedCategories: []
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Status options
  const statusOptions = [
    'active',
    'inactive',
  ];
  
  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories');
        setCategories(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories. Please try again.');
      }
    };
    
    fetchCategories();
  }, []);
  
  // Load product data if in edit mode
  useEffect(() => {
    const fetchProduct = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/products/${id}`);
        const product = response.data;
        
        console.log('Product data:', product);
        
        // Set product categories
        let productCategories = [];
        if (product.categories) {
          productCategories = Array.isArray(product.categories) 
            ? product.categories.map(cat => cat.catID)
            : [];
        }
        
        let imageUrl = '';
        let imageAlt = '';
        if (product.images && product.images.length > 0) {
          imageUrl = product.images[0].imgURL;
          imageAlt = product.images[0].imgAlt;
        }
        
        setFormData({
          prodTitle: product.prodTitle || '',
          prodDesc: product.prodDesc || '',
          prodStat: product.prodStat || 'active',
          prodURL: product.prodURL || '',
          imageUrl: imageUrl,
          imageAlt: imageAlt,
          selectedCategories: productCategories
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product information. Please try again.');
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id, isEditMode]);
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Handle category selection changes
  const handleCategoryChange = (catID) => {
    const selectedCategories = [...formData.selectedCategories];
    const index = selectedCategories.indexOf(catID);
    
    if (index === -1) {
      selectedCategories.push(catID);
    } else {
      selectedCategories.splice(index, 1);
    }
    
    setFormData({ ...formData, selectedCategories });
  };
  
  // Generate URL slug from title
  const generateSlug = () => {
    const slug = formData.prodTitle
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    setFormData({ ...formData, prodURL: slug });
  };
  
  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare product data for submission
      const productData = {
        prodTitle: formData.prodTitle,
        prodDesc: formData.prodDesc,
        prodStat: formData.prodStat,
        prodURL: formData.prodURL,
        imageUrl: formData.imageUrl,
        imageAlt: formData.imageAlt || formData.prodTitle,
        categories: formData.selectedCategories
      };
      
      console.log('Submitting product data:', productData);
      
      let response;
      
      if (isEditMode) {
        // Update existing product
        response = await axios.put(`/api/products/${id}`, productData);
        setSuccess('Product updated successfully');
      } else {
        // Create new product
        response = await axios.post('/api/products', productData);
        setSuccess('Product created successfully');
        
        // Clear form after successful creation
        setFormData({
          prodTitle: '',
          prodDesc: '',
          prodStat: 'active',
          prodURL: '',
          imageUrl: '',
          imageAlt: '',
          selectedCategories: []
        });
      }
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/admin/products');
      }, 1500);
      
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.response?.data?.message || 'Failed to save product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="product-form-container">
        <div className="loading-indicator">Loading product data...</div>
      </div>
    );
  }
  
  return (
    <div className="product-form-container">
      <div className="form-header">
        <h2>{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
        <Link to="/admin/products" className="back-link">
          &larr; Back to Products
        </Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-grid">
          <div className="form-left">
            <div className="form-group">
              <label htmlFor="prodTitle">Product Title*</label>
              <input
                type="text"
                id="prodTitle"
                name="prodTitle"
                value={formData.prodTitle}
                onChange={handleChange}
                placeholder="Enter product title"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="prodDesc">Description*</label>
              <textarea
                id="prodDesc"
                name="prodDesc"
                value={formData.prodDesc}
                onChange={handleChange}
                placeholder="Enter product description"
                rows="5"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="prodURL">URL Slug*</label>
                <div className="url-input-group">
                  <input
                    type="text"
                    id="prodURL"
                    name="prodURL"
                    value={formData.prodURL}
                    onChange={handleChange}
                    placeholder="product-url-slug"
                    required
                  />
                  <button 
                    type="button" 
                    className="generate-slug-button" 
                    onClick={generateSlug}
                  >
                    Generate
                  </button>
                </div>
                <p className="field-help">Used in the product URL, e.g., /products/product-url-slug</p>
              </div>
              
              <div className="form-group">
                <label htmlFor="prodStat">Status*</label>
                <select
                  id="prodStat"
                  name="prodStat"
                  value={formData.prodStat}
                  onChange={handleChange}
                  required
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="imageUrl">Image URL</label>
              <input
                type="text"
                id="imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                placeholder="Enter image URL"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="imageAlt">Image Alt Text</label>
              <input
                type="text"
                id="imageAlt"
                name="imageAlt"
                value={formData.imageAlt}
                onChange={handleChange}
                placeholder="Enter image alt text"
              />
            </div>
            
            {formData.imageUrl && (
              <div className="image-preview">
                <h4>Image Preview</h4>
                <img 
                  src={formData.imageUrl} 
                  alt={formData.imageAlt || formData.prodTitle}
                  className="preview-image"
                  onError={(e) => {e.target.src = "https://i.imgur.com/defaultImage.jpg"}}
                />
              </div>
            )}
          </div>
          
          <div className="form-right">
            <div className="form-group">
              <label>Categories*</label>
              {categories.length === 0 ? (
                <p>Loading categories...</p>
              ) : (
                <div className="categories-list">
                  {categories.map(category => (
                    <div key={category.catID} className="category-checkbox">
                      <input
                        type="checkbox"
                        id={`cat-${category.catID}`}
                        checked={formData.selectedCategories.includes(category.catID)}
                        onChange={() => handleCategoryChange(category.catID)}
                      />
                      <label htmlFor={`cat-${category.catID}`}>{category.catName}</label>
                    </div>
                  ))}
                </div>
              )}
              {formData.selectedCategories.length === 0 && (
                <p className="validation-message">Select at least one category</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-button"
            disabled={submitting || formData.selectedCategories.length === 0}
          >
            {submitting ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
          </button>
          
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/admin/products')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;