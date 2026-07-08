"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt?: () => Promise<void>;
  userChoice?: Promise<{ outcome: string }>;
};

export function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [hidden, setHidden] = useState(true);
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone;

    if (standalone) {
      setHidden(true);
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);

    setHidden(false);
    setIosGuide(Boolean(isIos));

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
      setIosGuide(false);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden) return null;

  async function install() {
    if (iosGuide || !installEvent?.prompt) {
      setIosGuide(true);
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice?.outcome === "accepted") {
      setHidden(true);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={install}
        className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm"
      >
        📲 Cài ứng dụng Tân Đô
      </button>

      {iosGuide && (
        <div className="mt-3 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-900 ring-1 ring-blue-100">
          iPhone/iPad: bấm nút <b>Chia sẻ</b> trên Safari → chọn <b>Thêm vào Màn hình chính</b> để cài ứng dụng.
        </div>
      )}
    </div>
  );
}
