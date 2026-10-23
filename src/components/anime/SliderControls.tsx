"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const CONTROL_BUTTON_CLASS =
  "glass-btn glass-btn--dark flex h-11 w-11 items-center justify-center rounded-full text-white";

/**
 * Previous/next arrows + pagination dots, docked bottom-right.
 * Hidden entirely for zero/one-slide datasets.
 */
export default function SliderControls({
  slideCount,
  activeIndex,
  onSelect,
  onPrevious,
  onNext,
}: {
  slideCount: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (slideCount < 2) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-end px-6 pb-6 sm:px-10 sm:pb-8 lg:px-16 xl:px-24">
      <div className="pointer-events-auto flex items-center gap-4 sm:gap-5">
        <div className="flex items-center gap-2.5" role="group" aria-label="Choose slide">
          {Array.from({ length: slideCount }, (_, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelect(index)}
                aria-label={`Go to slide ${index + 1} of ${slideCount}`}
                aria-current={isActive ? "true" : undefined}
                className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  isActive
                    ? "w-8 bg-white"
                    : "w-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            );
          })}
        </div>
        <button type="button" onClick={onPrevious} aria-label="Previous slide" className={CONTROL_BUTTON_CLASS}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={onNext} aria-label="Next slide" className={CONTROL_BUTTON_CLASS}>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
