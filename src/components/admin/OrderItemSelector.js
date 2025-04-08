import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OrderItemSelector = ({ onAddItem }) => {
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/products');
        setProducts(Array.isArray(response.data) ? response.data : []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch variants when a product is selected
  useEffect(() => {
    const fetchVariants = async () => {
      if (!selectedProduct) {
        setVariants([]);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/products/${selectedProduct}/variants`);
        setVariants(Array.isArray(response.data) ? response.data : []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching variants:', err);
        setError('Failed to load variants');
        setLoading(false);
      }
    };

    fetchVariants();
  }, [selectedProduct]);

  const handleProductChange = (e) => {
    setSelectedProduct(e.target.value);
    setSelectedVariant(''); // Reset variant when product changes
  };

  const handleVariantChange = (e) => {
    setSelectedVariant(e.target.value);
  };

  const handleQuantityChange = (e) => {
    setQuantity(parseInt(e.target.value) || 1);
  };

  const handleAddItem = () => {
    if (!selectedProduct || !selectedVariant) {
      setError('Please select both product and variant');
      return;
    }

    // Find the selected variant object
    const variant = variants.find(v => v.varID.toString() === selectedVariant);
    if (!variant) return;

    // Find the selected product object
    const product = products.find(p => p.prodID.toString() === selectedProduct);
    if (!product) return;

    // Create the item object to add to the order
    const item = {
      prodID: product.prodID,
      prodTitle: product.prodTitle,
      varID: variant.varID,
      varSKU: variant.varSKU,
      quantity: quantity,
      price: product.price || 0, // You may need to add price to your product model
      subtotal: (product.price || 0) * quantity
    };

    onAddItem(item);
    
    // Reset selection after adding
    setSelectedVariant('');
    setQuantity(1);
  };

  return (
    <div className="order-item-selector">
      {error && <div className="error-message">{error}</div>}
      
      <div className="selector-row">
        <div className="form-group">
          <label>Product</label>
          <select
            value={selectedProduct}
            onChange={handleProductChange}
            disabled={loading}
          >
            <option value="">Select Product</option>
            {products.map(product => (
              <option key={product.prodID} value={product.prodID}>
                {product.prodTitle}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Variant</label>
          <select
            value={selectedVariant}
            onChange={handleVariantChange}
            disabled={!selectedProduct || loading}
          >
            <option value="">Select Variant</option>
            {variants.map(variant => (
              <option key={variant.varID} value={variant.varID}>
                {variant.varSKU}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={handleQuantityChange}
            disabled={!selectedVariant}
          />
        </div>
        
        <button
          className="add-item-button"
          onClick={handleAddItem}
          disabled={!selectedVariant || loading}
        >
          Add Item
        </button>
      </div>
    </div>
  );
};

export default OrderItemSelector;