const axios = require('axios');

async function testInvoices() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:3000/api/login', { username: 'admin', password: 'admin' });
    const token = loginRes.data.token;
    console.log("1. Token obtained successfully.");

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Fetch dependencies
    const [companiesRes, customersRes, itemsRes] = await Promise.all([
        axios.get('http://localhost:3000/api/companies', { headers }),
        axios.get('http://localhost:3000/api/customers', { headers }),
        axios.get('http://localhost:3000/api/items', { headers })
    ]);
    
    const company = companiesRes.data[0];
    const customer = customersRes.data[0];
    const item1 = itemsRes.data[0];
    const item2 = itemsRes.data[1];
    
    if (!company || !customer || !item1) {
        console.log("Missing master data. Please add at least 1 company, 1 customer, and 1 item first.");
        return;
    }

    console.log("2. Master Data Fetched");

    // 3. Create Invoice
    const invoiceData = {
      vendor: company,
      customer: customer,
      billNo: "INV-TEST-001",
      billDate: "30/10/2023",
      stateName: "Test State",
      placeOfSupply: "Test City",
      items: [
          { description: item1.name, sacCode: item1.sacCode, amount: item1.price, quantity: 2, taxPercentage: item1.taxPercentage }
      ],
      sgstRate: 9,
      sgstAmount: (item1.price * 2) * 0.09,
      cgstRate: 9,
      cgstAmount: (item1.price * 2) * 0.09,
      totalAmount: (item1.price * 2) * 1.18,
      amountInWords: "Test Amount Only",
      bank: company.bank
    };

    console.log("\n3. Creating Invoice...");
    const createRes = await axios.post('http://localhost:3000/api/invoices', invoiceData, { headers });
    const createdInvoice = createRes.data;
    console.log(`Created Invoice ID: ${createdInvoice.id}, Total: ${createdInvoice.totalAmount}`);

    // 4. Fetch Invoice by ID
    console.log(`\n4. Fetching Invoice ${createdInvoice.id}...`);
    const getRes = await axios.get(`http://localhost:3000/api/invoices/${createdInvoice.id}`, { headers });
    console.log(`Fetched Invoice Items Count: ${getRes.data.items.length}`);

    // 5. Update Invoice (Add Item)
    const updateData = {
        ...getRes.data,
        billNo: "INV-TEST-001-REV",
        items: [
            ...getRes.data.items,
            item2 ? { description: item2.name, sacCode: item2.sacCode, amount: item2.price, quantity: 1, taxPercentage: item2.taxPercentage } 
                  : { description: "Fallback Item", sacCode: "0000", amount: 100, quantity: 1, taxPercentage: 0 }
        ],
        totalAmount: 9999 // Setting arbitrary to verify it saves
    };

    console.log(`\n5. Updating Invoice ${createdInvoice.id} to add an item...`);
    const updateRes = await axios.put(`http://localhost:3000/api/invoices/${createdInvoice.id}`, updateData, { headers });
    console.log(`Updated Invoice Bill No: ${updateRes.data.billNo}, New Items Count: ${updateRes.data.items.length}`);

  } catch (e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}

testInvoices();
