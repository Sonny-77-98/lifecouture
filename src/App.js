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
import UserForm from './components/admin/UserForm';
import UserList from './components/admin/UserList';
import UserAddresses from './components/admin/UserAddresses';
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
        const API_URL = process.env.REACT_APP_API_URL || '';;
        
        const url = API_URL ? `${API_URL}/api/products` : '/api/products';

        console.log(`Fetching products from: ${url}`);

        const response = await fetch(url);
        
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
            
            {/* Product Management Routes */}
            <Route path="/admin/products" element={<PrivateRoute><ProductList /></PrivateRoute>} />
            <Route path="/admin/products/add" element={<PrivateRoute><ProductForm /></PrivateRoute>} />
            <Route path="/admin/products/edit/:id" element={<PrivateRoute><ProductForm /></PrivateRoute>} />
            
            {/* Category Management Routes */}
            <Route path="/admin/categories" element={<PrivateRoute><CategoryList /></PrivateRoute>} />
            <Route path="/admin/categories/add" element={<PrivateRoute><CategoryForm /></PrivateRoute>} />
            <Route path="/admin/categories/edit/:id" element={<PrivateRoute><CategoryForm /></PrivateRoute>} />
            
            {/* Inventory Management Route */}
            <Route path="/admin/inventory" element={<PrivateRoute><InventoryList /></PrivateRoute>} />

            {/*Variant Management Route*/}
            <Route path="/admin/variants" element={<PrivateRoute><VariantList /></PrivateRoute>} />
            <Route path="/admin/variants/add" element={<PrivateRoute><VariantForm /></PrivateRoute>} />
            <Route path="/admin/variants/edit/:id" element={<PrivateRoute><VariantForm /></PrivateRoute>} />
            
            {/* Order Management Routes  */}
            <Route path="/admin/orders" element={<PrivateRoute><OrderList /></PrivateRoute>} />
            <Route path="/admin/orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
            <Route path="/admin/orders/create" element={<PrivateRoute><OrderForm /></PrivateRoute>} />
            <Route path="/admin/orders/edit/:id" element={<PrivateRoute><OrderForm /></PrivateRoute>} />

            {/* User Management Routes */}
            <Route path="/admin/users" element={<PrivateRoute><UserList /></PrivateRoute>} />
            <Route path="/admin/users/edit/:id" element={<PrivateRoute><UserForm /></PrivateRoute>} />
            <Route path="/admin/users/create" element={<PrivateRoute><UserForm /></PrivateRoute>} />
            <Route path="/admin/users/:id/addresses" element={<PrivateRoute><UserAddresses /></PrivateRoute>} />

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
                onError={(e) => (e.target.src = "https://imgur.com/gallery/crumble-s-daily-picture-3wYunFD#/t/cat")}
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
