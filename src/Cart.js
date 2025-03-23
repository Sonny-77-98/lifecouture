import React from "react";
import { useNavigate } from "react-router-dom";

function Cart({ cart, setCart }) {
  const navigate = useNavigate();

  const removeFromCart = (index) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  return (
    <div className="cart-container">
      <h2>Your Cart</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        cart.map((item, index) => (
          <div key={index} className="cart-item">
            <img src={item.prodURL} alt={item.prodTitle} />
            <div>
              <p>{item.prodTitle}</p>
              <p>{item.prodDesc}</p>
              <button onClick={() => removeFromCart(index)}>Remove</button>
            </div>
          </div>
        ))
      )}
      {cart.length > 0 && (
        <button className="checkout-btn" onClick={() => navigate("/checkout")}>Proceed to Checkout</button>
      )}
    </div>
  );
}
export default Cart;