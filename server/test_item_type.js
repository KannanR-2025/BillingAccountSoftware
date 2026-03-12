const axios = require('axios');

async function testItemType() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/login', { username: 'admin', password: 'admin' });
    const token = loginRes.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    console.log("1. Adding a Good...");
    const goodData = {
      name: "Office Chair",
      sacCode: "9403",
      price: 5000,
      description: "Ergonomic chair",
      taxPercentage: 18,
      type: "Goods"
    };
    const resGood = await axios.post('http://localhost:3000/api/items', goodData, { headers });
    console.log(`Good created with ID ${resGood.data.id} and type: ${resGood.data.type}`);

    console.log("\n2. Adding a Service...");
    const serviceData = {
      name: "Consultation",
      sacCode: "9983",
      price: 2000,
      description: "Hourly consulting",
      taxPercentage: 18,
      type: "Service"
    };
    const resService = await axios.post('http://localhost:3000/api/items', serviceData, { headers });
    console.log(`Service created with ID ${resService.data.id} and type: ${resService.data.type}`);

    console.log("\n3. Fetching all items to verify persistence...");
    const resItems = await axios.get('http://localhost:3000/api/items', { headers });
    const verifyGood = resItems.data.find(i => i.id === resGood.data.id);
    const verifyService = resItems.data.find(i => i.id === resService.data.id);
    console.log(`Good type retrieved from DB: ${verifyGood.type}`);
    console.log(`Service type retrieved from DB: ${verifyService.type}`);

  } catch (e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}

testItemType();
