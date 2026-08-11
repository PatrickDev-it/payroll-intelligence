"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

type ScrollMetrics = {
  max: number;
  now: number;
  thumbHeight: number;
  thumbTop: number;
  visible: boolean;
};

const EMPTY_METRICS: ScrollMetrics = {
  max: 0,
  now: 0,
  thumbHeight: 0,
  thumbTop: 0,
  visible: false,
};

/**
 * An overlay document scrollbar: the native gutter stays hidden, while this
 * fixed thumb mirrors the one document scroller without consuming layout
 * width. It remains visually stable when a Radix overlay locks body scrolling.
 */
export function DocumentScrollbar({ label }: { label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientY: number;
    startScrollY: number;
  } | null>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>(EMPTY_METRICS);
  const [dragging, setDragging] = useState(false);

  const measure = useCallback(() => {
    const root = document.documentElement;
    const viewportHeight = window.innerHeight;
    const documentHeight = Math.max(root.scrollHeight, document.body.scrollHeight);
    const max = Math.max(0, documentHeight - viewportHeight);
    const now = Math.min(max, Math.max(0, window.scrollY));
    const atom = Number.parseFloat(getComputedStyle(root).getPropertyValue("--p")) || 4;
    const trackHeight = trackRef.current?.clientHeight ?? Math.max(0, viewportHeight - atom * 4);
    const thumbHeight = max === 0
      ? 0
      : Math.min(trackHeight, Math.max(atom * 10, trackHeight * (viewportHeight / documentHeight)));
    const travel = Math.max(0, trackHeight - thumbHeight);
    const thumbTop = max === 0 ? 0 : (now / max) * travel;

    setMetrics({ max, now, thumbHeight, thumbTop, visible: max > atom });
  }, []);

  useEffect(() => {
    let frame = 0;
    document.documentElement.dataset.overlayScrollbar = "true";
    const scheduleMeasure = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(document.documentElement);
    observer.observe(document.body);
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();

    return () => {
      delete document.documentElement.dataset.overlayScrollbar;
      observer.disconnect();
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, [measure]);

  function scrollTo(top: number) {
    const target = Math.min(metrics.max, Math.max(0, top));
    const scroller = document.scrollingElement;
    if (scroller) {
      scroller.scrollTop = target;
      return;
    }
    window.scrollTo(0, target);
  }

  function handleTrackPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !metrics.visible) return;
    const track = event.currentTarget.getBoundingClientRect();
    const travel = Math.max(1, track.height - metrics.thumbHeight);
    const target = ((event.clientY - track.top - metrics.thumbHeight / 2) / travel) * metrics.max;
    scrollTo(target);
  }

  function handleThumbPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientY: event.clientY,
      startScrollY: window.scrollY,
    };
    setDragging(true);
  }

  function handleThumbPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const trackHeight = trackRef.current?.clientHeight ?? 0;
    const travel = Math.max(1, trackHeight - metrics.thumbHeight);
    scrollTo(drag.startScrollY + ((event.clientY - drag.startClientY) / travel) * metrics.max);
  }

  function stopDragging(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const atom = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--p")) || 4;
    const line = atom * 10;
    const page = window.innerHeight * 0.85;
    const targets: Partial<Record<typeof event.key, number>> = {
      ArrowUp: metrics.now - line,
      ArrowDown: metrics.now + line,
      PageUp: metrics.now - page,
      PageDown: metrics.now + page,
      Home: 0,
      End: metrics.max,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    scrollTo(target);
  }

  const style = {
    "--scrollbar-thumb-height": `${metrics.thumbHeight}px`,
    "--scrollbar-thumb-top": `${metrics.thumbTop}px`,
  } as CSSProperties;

  return (
    <div
      ref={trackRef}
      data-testid="document-scrollbar"
      data-visible={metrics.visible}
      data-dragging={dragging}
      className="document-scrollbar"
      style={style}
      onPointerDown={handleTrackPointerDown}
    >
      <div
        role="scrollbar"
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={Math.round(metrics.max)}
        aria-valuenow={Math.round(metrics.now)}
        aria-hidden={!metrics.visible || undefined}
        tabIndex={metrics.visible ? 0 : -1}
        className="document-scrollbar-thumb"
        onKeyDown={handleKeyDown}
        onPointerDown={handleThumbPointerDown}
        onPointerMove={handleThumbPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      />
    </div>
  );
}
