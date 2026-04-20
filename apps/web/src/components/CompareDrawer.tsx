"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface CompareItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
}

const KEY = "skt:compare";
const MAX = 4;

function read(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(items: CompareItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("skt:compare:change"));
}

export function addToCompare(item: CompareItem) {
  const items = read();
  if (items.some((i) => i.id === item.id)) return;
  if (items.length >= MAX) {
    items.shift();
  }
  items.push(item);
  write(items);
}

export function removeFromCompare(id: string) {
  write(read().filter((i) => i.id !== id));
}

export function isInCompare(id: string): boolean {
  return read().some((i) => i.id === id);
}

export default function CompareDrawer() {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    setItems(read());
    const onChange = () => setItems(read());
    window.addEventListener("skt:compare:change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("skt:compare:change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-[72px] md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1rem)] max-w-3xl bg-white shadow-2xl border-2 border-brand rounded-xl px-3 py-2 flex items-center gap-2 animate-[slideUp_0.2s_ease]">
      <p className="text-xs font-semibold text-brand shrink-0 hidden sm:block">
        Compare ({items.length}/{MAX})
      </p>
      <div className="flex gap-2 flex-1 overflow-x-auto">
        {items.map((it) => (
          <div
            key={it.id}
            className="relative shrink-0 w-14 h-14 rounded border bg-gray-50 grid place-items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.image}
              alt={it.name}
              className="object-contain w-full h-full p-1"
            />
            <button
              onClick={() => removeFromCompare(it.id)}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none grid place-items-center shadow"
              aria-label="remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Link
        href="/compare"
        className="btn-primary !px-3 !py-1.5 text-xs shrink-0"
      >
        Compare →
      </Link>
      <button
        onClick={() => write([])}
        className="text-xs text-gray-500 px-2 shrink-0"
        aria-label="clear all"
      >
        Clear
      </button>
    </div>
  );
}
