import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const OrderForm = () => {
  const { id } = useParams(); 
  const isEditMode = !!id;
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [formData, setFormData] = useState({
    customer: '',
    status: 'Pending',
    items: []
  });

  const [newItem, setNewItem] = useState({
    product: '',
    variant: '',
    quantity: 1
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const customersResponse = await axios.get('/api/users');
        setCustomers(Array.isArray(customersResponse.data) ? customersResponse.data : []);

        const productsResponse = await axios.get('/api/products');
        setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : []);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load initial data. Please refresh the page.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        const response = await axios.get(`/api/orders/${id}`);

        setFormData({
          customer: response.data.userID.toString(),
          status: response.data.orderStat,
          items: response.data.items.map(item => ({
            id: item.orderItemID,
            product: item.prodID.toString(),
            variant: item.varID.toString(),
            variantSKU: item.sku,
            quantity: item.orderVarQty,
            price: item.prodUPrice,
            productTitle: item.prodTitle
          }))
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching order data:', err);
        setError('Failed to load order data. The order may not exist.');
        setLoading(false);
      }
    };
    
    fetchOrderData();
  }, [id, isEditMode]);

  useEffect(() => {
    const fetchVariants = async () => {
      if (!newItem.product) {
        setVariants([]);
        return;
      }
      
      try {
        const response = await axios.get(`/api/products/${newItem.product}/variants`);
        setVariants(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error fetching variants:', err);
        setError('Failed to load product variants');
      }
    };
    
    fetchVariants();
  }, [newItem.product]);
  
  const handleCustomerChange = (e) => {
    setFormData({
      ...formData,
      customer: e.target.value
    });
  };
  
  const handleStatusChange = (e) => {
    setFormData({
      ...formData,
      status: e.target.value
    });
  };
  
  const handleProductChange = (e) => {
    const productId = e.target.value;
    setNewItem({
      ...newItem,
      product: productId,
      variant: ''
});

  if (productId) {
    const selectedProduct = products.find(p => p.prodID.toString() === productId);
    if (selectedProduct) {
      const price = selectedProduct.price || 0;
      setNewItem(prev => ({
        ...prev,
        price: price
      }));
    }
  }
  };
  
  const handleVariantChange = (e) => {
    const variantId = e.target.value;
    const selectedVariant = variants.find(v => v.varID.toString() === variantId);
    
    setNewItem({
      ...newItem,
      variant: variantId,
 
      price: selectedVariant ? (selectedVariant.varPrice || 100.00) : 0
    });
  };
  
  const handleQuantityChange = (e) => {
    setNewItem({
      ...newItem,
      quantity: parseInt(e.target.value) || 1
    });
  };
  
  const addItem = () => {
    if (!newItem.product || !newItem.variant) {
      setError('Please select both product and variant');
      return;
    }

    const product = products.find(p => p.prodID.toString() === newItem.product);
    const variant = variants.find(v => v.varID.toString() === newItem.variant);
    
    if (!product || !variant) {
      setError('Selected product or variant not found');
      return;
    }

    const price = variant.varPrice || 83.54;

    const item = {
      product: newItem.product,
      variant: newItem.variant,
      variantSKU: variant.varSKU,
      quantity: newItem.quantity,
      price: price,
      productTitle: product.prodTitle
    };
    
    setFormData({
      ...formData,
      items: [...formData.items, item]
    });
    
    setNewItem({
      product: '',
      variant: '',
      quantity: 1,
      price: 0
    });
  };
  
  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedItems = [...formData.items];
    updatedItems[index].quantity = newQuantity;
    
    setFormData({
      ...formData,
      items: updatedItems
    });
  };
  
  const removeItem = (index) => {
    const updatedItems = [...formData.items];
    updatedItems.splice(index, 1);
    
    setFormData({
      ...formData,
      items: updatedItems
    });
  };
  
  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customer) {
      setError('Please select a customer');
      return;
    }
    
    if (formData.items.length === 0) {
      setError('Please add at least one item to the order');
      return;
    }
    
    try {
      setLoading(true);

      const formattedItems = formData.items.map(item => ({
        varID: item.variant,
        quantity: item.quantity,
        price: item.price,
        updateInventory: !isEditMode 
      }));
      
      let response;
      if (isEditMode) {
        response = await axios.put(`/api/orders/${id}`, {
          userID: formData.customer,
          orderStat: formData.status,
          orderTotalAmt: calculateTotal(),
          items: formattedItems
        });
        
        setSuccess('Order updated successfully');
      } else {
        // Create new order
        response = await axios.post('/api/orders', {
          userID: formData.customer,
          orderTotalAmt: calculateTotal(),
          orderStat: formData.status,
          items: formattedItems
        });
        
        setSuccess('Order created successfully');
      }

      setTimeout(() => {
        navigate('/admin/orders');
      }, 2000);
      
    } catch (err) {
      console.error('Error saving order:', err);
      setError(err.response?.data?.error || 'Failed to save order');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="loading">Loading order data...</div>;
  }
  
  return (
    <div className="order-form-container">
      <h2>{isEditMode ? 'Edit Order' : 'Create New Order'}</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Order Information</h3>
          
          <div className="form-group">
            <label htmlFor="customer">Customer*</label>
            <select
              id="customer"
              value={formData.customer}
              onChange={handleCustomerChange}
              disabled={loading}
              required
            >
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer.usID} value={customer.usID}>
                  {customer.usFname} {customer.usLname} ({customer.usEmail})
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="status">Order Status*</label>
            <select
              id="status"
              value={formData.status}
              onChange={handleStatusChange}
              disabled={loading}
              required
            >
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        <div className="form-section">
          <h3>Order Items</h3>
          
          <div className="item-selector">
            <div className="selector-row">
              <div className="form-group">
                <label htmlFor="product">Product</label>
                <select
                  id="product"
                  value={newItem.product}
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
                <label htmlFor="variant">Variant</label>
                <select
                  id="variant"
                  value={newItem.variant}
                  onChange={handleVariantChange}
                  disabled={!newItem.product || loading}
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
                <label htmlFor="quantity">Quantity</label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  value={newItem.quantity}
                  onChange={handleQuantityChange}
                  disabled={!newItem.variant || loading}
                />
              </div>
              
              <button
                type="button"
                className="add-item-button"
                onClick={addItem}
                disabled={!newItem.variant || loading}
              >
                Add Item
              </button>
            </div>
          </div>
          
          {formData.items.length > 0 ? (
            <div className="order-items-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.productTitle}</td>
                      <td>{item.variantSKU}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                          className="quantity-input"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="remove-button"
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
            <div className="no-items">No items added to this order yet.</div>
          )}
        </div>
        
        <div className="form-actions">
          <button
            type="submit"
            className="submit-button"
            disabled={loading || formData.items.length === 0}
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Order' : 'Create Order'}
          </button>
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/admin/orders')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;