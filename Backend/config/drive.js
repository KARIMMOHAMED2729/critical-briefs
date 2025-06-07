const { google } = require('googleapis');
const path = require('path');

// تعديل مسار ملف الخدمة ليكون مسار مطلق صحيح
const KEYFILEPATH = path.join(__dirname, '../drive-service-account.json');

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.appfolder',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/drive.scripts',
    'https://www.googleapis.com/auth/spreadsheets'
  ],
});

module.exports = { auth };
