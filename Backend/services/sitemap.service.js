const fs = require('fs');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

async function generateSitemap() {
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
    const booksPath = path.join(__dirname, '../output.json');
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

    const sitemapPath = path.join(__dirname, '../dist/browser/sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemapContent);
    console.log('✅ تم إنشاء ملف sitemap.xml بنجاح مع روابط الكتب');
  } catch (error) {
    console.error('❌ فشل في إنشاء sitemap.xml:', error.message);
  }
}

module.exports = {
  generateSitemap
};
