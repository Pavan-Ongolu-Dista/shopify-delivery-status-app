import React, { useState } from "react";
import axios from "axios";
import {
  AppProvider,
  Page,
  Card,
  TextField,
  Button,
  DataTable,
  Select,
  DatePicker,
  Spinner,
  Banner,
} from "@shopify/polaris";

const statusOptions = [
  { label: "Pending", value: "Pending" },
  { label: "Packed", value: "Packed" },
  { label: "Shipped", value: "Shipped" },
  { label: "Delivered", value: "Delivered" },
];

function App() {
  const [orderId, setOrderId] = useState("");
  const [products, setProducts] = useState([]);
  const [deliveryInfo, setDeliveryInfo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchOrder = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await axios.get(`process.env.REACT_APP_API_URL/api/order/${orderId}`);
      const items = res.data.lineItems.edges.map((edge) => edge.node);
      setProducts(items);
      setDeliveryInfo(
        items.map((item) => ({
          product_title: item.title,
          delivery_date: "",
          status: "",
        }))
      );
    } catch (err) {
      setError("Order not found or server error.");
      setProducts([]);
      setDeliveryInfo([]);
    }
    setLoading(false);
  };

  const handleChange = (index, field, value) => {
    const updated = [...deliveryInfo];
    updated[index][field] = value;
    setDeliveryInfo(updated);
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setError("");
    setSuccess("");
    try {
      await axios.post(
        `process.env.REACT_APP_API_URL/api/order/${orderId}/delivery-info`,
        { deliveryInfo }
      );
      setSuccess("Delivery info saved successfully!");
    } catch (err) {
      setError("Failed to save delivery info.");
    }
    setSaveLoading(false);
  };

  return (
    <AppProvider>
      <Page title="Order Product Delivery Manager">
        <Card sectioned>
          <TextField
            label="Order ID"
            value={orderId}
            onChange={setOrderId}
            placeholder="Enter Shopify Order ID"
            autoComplete="off"
          />
          <Button onClick={fetchOrder} primary disabled={!orderId || loading}>
            {loading ? <Spinner size="small" /> : "Fetch Order"}
          </Button>
        </Card>
        {error && (
          <Banner status="critical" title="Error">
            {error}
          </Banner>
        )}
        {success && (
          <Banner status="success" title="Success">
            {success}
          </Banner>
        )}
        {products.length > 0 && (
          <Card title="Products in Order" sectioned>
            <DataTable
              columnContentTypes={["text", "text", "text"]}
              headings={["Product", "Status", "Delivery Date"]}
              rows={products.map((product, idx) => [
                product.title,
                <Select
                  options={statusOptions}
                  value={deliveryInfo[idx]?.status || ""}
                  onChange={(value) =>
                    handleChange(idx, "status", value)
                  }
                />,
                <TextField
                  type="date"
                  value={deliveryInfo[idx]?.delivery_date || ""}
                  onChange={(value) =>
                    handleChange(idx, "delivery_date", value)
                  }
                />,
              ])}
            />
            <Button
              onClick={handleSave}
              primary
              loading={saveLoading}
              style={{ marginTop: 20 }}
            >
              Save Delivery Info
            </Button>
          </Card>
        )}
      </Page>
    </AppProvider>
  );
}

export default App;
