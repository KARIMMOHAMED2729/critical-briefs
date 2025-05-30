const path = require('path');
const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const { addProductToExcel, categoryMap, downloadAndConvertExcel } = require('../services/excel.service');
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
    const uploadDir = path.join(__dirname, '../uploads/books');
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

// New API to list all products
async function listProducts(req, res) {
  try {
    const products = await downloadAndConvertExcel(process.env.GOOGLE_DRIVE_FILE_ID);
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error in listProducts:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// New API to update product details
async function updateProduct(req, res) {
  try {
    const { barcode } = req.params;
    const { product_name, product_quantity, product_category, product_description, product_price, price_cost } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, message: 'Missing product barcode' });
    }

    // Download current Excel file
    const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
    if (!fileId) {
      return res.status(500).json({ success: false, message: 'Missing Google Drive file ID' });
    }

    const client = await require('../config/drive').auth.getClient();
    const drive = require('googleapis').google.drive({ version: 'v3', auth: client });

    const resDrive = await drive.files.get({
      fileId,
      alt: 'media',
    }, { responseType: 'arraybuffer' });

    const buffer = Buffer.from(resDrive.data);
    const xlsx = require('xlsx');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let json = xlsx.utils.sheet_to_json(sheet);

    // Find product by barcode and update fields
    const productIndex = json.findIndex(p => p.products_id === barcode);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product_name !== undefined) json[productIndex].product_name = product_name;
    if (product_quantity !== undefined) json[productIndex].product_quantity = product_quantity;
    if (product_category !== undefined) json[productIndex].product_category = product_category;
    if (product_description !== undefined) json[productIndex].product_description = product_description;
    if (product_price !== undefined) json[productIndex].product_price = product_price;
    if (price_cost !== undefined) json[productIndex].price_cost = price_cost;

    // Convert JSON back to sheet
    const newSheet = xlsx.utils.json_to_sheet(json);
    workbook.Sheets[sheetName] = newSheet;

    // Write workbook to buffer
    const wbout = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Upload updated Excel file back to Google Drive
    await drive.files.update({
      fileId,
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: wbout
      }
    });

    // Update output.json by re-running downloadAndConvertExcel
    await downloadAndConvertExcel(fileId);

    res.json({ success: true, message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error in updateProduct:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// New API to replace product image
async function replaceProductImage(req, res) {
  try {
    const { barcode } = req.params;
    if (!barcode) {
      return res.status(400).json({ success: false, message: 'Missing product barcode' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    const uploadDir = path.join(__dirname, '../uploads/books');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filename = barcode + '.webp';
    const filepath = path.join(uploadDir, filename);

    // Compress and save image using sharp
    await sharp(req.file.buffer)
      .resize({ width: 800 }) // Resize width to max 800px, maintain aspect ratio
      .webp({ quality: 80 }) // Convert to webp with quality 80
      .toFile(filepath);

    res.json({ success: true, message: 'Product image replaced successfully' });
  } catch (error) {
    console.error('Error in replaceProductImage:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function deleteProduct(req, res) {
  const { barcode } = req.params;
  if (!barcode) {
    return res.status(400).json({ success: false, message: 'Missing product barcode' });
  }

  try {
    // Delete product image file if exists
    const uploadDir = path.join(__dirname, '../uploads/books');
    const imagePath = path.join(uploadDir, barcode + '.webp');
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Download current Excel file
    const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
    if (!fileId) {
      return res.status(500).json({ success: false, message: 'Missing Google Drive file ID' });
    }

    const client = await require('../config/drive').auth.getClient();
    const drive = require('googleapis').google.drive({ version: 'v3', auth: client });

    const resDrive = await drive.files.get({
      fileId,
      alt: 'media',
    }, { responseType: 'arraybuffer' });

    const buffer = Buffer.from(resDrive.data);
    const xlsx = require('xlsx');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let json = xlsx.utils.sheet_to_json(sheet);

    // Find product by barcode and remove it with flexible comparison
    const productIndex = json.findIndex(p => {
      if (!p.products_id) return false;
      return String(p.products_id).trim() === String(barcode).trim();
    });
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    json.splice(productIndex, 1);

    // Convert JSON back to sheet
    const newSheet = xlsx.utils.json_to_sheet(json);
    workbook.Sheets[sheetName] = newSheet;

    // Write workbook to buffer
    const wbout = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Upload updated Excel file back to Google Drive
    try {
      await drive.files.update({
        fileId,
        media: {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          body: Buffer.from(wbout)
        }
      });
    } catch (uploadError) {
      console.error('Error uploading updated Excel file:', uploadError);
      return res.status(500).json({ success: false, message: 'Error uploading updated Excel file' });
    }

    // Update output.json by re-running downloadAndConvertExcel
    try {
      await require('../services/excel.service').downloadAndConvertExcel(fileId);
    } catch (updateError) {
      console.error('Error updating output.json after Excel update:', updateError);
      return res.status(500).json({ success: false, message: 'Error updating output.json after Excel update' });
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
  upload,
  addProduct,
  listProducts,
  updateProduct,
  replaceProductImage,
  deleteProduct
};
