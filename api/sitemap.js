import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Supabase'ga ulanish (Env fayllaringizdan o'zi oladi)
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // O'z domeningizni shu yerga yozing
  const DOMAIN = "https://fasttv.uz";

  try {
    // Bazadan faqat onlayn bo'lgan kanallar va davlatlarni tortib olamiz
    const { data: channels } = await supabase
      .from("channels")
      .select("id, updated_at")
      .eq("is_online", true);
    const { data: countries } = await supabase
      .from("countries")
      .select("iso_code");

    // XML faylni shakllantirishni boshlaymiz
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Asosiy va doimiy sahifalar
    xml += `  <url>\n    <loc>${DOMAIN}/</loc>\n    <changefreq>always</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${DOMAIN}/search</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;

    // 2. Davlatlar ro'yxati
    if (countries) {
      countries.forEach((country) => {
        xml += `  <url>\n    <loc>${DOMAIN}/country/${country.iso_code}</loc>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
      });
    }

    // 3. Kanallar (Eng muhimi - Bazadan keladigan avtomatik ro'yxat)
    if (channels) {
      channels.forEach((channel) => {
        // Qachon yangilanganini Google'ga aytish (Bu reytingni juda oshiradi)
        const lastMod = channel.updated_at
          ? new Date(channel.updated_at).toISOString()
          : new Date().toISOString();

        xml += `  <url>\n    <loc>${DOMAIN}/channel/${channel.id}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
      });
    }

    xml += `</urlset>`;

    // Googlebot va Brauzerlarga buni oddiy matn emas, XML ekanligini aytamiz
    res.setHeader("Content-Type", "text/xml");

    // Server qotmasligi uchun 1 soat keshlaymiz (Stale-while-revalidate strategiyasi)
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");

    // Natijani yuboramiz
    res.status(200).send(xml);
  } catch (error) {
    console.error("Sitemap xatosi:", error);
    res.status(500).send("Sitemap yaratishda xatolik");
  }
}
