import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, XCircle, Tv, SearchX } from "lucide-react";
import { supabase } from "../lib/supabase";
import IOSLoader from "../components/IOSLoader";

const ITEMS_PER_PAGE = 30; // Har safar pastga tushganda nechta kanal yuklanishi

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Paginatsiya State'lari
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true); // Boshlang'ich yuklanish
  const [loadingMore, setLoadingMore] = useState(false); // Pastga tortgandagi yuklanish
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true); // Yana kanal qoldimi?

  const inputRef = useRef(null);
  const observerTarget = useRef(null); // Ekranning eng pastini sezuvchi "Kuzatuvchi"

  // 1. Debounce (Yozishni to'xtatgandan 0.5s keyin qidiradi)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  // 2. Kanallarni tortib keluvchi Asosiy Funksiya (Davlat va Kategoriyani ham olib keladi)
  const fetchChannels = async (pageNum, searchQuery, isNewSearch = false) => {
    if (isNewSearch) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let dbQuery = supabase
      .from("channels")
      .select("*, countries(iso_code), categories(name)") // Logo va qayerga tegishliligini olish uchun
      .eq("is_online", true) // Faqat onlinelar ko'rinadi
      .order("name", { ascending: true })
      .range(from, to);

    // Agar qidiruvga yozilgan bo'lsa, shuni izlaydi
    if (searchQuery.trim()) {
      dbQuery = dbQuery.ilike("name", `%${searchQuery}%`);
    }

    const { data, error } = await dbQuery;

    if (!error && data) {
      if (isNewSearch) {
        setChannels(data); // Yangi qidiruv bo'lsa, ro'yxatni yangilaydi
      } else {
        setChannels((prev) => {
          // Dublikatlarni oldini olish (Realtime bilan kelgan ma'lumotlar ustma-ust tushmasligi uchun)
          const newChannels = data.filter(
            (d) => !prev.some((p) => p.id === d.id),
          );
          return [...prev, ...newChannels];
        });
      }
      // Agar kelgan data belgilanganidan kam bo'lsa, demak baza tugadi
      setHasMore(data.length === ITEMS_PER_PAGE);
    }

    setPage(pageNum);
    setLoading(false);
    setLoadingMore(false);
  };

  // 3. Qidiruv so'zi o'zgarganda (yoki boshida) 0-sahifadan boshlab yuklash
  useEffect(() => {
    fetchChannels(0, debouncedQuery, true);
  }, [debouncedQuery]);

  // 4. SUPABASE REALTIME: Qidiruv sahifasida ham jonli yangilanishlar
  useEffect(() => {
    const channelSub = supabase
      .channel("public:channels:search")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            if (payload.new.is_online) {
              // Yangi kanalni eng boshiga qo'shamiz (Faqat online bo'lsa)
              setChannels((prev) => [payload.new, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            if (payload.new.is_online) {
              // Yangilanganda, state ni o'zgartiramiz
              setChannels((prev) =>
                prev.map((c) =>
                  c.id === payload.new.id ? { ...c, ...payload.new } : c,
                ),
              );
            } else {
              // Offline bo'lib qolsa, qidiruvdan olib tashlaymiz
              setChannels((prev) =>
                prev.filter((c) => c.id !== payload.new.id),
              );
            }
          } else if (payload.eventType === "DELETE") {
            // O'chirilsa, olib tashlaymiz
            setChannels((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channelSub);
  }, []);

  // 5. Ekranning pastiga yetib kelganda keyingi sahifani yuklash (Infinite Scroll)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchChannels(page + 1, debouncedQuery, false);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, debouncedQuery]);

  // iOS Klaviaturani aqlli yopish
  const handleScrollStart = () => {
    if (document.activeElement === inputRef.current) inputRef.current.blur();
  };

  return (
    // 🌟 ASOSIY KONTEYNER: position absolute bilan ekran o'lchamiga mixlanadi va qimirlamaydi (overflow-hidden)
    <div className="absolute inset-0 flex flex-col w-full h-[100dvh] bg-[var(--bg-system)] overflow-hidden animate-fade-in pt-2">
      {/* Sarlavha - Doim ko'rinib turadi, scroll bo'lmaydi */}
      <h1
        className="text-[34px] font-bold tracking-tight mb-4 pl-1 shrink-0 px-4 mt-[max(env(safe-area-inset-top),16px)]"
        style={{ color: "var(--text-primary)" }}
      >
        Qidiruv
      </h1>

      {/* iOS Search Bar - Doim ko'rinib turadi, scroll bo'lmaydi */}
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
            placeholder="Kanal nomini qidirish..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-full bg-transparent outline-none pl-9 pr-8 text-[16px] font-medium"
            style={{
              color: "var(--text-primary)",
              caretColor: "var(--blue-ios)",
            }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current.focus();
              }}
              className="absolute right-2.5 p-1 active:opacity-50"
            >
              <XCircle size={18} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
        </div>
      </div>

      {/* Natijalar maydoni - Faqat shu qism scroll bo'ladi. flex-1 orqali qolgan barcha bo'sh joyni egallaydi.
          Overscroll behavior contain: Safari'dagi "bounce" effektini yopish uchun yordam beradi */}
      <div
        className="flex-1 overflow-y-auto hide-scrollbar w-full overscroll-none"
        onTouchStart={handleScrollStart}
      >
        <div className="px-4 pb-[env(safe-area-inset-bottom,100px)] pt-2 min-h-full">
          {/* Yangi qidiruvda (Boshlang'ich) yuklanish */}
          {loading && channels.length === 0 ? (
            <div className="flex justify-center pt-10">
              <IOSLoader size={36} color="var(--blue-ios)" />
            </div>
          ) : channels.length > 0 ? (
            /* Natijalar ro'yxati */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {channels.map((channel) => (
                <Link
                  key={channel.id}
                  to={`/channel/${channel.id}`}
                  className="p-4 rounded-[16px] transition-transform active:scale-[0.96] flex flex-col items-center justify-center gap-3 shadow-sm border border-[var(--separator)] bg-[var(--bg-card)]"
                >
                  {/* Logo yoki Ikonka (iOS App Icon uslubida) */}
                  {channel.logo_url ? (
                    <img
                      src={channel.logo_url}
                      alt={channel.name}
                      className="w-14 h-14 rounded-[12px] object-cover bg-gray-100 shadow-sm border border-black/5"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-[12px] flex items-center justify-center"
                      style={{ backgroundColor: "var(--search-bg)" }}
                    >
                      <Tv size={28} style={{ color: "var(--blue-ios)" }} />
                    </div>
                  )}

                  <div className="flex flex-col items-center w-full min-w-0">
                    <span
                      className="text-[14px] font-semibold truncate w-full text-center"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {channel.name}
                    </span>

                    {/* Pastki yordamchi yozuv (Kategoriya va Davlat) */}
                    {(channel.categories?.name ||
                      channel.countries?.iso_code) && (
                      <span className="text-[11px] font-medium opacity-60 truncate w-full text-center mt-0.5">
                        {channel.categories?.name || "Kanal"}{" "}
                        {channel.countries?.iso_code
                          ? `• ${channel.countries.iso_code}`
                          : ""}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Hech narsa topilmasa */
            <div className="flex flex-col items-center justify-center pt-20">
              <SearchX
                size={56}
                style={{ color: "var(--separator)" }}
                className="mb-4"
              />
              <p
                className="text-[17px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Natija topilmadi
              </p>
            </div>
          )}

          {/* PASTGA TORTGANDA YUKLANISHI UCHUN "KUZATUVCHI" (Observer) */}
          {!loading && hasMore && channels.length > 0 && (
            <div
              ref={observerTarget}
              className="flex justify-center py-6 w-full"
            >
              <IOSLoader size={24} color="var(--text-secondary)" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
