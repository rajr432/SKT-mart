"use client";

import { useState } from "react";

const CHART = [
  ["Size", "Chest (in)", "Waist (in)", "Length (in)"],
  ["S", "36", "30", "26"],
  ["M", "38", "32", "27"],
  ["L", "40", "34", "28"],
  ["XL", "42", "36", "29"],
  ["XXL", "44", "38", "30"],
];

export default function SizeGuideButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-brand underline"
      >
        Size guide
      </button>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Size Guide</h3>
              <button onClick={() => setOpen(false)} className="text-gray-500 text-xl">
                ×
              </button>
            </div>
            <table className="w-full text-sm border">
              <tbody>
                {CHART.map((row, i) => (
                  <tr
                    key={i}
                    className={i === 0 ? "bg-gray-100 font-semibold" : "border-t"}
                  >
                    {row.map((c, j) => (
                      <td key={j} className="px-2 py-1.5 text-center border-r last:border-r-0">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-3">
              Generic size chart. Actual fit may vary by brand.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
