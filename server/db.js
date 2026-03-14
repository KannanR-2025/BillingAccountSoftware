const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER || 'kannanr',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '5432'),
    });

// For simplicity, we'll try to connect and create the 'billing_db' if it doesn't exist
// but for a first pass, let's just use a dedicated database name if it exists.
// To keep it robust, we'll use 'postgres' database and a schema or just use 'postgres' for all tables.

const initDb = async () => {
    try {
        // Create tables if they don't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user'
            );

            -- Ensure role column exists in case the table was created earlier
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

            CREATE TABLE IF NOT EXISTS companies (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                address TEXT,
                gstin TEXT,
                phone TEXT,
                mobile TEXT,
                email TEXT,
                signatory TEXT,
                bank_details JSONB,
                logo TEXT
            );

            ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo TEXT;
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS signature TEXT;
            ALTER TABLE companies ADD COLUMN IF NOT EXISTS smtp_config JSONB;

            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                address TEXT,
                gstin TEXT
            );

            ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;

            CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                sac_code TEXT,
                price NUMERIC,
                description TEXT,
                tax_percentage NUMERIC DEFAULT 0,
                type TEXT DEFAULT 'Service'
            );

            -- Ensure columns exist in case the table was created earlier
            ALTER TABLE items ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC DEFAULT 0;
            ALTER TABLE items ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Service';

            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                vendor_id INTEGER REFERENCES companies(id),
                customer_id INTEGER REFERENCES customers(id),
                bill_no TEXT NOT NULL,
                bill_date TEXT,
                state_name TEXT,
                place_of_supply TEXT,
                items JSONB,
                sgst_rate NUMERIC,
                sgst_amount NUMERIC,
                cgst_rate NUMERIC,
                cgst_amount NUMERIC,
                total_amount NUMERIC,
                amount_in_words TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert or fix default admin user
        const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
        if (adminCheck.rows.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin', 10);
            await pool.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', ['admin', hashedPassword, 'admin']);
        } else if (adminCheck.rows[0].role !== 'admin') {
            await pool.query('UPDATE users SET role = $1 WHERE username = $2', ['admin', 'admin']);
        }

        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Database initialization failed:', err);
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initDb
};
