"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);

  async function load() {
    const { data } = await supabaseBrowser!.auth.getSession();
    if (!data.session) return;
    const response = await fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    const json = await response.json();
    setItems(json.notifications ?? []);
    setCount(json.unreadCount ?? 0);
  }

  useEffect(() => {
    void load();
  }, []);

  async function read(id: string) {
    const { data } = await supabaseBrowser!.auth.getSession();
    if (!data.session) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Thông báo"
        onClick={() => {
          setOpen((value) => !value);
          void load();
        }}
        className="relative rounded-xl p-2 text-xl"
      >
        <span aria-hidden="true">🔔</span>
        {count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-xs text-white">{count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200">
          {items.length === 0 ? (
            <p className="text-sm text-slate-600">Chưa có thông báo</p>
          ) : (
            items.map((item) => (
              <button key={item.id} type="button" onClick={() => read(item.id)} className="mb-2 block w-full rounded-xl bg-slate-50 p-3 text-left">
                <b>{item.title}</b>
                <p className="text-xs">{item.message}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
