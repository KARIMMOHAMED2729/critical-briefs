const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Route to add new product with image upload
router.post('/add-product', adminController.upload.single('image'), adminController.addProduct);

// Route to list all products
router.get('/products', adminController.listProducts);

// Route to update product details
router.patch('/products/:barcode', adminController.updateProduct);

// Route to replace product image
router.post('/products/:barcode/image', adminController.upload.single('image'), adminController.replaceProductImage);

// Route to delete product
router.delete('/products/:barcode', adminController.deleteProduct);

// Route to sync output.json to Excel and upload to Google Drive
router.post('/sync-json-to-excel', adminController.syncJsonToExcel);

// New route for batch update products
router.post('/products/batch-update', adminController.batchUpdateProducts);

// New route to update promotion start and end dates and update Excel/output.json
router.post('/update-promotion-dates', adminController.updatePromotionDates);

// New route to get current promotion dates
router.get('/promotion-dates', adminController.getPromotionDates);


module.exports = router;
