import React, { useEffect, useState } from "react";

function ProductFilter({ addToCart }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Categories state
  const [selectedCategory, setSelectedCategory] = useState(""); // Track selected category

  useEffect(() => {
    const fetchCategoriesAndProducts = async () => {
      try {
        // Fetch categories
        const categoriesRes = await fetch(`/api/categories`);
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);

        // Fetch products based on the selected category
        fetchProducts(selectedCategory); // Fetch products when category changes
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchCategoriesAndProducts();
  }, [selectedCategory]); // Re-fetch when selectedCategory changes

  const fetchProducts = async (categoryId) => {
    try {
      let productsRes;
      if (categoryId) {
        // Fetch products filtered by selected category
        productsRes = await fetch(`/api/products?category=${categoryId}&status=active`);
      } else {
        // Fetch all products
        productsRes = await fetch(`/api/products?status=active`);
      }

      const productsData = await productsRes.json();
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  return (
    <div className="container">
      <h2>Filter Products by Category</h2>

      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        style={{ padding: "10px", margin: "20px 0", fontSize: "16px" }}
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category.catID} value={category.catID}>
            {category.catName}
          </option>
        ))}
      </select>

      <div className="products">
        {products.length === 0 ? (
          <div>No products found for this category.</div>
        ) : (
          products.map((product) => (
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
}

export default ProductFilter;