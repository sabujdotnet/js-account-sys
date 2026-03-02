import axios from 'axios';

export const syncExpenses = async (db, reload) => {
  const unsynced = db.getAllSync(
    "SELECT * FROM expenses WHERE synced = 0;"
  );

  if (unsynced.length === 0) return;

  try {
    const response = await axios.post(
      "https://js-account-sys-2dvk.onrender.com/api/expenses/sync",
      { expenses: unsynced }
    );

    if (response.status === 200) {
      // Only mark specific IDs as synced
      for (const exp of unsynced) {
        db.runSync(
          "UPDATE expenses SET synced = 1 WHERE id = ?;",
          [exp.id]
        );
      }

      reload();
    }
  } catch (err) {
    console.log("Sync failed:", err.message);
  }
};
