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


module.exports = router;
