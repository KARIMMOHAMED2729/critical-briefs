
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { exec } = require('child_process');
const Tesseract = require('tesseract.js');
const Epub = require('epub-gen');
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');
const levenshtein = require('fast-levenshtein');

const uploadsDir = path.join(__dirname, '../uploads/');
const epubDir = path.join(uploadsDir, 'epub');
const wordDir = path.join(uploadsDir, 'word');


// Path to the Quranic JISOL file
const quranJisolPath = path.join(__dirname, '../upload/quran.jisol'); // Corrected path based on user upload
let quranJisol = null;
let quranicWhitelist = '';

// Load Tanzil Quranic dataset (using quran-simple.txt as base)
const quranDataPath = path.join(__dirname, '../quranic-data/quran-simple.txt');
let quranVerses = [];

function loadQuranVerses() {
  try {
    if (fs.existsSync(quranDataPath)) {
      const data = fs.readFileSync(quranDataPath, 'utf8');
      // Tanzil quran-simple.txt format: each line is "sura:ayah text"
      // Example: "1:1 بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ"
      quranVerses = data.split('\n').map(line => {
        const sepIndex = line.indexOf(' ');
        if (sepIndex > 0) {
          const verseId = line.substring(0, sepIndex).trim();
          const verseText = line.substring(sepIndex + 1).trim();
          return { id: verseId, text: verseText };
        }
        return null;
      }).filter(v => v !== null);
      console.log(`Loaded ${quranVerses.length} Quranic verses from Tanzil dataset.`);
    } else {
      console.warn(`Quranic data file not found at ${quranDataPath}. Quranic verse matching disabled.`);
    }
  } catch (err) {
    console.error('Failed to load or parse Quranic data file:', err);
  }
}

// Call once on module load
loadQuranVerses();

