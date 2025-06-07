require('./loadEnv');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { connectDB } = require('./config/database');
const { updateBooksData } = require('./controllers/books.controller');

// استيراد المسارات
const usersRoutes = require('./routes/users.routes');
const booksRoutes = require('./routes/books.routes');
const ordersRoutes = require('./routes/orders.routes');
const paymentRoutes = require('./routes/payment.routes');
const printRoutes = require('./routes/print.routes');
const chatAiRoutes = require('./routes/chat-ai.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Middlewares
app.use(bodyParser.json());

app.use('/api/print', printRoutes);

// إضافة رؤوس Cross-Origin-Opener-Policy و Cross-Origin-Embedder-Policy
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// إعداد CORS للسماح بالمصادر المناسبة
const allowedOrigins = ['https://kenouz.org', 'https://www.kenouz.org'];
if (!isProduction) {
  allowedOrigins.push('http://localhost:4200');
}
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

  
// Dedicated route to serve files with Content-Disposition attachment to force download
app.get('/uploads/:filename', (req, res) => {
  const encodedFilename = req.params.filename;
  const filename = decodeURIComponent(encodedFilename);
  const filePath = path.join(__dirname, 'uploads', filename);
  console.log(`Download request for filename: ${filename}`);
  console.log(`Resolved file path: ${filePath}`);
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('File does not exist:', filePath);
      return res.status(404).send('File not found');
    }
    // Set Content-Type based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.rar') {
      contentType = 'application/x-rar-compressed';
    } else if (ext === '.zip') {
      contentType = 'application/zip';
    }
    res.setHeader('Content-Type', contentType);
    // Remove Content-Disposition header to allow inline display
    // res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file for download:', err);
        res.status(500).send('Error downloading file');
      }
    });
  });
});

const uploadsAbsolutePath = require('path').resolve(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsAbsolutePath));

// الاتصال بقاعدة البيانات
connectDB().catch(err => {
  console.error('❌ فشل في الاتصال بقاعدة البيانات:', err);
  process.exit(1);
});

// تسجيل المسارات
app.use('/api/users', usersRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api', paymentRoutes);

app.use('/api/chat-ai', chatAiRoutes);
app.use('/api/admin', adminRoutes);

// Delete print order and associated file
const mongoose = require('mongoose');
const User = require('./models/User.model');
const { ObjectId } = mongoose.Types;

app.delete('/api/print/delete-print-order/:userId/:orderId', async (req, res) => {
  const { userId, orderId } = req.params;
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(orderId)) {
    console.error('Invalid user ID or order ID:', userId, orderId);
    return res.status(400).json({ success: false, message: 'Invalid user ID or order ID' });
  }
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for ID:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const orderIndex = user.orders.findIndex(order => order._id.equals(orderId));
    if (orderIndex === -1) {
      console.error('Print order not found for orderId:', orderId);
      return res.status(404).json({ success: false, message: 'Print order not found' });
    }
    const order = user.orders[orderIndex];
    // Delete associated files for all printProjects in the order
    if (order.printProjects && order.printProjects.length > 0) {
      order.printProjects.forEach(printProject => {
          if (printProject.filepath) {
            // Use full filepath stored to delete the file
            const filePath = printProject.filepath;
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error('Error deleting file:', err);
              } else {
                // console.log('Deleted file:', filePath);
              }
            });
          }
      });
    }
    // Remove the order from user's orders array
    user.orders.splice(orderIndex, 1);
    await user.save();
    res.json({ success: true, message: 'Print order and files deleted successfully' });
  } catch (error) {
    console.error('Error deleting print order:', error.stack || error);
    res.status(500).json({ success: false, message: 'Server error deleting print order' });
  }
});

// جدولة تحديث بيانات الكتب كل يوم
cron.schedule('0 */2 * * *', () => {
  console.log('🔄 جاري تحديث بيانات الكتب...');
  updateBooksData()
    .then(() => {
      generateSitemap();
      generateRobotsTxt();
    })
    .catch(console.error);
});

// تحديث عند بدء التشغيل
updateBooksData().catch(console.error);

// توليد ملف sitemap وقت تشغيل السيرفر
generateSitemap();
generateRobotsTxt();

