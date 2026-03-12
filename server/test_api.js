const axios = require('axios');
async function test() {
  try {
    const loginRes = await axios.post('http://localhost:3000/api/login', { username: 'admin', password: 'admin' });
    const token = loginRes.data.token;
    console.log("Token obtained successfully.");

    const invRes = await axios.get('http://localhost:3000/api/invoices', { headers: { Authorization: `Bearer ${token}` } });
    console.log("Invoices count:", invRes.data.length);
    if (invRes.data.length > 0) {
      invRes.data.forEach((inv, idx) => {
        console.log(`Invoice ${idx}: id=${inv.id}, customer.name=${inv.customer?.name}, billNo=${inv.billNo}, totalAmount=${inv.totalAmount} (${typeof inv.totalAmount})`);
      });
    }
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