try {
  if (fs.existsSync(quranJisolPath)) {
    const jisolContent = fs.readFileSync(quranJisolPath, 'utf8');
    quranJisol = JSON.parse(jisolContent);

    // Dynamically build the whitelist from JISOL data
    const allQuranicChars = [
      ...(quranJisol.characters || []),
      ...(quranJisol.ligatures || []), // Include full ligatures in whitelist
      ...(quranJisol.diacritics || [])
    ];
    const additionalChars = '0123456789.,;:?!\'"()[]{}-–—\n '; // Keep essential punctuation and numbers
    const englishChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    quranicWhitelist = [...new Set([...allQuranicChars, ...additionalChars.split(''), ...englishChars.split('')])].join('');
    console.log('Successfully loaded Quranic JISOL and generated whitelist.');
  } else {
    console.warn(`Quranic JISOL file not found at ${quranJisolPath}. Using default Arabic whitelist.`);
    quranicWhitelist = 'ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأإؤئلاىةۖۗۘۙۚۛۜ۝ًٌٍَُِّْ0123456789.,;:?!\'"()[]{}-–—\n ' + 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
} catch (err) {
  console.error('Failed to load or parse Quranic JISOL file:', err);
  quranicWhitelist = 'ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأإؤئلاىةۖۗۘۙۚۛۜ۝ًٌٍَُِّْ0123456789.,;:?!\'"()[]{}-–—\n ';
  console.warn('Using default Arabic whitelist due to error.');
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(epubDir)) {
      fs.mkdirSync(epubDir, { recursive: true });
    }
    if (!fs.existsSync(wordDir)) {
      fs.mkdirSync(wordDir, { recursive: true });
    }
    cb(null, epubDir);
  },
  filename: function (req, file, cb) {
    let originalName = file.originalname;
    try {
      originalName = Buffer.from(originalName, 'latin1').toString('utf8');
    } catch (e) {
      try {
         originalName = Buffer.from(file.originalname, 'binary').toString('utf8');
      } catch (e2) {
        originalName = file.originalname;
      }
    }
    originalName = path.basename(originalName).replace(/[^a-zA-Z0-9\.\-\u0600-\u06FF\s]/g, '_');
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

  const worker = await Tesseract.createWorker('ara', 1, {
    logger: m => { },
    tessedit_char_whitelist: quranicWhitelist,
    tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    preserve_interword_spaces: '1',
  });

  for (let i = 0; i < images.length; i++) {
    const imagePath = images[i];
    try {
      const { data: { text } } = await worker.recognize(imagePath);
      fullText += text + '\n\n';
    } catch (ocrError) {
      console.error(`OCR error on image ${imagePath}:`, ocrError);
      fullText += `[OCR Error on page ${i + 1}]\n\n`;
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

// Helper function to generate Word document
async function generateWord(outputPath, text) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: text.split('\n').filter(line => line.trim().length > 0).map(line => {
          return new Paragraph({
            children: [
              new TextRun({
                text: line,
                font: "Amiri",
                size: 28, // 14pt (half-points)
                rightToLeft: true,
              }),
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
          });
        }),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Promise((resolve, reject) => {
    fs.writeFile(outputPath, buffer, (err) => {
      if (err) {
        console.error('Word document generation error:', err);
        reject(err);
      } else {
        console.log('Word document generated successfully.');
        resolve();
      }
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


// Function to replace approximate Quranic verses in text with accurate verses from quranVerses dataset
function replaceQuranicVerses(text) {
  if (!text || !quranVerses || quranVerses.length === 0) {
    return text;
  }

  // Split text into lines for processing
  const lines = text.split('\n');
  const maxDistance = 5; // Maximum Levenshtein distance to consider a match

  // For performance, create a map of verse texts to ids for quick lookup
  const verseTexts = quranVerses.map(v => v.text);

  // Process each line and try to replace with closest matching verse
  const replacedLines = lines.map(line => {
    if (!line.trim()) return line;

    // Find the closest verse text by Levenshtein distance
    let closestVerse = null;
    let closestDistance = Infinity;

    for (const verse of quranVerses) {
      const distance = levenshtein.get(line, verse.text);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestVerse = verse;
      }
      if (closestDistance === 0) break; // Exact match found
    }

    // If close enough, replace line with accurate verse text
    if (closestDistance <= maxDistance) {
      return closestVerse.text;
    }

    return line;
  });

  return replacedLines.join('\n');
}

// Main controller function
exports.uploadAndProcessPdf = (req, res) => {
  console.log('Starting uploadAndProcessPdf request...');
  upload(req, res, async function (err) {
    let tempDir = null;
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
      uploadedFilePath = file.path;

      // 1. Convert PDF to Images
      const conversionResult = await convertPdfToImages(uploadedFilePath);
      const images = conversionResult.images;
      tempDir = conversionResult.tempDir;

      if (images.length === 0) {
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        return res.status(500).json({ success: false, message: 'Failed to extract any images from the PDF.' });
      }

      // 2. Run OCR on Images
      let extractedText = await runOcrOnImages(images);

      // 3. Clean Extracted Text
      extractedText = cleanText(extractedText);

      // 4. Replace Quranic verses with accurate text
      extractedText = replaceQuranicVerses(extractedText);

      // 5. Generate EPUB
      const baseName = path.basename(file.filename, path.extname(file.filename));
      const outputEpubPath = path.join(epubDir, `${baseName}.epub`);
      await generateEpub(outputEpubPath, extractedText, baseName);

      // 6. Generate Word document
      const outputWordPath = path.join(wordDir, `${baseName}.docx`);
      await generateWord(outputWordPath, extractedText);

      // 7. Clean up temporary image directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      // Delete the uploaded PDF file after processing
      try {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
          fs.unlinkSync(uploadedFilePath);
        }
      } catch (deleteErr) {
        console.error(`Failed to delete uploaded PDF file: ${deleteErr.message}`);
      }

      // Send back the paths to the generated EPUB and Word files
      res.status(200).json({
        success: true,
        message: 'PDF processed successfully.',
        epubPath: `/uploads/epub/${baseName}.epub`,
        wordPath: `/uploads/word/${baseName}.docx`,
        text: extractedText
      });

    } catch (error) {
      console.error('Error during PDF processing pipeline:', error);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
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

