"use client";
import { useEffect, useRef, useState } from "react";
import { PeerCursor } from "@/hooks/useWebSocket";

interface CursorOverlayProps {
  cursorsRef: React.MutableRefObject<Record<string, PeerCursor>>;
  camera: { x: number; y: number; scale: number };
}

export default function CursorOverlay({ cursorsRef, camera }: CursorOverlayProps) {
  const [activePeers, setActivePeers] = useState<PeerCursor[]>([]);
  const prevPeerIdsRef = useRef<string>("");

  useEffect(() => {
    let animationFrameId: number;

    const updatePositions = () => {
      const now = Date.now();
      
      // Filter out cursors that haven't sent updates in the last 5 seconds (stale users)
      const currentPeers = Object.values(cursorsRef.current).filter(
        (peer) => now - peer.lastSeen < 5000
      );

      // Check if the list of active peer IDs has changed to trigger React mount/unmount
      const currentPeerIds = currentPeers
        .map((p) => p.userId)
        .sort()
        .join(",");

      if (currentPeerIds !== prevPeerIdsRef.current) {
        prevPeerIdsRef.current = currentPeerIds;
        setActivePeers(currentPeers);
      }

      // Update positions of active peer cursor divs directly in the DOM
      currentPeers.forEach((peer) => {
        const el = document.getElementById(`cursor-peer-${peer.userId}`);
        if (el) {
          // Translate world coordinates to screen coordinates
          const screenX = peer.x * camera.scale + camera.x;
          const screenY = peer.y * camera.scale + camera.y;
          
          el.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
        }
      });

      animationFrameId = requestAnimationFrame(updatePositions);
    };

    animationFrameId = requestAnimationFrame(updatePositions);
    return () => cancelAnimationFrame(animationFrameId);
  }, [cursorsRef, camera]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {activePeers.map((peer) => (
        <div
          key={peer.userId}
          id={`cursor-peer-${peer.userId}`}
          className="absolute left-0 top-0 will-change-transform transition-transform duration-75 ease-out"
          style={{
            // Position immediately using current camera context to avoid (0,0) jump
            transform: `translate3d(${peer.x * camera.scale + camera.x}px, ${peer.y * camera.scale + camera.y}px, 0)`,
          }}
        >
          {/* Pointer SVG icon */}
          <svg
            className="w-5 h-5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
              fill={peer.color}
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          {/* Name Label badge */}
          <div
            className="ml-4 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white select-none whitespace-nowrap opacity-90 drop-shadow-sm font-sans"
            style={{ backgroundColor: peer.color }}
          >
            {peer.name}
          </div>
        </div>
      ))}
    </div>
  );
}
