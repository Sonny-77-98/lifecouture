import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashBoard from './components/admin/DashBoard';
import ProductList from './components/admin/ProductList';
import ProductForm from './components/admin/ProductForm';
import CategoryList from './components/admin/CategoryList';
import CategoryForm from './components/admin/CategoryForm';
import AdminLayout from './components/admin/AdminLayout';
import Login from './components/Login';
import { AuthProvider } from './context/AuthContext';

const AdminApp = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout><DashBoard /></AdminLayout>} />
          <Route path="/admin/dashboard" element={<AdminLayout><DashBoard /></AdminLayout>} />
          <Route path="/admin/products" element={<AdminLayout><ProductList /></AdminLayout>} />
          <Route path="/admin/products/add" element={<AdminLayout><ProductForm /></AdminLayout>} />
          <Route path="/admin/products/edit/:id" element={<AdminLayout><ProductForm /></AdminLayout>} />
          <Route path="/admin/categories" element={<AdminLayout><CategoryList /></AdminLayout>} />
          <Route path="/admin/categories/add" element={<AdminLayout><CategoryForm /></AdminLayout>} />
          <Route path="/admin/categories/edit/:id" element={<AdminLayout><CategoryForm /></AdminLayout>} />
          <Route path="/admin/inventory" element={<PrivateRoute><InventoryList /></PrivateRoute>
} />
          <Route path="*" element={<Navigate to="/admin/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('admin-app'));
root.render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
);