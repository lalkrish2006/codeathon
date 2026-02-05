const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function run() {
    try {
        console.log("=== STARTING VERIFICATION ===");

        
        let sellerToken;
        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                name: "Test Seller",
                email: "seller_test@example.com",
                password: "password123",
                role: "seller"
            });
            sellerToken = res.data.token;
        } catch (e) {
            
             const res = await axios.post(`${API_URL}/auth/login`, {
                email: "seller_test@example.com",
                password: "password123"
            });
            sellerToken = res.data.token;
        }
        console.log("[PASS] Seller Authenticated");

        
        const productRes = await axios.post(`${API_URL}/products`, {
            name: "EpiPen LifeSaver",
            base_description: "Medical grade epinephrine auto-injector for anaphylactic shock.",
            price: 150,
            stock_quantity: 10
        }, { headers: { Authorization: `Bearer ${sellerToken}` } });
        
        const productId = productRes.data._id;
        console.log(`[PASS] Product Created: ${productRes.data.name} (${productId})`);

        
        let customerToken;
        try {
            const res = await axios.post(`${API_URL}/auth/register`, {
                name: "Test Customer",
                email: "customer_test@example.com",
                password: "password123",
                role: "customer"
            });
            customerToken = res.data.token;
        } catch (e) {
             const res = await axios.post(`${API_URL}/auth/login`, {
                email: "customer_test@example.com",
                password: "password123"
            });
            customerToken = res.data.token;
        }
        console.log(`[PASS] Customer Authenticated. Token: ${customerToken ? customerToken.substring(0, 10) + '...' : 'INVALID'}`);

        
        const context = "My son is having a severe allergic reaction right now.";
        console.log("Placing order with Product ID:", productId);
        
        const orderRes = await axios.post(`${API_URL}/orders`, {
            product_id: productId,
            quantity: 1,
            customer_context: context
        }, { headers: { Authorization: `Bearer ${customerToken}` } });

        console.log(`[PASS] Order Placed. ID: ${orderRes.data._id}`);
        console.log(`[INFO] Combined Description Sent to AI: \n   "${orderRes.data.description}"`);
        console.log(`[INFO] AI Priority: ${orderRes.data.ai_priority}`);

        
        if (orderRes.data.description.includes("Medical grade epinephrine") && orderRes.data.description.includes(context)) {
            console.log("[SUCCESS] Description correctly combines Product Base + Customer Context");
        } else {
            console.error("[FAIL] Description NOT combined correctly");
        }

    } catch (err) {
        console.error("VERIFICATION FAILED:", err.response ? err.response.data : err.message);
    }
}

run();
