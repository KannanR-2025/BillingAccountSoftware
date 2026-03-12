const axios = require('axios');

async function testItems() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:3000/api/login', { username: 'admin', password: 'admin' });
    const token = loginRes.data.token;
    console.log("Token obtained successfully.");

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Add an Item
    const newItem = {
      name: 'Consulting Services VIP',
      sacCode: 'SAC9983',
      price: 5000,
      taxPercentage: 18,
      description: 'General business consulting and strategy.'
    };
    
    console.log("Adding new item...");
    const addRes = await axios.post('http://localhost:3000/api/items', newItem, { headers });
    console.log("Added Item:", addRes.data);
    
    const itemId = addRes.data.id;

    // 3. Update the Item
    const updateItem = {
      ...newItem,
      price: 6000,
      taxPercentage: 12,
      description: 'Updated general business consulting and strategy.'
    };
    
    console.log(`\nUpdating item ${itemId}...`);
    const updateRes = await axios.put(`http://localhost:3000/api/items/${itemId}`, updateItem, { headers });
    console.log("Updated Item:", updateRes.data);

    // 4. Fetch all Items
    console.log("\nFetching all items...");
    const getRes = await axios.get('http://localhost:3000/api/items', { headers });
    console.log(`Total Items: ${getRes.data.length}`);
    console.log("Latest Item in List:", getRes.data[getRes.data.length - 1]);

  } catch (e) {
    console.error("Error Response:", e.response ? e.response.data : e.message);
  }
}

testItems();
