const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const query = (text, params) => pool.query(text, params);

const get = async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows[0];
};

const run = async (text, params) => {
    const res = await pool.query(text, params);
    return res;
};

module.exports = { query, get, run, pool }; 