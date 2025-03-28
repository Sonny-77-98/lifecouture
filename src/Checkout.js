import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Checkout({ cart, setCart }) {
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo((prevInfo) => ({ ...prevInfo, [name]: value }));
  };

  const placeOrder = async () => {
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.address) {
      alert("Please fill in all fields.");
      return;
    }

    const orderData = {
      userID: 1,
      items: cart.map(item => ({ prodID: item.prodID, quantity: 1 })),
      totalAmount: cart.length * 50,
      ...customerInfo
    };

    try {
      const response = await fetch("http://localhost:3000/api/checkout", {
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
        alert("Error placing order: " + data.error);
      }
    } catch (error) {
      alert("Error placing order: " + error.message);
    }
  };

  return (
    <div className="checkout-container">
      <h2>Checkout</h2>
      <div className="checkout-items">
        {cart.map((item, index) => (
          <div key={index} className="checkout-item">
            <img src={item.prodURL} alt={item.prodTitle} />
            <div>
              <p>{item.prodTitle}</p>
              <p>{item.prodDesc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="customer-info">
        <input type="text" name="name" placeholder="Full Name" value={customerInfo.name} onChange={handleInputChange} />
        <input type="email" name="email" placeholder="Email" value={customerInfo.email} onChange={handleInputChange} />
        <input type="tel" name="phone" placeholder="Phone Number" value={customerInfo.phone} onChange={handleInputChange} />
        <textarea name="address" placeholder="Shipping Address" value={customerInfo.address} onChange={handleInputChange} />
      </div>
      <button onClick={placeOrder}>Place Order</button>
    </div>
  );
}

export default Checkout;
