# Developer Guide: Harmonic Stereo Tuning

## Overview
Harmonic Stereo Tuning is a professional-grade audio analysis and signal generation suite. It combines real-time stereo frequency generation with advanced oscilloscope visualization and flexible audio source management.

## Architecture

### Core Technologies
- **React 18**: UI component architecture.
- **Tailwind CSS**: Utility-first styling with a custom "Glassmorphism" theme.
- **Web Audio API**: The backbone of the signal generation and analysis engine.
- **Framer Motion**: High-performance animations and interactive transitions.
- **PWA (Progressive Web App)**: Offline support and mobile installation capabilities.

### Key Components

#### 1. Audio Engine (`src/App.tsx`)
The engine manages two primary audio paths:
- **Playback Path**: Handles external audio/video files and URL streams. Includes a `playbackRate` controller and stereo gain matrix.
- **Generator Path**: Dual-oscillator system (Left/Right) for precise frequency emission (5Hz - 25kHz).

#### 2. Visualization System
Uses the HTML5 Canvas API to render real-time data:
- **Oscilloscope**: Visualizes the time-domain waveform of the playback source.
- **Frequency Monitor**: Visualizes the generated harmonic signals.
- **Starfield**: A background particle system for aesthetic depth.

#### 3. Interactive Controls (`Knob` component)
A custom-built rotary control system that:
- Uses polar coordinate math for rotation calculation.
- Supports touch and mouse interaction.
- Features orbital red indicators for precise visual feedback.

## Development Workflow

### PWA Management
- **Manifest**: Located in `public/manifest.json`. Defines app identity and icons.
- **Service Worker**: `public/sw.js` handles caching for offline reliability.
- **Installation**: Triggered via the `beforeinstallprompt` event, managed in the `App` component.

### Adding New Features
1. **New Audio Nodes**: Integrate into the `initAudio` function. Ensure proper connection to the `AnalyserNode`.
2. **Visualizers**: Add new drawing logic within the `requestAnimationFrame` loops in `useEffect`.
3. **Styling**: Use the `@theme` block in `src/index.css` for global aesthetic changes.

## Deployment
The application is optimized for static hosting.
- `npm run build`: Generates a production-ready `dist/` folder.
- Ensure `crossOrigin="anonymous"` is maintained on audio elements to prevent CORS issues with external streams.

## Troubleshooting
- **No Audio**: Check if the browser's "Autoplay Policy" is blocking the `AudioContext`. Interaction is required to start the engine.
- **Visual Lag**: Ensure canvas dimensions are optimized and not being resized every frame.
- **PWA Install**: Requires HTTPS or `localhost`. The mobile test modal provides a dynamic link for testing in the AI Studio environment.
