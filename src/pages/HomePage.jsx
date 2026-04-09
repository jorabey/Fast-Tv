import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";
import IOSLoader from "../components/IOSLoader";

// Agar bazada rasm bo'lmasa, zaxira sifatida emoji ishlatamiz
const getFlagEmoji = (isoCode) => {
  if (!isoCode) return "🌍";
  return isoCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

export default function HomePage() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  // Ma'lumotlarni tortish funksiyasi
  const fetchStats = async () => {
    const { data } = await supabase
      .from("country_channel_stats")
      .select("*")
      .order("total_active_channels", { ascending: false });

    if (data) setStats(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();

    // REALTIME: Agar davlat yoki kanal o'zgarsa, ro'yxatni avtomatik yangilaymiz
    const channelsSub = supabase
      .channel("public:channels")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        () => fetchStats(),
      )
      .subscribe();

    const countriesSub = supabase
      .channel("public:countries")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "countries" },
        () => fetchStats(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelsSub);
      supabase.removeChannel(countriesSub);
    };
  }, []);

  // Qidiruv mantiqi
  const filteredStats = useMemo(() => {
    if (!search.trim()) return stats;
    return stats.filter(
      (c) =>
        c.country_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.region_name &&
          c.region_name.toLowerCase().includes(search.toLowerCase())),
    );
  }, [stats, search]);

  // iOS Klaviaturani aqlli yopish (Scroll qilinganda)
  const handleScrollStart = () => {
    if (document.activeElement === inputRef.current) {
      inputRef.current.blur();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[100dvh] w-full bg-[var(--bg-system)]">
        <IOSLoader size={36} color="var(--blue-ios)" />
      </div>
    );
  }

  return (
    // 🌟 ASOSIY KONTEYNER: position absolute bilan ekranga qotiriladi
    <div className="absolute inset-0 flex flex-col w-full h-[100dvh] bg-[var(--bg-system)] overflow-hidden animate-fade-in pt-2">
      {/* Sarlavha - Doim ko'rinib turadi, Qimirlamaydi */}
      <h1
        className="text-[34px] font-bold tracking-tight mb-4 px-4 shrink-0 mt-[max(env(safe-area-inset-top),16px)]"
        style={{ color: "var(--text-primary)" }}
      >
        Davlatlar
      </h1>

      {/* iOS Asil Search Bar - Qimirlamaydi */}
      <div className="px-4 mb-4 shrink-0">
        <div
          className="relative flex items-center h-[40px] w-full rounded-[10px] overflow-hidden transition-all"
          style={{ backgroundColor: "var(--search-bg)" }}
        >
          <Search
            size={18}
            className="absolute left-2.5"
            style={{ color: "var(--text-secondary)" }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Davlat qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-full bg-transparent outline-none pl-9 pr-8 text-[16px] font-medium"
            style={{
              color: "var(--text-primary)",
              caretColor: "var(--blue-ios)",
            }}
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                inputRef.current.focus();
              }}
              className="absolute right-2.5 p-1 active:opacity-50"
            >
              <XCircle size={18} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
        </div>
      </div>

      {/* KONTENT MAYDONI - Faqat shu qism scroll bo'ladi */}
      <div
        className="flex-1 overflow-y-auto hide-scrollbar w-full overscroll-none"
        onTouchStart={handleScrollStart}
      >
        {/* Kontentning ichki qismi (Paddinglar bilan) */}
        <div className="px-4 pb-[env(safe-area-inset-bottom,100px)] min-h-full">
          {/* Kanallar Gridi (iOS Widget dizayni) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredStats.map((country) => (
              <Link
                key={country.country_id || country.iso_code}
                to={`/country/${country.iso_code?.toLowerCase()}`}
                className="p-4 flex flex-col justify-between aspect-square rounded-[20px] transition-transform active:scale-[0.96] border shadow-sm"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--separator)",
                }}
              >
                {/* Tepa qism: Rasm va Sanoq */}
                <div className="flex justify-between items-start w-full gap-2">
                  {/* Haqiqiy bazadagi rasm (URL) */}
                  {country.flag_url ? (
                    <img
                      src={country.flag_url}
                      alt={country.country_name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-black/5 bg-gray-100"
                    />
                  ) : (
                    <span className="text-[38px] leading-none drop-shadow-sm shrink-0">
                      {getFlagEmoji(country.iso_code)}
                    </span>
                  )}

                  {/* iOS Badge (TV Soni) */}
                  <div
                    className="px-2.5 py-1 rounded-full font-bold text-[11px] shrink-0"
                    style={{
                      backgroundColor: "var(--search-bg)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {country.total_active_channels} TV
                  </div>
                </div>

                {/* Pastki qism: Nom va mintaqa */}
                <div className="flex flex-col mt-auto w-full">
                  <h2
                    className="font-semibold text-[15px] leading-tight truncate mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {country.country_name}
                  </h2>
                  <span
                    className="text-[12px] font-medium truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {country.region_name || "Mintaqa mavjud emas"}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Qidiruvda topilmasa */}
          {filteredStats.length === 0 && search && (
            <div className="flex flex-col items-center justify-center pt-20">
              <p
                className="text-[17px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Davlat topilmadi
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
