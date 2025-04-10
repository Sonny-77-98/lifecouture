import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Admin components
import Login from './components/Login';
import Dashboard from './components/admin/DashBoard';
import ProductList from './components/admin/ProductList';
import ProductForm from './components/admin/ProductForm';
import CategoryList from './components/admin/CategoryList';
import CategoryForm from './components/admin/CategoryForm';
import InventoryList from './components/admin/InventoryList';
import OrderList from './components/admin/OrderList';
import OrderDetail from './components/admin/OrderDetail';
import OrderForm from './components/admin/OrderForm';
import VariantList from './components/admin/VariantList';
import VariantForm from './components/admin/VariantForm';
import OrderItemSelector from './components/admin/OrderItemSelector';
import ProductFilter from "./ProductFilter";

// Storefront components
import Cart from "./Cart";
import Checkout from "./Checkout";
import About from "./About";

// Styles
import './style/App.css';

function App() {
  const [productList, setProductList] = React.useState([]);
  const [cart, setCart] = React.useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
        
        const response = await fetch(`${API_URL}/api/products`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }
        
        const data = await response.json();
        setProductList(data);
      } catch (error) {
        setError(error.message);
        console.error("Product fetch error details:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  React.useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart((prevCart) => [...prevCart, product]);
  };

  const isAdminRoute = window.location.pathname.startsWith('/admin') || window.location.pathname === '/login';

  // Filter products based on search query
  const filteredProducts = productList.filter((product) => 
    product.prodTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AuthProvider>
      <Router>
        {!isAdminRoute && (
          <div className="navbar">
            <div className="logo">Life Couture</div>
            <div className="nav-links-right">
              <Link to="/">Home</Link>
              <Link to="/cart">Cart ({cart.length})</Link>
              <Link to="/about">About</Link>
              <Link to="/admin">Admin</Link>
            </div>
          </div>
        )}

        <div className={isAdminRoute ? "app" : "container"}>
          <Routes>
            {/* Admin Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
            <Route path="/admin/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            {/* Other Admin Routes */}
            
            {/* Storefront Routes */}
            <Route path="/" element={<Home 
              productList={filteredProducts} 
              loading={loading} 
              error={error} 
              addToCart={addToCart} 
              setSearchQuery={setSearchQuery} 
              searchQuery={searchQuery} 
            />} />
            <Route path="/cart" element={<Cart cart={cart} setCart={setCart} />} />
            <Route path="/checkout" element={<Checkout cart={cart} setCart={setCart} />} />
            <Route path="/about" element={<About />} />
            <Route path="/filter" element={<ProductFilter />} />
          </Routes>
        </div>

        {/* Footer logic */}
        <Footer />
      </Router>
    </AuthProvider>
  );
}

const Footer = () => (
  <div className="footer">
    <p>&copy; 2025 Life Couture. All rights reserved.</p>
    <div className="contact-info">
      <p>If you have any questions, feel free to reach out!</p>
      <p>Email: <a href="mailto:support@lifecouture.com">support@lifecouture.com</a></p>
      <p>Phone: (123) 456-7890</p>
      <p>Address: 123 Fitness Lane, Workout City, WC 56789</p>
    </div>
  </div>
);

const Home = ({ productList, loading, error, addToCart, setSearchQuery, searchQuery }) => (
  <div>
    <div className="hero">
      <h1>Welcome to Life Couture</h1>
      <p>Living that city life!</p>
    </div>

    {/* Filter Button Container */}
    <div className="filter-button-container">
      <Link to="/filter">
        <button className="filter-btn">Filter Products</button>
      </Link>
    </div>

    {/* Search Bar */}
    <div className="search-bar-container">
      <input
        type="text"
        className="search-bar"
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
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
);

export default App;
