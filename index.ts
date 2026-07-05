import express from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// פונקציית העזר למפות (Geocoding)
async function getCoordinates(cityName: string) {
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
async function update_ads_search_metadata_fn(adId: number, parsedData: any) {
  let lat = parsedData.lat;
  let lng = parsedData.lng;

  if (!lat || !lng) {
    const coords = await getCoordinates(parsedData.location);
    if (coords) { lat = coords.lat; lng = coords.lng; }
  }

  const categoryMapping: Record<string, string> = {
    "Coffee/Food": "coffee_food",
    "Sport/Outdoors": "sport_outdoors",
    "Work/Study": "work_study",
    "Parties/Big Events": "parties_events",
    "General/Other": "general_other"
  };

  const finalCategory = categoryMapping[parsedData.category] || "general_other";

  await supabase.from("ads").update({
    title: parsedData.summary || "ללא כותרת",
    category: finalCategory,
    lat_num: lat,
    lng_num: lng,
    search_metadata: JSON.stringify({ tags: parsedData.tags || [], summary: parsedData.summary || "" })
  }).eq('id', adId);
}

// נתיב לבדיקת "ערנות" הבוט
app.get('/', (req, res) => res.send('Bot is active!'));

// נתיב לעדכון מודעה (כמו ה-Edge Function)
app.post('/update-ad', async (req, res) => {
  const { adId, parsedData } = req.body;
  await update_ads_search_metadata_fn(Number(adId), parsedData);
  res.status(200).send("Success");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
