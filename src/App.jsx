import React, { Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { Globe, Search, Settings, Tv } from "lucide-react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import IOSLoader from "./components/IOSLoader";

// Sahifalarni Lazy yuklash
const HomePage = React.lazy(() => import("./pages/HomePage"));
const CountryPage = React.lazy(() => import("./pages/CountryPage"));
const ChannelPage = React.lazy(() => import("./pages/ChannelPage"));
const SearchPage = React.lazy(() => import("./pages/SearchPage"));
const AdminLayout = React.lazy(() => import("./pages/AdminLayout"));

// Haptic Feedback (iOS uslubida titrash)
const triggerHaptic = () => {
  if (typeof window !== "undefined" && navigator.vibrate) {
    navigator.vibrate(40);
  }
};

// 🔴 OFLAYN DETEKTORI
const OnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 999999,
        backgroundColor: "#FF3B30",
        color: "white",
        textAlign: "center",
        padding: "env(safe-area-inset-top, 8px) 0 8px 0",
        fontSize: "14px",
        fontWeight: "600",
        animation: "slideDown 0.3s ease-out",
      }}
    >
      <style>{`@keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }`}</style>
      ⚠️ Internet tarmog'i uzildi
    </div>
  );
};

// 💻 DESKTOP UCHUN YON MENYU (SIDEBAR)
const DesktopSidebar = () => {
  const location = useLocation();

  // Admin yoki Video pleyer ichida menyu yashirinadi
  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/channel")
  ) {
    return null;
  }

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 ${
          isActive
            ? "bg-[var(--blue-ios)] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)]"
            : "hover:bg-[var(--search-bg)] text-[var(--text-primary)]"
        }`}
      >
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        <span className="font-semibold text-[16px]">{label}</span>
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-[260px] h-full bg-[var(--bg-system)] border-r border-[var(--separator)] shrink-0 py-8 px-4 z-50">
      {/* Logo qismi */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 rounded-xl bg-[var(--blue-ios)] flex items-center justify-center text-white shadow-md">
          <Tv size={24} strokeWidth={2.5} />
        </div>
        <span className="font-bold text-[24px] tracking-tight text-[var(--text-primary)]">
          FastTV
        </span>
      </div>

      {/* Navigatsiya tugmalari */}
      <nav className="flex flex-col gap-2">
        <NavItem to="/" icon={Globe} label="Davlatlar" />
        <NavItem to="/search" icon={Search} label="Qidiruv" />
        <NavItem to="/admin" icon={Settings} label="Boshqaruv" />
      </nav>

      <div className="mt-auto px-2 text-[12px] text-[var(--text-secondary)] font-medium">
        &copy; 2024 FastTV Web App
      </div>
    </aside>
  );
};

// 📱 MOBILE UCHUN PASTKI MUALLAQ MENYU (BOTTOM TAB BAR)
const MobileBottomBar = () => {
  const location = useLocation();

  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/country") ||
    location.pathname.startsWith("/channel")
  ) {
    return null;
  }

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={triggerHaptic}
        className="flex flex-col items-center justify-center flex-1 h-full relative"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div
          className={`flex flex-col items-center justify-center w-full h-full transition-transform duration-300 ${
            isActive ? "scale-105" : "active:scale-95"
          }`}
        >
          <Icon
            size={24}
            strokeWidth={isActive ? 2.5 : 2}
            style={{
              color: isActive ? "var(--blue-ios)" : "var(--text-secondary)",
            }}
          />
          <span
            className="text-[10px] font-semibold mt-1"
            style={{
              color: isActive ? "var(--blue-ios)" : "var(--text-secondary)",
            }}
          >
            {label}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <div className="md:hidden absolute bottom-0 left-0 w-full z-[9000] flex justify-center pb-[max(env(safe-area-inset-bottom),16px)] pt-4 pointer-events-none">
      <nav
        className="flex justify-between items-center w-[92%] max-w-sm h-[60px] px-2 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 dark:border-white/10 pointer-events-auto"
        style={{
          backgroundColor: "rgba(var(--bg-system), 0.85)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
        }}
      >
        <NavItem to="/" icon={Globe} label="Davlatlar" />
        <NavItem to="/search" icon={Search} label="Qidiruv" />
        <NavItem to="/admin" icon={Settings} label="Sozlamalar" />
      </nav>
    </div>
  );
};

export default function App() {
  // iOS Layout Fix
  useEffect(() => {
    const setDocHeight = () => {
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`,
      );
    };
    window.addEventListener("resize", setDocHeight);
    setDocHeight();

    // Qat'iy qulflash (Barcha qurilmalarda siljishni to'xtatadi)
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    return () => window.removeEventListener("resize", setDocHeight);
  }, []);

  return (
    <HelmetProvider>
      <Router>
        <Helmet>
          <title>FastTV - Jonli telekanallar</title>
        </Helmet>

        {/* 🌟 ASOSIY QOBIQ: To'liq ekran (Mobile va Desktop) */}
        <div className="flex w-full h-[100dvh] overflow-hidden bg-[var(--bg-system)] text-[var(--text-primary)] fixed inset-0">
          <OnlineStatus />

          {/* 💻 DESKTOP YON MENYUSI (Faqat katta ekranlarda chiqadi) */}
          <DesktopSidebar />

          {/* 📺 KONTENT MAYDONI: Barcha kontent shu yerda yotadi */}
          <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[var(--bg-system)]">
            {/* 🍎 MOBILE iOS HEADER (Katta ekranda yashirinadi) */}
            <Routes>
              <Route path="/admin/*" element={null} />
              <Route path="/country/*" element={null} />
              <Route path="/channel/*" element={null} />
              <Route
                path="*"
                element={
                  <header
                    className="md:hidden w-full z-[8000] shrink-0 pt-[max(env(safe-area-inset-top),16px)] relative"
                    style={{
                      backgroundColor: "rgba(var(--bg-system), 0.85)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                      borderBottom: "0.5px solid var(--separator)",
                    }}
                  >
                    <div className="h-[44px] flex items-center justify-center">
                      <span className="font-bold text-[18px] tracking-tight">
                        FastTV
                      </span>
                    </div>
                  </header>
                }
              />
            </Routes>

            {/* Asosiy Skroll va Router maydoni */}
            <main className="flex-1 w-full h-full relative overflow-hidden">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full pb-20">
                    <IOSLoader size={36} color="var(--blue-ios)" />
                  </div>
                }
              >
                {/* Eslatma: HomePage va SearchPage o'zini o'zi scroll qiladi.
                  Ularni max-w-7xl markazlashtirish orqali katta ekranda ham chiroyli ko'rsatamiz.
                */}
                <div className="w-full h-full mx-auto max-w-screen-2xl">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/country/:iso" element={<CountryPage />} />
                    <Route path="/channel/:id" element={<ChannelPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/admin/*" element={<AdminLayout />} />
                  </Routes>
                </div>
              </Suspense>
            </main>

            {/* 📱 MOBILE PASTKI MENYU (Katta ekranda yashirinadi) */}
            <MobileBottomBar />
          </div>
        </div>
      </Router>
    </HelmetProvider>
  );
}
