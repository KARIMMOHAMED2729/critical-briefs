
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { exec } = require('child_process');
const Tesseract = require('tesseract.js');
const Epub = require('epub-gen');

const uploadsDir = path.join(__dirname, '../uploads/');
const epubDir = path.join(uploadsDir, 'epub');

// Path to the Quranic JISOL file
const quranJisolPath = path.join(__dirname, '../upload/quran.jisol'); // Corrected path based on user upload
let quranJisol = null;
let quranicWhitelist = '';

try {
  if (fs.existsSync(quranJisolPath)) {
    const jisolContent = fs.readFileSync(quranJisolPath, 'utf8');
    quranJisol = JSON.parse(jisolContent);

    // Dynamically build the whitelist from JISOL data
    const allQuranicChars = [
      ...(quranJisol.characters || []),
      // Split ligatures into individual chars for whitelist if needed, but Tesseract might handle them
      // ...(quranJisol.ligatures || []).join('').split(''),
      ...(quranJisol.ligatures || []), // Include full ligatures in whitelist
      ...(quranJisol.diacritics || [])
    ];
    const additionalChars = '0123456789.,;:?!\'"()[]{}-–—\n '; // Keep essential punctuation and numbers
    // Combine, ensure uniqueness, and join into a string
    quranicWhitelist = [...new Set([...allQuranicChars, ...additionalChars.split('')])].join('');
    console.log('Successfully loaded Quranic JISOL and generated whitelist.');
    // console.log('Whitelist:', quranicWhitelist); // Optional: Log whitelist for debugging
  } else {
    console.warn(`Quranic JISOL file not found at ${quranJisolPath}. Using default Arabic whitelist.`);
    // Fallback to a default comprehensive Arabic whitelist if JISOL is not found
    quranicWhitelist = 'ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأإؤئلاىةۖۗۘۙۚۛۜ۝ًٌٍَُِّْ0123456789.,;:?!\'"()[]{}-–—\n ';
  }
} catch (err) {
  console.error('Failed to load or parse Quranic JISOL file:', err);
  // Fallback to a default comprehensive Arabic whitelist on error
  quranicWhitelist = 'ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأإؤئلاىةۖۗۘۙۚۛۜ۝ًٌٍَُِّْ0123456789.,;:?!\'"()[]{}-–—\n ';
  console.warn('Using default Arabic whitelist due to error.');
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure the epub directory exists
    if (!fs.existsSync(epubDir)) {
      fs.mkdirSync(epubDir, { recursive: true });
    }
    cb(null, epubDir);
  },
  filename: function (req, file, cb) {
    // Decode filename assuming it might be URL-encoded or latin1 from browser
    let originalName = file.originalname;
    try {
      // Try decoding as UTF-8, falling back from latin1 if needed
      originalName = Buffer.from(originalName, 'latin1').toString('utf8');
    } catch (e) {
      console.warn('Could not decode filename as UTF-8 from latin1, trying direct UTF-8:', file.originalname);
      try {
         // Sometimes the filename is already UTF-8 but misinterpreted
         originalName = Buffer.from(file.originalname, 'binary').toString('utf8');
      } catch (e2) {
        console.error('Failed to decode filename entirely, using original:', file.originalname);
        originalName = file.originalname; // Fallback to original if all decoding fails
      }
    }
    // Sanitize filename to prevent path traversal or invalid characters
    originalName = path.basename(originalName).replace(/[^a-zA-Z0-9\.\-\u0600-\u06FF\s]/g, '_'); // Allow Arabic letters, numbers, dots, hyphens, spaces
    cb(null, originalName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter }).fields([
  { name: 'file', maxCount: 1 },
  { name: 'projectName', maxCount: 1 } // Assuming projectName is also sent
]);

