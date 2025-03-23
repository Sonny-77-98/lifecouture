import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import Cart from "./Cart";
import Checkout from "./Checkout";
import About from "./About";
import Contact from "./Contact";
import "./App.css";

function App() {
  const [productList, setProductList] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/products");
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProductList(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart((prevCart) => [...prevCart, product]);
  };

  return (
    <Router>
      <div className="container">
        <div className="navbar">
          <div className="logo">Life Couture</div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/cart">Cart ({cart.length})</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>

        <Routes>
          <Route
            path="/"
            element={
              <div>
                <div className="hero">
                  <h1>Welcome to Life Couture</h1>
                  <p>Your one-stop shop for fitness gear!</p>
                </div>
                <div className="products">
                  {loading ? (
                    <div>Loading products...</div>
                  ) : error ? (
                    <div>Error loading products: {error}</div>
                  ) : productList.length === 0 ? (
                    <div>No products available.</div>
                  ) : (
                    productList.map((product) => (
                      <div className="product-card" key={product.prodID}>
                        <div className="product-image">
                          <img
                            src={product.prodURL}
                            alt={product.prodTitle}
                            onError={(e) => (e.target.src = "https://i.imgur.com/defaultImage.jpg")}
                          />
                        </div>
                        <div>{product.prodTitle}</div>
                        <div>{product.prodDesc}</div>
                        <button onClick={() => addToCart(product)}>Add to Cart</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            }
          />
          <Route path="/cart" element={<Cart cart={cart} setCart={setCart} />} />
          <Route path="/checkout" element={<Checkout cart={cart} setCart={setCart} />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>

        <div className="footer">
          <p>&copy; 2025 Life Couture. All rights reserved.</p>
        </div>
      </div>
    </Router>
  );
}

export default App;
