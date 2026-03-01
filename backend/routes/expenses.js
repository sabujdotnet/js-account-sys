
const express = require('express');
const router = express.Router();
const { syncExpenses } = require('../controllers/expensesController');

router.post('/sync', syncExpenses);

module.exports = router;
