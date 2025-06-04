const express = require('express');
const router = express.Router();
const pdfOcrController = require('../controllers/pdf-ocr.controller');

router.post('/upload', pdfOcrController.uploadAndProcessPdf);
router.get('/book-names', pdfOcrController.getBookNames);

module.exports = router;
