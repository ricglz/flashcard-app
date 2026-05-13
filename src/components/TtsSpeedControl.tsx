"use client";

import { useEffect, useRef, useState } from "react";

export default function TtsSpeedControl({
  speed,
  onSpeedChange,
}: {
  speed: number;
  onSpeedChange: (speed: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="text-sm text-muted hover:text-foreground transition-colors tabular-nums"
        aria-label="TTS speed"
        aria-expanded={isOpen}
      >
        {speed}x
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-card-bg border border-edge rounded-lg p-3 shadow-lg min-w-[160px]">
          <label className="text-xs text-muted block mb-1">
            Speed: {speed}x
          </label>
          <input
            type="range"
            min={0.25}
            max={2}
            step={0.25}
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-xs text-muted mt-0.5">
            <span>0.25x</span>
            <span>1x</span>
            <span>2x</span>
          </div>
        </div>
      )}
    </div>
  );
}
