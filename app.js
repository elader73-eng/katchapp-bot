const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        // זה חייב להיות הנתיב הזה בדיוק עבור ה-Dockerfile שסיפקתי
        executablePath: '/usr/bin/google-chrome', 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

whatsappClient.on('qr', (qr) => {
    console.log('--- QR RECEIVED ---');
    qrcode.generate(qr, { small: true });
});

whatsappClient.initialize();
