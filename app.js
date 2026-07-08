const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    },
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
});

whatsappClient.on('qr', (qr) => {
    console.log('QR RECEIVED - הסריקה הזו היא הדרך היחידה לחבר את הבוט');
    
    // יצירת קישור ישיר לתמונה נקייה של ה-QR קוד
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    
    console.log('\n============================================================');
    console.log('לחץ על הקישור הבא כדי לפתוח תמונת QR ברורה לסריקה:');
    console.log(qrImageUrl);
    console.log('============================================================\n');

    qrcode.generate(qr, { small: true });
});


whatsappClient.on('ready', () => console.log('WhatsApp Client is ready!'));

whatsappClient.on('disconnected', (reason) => {
    console.log('WhatsApp Client disconnected, re-initializing...', reason);
    whatsappClient.initialize();
});

async function getCoordinates(cityName) {
  if (!cityName) return null;
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`, {
      headers: { 'User-Agent': 'KatchApp-Bot' }
    });
    if (response.data && response.data.length > 0) {
      return { lat: parseFloat(response.data[0].lat), lng: parseFloat(response.data[0].lon) };
    }
  } catch (e) { console.error("Geocoding error:", e); }
  return null;
}

async function update_ads_search_metadata_fn(adId, parsedData) {
  let lat = parsedData.lat;
  let lng = parsedData.lng;
  if (!lat || !lng) {
    const coords = await getCoordinates(parsedData.location);
    if (coords) { lat = coords.lat; lng = coords.lng; }
  }

  const categoryMapping = {
    "Family": "Family&Parents",
    "General": "General",
    "Learning & Study": "Learning&Study",
    "Local Jobs & Gigs": "Local Jobs & Gigs",
    "Local Services": "Local Services",
    "Neighborhood Hub": "Nighborhood Hub",
    "Shopping & Deals": "Shopping",
    "Sports": "Sports"
  };

  const finalCategory = categoryMapping[parsedData.category] || "General";

  const { error } = await supabase
    .from("ads")
    .update({
      title: parsedData.summary || "ללא כותרת",
      category: finalCategory,
      lat_num: lat,
      lng_num: lng,
      search_metadata: JSON.stringify({ tags: parsedData.tags || [], summary: parsedData.summary || "" })
    })
    .eq('id', adId);

    if (error) console.error("Supabase update error:", error);
}

app.get('/', (req, res) => res.send('Bot is active!'));

app.post('/update-ad', async (req, res) => {
  const { adId, parsedData } = req.body;
  await update_ads_search_metadata_fn(adId, parsedData);
  res.status(200).send("Success");
});

whatsappClient.on('message', async msg => {
    const chat = await msg.getChat();
    if (chat.isGroup) {
        console.log(`New message in ${chat.name}: ${msg.body}`);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    whatsappClient.initialize();
});
