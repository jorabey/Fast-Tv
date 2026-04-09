import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import {
  Plus,
  Search,
  XCircle,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import IOSLoader from "./IOSLoader";
import { IOSConfirmModal } from "./IOSUI";

const ITEMS_PER_PAGE = 30;

export default function AdminCrudTab({
  tableName,
  title,
  schema,
  onShowToast,
}) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectOptions, setSelectOptions] = useState({});
  const observerTarget = useRef(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // 🌟 YANGI: AQLLI DROPDOWN STATE 🌟
  const [dropdown, setDropdown] = useState({
    isOpen: false,
    key: null,
    top: 0,
    right: 0,
    isUp: false,
  });

  const [formData, setFormData] = useState({});
  const [filesToUpload, setFilesToUpload] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchItems = async (pageNum, query, isNew = false) => {
    if (isNew) setLoading(true);
    else setLoadingMore(true);

    const from = pageNum * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let dbQuery = supabase
      .from(tableName)
      .select("*")
      .order("name", { ascending: true })
      .range(from, to);
    if (query.trim()) dbQuery = dbQuery.ilike("name", `%${query}%`);

    const { data, error } = await dbQuery;

    if (!error && data) {
      if (isNew) setItems(data);
      else {
        setItems((prev) => {
          const newItems = data.filter((d) => !prev.some((p) => p.id === d.id));
          return [...prev, ...newItems];
        });
      }
      setHasMore(data.length === ITEMS_PER_PAGE);
    }
    setPage(pageNum);
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchItems(0, debouncedSearch, true);
  }, [debouncedSearch, tableName]);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-admin-${tableName}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName },
        (payload) => {
          if (payload.eventType === "INSERT")
            setItems((prev) => [payload.new, ...prev]);
          else if (payload.eventType === "UPDATE")
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? payload.new : item,
              ),
            );
          else if (payload.eventType === "DELETE")
            setItems((prev) =>
              prev.filter((item) => item.id !== payload.old.id),
            );
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [tableName]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore)
          fetchItems(page + 1, debouncedSearch, false);
      },
      { threshold: 1.0 },
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, debouncedSearch]);

  useEffect(() => {
    const fetchOptions = async () => {
      const options = {};
      for (const field of schema) {
        if (field.type === "select" && field.relationTable) {
          const { data } = await supabase
            .from(field.relationTable)
            .select("id, name")
            .order("name");
          options[field.key] = data || [];
        }
      }
      setSelectOptions(options);
    };
    if (isFormOpen) fetchOptions();
  }, [isFormOpen, schema]);

  const handleSave = async () => {
    if (!formData.name) return;
    setIsSaving(true);
    const cleanData = { ...formData };

    schema.forEach((field) => {
      if (cleanData[field.key] === "") cleanData[field.key] = null;
      if (field.type === "array" && typeof cleanData[field.key] === "string") {
        cleanData[field.key] = cleanData[field.key]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    });

    for (const key in filesToUpload) {
      const file = filesToUpload[key];
      const fileName = `${tableName}_${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage
        .from("images")
        .upload(`public/${fileName}`, file);

      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("images").getPublicUrl(`public/${fileName}`);
        cleanData[key] = publicUrl;
      } else onShowToast(`Rasm xato: ${error.message}`, "error");
    }

    if (tableName === "channels")
      cleanData.updated_at = new Date().toISOString();

    const { error } = editingItem
      ? await supabase
          .from(tableName)
          .update(cleanData)
          .eq("id", editingItem.id)
      : await supabase.from(tableName).insert([cleanData]);

    if (error) onShowToast(`Xato: ${error.message}`, "error");
    else {
      onShowToast("Muvaffaqiyatli saqlandi!", "success");
      setIsFormOpen(false);
    }
    setIsSaving(false);
  };

  const handleDeleteConfirm = async () => {
    setIsConfirmOpen(false);
    setIsSaving(true);
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", editingItem.id);
    if (error) onShowToast("O'chirishda xatolik yuz berdi", "error");
    else {
      onShowToast("O'chirildi", "success");
      setIsFormOpen(false);
    }
    setIsSaving(false);
  };

  const openForm = (item = null) => {
    setEditingItem(item);
    setFilesToUpload({});
    setDropdown({ isOpen: false, key: null, top: 0, right: 0, isUp: false }); // Reset dropdown

    if (item) {
      const processedItem = { ...item };
      schema.forEach((f) => {
        if (f.type === "array" && Array.isArray(processedItem[f.key]))
          processedItem[f.key] = processedItem[f.key].join(", ");
      });
      setFormData(processedItem);
    } else {
      const emptyForm = {};
      schema.forEach(
        (f) => (emptyForm[f.key] = f.type === "boolean" ? true : ""),
      );
      setFormData(emptyForm);
    }
    setIsFormOpen(true);
  };

  // 🌟 AQLLI KOORDINATA HISOBLAGICH 🌟
  const handleDropdownOpen = (e, fieldKey) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isUp = spaceBelow < 250; // Agar pastda 250px dan kam joy qolsa, tepaga ochiladi

    setDropdown({
      isOpen: true,
      key: fieldKey,
      top: isUp ? rect.top - 8 : rect.bottom + 8,
      right: window.innerWidth - rect.right, // Aynan tugma tugagan joyga to'g'rilaydi
      isUp: isUp,
    });
  };

  return (
    <div className="flex flex-col h-full relative animate-fade-in w-full">
      <div className="px-2 mb-4 shrink-0">
        <div className="relative flex items-center h-[36px] w-full rounded-[10px] overflow-hidden mb-3 bg-[var(--search-bg)]">
          <Search
            size={16}
            className="absolute left-2.5 text-[var(--text-secondary)]"
          />
          <input
            type="text"
            placeholder={`Qidirish...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-full bg-transparent outline-none pl-8 pr-8 text-[16px] text-[var(--text-primary)]"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 active:opacity-50"
            >
              <XCircle size={16} className="text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-1 text-[15px] active:opacity-50 ml-auto font-medium text-[var(--blue-ios)]"
        >
          <Plus size={18} /> Yangi qo'shish
        </button>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-1 pb-32">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-10">
            <IOSLoader size={28} />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-[15px] mt-10 text-[var(--text-secondary)]">
            Ma'lumot topilmadi
          </p>
        ) : (
          <div className="rounded-[12px] overflow-hidden bg-[var(--bg-card)]">
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => openForm(item)}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-black/5 transition-colors relative"
              >
                <div className="flex items-center gap-3 min-w-0 w-[90%]">
                  {(item.flag_url || item.logo_url) && (
                    <img
                      src={item.flag_url || item.logo_url}
                      alt="icon"
                      className="w-9 h-9 rounded-[8px] object-cover bg-gray-200 shrink-0 border border-black/5"
                    />
                  )}
                  <div className="flex flex-col items-start truncate min-w-0 w-full">
                    <span className="text-[16px] font-medium truncate w-full text-left text-[var(--text-primary)]">
                      {item.name}
                    </span>
                    <span className="text-[12px] opacity-60 truncate w-full text-left">
                      {item.slug ||
                        item.iso_code ||
                        item.resolution ||
                        "Batafsil"}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-[var(--separator)] shrink-0"
                />
                {index !== items.length - 1 && (
                  <div className="absolute bottom-0 left-4 right-0 h-[0.5px] bg-[var(--separator)]" />
                )}
              </button>
            ))}
          </div>
        )}
        {!loading && hasMore && items.length > 0 && (
          <div ref={observerTarget} className="flex justify-center py-6">
            <IOSLoader size={24} color="var(--text-secondary)" />
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[200] flex justify-center items-end sm:items-center bg-black/40 backdrop-blur-sm animate-fade-in px-0 sm:px-4">
          <div className="w-full max-w-md bg-[var(--bg-system)] sm:rounded-[24px] rounded-t-[24px] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up relative">
            <div className="h-[50px] flex items-center justify-between px-4 border-b bg-[var(--bg-card)] shrink-0 border-[var(--separator)] rounded-t-[24px] overflow-hidden">
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-[16px] active:opacity-50 text-[var(--blue-ios)]"
              >
                Bekor
              </button>
              <span className="font-semibold text-[16px] text-[var(--text-primary)]">
                {editingItem ? "Tahrirlash" : "Yangi"}
              </span>
              <button
                onClick={handleSave}
                disabled={isSaving || !formData.name}
                className="text-[16px] font-semibold active:opacity-50 disabled:opacity-30 text-[var(--blue-ios)]"
              >
                {isSaving ? "..." : "Saqlash"}
              </button>
            </div>

            {/* Skroll qilinganda dropdown avtomat yopiladi */}
            <div
              className="p-4 overflow-y-auto"
              onScroll={() =>
                setDropdown({
                  isOpen: false,
                  key: null,
                  top: 0,
                  right: 0,
                  isUp: false,
                })
              }
            >
              <div className="rounded-[10px] mb-6 border border-[var(--separator)] bg-[var(--bg-card)] overflow-hidden">
                {schema.map((field, idx) => (
                  <div
                    key={field.key}
                    className="flex items-center min-h-[44px] px-4 relative w-full"
                  >
                    <span className="w-[100px] text-[15px] font-medium shrink-0 text-[var(--text-primary)]">
                      {field.label}
                    </span>

                    {field.type === "boolean" ? (
                      <div className="flex-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              [field.key]: !formData[field.key],
                            })
                          }
                          className={`w-12 h-7 rounded-full p-1 transition-colors ${formData[field.key] ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"}`}
                        >
                          <div
                            className={`w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${formData[field.key] ? "translate-x-5" : "translate-x-0"}`}
                          />
                        </button>
                      </div>
                    ) : field.type === "select" ? (
                      // 🌟 AQLLI TUGMA (Bosganda koordinatani hisoblaydi) 🌟
                      <div className="flex-1 flex justify-end h-[44px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (dropdown.isOpen && dropdown.key === field.key)
                              setDropdown({ isOpen: false });
                            else handleDropdownOpen(e, field.key);
                          }}
                          className="flex items-center justify-end w-full h-full bg-transparent outline-none text-[16px] text-[var(--text-primary)] active:opacity-50"
                        >
                          <span className="truncate pr-1">
                            {formData[field.key]
                              ? selectOptions[field.key]?.find(
                                  (o) => o.id === formData[field.key],
                                )?.name
                              : "Tanlang..."}
                          </span>
                          {dropdown.isOpen && dropdown.key === field.key ? (
                            <ChevronDown
                              size={18}
                              className="text-[var(--separator)] shrink-0"
                            />
                          ) : (
                            <ChevronRight
                              size={18}
                              className="text-[var(--separator)] shrink-0"
                            />
                          )}
                        </button>
                      </div>
                    ) : field.type === "image" ? (
                      <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
                        {(filesToUpload[field.key] || formData[field.key]) && (
                          <img
                            src={
                              filesToUpload[field.key]
                                ? URL.createObjectURL(filesToUpload[field.key])
                                : formData[field.key]
                            }
                            alt="preview"
                            className="w-7 h-7 rounded object-cover shrink-0 bg-gray-200"
                          />
                        )}
                        <input
                          type="text"
                          placeholder={field.placeholder}
                          value={
                            filesToUpload[field.key]
                              ? "Fayl tanlandi"
                              : formData[field.key] || ""
                          }
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              [field.key]: e.target.value,
                            });
                            if (filesToUpload[field.key])
                              setFilesToUpload((prev) => {
                                const n = { ...prev };
                                delete n[field.key];
                                return n;
                              });
                          }}
                          className="flex-1 min-w-0 bg-transparent outline-none text-[16px] py-2 truncate text-[var(--text-primary)]"
                        />
                        <label className="shrink-0 p-1.5 bg-[var(--search-bg)] rounded-[8px] cursor-pointer active:opacity-50 text-[var(--blue-ios)]">
                          <ImageIcon size={18} />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files[0])
                                setFilesToUpload((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.files[0],
                                }));
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={formData[field.key] || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [field.key]: e.target.value,
                          })
                        }
                        className="flex-1 min-w-0 bg-transparent outline-none text-[16px] py-2 truncate text-[var(--text-primary)]"
                      />
                    )}
                    {idx !== schema.length - 1 && (
                      <div className="absolute bottom-0 left-4 right-0 h-[0.5px] bg-[var(--separator)] pointer-events-none"></div>
                    )}
                  </div>
                ))}
              </div>

              {editingItem && (
                <button
                  onClick={() => setIsConfirmOpen(true)}
                  className="w-full h-[44px] rounded-[10px] flex items-center justify-center font-medium text-red-500 bg-[var(--bg-card)] active:opacity-50 border border-[var(--separator)]"
                >
                  Ma'lumotni o'chirish
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 HAQIQIY SMART DROPDOWN (MODAL VA DIZAYNNI BUZMAYDI) 🌟 */}
      {dropdown.isOpen && (
        <div
          className="fixed inset-0 z-[400]"
          onClick={() => setDropdown({ isOpen: false })}
        >
          <div
            className="fixed w-[240px] bg-[var(--bg-card)] border border-[var(--separator)] rounded-[12px] shadow-2xl z-[410] overflow-hidden flex flex-col py-1 animate-fade-in"
            style={{
              top: dropdown.isUp ? "auto" : dropdown.top,
              bottom: dropdown.isUp
                ? window.innerHeight - dropdown.top
                : "auto",
              right: dropdown.right,
              maxHeight: "260px",
              transformOrigin: dropdown.isUp ? "bottom right" : "top right",
            }}
            onClick={(e) => e.stopPropagation()} // Ichiga bossa yopilib ketmasligi uchun
          >
            {/* Tanlanmagan holati (Tozalash) */}
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, [dropdown.key]: null });
                setDropdown({ isOpen: false });
              }}
              className="w-full flex items-center px-4 py-2.5 text-[15px] text-[var(--text-primary)] opacity-70 hover:bg-[var(--search-bg)] active:bg-[var(--search-bg)] transition-colors border-b border-[var(--separator)]"
            >
              Tanlanmagan
            </button>

            {/* Asosiy variantlar */}
            <div className="overflow-y-auto hide-scrollbar flex-1">
              {selectOptions[dropdown.key]?.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, [dropdown.key]: opt.id });
                    setDropdown({ isOpen: false });
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-[15px] font-medium text-[var(--text-primary)] hover:bg-[var(--search-bg)] active:bg-[var(--search-bg)] transition-colors"
                >
                  <span className="truncate pr-2">{opt.name}</span>
                  {formData[dropdown.key] === opt.id && (
                    <Check
                      size={18}
                      strokeWidth={3}
                      className="text-[var(--blue-ios)] shrink-0"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <IOSConfirmModal
        isOpen={isConfirmOpen}
        title="Tasdiqlang"
        message="Rostdan ham bu ma'lumotni o'chirib yuborasizmi?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
