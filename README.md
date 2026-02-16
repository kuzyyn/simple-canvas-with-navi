# Miro-Style Canvas Navigation

A reference implementation for infinite canvas interaction. This project solves the common challenges of building professional-grade creative tools: fluid omni-directional panning, precisely-tuned zoom mechanics, and scale-aware object interaction.

### Why this exists
Implementing a "natural" navigation experience like Miro's is deceptively complex. This app handles the edge cases developers frequently struggle with:
- **Fluid Panning**: Unified support for mouse-drag, scroll wheel, and two-finger touchpad slides.
- **Precision Zooming**: Independent velocity curves for `Ctrl + Wheel` (precision) and trackpad pinch-to-zoom (natural).
- **Interactive Items**: Reliable item dragging with real-time scale compensation and event isolation.
- **Viewport Mastery**: Native-feeling "zoom-to-cursor" and optimized "Fit to Screen" logic.

## Credits
Seems easy but it was not. Took many trial and errors to make it working as expected.
Credits goes to Antigravity + Gemini 3 Pro (high) for writing 99% of code
And to Antigravity + Sonnet 4.5 for fixing last bug, which Gemini couldn't fix for 2 hours of agentic work and in the end Sonnet solved in 5 minutes with 3 lines of code (1%).
Note 2: actually it was not the last issue. After further playing, it turned out dragging is not optimal, it refreshed state of the card with each move. Replacing with drag animation + commit at the end helped for performance and took 5 minutes to deliver, then solving issue with inconsistent state took another 3h and trying different approaches with Antigravity to fix.

## starting app

```npm run dev```




## 1. Canvas Navigation
The canvas supports physics-based navigation using `react-spring` and `@use-gesture/react`.

*   **Pan (Drag)**:
    *   Click and drag to move the canvas.
    *   **Inertia (Coasting)**: Releasing a drag with velocity triggers a physics-based slide (throw), simulating a natural "toss" effect.
*   **Pan (Wheel)**:
    *   Standard scrolling (vertical/horizontal) pans the canvas.
    *   Mimics native OS scrolling behavior (immediate response).

## 2. Item Interaction
*   **Drag & Drop**:
    *   Items (rectangles) can be dragged independently of the canvas.
    *   **Event Isolation**: Dragging an item prevents the canvas from panning (via `stopPropagation`).
    *   **Scale Compensation**: Movement is automatically adjusted based on current zoom level to ensure 1:1 cursor tracking.

## 3. Zooming Behaviors
Multiple zoom modes are supported, each with specific tuning for precision.

*   **Pinch-to-Zoom**:
    *   Native trackpad support.
    *   Zooms towards the center of the pinch gesture.
*   **Wheel Zoom (Ctrl + Scroll)**:
    *   Hold `Ctrl` and scroll to zoom.
    *   **Cursor-Focused**: Zooming is anchored exactly to the mouse cursor position (Miro-style).
    *   **Smooth Smoothing**: Uses exponential decay for fine-grained control.
*   **Button Zoom (`+` / `-`)**:
    *   **Center-Focused**: Buttons zoom towards the exact center of the current viewport.
    *   **Fast Response**: Uses a 25ms animation duration to ensure instant response and prevent visual drift during rapid clicking.
*   **Zoom Limits**:
    *   Constrained between **10%** and **500%**.

## 3. Smart Center ("Fit to Screen")
*   **Functionality**: Automatically calculates the optimal scale and position to fit the content within the viewport.
*   **Trigger**: 
    *   UI Button (`Scan` icon).
    *   Keyboard Shortcut: `Alt + 1`.
*   **Configuration**: Respects a configurable padding to ensure content isn't flush with edges.

## 4. UI Overlay
A clean, light-mode interface floats above the canvas.

*   **Controls** (Right-Bottom):
    1.  **Help**: Toggles a popup showing shortcuts.
    2.  **Fit to Screen**: Triggers Smart Center.
    3.  **Zoom In / Out**: Incremental zoom controls.
    4.  **Level Display**: Shows current zoom percentage (e.g., "100%").
*   **Event Isolation**: Interaction with UI buttons is isolated from the canvas; clicking buttons does **not** trigger canvas drag/pan events.

## Technical Details
*   **Stack**: React, TypeScript, Vite.
*   **Animation**: `@react-spring/web` for performant, interruptible physics animations.
*   **Gestures**: `@use-gesture/react` for normalizing touch, mouse, and wheel events.
*   **Icons**: `lucide-react`.
