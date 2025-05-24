const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { addProductToExcel, categoryMap } = require('../services/excel.service');
const { generateSitemap } = require('../services/sitemap.service');

// Helper function to generate random barcode string
function generateRandomBarcode(length = 12) {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 }, // 1 MB
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

async function addProduct(req, res) {
  try {
    // Generate barcode if not present
    if (!req.generatedBarcode) {
      req.generatedBarcode = generateRandomBarcode();
    }
    const barcode = req.generatedBarcode;
    const { product_name, product_quantity, product_category, product_description, product_price, price_cost } = req.body;
    if (!product_name || !product_quantity || !product_category) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    // Compress and save image using sharp
    const filename = barcode + '.webp';
    const uploadDir = path.join(__dirname, '../../Backend/dist/browser/books');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filepath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize({ width: 800 }) // Resize width to max 800px, maintain aspect ratio
      .webp({ quality: 80 }) // Convert to webp with quality 80
      .toFile(filepath);

    // Determine category prefix based on categoryMap keys
    let categoryPrefix = '';
    if (categoryMap.hasOwnProperty(product_category)) {
      if (product_category === 'رواية') {
        categoryPrefix = 'رواية-';
      } else if (product_category === 'تنمية') {
        categoryPrefix = 'تنمية-';
      } else if (product_category === 'ديني') {
        categoryPrefix = 'ديني-';
      } else if (product_category === 'قاموس') {
        categoryPrefix = 'قاموس-';
      } else if (product_category === 'صحة') {
        categoryPrefix = 'صحة-';
      } else if (product_category === 'اعمال') {
        categoryPrefix = 'اعمال-';
      } else if (product_category === 'فن') {
        categoryPrefix = 'فن-';
      } else if (product_category === 'تاريخ') {
        categoryPrefix = 'تاريخ-';
      } else if (product_category === 'تربية') {
        categoryPrefix = 'تربية-';
      }
    }

    // Prepare product data
    const productData = {
      barcode,
      product_name,
      product_quantity: parseInt(product_quantity, 10),
      product_category,
      product_description,
      categoryPrefix,
      product_price: parseFloat(product_price) || 0,
      price_cost: parseFloat(price_cost) || 0
    };

    // Call service to add product to Excel
    await addProductToExcel(productData);

    // Update sitemap.xml after product addition
    await generateSitemap();

    res.json({ success: true, message: 'Product added successfully', barcode });
  } catch (error) {
    console.error('Error in addProduct:', error);
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Image file size exceeds 1 MB limit' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  upload,
  addProduct
};
