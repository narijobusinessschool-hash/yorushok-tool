"use client";

import { useEffect, useRef, useState } from "react";

// Web Audio APIで「チャリン」レジ音を生成
function playChaChing() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // コインが落ちる「チャリン」音を合成
    const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + duration);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.type = "sine";
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(1318, now, 0.3, 0.4);        // E6
    playTone(1568, now + 0.08, 0.25, 0.35); // G6
    playTone(2093, now + 0.15, 0.4, 0.3);  // C7
    playTone(2637, now + 0.22, 0.5, 0.25); // E7
  } catch { /* silent fail */ }
}

export default function AdminNotifier() {
  const [notification, setNotification] = useState<string | null>(null);
  const lastCountRef = useRef<number | null>(null);

  useEffect(() => {
    async function checkNewMembers() {
      try {
        const res = await fetch("/api/admin/member-count");
        if (!res.ok) return;
        const { count } = await res.json();

        if (lastCountRef.current === null) {
          lastCountRef.current = count;
          return;
        }

        if (count > lastCountRef.current) {
          const diff = count - lastCountRef.current;
          lastCountRef.current = count;
          playChaChing();
          setNotification(`🎉 新規会員が ${diff}名 登録しました！（合計 ${count}名）`);
          setTimeout(() => setNotification(null), 6000);
        }
      } catch { /* silent */ }
    }

    checkNewMembers();
    const timer = setInterval(checkNewMembers, 15000); // 15秒ごとにチェック
    return () => clearInterval(timer);
  }, []);

  if (!notification) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-bounce">
      <div className="rounded-2xl bg-[#1f7a43] px-6 py-3 shadow-2xl ring-1 ring-[#4ade80]/30">
        <p className="text-sm font-bold text-white">{notification}</p>
      </div>
    </div>
  );
}
