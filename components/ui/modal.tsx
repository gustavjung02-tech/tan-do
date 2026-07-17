"use client";

import React from "react";

export default function Modal({ open, title, onClose, children, footer }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="fixed inset-0 bg-slate-950/40" onClick={onClose} />
      <section className="relative z-10 w-full max-w-md max-h-[90vh] rounded-3xl bg-white p-0 shadow-lg">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 rounded-t-3xl border-b bg-white p-4">
          <h3 className="text-lg font-black">{title}</h3>
          <button onClick={onClose} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">Đóng</button>
        </header>
        <div className="max-h-[70vh] overflow-auto p-4">
          {children}
        </div>
        {footer && (
          <div className="sticky bottom-0 z-20 border-t bg-white p-4">{footer}</div>
        )}
      </section>
    </div>
  );
}
