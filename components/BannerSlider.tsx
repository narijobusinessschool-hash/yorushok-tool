"use client";

import { useEffect, useState, useCallback } from "react";

type Banner = {
  id: string;
  image_url: string;
  link_url: string;
  title: string;
};

export default function BannerSlider() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/banners")
      .then((r) => r.json())
      .then((d) => setBanners(d.banners ?? []))
      .catch(() => {});
  }, []);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // 自動スライド（5秒間隔）
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [banners.length, next]);

  if (banners.length === 0) return null;

  return (
    <div className="mb-6">
      {/* バナー表示エリア - スマホ 3:1 / PC 5:1 レスポンシブ */}
      <div className="relative overflow-hidden rounded-[16px]">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((b) => {
            const inner = (
              <img
                src={b.image_url}
                alt={b.title || "バナー"}
                className="w-full object-cover aspect-[3/1] sm:aspect-[4/1] lg:aspect-[5/1]"
                width={800}
                height={267}
                loading="lazy"
                draggable={false}
              />
            );
            return (
              <div key={b.id} className="w-full flex-shrink-0">
                {b.link_url ? (
                  <a href={b.link_url} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>

        {/* ドットナビゲーション */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i === current
                    ? "bg-[#e85d8a]"
                    : "bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`バナー ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
