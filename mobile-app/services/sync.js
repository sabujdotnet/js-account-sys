
import axios from 'axios';

export const syncExpenses = async (db, reload) => {
  const unsynced = db.getAllSync("SELECT * FROM expenses WHERE synced = 0;");

  if (unsynced.length === 0) return;

  try {
    await axios.post("https://js-account-sys-2dvk.onrender.com/api/expenses/sync", {
      expenses: unsynced
    });

    db.runSync("UPDATE expenses SET synced = 1 WHERE synced = 0;");
    reload();
  } catch (err) {
    console.log("Sync failed:", err.message);
  }
};
