
import React, { useEffect, useState } from 'react';
import { View, Text, Button, TextInput, FlatList } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { syncExpenses } from './services/sync';

const db = SQLite.openDatabaseSync('app.db');

export default function App() {
  const [amount, setAmount] = useState('');
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount TEXT,
        created_at TEXT,
        synced INTEGER DEFAULT 0
      );
    `);
    loadExpenses();
  }, []);

  const loadExpenses = () => {
    const result = db.getAllSync("SELECT * FROM expenses ORDER BY id DESC;");
    setExpenses(result);
  };

  const addExpense = () => {
    db.runSync(
      "INSERT INTO expenses (amount, created_at, synced) VALUES (?, datetime('now'), 0);",
      [amount]
    );
    setAmount('');
    loadExpenses();
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Add Expense</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount"
        style={{ borderWidth: 1, marginBottom: 10 }}
      />
      <Button title="Add" onPress={addExpense} />
      <Button title="Sync" onPress={() => syncExpenses(db, loadExpenses)} />
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text>{item.amount} - Synced: {item.synced}</Text>
        )}
      />
    </View>
  );
}
