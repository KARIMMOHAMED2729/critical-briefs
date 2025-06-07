const express = require('express');
const router = express.Router();
const { getExcelData } = require('../controllers/books.controller');

// مسارات الكتب
router.get('/get-excel-data', getExcelData);

module.exports = router;
