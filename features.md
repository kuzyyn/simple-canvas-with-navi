# Canvas Test App Features

This document outlines the interactive features and behaviors implemented in the `canvas_test_app`.

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
