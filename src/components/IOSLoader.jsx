import React from "react";

export default function IOSLoader({ size = 28, color = "#8E8E93" }) {
  return (
    <div className="flex justify-center items-center w-full">
      <svg
        className="animate-[spin_1s_linear_infinite]"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="12"
            y1="2"
            x2="12"
            y2="6" // Chiziq uzunligi iOS'ga juda mos tushishi uchun "6" qilindi
            transform={`rotate(${i * 30} 12 12)`}
            opacity={Math.max(0.2, (i + 1) / 12)} // Minimal ko'rinish 0.2 qilib qo'yildi
          />
        ))}
      </svg>
    </div>
  );
}
