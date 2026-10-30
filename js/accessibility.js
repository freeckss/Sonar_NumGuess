window.Sonar = window.Sonar || {};
var S = window.Sonar;

S.accessibility = S.accessibility || {};
S.accessibility.idlePromptTimer = null;
S.accessibility.startupInitialized = false;
S.accessibility.startupOverlayBound = false;

function speakText(text, delayMs = 0) {
  const live = S.ui && S.ui.ariaLive ? S.ui.ariaLive : document.getElementById('ariaLive');
  if (live) live.textContent = text;

  if (!S.state || !S.state.ttsEnabled || !('speechSynthesis' in window)) {
    return;
  }

  setTimeout(() => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const isLongMessage = text.length > 120;
    utterance.rate = isLongMessage ? 1.15 : 1.4;
    utterance.pitch = isLongMessage ? 0.98 : 1.04;
    window.speechSynthesis.speak(utterance);
  }, delayMs);
}

function initializeStartupOverlay() {
  if (S.accessibility.startupOverlayBound) return;
  S.accessibility.startupOverlayBound = true;

  const overlay = document.getElementById('introOverlay');
  const introLaunchButton = document.getElementById('btnIntroLaunch');
  if (!overlay) return;

  const closeOverlay = ({ blindfold = false } = {}) => {
    if (S.accessibility.startupInitialized) return;
    S.accessibility.startupInitialized = true;
    if (S.state) S.state.gameStarted = true;

    if (typeof window.dismissIntroOverlay === 'function') {
      window.dismissIntroOverlay({ blindfold });
      if (typeof triggerRadarPowerOn === 'function') triggerRadarPowerOn();
      if (typeof initAudio === 'function') initAudio();
      if (typeof playSynthTone === 'function') {
        playSynthTone({ freqStart: 320, freqEnd: 720, duration: 0.18, type: 'triangle', gainLevel: 0.12 });
        setTimeout(() => playSynthTone({ freqStart: 420, freqEnd: 860, duration: 0.13, type: 'triangle', gainLevel: 0.12 }), 150);
      }
      if (S.ui && S.ui.guessInput) {
        setTimeout(() => {
          S.ui.guessInput.focus();
        }, 260);
      }
      speakText('SONAR X-86 Online. Place your index fingers on the F and J keys. Press F anytime to hear your status and sonar ping. Press J for spoken instructions. Use the number keys or Up and Down arrow keys to dial your guess, then press Enter to fire.');
      resetIdlePromptTimer();
      return;
    }

    if (blindfold && S.state) {
      S.state.blindfoldMode = true;
      document.body.classList.add('blindfold-mode');
      if (S.ui && S.ui.btnBlindfold) {
        S.ui.btnBlindfold.classList.add('blindfold-active');
        S.ui.btnBlindfold.setAttribute('aria-pressed', 'true');
      }
    }

    overlay.classList.remove('is-visible');
    overlay.classList.add('is-closing');
    if (typeof triggerRadarPowerOn === 'function') triggerRadarPowerOn();
    if (typeof initAudio === 'function') initAudio();
    if (typeof playSynthTone === 'function') {
      playSynthTone({ freqStart: 320, freqEnd: 720, duration: 0.18, type: 'triangle', gainLevel: 0.12 });
      setTimeout(() => playSynthTone({ freqStart: 420, freqEnd: 860, duration: 0.13, type: 'triangle', gainLevel: 0.12 }), 150);
    }

    if (S.ui && S.ui.guessInput) {
      setTimeout(() => {
        S.ui.guessInput.focus();
      }, 260);
    }

    speakText('SONAR X-86 Online. Place your index fingers on the F and J keys. Press F anytime to hear your status and sonar ping. Press J for spoken instructions. Use the number keys or Up and Down arrow keys to dial your guess, then press Enter to fire.');
    resetIdlePromptTimer();
  };

  const handleAuralPreview = () => {
    return;
  };

  document.querySelectorAll('.intro-preview').forEach((button) => {
    button.addEventListener('click', (event) => {
      if (button.id === 'btnTestLeft' || button.id === 'btnTestRight') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const direction = button.dataset.aural;
      if (direction) {
        handleAuralPreview(direction);
      }
      if (button.dataset.blindfold === 'true') {
        closeOverlay({ blindfold: true });
      }
    });
  });

  if (introLaunchButton) {
    introLaunchButton.addEventListener('click', () => closeOverlay());
  }

  const handleIntroKey = (event) => {
    const introOverlay = document.getElementById('introOverlay');
    const overlayVisible = !!(introOverlay && !introOverlay.classList.contains('is-hidden'));

    if (S.accessibility.startupInitialized) return;
    if (overlayVisible && (event.key === '1' || event.key === '2')) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === '1' && document.getElementById('btnTestLeft')) {
        document.getElementById('btnTestLeft').click();
      }
      if (event.key === '2' && document.getElementById('btnTestRight')) {
        document.getElementById('btnTestRight').click();
      }
      return;
    }
    if (event.key === 'Enter' || event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar' || event.key === 'B' || event.key === 'b') {
      event.preventDefault();
      closeOverlay({ blindfold: event.key === 'B' || event.key === 'b' });
    }
  };

  window.addEventListener('keydown', handleIntroKey, { once: false, capture: true });
  window.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (target && target.closest && target.closest('#introOverlay')) {
      return;
    }
    if (!S.accessibility.startupInitialized) closeOverlay();
  }, { once: true, capture: true });

  if (document.getElementById('btnBootScreen')) {
    document.getElementById('btnBootScreen').addEventListener('click', () => {
      S.accessibility.startupInitialized = false;
      if (S.state) S.state.gameStarted = false;
      if (typeof window.showIntroOverlay === 'function') {
        window.showIntroOverlay();
      } else {
        overlay.classList.remove('is-hidden');
        overlay.classList.remove('is-closing');
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        document.body.classList.add('intro-open');
        document.body.style.overflow = 'hidden';
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (S.ui && S.ui.guessInput) S.ui.guessInput.focus();
    });
  }
}

