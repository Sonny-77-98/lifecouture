import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';

function About() {
  return (
    <div
      className="about-container"
      style={{
        backgroundImage: 'url(https://i.imgur.com/kTc1tSm.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundAttachment: 'fixed',
        height: '100vh',
        width: '100%',
        padding: '60px 20px',
        color: 'white',
        textAlign: 'center',
        margin: 0,
        overflowX: 'hidden',
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
