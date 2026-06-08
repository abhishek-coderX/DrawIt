import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DrawIt — Collaborative Whiteboard",
  description: "Real-time collaborative drawing. Sketch, diagram, and design together.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={geist.className} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111111",
              color: "#ededed",
              border: "1px solid #222222",
              borderRadius: "8px",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}