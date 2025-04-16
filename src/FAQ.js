import React, { useState } from 'react';
import './FAQ.css';

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const faqData = [
    {
      question: "What is Life Couture?",
      answer: "Life Couture is a retail website offering trendy streetwear, including T-shirts, joggers, shorts, and accessories, designed to cater to fashion-forward customers."
    },
    {
      question: "How do I place an order?",
      answer: "Browse our collections, select your preferred items, and click 'Add to Cart'. Once you’re ready, proceed to checkout and fill in your details to complete the order."
    },
    {
      question: "Can I return items?",
      answer: "Yes, we offer a return policy within 30 days of purchase. Please check our Returns & Exchanges page for more details."
    },
    {
      question: "Do you ship internationally?",
      answer: "Currently, we offer shipping within the United States. We're working on expanding to international markets soon!"
    },
    {
      question: "How do I contact customer support?",
      answer: "If you have any questions, please reach out via email at support@lifecouture.com or call us at (123) 456-7890."
    },
    {
      question: "How do I request an exchange?",
      answer: "If you're not satisfied with your purchase, we offer exchanges for items within 30 days of purchase."
    },
    {
      question: "Can I exchange an item for a different size or color?",
      answer: "Yes, we allow exchanges for different sizes or colors of the same item, subject to availability. Please contact customer support to initiate the exchange process."
    },
    {
      question: "What if the item I want to exchange is out of stock?",
      answer: "If the item you wish to exchange is out of stock, you will have the option to choose another item, or you can opt for a store credit or a refund, depending on your preference."
    },
    {
      question: "Are there any fees for exchanges?",
      answer: "Exchanges are free of charge, but you will need to cover the cost of return shipping unless the item is defective or damaged."
    }
  ];

  const filteredFaq = faqData.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="faq-container">
      <h2 className="faq-header">Frequently Asked Questions</h2>

      {/* Search Bar */}
      <div className="faq-search-bar-container">
        <input
          type="text"
          className="faq-search-bar"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* FAQ Items */}
      {filteredFaq.map((faq, index) => (
        <div key={index} className="faq-item">
          <h3>{faq.question}</h3>
          <p>{faq.answer}</p>
        </div>
      ))}
    </div>
  );
};

export default FAQ;
