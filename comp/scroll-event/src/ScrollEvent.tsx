import React, { useRef, useEffect } from 'react';

// ------------------
// Internal Constants
// ------------------

const scrollEvents: any = [];
const context = { lastScrollY: 0 };

// ------------------
// Internal Functions
// ------------------

function onScroll() {
  const currentScrollY = window.scrollY;
  if (currentScrollY !== context.lastScrollY) {
    const scrollUp = currentScrollY > context.lastScrollY;
    for (const scrollEvent of scrollEvents) {
      const element = scrollEvent.ref.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        if (
          scrollEvent.lastY &&
          ((scrollUp && rect.top <= scrollEvent.top && scrollEvent.lastY > scrollEvent.top) ||
            (!scrollUp && rect.top >= scrollEvent.top && scrollEvent.lastY < scrollEvent.top))
        ) {
          scrollEvent.onScrollTo(scrollUp);
        }
        scrollEvent.lastY = rect.top;
      }
    }
  }
  context.lastScrollY = currentScrollY;
}

function addScrollEvent(ref: React.MutableRefObject<null>, top: number, onScrollTo?: (scrollUp: boolean) => void) {
  if (!onScrollTo) {
    return -1;
  }

  scrollEvents.push({ ref, top, onScrollTo });
  if (scrollEvents.length === 1) {
    window.addEventListener('scroll', onScroll, false);
  }
  return scrollEvents.length;
}

function removeScrollEvent(index: number) {
  if (index >= 0) {
    scrollEvents.splice(index, 1);
    if (scrollEvents.length == 0) {
      window.removeEventListener('scroll', onScroll);
    }
  }
}

// --------------
// Exported Types
// --------------

export type ScrollEventProps = {
  top?: number;
  onScrollTo?: (scrollUp: boolean) => void;
} & React.BaseHTMLAttributes<HTMLDivElement>;

// -------------------
// Exported Components
// -------------------

export function ScrollEvent({ top, onScrollTo, ...rest }: ScrollEventProps) {
  const divRef = useRef(null);

  useEffect(() => {
    const index = addScrollEvent(divRef, top || 0, onScrollTo);
    return () => removeScrollEvent(index);
  });

  return <div ref={divRef} {...rest} />;
}
