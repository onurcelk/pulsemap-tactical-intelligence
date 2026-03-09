import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Layers, Flame, ShieldAlert, X, ChevronRight, CheckCircle2, User } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
  isOpen: boolean;
  onLoginRequested?: () => void;
  onSignUpRequested?: () => void;
}

const SLIDES = [
  {
    id: 'slide-map',
    targetId: 'app-map-area',
    icon: Map,
    title: 'Global Intelligence Map',
    desc: 'Drag to pan, scroll to zoom. Click any flashing node to open its detailed intelligence report. The tactical radar sweeps for new incoming signals.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
  },
  {
    id: 'slide-filters',
    targetId: 'sidebar-filter-toggle',
    icon: Layers,
    title: 'Category Filtering',
    desc: 'Isolate specific signal types like Military (Red crosshair), Explosions (Orange flame), Protests (Blue users), or Humanitarian (Green heart).',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
  },
  {
    id: 'slide-intel',
    targetId: 'sidebar-intel-feed',
    icon: Flame,
    title: 'Live Intel Feed',
    desc: 'Incoming telemetry streams here. Events marked with a \uD83D\uDD25🔥 indicate critical, multi-source verification. Click to expand all related raw source links.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
  },
  {
    id: 'slide-strategic',
    targetId: 'sidebar-mode-strip',
    icon: ShieldAlert,
    title: 'Strategic Assets',
    desc: 'Toggle these layers to reveal local nuclear facilities, military bases, energy chokepoints, and space infrastructure relative to conflict zones.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/20',
  },
  {
    id: 'slide-auth',
    targetId: 'app-top-bar',
    icon: User,
    title: 'Agent Verification',
    desc: 'Log in or sign up to save your strategic preferences, access restricted layers, and orchestrate global tracking features.',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
  },
];

export default function TutorialOverlay({
  onComplete,
  isOpen,
  onLoginRequested,
  onSignUpRequested,
}: TutorialOverlayProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset slide when reopened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setCurrentSlide(0), 0);
    }
  }, [isOpen]);

  // Measure the target DOM element for the Spotlight
  useEffect(() => {
    if (!isOpen) return;

    const updateRect = () => {
      const targetId = SLIDES[currentSlide].targetId;
      const el = document.getElementById(targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null); // Fallback to center if element not found
      }
    };

    updateRect();
    // Re-measure on resize or scroll changes that might affect layout
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [currentSlide, isOpen]);

  if (!isOpen) return null;

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      finishTutorial();
    }
  };

  const finishTutorial = () => {
    localStorage.setItem('pulsemap_tutorial_seen', 'true');
    onComplete();
  };

  const slide = SLIDES[currentSlide];
  const SlideIcon = slide.icon;

  // Calculate modal position so it doesn't overlap the spotlight
  let modalStyle: React.CSSProperties = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  };

  if (targetRect) {
    const isMobile = window.innerWidth < 768;
    const padding = 20;

    if (isMobile) {
      // Mobile: Usually place modal at the bottom to avoid keyboard/header issues,
      // but if the target is at the bottom, place it at the top.
      const isTargetAtBottom = targetRect.bottom > window.innerHeight / 2;
      if (isTargetAtBottom) {
        modalStyle = {
          top: padding,
          left: padding,
          width: `calc(100vw - ${padding * 2}px)`,
          transform: 'none',
        };
      } else {
        modalStyle = {
          bottom: padding,
          left: padding,
          width: `calc(100vw - ${padding * 2}px)`,
          transform: 'none',
        };
      }
    } else {
      // Desktop: Place next to the target
      const spaceRight = window.innerWidth - targetRect.right;
      const spaceLeft = targetRect.left;

      const modalWidth = 450; // Max width of our modal

      // Standard Sidebar is on the left, so we usually have space on the right
      if (spaceRight > modalWidth + padding) {
        modalStyle = {
          top: Math.max(padding, Math.min(targetRect.top, window.innerHeight - 500)), // Try to align to top of target, but stay on screen
          left: targetRect.right + padding,
          transform: 'none',
        };
      } else if (spaceLeft > modalWidth + padding) {
        modalStyle = {
          top: Math.max(padding, Math.min(targetRect.top, window.innerHeight - 500)),
          right: window.innerWidth - targetRect.left + padding,
          transform: 'none',
        };
      } else {
        // Fallback to center if it's a huge target (like the map)
        modalStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      }
    }
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[9999] pointer-events-auto">
      {/* ── SVG Spotlight Mask ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />

            {targetRect && (
              <motion.rect
                initial={false}
                animate={{
                  x: targetRect.left - 8,
                  y: targetRect.top - 8,
                  width: targetRect.width + 16,
                  height: targetRect.height + 16,
                  rx: 16,
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* The darkened overlay that uses the mask to cut out a hole */}
        <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.75)" mask="url(#spotlight-mask)" />

        {/* Outline around the cutout for flair */}
        {targetRect && (
          <motion.rect
            initial={false}
            animate={{
              x: targetRect.left - 8,
              y: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              rx: 16,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeDasharray="8 4"
            className="opacity-50"
          />
        )}
      </svg>

      {/* ── Tutorial Card ── */}
      <div
        className="absolute transition-all duration-500 ease-out w-full max-w-md pointer-events-auto"
        style={modalStyle}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15, position: 'absolute' }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-[var(--bg)] border border-[var(--cursor)]/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] rounded-2xl overflow-hidden glass mix-blend-normal"
            style={{
              borderColor: `var(--${slide.bg.split('-')[1]}, var(--accent))`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--line)]/50 bg-[var(--line)]/10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${slide.bg}`}>
                  <SlideIcon size={20} className={slide.color} />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-[var(--ink)]">
                  {slide.title}
                </h2>
              </div>

              <button
                onClick={finishTutorial}
                className="p-1.5 text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)] rounded-lg transition-colors"
                title="Skip Tutorial"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              <p className="text-[var(--ink-dim)] leading-relaxed text-[13px] font-medium min-h-[60px]">
                {slide.desc}
              </p>
            </div>

            {/* Footer */}
            <div className="bg-[var(--line)]/10 p-4 flex items-center justify-between">
              {/* Progress dots */}
              <div className="flex gap-2 pl-2">
                {SLIDES.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-[var(--accent)] w-5' : 'bg-[var(--line)]'}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {currentSlide === SLIDES.length - 1 && onLoginRequested && onSignUpRequested && (
                  <div className="flex gap-2 mr-2">
                    <button
                      onClick={() => {
                        onLoginRequested();
                        onComplete();
                      }}
                      className="px-4 py-2 border border-[var(--ink)]/20 rounded-lg font-black uppercase tracking-widest text-[10px] text-[var(--ink)] hover:bg-[var(--line)] transition-all shadow-sm"
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => {
                        onSignUpRequested();
                        onComplete();
                      }}
                      className="px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] text-[var(--bg)] bg-[var(--accent)] hover:bg-red-500 transition-all shadow-md shadow-red-500/20"
                    >
                      Sign Up
                    </button>
                  </div>
                )}
                <button
                  onClick={nextSlide}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold uppercase tracking-widest text-[10px] transition-colors ${currentSlide === SLIDES.length - 1 ? 'bg-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)]' : 'bg-[var(--ink)] text-[var(--bg)] hover:bg-[var(--accent)] hover:text-white'}`}
                >
                  {currentSlide === SLIDES.length - 1 ? (
                    <>
                      Skip <ChevronRight size={14} />
                    </>
                  ) : (
                    <>
                      Next <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
