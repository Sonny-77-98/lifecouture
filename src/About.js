import React from 'react';
import './About.css'; // Keep the import for the About.css file

function About() {
  return (
    <div
      className="about-container"
      style={{
        backgroundImage: 'url(https://i.imgur.com/kTc1tSm.jpeg)', // Your background image URL
        backgroundSize: 'cover', // Ensure the image covers the entire screen
        backgroundPosition: 'center center', // Center the image
        backgroundAttachment: 'fixed', // Keep the background fixed
        height: '100vh', // Ensure the div takes the full viewport height
        width: '100%', // Ensure the div takes the full viewport width
        padding: '60px 20px',
        color: 'white',
        textAlign: 'center',
        margin: 0, // Remove any margin that could cause white space
        overflowX: 'hidden', // Prevent horizontal scroll
        boxSizing: 'border-box',
      }}
    >
      <div className="about-content">
        <h2 className="about-header">About Life Couture</h2>
        <p>
          Life Couture is a retail website specializing in stylish, trendy streetwear.
          Designed to cater to fashion-forward customers, the site offers a curated selection of clothing items, including T-shirts, joggers, shorts, beanies, and socks.
          Life Couture’s intuitive interface and seamless shopping experience make it easy for customers to browse, select, and purchase their favorite streetwear pieces.
          With a focus on quality and style, Life Couture is set to become a go-to online destination for streetwear enthusiasts looking for the latest comfortable and fashionable apparel.
        </p>
        <p>
          <strong>All for your casual yet stylish needs!</strong>
        </p>
      </div>
    </div>
  );
}

export default About;
