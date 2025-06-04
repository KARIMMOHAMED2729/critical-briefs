const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const { exec } = require('child_process');
const Tesseract = require('tesseract.js');
const Epub = require('epub-gen');

const uploadsDir = path.join(__dirname, '../uploads/');

// Multer storage configuration for saving uploaded PDFs in a project-specific folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use project name from request body or generate random folder name
    let projectName = req.body.projectName;
    if (!projectName) {
      projectName = Date.now().toString();
    }
    const projectDir = path.join(uploadsDir, projectName);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    cb(null, projectDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
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

const upload = multer({ storage: storage, fileFilter: fileFilter }).single('file');

// Helper function to convert PDF pages to images using pdf-poppler (requires poppler-utils installed)
function convertPdfToImages(pdfPath, outputDir) {
  return new Promise((resolve, reject) => {
    // Use pdftoppm command to convert PDF pages to PNG images
    const command = `pdftoppm -png "${pdfPath}" "${path.join(outputDir, 'page')}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        // Collect generated image files
        fs.readdir(outputDir, (err, files) => {
          if (err) {
            reject(err);
          } else {
            const images = files
              .filter(f => f.startsWith('page') && (f.endsWith('.png')))
              .map(f => path.join(outputDir, f))
              .sort();
            resolve(images);
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

// Helper function to generate EPUB file
function generateEpub(outputPath, text) {
  const option = {
    title: "OCR Output",
    author: "PDF OCR System",
    content: [
      {
        title: "Extracted Text",
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
      const file = req.file;
      if (!file) {
        console.error('No file uploaded');
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      const projectDir = path.dirname(file.path);
  // console.log('File uploaded to:', file.path);
  // console.log('Project directory:', projectDir);

  // Convert PDF pages to images
  // console.log('Starting PDF to images conversion');
  const images = await convertPdfToImages(file.path, projectDir);
  // console.log('Images generated:', images);

  // Run OCR on images
  // console.log('Starting OCR on images');
  let extractedText = await runOcrOnImages(images);
  // console.log('OCR completed');

  // Clean extracted text
  extractedText = cleanText(extractedText);
  // console.log('Text cleaned');

  // Save output.txt
  const outputTxtPath = path.join(projectDir, 'output.txt');
  fs.writeFileSync(outputTxtPath, extractedText, 'utf8');
  // console.log('Output text saved to:', outputTxtPath);

  // Save output.epub
  const outputEpubPath = path.join(projectDir, 'output.epub');
  await generateEpub(outputEpubPath, extractedText);
  // console.log('Output epub saved to:', outputEpubPath);

      res.status(200).json({ success: true, text: extractedText });
    } catch (error) {
      console.error('Processing error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  });
};
