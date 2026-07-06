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

// --- תוספת כירורגית: אתחול יציב יותר ---
const whatsappClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
     executablePath: '/usr/bin/google-chrome-stable', // שימוש במשתנה שהגדרנו
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

whatsappClient.on('qr', (qr) => qrcode.generate(qr, { small: true }));

whatsappClient.on('ready', () => console.log('WhatsApp Client is ready!'));

// --- תוספת כירורגית: התאוששות מניתוקים ---
whatsappClient.on('disconnected', (reason) => {
    console.log('WhatsApp Client disconnected, re-initializing...', reason);
    whatsappClient.initialize();
});

// --- פונקציות העזר שלך נשארות זהות ---
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