// Helper function to convert PDF pages to images
function convertPdfToImages(pdfPath) {
  return new Promise((resolve, reject) => {
    const tempDir = path.join(__dirname, '../temp_images', path.basename(pdfPath, '.pdf') + '_' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    // Ensure paths with spaces are handled correctly by quoting
    const command = `pdftoppm -png "${pdfPath}" "${path.join(tempDir, 'page')}"`;
    // console.log(`Executing: ${command}`); // Log the command
    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        console.error(`pdftoppm error: ${error.message}`);
        console.error(`pdftoppm stderr: ${stderr}`);
        // Clean up temp dir on error
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        reject(new Error(`Failed to convert PDF to images: ${stderr || error.message}`));
      } else {
        fs.readdir(tempDir, (err, files) => {
          if (err) {
             if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
             reject(err);
          } else {
            const images = files
              .filter(f => f.startsWith('page') && f.endsWith('.png'))
              .map(f => path.join(tempDir, f))
              // Sort numerically based on page number in filename (e.g., page-001.png, page-1.png)
              .sort((a, b) => {
                 const matchA = a.match(/page-(\d+)\.png$/);
                 const matchB = b.match(/page-(\d+)\.png$/);
                 const numA = matchA ? parseInt(matchA[1], 10) : 0;
                 const numB = matchB ? parseInt(matchB[1], 10) : 0;
                 return numA - numB;
              });
            if (images.length === 0) {
                // console.warn(`pdftoppm might have finished, but no images found in ${tempDir}. Stdout: ${stdout}, Stderr: ${stderr}`);
                // Attempt to check if the PDF was valid
                 PDFDocument.load(fs.readFileSync(pdfPath)).then(pdfDoc => {
                    // console.log(`PDF has ${pdfDoc.getPageCount()} pages.`);
                 }).catch(pdfErr => {
                    console.error(`Error loading PDF document: ${pdfErr.message}`);
                 });
                 // Still reject if no images produced
                 if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
                 reject(new Error('No images were generated from the PDF. It might be empty, corrupted, or password-protected.'));
            } else {
                // console.log(`Converted PDF to ${images.length} images in ${tempDir}.`);
                resolve({ images, tempDir });
            }
          }
        });
      }
    });
  });
}

// Helper function to run OCR on images
async function runOcrOnImages(images) {
  let fullText = '';
  console.log(`Running OCR on ${images.length} images using 'ara' language and whitelist...`);

  // Create a worker for Tesseract
  const worker = await Tesseract.createWorker('ara', 1, {
    logger: m => { /* console.log(m) */ }, // Suppress or enable detailed logging
    // Use the dynamically generated or fallback whitelist
    tessedit_char_whitelist: quranicWhitelist,
    // OEM 1 (LSTM only) is generally better for scripts like Arabic
    // PSM Auto (3) is a good start. PSM 4 (single column) or 6 (single block) might be better for specific layouts.
    tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    // Preserve interword spaces - might be important for Arabic
    preserve_interword_spaces: '1',
  });

  for (let i = 0; i < images.length; i++) {
    const imagePath = images[i];
    try {
      const { data: { text } } = await worker.recognize(imagePath);
      fullText += text + '\n\n'; // Add double newline between pages for paragraph separation
    } catch (ocrError) {
      console.error(`OCR error on image ${imagePath}:`, ocrError);
      fullText += `[OCR Error on page ${i + 1}]\n\n`; // Add error marker
    }
  }
  await worker.terminate();
  console.log('OCR process completed.');
  return fullText;
}

// Helper function to generate EPUB
function generateEpub(outputPath, text, title) {
  const option = {
    title: title || "OCR Output",
    author: "PDF OCR System",
    // Use Amiri font for better Arabic rendering, ensure RTL direction
    css: `
      @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
      body {
        direction: rtl;
        text-align: justify;
        font-family: 'Amiri', serif;
        line-height: 2.0; /* Increased line height for Quranic text */
        font-size: 1.3em; /* Slightly larger font size */
      }
      p {
        margin-bottom: 0.8em;
        text-indent: 0; /* No first-line indent */
      }
      /* Add specific styles for Ayah numbers or markers if identifiable */
    `,
    content: [
      {
        title: title || "Extracted Text",
        // Convert newlines to paragraphs for better structure in EPUB
        // Filter out empty paragraphs that might result from extra newlines
        data: text.split('\n').map(para => para.trim()).filter(para => para.length > 0).map(para => `<p>${para}</p>`).join('\n')
      }
    ],
    output: outputPath,
    verbose: false // Reduce epub-gen logging
  };
  return new Promise((resolve, reject) => {
    new Epub(option).promise
      .then(() => {
        console.log('EPUB generated successfully.');
        resolve();
      })
      .catch(err => {
        console.error('EPUB generation error:', err);
        reject(err);
      });
  });
}

// Helper function to clean text (basic cleaning)
function cleanText(text) {
  console.log('Cleaning extracted text...');
  // Remove lines that likely represent page numbers (only digits, possibly with spaces)
  let cleaned = text.split('\n').filter(line => !/^\s*\d+\s*$/.test(line.trim())).join('\n');

  // Additional cleaning: Trim whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

  // Remove excessive blank lines (more than two consecutive newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Optional: Add more specific cleaning rules here if needed (e.g., remove headers/footers based on patterns)
  // Example: cleaned = cleaned.replace(/^Page \d+$/gm, '');

  console.log('Text cleaning finished.');
  return cleaned;
}

