"use client";
import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt?: () => Promise<void>; userChoice?: Promise<{ outcome: string }> };

export function InstallAppButton() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(display-mode: standalone)").matches) {
      setShow(true);
      setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
      const handleBeforeInstallPrompt = (event: Event) => {
        event.preventDefault();
        setEvent(event as InstallEvent);
        setIos(false);
      };
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
        onClick={async () => {
          if (!event?.prompt) {
            setIos(true);
            return;
          }
          await event.prompt();
          const choice = await event.userChoice;
          if (choice?.outcome === "accepted") setShow(false);
        }}
      >
        Cài đặt ứng dụng Tân Đô F&B
      </button>
      {ios && (
        <p className="mt-2 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-900">
          iPhone/iPad: mở Safari → Chia sẻ → Thêm vào Màn hình chính.
        </p>
      )}
    </div>
  );
}
