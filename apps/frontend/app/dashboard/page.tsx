"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface Room {
  id: number;
  slug: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn, clearToken } = useAuth();
  const [roomName, setRoomName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [newRoomName, setNewRoomName] = useState("");

  // Authenticate user on load
  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/signin");
    }
  }, [isLoggedIn, router]);

  // Fetch real user rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get("/rooms");
        if (res.data.rooms) {
          setRooms(res.data.rooms);
        }
      } catch (e) {
        console.error("Failed to fetch rooms:", e);
      }
    };
    if (isLoggedIn()) {
      fetchRooms();
    }
  }, [isLoggedIn]);

  const handleCreateRoom = async () => {
    if (roomName.trim().length < 3) {
      toast.error("Room name must be at least 3 characters");
      return;
    }
    setCreateLoading(true);
    try {
      const res = await api.post("/room", { name: roomName });
      if (res.data.roomId) {
        toast.success("Room created successfully!");
        router.push(`/canvas/${roomName}`);
      } else {
        toast.error(res.data.message ?? "Failed to create room");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Error creating room");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (roomName.trim().length < 3) {
      toast.error("Room name must be at least 3 characters");
      return;
    }
    setJoinLoading(true);
    try {
      const res = await api.get(`/room/${roomName}`);
      if (res.data.room?.id) {
        toast.success("Room found! Joining...");
        router.push(`/canvas/${res.data.room.slug}`);
      } else {
        toast.error("Room does not exist");
      }
    } catch {
      toast.error("Error joining room");
    } finally {
      setJoinLoading(false);
    }
  };

  const handleRenameRoom = async (id: number) => {
    if (newRoomName.trim().length < 3) {
      toast.error("Room name must be at least 3 characters");
      return;
    }
    try {
      const res = await api.put(`/room/${id}`, { name: newRoomName });
      toast.success(res.data.message ?? "Room renamed!");
      setRooms(rooms.map(r => r.id === id ? { ...r, slug: res.data.room.slug } : r));
      setEditingRoomId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to rename room");
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this room and all its drawings?")) {
      return;
    }
    try {
      const res = await api.delete(`/room/${id}`);
      toast.success(res.data.message ?? "Room deleted");
      setRooms(rooms.filter(r => r.id !== id));
      setEditingRoomId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to delete room");
    }
  };

  const handleSignOut = () => {
    clearToken();
    toast.success("Signed out successfully");
    router.push("/signin");
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "#fefae0" }}>
      {/* Background ambient glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] -z-10 pointer-events-none" style={{ background: 'rgba(212,163,115,0.12)' }} />

      {/* Top Header Navbar */}
      <header className="border-b backdrop-blur-md px-8 py-4 flex justify-between items-center z-10 sticky top-0" style={{ borderColor: '#ccd5ae', background: 'rgba(254,250,224,0.85)' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-black hover:opacity-80 transition-opacity" style={{ color: '#780000' }}>
            DrawIt
          </Link>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border" style={{ color: '#bc6c25', background: '#faedcd', borderColor: '#ccd5ae' }}>
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all duration-200 cursor-pointer"
            style={{ background: '#c1121f' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#780000')}
            onMouseLeave={e => (e.currentTarget.style.background = '#c1121f')}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-12 space-y-12 z-10">
        {/* Welcome Header */}
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight" style={{ color: '#780000' }}>Good to see you 👋</h2>
          <p className="text-sm" style={{ color: '#bc6c25' }}>Create or join a whiteboard room to get started</p>
        </div>

        {/* Combined Card: Create + Join */}
        <div className="rounded-2xl p-8 shadow-sm border" style={{ background: '#faedcd', borderColor: '#ccd5ae' }}>
          <div className="space-y-2 mb-6">
            <h3 className="text-xl font-bold" style={{ color: '#780000' }}>Enter a Room Name</h3>
            <p className="text-xs leading-relaxed" style={{ color: '#bc6c25' }}>
              Create a brand-new canvas room or join an existing one. Use the same room name to reconnect with teammates.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#bc6c25' }}>
                Room Name / Slug
              </label>
              <input
                type="text"
                placeholder="e.g. wireframing-room"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border transition-all duration-200"
                style={{
                  background: '#fefae0',
                  borderColor: '#ccd5ae',
                  color: '#780000',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#d4a373')}
                onBlur={e => (e.currentTarget.style.borderColor = '#ccd5ae')}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateRoom}
                disabled={createLoading || joinLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] duration-200 cursor-pointer"
                style={{ background: '#d4a373', color: '#780000' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#c1121f';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#d4a373';
                  e.currentTarget.style.color = '#780000';
                }}
              >
                {createLoading ? "Creating..." : "Create Room"}
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={createLoading || joinLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] duration-200 cursor-pointer"
                style={{ background: 'transparent', borderColor: '#ccd5ae', color: '#780000' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#780000';
                  e.currentTarget.style.background = 'rgba(120,0,0,0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#ccd5ae';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {joinLoading ? "Joining..." : "Join Room"}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Rooms List */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold" style={{ color: '#780000' }}>Recent Rooms</h3>
            <span className="text-[10px] font-semibold border px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ color: '#bc6c25', borderColor: '#ccd5ae' }}>
              Whiteboard Sessions
            </span>
          </div>

          {rooms.length === 0 ? (
            <div className="border border-dashed rounded-2xl py-12 flex flex-col items-center justify-center text-center" style={{ borderColor: '#ccd5ae' }}>
              <p className="text-sm" style={{ color: '#bc6c25' }}>No rooms yet. Create one above.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="group rounded-2xl p-6 flex flex-col justify-between shadow-sm border transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: '#faedcd', borderColor: '#ccd5ae' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#d4a373')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#ccd5ae')}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      {/* Canvas mini icon */}
                      <div className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ background: 'rgba(212,163,115,0.2)', borderColor: '#d4a373', color: '#780000' }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ color: '#bc6c25', background: '#fefae0', borderColor: '#ccd5ae' }}>
                        {new Date(room.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    {editingRoomId === room.id ? (
                      <div className="space-y-3.5 p-3 rounded-xl border bg-[#fefae0]/80" style={{ borderColor: '#ccd5ae' }}>
                        {/* Rename option */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#bc6c25' }}>Rename Room</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={newRoomName}
                              onChange={(e) => setNewRoomName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                              className="flex-grow px-2 py-1.5 text-xs rounded-lg outline-none border bg-[#fefae0]"
                              style={{ borderColor: '#ccd5ae', color: '#780000' }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRenameRoom(room.id);
                                if (e.key === "Escape") setEditingRoomId(null);
                              }}
                            />
                            <button
                              onClick={() => handleRenameRoom(room.id)}
                              className="px-2.5 py-1.5 text-xs font-bold rounded bg-[#d4a373] text-[#780000] hover:bg-[#c1121f] hover:text-white cursor-pointer transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>

                        {/* Danger zone / Delete option */}
                        <div className="border-t pt-2.5" style={{ borderColor: '#ccd5ae' }}>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#c1121f' }}>Delete Room</span>
                            <button
                              onClick={() => handleDeleteRoom(room.id)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded bg-[#c1121f] text-white hover:bg-[#780000] cursor-pointer transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Cancel */}
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => setEditingRoomId(null)}
                            className="text-[10px] font-semibold underline text-[#bc6c25] hover:text-[#780000] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold transition-colors duration-200" style={{ color: '#780000' }}>
                            {room.slug}
                          </h4>
                          <p className="text-[11px] line-clamp-1" style={{ color: '#bc6c25' }}>Active Whiteboard Session</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingRoomId(room.id);
                            setNewRoomName(room.slug);
                          }}
                          className="p-1 rounded hover:bg-[#ccd5ae]/50 text-[#bc6c25] hover:text-[#780000] cursor-pointer transition-colors"
                          title="Rename or Delete Room"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/canvas/${room.slug}`;
                        navigator.clipboard.writeText(link);
                        toast.success("Room link copied!");
                      }}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer"
                      style={{ background: 'transparent', borderColor: '#ccd5ae', color: '#bc6c25' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#d4a373';
                        e.currentTarget.style.color = '#780000';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#ccd5ae';
                        e.currentTarget.style.color = '#bc6c25';
                      }}
                    >
                      🔗 Copy Link
                    </button>
                    <button
                      onClick={() => router.push(`/canvas/${room.slug}`)}
                      className="flex-1 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 cursor-pointer"
                      style={{ background: 'transparent', borderColor: '#ccd5ae', color: '#780000' }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#d4a373';
                        e.currentTarget.style.borderColor = '#d4a373';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = '#ccd5ae';
                      }}
                    >
                      Open →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
