import { WebSocket, WebSocketServer } from 'ws';
import jwt from "jsonwebtoken";
import { JWT_SECRET } from '@repo/backend-common/config';
import { prismaClient } from "@repo/db";
import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const REDIS_URL = process.env.REDIS_URL!;
const pub = new Redis(REDIS_URL);
const sub = new Redis(REDIS_URL);

const wss = new WebSocketServer({ port: 8080 });

interface User {
  ws: WebSocket;
  rooms: string[];
  userId: string;
}

const users: User[] = [];

function checkUser(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string") return null;
    if (!decoded || !decoded.userId) return null;
    return decoded.userId;
  } catch {
    return null;
  }
}

// ── Redis subscriber — fans out to local users ────────────────
sub.on("message", (channel, message) => {
  const roomId = channel.replace("room:", "");
  users.forEach((user) => {
    if (
      user.rooms.includes(roomId) &&
      user.ws.readyState === WebSocket.OPEN
    ) {
      user.ws.send(message);
    }
  });
});

wss.on("connection", function connection(ws, request) {
  const url = request.url;
  if (!url) return;

  const queryParams = new URLSearchParams(url.split("?")[1]);
  const token = queryParams.get("token") || "";
  const userId = checkUser(token);

  if (userId == null) {
    ws.close();
    return;
  }

  users.push({ userId, rooms: [], ws });

  ws.on("message", async function message(data) {
    let parsedData;
    if (typeof data !== "string") {
      parsedData = JSON.parse(data.toString());
    } else {
      parsedData = JSON.parse(data);
    }

    // ── Ping ─────────────────────────────────────────────────
    if (parsedData.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    // ── Join room ─────────────────────────────────────────────
    if (parsedData.type === "join_room") {
      const user = users.find((x) => x.ws === ws);
      if (!user) return;
      const roomIdStr = String(parsedData.roomId);
      if (!user.rooms.includes(roomIdStr)) {
        user.rooms.push(roomIdStr);
      }
      // Subscribe this server instance to the Redis channel
      await sub.subscribe(`room:${roomIdStr}`);
      return;
    }

    // ── Leave room ────────────────────────────────────────────
    if (parsedData.type === "leave_room") {
      const user = users.find((x) => x.ws === ws);
      if (!user) return;
      const roomIdStr = String(parsedData.roomId);
      user.rooms = user.rooms.filter((x) => x !== roomIdStr);
      pub.publish(
        `room:${roomIdStr}`,
        JSON.stringify({
          type: "user_left",
          roomId: roomIdStr,
          userId,
        })
      );
      
      // Check if we need to unsubscribe this server instance from Redis channel
      const hasUsers = users.some((u) => u.rooms.includes(roomIdStr));
      if (!hasUsers) {
        await sub.unsubscribe(`room:${roomIdStr}`);
      }
      return;
    }

    // ── Cursor move ───────────────────────────────────────────
    if (parsedData.type === "cursor_move") {
      const { roomId, x, y, name, color } = parsedData;
      pub.publish(
        `room:${roomId}`,
        JSON.stringify({
          type: "cursor_move",
          roomId,
          userId,
          x,
          y,
          name,
          color,
        })
      );
      return;
    }

    // ── Background change ─────────────────────────────────────
    if (parsedData.type === "background_change") {
      const { roomId, color } = parsedData;
      pub.publish(
        `room:${roomId}`,
        JSON.stringify({ type: "background_change", roomId, color })
      );
      return;
    }

    // ── Delete shape ──────────────────────────────────────────
    if (parsedData.type === "delete_shape") {
      const { roomId, shapeId } = parsedData;
      try {
        await prismaClient.shape.deleteMany({
          where: {
            roomId: Number(roomId),
            message: { contains: `"id":"${shapeId}"` },
          },
        });
        pub.publish(
          `room:${roomId}`,
          JSON.stringify({ type: "delete_shape", roomId, shapeId })
        );
      } catch (e) {
        console.error("Failed to delete shape from DB:", e);
      }
      return;
    }

    // ── Clear canvas ──────────────────────────────────────────
    if (parsedData.type === "clear_canvas") {
      const { roomId } = parsedData;
      const room = await prismaClient.room.findFirst({
        where: { id: Number(roomId) }
      });
      if (room && room.adminId === userId) {
        await prismaClient.shape.deleteMany({
          where: { roomId: Number(roomId) },
        });
        pub.publish(
          `room:${roomId}`,
          JSON.stringify({ type: "clear_canvas", roomId })
        );
      }
      return;
    }

    // ── Chat (shape sync) ─────────────────────────────────────
    if (parsedData.type === "chat") {
      const { roomId, message } = parsedData;

      let shapeId = "";
      try {
        const parsed = JSON.parse(message);
        shapeId = parsed.id;
      } catch (e) {
        console.error("Failed to parse shape JSON:", e);
      }

      if (shapeId) {
        const existing = await prismaClient.shape.findFirst({
          where: {
            roomId: Number(roomId),
            message: { contains: `"id":"${shapeId}"` },
          },
        });

        if (existing) {
          await prismaClient.shape.update({
            where: { id: existing.id },
            data: { message },
          });
        } else {
          await prismaClient.shape.create({
            data: { roomId: Number(roomId), message, userId },
          });
        }
      } else {
        await prismaClient.shape.create({
          data: { roomId: Number(roomId), message, userId },
        });
      }

      // Publish to Redis — reaches ALL server instances
      pub.publish(
        `room:${roomId}`,
        JSON.stringify({ type: "chat", message, roomId })
      );
      return;
    }
  });

  // ── Disconnect ────────────────────────────────────────────
  ws.on("close", function () {
    const userIndex = users.findIndex((x) => x.ws === ws);
    if (userIndex === -1) return;
    const user = users[userIndex];
    if (!user) return;
    users.splice(userIndex, 1);

    user.rooms.forEach(async (roomId) => {
      const roomIdStr = String(roomId);
      pub.publish(
        `room:${roomIdStr}`,
        JSON.stringify({ type: "user_left", roomId: roomIdStr, userId: user.userId })
      );

      // Check if we need to unsubscribe this server instance
      const hasUsers = users.some((u) => u.rooms.includes(roomIdStr));
      if (!hasUsers) {
        await sub.unsubscribe(`room:${roomIdStr}`);
      }
    });
  });
});

console.log("WS server running on port 8080");