function generateSitemap() {
  try {
    const baseUrl = process.env.SITEMAP_BASE_URL || (isProduction ? 'https://kenouz.org' : 'http://localhost:3000');
    console.log('🔧 جاري إنشاء ملف sitemap باستخدام الرابط الأساسي:', baseUrl);

    // روابط ثابتة
    const staticRoutes = ['Home', 'Business-Marketing-Finance', 'Education-children', 'Arts-crafts', 'HealthMedicineScience', 'Islamic', 'Novels-stories', 'Self-development-psychology', 'History-Biographies', 'Dictionaries-References', 'ControlPanel', 'research', 'basket', 'Favorites', 'login', 'register', 'requests', 'print'];
    const staticUrls = staticRoutes.map(route => `
      <url><loc>${baseUrl}/${route}</loc></url>
    `).join('');
    console.log('🔧 تم إنشاء روابط ثابتة');

    // قراءة الكتب من output.json
    const booksPath = path.join(__dirname, 'output.json');
    const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
    console.log('🔧 تم تحميل الكتب من ملف output.json، عدد الكتب:', books.length);

    const bookUrls = books.map(book => {
      const safeName = book.product_name.trim().replace(/\s+/g, '-').replace(/[^\w\-ء-ي]/g, '');
      return `
        <url>
          <loc>${baseUrl}/book/${safeName}</loc>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `;
    }).join('');
    console.log('🔧 تم إنشاء روابط الكتب');

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${bookUrls}
</urlset>`;

    const sitemapPath = path.join(__dirname, 'dist/browser/sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemapContent);
    console.log('✅ تم إنشاء ملف sitemap.xml بنجاح مع روابط الكتب');
  } catch (error) {
    console.error('❌ فشل في إنشاء sitemap.xml:', error.message);
  }
}

function generateRobotsTxt() {
  try {
    const staticRoutes = ['Home', 'Business-Marketing-Finance', 'Education-children', 'Arts-crafts', 'HealthMedicineScience', 'Islamic', 'Novels-stories', 'Self-development-psychology', 'History-Biographies', 'Dictionaries-References', 'ControlPanel', 'research', 'basket', 'Favorites', 'login', 'register', 'requests', 'print'];
    const booksPath = path.join(__dirname, 'output.json');
    const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));

    let content = 'User-agent: *\n';
    staticRoutes.forEach(route => {
      content += `Allow: /${route}\n`;
    });
    content += 'Allow: /book/\n';

    const robotsPath = path.join(__dirname, 'dist/browser/robots.txt');
    fs.writeFileSync(robotsPath, content);
    console.log('✅ تم إنشاء ملف robots.txt بنجاح مع روابط ثابتة وكتب');
  } catch (error) {
    console.error('❌ فشل في إنشاء robots.txt:', error.message);
  }
}

// تقديم ملفات Angular فقط في وضع الإنتاج
if (isProduction) {
  app.use(express.static(path.join(__dirname, 'dist/browser')));
  // تقديم ملف robots.txt
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, 'dist/browser/robots.txt'));
  });
}

// إضافة مسار لخدمة ملف sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, 'dist/browser/sitemap.xml'));
});

// تعديل مسار catch-all لتجاهل طلبات /uploads/ وتوجيهها إلى Nginx مباشرة
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/uploads/')) {
    // تجاهل هذا الطلب ليتم التعامل معه من قبل Nginx
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist/browser/index.html'));
});

// بدء السيرفر
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 الخادم يعمل على http://0.0.0.0:${port}`);
});

function generateSitemap() {
  try {
    const baseUrl = process.env.SITEMAP_BASE_URL || (isProduction ? 'https://kenouz.org' : 'http://localhost:3000');
    console.log('🔧 جاري إنشاء ملف sitemap باستخدام الرابط الأساسي:', baseUrl);

    // روابط ثابتة
    const staticRoutes = ['Home', 'Business-Marketing-Finance', 'Education-children', 'Arts-crafts', 'HealthMedicineScience', 'Islamic', 'Novels-stories', 'Self-development-psychology', 'History-Biographies', 'Dictionaries-References', 'ControlPanel', 'research', 'basket', 'Favorites', 'login', 'register', 'requests', 'print'];
    const staticUrls = staticRoutes.map(route => `
      <url><loc>${baseUrl}/${route}</loc></url>
    `).join('');
    console.log('🔧 تم إنشاء روابط ثابتة');

    // قراءة الكتب من output.json
    const booksPath = path.join(__dirname, 'output.json');
    const books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
    console.log('🔧 تم تحميل الكتب من ملف output.json، عدد الكتب:', books.length);

    const bookUrls = books.map(book => {
      const safeName = book.product_name.trim().replace(/\s+/g, '-').replace(/[^\w\-ء-ي]/g, '');
      return `
        <url>
          <loc>${baseUrl}/book/${safeName}</loc>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `;
    }).join('');
    console.log('🔧 تم إنشاء روابط الكتب');

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${bookUrls}
</urlset>`;

    const sitemapPath = path.join(__dirname, 'dist/browser/sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemapContent);
    console.log('✅ تم إنشاء ملف sitemap.xml بنجاح مع روابط الكتب');
  } catch (error) {
    console.error('❌ فشل في إنشاء sitemap.xml:', error.message);
  }
}

module.exports = {
  app,
  generateSitemap
};