function resetIdlePromptTimer() {
  if (S.accessibility.idlePromptTimer) {
    clearTimeout(S.accessibility.idlePromptTimer);
    S.accessibility.idlePromptTimer = null;
  }

  const introOverlay = document.getElementById('introOverlay');
  const overlayVisible = !!(introOverlay && !introOverlay.classList.contains('is-hidden'));
  if (!S.state || !S.state.gameStarted || S.state.gameOver || overlayVisible) return;

  const hasRoundActivity = Boolean(
    S.state.lastGuess !== null ||
    S.state.guessHistory.length > 0 ||
    S.state.attemptsLeft < S.state.maxAttempts
  );

  if (!hasRoundActivity) return;

  S.accessibility.idlePromptTimer = setTimeout(() => {
    if (!S.state || !S.state.gameStarted || S.state.gameOver) return;
    const hasRoundActivityAfterWait = Boolean(
      S.state.lastGuess !== null ||
      S.state.guessHistory.length > 0 ||
      S.state.attemptsLeft < S.state.maxAttempts
    );
    if (!hasRoundActivityAfterWait) return;

    const maxRange = Number(S.state.maxRange) || 100;
    const attemptsLeft = Number(S.state.attemptsLeft) || 0;
    speakText(`Idle reminder. Range is 1 to ${maxRange}. ${attemptsLeft} attempts remaining. Press F for status.`);
    resetIdlePromptTimer();
  }, 20000);
}

function getCurrentDifficultyLabel() {
  const buttons = (S.ui && S.ui.difficultyButtons) || [];
  const active = buttons.find((button) => button.classList.contains('active')) || buttons[0];

  if (!active) {
    return 'Classic';
  }

  const text = (active.textContent || '').trim();
  return text.split(' ').slice(0, 2).join(' ') || 'Classic';
}

function cycleDifficulty() {
  const buttons = (S.ui && S.ui.difficultyButtons) || [];
  if (!buttons.length) return;

  const activeIndex = buttons.findIndex((button) => button.classList.contains('active'));
  const nextIndex = activeIndex >= 0 ? (activeIndex + 1) % buttons.length : 0;
  const nextButton = buttons[nextIndex];
  if (nextButton) nextButton.click();
}

function changeGuessByStep(delta) {
  const ui = S.ui || {};
  if (!ui.guessInput) return;

  const currentValue = ui.guessInput.value.trim() === '' ? 1 : Number.parseInt(ui.guessInput.value, 10);
  const base = Number.isFinite(currentValue) ? currentValue : 1;
  const limited = Math.min(Number(S.state.maxRange) || 100, Math.max(1, base + delta));
  ui.guessInput.value = String(limited);

  const pitch = 300 + (limited / Math.max(1, Number(S.state.maxRange) || 100)) * 900;
  if (typeof playSynthTone === 'function') {
    playSynthTone({ freqStart: pitch, duration: 0.05, type: 'sine', gainLevel: 0.08 });
  }
  speakText(String(limited), 0);
  resetIdlePromptTimer();
}

