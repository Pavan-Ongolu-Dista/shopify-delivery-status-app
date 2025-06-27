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

const SHOPIFY_API_KEY = '8099114a5a7b5072e3c5d32936c90709';
const SHOPIFY_API_SECRET = 'f56717b847bda7546c494c9e873d08a5'; // Needed for callback token exchange later
const SCOPES = 'read_products,write_script_tags';
const REDIRECT_URI = 'https://shopify-delivery-status-app.onrender.com/auth/callback';

router.get("/auth/callback", async (req) => {
  console.log("reached /auth/callback route")
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams);
  const { shop, code, hmac } = params;

  if (!shop || !code || !hmac) {
    return new Response("Missing parameters", { status: 400 });
  }

  // 1. OPTIONAL: Validate HMAC (for security). Skipped here for brevity.
  // See: https://shopify.dev/docs/apps/auth/get-access-tokens/authorization-code#step-3-validate-the-hmac

  // 2. Exchange code for access token
  const tokenUrl = `https://${shop}/admin/oauth/access_token`;

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return new Response("Failed to get access token", { status: 500 });
  }

  const tokenData = await tokenRes.json(); // contains access_token and scope

  // Save access_token somewhere — in Cloudflare KV, Durable Objects, or log it for now
  console.log("🔑 Access Token:", tokenData.access_token);

  return new Response("✅ App installed! You may close this tab.");
});


// === Shopify OAuth Step 1: Redirect to Shopify's OAuth page ===
router.get('/', (req) => {
  console.log("Reached app root");
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return new Response('Missing ?shop= parameter', { status: 400 });
  }

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=123456&grant_options[]=per-user`;

  return Response.redirect(installUrl, 302);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
