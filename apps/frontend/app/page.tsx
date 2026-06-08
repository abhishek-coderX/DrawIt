'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Page() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen font-sans overflow-x-hidden" style={{ background: '#fefae0', color: '#780000' }}>
      {/* Navbar */}
      <nav
        className={`fixed w-full top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'border-b backdrop-blur-md'
            : 'border-b border-transparent bg-transparent'
        }`}
        style={isScrolled ? {
          borderColor: '#ccd5ae',
          background: 'rgba(254,250,224,0.85)',
        } : {}}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-2xl font-black tracking-tight" style={{ color: '#780000' }}>
                  DrawIt
                </span>
              </Link>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 sm:gap-6">
              
              <Link
                href="/signin"
                className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200"
                style={{ background: '#d4a373', color: '#780000' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#c1121f'
                  e.currentTarget.style.color = '#fff'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#d4a373'
                  e.currentTarget.style.color = '#780000'
                }}
              >
                login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Backing Ambient Blur */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 -z-10 h-[500px] w-[500px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(212,163,115,0.18)' }} />

        <div className="max-w-5xl mx-auto text-center">
          {/* Header Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-8 animate-fade-in"
            style={{ borderColor: '#ccd5ae', background: '#faedcd', color: '#bc6c25' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: '#d4a373' }} />
            Collaborative Canvas Engine 2.0
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.15] text-pretty max-w-4xl mx-auto" style={{ color: '#780000' }}>
            Where{' '}
            <span style={{ color: '#bc6c25' }}>
              ideas take shape
            </span>{' '}
            together
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl mb-12 max-w-2xl mx-auto leading-relaxed text-balance" style={{ color: '#bc6c25' }}>
            Collaborate in real-time with live cursors, infinite canvas, and automatic syncing. Build, design, and ideate without boundaries.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-24">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 font-semibold rounded-xl transition-all duration-200 text-center hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: '#d4a373', color: '#780000' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#c1121f'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#d4a373'
                e.currentTarget.style.color = '#780000'
              }}
            >
              Get started free →
            </Link>
            <Link
              href="/canvas/demo"
              className="w-full sm:w-auto px-8 py-4 border font-semibold rounded-xl transition-all duration-200 text-center"
              style={{ borderColor: '#ccd5ae', color: '#780000', background: 'transparent' }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#d4a373'
                e.currentTarget.style.background = 'rgba(212,163,115,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#ccd5ae'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              View demo
            </Link>
          </div>

          {/* Canvas Preview - Whiteboard Mockup */}
          <div className="relative mx-auto max-w-4xl">
            {/* Ambient border glow */}
            <div className="absolute inset-0 rounded-2xl opacity-20 blur-xl -z-10" style={{ background: 'linear-gradient(to right, #d4a373, #bc6c25)' }} />

            <div className="relative rounded-2xl border overflow-hidden p-2 sm:p-4 shadow-[0_12px_40px_rgba(120,0,0,0.12)]" style={{ background: '#faedcd', borderColor: '#ccd5ae' }}>
              {/* Toolbar Mockup */}
              <div className="flex justify-between items-center border-b px-4 py-3 rounded-t-xl backdrop-blur-sm" style={{ borderColor: '#ccd5ae', background: 'rgba(254,250,224,0.6)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]/60" />
                  <span className="w-3 h-3 rounded-full bg-[#eab308]/60" />
                  <span className="w-3 h-3 rounded-full bg-[#22c55e]/60" />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono border px-3 py-1 rounded-lg" style={{ color: '#bc6c25', background: '#fefae0', borderColor: '#ccd5ae' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  Live Room: Collaborative Sandbox
                </div>
                <div className="w-12" />
              </div>

              {/* Drawing Board Grid Container */}
              <div className="relative z-10 w-full h-[280px] sm:h-[400px] overflow-hidden rounded-b-xl border-t" style={{ background: '#fefae0', borderColor: '#ccd5ae' }}>
                {/* SVG Infinite Grid */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-40 pointer-events-none"
                  width="100%"
                  height="100%"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id="grid-hero"
                      width="40"
                      height="40"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 40 0 L 0 0 0 40"
                        fill="none"
                        stroke="#ccd5ae"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid-hero)" />
                </svg>

                {/* Hand Drawn Visuals */}
                <svg className="w-full h-full" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Sketchy Rectangle 1 (Idea) */}
                  <path d="M 98 122 C 150 120, 200 121, 248 123 C 251 160, 249 200, 252 238 C 190 241, 140 239, 101 240 C 97 200, 99 160, 98 122 Z" stroke="#780000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                  <path d="M 101 120 C 145 119, 195 120, 251 121 C 248 165, 250 205, 249 241 C 200 238, 150 240, 99 239 C 100 205, 98 165, 101 120 Z" stroke="#780000" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                  <text x="175" y="185" fill="#780000" fontSize="15" fontFamily="var(--font-sans), sans-serif" fontWeight="600" textAnchor="middle">User Signup Flow</text>

                  {/* Sketchy Arrow */}
                  <path d="M 270 180 C 310 170, 360 170, 400 180" stroke="#c1121f" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M 390 172 C 394 175, 397 178, 401 180 C 396 183, 392 186, 388 189" stroke="#c1121f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="335" y="150" fill="#bc6c25" fontSize="11" fontFamily="var(--font-sans), sans-serif" fontWeight="500" textAnchor="middle">WebSocket Sync</text>

                  {/* Sketchy Ellipse (Room DB) */}
                  <path d="M 430 180 C 430 140, 570 140, 570 180 C 570 220, 430 220, 430 180 Z" stroke="#bc6c25" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                  <path d="M 432 178 C 435 142, 568 138, 568 182 C 565 222, 432 218, 432 178 Z" stroke="#bc6c25" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                  <text x="500" y="185" fill="#780000" fontSize="15" fontFamily="var(--font-sans), sans-serif" fontWeight="600" textAnchor="middle">Interactive Canvas</text>

                  {/* Checkmark on User Flow */}
                  <path d="M 590 140 L 600 155 L 625 125" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  
                  {/* Pencil Scribble */}
                  <path d="M 120 215 Q 150 220 180 212 T 230 215" stroke="#d4a373" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
                  
                  {/* Yellow Sketch Star */}
                  <path d="M 330 240 L 335 255 L 350 255 L 338 265 L 342 280 L 330 270 L 318 280 L 322 265 L 310 255 L 325 255 Z" stroke="#c1121f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
                </svg>

                {/* Animated colored cursors */}
                {/* Cursor 1 */}
                <div className="absolute left-0 top-0 pointer-events-none transition-transform duration-75 ease-out animate-cursor1 select-none z-20">
                  <svg className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="#780000" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  <div className="ml-4 mt-1 px-2 py-0.5 rounded text-[10px] font-bold text-white drop-shadow-md whitespace-nowrap" style={{ background: '#780000' }}>
                    Abhishek
                  </div>
                </div>

                {/* Cursor 2 */}
                <div className="absolute left-0 top-0 pointer-events-none transition-transform duration-75 ease-out animate-cursor2 select-none z-20">
                  <svg className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="#bc6c25" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  <div className="ml-4 mt-1 px-2 py-0.5 rounded text-[10px] font-bold text-white drop-shadow-md whitespace-nowrap" style={{ background: '#bc6c25' }}>
                    Sarah
                  </div>
                </div>

                {/* Cursor 3 */}
                <div className="absolute left-0 top-0 pointer-events-none transition-transform duration-75 ease-out animate-cursor3 select-none z-20">
                  <svg className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" viewBox="0 0 24 24" fill="none">
                    <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="#c1121f" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  <div className="ml-4 mt-1 px-2 py-0.5 rounded text-[10px] font-bold text-white drop-shadow-md whitespace-nowrap" style={{ background: '#c1121f' }}>
                    Alex
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-28 sm:py-36 px-4 sm:px-6 lg:px-8" style={{ background: 'rgba(250,237,205,0.5)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: '#780000' }}>
              Built for collaboration
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#bc6c25' }}>
              Everything you need to map user experiences and ideate together
            </p>
          </div>

          {/* Features Grid — 2 cols on md, 4 cols on xl */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 sm:p-10 rounded-2xl border backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-1" style={{ background: 'rgba(250,237,205,0.6)', borderColor: '#ccd5ae' }}>
              <div className="w-12 h-12 rounded-xl border flex items-center justify-center mb-6 transition-all duration-300" style={{ background: 'rgba(212,163,115,0.15)', borderColor: '#d4a373', color: '#780000' }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#780000' }}>
                Real-time collaboration
              </h3>
              <p className="leading-relaxed text-sm" style={{ color: '#bc6c25' }}>
                See live cursors, shape selections, and real-time edits from every user on your team as they happen.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 sm:p-10 rounded-2xl border backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-1" style={{ background: 'rgba(250,237,205,0.6)', borderColor: '#ccd5ae' }}>
              <div className="w-12 h-12 rounded-xl border flex items-center justify-center mb-6 transition-all duration-300" style={{ background: 'rgba(212,163,115,0.15)', borderColor: '#d4a373', color: '#780000' }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4M4 20l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#780000' }}>Infinite canvas</h3>
              <p className="leading-relaxed text-sm" style={{ color: '#bc6c25' }}>
                Pan, zoom, and explore without limits. Smooth 60fps animations ensure your canvas grows with your team's ideas.
              </p>
            </div>

            {/* Feature 3 — Undo/Redo History */}
            <div className="group relative p-8 sm:p-10 rounded-2xl border backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-1" style={{ background: 'rgba(250,237,205,0.6)', borderColor: '#ccd5ae' }}>
              <div className="w-12 h-12 rounded-xl border flex items-center justify-center mb-6 transition-all duration-300" style={{ background: 'rgba(212,163,115,0.15)', borderColor: '#d4a373', color: '#780000' }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#780000' }}>Undo/Redo History</h3>
              <p className="leading-relaxed text-sm" style={{ color: '#bc6c25' }}>
                Made a mistake? Press Ctrl+Z to undo any drawing instantly. Full history stack so you never lose work.
              </p>
            </div>

            {/* Feature 4 — Share & Collaborate */}
            <div className="group relative p-8 sm:p-10 rounded-2xl border backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-1" style={{ background: 'rgba(250,237,205,0.6)', borderColor: '#ccd5ae' }}>
              <div className="w-12 h-12 rounded-xl border flex items-center justify-center mb-6 transition-all duration-300" style={{ background: 'rgba(212,163,115,0.15)', borderColor: '#d4a373', color: '#780000' }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#780000' }}>Share & Collaborate</h3>
              <p className="leading-relaxed text-sm" style={{ color: '#bc6c25' }}>
                Copy your room link and share it with anyone. They join instantly and see your canvas in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-28 sm:py-36 px-4 sm:px-6 lg:px-8" style={{ background: '#fefae0' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight" style={{ color: '#780000' }}>
              How it works
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#bc6c25' }}>
              Get up and running in less than a minute. Collaboration has never been this seamless.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting lines for desktop */}
            <div className="hidden md:block absolute top-[2.2rem] left-[15%] right-[15%] h-[1px] -z-10" style={{ background: 'linear-gradient(to right, transparent, #ccd5ae, transparent)' }} />

            {/* Step 1 */}
            <div className="text-center flex flex-col items-center group">
              <div className="w-16 h-16 rounded-full border flex items-center justify-center font-extrabold text-xl mb-6 transition-all duration-300" style={{ background: '#faedcd', borderColor: '#ccd5ae', color: '#780000' }}>
                1
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#780000' }}>Create a room</h3>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#bc6c25' }}>
                Launch a workspace in seconds directly from your dashboard. Choose a name and make it active.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center flex flex-col items-center group">
              <div className="w-16 h-16 rounded-full border flex items-center justify-center font-extrabold text-xl mb-6 transition-all duration-300" style={{ background: '#faedcd', borderColor: '#ccd5ae', color: '#780000' }}>
                2
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#780000' }}>Share the link</h3>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#bc6c25' }}>
                Copy the room link and invite teammates. Guests can join and sketch instantly with zero signup friction.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center flex flex-col items-center group">
              <div className="w-16 h-16 rounded-full border flex items-center justify-center font-extrabold text-xl mb-6 transition-all duration-300" style={{ background: '#faedcd', borderColor: '#ccd5ae', color: '#780000' }}>
                3
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#780000' }}>Draw together</h3>
              <p className="text-sm leading-relaxed max-w-xs" style={{ color: '#bc6c25' }}>
                Brainstorm, sketch designs, or annotate. Live cursors ensure everyone is synchronized at 60fps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-28 sm:py-36 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: '#fefae0' }}>
        {/* Soft Glow Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] -z-10 pointer-events-none" style={{ background: 'rgba(212,163,115,0.15)' }} />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-8 tracking-tight" style={{ color: '#780000' }}>
            Start drawing in seconds
          </h2>
          <p className="text-lg sm:text-xl mb-12 max-w-xl mx-auto leading-relaxed" style={{ color: '#bc6c25' }}>
            No credit card required. Create your first board instantly.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 font-semibold rounded-xl transition-all duration-200 text-center hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: '#d4a373', color: '#780000' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#c1121f'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#d4a373'
              e.currentTarget.style.color = '#780000'
            }}
          >
            Get started free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className=" py-20 px-4 sm:px-6 lg:px-8" style={{ borderColor: '#ccd5ae', background: '#fefae0' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <span className="text-2xl font-black mb-4 inline-block" style={{ color: '#780000' }}>
                DrawIt
              </span>
              <p className="text-sm max-w-sm leading-relaxed mb-6" style={{ color: '#bc6c25' }}>
                The real-time collaborative canvas for teams. Sketch ideas, map user journeys, and collaborate with zero friction.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: '#780000' }}>Product</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/canvas/demo" className="transition-colors duration-200" style={{ color: '#bc6c25' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#780000')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#bc6c25')}
                  >
                    Live Demo
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="transition-colors duration-200" style={{ color: '#bc6c25' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#780000')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#bc6c25')}
                  >
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: '#780000' }}>Connect</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors duration-200 flex items-center gap-2"
                    style={{ color: '#bc6c25' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#780000')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#bc6c25')}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4  border-t pt-8" style={{ borderColor: '#ccd5ae' }}>
            <p className="text-sm" style={{ color: '#bc6c25' }}>
              © 2026 DrawIt. All rights reserved.
            </p>
            <p className="text-xs" style={{ color: '#bc6c25' }}>
              Designed for high-performance visual brainstorming.
            </p>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style>{`
        @keyframes cursor1Move {
          0%, 100% { transform: translate3d(100px, 140px, 0); }
          33% { transform: translate3d(240px, 200px, 0); }
          66% { transform: translate3d(500px, 160px, 0); }
        }
        @keyframes cursor2Move {
          0%, 100% { transform: translate3d(580px, 220px, 0); }
          45% { transform: translate3d(440px, 150px, 0); }
          85% { transform: translate3d(180px, 210px, 0); }
        }
        @keyframes cursor3Move {
          0%, 100% { transform: translate3d(320px, 250px, 0); }
          25% { transform: translate3d(335px, 175px, 0); }
          75% { transform: translate3d(590px, 130px, 0); }
        }
        .animate-cursor1 {
          animation: cursor1Move 10s infinite ease-in-out;
        }
        .animate-cursor2 {
          animation: cursor2Move 12s infinite ease-in-out;
        }
        .animate-cursor3 {
          animation: cursor3Move 8s infinite ease-in-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
