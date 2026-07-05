import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function getCoordinates(cityName: any) {
  if (!cityName) return null;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'my-crawler-app' } });
    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) { console.error("Geocoding error:", e); }
  return null;
}

async function update_ads_search_metadata_fn(adId: string, parsedData: any) {
  try {
    // 1. הזרקת לוגיקת המיקום: אם חסר lat/lng, נסה לפענח מהעיר
    let lat = parsedData.lat;
    let lng = parsedData.lng;

    if (!lat || !lng) {
      console.log(`אין מיקום למודעה ${adId}, מנסה לפענח עיר: ${parsedData.location}`);
      const coords = await getCoordinates(parsedData.location);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    // סינון סופי: אם גם אחרי הפיענוח אין מיקום - תעצור
    if (!lat || !lng) {
      console.warn(`מדלג על מודעה ${adId}: לא ניתן היה למצוא מיקום`);
      return; 
    }

    // 2. מיפוי קטגוריות
    const categoryMapping: Record<string, string> = {
      "Learning & Study": "learning",
      "Local Jobs & Gigs": "jobs",
      "Local Services": "services",
      "General": "general",
      "Neighborhood Hub": "neighborhood",
      "Shopping & Deals": "shopping",
      "Sports": "sports",
      "Family": "family"
    };

    const finalCategory = categoryMapping[parsedData.category] || "general";

    // 3. הזרקה ל-Supabase
     const { error } = await supabase
      .from("ads")
      .update({
        title: parsedData.summary || "ללא כותרת",
        description: parsedData.summary || "",
        category: finalCategory,
        lat_num: lat,
        lng_num: lng,
        search_metadata: JSON.stringify({ 
          tags: parsedData.tags || [], 
          summary: parsedData.summary || "" 
        })
      })
      .eq('id', adId);

    if (error) throw error;
    console.log(`Successfully updated ads table for ID: ${adId} (Lat: ${lat}, Lng: ${lng})`);
    
  } catch (err) {
    console.error(`Error updating ads table for ID ${adId}:`, err instanceof Error ? err.message : err);
  }
}

// המעטפת הכירורגית שמפעילה את הפונקציה שלך
serve(async (req) => {
  try {
    const body = await req.json();
    if (body.test === "run_now") {
    console.log("Starting Telegram crawl...");
    
    // שליחת בקשה ל-Telegram API כדי לקבל הודעות מהערוץ/קבוצה
    const telegramUrl = `https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN")}/getUpdates`;
    
    const response = await fetch(telegramUrl);
    const data = await response.json();
    
    console.log("Telegram data:", data); // זה יופיע בלוגים שלנו!

    return new Response(JSON.stringify({ 
      message: "Crawl executed", 
      updates_count: data.result?.length || 0 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

await update_ads_search_metadata_fn(Number(body.adId), body.parsedData);
    return new Response(JSON.stringify({ message: "Success" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
  }
});