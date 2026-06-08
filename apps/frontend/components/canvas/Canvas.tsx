"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { useCanvasStore, Shape } from "@/store/canvasStore";
import { useDrawing } from "./useDrawing";
import Toolbar from "./Toolbar";
import StylePanel from "./StylePanel";
import { api } from "@/lib/api";
import { useWebSocket } from "@/hooks/useWebSocket";
import toast from "react-hot-toast";
import CursorOverlay from "./CursorOverlay";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "next/navigation";

const CURSOR_COLORS = [
  "#ef4444", 
  "#f97316", 
  "#f59e0b", 
  "#10b981", 
  "#06b6d4", 
  "#3b82f6", 
  "#6366f1", 
  "#8b5cf6", 
  "#ec4899", 
];

function getRandomColor() {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}

interface Props {
  roomId: string;
  adminId: string;
}

const backgroundPresets = [
  { name: "Warm Linen", color: "#fefae0" },
  { name: "Cream Card", color: "#f8db90b8" },
  { name: "Onyx Black", color: "#90a5bfff" },
  { name: "Slate Grey", color: "#292929ff" },
];

export default function Canvas({ roomId, adminId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getUserId } = useAuth();
  const isAdmin = getUserId() === adminId;
  const params = useParams();
  const roomSlug = typeof params?.roomId === "string" ? params.roomId : roomId;
  const {
    shapes,
    addShape,
    updateShape,
    setShapes,
    removeShape,
    undo,
    redo,
    camera,
    setCamera,
    canvasBackground,
    setCanvasBackground,
    saveToHistory,
    tool,
    showGrid,
    setShowGrid,
    strokeColor,
    strokeWidth,
    selectedShapeId,
    setSelectedShapeId,
    editingShapeId,
    setEditingShapeId,
  } = useCanvasStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        setSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  const {
    broadcastShape,
    broadcastBackground,
    broadcastClear,
    broadcastCursor,
    broadcastDeleteShape,
    connected,
    cursorsRef,
  } = useWebSocket(roomId);

  const [userName, setUserName] = useState("User");
  const myColor = useRef(getRandomColor());
  const lastCursorSendRef = useRef(0);

  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/user/me");
        if (res.data.user?.name) {
          setUserName(res.data.user.name);
        }
      } catch (e) {
        console.error("Failed to fetch user name:", e);
      }
    };
    fetchUser();
  }, []);

  const handleCursorMove = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      
      if (now - lastCursorSendRef.current > 33) {
        lastCursorSendRef.current = now;
        broadcastCursor(x, y, userName, myColor.current);
      }
    },
    [broadcastCursor, userName]
  );

  
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/chats/${roomId}`);
        const shapes: Shape[] = res.data.messages
          .map((m: { message: string }) => {
            try {
              return JSON.parse(m.message);
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        setShapes(shapes);
      } catch {
        toast.error("Failed to load canvas");
      }
    };
    load();
  }, [roomId, setShapes]);

  const [textInput, setTextInput] = useState<{ x: number; y: number; worldX: number; worldY: number } | null>(null);
  const [textValue, setTextValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textInput && textareaRef.current) {
      const el = textareaRef.current;
      const timer = setTimeout(() => {
        el.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [textInput]);

  
  useEffect(() => {
    setIsMenuOpen(false);
    if (tool !== "text") {
      setTextInput(null);
      setEditingShapeId(null);
    }
    if (tool !== "select") {
      setSelectedShapeId(null);
    }
  }, [tool, setSelectedShapeId, setEditingShapeId]);

  const handleTextSubmit = (value: string) => {
    if (!textInput) {
      setEditingShapeId(null);
      return;
    }

    if (editingShapeId) {
      if (value.trim()) {
        const existingShape = shapes.find((s) => s.id === editingShapeId);
        if (existingShape) {
          const updatedShape = {
            ...existingShape,
            text: value,
          };
          updateShape(editingShapeId, { text: value });
          broadcastShape(updatedShape);
        }
      } else {
        removeShape(editingShapeId);
        broadcastDeleteShape(editingShapeId);
      }
      setEditingShapeId(null);
    } else {
      if (value.trim()) {
        const shape: Shape = {
          id: Math.random().toString(36).slice(2, 9),
          type: "text",
          x: textInput.worldX,
          y: textInput.worldY,
          text: value,
          strokeColor,
          strokeWidth,
          roughness: 1,
        };
        addShape(shape);
        broadcastShape(shape);
      }
    }
    setTextInput(null);
  };

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== "select" && tool !== "text") return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    const world = {
      x: (clientX - camera.x) / camera.scale,
      y: (clientY - camera.y) / camera.scale,
    };

    const doubleClickedShape = useCanvasStore.getState().shapes.find((shape) => {
      if (shape.type !== "text" || !shape.text) return false;
      const width = shape.text.length * 10;
      const height = 24;
      const minX = Math.min(shape.x, shape.x + width);
      const maxX = Math.max(shape.x, shape.x + width);
      const minY = Math.min(shape.y, shape.y + height);
      const maxY = Math.max(shape.y, shape.y + height);
      const threshold = 15;
      return (
        world.x >= minX - threshold &&
        world.x <= maxX + threshold &&
        world.y >= minY - threshold &&
        world.y <= maxY + threshold
      );
    });

    if (doubleClickedShape) {
      const screenX = doubleClickedShape.x * camera.scale + camera.x;
      const screenY = doubleClickedShape.y * camera.scale + camera.y;

      setTextInput({
        x: screenX,
        y: screenY,
        worldX: doubleClickedShape.x,
        worldY: doubleClickedShape.y,
      });
      setTextValue(doubleClickedShape.text || "");
      setEditingShapeId(doubleClickedShape.id);
    }
  }, [camera, tool, shapes, setEditingShapeId]);

  const handleTextInputStart = useCallback(
    (x: number, y: number, worldX: number, worldY: number) => {
      setTextInput({ x, y, worldX, worldY });
      setTextValue("");
    },
    []
  );

  const handleShapeComplete = (shape: Shape) => {
    const exists = useCanvasStore.getState().shapes.some((s) => s.id === shape.id);
    if (exists) {
      updateShape(shape.id, shape);
    } else {
      addShape(shape);
    }
    broadcastShape(shape);
  };

  const handleBackgroundChange = (color: string) => {
    setCanvasBackground(color);
    broadcastBackground(color);
  };

  const { onMouseDown, onMouseMove, onMouseUp } = useDrawing(
    canvasRef as React.RefObject<HTMLCanvasElement>,
    handleShapeComplete,
    handleCursorMove,
    broadcastDeleteShape,
    handleTextInputStart,
    spacePressed
  );

  const cursorStyle = tool === "hand"
    ? (isMouseDown ? "grabbing" : "grab")
    : spacePressed
    ? (isMouseDown ? "grabbing" : "grab")
    : (tool === "select" ? "default" : tool === "eraser" ? "cell" : "crosshair");

  
  const handleZoom = (factor: number) => {
    const newScale = Math.min(Math.max(camera.scale * factor, 0.1), 10);
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const newX = centerX - (centerX - camera.x) * (newScale / camera.scale);
    const newY = centerY - (centerY - camera.y) * (newScale / camera.scale);
    setCamera({ x: newX, y: newY, scale: newScale });
  };

  const handleResetZoom = () => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const newX = centerX - (centerX - camera.x) * (1 / camera.scale);
    const newY = centerY - (centerY - camera.y) * (1 / camera.scale);
    setCamera({ x: newX, y: newY, scale: 1 });
  };

  
  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    
    tempCtx.fillStyle = canvasBackground;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement("a");
    link.download = `drawit-canvas-${roomId}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
    toast.success("Image exported!");
    setIsMenuOpen(false);
  };

  const handleResetCanvas = async () => {
    if (window.confirm("Are you sure you want to clear the canvas?")) {
      try {
        saveToHistory();
        await api.delete(`/chats/${roomId}`);
        broadcastClear();
        setShapes([]);
        toast.success("Canvas cleared");
        setIsMenuOpen(false);
      } catch {
        toast.error("Failed to clear canvas on server");
      }
    }
  };

  const editingShape = editingShapeId ? shapes.find((s) => s.id === editingShapeId) : null;
  const activeColor = editingShape ? editingShape.strokeColor : strokeColor;
  const activeWidth = editingShape ? editingShape.strokeWidth : strokeWidth;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: canvasBackground }}
    >
      {}
      <Toolbar onToolSelect={() => setIsMenuOpen(false)} />

      {}
      <CursorOverlay cursorsRef={cursorsRef} camera={camera} />

      {}
      {tool !== "hand" && tool !== "select" && tool !== "eraser" && !isMenuOpen && <StylePanel />}

      {}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="absolute top-4 left-4 z-20 w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors border cursor-pointer"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--surface)")}
      >
        ☰
      </button>



      {}
      {isMenuOpen && (
        <div
          className="absolute top-16 left-4 z-20 w-64 rounded-xl p-5 space-y-4"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 10px 30px rgba(120,0,0,0.12)",
          }}
        >
          <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Canvas Menu</h3>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-xs font-semibold transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              Close
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleExport}
              className="w-full py-2.5 px-3 text-left text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-2"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              📥 Export to PNG
            </button>
            <button
              onClick={() => {
                const link = `${window.location.origin}/canvas/${roomSlug}`;
                navigator.clipboard.writeText(link);
                toast.success("Room link copied!");
                setIsMenuOpen(false);
              }}
              className="w-full py-2.5 px-3 text-left text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-2"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              🔗 Copy Room Link
            </button>
            {isAdmin && (
              <button
                onClick={handleResetCanvas}
                className="w-full py-2 px-3 text-left text-xs font-medium rounded-lg transition-colors cursor-pointer"
                style={{ background: 'var(--bg)', color: '#c1121f' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(193,18,31,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg)')}
              >
                🗑️ Clear Canvas
              </button>
            )}
          </div>

          {}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Canvas Background
            </label>
            <div className="flex gap-2.5">
              {backgroundPresets.map((bg) => (
                <button
                  key={bg.color}
                  title={bg.name}
                  onClick={() => handleBackgroundChange(bg.color)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    background: bg.color,
                    borderColor: canvasBackground === bg.color ? 'var(--accent)' : 'var(--border)',
                    outline: canvasBackground === bg.color ? '2px solid var(--accent)' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {}
          <div className="flex justify-between items-center border-t pt-3.5" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-medium font-sans" style={{ color: 'var(--text-secondary)' }}>Show Grid</span>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: 'var(--accent)' }}
            />
          </div>
        </div>
      )}

      {}
      <div className="absolute bottom-4 left-4 flex items-center gap-2.5 z-10">
        {}
        <div
          className="text-xs px-3 py-1.5 rounded-lg flex items-center font-mono"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          Room: {roomId}
        </div>

        {}
        <div
          className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-[var(--border)] bg-[var(--surface)] font-medium"
          style={{ color: connected ? "#22c55e" : "#f59e0b" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: connected ? "#22c55e" : "#f59e0b",
              boxShadow: connected ? "0 0 6px #22c55e" : "none",
            }}
          />
          {connected ? "Live" : "Connecting..."}
        </div>

        {}
        <div
          className="flex items-center rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface)] text-xs"
          style={{ height: "30px" }}
        >
          <button
            onClick={() => handleZoom(0.9)}
            className="w-8 h-full hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            -
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2.5 h-full hover:bg-[var(--bg)] font-medium text-[var(--text-primary)] transition-colors border-x border-[var(--border)] cursor-pointer"
          >
            {Math.round(camera.scale * 100)}%
          </button>
          <button
            onClick={() => handleZoom(1.1)}
            className="w-8 h-full hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            +
          </button>
        </div>

        {}
        <div
          className="flex items-center rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface)] text-xs"
          style={{ height: "30px" }}
        >
          <button
            onClick={undo}
            className="w-8 h-full hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-colors border-r border-[var(--border)] cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={redo}
            className="w-8 h-full hover:bg-[var(--bg)] text-[var(--text-secondary)] transition-colors cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            ↷
          </button>
        </div>
      </div>
      {textInput && (
        <textarea
          ref={textareaRef}
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          className="absolute outline-none p-1.5 font-sans resize-none"
          style={{
            left: textInput.x,
            top: textInput.y,
            fontSize: `${(activeWidth * 6 + 12) * camera.scale}px`,
            color: activeColor === "#ffffff" ? "#780000" : activeColor,
            background: "transparent",
            border: "none",
            fontFamily: "sans-serif",
            lineHeight: "1.2",
            zIndex: 50,
            minWidth: "150px",
            minHeight: "40px",
            overflow: "hidden",
            caretColor: activeColor === "#ffffff" ? "#780000" : activeColor,
          }}
          onBlur={() => handleTextSubmit(textValue)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === "Escape") {
              setEditingShapeId(null);
              setTextInput(null);
            }
          }}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}

      <canvas
        ref={canvasRef}
        onDoubleClick={handleDoubleClick}
        onMouseDown={(e) => {
          setIsMouseDown(true);
          setIsMenuOpen(false);
          if (tool === "text") {
            e.preventDefault();
          }
          onMouseDown(e);
        }}
        onMouseMove={onMouseMove}
        onMouseUp={() => {
          setIsMouseDown(false);
          onMouseUp();
        }}
        onMouseLeave={() => {
          setIsMouseDown(false);
          onMouseUp();
        }}
        style={{ cursor: cursorStyle, display: "block" }}
      />
    </div>
  );
}