"use client";
import { useCanvasStore } from "@/store/canvasStore";

const strokeColors = ["#ffffff", "#6366f1", "#f43f5e", "#22c55e", "#f59e0b", "#38bdf8"];
const fillColors = ["#6366f1", "#f43f5e", "#22c55e", "#f59e0b", "#38bdf8", "#0a0a0a"];

export default function StylePanel() {
  const {
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    fillColor,
    setFillColor,
    fillStyle,
    setFillStyle,
  } = useCanvasStore();

  return (
    <div
      className="absolute left-4 top-16 z-10 flex flex-col gap-4 p-4 rounded-xl w-52"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {/* Stroke Color */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
          Stroke Color
        </label>
        <div className="grid grid-cols-6 gap-2">
          {strokeColors.map((c) => (
            <button
              key={c}
              onClick={() => setStrokeColor(c)}
              className="w-6 h-6 rounded-md border border-white/5 transition-transform hover:scale-105"
              style={{
                background: c,
                outline: strokeColor === c ? "2px solid var(--primary)" : "none",
                outlineOffset: "1px",
              }}
            />
          ))}
        </div>
      </div>

      {/* Fill Style */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
          Fill Style
        </label>
        <div className="flex gap-1.5 rounded-lg p-0.5 bg-[var(--bg)] border border-[var(--border)]">
          {[
            { id: "none", label: "Outline" },
            { id: "hachure", label: "Hachure" },
            { id: "solid", label: "Solid" },
          ].map((style) => (
            <button
              key={style.id}
              onClick={() => setFillStyle(style.id as any)}
              className="flex-1 py-1 text-[10px] font-medium rounded-md transition-colors"
              style={{
                background: fillStyle === style.id ? "var(--surface)" : "transparent",
                color: fillStyle === style.id ? "var(--text-primary)" : "var(--text-secondary)",
                border: fillStyle === style.id ? "1px solid var(--border)" : "1px solid transparent",
              }}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fill Color (only if fill style is hachure or solid) */}
      {fillStyle !== "none" && (
        <div className="space-y-1.5 transition-all">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
            Background / Fill Color
          </label>
          <div className="grid grid-cols-6 gap-2">
            {fillColors.map((c) => (
              <button
                key={c}
                onClick={() => setFillColor(c)}
                className="w-6 h-6 rounded-md border border-white/5 transition-transform hover:scale-105"
                style={{
                  background: c,
                  outline: fillColor === c ? "2px solid var(--primary)" : "none",
                  outlineOffset: "1px",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Stroke Width */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">
            Stroke Width
          </label>
          <span className="text-[10px] font-semibold text-[var(--text-primary)] font-mono">
            {strokeWidth}px
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="w-full h-1 bg-[var(--bg)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)] border border-[var(--border)]"
        />
      </div>
    </div>
  );
}
