"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/sales", label: "Tổng quan", icon: "🏠" },
  { href: "/sales/products", label: "Sản phẩm", icon: "📦" },
  { href: "/sales/manual-order", label: "Lên đơn", icon: "+" },
  { href: "/sales/customers", label: "Khách", icon: "👥" },
  { href: "/sales/account", label: "Tài khoản", icon: "👤" },
];

export function SalesBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-1 pb-2 pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/sales" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-semibold">
              <span className={active ? "text-xl leading-none text-blue-700" : "text-xl leading-none text-slate-500"}>{item.icon}</span>
              <span className={active ? "text-blue-700" : "text-slate-500"}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
