import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const IOSToast = ({ message, type = "success", onClose }) => {
  if (!message) return null;

  return (
    // Responsive qoplama: kichik ekranlarda chetga taqalib qolmasligi uchun w-full va px-4 berildi
    <div className="fixed top-[max(env(safe-area-inset-top,20px),20px)] left-0 w-full px-4 flex justify-center z-[999999] pointer-events-none animate-slide-down">
      <div className="max-w-full flex items-center gap-2.5 px-4 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 dark:border-white/10 pointer-events-auto bg-white/85 dark:bg-[#1c1c1e]/85 backdrop-blur-xl">
        {/* Ikonkalar iOS tizim ranglarida */}
        {type === "success" ? (
          <CheckCircle2 size={22} className="text-[#34C759] shrink-0" />
        ) : (
          <AlertCircle size={22} className="text-[#FF3B30] shrink-0" />
        )}

        {/* Yozuv uzun bo'lsa sig'ishi uchun 'truncate' qo'shildi */}
        <span className="text-[15px] font-medium tracking-tight text-black dark:text-white truncate">
          {message}
        </span>
      </div>
    </div>
  );
};

export const IOSConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    // Orqa fon xiralashishi (Apple ishlatadigan blur-sm)
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-[2px] animate-fade-in px-4">
      {/* iOS Alert oynasi standart kengligi 270px */}
      <div className="w-[270px] flex flex-col overflow-hidden rounded-[14px] bg-[rgba(242,242,247,0.9)] dark:bg-[rgba(30,30,30,0.9)] backdrop-blur-2xl shadow-2xl animate-zoom-in">
        {/* Sarlavha va matn qismi */}
        <div className="p-4 pt-5 text-center border-b border-[#3C3C43]/20 dark:border-[#545458]/65">
          <h3 className="text-[17px] font-semibold text-black dark:text-white leading-snug">
            {title}
          </h3>
          {message && (
            <p className="text-[13px] mt-1 leading-tight text-[#3C3C43]/80 dark:text-[#EBEBF5]/60">
              {message}
            </p>
          )}
        </div>

        {/* Tugmalar */}
        <div className="flex h-[44px]">
          <button
            onClick={onCancel}
            className="flex-1 border-r border-[#3C3C43]/20 dark:border-[#545458]/65 text-[17px] font-normal text-[#007AFF] active:bg-black/10 dark:active:bg-white/10 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 text-[17px] font-semibold text-[#FF3B30] active:bg-black/10 dark:active:bg-white/10 transition-colors"
          >
            O'chirish
          </button>
        </div>
      </div>
    </div>
  );
};
