const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { exec } = require('child_process');
const Tesseract = require('tesseract.js');
const Epub = require('epub-gen');

const uploadsDir = path.join(__dirname, '../uploads/');
const epubDir = path.join(uploadsDir, 'epub');

const outputJsonPath = path.join(__dirname, '../output.json');

// Multer storage configuration for saving uploaded PDFs in the epub directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(epubDir)) {
      fs.mkdirSync(epubDir, { recursive: true });
    }
    cb(null, epubDir);
  },
  filename: function (req, file, cb) {
    // Use the original filename as is (which is renamed by frontend)
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8'); // تحويل الاسم إلى UTF-8
    cb(null, originalName);
  }
});

// File filter to accept only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter }).fields([
  { name: 'file', maxCount: 1 },
  { name: 'projectName', maxCount: 1 }
]);

  // Helper function to convert PDF pages to images using pdf-poppler (requires poppler-utils installed)
function convertPdfToImages(pdfPath) {
  return new Promise((resolve, reject) => {
    // Use pdftoppm command to convert PDF pages to PNG images in memory folder
    const tempDir = path.join(__dirname, '../temp_images');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const command = `pdftoppm -png "${pdfPath}" "${path.join(tempDir, 'page')}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        // Collect generated image files
        fs.readdir(tempDir, (err, files) => {
          if (err) {
            reject(err);
          } else {
            const images = files
              .filter(f => f.startsWith('page') && (f.endsWith('.png')))
              .map(f => path.join(tempDir, f))
              .sort();
            resolve({ images, tempDir });
          }
        });
      }
    });
  });
}

// Helper function to run OCR on images and combine text
async function runOcrOnImages(images) {
  let fullText = '';
  for (const imagePath of images) {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng+ara', { logger: m => {} });
    fullText += text + '\n';
  }
  return fullText;
}

// Helper function to clean text (remove page numbers)
function cleanText(text) {
  // Remove lines that contain only numbers (page numbers)
  return text.split('\n').filter(line => !/^\s*\d+\s*$/.test(line)).join('\n');
}

function generateEpub(outputPath, text, title) {
  const option = {
    title: title || "OCR Output",
    author: "PDF OCR System",
    css: "body { direction: rtl; text-align: right; font-family: Arial, sans-serif; }",
    content: [
      {
        title: title || "Extracted Text",
        data: text.replace(/\n/g, '<br/>')
      }
    ],
    output: outputPath
  };
  return new Promise((resolve, reject) => {
    new Epub(option).promise.then(() => resolve()).catch(err => reject(err));
  });
}

exports.uploadAndProcessPdf = (req, res) => {
  console.log('Starting uploadAndProcessPdf');
  upload(req, res, async function (err) {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
    try {
      const file = req.files['file'] ? req.files['file'][0] : null;
      if (!file) {
        console.error('No file uploaded');
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

  // Convert PDF pages to images
  // console.log('Starting PDF to images conversion');
  const { images, tempDir } = await convertPdfToImages(file.path);
  // console.log('Images generated:', images);

  // Run OCR on images
  // console.log('Starting OCR on images');
  let extractedText = await runOcrOnImages(images);
  // console.log('OCR completed');

  // Clean extracted text
  extractedText = cleanText(extractedText);
  // console.log('Text cleaned');

  // Save output.epub only in uploads/epub folder
  const baseName = path.basename(file.filename, path.extname(file.filename));
  const outputEpubPath = path.join(epubDir, `${baseName}.epub`);
  await generateEpub(outputEpubPath, extractedText, baseName);
  // console.log('Output epub saved to:', outputEpubPath);

  // Clean up temp images and uploaded PDF file
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.unlinkSync(file.path);

      res.status(200).json({ success: true, text: extractedText });
    } catch (error) {
      console.error('Processing error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  });
};

exports.getBookNames = (req, res) => {
  fs.readFile(outputJsonPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading output.json:', err);
      return res.status(500).json({ success: false, message: 'Failed to read book names' });
    }
    try {
      const books = JSON.parse(data);
      const bookNames = books.map(book => book.product_name);
      res.status(200).json({ success: true, bookNames });
    } catch (parseError) {
      console.error('Error parsing output.json:', parseError);
      res.status(500).json({ success: false, message: 'Failed to parse book names' });
    }
  });
};
