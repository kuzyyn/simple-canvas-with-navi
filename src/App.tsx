import { useRef, useEffect, useState, useCallback } from 'react'
import { useSpring, useSpringRef, animated } from '@react-spring/web'
import { useGesture } from '@use-gesture/react'
import { Scan, ZoomIn, ZoomOut, CircleHelp, X } from 'lucide-react'

// ====================================================================
// TUNING CONSTANTS
// ====================================================================

/**
 * MOUSE WHEEL ZOOM CONFIGURATION
 * ---------------------------------------
 * 1. Clamping (Math.min/max): Limits the maximum "jump" per wheel tick.
 *    - LOWER value (e.g. 20) = Safer, prevents huge jumps, but limits max speed.
 *    - HIGHER value (e.g. 100) = Allows fast zooming but risks disorientation.
 * 2. Sensitivity (zoomSensitivity): Controls how much scale changes per pixel of scroll.
 *    - LOWER (e.g. 0.0001) = Slower, finer precision.
 *    - HIGHER (e.g. 0.001) = Faster, more aggressive zoom.
 */
const WHEEL_ZOOM_CONFIG = {
  OUT: {
    MAX_STEP: 100,       // Cap for Zoom Out (dy > 0)
    SENSITIVITY: 0.0035  // Sensitivity for Zoom Out
  },
  IN: {
    MAX_STEP: -100,      // Cap for Zoom In (dy < 0)
    SENSITIVITY: 0.0035  // Sensitivity for Zoom In
  }
}

/**
 * NATIVE PINCH ZOOM CONFIGURATION
 * ---------------------------------------
 * Scale Factor: Multiplier for the pinch speed.
 * - 1.0 = Default 1:1 raw speed.
 * - 2.0 = Twice as fast.
 * - 0.5 = Half speed.
 */
const PINCH_SENSITIVITY = 10.0;

/**
 * INERTIA (COASTING) CONFIGURATION
 * ---------------------------------------
 * POWER: How far to "throw" the canvas based on release velocity.
 * CONFIG: Physics for the slide (friction/tension).
 */
const INERTIA_POWER = 200;
const INERTIA_CONFIG = { mass: 1, tension: 200, friction: 50 };
const DEFAULT_CONFIG = { mass: 1, tension: 170, friction: 26 };


// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

/**
 * Calculates new scale and translation offset to zoom towards a specific point (cursor/origin).
 */
const calculateZoom = (
  currentScale: number,
  deltaScale: number, // The additive change to scale
  currentX: number,
  currentY: number,
  originX: number,
  originY: number
) => {
  let newScale = currentScale + deltaScale

  // Hard limits for scale
  newScale = Math.max(0.1, Math.min(10, newScale))

  const factor = newScale / currentScale
  const newX = originX - factor * (originX - currentX)
  const newY = originY - factor * (originY - currentY)

  return { scale: newScale, x: newX, y: newY }
}

// ====================================================================
// ZOOM BUTTON CONFIGURATION
// ====================================================================
const ZOOM_BUTTON_CONFIG = {
  STEP: 0.3,      // How much to zoom per click (percentage-like)
  MIN: 0.1,       // Minimum scale
  MAX: 5.0,       // Maximum scale
  ANIMATION: { duration: 25 } // Fixed duration locks x/y/scale timing to prevent center drift
};




// ====================================================================
// ITEM CONFIGURATION
// ====================================================================
interface Item {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
}

const INITIAL_ITEMS: Item[] = [
  { id: '1', x: 0, y: 0, width: 200, height: 150, color: '#ff5555', label: 'Red Rect' },
  { id: '2', x: 300, y: 100, width: 150, height: 150, color: '#55ff55', label: 'Green Rect' },
];

// ====================================================================
// COMPONENT: DRAGGABLE ITEM
// ====================================================================
const DraggableItem = ({ item, scale, onUpdate }: { item: Item, scale: any, onUpdate: (id: string, newPos: { x: number, y: number }) => void }) => {

  const bind = useGesture({
    onDrag: ({ movement: [mx, my], first, memo }) => {
      // event.stopPropagation(); 
      // Note: Native listener on container sees event before React, 
      // so we use data-draggable check in container instead.

      let [initialX, initialY] = memo || [item.x, item.y];

      if (first) {
        initialX = item.x;
        initialY = item.y;
        memo = [initialX, initialY];
      }

      const currentScale = scale.get();
      const newX = initialX + mx / currentScale;
      const newY = initialY + my / currentScale;

      onUpdate(item.id, { x: newX, y: newY });

      return memo;
    }
  }, {
    drag: {
      from: () => [0, 0], // Not used because we use memo, but good practice
      filterTaps: true
    }
  });

  return (
    <div
      {...bind()}
      data-draggable="true"
      style={{
        width: item.width,
        height: item.height,
        backgroundColor: item.color,
        position: 'absolute',
        // Center the coordinate system of the item to its x/y
        left: item.x,
        top: item.y,
        transform: 'translate(-50%, -50%)',
        borderRadius: 8,
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none'
      }}
    >
      {item.label}
    </div>
  );
};


