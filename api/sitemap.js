export default function handler(req, res) {
  // Brauzerga bu XML ekanligini aytamiz
  res.setHeader("Content-Type", "text/xml");
  
  // Faqat 1 ta linki bor oddiy xarita yuboramiz
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://fasttv.vercel.app/</loc>
    </url>
  </urlset>`;

  res.status(200).send(xml);
}
