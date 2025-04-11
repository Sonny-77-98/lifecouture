import React, { useEffect, useState } from "react";

function ProductFilter({ addToCart }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // Categories state
  const [selectedCategory, setSelectedCategory] = useState(""); // Track selected category

  useEffect(() => {
    const fetchCategoriesAndProducts = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

        // Fetch categories
        const categoriesRes = await fetch(`${API_URL}/api/categories`);
        const categoriesData = await categoriesRes.json();
        console.log("Fetched Categories:", categoriesData); // Log the fetched categories
        setCategories(categoriesData);

        // Fetch products
        const productsRes = await fetch(`${API_URL}/api/products`);
        const productsData = await productsRes.json();
        console.log("Fetched Products:", productsData); // Log the fetched products
        setProducts(productsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchCategoriesAndProducts();
  }, []);

  // Filter products based on selected category
  const filteredProducts = selectedCategory
    ? products.filter((product) => product.category === selectedCategory)
    : products;

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
        {filteredProducts.length === 0 ? (
          <div>No products found for this category.</div> // Show message if no products match the selected category
        ) : (
          filteredProducts.map((product) => (
            <div className="product-card" key={product.prodID}>
              <div className="product-image">
                <img src={product.prodURL} alt={product.prodTitle} />
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
}

export default ProductFilter;
