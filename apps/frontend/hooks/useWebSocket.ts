import { useEffect, useRef, useState } from "react";
import { WSClient } from "@/lib/wsClient";
import { useCanvasStore, Shape } from "@/store/canvasStore";
import { useAuth } from "./useAuth";

export interface PeerCursor {
  userId: string;
  x: number;
  y: number;
  name: string;
  color: string;
  lastSeen: number;
}

export function useWebSocket(roomId: string) {
  const clientRef = useRef<WSClient | null>(null);
  const cursorsRef = useRef<Record<string, PeerCursor>>({});
  const { getToken } = useAuth();
  const { addShape } = useCanvasStore();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

    const client = new WSClient(wsUrl, token, roomId);
    clientRef.current = client;

    // Handle incoming messages from other users
    const unsub = client.onMessage((data) => {
      if (data.type === "chat") {
        try {
          const shape: Shape = JSON.parse(data.message);
          // Only add if we don't already have it (optimistic UI)
          const exists = useCanvasStore
            .getState()
            .shapes.some((s) => s.id === shape.id);
          if (exists) {
            useCanvasStore.setState((s) => ({
              shapes: s.shapes.map((sh) => (sh.id === shape.id ? shape : sh)),
            }));
          } else {
            addShape(shape);
          }
        } catch {
          console.error("[WS] failed to parse shape", data.message);
        }
      }

      if (data.type === "connected") {
        setConnected(true);
      }

      if (data.type === "background_change") {
        useCanvasStore.getState().setCanvasBackground(data.color);
      }

      if (data.type === "clear_canvas") {
        useCanvasStore.getState().setShapes([]);
      }

      if (data.type === "cursor_move") {
        cursorsRef.current[data.userId] = {
          userId: data.userId,
          x: data.x,
          y: data.y,
          name: data.name,
          color: data.color,
          lastSeen: Date.now(),
        };
      }

      if (data.type === "user_left") {
        delete cursorsRef.current[data.userId];
      }

      if (data.type === "delete_shape") {
        useCanvasStore.setState((s) => ({
          shapes: s.shapes.filter((sh) => sh.id !== data.shapeId),
        }));
      }
    });

    client.connect();
    setConnected(true);

    return () => {
      unsub();
      client.disconnect();
      setConnected(false);
    };
  }, [roomId]);

  const broadcastShape = (shape: Shape) => {
    clientRef.current?.sendShape(shape);
  };

  const broadcastBackground = (color: string) => {
    clientRef.current?.sendBackgroundChange(color);
  };

  const broadcastClear = () => {
    clientRef.current?.sendClearCanvas();
  };

  const broadcastCursor = (x: number, y: number, name: string, color: string) => {
    clientRef.current?.sendCursor(x, y, name, color);
  };

  const broadcastDeleteShape = (shapeId: string) => {
    clientRef.current?.sendDeleteShape(shapeId);
  };

  return {
    broadcastShape,
    broadcastBackground,
    broadcastClear,
    broadcastCursor,
    broadcastDeleteShape,
    connected,
    cursorsRef,
  };
}