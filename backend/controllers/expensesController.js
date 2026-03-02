const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

exports.syncExpenses = async (req, res) => {
  const { expenses } = req.body;

  try {
    for (const exp of expenses) {
      await pool.query(
        'INSERT INTO expenses(amount, created_at) VALUES($1, $2)',
        [exp.amount, exp.created_at]
      );
    }

    res.json({ message: 'Synced successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sync failed' });
  }
};
