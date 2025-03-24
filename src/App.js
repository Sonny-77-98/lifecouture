import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Dashboard from './components/admin/Dashboard';
import ProductList from './components/admin/ProductList';
import ProductForm from './components/admin/ProductForm';
import CategoryList from './components/admin/CategoryList';
import CategoryForm from './components/admin/CategoryForm';


import './style/App.css';
import './style/Dashboard.css';
import './style/ProductList.css';
import './style/ProductForm.css';
import './style/CategoryList.css';
import './style/CategoryForm.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/admin/dashboard" />} />
            
            {/* Protected Admin Routes */}
            <Route path="/admin/dashboard" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            {/* Product Management Routes */}
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
            
            {/* Category Management Routes */}
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
            
            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/admin/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;