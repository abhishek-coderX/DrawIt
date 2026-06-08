import { useRef, useEffect, useCallback } from "react";
import rough from "roughjs";
import { useCanvasStore, Shape, Tool } from "@/store/canvasStore";

const generator = rough.generator();

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function screenToWorld(
  x: number,
  y: number,
  camera: { x: number; y: number; scale: number }
) {
  return {
    x: (x - camera.x) / camera.scale,
    y: (y - camera.y) / camera.scale,
  };
}

// ── Eraser & Selection Collision Utilities ────────────────────
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function isPointNearLine(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
  maxDistance = 10
) {
  const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  if (l2 === 0) return distance(p, a) < maxDistance;
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return distance(p, projection) < maxDistance;
}

function isPointNearShape(point: { x: number; y: number }, shape: Shape) {
  const threshold = 12; // distance threshold in pixels

  if (shape.type === "rect") {
    const x1 = shape.x;
    const y1 = shape.y;
    const x2 = shape.x + (shape.width ?? 0);
    const y2 = shape.y + (shape.height ?? 0);
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return (
      point.x >= minX - threshold &&
      point.x <= maxX + threshold &&
      point.y >= minY - threshold &&
      point.y <= maxY + threshold
    );
  }

  if (shape.type === "ellipse") {
    const rx = Math.abs(shape.width ?? 0) / 2;
    const ry = Math.abs(shape.height ?? 0) / 2;
    if (rx === 0 || ry === 0) return false;
    const cx = shape.x + (shape.width ?? 0) / 2;
    const cy = shape.y + (shape.height ?? 0) / 2;
    const value = ((point.x - cx) ** 2) / (rx ** 2) + ((point.y - cy) ** 2) / (ry ** 2);
    return value <= 1.25;
  }

  if (shape.type === "line") {
    return isPointNearLine(point, { x: shape.x, y: shape.y }, { x: shape.width ?? 0, y: shape.height ?? 0 }, threshold);
  }

  if (shape.type === "pencil") {
    if (!shape.points) return false;
    return shape.points.some((p) => distance(point, p) < threshold);
  }

  if (shape.type === "text") {
    const width = (shape.text?.length ?? 0) * 10;
    const height = 24;
    const minX = Math.min(shape.x, shape.x + width);
    const maxX = Math.max(shape.x, shape.x + width);
    const minY = Math.min(shape.y, shape.y + height);
    const maxY = Math.max(shape.y, shape.y + height);
    return (
      point.x >= minX - threshold &&
      point.x <= maxX + threshold &&
      point.y >= minY - threshold &&
      point.y <= maxY + threshold
    );
  }

  return false;
}

