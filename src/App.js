import React from 'react';
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

// Storefront components
import Cart from "./Cart";
import Checkout from "./Checkout";
import About from "./About";
import Contact from "./Contact";

// Styles
import './style/App.css';
import './style/DashBoard.css';
import './style/ProductList.css';
import './style/ProductForm.css';
import './style/CategoryList.css';
import './style/CategoryForm.css';
import './style/InventoryList.css';

function App() {
  const [productList, setProductList] = React.useState([]);
  const [cart, setCart] = React.useState(() => JSON.parse(localStorage.getItem("cart")) || []);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

React.useEffect(() => {
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.admin === 'front-end-admin' 
        ? 'http://localhost:3000'
        : '';
        
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

  // Determine if we're in the admin section
  const isAdminRoute = window.location.pathname.startsWith('/admin') || window.location.pathname === '/login';

  return (
    <AuthProvider>
      <Router>
        {!isAdminRoute && (
          <div className="navbar">
            <div className="logo">Life Couture</div>
            <div className="nav-links">
              <Link to="/">Home</Link>
              <Link to="/cart">Cart ({cart.length})</Link>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/admin">Admin</Link>
            </div>
          </div>
        )}

        <div className={isAdminRoute ? "app" : "container"}>
          <Routes>
            {/* Admin Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
            <Route path="/admin/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/admin/products" element={
              <PrivateRoute>
                <ProductList />
              </PrivateRoute>
            } />
            <Route path="/admin/products/add" element={
              <PrivateRoute>
                <ProductForm />
              </PrivateRoute>
            } />
            <Route path="/admin/products/edit/:id" element={
              <PrivateRoute>
                <ProductForm />
              </PrivateRoute>
            } />
            <Route path="/admin/categories" element={
              <PrivateRoute>
                <CategoryList />
              </PrivateRoute>
            } />
            <Route path="/admin/categories/add" element={
              <PrivateRoute>
                <CategoryForm />
              </PrivateRoute>
            } />
            <Route path="/admin/categories/edit/:id" element={
              <PrivateRoute>
                <CategoryForm />
              </PrivateRoute>
            } />
            <Route path="/admin/inventory" element={
              <PrivateRoute>
                <InventoryList />
              </PrivateRoute>
            } />

            {/* Storefront Routes */}
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

          {!isAdminRoute && (
            <div className="footer">
              <p>&copy; 2025 Life Couture. All rights reserved.</p>
            </div>
          )}
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;