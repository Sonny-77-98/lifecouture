import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import '../../style/VariantList.css';

const VariantForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    varSKU: '',
    varBCode: '',
    prodID: '',
    varPrice: 83.54
  });
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('/api/products');
        setProducts(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please refresh the page and try again.');
      }
    };
    
    fetchProducts();
  }, []);
  useEffect(() => {
    const fetchVariant = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        const response = await axios.get(`/api/variants/${id}`);
        setFormData({
          varSKU: response.data.varSKU || '',
          varBCode: response.data.varBCode || '',
          prodID: response.data.prodID || '',
          varPrice: response.data.varPrice || 83.54
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching variant:', err);
        setError('Failed to load variant details. The variant may not exist or there was a server error.');
        setLoading(false);
      }
    };
    
    fetchVariant();
  }, [id, isEditMode]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: name === 'varPrice' ? parseFloat(value) : value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };
  
  const validateForm = () => {
    if (!formData.varSKU.trim()) {
      setError('SKU is required');
      return false;
    }
    
    if (!formData.prodID) {
      setError('Please select a product');
      return false;
    }
    
    if (formData.varPrice <= 0) {
      setError('Price must be greater than zero');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      let response;
      
      if (isEditMode) {
        response = await axios.put(`/api/variants/${id}`, formData);
        setSuccess('Variant updated successfully');
      } else {
        response = await axios.post('/api/variants', formData);
        setSuccess('Variant created successfully');
        
        // Clear form after successful creation
        setFormData({
          varSKU: '',
          varBCode: '',
          prodID: '',
          varPrice: 83.54
        });
      }
      
      // Redirect after successful submission
      setTimeout(() => {
        navigate('/admin/variants');
      }, 2000);
      
    } catch (err) {
      console.error('Error saving variant:', err);
      
      // Extract error details from response
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.error || 
                      'Failed to save variant. Please try again.';
                      
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className="loading-indicator">Loading variant data...</div>;
  }
  
  return (
    <div className="variant-form-container">
      <div className="form-header">
        <h2>{isEditMode ? 'Edit Variant' : 'Add New Variant'}</h2>
        <Link to="/admin/variants" className="back-link">
          &larr; Back to Variants
        </Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="variant-form">
        <div className="form-group">
          <label htmlFor="varSKU">SKU*</label>
          <input
            type="text"
            id="varSKU"
            name="varSKU"
            value={formData.varSKU}
            onChange={handleChange}
            placeholder="Enter variant SKU (e.g., ELT-S-BLK)"
            required
          />
          <p className="field-help">Format: [Product Code]-[Size]-[Color]</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="varBCode">Barcode</label>
          <input
            type="text"
            id="varBCode"
            name="varBCode"
            value={formData.varBCode || ''}
            onChange={handleChange}
            placeholder="Enter barcode (optional)"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="prodID">Product*</label>
          <select
            id="prodID"
            name="prodID"
            value={formData.prodID}
            onChange={handleChange}
            required
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.prodID} value={product.prodID}>
                {product.prodTitle}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="varPrice">Price ($)*</label>
          <input
            type="number"
            id="varPrice"
            name="varPrice"
            value={formData.varPrice}
            onChange={handleChange}
            placeholder="Enter price"
            step="0.01"
            min="0.01"
            required
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="submit-button"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : isEditMode ? 'Update Variant' : 'Create Variant'}
          </button>
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/admin/variants')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default VariantForm;