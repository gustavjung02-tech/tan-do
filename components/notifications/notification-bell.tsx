"use client";
import {useEffect,useState} from "react";
import {supabaseBrowser} from "@/lib/supabase/client";
export function NotificationBell(){
 const [count,setCount]=useState(0); const [items,setItems]=useState<any[]>([]);
 async function load(){if(!supabaseBrowser)return;const {data}=await supabaseBrowser.auth.getSession();if(!data.session)return;const r=await fetch("/api/notifications",{headers:{Authorization:`Bearer ${data.session.access_token}`}});const j=await r.json();setCount(j.unreadCount||0);setItems(j.notifications||[])}
 useEffect(()=>{void load()},[]);
 return <button onClick={()=>void load()} className="relative rounded-xl p-2">??{count>0&&<span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-xs text-white">{count}</span>}{items.length>0&&<div className="hidden">{items[0].title}</div>}</button>
}
