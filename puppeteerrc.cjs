const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // זה יכריח את הדפדפן להישמר בתוך תיקיית הפרויקט שלא נמחקת
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