export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)

  // UI State
  const [showHelp, setShowHelp] = useState(false)
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);

  const handleUpdateItem = useCallback((id: string, newPos: { x: number, y: number }) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...newPos } : item));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => e.preventDefault()
    document.addEventListener('gesturestart', handler)
    document.addEventListener('gesturechange', handler)
    document.addEventListener('gestureend', handler)
    return () => {
      document.removeEventListener('gesturestart', handler)
      document.removeEventListener('gesturechange', handler)
      document.removeEventListener('gestureend', handler)
    }
  }, [])
  // ... existing code ...


  const api = useSpringRef()
  const springs = useSpring({ x: 0, y: 0, scale: 1, config: DEFAULT_CONFIG, ref: api })
  const { x, y, scale } = springs

  // --- ACTIONS ---

  const performCenterZoom = (direction: 'in' | 'out') => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const centerX = width / 2;
    const centerY = height / 2;

    const currentScale = scale.get();

    let targetScale = direction === 'in'
      ? currentScale * (1 + ZOOM_BUTTON_CONFIG.STEP)
      : currentScale / (1 + ZOOM_BUTTON_CONFIG.STEP);

    // Clamp
    targetScale = Math.min(Math.max(targetScale, ZOOM_BUTTON_CONFIG.MIN), ZOOM_BUTTON_CONFIG.MAX);

    // Convert to delta
    const deltaScale = targetScale - currentScale;

    const result = calculateZoom(
      currentScale,
      deltaScale,
      x.get(),
      y.get(),
      centerX,
      centerY
    );

    api.start({
      ...result,
      config: ZOOM_BUTTON_CONFIG.ANIMATION
    });
  };

  const handleZoomIn = () => performCenterZoom('in');
  const handleZoomOut = () => performCenterZoom('out');



  const handleSmartCenter = useCallback(() => {
    if (!containerRef.current || items.length === 0) return;

    // 1. Get Viewport Dimensions
    const { width: viewportW, height: viewportH } = containerRef.current.getBoundingClientRect();
    const padding = 50;
    // const inboxHeight = 160; // Assuming inbox might take space, but for now ignoring or treating as padding
    const availableW = viewportW - (padding * 2);
    const availableH = viewportH - (padding * 2);

    // 2. Calculate Content Bounding Box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    items.forEach(item => {
      // Fallback dimensions if unassigned (though types say they are required)
      const w = item.width || 200;
      const h = item.height || 150;

      // Item x/y is the center? 
      // Checking DraggableItem: translate(-50%, -50%). Yes, x/y is center.
      // So bounds are x - w/2, x + w/2
      const halfW = w / 2;
      const halfH = h / 2;

      minX = Math.min(minX, item.x - halfW);
      minY = Math.min(minY, item.y - halfH);
      maxX = Math.max(maxX, item.x + halfW);
      maxY = Math.max(maxY, item.y + halfH);
    });

    const boxW = maxX - minX;
    const boxH = maxY - minY;

    // If simply no width/height (single point), add a buffer
    if (boxW === 0 || boxH === 0) return;

    // 3. Calculate Scale to Fit
    const scaleX = availableW / boxW;
    const scaleY = availableH / boxH;
    let targetScale = Math.min(scaleX, scaleY);

    // Clamp scale
    targetScale = Math.min(Math.max(targetScale, 0.1), 1.5);

    // 4. Calculate Center Target
    const centerX = minX + boxW / 2;
    const centerY = minY + boxH / 2;

    // We want the visual center of the bounding box (centerX, centerY) 
    // to match the visual center of the viewport (viewportW/2, viewportH/2).
    // The transform formula is: ScreenX = (WorldX * scale) + x
    // So: x = ScreenX - (WorldX * scale)

    const targetX = (viewportW / 2) - (centerX * targetScale);
    const targetY = (viewportH / 2) - (centerY * targetScale);

    api.start({
      x: targetX,
      y: targetY,
      scale: targetScale,
      config: { mass: 1, tension: 200, friction: 50 }
    });
  }, [items, api]);

  // --- KEYBOARD SHORTCUTS ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Smart Center: Alt + 1
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        handleSmartCenter();
      }
      // Close Help: Escape or Esc
      if (e.key === 'Escape' || e.key === 'Esc') {
        setShowHelp(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSmartCenter]); // Add dependency for correctness

  // --- GESTURES (Existing) ---
  useGesture(
    {
      onDrag: ({ movement: [mx, my], first, memo, down, velocity: [vx, vy], direction: [dirX, dirY], event }) => {
        // Fix for overlap: Ignore if target is a draggable item
        // cast to HTMLElement safely
        const target = event.target as HTMLElement;
        if (target.closest('[data-draggable="true"]')) return memo;

        if (first) memo = [x.get(), y.get()]

        if (down) {
          // Direct tracking while dragging
          api.start({
            x: memo[0] + mx,
            y: memo[1] + my,
            immediate: true
          })
        } else {
          // Inertia (Coasting) on release
          // Velocity is always positive, direction is +/- 1
          const throwX = vx * dirX * INERTIA_POWER
          const throwY = vy * dirY * INERTIA_POWER

          const endX = x.get() + throwX;
          const endY = y.get() + throwY;

          api.start({
            x: endX,
            y: endY,
            immediate: false,
            config: INERTIA_CONFIG
          })
        }
        return memo
      },

      onWheel: ({ event, delta: [dx, dy], ctrlKey }) => {
        // Fix 1: Ignore empty events
        if (dy === 0) return

        event.preventDefault()

        if (ctrlKey) {
          // --- ZOOM Logic (Ctrl + Wheel) ---

          // Fix 2: Filter out Trackpad "Pinch" events which appear as Wheel events with small deltas.
          if (Math.abs(dy) < 15) return;

          const currentScale = scale.get()
          let effectiveDy = dy
          let zoomSensitivity = 0.0005

          if (dy > 0) {
            // ZOOM OUT
            effectiveDy = Math.min(dy, WHEEL_ZOOM_CONFIG.OUT.MAX_STEP)
            zoomSensitivity = WHEEL_ZOOM_CONFIG.OUT.SENSITIVITY
          } else {
            // ZOOM IN
            effectiveDy = Math.max(dy, WHEEL_ZOOM_CONFIG.IN.MAX_STEP)
            zoomSensitivity = WHEEL_ZOOM_CONFIG.IN.SENSITIVITY
          }

          // Calculate factor based on Exponential decay for smooth feel
          const factor = Math.exp(-effectiveDy * zoomSensitivity)

          // Convert factor to a delta relative to current scale for our helper
          // newScale = current * factor => delta = newScale - current = current * (factor - 1)
          const impliedDeltaScale = currentScale * (factor - 1)

          const clientX = (event as WheelEvent).clientX
          const clientY = (event as WheelEvent).clientY

          const result = calculateZoom(
            currentScale,
            impliedDeltaScale,
            x.get(),
            y.get(),
            clientX,
            clientY
          )

          api.start({ ...result, immediate: true })

        } else {
          // --- PAN Logic (Wheel only) ---
          // We strictly follow the event stream. 
          // Platforms with native inertia (macOS) will send decaying events naturally.
          // Platforms without it (Linux/Windows) will stop immediately.
          // This avoids the "laggy throw" caused by waiting for the gesture to timeout.

          const newX = x.get() - dx;
          const newY = y.get() - dy;
          api.start({ x: newX, y: newY, immediate: true })
        }
      },

      onPinch: ({ origin: [ox, oy], delta: [ds], event, memo }) => {
        // IGNORE MOUSE WHEEL EVENTS here
        if (event.type === 'wheel') {
          const wheelDy = (event as WheelEvent).deltaY;
          if (Math.abs(wheelDy) >= 15) return memo;
        }

        const currentScale = scale.get()
        if (currentScale === 0) return
        // --- NATIVE PINCH Logic ---

        // Calculate raw delta with sensitivity applied
        const effectiveDeltaScale = ds * PINCH_SENSITIVITY;

        const result = calculateZoom(
          currentScale,
          effectiveDeltaScale,
          x.get(),
          y.get(),
          ox,
          oy
        )

        api.start({ ...result, immediate: true });
        return memo;
      }
    },
    {
      target: containerRef,
      eventOptions: { passive: false },
      drag: {},
      wheel: {},
      pinch: {
        scaleBounds: { min: 0.1, max: 10 },
        from: () => [scale.get(), scale.get()],
      }
    }
  )

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#f0f0f0',
        touchAction: 'none',
        userSelect: 'none',
        cursor: 'grab',
        position: 'relative'
      }}
    >
      <animated.div
        style={{
          x,
          y,
          scale,
          width: '100%',
          height: '100%',
          transformOrigin: '0 0',
          position: 'absolute',
          willChange: 'transform'
        }}
      >
        {/* Render Items */}
        {items.map(item => (
          <DraggableItem
            key={item.id}
            item={item}
            scale={scale}
            onUpdate={handleUpdateItem}
          />
        ))}

        {/* Grid for visual reference */}
        <div style={{
          position: 'absolute',
          left: -2000, top: -2000,
          width: 4000, height: 4000,
          backgroundImage: 'radial-gradient(#ccc 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          zIndex: -1,
          pointerEvents: 'none'
        }} />
      </animated.div>

      {/* --- UI OVERLAY --- */}
      <div
        onPointerDown={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          backgroundColor: 'white', // Light bg
          border: '1px solid #ddd',
          padding: 4,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 100,
          color: '#444'
        }}>
        {/* 0. Help Button */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          title="Help"
          style={{
            width: 32, height: 32,
            cursor: 'pointer',
            borderRadius: 4,
            border: 'none',
            background: showHelp ? '#eee' : 'transparent',
            color: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = showHelp ? '#eee' : 'transparent'}
        >
          <CircleHelp size={20} />
        </button>

        <div style={{ width: '100%', height: 1, backgroundColor: '#eee', margin: '2px 0' }} />

        {/* 1. Fit to Screen */}
        <button
          onClick={handleSmartCenter}
          title="Fit to Screen (Alt + 1)"
          style={{
            width: 32, height: 32,
            cursor: 'pointer',
            borderRadius: 4,
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Scan size={20} />
        </button>

        {/* 2. Zoom In */}
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          style={{
            width: 32, height: 32,
            cursor: 'pointer',
            borderRadius: 4,
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ZoomIn size={20} />
        </button>

        {/* 3. Level */}
        <div style={{ width: '100%', height: 1, backgroundColor: '#eee', margin: '2px 0' }} />
        <animated.span style={{ fontSize: 10, fontWeight: 500, minWidth: 32, textAlign: 'center', fontFamily: 'monospace', color: '#666' }}>
          {scale.to(s => `${Math.round(s * 100)}%`)}
        </animated.span>
        <div style={{ width: '100%', height: 1, backgroundColor: '#eee', margin: '2px 0' }} />

        {/* 4. Zoom Out */}
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{
            width: 32, height: 32,
            cursor: 'pointer',
            borderRadius: 4,
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ZoomOut size={20} />
        </button>
      </div>



      {/* Help Popup Modal */}
      {showHelp && (
        <div
          onClick={() => setShowHelp(false)} // Close on backdrop click
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 9999, // High z-index to sit on top of everything
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)' // Nice blur effect
          }}
        >
          {/* Modal Content */}
          <div
            onClick={e => e.stopPropagation()} // Prevent close when clicking content
            style={{
              backgroundColor: 'white',
              width: 400,
              maxWidth: '90vw',
              borderRadius: 12,
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              border: '1px solid #ddd',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#222' }}>Canvas Controls</h3>
              <button
                onClick={() => setShowHelp(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#666',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Section: Navigation */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13, textTransform: 'uppercase', color: '#888', letterSpacing: 0.5 }}>Navigation</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444' }}>
                    <span>Pan Canvas</span>
                    <span style={{ fontWeight: 500 }}>Left Click & Drag</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444' }}>
                    <span>Drag Items</span>
                    <span style={{ fontWeight: 500 }}>Click Item & Move</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444' }}>
                    <span>Pan (Wheel)</span>
                    <span style={{ fontWeight: 500 }}>Scroll / 2-Finger Move</span>
                  </div>
                </div>
              </div>

              {/* Section: Zoom */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13, textTransform: 'uppercase', color: '#888', letterSpacing: 0.5 }}>Zooming</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444' }}>
                    <span>Zoom to Cursor</span>
                    <span style={{ fontWeight: 500 }}>Ctrl + Scroll</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444' }}>
                    <span>Pinch Zoom</span>
                    <span style={{ fontWeight: 500 }}>Trackpad Pinch</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444' }}>
                    <span>Button Zoom</span>
                    <span style={{ fontWeight: 500 }}>+ / - Icons</span>
                  </div>
                </div>
              </div>

              {/* Section: Shortcuts */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13, textTransform: 'uppercase', color: '#888', letterSpacing: 0.5 }}>Shortcuts</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444' }}>
                    <span>Smart Center</span>
                    <span style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, border: '1px solid #ddd', fontFamily: 'monospace', fontSize: 12 }}>Alt + 1</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#444' }}>
                    <span>Close Help</span>
                    <span style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, border: '1px solid #ddd', fontFamily: 'monospace', fontSize: 12 }}>Esc</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', background: '#f9f9f9', borderTop: '1px solid #eee', fontSize: 12, color: '#888', textAlign: 'center' }}>
              Quick Reference Guide
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
