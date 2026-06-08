import { create } from "zustand";

export type Tool = "hand" | "select" | "rect" | "ellipse" | "line" | "pencil" | "text" | "eraser";

export interface Shape {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  fillStyle?: "none" | "hachure" | "solid";
  roughness: number;
  text?: string;
}

interface Camera {
  x: number;
  y: number;
  scale: number;
}

interface CanvasStore {
  shapes: Shape[];
  past: Shape[][];
  future: Shape[][];
  tool: Tool;
  camera: Camera;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  fillStyle: "none" | "hachure" | "solid";
  canvasBackground: string;
  showGrid: boolean;
  setTool: (tool: Tool) => void;
  setShapes: (shapes: Shape[]) => void;
  addShape: (shape: Shape) => void;
  removeShape: (id: string) => void;
  setCamera: (camera: Camera) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFillColor: (color: string) => void;
  setFillStyle: (style: "none" | "hachure" | "solid") => void;
  setCanvasBackground: (color: string) => void;
  setShowGrid: (show: boolean) => void;
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  updateShape: (id: string, updatedShape: Partial<Shape>) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  shapes: [],
  past: [],
  future: [],
  tool: "rect",
  camera: { x: 0, y: 0, scale: 1 },
  strokeColor: "#780000",
  strokeWidth: 2,
  fillColor: "#d4a373",
  fillStyle: "none",
  canvasBackground: "#fefae0",
  showGrid: true,
  setTool: (tool) => set({ tool }),
  setShapes: (shapes) => set({ shapes, past: [], future: [] }),
  addShape: (shape) =>
    set((s) => ({
      past: [...s.past, s.shapes],
      future: [],
      shapes: [...s.shapes, shape],
    })),
  removeShape: (id) =>
    set((s) => ({
      past: [...s.past, s.shapes],
      future: [],
      shapes: s.shapes.filter((sh) => sh.id !== id),
    })),
  setCamera: (camera) => set({ camera }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setFillColor: (fillColor) => set({ fillColor }),
  setFillStyle: (fillStyle) => set({ fillStyle }),
  setCanvasBackground: (canvasBackground) => set({ canvasBackground }),
  setShowGrid: (showGrid) => set({ showGrid }),
  saveToHistory: () =>
    set((s) => ({
      past: [...s.past, s.shapes],
      future: [],
    })),
  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {};
      const previous = s.past[s.past.length - 1];
      const newPast = s.past.slice(0, s.past.length - 1);
      return {
        past: newPast,
        future: [s.shapes, ...s.future],
        shapes: previous,
      };
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[0];
      const newFuture = s.future.slice(1);
      return {
        past: [...s.past, s.shapes],
        future: newFuture,
        shapes: next,
      };
    }),
  updateShape: (id, updatedShape) =>
    set((s) => ({
      past: [...s.past, s.shapes],
      future: [],
      shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...updatedShape } : sh)),
    })),
}));