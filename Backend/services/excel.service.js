const { google } = require('googleapis');
const xlsx = require('xlsx');
const fs = require('fs');
const { auth } = require('../config/drive');

// تصنيفات الكتب
const categoryMap = {
  'رواية': 'روايات وقصص',
  'تنمية': 'تطوير الذات وعلم النفس',
  'ديني': 'كتب دينية',
  'قاموس': 'قواميس ومراجع',
  'صحة': 'صحة وطب وعلوم',
  'اعمال': 'أعمال وتسويق ومالية',
  'فن': 'فنون وحرف',
  'تاريخ': 'تاريخ وسير ذاتية',
  'تربية': 'تربية وأطفال'
};

function roundUpToNearestFive(num) {
  return Math.ceil(num / 5) * 5;
}

const manualPromotionStartDate = '2025-05-11'; // Add manual promotion start date here
const manualPromotionEndDate = '2025-06-10'; // Add manual promotion end date here

async function downloadAndConvertExcel(fileId, promotionStartDateStr, promotionEndDateStr) {
  const client = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: client });

  const res = await drive.files.get({
    fileId,
    alt: 'media',
  }, { responseType: 'arraybuffer' });

  const buffer = Buffer.from(res.data);
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  let json = xlsx.utils.sheet_to_json(sheet);

  // Use manualPromotionStartDate and manualPromotionEndDate if no parameters provided
  let promotionStartDate = promotionStartDateStr ? new Date(promotionStartDateStr) : new Date(manualPromotionStartDate);
  let promoEndDate = promotionEndDateStr ? new Date(promotionEndDateStr) : new Date(manualPromotionEndDate);

  // Filter out products with product_quantity less than 0
  const filteredJson = json.filter(product => {
    return !(product.product_quantity < 0);
  });

  const updatedData = filteredJson.map(product => {
    const product_id = product.products_id;
    let name = product.product_name || '';
    let categoryKey = name.split('-')[0].trim();
    const category = categoryMap[categoryKey] || 'غير مصنف';
    product.product_category = category;

    if (name.includes('-')) {
      product.product_name = name.split('-').slice(1).join('-').trim();
    }

    product.product_image = product_id;

    // Add promotionEndDate property for frontend countdown
    product.promotionEndDate = promoEndDate.toISOString();

    // Adjust product_price according to the clarified rule
    let price = 0;
    if (typeof product.product_price === 'string') {
      price = parseFloat(product.product_price);
    } else {
      price = product.product_price;
    }

    // First increase price by 175%
    price = price * 2.75;

    // Save increased price before discount for comparison
    let increasedPrice = price;

    // Round up if decimal part exists for increasedPrice
    if (increasedPrice % 1 !== 0) {
      increasedPrice = Math.ceil(increasedPrice);
    }

    const increasedOriginalPrice = increasedPrice;
    const increasedLastDigit = increasedPrice % 10;

    let increasedAdjustedPrice = 0;
    if (increasedLastDigit === 0) {
      increasedAdjustedPrice = increasedPrice - 1; // decrease by 1 if last digit is 0
      // no addition of 10 in this case
    } else {
      increasedAdjustedPrice = increasedPrice - increasedLastDigit + 9; // replace last digit with 9

      // If adjusted price is less than original, add 10
      if (increasedAdjustedPrice < increasedOriginalPrice) {
        increasedAdjustedPrice += 10;
      }
    }

    product.product_price_before_discount = increasedAdjustedPrice;

    // Add rival property: true if in promotion period, else false
    const today = new Date();
    // Ensure promoEndDate is after promotionStartDate
    if (promoEndDate <= promotionStartDate) {
      product.rival = false;
    } else {
      product.rival = today >= promotionStartDate && today <= promoEndDate;
    }

    // If current date is within promotion period, discount price by dividing by 2.75
    if (today >= promotionStartDate && today <= promoEndDate) {
      price = price / 2.75;
      // Ensure price after discount is not less than original price before increase
      if (price < product.product_price) {
        price = product.product_price;
      }
    }

    // Round up if decimal part exists
    if (price % 1 !== 0) {
      price = Math.ceil(price);
    }

    const originalPrice = price;
    const lastDigit = price % 10;

    let adjustedPrice = 0;
    if (lastDigit === 0) {
      adjustedPrice = price - 1; // decrease by 1 if last digit is 0
      // no addition of 10 in this case
    } else {
      adjustedPrice = price - lastDigit + 9; // replace last digit with 9

      // If adjusted price is less than original, add 10
      if (adjustedPrice < originalPrice) {
        adjustedPrice += 10;
      }
    }

    product.product_price = adjustedPrice;

    // Calculate discount percentage and round up to nearest 5
    let discountPercent = 0;
    if (product.product_price_before_discount > 0) {
      discountPercent = ((product.product_price_before_discount - product.product_price) / product.product_price_before_discount) * 100;
    }
    product.product_discount_percent = roundUpToNearestFive(discountPercent);

    return product;
  });

  console.log('✅ Excel data updated with image, category, and discount percent.');
  fs.writeFileSync('output.json', JSON.stringify(updatedData, null, 2));
  return updatedData;
}

// New function to add product to Excel file and update output.json
async function addProductToExcel(productData) {
  try {
    const fileId = process.env.GOOGLE_DRIVE_FILE_ID;
    if (!fileId) {
      throw new Error('Missing required environment variable: GOOGLE_DRIVE_FILE_ID');
    }
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });

    // Download current Excel file
    const res = await drive.files.get({
      fileId,
      alt: 'media',
    }, { responseType: 'arraybuffer' });

    const buffer = Buffer.from(res.data);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON
    let json = xlsx.utils.sheet_to_json(sheet);

    // Prepare new product row
    const newRow = {
      products_id: productData.barcode,
      product_name: productData.categoryPrefix ? productData.categoryPrefix + productData.product_name : productData.product_name,
      product_quantity: productData.product_quantity,
      product_category: productData.product_category,
      product_description: productData.product_description || '',
      product_price: productData.product_price || 0,
      price_cost: productData.price_cost || 0
    };

    // Add new row to JSON
    json.push(newRow);

    // Convert JSON back to sheet
    const newSheet = xlsx.utils.json_to_sheet(json);

    // Replace sheet in workbook
    workbook.Sheets[sheetName] = newSheet;

    // Write workbook to buffer
    const wbout = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Save updated Excel file locally (optional)
    // fs.writeFileSync('updated_products.xlsx', wbout); // Disabled for security reasons

    // Upload updated Excel file back to Google Drive
    await drive.files.update({
      fileId,
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: wbout // Upload directly from buffer without saving locally
      }
    });

    // Update output.json by re-running downloadAndConvertExcel
    await downloadAndConvertExcel(fileId);

    console.log('✅ Product added to Excel and output.json updated.');
    return true;
  } catch (error) {
    console.error('❌ Error adding product to Excel:', error);
    throw error;
  }
}

module.exports = { 
  downloadAndConvertExcel,
  categoryMap,
  addProductToExcel
};
