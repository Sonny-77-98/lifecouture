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
    selectedCategories: [],
    attributes: {}
  });
  
  const [categories, setCategories] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Status options
  const statusOptions = [
    'active',
    'inactive',
    'out_of_stock',
    'discontinued'
  ];
  
  // Fetch categories and attributes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories
        const categoriesRes = await axios.get('/api/categories');
        setCategories(categoriesRes.data);
        
        // Fetch attributes
        const attributesRes = await axios.get('/api/attributes');
        setAttributes(attributesRes.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching form data:', err);
        setError('Failed to load categories and attributes');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Load product data if in edit mode
  useEffect(() => {
    const fetchProduct = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        
        // Fetch product details
        const productRes = await axios.get(`/api/products/${id}`);
        const product = productRes.data;
        
        // Fetch product categories
        const categoriesRes = await axios.get(`/api/products/${id}/categories`);
        const productCategories = categoriesRes.data;
        
        // Fetch product attributes
        const attributesRes = await axios.get(`/api/products/${id}/attributes`);
        const productAttributes = attributesRes.data;
        
        // Convert product attributes to object format
        const attributesObj = {};
        productAttributes.forEach(attr => {
          attributesObj[attr.attID] = attr.value;
        });
        
        setFormData({
          prodTitle: product.prodTitle || '',
          prodDesc: product.prodDesc || '',
          prodStat: product.prodStat || 'active',
          prodURL: product.prodURL || '',
          selectedCategories: productCategories.map(cat => cat.catID),
          attributes: attributesObj
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product information');
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
  
  // Handle attribute value changes
  const handleAttributeChange = (attID, value) => {
    setFormData({
      ...formData,
      attributes: {
        ...formData.attributes,
        [attID]: value
      }
    });
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
      let response;
      
      const productData = {
        prodTitle: formData.prodTitle,
        prodDesc: formData.prodDesc,
        prodStat: formData.prodStat,
        prodURL: formData.prodURL,
        categories: formData.selectedCategories,
        attributes: formData.attributes
      };
      
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
          selectedCategories: [],
          attributes: {}
        });
      }
      
      // Optional: redirect after a delay
      setTimeout(() => {
        navigate('/admin/products');
      }, 2000);
      
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading && isEditMode) {
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
          </div>
          
          <div className="form-right">
            <div className="form-group">
              <label>Categories*</label>
              {loading ? (
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
            
            {attributes.length > 0 && (
              <div className="form-group">
                <label>Product Attributes</label>
                <div className="attributes-list">
                  {attributes.map(attr => (
                    <div key={attr.attID} className="attribute-input">
                      <label htmlFor={`attr-${attr.attID}`}>{attr.attName}:</label>
                      <input
                        type="text"
                        id={`attr-${attr.attID}`}
                        value={formData.attributes[attr.attID] || ''}
                        onChange={(e) => handleAttributeChange(attr.attID, e.target.value)}
                        placeholder={`Enter ${attr.attName.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
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