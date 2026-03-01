require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
    host: process.env.DB_HOST,
      database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
          port: process.env.DB_PORT,
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
