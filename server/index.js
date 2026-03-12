const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateInvoicePDF } = require('./pdfGenerator');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;
const SECRET_KEY = 'billing-software-secret';

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(bodyParser.json());

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Initialize Database
db.initDb();

// Helper to map DB row to Frontend-friendly object
const mapInvoice = (row) => ({
    ...row,
    billNo: row.bill_no,
    billDate: row.bill_date,
    stateName: row.state_name,
    placeOfSupply: row.place_of_supply,
    sgstRate: row.sgst_rate,
    sgstAmount: parseFloat(row.sgst_amount),
    cgstRate: row.cgst_rate,
    cgstAmount: parseFloat(row.cgst_amount),
    totalAmount: parseFloat(row.total_amount),
    amountInWords: row.amount_in_words
});

const mapCompany = (row) => ({
    ...row,
    bank: row.bank_details,
    logo: row.logo || null
});

const mapItem = (row) => ({
    ...row,
    sacCode: row.sac_code,
    price: parseFloat(row.price),
    taxPercentage: parseFloat(row.tax_percentage || 0),
    type: row.type || 'Service'
});

// --- Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Auth Routes ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', username);

    try {
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '8h' });
            res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
        } else {
            res.status(400).json({ message: 'Invalid password' });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Admin-only Middleware ---
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// --- User Management Routes (Admin only) ---
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, role FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    const userRole = role === 'admin' ? 'admin' : 'user';
    try {
        const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, hashedPassword, userRole]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { username, password, role } = req.body;
    if (!username) {
        return res.status(400).json({ message: 'Username is required' });
    }
    const userRole = role === 'admin' ? 'admin' : 'user';
    try {
        const existing = await db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, id]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Username already taken' });
        }
        let result;
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            result = await db.query(
                'UPDATE users SET username = $1, password = $2, role = $3 WHERE id = $4 RETURNING id, username, role',
                [username, hashedPassword, userRole, id]
            );
        } else {
            result = await db.query(
                'UPDATE users SET username = $1, role = $2 WHERE id = $3 RETURNING id, username, role',
                [username, userRole, id]
            );
        }
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (req.user.id === id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    try {
        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Master Routes ---
app.get('/api/companies', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM companies');
        res.json(result.rows.map(mapCompany));
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.post('/api/companies', authenticateToken, async (req, res) => {
    const { name, address, gstin, phone, mobile, email, signatory, bank, logo } = req.body;
    try {
        const existing = await db.query('SELECT id FROM companies LIMIT 1');
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'A company already exists. Use update instead.' });
        }
        const result = await db.query(
            'INSERT INTO companies (name, address, gstin, phone, mobile, email, signatory, bank_details, logo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [name, address, gstin, phone, mobile, email, signatory, JSON.stringify(bank), logo || null]
        );
        res.status(201).json(mapCompany(result.rows[0]));
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.put('/api/companies/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const { name, address, gstin, phone, mobile, email, signatory, bank, logo } = req.body;
    try {
        const result = await db.query(
            'UPDATE companies SET name=$1, address=$2, gstin=$3, phone=$4, mobile=$5, email=$6, signatory=$7, bank_details=$8, logo=$9 WHERE id=$10 RETURNING *',
            [name, address, gstin, phone, mobile, email, signatory, JSON.stringify(bank), logo || null, id]
        );
        if (result.rows.length === 0) return res.status(404).send('Company not found');
        res.json(mapCompany(result.rows[0]));
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/api/customers', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM customers');
        res.json(result.rows);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.post('/api/customers', authenticateToken, async (req, res) => {
    const { name, address, gstin } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO customers (name, address, gstin) VALUES ($1, $2, $3) RETURNING *',
            [name, address, gstin]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.put('/api/customers/:id', authenticateToken, async (req, res) => {
    const { name, address, gstin } = req.body;
    const id = parseInt(req.params.id);
    try {
        const result = await db.query(
            'UPDATE customers SET name = $1, address = $2, gstin = $3 WHERE id = $4 RETURNING *',
            [name, address, gstin, id]
        );
        if (result.rows.length === 0) return res.status(404).send('Customer not found');
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.get('/api/items', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM items ORDER BY id ASC');
        res.json(result.rows.map(mapItem));
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.post('/api/items', authenticateToken, async (req, res) => {
    const { name, sacCode, price, description, taxPercentage, type } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO items (name, sac_code, price, description, tax_percentage, type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, sacCode, price, description, taxPercentage || 0, type || 'Service']
        );
        res.status(201).json(mapItem(result.rows[0]));
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.put('/api/items/:id', authenticateToken, async (req, res) => {
    const { name, sacCode, price, description, taxPercentage, type } = req.body;
    const id = parseInt(req.params.id);
    try {
        const result = await db.query(
            'UPDATE items SET name = $1, sac_code = $2, price = $3, description = $4, tax_percentage = $5, type = $6 WHERE id = $7 RETURNING *',
            [name, sacCode, price, description, taxPercentage || 0, type || 'Service', id]
        );
        if (result.rows.length === 0) return res.status(404).send('Item not found');
        res.json(mapItem(result.rows[0]));
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.delete('/api/items/:id', authenticateToken, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await db.query('DELETE FROM items WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).send('Item not found');
        res.json({ message: 'Item deleted' });
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// --- Invoice Routes ---
app.post('/api/invoices', authenticateToken, async (req, res) => {
    const { vendor, customer, billNo, billDate, stateName, placeOfSupply, items, sgstRate, sgstAmount, cgstRate, cgstAmount, totalAmount, amountInWords } = req.body;
    try {
        const result = await db.query(
            `INSERT INTO invoices (
                vendor_id, customer_id, bill_no, bill_date, state_name, place_of_supply, 
                items, sgst_rate, sgst_amount, cgst_rate, cgst_amount, total_amount, amount_in_words
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [
                vendor.id, customer.id, billNo, billDate, stateName, placeOfSupply, 
                JSON.stringify(items), sgstRate, sgstAmount, cgstRate, cgstAmount, totalAmount, amountInWords
            ]
        );
        // Return full invoice object matching frontend expectations
        const invoice = mapInvoice({ 
            ...result.rows[0], 
            vendor: mapCompany(vendor), 
            customer, 
            items 
        });
        res.status(201).json(invoice);
    } catch (err) {
        console.error('Invoice creation error:', err);
        res.status(500).send('Server error');
    }
});

app.get('/api/invoices', authenticateToken, async (req, res) => {
    try {
        // Query with joins to get vendor and customer info
        const result = await db.query(`
            SELECT i.*, 
                   to_jsonb(c) as vendor, 
                   to_jsonb(cust) as customer
            FROM invoices i
            JOIN companies c ON i.vendor_id = c.id
            JOIN customers cust ON i.customer_id = cust.id
            ORDER BY i.created_at DESC
        `);
        res.json(result.rows.map(row => mapInvoice({
            ...row,
            vendor: mapCompany(row.vendor)
        })));
    } catch (err) {
        console.error('Fetch invoices error:', err);
        res.status(500).send('Server error');
    }
});

app.get('/api/invoices/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT i.*, 
                   to_jsonb(c) as vendor, 
                   to_jsonb(cust) as customer
            FROM invoices i
            JOIN companies c ON i.vendor_id = c.id
            JOIN customers cust ON i.customer_id = cust.id
            WHERE i.id = $1
        `, [parseInt(req.params.id)]);
        
        if (result.rows.length === 0) return res.status(404).send('Invoice not found');
        
        res.json(mapInvoice({
            ...result.rows[0],
            vendor: mapCompany(result.rows[0].vendor)
        }));
    } catch (err) {
        console.error('Fetch invoice by ID error:', err);
        res.status(500).send('Server error');
    }
});

app.put('/api/invoices/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const { vendor, customer, billNo, billDate, stateName, placeOfSupply, items, sgstRate, sgstAmount, cgstRate, cgstAmount, totalAmount, amountInWords } = req.body;
    try {
        const result = await db.query(
            `UPDATE invoices SET
                vendor_id = $1, customer_id = $2, bill_no = $3, bill_date = $4, state_name = $5, place_of_supply = $6, 
                items = $7, sgst_rate = $8, sgst_amount = $9, cgst_rate = $10, cgst_amount = $11, total_amount = $12, amount_in_words = $13
             WHERE id = $14 RETURNING *`,
            [
                vendor.id, customer.id, billNo, billDate, stateName, placeOfSupply, 
                JSON.stringify(items), sgstRate, sgstAmount, cgstRate, cgstAmount, totalAmount, amountInWords, id
            ]
        );
        
        if (result.rows.length === 0) return res.status(404).send('Invoice not found');
        
        const invoice = mapInvoice({ 
            ...result.rows[0], 
            vendor: mapCompany(vendor), 
            customer, 
            items 
        });
        res.json(invoice);
    } catch (err) {
        console.error('Invoice update error:', err);
        res.status(500).send('Server error');
    }
});

app.delete('/api/invoices/:id', authenticateToken, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await db.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
        res.json({ message: 'Invoice deleted' });
    } catch (err) {
        console.error('Invoice delete error:', err);
        res.status(500).send('Server error');
    }
});

app.get('/api/invoices/:id/download', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT i.*, 
                   to_jsonb(c) as vendor, 
                   to_jsonb(cust) as customer
            FROM invoices i
            JOIN companies c ON i.vendor_id = c.id
            JOIN customers cust ON i.customer_id = cust.id
            WHERE i.id = $1
        `, [parseInt(req.params.id)]);
        
        const invoice = result.rows[0];
        if (!invoice) return res.status(404).send('Invoice not found');

        const formattedInvoice = mapInvoice({
            ...invoice,
            vendor: mapCompany(invoice.vendor),
            bank: invoice.vendor.bank_details
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${formattedInvoice.billNo}.pdf`);
        generateInvoicePDF(formattedInvoice, res);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
