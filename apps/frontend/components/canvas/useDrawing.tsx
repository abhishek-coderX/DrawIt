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
  const threshold = 12; 

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

function getShapeBounds(shape: Shape) {
  if (shape.type === "line") {
    const x1 = shape.x;
    const y1 = shape.y;
    const x2 = shape.width ?? 0;
    const y2 = shape.height ?? 0;
    return {
      minX: Math.min(x1, x2),
      minY: Math.min(y1, y2),
      maxX: Math.max(x1, x2),
      maxY: Math.max(y1, y2),
    };
  }
  const x1 = shape.x;
  const y1 = shape.y;
  const x2 = shape.x + (shape.width ?? 0);
  const y2 = shape.y + (shape.height ?? 0);
  return {
    minX: Math.min(x1, x2),
    minY: Math.min(y1, y2),
    maxX: Math.max(x1, x2),
    maxY: Math.max(y1, y2),
  };
}

function getShapeArea(shape: Shape): number {
  if (shape.type === "pencil") {
    if (!shape.points || shape.points.length === 0) return 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of shape.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return (maxX - minX) * (maxY - minY);
  }
  const bounds = getShapeBounds(shape);
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  return w * h;
}

function findBestShapeAtPoint(point: { x: number; y: number }, shapes: Shape[]): Shape | undefined {
  const matching = shapes.filter((s) => isPointNearShape(point, s));
  if (matching.length === 0) return undefined;
  if (matching.length === 1) return matching[0];

  const sorted = [...matching].sort((a, b) => {
    const areaA = getShapeArea(a);
    const areaB = getShapeArea(b);
    const maxArea = Math.max(areaA, areaB);
    if (maxArea > 0) {
      const diffRatio = Math.min(areaA, areaB) / maxArea;
      if (diffRatio < 0.8) {
        return areaA - areaB; // smaller area first
      }
    }
    // standard layering order: topmost shape first (higher index in original array)
    return shapes.indexOf(b) - shapes.indexOf(a);
  });
  return sorted[0];
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
    selectedShapeId,
    setSelectedShapeId,
    editingShapeId,
    setEditingShapeId,
  } = useCanvasStore();

  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const isMovingShape = useRef(false);
  const isResizingShape = useRef(false);
  
  const startPos = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  
  const currentShape = useRef<Shape | null>(null);
  const selectedShape = useRef<Shape | null>(null);
  const pencilPoints = useRef<{ x: number; y: number }[]>([]);
  const activeShapeId = useRef<string>("");
  
  
  const initialShapePos = useRef<{
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: { x: number; y: number }[];
  }>({ x: 0, y: 0 });

  
  const drawableCache = useRef<Map<string, any>>(new Map());

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      
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

  
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rc = rough.canvas(canvas);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    
    ctx.save();
    ctx.setTransform(camera.scale, 0, 0, camera.scale, camera.x, camera.y);

    
    if (showGrid) {
      drawGrid(ctx, canvas, camera);
    }

    
    for (const shape of shapes) {
      if (shape.id === editingShapeId) continue;
      drawShape(rc, ctx, shape, generator, drawableCache.current);
    }

    
    if (currentShape.current) {
      drawShape(rc, ctx, currentShape.current, generator, null);
    }

    
    if (tool === "select" && selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (
        shape &&
        (shape.type === "rect" || shape.type === "ellipse" || shape.type === "line")
      ) {
        const bounds = getShapeBounds(shape);

        ctx.save();
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5 / camera.scale;
        ctx.setLineDash([4 / camera.scale, 4 / camera.scale]);
        ctx.strokeRect(
          bounds.minX,
          bounds.minY,
          bounds.maxX - bounds.minX,
          bounds.maxY - bounds.minY
        );
        ctx.restore();

        
        const hx = shape.type === "line" ? (shape.width ?? 0) : shape.x + (shape.width ?? 0);
        const hy = shape.type === "line" ? (shape.height ?? 0) : shape.y + (shape.height ?? 0);
        const handleSize = 8 / camera.scale;

        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.5 / camera.scale;
        ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [shapes, camera, showGrid, selectedShapeId, tool, editingShapeId]);

  useEffect(() => {
    render();
  }, [render]);

  
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

  
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const world = screenToWorld(e.clientX, e.clientY, camera);

      
      if (e.button === 1 || spacePressed || tool === "hand") {
        isPanning.current = true;
        panStart.current = { x: e.clientX - camera.x, y: e.clientY - camera.y };
        return;
      }

      if (tool === "select") {
        if (selectedShapeId) {
          const shape = shapes.find((s) => s.id === selectedShapeId);
          if (
            shape &&
            (shape.type === "rect" || shape.type === "ellipse" || shape.type === "line")
          ) {
            const hx = shape.type === "line" ? (shape.width ?? 0) : shape.x + (shape.width ?? 0);
            const hy = shape.type === "line" ? (shape.height ?? 0) : shape.y + (shape.height ?? 0);
            const clickDist = Math.sqrt((world.x - hx) ** 2 + (world.y - hy) ** 2);
            const handleThreshold = 12 / camera.scale;

            if (clickDist < handleThreshold) {
              saveToHistory();
              isResizingShape.current = true;
              selectedShape.current = shape;
              dragStart.current = world;
              initialShapePos.current = {
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height,
                points: shape.points ? [...shape.points] : undefined,
              };
              return;
            }
          }
        }

        const shape = findBestShapeAtPoint(world, shapes);
        if (shape) {
          saveToHistory();
          setSelectedShapeId(shape.id);
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
          setSelectedShapeId(null);
          isPanning.current = true;
          panStart.current = { x: e.clientX - camera.x, y: e.clientY - camera.y };
        }
        return;
      }

      if (tool === "eraser") {
        isDrawing.current = true;
        const shapeToErase = findBestShapeAtPoint(world, shapes);
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

      if (isPanning.current || isMovingShape.current || isResizingShape.current) {
        if (canvasRef.current) {
          canvasRef.current.style.cursor = isPanning.current
            ? "grabbing"
            : isResizingShape.current
            ? "nwse-resize"
            : "grabbing";
        }
      } else if (tool === "select") {
        let hoveringHandle = false;
        if (selectedShapeId) {
          const shape = shapes.find((s) => s.id === selectedShapeId);
          if (
            shape &&
            (shape.type === "rect" || shape.type === "ellipse" || shape.type === "line")
          ) {
            const hx = shape.type === "line" ? (shape.width ?? 0) : shape.x + (shape.width ?? 0);
            const hy = shape.type === "line" ? (shape.height ?? 0) : shape.y + (shape.height ?? 0);
            const dist = Math.sqrt((world.x - hx) ** 2 + (world.y - hy) ** 2);
            if (dist < 12 / camera.scale) {
              hoveringHandle = true;
            }
          }
        }

        if (hoveringHandle) {
          if (canvasRef.current) {
            canvasRef.current.style.cursor = "nwse-resize";
          }
        } else {
          const isHovering = shapes.some((s) => isPointNearShape(world, s));
          if (canvasRef.current) {
            canvasRef.current.style.cursor = isHovering ? "move" : "default";
          }
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

      if (isResizingShape.current && selectedShape.current) {
        const dx = world.x - dragStart.current.x;
        const dy = world.y - dragStart.current.y;
        const shapeId = selectedShape.current.id;

        setShapes(
          shapes.map((s) => {
            if (s.id === shapeId) {
              if (s.type === "line") {
                const updated = {
                  ...s,
                  width: (initialShapePos.current.width ?? 0) + dx,
                  height: (initialShapePos.current.height ?? 0) + dy,
                };
                delete (updated as any)._roughDrawable;
                return updated;
              } else {
                const newWidth = Math.max(1, (initialShapePos.current.width ?? 0) + dx);
                const newHeight = Math.max(1, (initialShapePos.current.height ?? 0) + dy);
                const updated = {
                  ...s,
                  width: newWidth,
                  height: newHeight,
                };
                delete (updated as any)._roughDrawable;
                return updated;
              }
            }
            return s;
          })
        );

        drawableCache.current.delete(shapeId);
        return;
      }

      if (isMovingShape.current && selectedShape.current) {
        const dx = world.x - dragStart.current.x;
        const dy = world.y - dragStart.current.y;
        const shapeId = selectedShape.current.id;

        setShapes(
          shapes.map((s) => {
            if (s.id === shapeId) {
              if (s.type === "pencil") {
                const origPoints = initialShapePos.current.points || [];
                const updated = {
                  ...s,
                  points: origPoints.map((p) => ({ x: p.x + dx, y: p.y + dy })),
                  x: initialShapePos.current.x + dx,
                  y: initialShapePos.current.y + dy,
                };
                delete (updated as any)._roughDrawable;
                return updated;
              } else if (s.type === "line") {
                const updated = {
                  ...s,
                  x: initialShapePos.current.x + dx,
                  y: initialShapePos.current.y + dy,
                  width: (initialShapePos.current.width ?? 0) + dx,
                  height: (initialShapePos.current.height ?? 0) + dy,
                };
                delete (updated as any)._roughDrawable;
                return updated;
              } else {
                const updated = {
                  ...s,
                  x: initialShapePos.current.x + dx,
                  y: initialShapePos.current.y + dy,
                };
                delete (updated as any)._roughDrawable;
                return updated;
              }
            }
            return s;
          })
        );

        drawableCache.current.delete(shapeId);
        return;
      }

      if (!isDrawing.current) return;

      if (tool === "eraser") {
        const shapeToErase = findBestShapeAtPoint(world, shapes);
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
    [
      tool,
      camera,
      strokeColor,
      strokeWidth,
      fillColor,
      fillStyle,
      render,
      shapes,
      removeShape,
      setCamera,
      setShapes,
      onCursorMove,
      onShapeDelete,
      selectedShapeId,
    ]
  );

  const onMouseUp = useCallback(() => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    if (isResizingShape.current) {
      isResizingShape.current = false;
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

    // Discard tiny shapes/accidental clicks (width/height less than 5px)
    const shape = currentShape.current;
    let isTooSmall = false;
    
    if (shape.type === "rect" || shape.type === "ellipse") {
      const w = Math.abs(shape.width ?? 0);
      const h = Math.abs(shape.height ?? 0);
      if (w < 5 && h < 5) {
        isTooSmall = true;
      }
    } else if (shape.type === "line") {
      const dx = (shape.width ?? 0) - shape.x;
      const dy = (shape.height ?? 0) - shape.y;
      if (Math.sqrt(dx * dx + dy * dy) < 5) {
        isTooSmall = true;
      }
    } else if (shape.type === "pencil") {
      if (!shape.points || shape.points.length <= 1) {
        isTooSmall = true;
      } else {
        const start = shape.points[0];
        const allClose = shape.points.every((p) => {
          const dx = p.x - start.x;
          const dy = p.y - start.y;
          return Math.sqrt(dx * dx + dy * dy) < 5;
        });
        if (allClose) {
          isTooSmall = true;
        }
      }
    }

    if (isTooSmall) {
      currentShape.current = null;
      pencilPoints.current = [];
      render();
      return;
    }

    onShapeComplete(shape);
    currentShape.current = null;
    pencilPoints.current = [];
  }, [onShapeComplete, tool, render]);

  
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


function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  camera: { x: number; y: number; scale: number }
) {
  const gridSize = 40;
  const scaledGrid = gridSize * camera.scale;

  
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