const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
const whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

whatsappClient.on('qr', (qr) => {
    console.log('--- QR RECEIVED ---');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => console.log('WhatsApp Client is ready!'));

whatsappClient.initialize();

app.get('/', (req, res) => res.send('Bot is active!'));
app.listen(process.env.PORT || 3000);
