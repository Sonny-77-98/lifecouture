import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Checkout({ cart, setCart }) {
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    state: ""
  });
  const [variants, setVariants] = useState({});
  const [states, setStates] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [shippingCost] = useState(6.99);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const getApiUrl = (endpoint) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  };

  const dollarsToCents = (amount) => {
    return Math.round(parseFloat(amount) * 100);
  };

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        console.log("Fetching variants for cart items:", cart);
        const productVariants = {};
        
        for (const item of cart) {
          console.log(`Fetching variants for product ID: ${item.prodID}`);
          try {
            const response = await fetch(getApiUrl(`/api/products/${item.prodID}/variants`));
            
            if (!response.ok) {
              console.error(`Error response from API for product ${item.prodID}:`, response.status);
              continue;
            }
            
            const data = await response.json();
            console.log(`Variants for product ${item.prodID}:`, data);
            
            if (Array.isArray(data) && data.length > 0) {
              productVariants[item.prodID] = data;
              if (!item.varID && data.length > 0) {
                const updatedCart = [...cart];
                const itemIndex = updatedCart.findIndex(cartItem => cartItem.prodID === item.prodID);
                if (itemIndex !== -1) {
                  updatedCart[itemIndex] = {
                    ...updatedCart[itemIndex],
                    varID: data[0].varID
                  };
                  setCart(updatedCart);
                }
              }
            }
          } catch (err) {
            console.error(`Error fetching variants for product ${item.prodID}:`, err);
          }
        }
        
        console.log("All product variants:", productVariants);
        setVariants(productVariants);
      } catch (error) {
        console.error("Error in fetchVariants:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchStates = async () => {
      try {
        console.log("Fetching states from:", getApiUrl('/api/states'));
        const response = await fetch(getApiUrl('/api/states'));
        const rawData = await response.json();
        console.log("States raw data type:", typeof rawData);
        console.log("States raw data:", rawData);
        let statesArray;
        
        if (Array.isArray(rawData)) {
          console.log("Data is an array");
          statesArray = [...rawData];
        } else if (typeof rawData === 'object') {
          console.log("Data is an object, converting to array");
          statesArray = Object.values(rawData);
        } else {
          console.log("Data is neither array nor object");
          statesArray = [];
        }
        
        console.log("Processed states array:", statesArray);
        console.log("Is array?", Array.isArray(statesArray));
        console.log("Length:", statesArray.length);
        
        setStates(statesArray);
      } catch (error) {
        console.error("Error fetching states:", error);
        setStates([]); 
      }
    };

    fetchStates();
    if (cart.length > 0) {
      fetchVariants();
    } else {
      setLoading(false);
    }
  }, [cart, setCart]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  
    if (name === "state") {
      if (states) {
        console.log("States data type:", typeof states);
        console.log("States is array?", Array.isArray(states));
        console.log("States length:", states.length);
        let selectedState = null;
        try {
          for (let i = 0; i < states.length; i++) {
            const state = states[i];
            if (state && state.stateName === value) {
              selectedState = state;
              break;
            }
          }
          
          if (selectedState && selectedState.taxRatesA) {
            const taxRateValue = parseFloat(selectedState.taxRatesA) / 100;
            console.log("Setting tax rate to:", taxRateValue);
            setTaxRate(taxRateValue);
          } else {
            console.log("No matching state found or missing taxRatesA");
            setTaxRate(0);
          }
        } catch (error) {
          console.error("Error in state selection:", error);
          setTaxRate(0);
        }
      } else {
        console.error("States data is unavailable");
        setTaxRate(0);
      }
    }
  };

  const handleVariantChange = (index, varID) => {
    const updatedCart = [...cart];
    updatedCart[index].varID = varID;
    setCart(updatedCart);
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => {
      const prodVariants = variants[item.prodID] || [];
      let selectedVariant = null;
      
      // Use manual loop instead of .find()
      for (let i = 0; i < prodVariants.length; i++) {
        if (String(prodVariants[i].varID) === String(item.varID)) {
          selectedVariant = prodVariants[i];
          break;
        }
      }
      
      if (!selectedVariant) return total;
      const price = parseFloat(selectedVariant.varPrice);
      const quantity = item.quantity || 1;
      return isNaN(price) ? total : total + price * quantity;
    }, 0);
  };

  const getVariantPrice = (item) => {
    const prodVariants = variants[item.prodID] || [];
    let selectedVariant = null;
    
    for (let i = 0; i < prodVariants.length; i++) {
      if (String(prodVariants[i].varID) === String(item.varID)) {
        selectedVariant = prodVariants[i];
        break;
      }
    }
    
    return selectedVariant ? parseFloat(selectedVariant.varPrice).toFixed(2) : 'N/A';
  };

  const getVariantSKU = (item) => {
    const prodVariants = variants[item.prodID] || [];
    let selectedVariant = null;
    
    for (let i = 0; i < prodVariants.length; i++) {
      if (String(prodVariants[i].varID) === String(item.varID)) {
        selectedVariant = prodVariants[i];
        break;
      }
    }
    
    return selectedVariant ? selectedVariant.varSKU : 'N/A';
  };

  const placeOrder = async () => {
    const { name, email, phone, address, state } = customerInfo;

    if (!name || !email || !phone || !address || !state) {
      alert("Please fill in all fields including state.");
      return;
    }

    if (cart.some(item => !item.varID)) {
      alert("Please select a variant for each product.");
      return;
    }

    const subtotal = calculateSubtotal();
    const tax = subtotal * taxRate;
    const totalAmount = subtotal + tax + shippingCost;

    // Convert monetary values to cents for the backend
    const orderData = {
      items: cart.map(item => {
        const price = parseFloat(getVariantPrice(item));
        return {
          prodID: item.prodID,
          varID: item.varID,
          quantity: item.quantity || 1,
          price: dollarsToCents(price) // Convert price to cents
        };
      }),
      subtotal: dollarsToCents(subtotal),
      taxRate: taxRate * 100, // Convert to percentage value (e.g., 6.25 instead of 0.0625)
      shippingCost: dollarsToCents(shippingCost),
      totalAmount: dollarsToCents(totalAmount),
      name,
      email,
      phone,
      address,
      state
    };

    console.log("Sending order data to backend:", orderData);

    try {
      const response = await fetch(getApiUrl('/api/checkout'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      if (response.ok) {
        alert("Order placed successfully!");
        setCart([]);
        navigate("/");
      } else {
        alert("Error placing order: " + (data.message || data.error || "Unknown error"));
      }
    } catch (error) {
      alert("Error placing order: " + error.message);
    }
  };

  const subtotal = calculateSubtotal();
  const tax = subtotal * taxRate;
  const grandTotal = subtotal + tax + shippingCost;

  if (loading) {
    return (
      <div className="checkout-container">
        <h2 className="checkout-title">Checkout</h2>
        <p>Loading product information...</p>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <h2 className="checkout-title">Checkout</h2>

      <div className="checkout-items">
        {cart.map((item, index) => {
          const productVariants = variants[item.prodID] || [];
          return (
            <div key={index} className="checkout-item">
              <img 
                src={item.prodURL} 
                alt={item.prodTitle} 
                className="checkout-item-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/200?text=No+Image";
                }}
              />
              <div className="checkout-item-details">
                <p className="checkout-item-title">{item.prodTitle}</p>
                <p className="checkout-item-description">{item.prodDesc}</p>
                
                {productVariants.length > 0 ? (
                  <select
                    value={item.varID || ""}
                    onChange={(e) => handleVariantChange(index, e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select a variant</option>
                    {productVariants.map(variant => (
                      <option key={variant.varID} value={variant.varID}>
                        SKU: {variant.varSKU} | Price: ${parseFloat(variant.varPrice).toFixed(2) || "N/A"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="no-variants-message">
                    {loading ? "Loading variants..." : "No variants available for this product."}
                  </div>
                )}
                
                {item.varID && (
                  <div className="selected-variant">
                    <p>SKU: {getVariantSKU(item)} | Price: ${getVariantPrice(item)}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="customer-info">
        <input type="text" name="name" placeholder="Full Name" value={customerInfo.name} onChange={handleInputChange} className="input-field" />
        <input type="email" name="email" placeholder="Email" value={customerInfo.email} onChange={handleInputChange} className="input-field" />
        <input type="tel" name="phone" placeholder="Phone Number" value={customerInfo.phone} onChange={handleInputChange} className="input-field" />
        <textarea name="address" placeholder="Shipping Address" value={customerInfo.address} onChange={handleInputChange} className="textarea-field" />

        <select name="state" value={customerInfo.state} onChange={handleInputChange} className="input-field">
          <option value="">Select State</option>
          {states.map((state, index) => (
            <option key={index} value={state.stateName}>{state.stateName}</option>
          ))}
        </select>
      </div>

      <div className="checkout-summary">
        <h3>Order Summary</h3>
        <p>Subtotal: ${subtotal.toFixed(2)}</p>
        <p>Tax ({(taxRate * 100).toFixed(2)}%): ${tax.toFixed(2)}</p>
        <p>Shipping Fee: ${shippingCost.toFixed(2)}</p>
        <p><strong>Total: ${grandTotal.toFixed(2)}</strong></p>
      </div>

      <button onClick={placeOrder} className="place-order-btn">Place Order</button>
    </div>
  );
}

export default Checkout;