export function useDrawing(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  onShapeComplete: (shape: Shape) => void,
  onCursorMove?: (x: number, y: number) => void,
  onShapeDelete?: (shapeId: string) => void,
  onTextInputStart?: (x: number, y: number, worldX: number, worldY: number) => void,
  spacePressed?: boolean
) {
  const {
    tool,
    camera,
    strokeColor,
    strokeWidth,
    fillColor,
    fillStyle,
    shapes,
    setCamera,
    removeShape,
    setShapes,
    saveToHistory,
    undo,
    redo,
    showGrid,
  } = useCanvasStore();

  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const isMovingShape = useRef(false);
  
  const startPos = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  
  const currentShape = useRef<Shape | null>(null);
  const selectedShape = useRef<Shape | null>(null);
  const pencilPoints = useRef<{ x: number; y: number }[]>([]);
  const activeShapeId = useRef<string>("");
  
  // Track shape initial coordinates before drag-to-move starts
  const initialShapePos = useRef<{
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: { x: number; y: number }[];
  }>({ x: 0, y: 0 });

  // Cache compiled rough.js drawables to avoid calculations flicker
  const drawableCache = useRef<Map<string, any>>(new Map());

  // ── Keyboard Undo/Redo Shortcuts ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when typing inside inputs or textareas
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (isCtrl && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // ── Render loop ──────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rc = rough.canvas(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform
    ctx.save();
    ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.x, camera.y);

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, canvas, camera);
    }

    // Draw all committed shapes (with cache check)
    for (const shape of shapes) {
      drawShape(rc, ctx, shape, generator, drawableCache.current);
    }

    // Draw active shape (bypasses cache so it scales fluidly)
    if (currentShape.current) {
      drawShape(rc, ctx, currentShape.current, generator, null);
    }

    ctx.restore();
  }, [shapes, camera, showGrid]);

  useEffect(() => {
    render();
  }, [render]);

  // ── Resize handler ───────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      render();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [render]);

  // ── Mouse events ─────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY, camera);

      // Middle click, Spacebar, or hand tool = pure pan
      if (e.button === 1 || spacePressed || tool === "hand") {
        isPanning.current = true;
        panStart.current = { x: e.clientX - camera.x, y: e.clientY - camera.y };
        return;
      }

      if (tool === "select") {
        const shape = shapes.find((s) => isPointNearShape(world, s));
        if (shape) {
          saveToHistory();
          isMovingShape.current = true;
          selectedShape.current = shape;
          dragStart.current = world;
          initialShapePos.current = {
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            points: shape.points ? [...shape.points] : undefined,
          };
        } else {
          isPanning.current = true;
          panStart.current = { x: e.clientX - camera.x, y: e.clientY - camera.y };
        }
        return;
      }

      if (tool === "eraser") {
        isDrawing.current = true;
        const shapeToErase = shapes.find((shape) => isPointNearShape(world, shape));
        if (shapeToErase) {
          removeShape(shapeToErase.id);
          if (onShapeDelete) {
            onShapeDelete(shapeToErase.id);
          }
        }
        return;
      }

      if (tool === "text") {
        if (onTextInputStart) {
          const rect = canvasRef.current?.getBoundingClientRect();
          const localX = e.clientX - (rect?.left ?? 0);
          const localY = e.clientY - (rect?.top ?? 0);
          onTextInputStart(localX, localY, world.x, world.y);
        }
        return;
      }

      isDrawing.current = true;
      startPos.current = world;
      const shapeId = generateId();
      activeShapeId.current = shapeId;

      if (tool === "pencil") {
        pencilPoints.current = [world];
        currentShape.current = {
          id: shapeId,
          type: "pencil",
          x: world.x,
          y: world.y,
          points: [world],
          strokeColor,
          strokeWidth,
          roughness: 1,
        };
      } else {
        currentShape.current = {
          id: shapeId,
          type: tool as Tool,
          x: world.x,
          y: world.y,
          width: 0,
          height: 0,
          strokeColor,
          strokeWidth,
          fillColor,
          fillStyle,
          roughness: 1,
        };
      }
    },
    [tool, camera, strokeColor, strokeWidth, fillColor, fillStyle, shapes, removeShape, saveToHistory, onTextInputStart, onShapeDelete]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY, camera);

      if (onCursorMove) {
        onCursorMove(world.x, world.y);
      }

      if (isPanning.current || isMovingShape.current) {
        if (canvasRef.current) {
          canvasRef.current.style.cursor = "grabbing";
        }
      } else if (tool === "select") {
        const isHovering = shapes.some((s) => isPointNearShape(world, s));
        if (canvasRef.current) {
          canvasRef.current.style.cursor = isHovering ? "move" : "default";
        }
      }

      if (isPanning.current) {
        setCamera({
          ...camera,
          x: e.clientX - panStart.current.x,
          y: e.clientY - panStart.current.y,
        });
        return;
      }

      if (isMovingShape.current && selectedShape.current) {
        const dx = world.x - dragStart.current.x;
        const dy = world.y - dragStart.current.y;

        setShapes(
          shapes.map((s) => {
            if (s.id === selectedShape.current!.id) {
              if (s.type === "pencil") {
                const origPoints = initialShapePos.current.points || [];
                return {
                  ...s,
                  points: origPoints.map((p) => ({ x: p.x + dx, y: p.y + dy })),
                  x: initialShapePos.current.x + dx,
                  y: initialShapePos.current.y + dy,
                };
              } else if (s.type === "line") {
                return {
                  ...s,
                  x: initialShapePos.current.x + dx,
                  y: initialShapePos.current.y + dy,
                  width: (initialShapePos.current.width ?? 0) + dx,
                  height: (initialShapePos.current.height ?? 0) + dy,
                };
              } else {
                return {
                  ...s,
                  x: initialShapePos.current.x + dx,
                  y: initialShapePos.current.y + dy,
                };
              }
            }
            return s;
          })
        );

        // Delete from roughjs cache so drawable coordinates recalculate on redraw
        drawableCache.current.delete(selectedShape.current.id);
        return;
      }

      if (!isDrawing.current) return;

      if (tool === "eraser") {
        const shapeToErase = shapes.find((shape) => isPointNearShape(world, shape));
        if (shapeToErase) {
          removeShape(shapeToErase.id);
          if (onShapeDelete) {
            onShapeDelete(shapeToErase.id);
          }
        }
        return;
      }

      if (tool === "pencil") {
        pencilPoints.current.push(world);
        currentShape.current = {
          ...currentShape.current!,
          points: [...pencilPoints.current],
        };
      } else if (tool !== "select") {
        const x = Math.min(startPos.current.x, world.x);
        const y = Math.min(startPos.current.y, world.y);
        const width = Math.abs(world.x - startPos.current.x);
        const height = Math.abs(world.y - startPos.current.y);

        currentShape.current = {
          id: activeShapeId.current,
          type: tool as Tool,
          x: tool === "line" ? startPos.current.x : x,
          y: tool === "line" ? startPos.current.y : y,
          width: tool === "line" ? world.x : width,
          height: tool === "line" ? world.y : height,
          strokeColor,
          strokeWidth,
          fillColor,
          fillStyle,
          roughness: 1,
        };
      }

      render();
    },
    [tool, camera, strokeColor, strokeWidth, fillColor, fillStyle, render, shapes, removeShape, setCamera, setShapes, onCursorMove, onShapeDelete]
  );

  const onMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }
    
    if (isMovingShape.current) {
      isMovingShape.current = false;
      if (selectedShape.current) {
        const updated = useCanvasStore
          .getState()
          .shapes.find((s) => s.id === selectedShape.current!.id);
        if (updated) {
          onShapeComplete(updated);
        }
      }
      selectedShape.current = null;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (tool === "eraser") return;

    if (!currentShape.current) return;
    onShapeComplete(currentShape.current);
    currentShape.current = null;
    pencilPoints.current = [];
  }, [onShapeComplete, tool]);

  // ── Zoom (Native Non-Passive Listener) ──────────────────────
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentCamera = cameraRef.current;
      
      if (e.ctrlKey) {
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(currentCamera.scale * zoomFactor, 0.1), 10);
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const newX = mouseX - (mouseX - currentCamera.x) * (newScale / currentCamera.scale);
        const newY = mouseY - (mouseY - currentCamera.y) * (newScale / currentCamera.scale);
        setCamera({ x: newX, y: newY, scale: newScale });
      } else {
        setCamera({
          ...currentCamera,
          x: currentCamera.x - e.deltaX,
          y: currentCamera.y - e.deltaY,
        });
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [canvasRef, setCamera]);

  return { onMouseDown, onMouseMove, onMouseUp };
}

