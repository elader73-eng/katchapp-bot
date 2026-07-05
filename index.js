const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
app.use(express.json());

// הגדרת חיבור ל-Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// פונקציית עזר למפות (Geocoding)
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

// פונקציית עדכון המודעות
async function update_ads_search_metadata_fn(adId, parsedData) {
  let lat = parsedData.lat;
  let lng = parsedData.lng;

  if (!lat || !lng) {
    const coords = await getCoordinates(parsedData.location);
    if (coords) { 
        lat = coords.lat; 
        lng = coords.lng; 
    }
  }

  // מיפוי קטגוריות לפי שמות האייקונים ב-Bucket שלך
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
      search_metadata: JSON.stringify({ 
        tags: parsedData.tags || [], 
        summary: parsedData.summary || "" 
      })
    })
    .eq('id', adId);

    if (error) console.error("Supabase update error:", error);
}

// נתיב לבדיקת "ערנות" הבוט
app.get('/', (req, res) => res.send('Bot is active!'));

// נתיב לקבלת נתונים מהבוט/ממשק
app.post('/update-ad', async (req, res) => {
  const { adId, parsedData } = req.body;
  await update_ads_search_metadata_fn(adId, parsedData);
  res.status(200).send("Success");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));