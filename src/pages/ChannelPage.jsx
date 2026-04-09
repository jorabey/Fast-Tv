import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Info,
  Globe,
  Activity,
  AlertTriangle,
  Share,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import TvPlayer from "../components/TvPlayer";
import IOSLoader from "../components/IOSLoader";
import { Helmet } from "react-helmet-async";

const triggerHaptic = () => {
  if (typeof window !== "undefined" && navigator.vibrate) {
    navigator.vibrate(40);
  }
};

export default function ChannelPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchChannel = async () => {
    const { data, error } = await supabase
      .from("channels")
      .select("*, countries(name, flag_url), categories(name)")
      .eq("id", id)
      .single();

    if (data && !error) setChannel(data);
    else setChannel(null);

    setLoading(false);
  };

  useEffect(() => {
    fetchChannel();

    const channelSub = supabase
      .channel(`public:channels:id_${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "channels",
          filter: `id=eq.${id}`,
        },
        () => {
          fetchChannel();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "channels",
          filter: `id=eq.${id}`,
        },
        () => {
          setChannel(null);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channelSub);
  }, [id]);

  const handleShare = async () => {
    triggerHaptic();
    if (navigator.share && channel) {
      try {
        await navigator.share({
          title: `${channel.name} - FastTV`,
          text: `${channel.name} kanalini jonli efirda tomosha qiling!`,
          url: window.location.href,
        });
      } catch (error) {
        console.log("Ulashish bekor qilindi", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Havola nusxalandi!");
    }
  };

  // EKRAN 1: Yuklanish
  if (loading) {
    return (
      <div className="absolute inset-0 flex justify-center items-center w-full h-[100dvh] bg-[var(--bg-system)] z-50">
        <IOSLoader size={36} color="var(--blue-ios)" />
      </div>
    );
  }

  // EKRAN 2: Xatolik (Kanal topilmasa)
  if (!channel) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center w-full h-[100dvh] bg-[var(--bg-system)] animate-fade-in z-50">
        <Helmet>
          <title>Kanal topilmadi - FastTV</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <AlertTriangle
          size={56}
          style={{ color: "var(--separator)" }}
          className="mb-4"
        />
        <p className="text-[17px] font-semibold text-[var(--text-primary)]">
          Kanal topilmadi
        </p>
        <p className="text-[14px] mt-1 text-center px-6 text-[var(--text-secondary)]">
          Bu kanal o'chirilgan yoki manzili o'zgargan bo'lishi mumkin.
        </p>
        <button
          onClick={() => {
            triggerHaptic();
            navigate(-1);
          }}
          className="mt-6 px-6 py-2.5 rounded-[12px] font-semibold active:scale-95 transition-transform"
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

  // EKRAN 3: ASOSIY PLEYER VA MA'LUMOTLAR
  return (
    // 🌟 ASOSIY KONTEYNER: position absolute bilan to'liq ekranga qotiriladi (Siljimaydi)
    <div className="absolute inset-0 flex flex-col w-full h-[100dvh] bg-[var(--bg-system)] overflow-hidden animate-fade-in md:pt-4 pt-2">
      <Helmet>
        <title>{channel.name} jonli efir tomosha qilish - FastTV</title>
        <meta
          name="description"
          content={`${channel.name} kanalini HD sifatda, qotmasdan, bepul va jonli efirda tomosha qiling. Barcha telekanallar bitta ilovada!`}
        />
        <meta property="og:title" content={`${channel.name} - Jonli efir`} />
        <meta
          property="og:image"
          content={channel.logo_url || "https://fasttv.uz/default-og.jpg"}
        />
        <meta property="og:url" content={window.location.href} />
      </Helmet>

      {/* iOS Tepa Navigatsiya (Header) - QOTIRILGAN */}
      <div className="flex items-center justify-between mb-4 px-2 mt-[max(env(safe-area-inset-top),16px)] md:mt-0 shrink-0 relative max-w-screen-xl mx-auto w-full">
        <button
          onClick={() => {
            triggerHaptic();
            navigate(-1);
          }}
          className="flex items-center -ml-2 text-[var(--blue-ios)] active:opacity-50 transition-opacity z-10 p-2"
        >
          <ChevronLeft size={30} strokeWidth={2} />
          <span className="text-[17px] font-medium tracking-tight">Ortga</span>
        </button>

        <span className="text-[16px] font-bold text-[var(--text-primary)] absolute left-1/2 -translate-x-1/2 truncate max-w-[200px] md:max-w-md text-center">
          {channel.name}
        </span>

        <button
          onClick={handleShare}
          className="p-2 active:opacity-50 transition-opacity text-[var(--blue-ios)] z-10"
        >
          <Share size={24} strokeWidth={1.5} />
        </button>
      </div>

      {/* 🌟 KONTENT QISMI (Video + Ma'lumot) SCROLL BO'LADI */}
      <div className="flex-1 overflow-y-auto hide-scrollbar overscroll-none w-full">
        {/* Desktopda markazlash va Yonma-yon qo'yish uchun max-w */}
        <div className="max-w-screen-lg mx-auto px-2 md:px-6 pb-[env(safe-area-inset-bottom,40px)] min-h-full flex flex-col md:flex-row gap-6 md:pt-4">
          {/* 1. Video Pleyer qismi (Desktopda chap tomonda, kengroq joy oladi) */}
          <div className="w-full md:w-[65%] shrink-0 relative z-10">
            <div className="w-full rounded-[16px] md:rounded-[24px] overflow-hidden shadow-lg bg-black aspect-video border border-black/10 dark:border-white/10">
              {channel.is_online ? (
                <TvPlayer channel={channel} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white bg-[#1C1C1E]">
                  <AlertTriangle
                    size={42}
                    className="text-red-500 mb-3 opacity-90 animate-pulse"
                  />
                  <span className="font-semibold text-[17px] tracking-tight">
                    Kanal hozirda Offline
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Kanal Ma'lumotlari (Desktopda o'ng tomonda) */}
          <div className="flex-1 md:w-[35%] w-full">
            <div
              className="rounded-[20px] md:rounded-[24px] p-5 shadow-sm border"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--separator)",
              }}
            >
              {/* Logo va Nom */}
              <div className="flex items-center gap-4 mb-8">
                {channel.logo_url ? (
                  <img
                    src={channel.logo_url}
                    alt="logo"
                    className="w-16 h-16 md:w-20 md:h-20 rounded-[14px] object-cover border shadow-sm shrink-0 bg-white"
                    style={{ borderColor: "var(--separator)" }}
                  />
                ) : (
                  <div
                    className="w-16 h-16 md:w-20 md:h-20 rounded-[14px] flex items-center justify-center border shadow-sm shrink-0"
                    style={{
                      backgroundColor: "var(--search-bg)",
                      borderColor: "var(--separator)",
                    }}
                  >
                    <span
                      className="text-[24px] md:text-[28px] font-bold uppercase"
                      style={{ color: "var(--blue-ios)" }}
                    >
                      {channel.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex flex-col">
                  <h1
                    className="text-[22px] md:text-[26px] font-bold tracking-tight leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {channel.name}
                  </h1>
                  <span
                    className="text-[14px] mt-1 font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Jonli Efir
                  </span>
                </div>
              </div>

              {/* Ma'lumotlar Ro'yxati */}
              <div className="space-y-5">
                {/* Davlat */}
                <div className="flex items-center gap-3.5">
                  <div
                    className="p-3 rounded-[12px] shrink-0"
                    style={{ backgroundColor: "var(--search-bg)" }}
                  >
                    <Globe size={22} style={{ color: "var(--blue-ios)" }} />
                  </div>
                  <div
                    className="flex-1 min-w-0 flex items-center justify-between border-b pb-3"
                    style={{ borderColor: "var(--separator)" }}
                  >
                    <div>
                      <p
                        className="text-[12px] uppercase font-bold tracking-wider"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Davlat
                      </p>
                      <p
                        className="text-[16px] font-semibold truncate mt-0.5"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {channel.countries?.name || "Noma'lum"}
                      </p>
                    </div>
                    {channel.countries?.flag_url && (
                      <img
                        src={channel.countries.flag_url}
                        alt="flag"
                        className="w-8 h-8 rounded-full object-cover border shadow-sm bg-gray-100"
                        style={{ borderColor: "var(--separator)" }}
                      />
                    )}
                  </div>
                </div>

                {/* Holat */}
                <div className="flex items-center gap-3.5">
                  <div
                    className="p-3 rounded-[12px] shrink-0"
                    style={{ backgroundColor: "var(--search-bg)" }}
                  >
                    <Activity size={22} style={{ color: "var(--blue-ios)" }} />
                  </div>
                  <div
                    className="flex-1 min-w-0 border-b pb-3"
                    style={{ borderColor: "var(--separator)" }}
                  >
                    <p
                      className="text-[12px] uppercase font-bold tracking-wider"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Holat
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={`w-3 h-3 rounded-full ${channel.is_online ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"}`}
                      ></div>
                      <p
                        className="text-[16px] font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {channel.is_online
                          ? "Online (Live)"
                          : "Offline (Ulanish yo'q)"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Kategoriya */}
                {channel.categories?.name && (
                  <div className="flex items-center gap-3.5">
                    <div
                      className="p-3 rounded-[12px] shrink-0"
                      style={{ backgroundColor: "var(--search-bg)" }}
                    >
                      <Info size={22} style={{ color: "var(--blue-ios)" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[12px] uppercase font-bold tracking-wider"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Kategoriya
                      </p>
                      <p
                        className="text-[16px] font-semibold truncate mt-0.5"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {channel.categories.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
