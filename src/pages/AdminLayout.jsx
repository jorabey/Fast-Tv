import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { UserCircle, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import IOSLoader from "../components/IOSLoader";
import AdminCrudTab from "../components/AdminCrudTab";
import { IOSToast } from "../components/IOSUI";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState("regions");

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session),
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) showToast("Email yoki parol noto'g'ri", "error");
    else showToast("Tizimga kirdingiz", "success");
    setIsLoggingIn(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loadingAuth)
    return (
      <div className="flex justify-center pt-32">
        <IOSLoader size={36} color="var(--blue-ios)" />
      </div>
    );

  const schemas = {
    regions: [
      { key: "name", label: "Nomi", placeholder: "Yevropa" },
      { key: "slug", label: "Slug", placeholder: "yevropa" },
      { key: "description", label: "Tavsif", placeholder: "Ma'lumot..." },
    ],
    categories: [
      { key: "name", label: "Nomi", placeholder: "Kino, Sport..." },
      { key: "slug", label: "Slug", placeholder: "kino" },
    ],
    countries: [
      { key: "name", label: "Nomi", placeholder: "O'zbekiston" },
      { key: "iso_code", label: "ISO Kod", placeholder: "UZ" },
      { key: "utc_offset", label: "UTC", placeholder: "+5" },
      {
        key: "flag_url",
        label: "Bayroq",
        type: "image",
        placeholder: "URL yoki fayl...",
      },
      {
        key: "region_id",
        label: "Mintaqa",
        type: "select",
        relationTable: "regions",
      },
      { key: "is_active", label: "Aktiv", type: "boolean" },
    ],
    channels: [
      { key: "name", label: "Kanal", placeholder: "Navo TV" },
      { key: "stream_url", label: "Stream URL", placeholder: "https://..." },
      {
        key: "logo_url",
        label: "Logo",
        type: "image",
        placeholder: "URL yoki fayl...",
      },
      { key: "resolution", label: "Sifat", placeholder: "1080p, 720p" },
      {
        key: "languages",
        label: "Tillar",
        type: "array",
        placeholder: "uz, ru, en",
      },
      { key: "user_agent", label: "User Agent", placeholder: "VLC/3.0" },
      { key: "http_referrer", label: "Referer", placeholder: "https://..." },
      {
        key: "category_id",
        label: "Kategoriya",
        type: "select",
        relationTable: "categories",
      },
      {
        key: "country_id",
        label: "Davlat",
        type: "select",
        relationTable: "countries",
      },
      { key: "is_online", label: "Online", type: "boolean" },
    ],
  };

  return (
    <div className="h-[100dvh] relative flex flex-col w-full bg-[var(--bg-system)]">
      {toast.show && <IOSToast message={toast.message} type={toast.type} />}

      {!session ? (
        // --- TIZIMGA KIRISH (LOGIN) SAHIFASI ---
        <div className="fixed inset-0 z-[100] flex flex-col animate-slide-up bg-[var(--bg-system)]">
          <div className="h-[44px] flex items-center px-2 mt-[max(env(safe-area-inset-top),16px)]">
            {/* ORQAGA TUGMASI - To'g'irlangan */}
            <button
              onClick={() => navigate("/")} // Har doim bosh sahifaga qaytadi
              className="flex items-center gap-1 text-[17px] active:opacity-50 text-[var(--blue-ios)]"
            >
              <ChevronLeft size={28} className="-ml-2" /> <span>Ortga</span>
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center pt-8 px-4">
            <UserCircle
              size={80}
              strokeWidth={1}
              className="mb-6 text-[var(--text-secondary)]"
            />
            <h1 className="text-[28px] font-semibold tracking-tight text-center mb-2 text-[var(--text-primary)]">
              Boshqaruv
            </h1>
            <form onSubmit={handleLogin} className="w-full max-w-sm mt-8">
              <div className="rounded-[10px] overflow-hidden mb-6 bg-[var(--bg-card)]">
                <div className="flex items-center h-[44px] px-4 relative">
                  <span className="w-24 text-[16px] text-[var(--text-primary)]">
                    Email
                  </span>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoCapitalize="off"
                    autoComplete="off"
                    className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-[var(--text-primary)]"
                  />
                  <div className="absolute bottom-0 left-4 right-0 h-[0.5px] bg-[var(--separator)]"></div>
                </div>
                <div className="flex items-center h-[44px] px-4 relative">
                  <span className="w-24 text-[16px] text-[var(--text-primary)]">
                    Parol
                  </span>
                  <input
                    type="password"
                    placeholder="Parol"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent outline-none text-[16px] text-[var(--text-primary)]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoggingIn || !email || !password}
                className="w-full h-[50px] rounded-[14px] font-semibold text-[17px] active:scale-[0.98] transition-transform flex items-center justify-center text-white"
                style={{
                  backgroundColor:
                    email && password ? "var(--blue-ios)" : "var(--search-bg)",
                }}
              >
                {isLoggingIn ? <IOSLoader size={24} color="white" /> : "Kirish"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // --- ADMIN PANEL (BOSHQARUV) SAHIFASI ---
        <div className="animate-fade-in flex flex-col h-full w-full">
          {/* 🌟 HAQIQIY iOS NAVIGATION BAR 🌟 */}
          <div className="h-[44px] flex items-center justify-between px-4 mt-[max(env(safe-area-inset-top),16px)] shrink-0 relative mb-2">
            <button
              onClick={() => navigate("/")}
              className="flex items-center -ml-3 text-[17px] text-[var(--blue-ios)] active:opacity-50 transition-opacity"
            >
              <ChevronLeft size={28} />
              <span>Ortga</span>
            </button>

            <span className="font-semibold text-[17px] text-[var(--text-primary)] absolute left-1/2 -translate-x-1/2">
              Boshqaruv
            </span>

            <button
              onClick={handleLogout}
              className="text-[17px] text-red-500 active:opacity-50 transition-opacity flex items-center gap-1"
            >
              Chiqish
            </button>
          </div>

          {/* Menyu Tablari (Scroll qilsa bo'ladi) */}
          <div className="px-2 mb-4 overflow-x-auto hide-scrollbar shrink-0">
            <div className="flex p-1 rounded-[8px] w-full min-w-max bg-[var(--search-bg)]">
              {[
                { id: "regions", label: "Mintaqalar" },
                { id: "categories", label: "Kategoriyalar" },
                { id: "countries", label: "Davlatlar" },
                { id: "channels", label: "Kanallar" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-[6px] text-[13px] font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? "shadow-sm bg-[var(--bg-card)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kontent Qismi - SCROLL BO'LISHI UCHUN O'ZGARTIRILDI */}
          <div className="flex-1 overflow-y-auto w-full px-2 pb-20">
            <AdminCrudTab
              key={activeTab}
              tableName={activeTab}
              title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              schema={schemas[activeTab]}
              onShowToast={showToast}
            />
          </div>
        </div>
      )}
    </div>
  );
}
