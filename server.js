require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Fetch order line items
app.get('/api/order/:id', async (req, res) => {
  const orderId = req.params.id;
  const url = `https://${SHOPIFY_STORE}/admin/api/2023-07/graphql.json`;

  const query = {
    query: `
      query GetOrderProducts {
        order(id: "gid://shopify/Order/${orderId}") {
          id
          name
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                variant {
                  id
                  sku
                  product {
                    id
                    title
                  }
                }
              }
            }
          }
        }
      }
    `
  };

  try {
    const response = await axios.post(url, query, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    console.log(response.data);
    res.json(response.data.data.order);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

// Set product delivery info metafield
app.post('/api/order/:id/delivery-info', async (req, res) => {
  const orderId = req.params.id;
  const deliveryInfo = req.body.deliveryInfo;
  const url = `https://${SHOPIFY_STORE}/admin/api/2023-07/graphql.json`;

  const mutation = {
    query: `
      mutation SetOrderMetafield {
        metafieldsSet(metafields: [
          {
            ownerId: "gid://shopify/Order/${orderId}",
            namespace: "custom",
            key: "product_delivery_info",
            type: "json",
            value: """${JSON.stringify(deliveryInfo)}"""
          }
        ]) {
          metafields {
            id
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `
  };
  try {
    const response = await axios.post(url, mutation, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data.data.metafieldsSet);
  } catch (error) {
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});
app.get('/', (req, res) => {
  res.send("Welcome to Pavan's App");
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