// Main controller function
exports.uploadAndProcessPdf = (req, res) => {
  console.log('Starting uploadAndProcessPdf request...');
  upload(req, res, async function (err) {
    let tempDir = null; // To ensure cleanup happens even if early errors occur
    let uploadedFilePath = null;

    if (err instanceof multer.MulterError) {
      console.error('Multer error during upload:', err);
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      console.error('Unknown error during upload phase:', err);
      return res.status(400).json({ success: false, message: err.message || 'Upload failed.' });
    }

    try {
      const file = req.files['file'] ? req.files['file'][0] : null;
      if (!file) {
        console.error('No file uploaded in the request.');
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      uploadedFilePath = file.path; // Keep track of the uploaded file path
  // console.log(`File received: ${file.filename}, Path: ${uploadedFilePath}`);

  // 1. Convert PDF to Images
  const conversionResult = await convertPdfToImages(uploadedFilePath);
  const images = conversionResult.images;
  tempDir = conversionResult.tempDir; // Assign tempDir for cleanup

  if (images.length === 0) {
    // Error already logged in convertPdfToImages if it failed
    // No need to delete uploadedFilePath here as it's the final destination in epubDir
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    return res.status(500).json({ success: false, message: 'Failed to extract any images from the PDF. It might be empty, image-based without text layer, or corrupted.' });
  }

  // 2. Run OCR on Images
  let extractedText = await runOcrOnImages(images);

  // 3. Clean Extracted Text
  extractedText = cleanText(extractedText);

  // 4. Generate EPUB
  // Use the sanitized original filename (stored in file.filename by multer config)
  const baseName = path.basename(file.filename, path.extname(file.filename));
  const outputEpubPath = path.join(epubDir, `${baseName}.epub`);
  await generateEpub(outputEpubPath, extractedText, baseName);

  // 5. Clean up temporary image directory
  // console.log('Cleaning up temporary image files...');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    // console.log(`Removed temp image directory: ${tempDir}`);
  }

  // Delete the uploaded PDF file after EPUB creation
  try {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
      // console.log(`Deleted uploaded PDF file: ${uploadedFilePath}`);
    }
  } catch (deleteErr) {
    console.error(`Failed to delete uploaded PDF file: ${deleteErr.message}`);
  }

  // console.log('Processing finished successfully.');
  // Send back the path to the generated EPUB or the text itself
  res.status(200).json({ 
    success: true, 
    message: 'PDF processed successfully.',
    epubPath: `/uploads/epub/${baseName}.epub`, // Relative path for client access
    text: extractedText // Changed property name to 'text' to match frontend expectation
  });

    } catch (error) {
      console.error('Error during PDF processing pipeline:', error);
      // Ensure cleanup happens on error
      if (fs.existsSync(tempDir)) {
        console.log(`Cleaning up temp directory due to error: ${tempDir}`);
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      // We might not want to delete the uploaded PDF on error, maybe user wants to retry?
      // If you want to delete it: if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
      
      res.status(500).json({ success: false, message: 'Server error during processing.', error: error.message });
    }
  });
};

// Function to get book names (assuming it reads from a different JSON, maybe unrelated?)
// Keeping it as it was in the original code provided.
const outputJsonPath = path.join(__dirname, '../output.json'); // Path to a potentially different JSON
exports.getBookNames = (req, res) => {
  fs.readFile(outputJsonPath, 'utf8', (err, data) => {
    if (err) {
      // If the file doesn't exist, maybe return an empty list or specific error
      if (err.code === 'ENOENT') {
        console.warn(`output.json not found at ${outputJsonPath}`);
        return res.status(200).json({ success: true, bookNames: [] }); 
      } 
      console.error('Error reading output.json:', err);
      return res.status(500).json({ success: false, message: 'Failed to read book names' });
    }
    try {
      const books = JSON.parse(data);
      // Ensure 'books' is an array and contains 'product_name'
      if (!Array.isArray(books)) {
          throw new Error('output.json does not contain a valid array.');
      }
      const bookNames = books.map(book => book.product_name).filter(name => name); // Filter out undefined/null names
      res.status(200).json({ success: true, bookNames });
    } catch (parseError) {
      console.error('Error parsing output.json:', parseError);
      res.status(500).json({ success: false, message: 'Failed to parse book names from output.json' });
    }
  });
};

