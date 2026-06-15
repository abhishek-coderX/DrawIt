"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Canvas from "@/components/canvas/Canvas";
import { api } from "@/lib/api";

export default function CanvasPage() {
  const { roomId } = useParams();
  const { isLoggedIn } = useAuth();
  const router = useRouter();
  const [resolvedRoomId, setResolvedRoomId] = useState<string | null>(null);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push(`/signin?redirect=/canvas/${roomId}`);
      return;
    }

    const resolveRoom = async () => {
      try {
        const res = await api.get(`/room/${roomId}`);
        if (res.data.room?.id) {
          setResolvedRoomId(String(res.data.room.id));
          setAdminId(res.data.room.adminId);
        } else {
          setError("Room does not exist");
        }
      } catch {
        setError("Failed to load room details");
      }
    };

    resolveRoom();
  }, [roomId, isLoggedIn, router]);

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "#fefae0" }}
      >
        <p style={{ color: "#bc6c25" }}>{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 text-sm font-semibold border rounded-xl cursor-pointer transition-all"
          style={{ background: "#d4a373", color: "#780000", borderColor: "#d4a373" }}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!resolvedRoomId) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#fefae0" }}
      >
        <p style={{ color: "#bc6c25" }}>Loading canvas...</p>
      </div>
    );
  }

  return <Canvas roomId={resolvedRoomId} adminId={adminId || ""} />;
}