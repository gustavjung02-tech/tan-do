"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store/app-store";

const items = [
  { href: "/customer", label: "Trang chủ", icon: "🏠" },
  { href: "/customer/cart", label: "Giỏ hàng", icon: "🛒", badge: "cart" },
  { href: "/customer/orders", label: "Đơn hàng", icon: "📋" },
  { href: "/customer/account", label: "Tài khoản", icon: "👤" },
];

export function CustomerBottomNav() {
  const pathname = usePathname();
  const { cartCount } = useAppStore();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-2 pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/customer" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold">
              <span className={active ? "text-2xl leading-none text-emerald-700" : "text-2xl leading-none text-slate-500"}>{item.icon}</span>
              <span className={active ? "text-emerald-700" : "text-slate-500"}>{item.label}</span>
              {item.badge === "cart" && cartCount > 0 && (
                <span className="absolute right-5 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
