# SONAR-X86

SONAR-X86 is a browser-based acoustic number-guessing game presented as a tactical sonar HUD. It combines keyboard-driven gameplay, synthesized audio cues, speech feedback, radar and waveform visuals, and accessibility-focused controls for blind and low-vision players.

The project is a static front-end application with no framework, build step, or package installation required.

## Features

- Four game modes:
  - **Classic Calibration** — standard number guessing
  - **Evasive Submarine** — the target can drift after guesses
  - **Depth-Charge Defusal** — countdown timer and defusal streaks
  - **Harmonic Frequency Tuner** — frequency and phase-based audio cues
- Sonar radar, oscilloscope waveform, proximity segments, and animated HUD effects
- Synthesized sonar tones, stereo directional cues, and target-lock feedback
- Voice/TTS feedback enabled by default
- Guided startup overlay that unlocks Web Audio and speech synthesis after user interaction
- Blindfold mode with visual hints hidden and continuous sonar pulse enabled automatically
- High-contrast mode
- Reduced-motion support through `prefers-reduced-motion`
- Difficulty presets:
  - **Classic** — range 1–100, 7 attempts
  - **Wide** — range 1–250, 9 attempts
  - **Deep** — range 1–500, 11 attempts
- Persistent local win and best-turn statistics
- Turn history and x86-style telemetry display
- Responsive layout for desktop, tablet, and mobile screens

## Running the game

From the project root, start a local static server:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

A local server is recommended because browser audio and speech APIs may behave differently when opening `index.html` directly from the file system.

## Gameplay controls

### Core gameplay

- Enter a number and press **Enter** to fire a sonar guess.
- Use **Up/Down** or the on-screen dial buttons to change the guess by 1.
- Use **Left/Right** to change the guess by 10.
- Guesses are clamped to the selected difficulty range.
- After game over, press **Enter** or **Y** to start a new mission.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `F` | Replay sonar status and ping summary |
| `J` | Speak the quick controls and current game state |
| `R` | Speak the current status |
| `Space` | Re-ping the sonar |
| `B` | Toggle blindfold mode |
| `H` | Toggle high-contrast mode |
| `V` | Toggle voice/TTS feedback |
| `P` | Toggle continuous sonar pulse |
| `Y` | Restart the mission |
| `G` | Cycle game mode |
| `D` | Cycle difficulty |
| `?` | Open the Controls & Audio Guide |
| `1` / `2` | Test left/right audio during startup |
| `Enter` / `Space` | Initialize the sonar system during startup |

### Interface controls

- Voice TTS
- Continuous Pulse
- Blindfold
- Contrast
- Difficulty selection
- Boot Screen
- Controls & Audio Guide
- Re-Ping
- Speak Status
- New Mission
- Fire

## Game modes

### Classic Calibration

The standard mode. Find a fixed secret number within the selected range and attempt limit.

### Evasive Submarine

After a valid guess, the target may drift slightly, requiring the player to track a moving submarine signal.

### Depth-Charge Defusal

A countdown mode with a defusal streak. Correct target locks grant additional time and immediately seed a new target while the run continues.

### Harmonic Frequency Tuner

Adds stereo-frequency and waveform cues to help match the guess with the target signal.

## Accessibility

The game is designed for keyboard and audio-first use:

- Startup instructions and speech status announcements
- Voice feedback toggle
- Blindfold mode for eyes-free play
- Automatic continuous pulse when blindfold mode is launched or enabled
- High-contrast color palette
- Semantic labels and live regions for important game feedback
- Keyboard shortcuts for common actions
- `prefers-reduced-motion` support to limit animations and transitions
- Visual feedback is supplemented with text and audio rather than relying only on color

Browser support and permissions can affect speech synthesis and Web Audio behavior. The first interaction is required by browsers before audio can be initialized.

## Project structure

- `index.html` — application markup and startup overlay
- `css/theme.css` — color tokens, backgrounds, typography, and reduced-motion rules
- `css/layout.css` — page, header, panel, and responsive layout
- `css/components.css` — HUD components, buttons, radar framing, feedback, and controls
- `js/state.js` — shared game state and saved statistics
- `js/main.js` — UI wiring, startup flow, controls, and event handlers
- `js/game-engine.js` — game modes, guesses, scoring, feedback, and timers
- `js/accessibility.js` — keyboard shortcuts, speech guidance, and accessibility behavior
- `js/audio-sonar.js` — Web Audio initialization, tones, sonar cues, and pulse timing
- `js/visualizer.js` — radar, waveform, particles, and sonar effects
- `js/x86-telemetry.js` — x86-style register and execution trace display

## Storage

Win counts and best turn scores are stored in the browser tab session using `sessionStorage`. Each new tab or browser session starts with a separate score:

- `sonar_x86_wins`
- `sonar_x86_best`

No server, account, or external database is required.
