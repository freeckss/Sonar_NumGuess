# SONAR-X86

SONAR-X86 is a browser-based acoustic number-guessing game with a tactical HUD feel, audio-first feedback, and accessibility-focused controls for blind and low-vision players.

The game blends a sonar-style interface with keyboard-driven gameplay, spoken status prompts, difficulty presets, and several game modes.

## Features

- Acoustic sonar guessing gameplay
- Four gameplay modes:
  - Classic Calibration
  - Evasive Submarine
  - Depth-Charge Defusal
  - Harmonic Frequency Tuner
- Audio onboarding gate on first interaction
- Text-to-speech (TTS) status announcements
- Blindfold mode
- High contrast mode
- Difficulty presets:
  - Classic 1–100
  - Urban 1–250
  - Deep 1–500
- Keyboard-friendly controls for non-visual play
- Turn history log and mission feedback
- No build step required; runs as a static web page

## How to run

1. Open the project folder.
2. Start a local static server from the project root, for example:

   python -m http.server 8000

3. Open the browser to:

   http://localhost:8000/

You can also open `index.html` directly in a browser, but a local web server is recommended for more consistent audio and browser behavior.

## Controls

### Core gameplay
- Enter a number in the guess field and press Enter to fire.
- Use the number keys or arrow keys to adjust the guess.
- Use the up/down arrow keys to increment/decrement by 1.
- Use left/right arrow keys to adjust by 10.
- The guess value is clamped to the active range.

### Accessibility shortcuts
- F: Replay status / sonar ping summary
- J: Speak a quick guide of controls and current game state
- R: Speak status
- Space: Re-ping sonar
- B: Toggle blindfold mode
- H: Toggle high contrast mode
- V: Toggle voice/TTS feedback
- P: Toggle continuous pulse
- Y: Restart mission
- G: Cycle game mode
- D: Cycle difficulty
- ?: Open the Controls & Audio Guide

### Buttons in the UI
- Voice TTS toggle
- Continuous Pulse toggle
- Blindfold mode toggle
- High Contrast toggle
- Difficulty buttons
- New Mission button
- Re-Ping button
- Speak Status button
- Fire button
- Controls & Audio Guide

## Game modes

### 1. Classic Calibration
Standard number guessing gameplay with a fixed range and attempts based on selected difficulty.

### 2. Evasive Submarine
After invalid guesses, the target may drift slightly higher or lower, creating a moving target challenge.

### 3. Depth-Charge Defusal
Adds a countdown timer and defusal streak system. Correct locks grant time bonuses and keep the round active.

### 4. Harmonic Frequency Tuner
Uses stereo-frequency cues and dual-wave visualization to help players match target and guess values by sound and phase alignment.

## Difficulty settings

Difficulty is selected using large button controls instead of a dropdown so the interface is easier to use without a visual UI.

- Classic: 1–100, 7 attempts
- Urban: 1–250, 9 attempts
- Deep: 1–500, 11 attempts

## Accessibility notes

The interface is designed for eyes-free use, with:
- speech synthesis startup prompts
- guided onboarding on first interaction
- tactile keyboard cues for status and controls
- blindfold mode for audio-first play
- high contrast mode for visibility improvements

## File overview

- `index.html` — main game UI
- `css/` — layout and component styling
- `js/accessibility.js` — keyboard, speech, onboarding, and assistive behavior
- `js/audio-sonar.js` — audio effects and tones
- `js/game-engine.js` — core game logic and modes
- `js/main.js` — DOM wiring and button events
- `js/state.js` — app state values
- `js/visualizer.js` — radar and waveform rendering
- `js/x86-telemetry.js` — telemetry display hooks

## Notes

- This is a static front-end app and does not require a framework or package install.
- Some browser features such as speech synthesis may behave differently depending on browser permissions and environment.
- The UI and accessibility flow are intentionally tuned for a tactical, audio-first experience.

## Maintenance

This README should be updated whenever new features, controls, game modes, or major UX changes are introduced.