function handleHomeRowShortcut(key) {
  const ui = S.ui || {};

  if (key === 'F') {
    if (!S.state || !S.state.maxRange) return;
    if (S.state.lastGuess === null || S.state.lastDelta === null) {
      speakText(`No sonar ping recorded yet. Range is 1 to ${S.state.maxRange}. ${S.state.attemptsLeft} attempts left.`);
      return;
    }

    const direction = S.state.lastGuess < S.state.targetNum ? 'LOW' : 'HIGH';
    const tier = getProximityTierInfo ? getProximityTierInfo(S.state.lastDelta).label : 'ACTIVE';
    if (typeof triggerSonarSequence === 'function') triggerSonarSequence(S.state.lastDelta, direction);
    speakText(`Status ping. Last guess ${S.state.lastGuess} was ${direction}. Proximity ${tier}. Range is 1 to ${S.state.maxRange}. ${S.state.attemptsLeft} attempts left.`);
    return;
  }

  if (key === 'J') {
    const difficulty = getCurrentDifficultyLabel();
    const mode = (typeof getModeLabel === 'function' ? getModeLabel(S.state.gameMode) : 'Current mode');
    speakText(`Controls guide. F plays your status. J repeats these instructions. Number keys or arrow keys dial the target. Enter fires. Current difficulty is ${difficulty}. Current mode is ${mode}.`);
    return;
  }

  if (key === 'ARROWUP' || key === 'ARROWDOWN' || key === 'ARROWLEFT' || key === 'ARROWRIGHT') {
    const step = key === 'ARROWLEFT' || key === 'ARROWRIGHT' ? 10 : 1;
    const direction = key === 'ARROWDOWN' || key === 'ARROWLEFT' ? -1 : 1;
    changeGuessByStep(step * direction);
  }
}

function bindGlobalShortcuts() {
  if (S._globalShortcutsBound) return;
  S._globalShortcutsBound = true;

  window.addEventListener('keydown', (event) => {
    const key = event.key.toUpperCase();
    const ui = S.ui || {};
    const arrowKey = event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight';

    if (event.code === 'Space' && document.activeElement !== ui.guessInput) {
      event.preventDefault();
      if (ui.btnRePing) ui.btnRePing.click();
      resetIdlePromptTimer();
      return;
    }

    if (key === 'F' && !event.repeat) {
      event.preventDefault();
      handleHomeRowShortcut('F');
      resetIdlePromptTimer();
    } else if (key === 'J' && !event.repeat) {
      event.preventDefault();
      handleHomeRowShortcut('J');
      resetIdlePromptTimer();
    } else if (key === 'G' && !event.repeat) {
      event.preventDefault();
      if (typeof window.cycleGameMode === 'function') {
        window.cycleGameMode();
      }
      resetIdlePromptTimer();
    } else if (key === 'D' && !event.repeat) {
      event.preventDefault();
      cycleDifficulty();
      resetIdlePromptTimer();
    } else if (arrowKey) {
      event.preventDefault();
      const mappedKey = `ARROW${event.key.replace('Arrow', '').toUpperCase()}`;
      handleHomeRowShortcut(mappedKey);
    } else if (key === '?' || (event.key === '/' && event.shiftKey)) {
      event.preventDefault();
      if (typeof window.toggleControlsModal === 'function') window.toggleControlsModal();
    } else if (key === 'R') {
      event.preventDefault();
      if (ui.btnSpeakStatus) ui.btnSpeakStatus.click();
    } else if (key === 'B') {
      event.preventDefault();
      if (ui.btnBlindfold) ui.btnBlindfold.click();
    } else if (key === 'H') {
      event.preventDefault();
      if (ui.btnContrast) ui.btnContrast.click();
    } else if (key === 'V') {
      event.preventDefault();
      if (ui.btnTts) ui.btnTts.click();
    } else if (key === 'P') {
      event.preventDefault();
      if (ui.btnSonarLoop) ui.btnSonarLoop.click();
    } else if (key === 'Y') {
      event.preventDefault();
      if (typeof window.startNewGame === 'function') window.startNewGame(true);
    } else if (/^[0-9]$/.test(event.key) && document.activeElement !== ui.guessInput) {
      if (ui.guessInput) ui.guessInput.focus();
    }

    if (!event.defaultPrevented) {
      resetIdlePromptTimer();
    }
  });

}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    initializeStartupOverlay();
    bindGlobalShortcuts();
  }, { once: true });
} else {
  initializeStartupOverlay();
  bindGlobalShortcuts();
}
