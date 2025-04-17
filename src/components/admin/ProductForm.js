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
    selectedCategories: []
  });
  
  const [productImages, setProductImages] = useState([]);
  const [newImage, setNewImage] = useState({ 
    imgURL: '', 
    imgAlt: '', 
    varID: null  
  });
  
  // State for variant management
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [variants, setVariants] = useState([]);
  const [newVariant, setNewVariant] = useState({
    varSKU: '',
    varBCode: '',
    varPrice: '99.99',
    size: '',
    color: '',
    quantity: '10'
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [variantsToDelete, setVariantsToDelete] = useState([]);

  const statusOptions = [
    'active',
    'inactive',
  ];
  
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
  
  useEffect(() => {
    const fetchProduct = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log("Edit mode detected, fetching product with ID:", id);
        
        const response = await axios.get(`/api/products/${id}`);
        console.log("Product data received:", response.data);
        const product = response.data;
        
        console.log('Product data:', product);
        
        // Set product images after product is defined
        if (product.images && Array.isArray(product.images)) {
          setProductImages(product.images);
        }
        
        let productCategories = [];
        if (product.categories) {
          productCategories = Array.isArray(product.categories)
            ? product.categories.map(cat => Number(cat.catID)) // Convert to numbers
            : [];
        }
        console.log("Categories from API:", product.categories);
        console.log("Extracted category IDs:", productCategories);
        
        setFormData({
          prodTitle: product.prodTitle || '',
          prodDesc: product.prodDesc || '',
          prodStat: product.prodStat || 'active',
          prodURL: product.prodURL || '',
          selectedCategories: productCategories
        });
        
        try {
          const variantResponse = await axios.get(`/api/products/${id}/variants`);
          setVariants(Array.isArray(variantResponse.data) ? variantResponse.data : []);
        } catch (varErr) {
          console.error('Error fetching variants:', varErr);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product information. Please try again.');
        setLoading(false);
      }
    };
    
    fetchProduct();
  }, [id, isEditMode]);

  useEffect(() => {
    console.log("Form data updated:", formData);
  }, [formData]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCategoryChange = (catID) => {
    const numericCatID = Number(catID);
    const selectedCategories = [...formData.selectedCategories];
    const index = selectedCategories.findIndex(id => Number(id) === numericCatID);
    
    if (index === -1) {
      selectedCategories.push(numericCatID);
    } else {
      selectedCategories.splice(index, 1);
    }
    
    setFormData({ ...formData, selectedCategories });
  };

  const handleImageChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'varID') {
      const varID = value === '' ? null : parseInt(value, 10);
      if (value !== '' && isNaN(varID)) {
        console.error('Invalid variant ID:', value);
        setNewImage(prev => ({ ...prev, varID: null }));
      } else {
        setNewImage(prev => ({ ...prev, varID }));
      }
    } else {
      setNewImage(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const addImage = async () => {
    if (!newImage.imgURL.trim()) {
      alert('Please enter an image URL');
      return;
    }
  
    try {
      if (isEditMode && id) {
        const response = await axios.post(`/api/products/${id}/images`, {
          imgURL: newImage.imgURL,
          imgAlt: newImage.imgAlt,
          varID: newImage.varID
        });
        if (response && response.data) {
          setProductImages([...productImages, response.data]);
        } else {
          const tempImage = {
            ...newImage,
            tempId: Date.now()
          };
          setProductImages([...productImages, tempImage]);
        }
      } else {
        const imageToAdd = {
          ...newImage,
          tempId: Date.now()
        };
        
        setProductImages([...productImages, imageToAdd]);
      }
      setNewImage({ 
        imgURL: '', 
        imgAlt: '', 
        varID: null
      });
    } catch (error) {
      console.error('Error adding image:', error);
      const imageToAdd = {
        ...newImage,
        tempId: Date.now()
      };
      setProductImages([...productImages, imageToAdd]);

      setNewImage({ 
        imgURL: '', 
        imgAlt: '', 
        varID: null
      });

      alert('The image was added locally but there was an issue saving to the database. It will be saved when you update the product.');
    }
  };

  const removeImage = async (index) => {
    const imageToRemove = productImages[index];
    
    try {
      if (isEditMode && imageToRemove.imgID) {
        await axios.delete(`/api/products/images/${imageToRemove.imgID}`);
      }
      const updatedImages = [...productImages];
      updatedImages.splice(index, 1);
      setProductImages(updatedImages);
    } catch (error) {
      console.error('Error removing image:', error);
      alert('Failed to remove image: ' + (error.response?.data?.message || error.message));

      if (!isEditMode || !imageToRemove.imgID) {
        const updatedImages = [...productImages];
        updatedImages.splice(index, 1);
        setProductImages(updatedImages);
      }
    }
  }


  const handleVariantChange = (e) => {
    const { name, value } = e.target;
    setNewVariant(prev => ({ ...prev, [name]: value }));
  };
  
  const generateSKU = () => {
    if (!formData.prodTitle) {
      alert('Please enter a product title first');
      return;
    }
    
    const productPrefix = formData.prodTitle
      .slice(0, 3)
      .toUpperCase();
    const uniqueId = Date.now().toString().slice(-4);
    
    const sku = `${productPrefix}-${uniqueId}`;
    setNewVariant(prev => ({ ...prev, varSKU: sku }));
  };
  
  const addVariant = () => {
    if (!newVariant.varSKU.trim()) {
      alert('Please enter a SKU for this variant');
      return;
    }
    
    if (!newVariant.varPrice) {
      alert('Please enter a price for this variant');
      return;
    }

    const duplicateSKU = variants.some(v => 
      v.varSKU.toLowerCase() === newVariant.varSKU.toLowerCase()
    );
    
    if (duplicateSKU) {
      alert(`A variant with SKU "${newVariant.varSKU}" already exists.`);
      return;
    }
    
    const variantToAdd = {
      ...newVariant,
      tempId: Date.now()
    };
    
    setVariants([...variants, variantToAdd]);
    setNewVariant({
      varSKU: '',
      varBCode: '',
      varPrice: '99.99',
      quantity: '10'
    });
  };
  
  const removeVariant = (index) => {
    const variantToRemove = variants[index];  
    if (variantToRemove.varID) {
      setVariantsToDelete(prev => [...prev, variantToRemove.varID]);
    }
    const updatedVariants = [...variants];
    updatedVariants.splice(index, 1);
    setVariants(updatedVariants);
  };
  
  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const productData = {
        prodTitle: formData.prodTitle,
        prodDesc: formData.prodDesc,
        prodStat: formData.prodStat,
        prodURL: formData.prodURL,
        categories: formData.selectedCategories,
        images: productImages.map(image => ({
          imgID: image.imgID || null,
          imgURL: image.imgURL,
          imgAlt: image.imgAlt || formData.prodTitle,
          varID: image.varID || null
        })),
        variants: variants.map(variant => ({
          varID: variant.varID || null, 
          varSKU: variant.varSKU,
          varBCode: variant.varBCode,
          varPrice: parseFloat(variant.varPrice),
          quantity: parseInt(variant.quantity),
        })),
        variantsToDelete: variantsToDelete 
      };
      
      console.log('Submitting product data:', productData);
      
      let response;
      
      if (isEditMode) {
        response = await axios.put(`/api/products/${id}`, productData);
        setSuccess('Product updated successfully');
      } else {
        response = await axios.post('/api/products', productData);
        setSuccess('Product created successfully');

        setFormData({
          prodTitle: '',
          prodDesc: '',
          prodStat: 'active',
          prodURL: '',
          selectedCategories: []
        });
        
        setProductImages([]);
        setVariants([]);
      }
      setVariantsToDelete([]);

      setTimeout(() => {
        navigate('/admin/products');
      }, 2000);
      
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
            
            <div className="form-group">
              <label htmlFor="prodURL">Thumbnail URL*</label>
              <input
                type="text"
                id="prodURL"
                name="prodURL"
                value={formData.prodURL}
                onChange={handleChange}
                placeholder="Enter main thumbnail URL"
                required
              />
              <p className="field-help">This will be used as the main product thumbnail in listings</p>
            </div>
            
            {formData.prodURL && (
              <div className="image-preview">
                <h4>Thumbnail Preview</h4>
                <img 
                  src={formData.prodURL} 
                  alt={formData.prodTitle}
                  className="preview-image"
                  onError={(e) => {e.target.src = "https://i.imgur.com/O4L5Wbf.jpeg"}}
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
                        checked={formData.selectedCategories.some(id => Number(id) === Number(category.catID))}
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

        {/* Variant Management Section */}
        <div className="variants-section">
          <div className="section-header">
            <h3>Product Variants</h3>
            <button 
              type="button" 
              className="toggle-button"
              onClick={() => setShowVariantForm(!showVariantForm)}
            >
              {showVariantForm ? 'Hide Variant Form' : 'Add New Variant'}
            </button>
          </div>
          
          {showVariantForm && (
            <div className="variant-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="varSKU">SKU*</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      id="varSKU"
                      name="varSKU"
                      value={newVariant.varSKU}
                      onChange={handleVariantChange}
                      placeholder="e.g., ELT-S-BLK"
                    />
                    <button 
                      type="button" 
                      className="generate-button"
                      onClick={generateSKU}
                    >
                      Generate
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="varBCode">Barcode</label>
                  <input
                    type="text"
                    id="varBCode"
                    name="varBCode"
                    value={newVariant.varBCode}
                    onChange={handleVariantChange}
                    placeholder="Enter barcode (optional)"
                  />
                </div>
              </div>
                           
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="varPrice">Price ($)*</label>
                  <input
                    type="number"
                    id="varPrice"
                    name="varPrice"
                    value={newVariant.varPrice}
                    onChange={handleVariantChange}
                    placeholder="Enter price"
                    step="0.01"
                    min="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="quantity">Initial Stock Quantity</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={newVariant.quantity}
                    onChange={handleVariantChange}
                    placeholder="Enter initial quantity"
                    min="0"
                  />
                </div>
              </div>
              
              <button 
                type="button" 
                className="add-variant-button"
                onClick={addVariant}
              >
                Add Variant
              </button>
            </div>
          )}
          
          {variants.length > 0 ? (
            <div className="variants-table-container">
              <table className="variants-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant, index) => (
                    <tr key={variant.varID || variant.tempId || index}>
                      <td>{variant.varSKU}</td>
                      <td>${parseFloat(variant.varPrice).toFixed(2)}</td>
                      <td>{variant.quantity || variant.invQty || 0}</td>
                      <td className="actions-cell">
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => removeVariant(index)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-variants-message">
              <p>No variants added yet. Add variants to create different sizes, colors, etc.</p>
            </div>
          )}
        </div>

        {/* Product Images Section */}
        <div className="product-images-section">
          <h3>Product Images</h3>
          
          <div className="image-grid">
            {productImages.map((image, index) => (
              <div key={image.imgID || image.tempId} className="image-item">
                <div className="image-preview">
                  <img 
                    src={image.imgURL} 
                    alt={image.imgAlt || "Product image"} 
                    onError={(e) => {e.target.src = "https://i.imgur.com/O4L5Wbf.jpeg"}}
                  />
                </div>
                <div className="image-details">
                  <p className="image-alt">{image.imgAlt || "No alt text"}</p>
                  <p className="image-variant">
                    Variant: {
                      variants.find(v => v.varID === image.varID)?.varSKU || 
                      "Not assigned to variant"
                    }
                  </p>
                  <button 
                    type="button" 
                    className="remove-image-btn"
                    onClick={() => removeImage(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="add-image-form">
            <h4>Add New Image</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="imgURL">Image URL*</label>
                <input
                  type="text"
                  id="imgURL"
                  name="imgURL"
                  value={newImage.imgURL}
                  onChange={handleImageChange}
                  placeholder="Enter image URL"
                />
              </div>
              <div className="form-group">
                <label htmlFor="imgAlt">Alt Text</label>
                <input
                  type="text"
                  id="imgAlt"
                  name="imgAlt"
                  value={newImage.imgAlt}
                  onChange={handleImageChange}
                  placeholder="Enter image alt text"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="varID">Associate with Variant</label>
              <select
                  id="varID"
                  name="varID"
                  value={newImage.varID || ''}
                  onChange={handleImageChange}
                >
                  <option value="">Not associated with a variant</option>
                  {variants.map(variant => (
                    <option key={variant.varID || variant.tempId} value={variant.varID || ''}>
                      {variant.varSKU || `Variant ${variant.varID || 'New'}`}
                    </option>
                  ))}
              </select>
            </div>
            
            <button 
              type="button" 
              className="add-image-button"
              onClick={addImage}
            >
              Add Image
            </button>
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