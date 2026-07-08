export function IconHome({ active = false }: { active?: boolean }) {
  return <span className={active ? "text-blue-700" : "text-slate-500"}>⌂</span>;
}

export function IconCart({ active = false }: { active?: boolean }) {
  return <span className={active ? "text-blue-700" : "text-slate-500"}>🛒</span>;
}

export function IconOrder({ active = false }: { active?: boolean }) {
  return <span className={active ? "text-blue-700" : "text-slate-500"}>▤</span>;
}

export function IconUser({ active = false }: { active?: boolean }) {
  return <span className={active ? "text-blue-700" : "text-slate-500"}>♡</span>;
}

export function IconMenu() {
  return <span className="text-2xl leading-none text-slate-900">☰</span>;
}

export function IconBell({ count }: { count?: number }) {
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-slate-900 ring-1 ring-slate-200">
      🔔
      {!!count && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white">
          {count}
        </span>
      )}
    </span>
  );
}

export function IconSearch() {
  return <span className="text-2xl leading-none text-slate-900">⌕</span>;
}