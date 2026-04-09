import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Search,
  XCircle,
  Tv,
  SearchX,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import IOSLoader from "../components/IOSLoader";

const ITEMS_PER_PAGE = 30;

export default function CountryPage() {
  const { iso } = useParams();
  const navigate = useNavigate();

  const [country, setCountry] = useState(null);
  const [channels, setChannels] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const inputRef = useRef(null);
  const observerTarget = useRef(null);

  // 1. Debounce (Yozishni to'xtatganda qidiradi)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 2. Davlat ma'lumotini topish
  useEffect(() => {
    const fetchCountry = async () => {
      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("countries")
        .select("id, name, flag_url, iso_code")
        .ilike("iso_code", iso)
        .single();

      if (data) {
        setCountry(data);
      } else {
        console.error("Xato:", error);
        setErrorMsg("Davlat ma'lumotlari topilmadi");
        setLoading(false);
      }
    };
    if (iso) fetchCountry();
  }, [iso]);

  // 3. Kanallarni tortib kelish
  const fetchChannels = async (cId, pageNum, query, isNew = false) => {
    if (isNew) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let dbQuery = supabase
      .from("channels")
      .select("*")
      .eq("country_id", cId)
      .eq("is_online", true)
      .order("name", { ascending: true })
      .range(from, to);

    if (query.trim()) {
      dbQuery = dbQuery.ilike("name", `%${query}%`);
    }

    const { data, error } = await dbQuery;

    if (!error && data) {
      if (isNew) setChannels(data);
      else setChannels((prev) => [...prev, ...data]);
      setHasMore(data.length === ITEMS_PER_PAGE);
    }

    setPage(pageNum);
    setLoading(false);
    setLoadingMore(false);
  };

  // 4. Davlat ID si kelgach, kanallarni yuklashni boshlaydi
  useEffect(() => {
    if (country?.id) fetchChannels(country.id, 0, debouncedQuery, true);
  }, [country?.id, debouncedQuery]);

  // 5. SUPABASE REALTIME
  useEffect(() => {
    if (!country?.id) return;

    const channelSub = supabase
      .channel(`public:channels:country_${country.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels" },
        (payload) => {
          if (
            payload.new?.country_id === country.id ||
            payload.old?.country_id === country.id
          ) {
            if (payload.eventType === "INSERT" && payload.new.is_online) {
              setChannels((prev) => [payload.new, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              if (payload.new.is_online) {
                setChannels((prev) =>
                  prev.map((c) => (c.id === payload.new.id ? payload.new : c)),
                );
              } else {
                setChannels((prev) =>
                  prev.filter((c) => c.id !== payload.new.id),
                );
              }
            } else if (payload.eventType === "DELETE") {
              setChannels((prev) =>
                prev.filter((c) => c.id !== payload.old.id),
              );
            }
          }
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channelSub);
  }, [country?.id]);

  // 6. Infinite Scroll (Pastga tortganda yuklash)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loading &&
          !loadingMore &&
          country?.id
        ) {
          fetchChannels(country.id, page + 1, debouncedQuery, false);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, debouncedQuery, country?.id]);

  // Skroll payti klaviaturani yopish
  const handleScrollStart = () => {
    if (document.activeElement === inputRef.current) inputRef.current.blur();
  };

  // --- EKRAN 1: Boshlang'ich Yuklanish ---
  if (!country && loading) {
    return (
      <div className="fixed inset-0 flex justify-center items-center w-full h-[100dvh] bg-[var(--bg-system)]">
        <IOSLoader size={36} color="var(--blue-ios)" />
      </div>
    );
  }

  // --- EKRAN 2: Xatolik (Davlat topilmasa) ---
  if (!country && !loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center w-full h-[100dvh] bg-[var(--bg-system)] animate-fade-in">
        <AlertTriangle
          size={56}
          style={{ color: "var(--separator)" }}
          className="mb-4"
        />
        <p
          className="text-[17px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {errorMsg}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-6 py-2.5 rounded-full font-medium"
          style={{
            backgroundColor: "var(--search-bg)",
            color: "var(--blue-ios)",
          }}
        >
          Ortga qaytish
        </button>
      </div>
    );
  }

  // --- EKRAN 3: ASOSIY SAHIFA ---
  return (
    // 🌟 ASOSIY KONTEYNER: position absolute, overflow-hidden (qimirlamaydi)
    <div className="absolute inset-0 flex flex-col w-full h-[100dvh] bg-[var(--bg-system)] overflow-hidden animate-fade-in pt-2">
      {/* iOS Header - QOTIRILGAN */}
      <div className="flex items-center justify-between mb-4 px-2 mt-[max(env(safe-area-inset-top),16px)] shrink-0 relative">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center -ml-2 text-[var(--blue-ios)] active:opacity-50 transition-opacity"
        >
          <ChevronLeft size={28} strokeWidth={2} />
          <span className="text-[17px] font-medium tracking-tight">Ortga</span>
        </button>

        {/* O'rta qismdagi rasm va yozuvni markazlash */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          {country?.flag_url && (
            <img
              src={country.flag_url}
              alt="flag"
              className="w-5 h-5 rounded-full object-cover shadow-sm bg-gray-100"
            />
          )}
          <h1 className="text-[17px] font-semibold truncate max-w-[150px] text-[var(--text-primary)]">
            {country?.name}
          </h1>
        </div>
      </div>

      {/* Qidiruv Qutisi - QOTIRILGAN */}
      <div className="px-4 mb-4 shrink-0">
        <div
          className="relative flex items-center h-[40px] w-full rounded-[10px] overflow-hidden"
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
            placeholder="Kanal qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full bg-transparent outline-none pl-9 pr-8 text-[16px]"
            style={{
              color: "var(--text-primary)",
              caretColor: "var(--blue-ios)",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                inputRef.current.focus();
              }}
              className="absolute right-2.5 p-1 active:opacity-50"
            >
              <XCircle size={18} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
        </div>
      </div>

      {/* 🌟 KONTENT MAYDONI - Faqat shu qism scroll bo'ladi */}
      <div
        className="flex-1 overflow-y-auto hide-scrollbar w-full overscroll-none"
        onTouchStart={handleScrollStart}
      >
        <div className="px-4 pb-[env(safe-area-inset-bottom,100px)] min-h-full">
          {loading && channels.length === 0 ? (
            <div className="flex justify-center pt-10">
              <IOSLoader size={32} color="var(--blue-ios)" />
            </div>
          ) : channels.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {channels.map((channel) => (
                <Link
                  key={channel.id}
                  to={`/channel/${channel.id}`}
                  className="p-4 rounded-[16px] transition-transform active:scale-[0.96] flex flex-col items-center gap-3 shadow-sm border"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--separator)",
                  }}
                >
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
                  <span
                    className="text-[14px] font-semibold truncate w-full text-center"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {channel.name}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
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

          {/* Loader for Infinite Scroll */}
          {!loading && hasMore && channels.length > 0 && (
            <div ref={observerTarget} className="flex justify-center py-6">
              <IOSLoader size={24} color="var(--text-secondary)" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
