import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../../style/OrderForm.css';

const OrderForm = () => {
  const { id } = useParams(); 
  const isEditMode = !!id;
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [addresses, setAddresses] = useState([]); // State for customer addresses
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Default tax and shipping rates
  const [taxRate, setTaxRate] = useState(8.25);
  const [shippingCost, setShippingCost] = useState(5.99);
  
  const [formData, setFormData] = useState({
    customer: '',
    status: 'Pending',
    items: [],
    shippingAddressId: '' // Add shipping address ID field
  });

  const [newItem, setNewItem] = useState({
    product: '',
    variant: '',
    quantity: 1,
    price: 0, 
    total: 0 
  });

  // Format currency helper function
  const formatCurrency = (amount) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  // Convert dollars to cents for API calls
  const dollarsToCents = (amount) => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) return 0;
    return Math.round(parsedAmount * 100);
  };

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

  // Fetch customer addresses when customer changes
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!formData.customer) {
        setAddresses([]);
        return;
      }
      
      try {
        const response = await axios.get(`/api/users/${formData.customer}/addresses`);
        const addressData = Array.isArray(response.data) ? response.data : [];
        setAddresses(addressData);
        
        // If there are addresses and none is selected yet, select the default or first one
        if (addressData.length > 0 && !formData.shippingAddressId) {
          const defaultAddress = addressData.find(addr => addr.usAdIsDefault);
          setFormData(prev => ({
            ...prev,
            shippingAddressId: defaultAddress ? defaultAddress.usAdID.toString() : addressData[0].usAdID.toString()
          }));
        }
      } catch (err) {
        console.error('Error fetching addresses:', err);
        setError('Failed to load customer addresses');
      }
    };
    
    fetchAddresses();
  }, [formData.customer]);

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        const response = await axios.get(`/api/orders/${id}`);

        if (response.data.taxRate) {
          setTaxRate(parseFloat(response.data.taxRate));
        }
        
        if (response.data.shippingCost) {
          setShippingCost(parseFloat(response.data.shippingCost) / 100); // Convert from cents if stored that way
        }

        setFormData({
          customer: response.data.userID.toString(),
          status: response.data.orderStat,
          shippingAddressId: response.data.shippingAddressId ? response.data.shippingAddressId.toString() : '',
          items: response.data.items.map(item => ({
            id: item.orderItemID,
            product: item.prodID.toString(),
            variant: item.varID.toString(),
            variantSKU: item.sku || item.varSKU,
            quantity: parseInt(item.orderVarQty) || 1,
            price: parseFloat(item.prodUPrice) > 100 ? parseFloat(item.prodUPrice) / 100 : parseFloat(item.prodUPrice) || 0,
            total: (parseFloat(item.prodUPrice) > 100 ? parseFloat(item.prodUPrice) / 100 : parseFloat(item.prodUPrice) || 0) 
            * (parseInt(item.orderVarQty) || 1),
            productTitle: item.prodTitle
          }))
        });
        
        // Load customer addresses
        if (response.data.userID) {
          try {
            const addressResponse = await axios.get(`/api/users/${response.data.userID}/addresses`);
            setAddresses(Array.isArray(addressResponse.data) ? addressResponse.data : []);
          } catch (addressErr) {
            console.error('Error fetching customer addresses:', addressErr);
          }
        }
        
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
        console.log('Variants data:', response.data);
        
        setVariants(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error('Error fetching variants:', err);
        setError('Failed to load product variants');
      }
    };
    
    fetchVariants();
  }, [newItem.product]);
  
  // Update total when price or quantity changes
  useEffect(() => {
    // Ensure price and quantity are numbers before calculation
    const price = parseFloat(newItem.price) || 0;
    const quantity = parseInt(newItem.quantity) || 1;
    const total = price * quantity;
    
    setNewItem(prev => ({
      ...prev,
      price: price,
      quantity: quantity,
      total: total
    }));
  }, [newItem.price, newItem.quantity]);
  
  const handleCustomerChange = (e) => {
    setFormData({
      ...formData,
      customer: e.target.value,
      shippingAddressId: '' // Reset shipping address when customer changes
    });
  };
  
  const handleStatusChange = (e) => {
    setFormData({
      ...formData,
      status: e.target.value
    });
  };

  // Handle address selection change
  const handleAddressChange = (e) => {
    setFormData({
      ...formData,
      shippingAddressId: e.target.value
    });
  };
  
  const handleProductChange = (e) => {
    const productId = e.target.value;
    
    setNewItem({
      ...newItem,
      product: productId,
      variant: '',
      price: 0,
      total: 0
    });

    if (productId) {
      const selectedProduct = products.find(p => p.prodID.toString() === productId);
      if (selectedProduct) {
        // Ensure price is a number
        const price = parseFloat(selectedProduct.price) || 0;
        const quantity = parseInt(newItem.quantity) || 1;
        
        setNewItem(prev => ({
          ...prev,
          price: price,
          total: price * quantity
        }));
      }
    }
  };
  
  const handleVariantChange = (e) => {
    const variantId = e.target.value;
    const selectedVariant = variants.find(v => v.varID.toString() === variantId);
    console.log('Selected variant:', selectedVariant);
    
    let price = 0;
    if (selectedVariant) {
      price = parseFloat(selectedVariant.varPrice) || 
              parseFloat(selectedVariant.price) || 
              parseFloat(selectedVariant.unitPrice) || 
              100.00;
    }
    
    console.log('Setting price to:', price);
    
    const quantity = parseInt(newItem.quantity) || 1;
    
    setNewItem({
      ...newItem,
      variant: variantId,
      price: price,
      total: price * quantity
    });
  };
  
  const handleQuantityChange = (e) => {
    const quantity = parseInt(e.target.value) || 1;
    const price = parseFloat(newItem.price) || 0;
    
    setNewItem({
      ...newItem,
      quantity: quantity,
      total: price * quantity
    });
  };

  const handleTaxRateChange = (e) => {
    const newRate = parseFloat(e.target.value) || 0;
    setTaxRate(newRate);
  };
  
  const handleShippingCostChange = (e) => {
    const newCost = parseFloat(e.target.value) || 0;
    setShippingCost(newCost);
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

    const price = parseFloat(newItem.price) || 0;
    const quantity = parseInt(newItem.quantity) || 1;

    const item = {
      product: newItem.product,
      variant: newItem.variant,
      variantSKU: variant.varSKU,
      quantity: quantity,
      price: price,
      total: price * quantity,
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
      price: 0,
      total: 0
    });
  };
  
  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedItems = [...formData.items];
    const price = parseFloat(updatedItems[index].price) || 0;
    
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].total = price * newQuantity;
    
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
  
  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      // Ensure each value is a number before adding
      const itemTotal = parseFloat(item.price) * parseInt(item.quantity) || 0;
      return sum + itemTotal;
    }, 0);
  };
  
  const calculateTax = () => {
    return calculateSubtotal() * (taxRate / 100);
  };
  
  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + shippingCost;
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

    if (!formData.shippingAddressId) {
      setError('Please select a shipping address');
      return;
    }
    
    try {
      setLoading(true);
  
      const formattedItems = formData.items.map(item => ({
        varID: item.variant,
        quantity: item.quantity,
        price: dollarsToCents(item.price),
        updateInventory: !isEditMode 
      }));
      
      let response;
      if (isEditMode) {
        response = await axios.put(`/api/orders/${id}`, {
          userID: formData.customer,
          orderStat: formData.status,
          orderTotalAmt: dollarsToCents(calculateTotal()),
          taxRate: taxRate,
          shippingCost: dollarsToCents(shippingCost),
          shippingAddressId: formData.shippingAddressId,
          items: formattedItems
        });
        
        setSuccess('Order updated successfully');
      } else {
        response = await axios.post('/api/orders', {
          userID: formData.customer,
          orderTotalAmt: dollarsToCents(calculateTotal()),
          orderStat: formData.status,
          taxRate: taxRate,
          shippingCost: dollarsToCents(shippingCost),
          shippingAddressId: formData.shippingAddressId,
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
        <div className="form-layout">
          <div className="order-info-section">
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

            {/* Add simple address dropdown */}
            <div className="form-group">
              <label htmlFor="shippingAddress">Shipping Address*</label>
              <select
                id="shippingAddress"
                value={formData.shippingAddressId}
                onChange={handleAddressChange}
                disabled={!formData.customer || loading}
                required
              >
                <option value="">Select Shipping Address</option>
                {addresses.map(address => (
                  <option key={address.usAdID} value={address.usAdID}>
                    {address.usAdStr}, {address.usAdCity}, {address.usAdState} {address.usAdPCode}
                    {address.usAdIsDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
              {addresses.length === 0 && formData.customer && (
                <p className="address-notice">No addresses found for this customer. Please add an address in the User Management section.</p>
              )}
            </div>
          </div>
          
          <div className="order-summary-section">
            <h3>Order Summary</h3>
            <div className="summary-box">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <div className="tax-input-group">
                  <label>Tax Rate (%):</label>
                  <input 
                    type="number" 
                    value={taxRate} 
                    onChange={handleTaxRateChange}
                    step="0.01" 
                    min="0" 
                    max="100"
                    className="rate-input"
                  />
                </div>
                <span>${calculateTax().toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <div className="shipping-input-group">
                  <label>Shipping:</label>
                  <input 
                    type="number" 
                    value={shippingCost} 
                    onChange={handleShippingCostChange}
                    step="0.01" 
                    min="0"
                    className="rate-input"
                  />
                </div>
                <span>${shippingCost.toFixed(2)}</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="order-items-section">
          <h3>Order Items</h3>
          
          <div className="item-input-grid">
            <div className="input-column">
              <label>Product</label>
              <select
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
            
            <div className="input-column">
              <label>Variant</label>
              <select
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
            
            <div className="input-column">
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={handleQuantityChange}
                disabled={!newItem.variant || loading}
              />
            </div>
            
            <div className="input-column">
              <label>Unit Price</label>
              <div className="price-display">${(parseFloat(newItem.price) || 0).toFixed(2)}</div>
            </div>
            
            <div className="input-column">
              <label>Total</label>
              <div className="price-display total">${(parseFloat(newItem.total) || 0).toFixed(2)}</div>
            </div>
            
            <div className="input-column">
              <label>&nbsp;</label>
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
                    <th>Unit Price</th>
                    <th>Total</th>
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
                      <td>${(parseFloat(item.price) || 0).toFixed(2)}</td>
                      <td>${(parseFloat(item.total) || 0).toFixed(2)}</td>
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
                  <tr className="subtotal-row">
                    <td colSpan="4" className="text-right">Subtotal:</td>
                    <td colSpan="2">${calculateSubtotal().toFixed(2)}</td>
                  </tr>
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
            disabled={loading || formData.items.length === 0 || !formData.shippingAddressId}
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