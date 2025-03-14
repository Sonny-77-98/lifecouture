import React, { useState, useEffect } from 'react';

const ProductDisplay = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        setProducts(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading products:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <h1 style={{ color: '#333' }}>LifeCouture Products</h1>
      
      {loading && <p>Loading products...</p>}
      
      {error && (
        <div style={{
          color: 'red',
          backgroundColor: '#ffeeee',
          padding: '10px',
          borderRadius: '5px',
          margin: '20px 0'
        }}>
          Failed to load products: {error}
        </div>
      )}
      
      {!loading && !error && products.length === 0 && (
        <p>No products found.</p>
      )}
      
      {!loading && !error && products.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '20px',
          marginTop: '20px'
        }}>
          {products.map((product, index) => (
            <div key={index} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '15px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginTop: 0, color: '#444' }}>
                {product.prodTitle || 'Unnamed Product'}
              </h3>
              <p>{product.prodDesc || 'No description available'}</p>
              <p>
                <strong>Status:</strong> {product.prodStat || 'Unknown'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductDisplay;