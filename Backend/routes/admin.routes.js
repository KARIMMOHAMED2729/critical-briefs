const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Route to add new product with image upload
router.post('/add-product', adminController.upload.single('image'), adminController.addProduct);

module.exports = router;
