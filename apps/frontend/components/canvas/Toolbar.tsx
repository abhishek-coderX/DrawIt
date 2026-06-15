"use client";
import { useCanvasStore, Tool } from "@/store/canvasStore";

const tools: { id: Tool; label: string; icon: string }[] = [
  { id: "hand", label: "Pan / Hand tool", icon: "✋" },
  { id: "select", label: "Select & move shape", icon: "⬈" },
  { id: "rect", label: "Rectangle", icon: "▭" },
  { id: "ellipse", label: "Ellipse", icon: "◯" },
  { id: "line", label: "Line", icon: "╱" },
  { id: "pencil", label: "Pencil", icon: "✏" },
  { id: "text", label: "Text", icon: "Ｔ" },
  { id: "eraser", label: "Eraser", icon: "⌫" },
];

interface ToolbarProps {
  onToolSelect?: () => void;
}

export default function Toolbar({ onToolSelect }: ToolbarProps) {
  const { tool, setTool } = useCanvasStore();

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-2 rounded-xl"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Tools */}
      {tools.map((t) => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => {
            setTool(t.id);
            onToolSelect?.();
          }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all"
          style={{
            background: tool === t.id ? "var(--primary)" : "transparent",
            color: tool === t.id ? "white" : "var(--text-secondary)",
          }}
        >
          {t.icon}
        </button>
      ))}

    </div>
  );
}