// ── Draw a single shape ───────────────────────────────────────
function getOrCreateDrawable(
  shape: Shape,
  gen: any,
  cache: Map<string, any> | null
) {
  if (cache && cache.has(shape.id)) {
    return cache.get(shape.id);
  }

  const options = {
    stroke: shape.strokeColor,
    strokeWidth: shape.strokeWidth,
    roughness: shape.roughness ?? 1,
    fill: shape.fillStyle && shape.fillStyle !== "none" ? shape.fillColor : undefined,
    fillStyle: shape.fillStyle && shape.fillStyle !== "none" ? shape.fillStyle : undefined,
  };

  let drawable = null;
  switch (shape.type) {
    case "rect":
      drawable = gen.rectangle(shape.x, shape.y, shape.width ?? 0, shape.height ?? 0, options);
      break;
    case "ellipse":
      drawable = gen.ellipse(
        shape.x + (shape.width ?? 0) / 2,
        shape.y + (shape.height ?? 0) / 2,
        shape.width ?? 0,
        shape.height ?? 0,
        options
      );
      break;
    case "line":
      drawable = gen.line(shape.x, shape.y, shape.width ?? 0, shape.height ?? 0, options);
      break;
    case "pencil":
      if (shape.points && shape.points.length > 1) {
        drawable = gen.linearPath(
          shape.points.map((p) => [p.x, p.y]),
          options
        );
      }
      break;
  }

  if (drawable && cache) {
    cache.set(shape.id, drawable);
  }
  return drawable;
}

function drawShape(
  rc: any,
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  gen: any,
  cache: Map<string, any> | null
) {
  if (shape.type === "text") {
    if (shape.text) {
      ctx.save();
      ctx.font = `${shape.strokeWidth * 6 + 12}px sans-serif`;
      ctx.fillStyle = shape.strokeColor;
      ctx.textBaseline = "top";
      ctx.fillText(shape.text, shape.x, shape.y);
      ctx.restore();
    }
    return;
  }

  if (shape.type === "pencil") {
    const drawable = getOrCreateDrawable(shape, gen, cache);
    if (drawable) {
      rc.draw(drawable);
    }
    return;
  }

  const drawable = getOrCreateDrawable(shape, gen, cache);
  if (drawable) {
    rc.draw(drawable);
  }
}

// ── Draw infinite grid ────────────────────────────────────────
function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  camera: { x: number; y: number; scale: number }
) {
  const gridSize = 40;
  const scaledGrid = gridSize * camera.scale;

  // Prevent drawing extremely dense lines that degrade performance
  if (scaledGrid < 12) return;

  const offsetX = camera.x % scaledGrid;
  const offsetY = camera.y % scaledGrid;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = "#ccd5ae";
  ctx.lineWidth = 0.5;

  for (let x = offsetX; x < canvas.width; x += scaledGrid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = offsetY; y < canvas.height; y += scaledGrid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.restore();
}