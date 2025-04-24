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
import ProductFilter from './ProductFilter';
import FAQ from './FAQ';

// Storefront components
import Cart from './Cart';
import Checkout from './Checkout';
import About from './About';

//Breadcrumb component
import Breadcrumb from './components/Breadcrumb';

// Styles
import './style/App.css';

function App() {
  const [productList, setProductList] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart')) || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        const response = await fetch('/api/products');
  
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }
  
        const data = await response.json();
        setProductList(data);
      } catch (error) {
        setError(error.message);
        console.error('Product fetch error details:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart((prevCart) => [...prevCart, product]);
  };

  const isAdminRoute = window.location.pathname.startsWith('/Admin') || window.location.pathname === '/Login';

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
              <Link to="/Cart">Cart ({cart.length})</Link>
              <Link to="/About">About</Link>
              <Link to="/Admin">Admin</Link>
            </div>
          </div>
        )}

        <div className={isAdminRoute ? 'app' : 'container'}>
          {!isAdminRoute && <Breadcrumb />}

          <Routes>
            {/* Keep routes using capital letters to maintain consistency */}
            <Route path="/Login" element={<Login />} />
            <Route path="/Admin" element={<Navigate to="/Admin/Dashboard" />} />
            <Route path="/Admin/Dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/Admin/Products" element={<PrivateRoute><ProductList /></PrivateRoute>} />
            <Route path="/Admin/Products/Add" element={<PrivateRoute><ProductForm /></PrivateRoute>} />
            <Route path="/Admin/Products/Edit/:id" element={<PrivateRoute><ProductForm /></PrivateRoute>} />
            <Route path="/Admin/Categories" element={<PrivateRoute><CategoryList /></PrivateRoute>} />
            <Route path="/Admin/Categories/Add" element={<PrivateRoute><CategoryForm /></PrivateRoute>} />
            <Route path="/Admin/Categories/Edit/:id" element={<PrivateRoute><CategoryForm /></PrivateRoute>} />
            <Route path="/Admin/Inventory" element={<PrivateRoute><InventoryList /></PrivateRoute>} />
            
            {/* Add missing Order routes */}
            <Route path="/Admin/Orders" element={<PrivateRoute><OrderList /></PrivateRoute>} />
            <Route path="/Admin/Orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
            <Route path="/Admin/Orders/Edit/:id" element={<PrivateRoute><OrderForm /></PrivateRoute>} />
            <Route path="/Admin/Orders/Create" element={<PrivateRoute><OrderForm /></PrivateRoute>} />
            
            {/* Add missing Variant routes */}
            <Route path="/Admin/Variants" element={<PrivateRoute><VariantList /></PrivateRoute>} />
            <Route path="/Admin/Variants/Add" element={<PrivateRoute><VariantForm /></PrivateRoute>} />
            <Route path="/Admin/Variants/Edit/:id" element={<PrivateRoute><VariantForm /></PrivateRoute>} />
            
            {/* Add missing User routes */}
            <Route path="/Admin/Users" element={<PrivateRoute><UserList /></PrivateRoute>} />
            <Route path="/Admin/Users/Create" element={<PrivateRoute><UserForm /></PrivateRoute>} />
            <Route path="/Admin/Users/Edit/:id" element={<PrivateRoute><UserForm /></PrivateRoute>} />
            <Route path="/Admin/Users/:userId/Addresses" element={<PrivateRoute><UserAddresses /></PrivateRoute>} />
            
            {/* Storefront routes */}
            <Route path="/" element={
              <Home
                productList={filteredProducts}
                loading={loading}
                error={error}
                addToCart={addToCart}
                setSearchQuery={setSearchQuery}
                searchQuery={searchQuery}
              />
            } />
            <Route path="/Cart" element={<Cart cart={cart} setCart={setCart} />} />
            <Route path="/Checkout" element={<Checkout cart={cart} setCart={setCart} />} />
            <Route path="/About" element={<About />} />
            <Route path="/ProductFilter" element={<ProductFilter addToCart={addToCart} />} />
            <Route path="/FAQ" element={<FAQ />} />
          </Routes>
        </div>

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

    <div className="filter-button-container">
      <Link to="/ProductFilter">
        <button className="filter-btn">Filter Products</button>
      </Link>
    </div>

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
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/200?text=No+Image";
                }}
              />
            </div>
            <div className="product-title">{product.prodTitle}</div>
            <div className="product-desc">{product.prodDesc}</div>
            <button onClick={() => addToCart(product)}>Add to Cart</button>
          </div>
        ))
      )}
    </div>
  </div>
);

export default App;