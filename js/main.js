window.Sonar = window.Sonar || {};
var S = window.Sonar;

function assignUi() {
  S.ui = {
    introOverlay: document.getElementById('introOverlay'),
    introLaunchButton: document.getElementById('btnIntroLaunch'),
    btnBootScreen: document.getElementById('btnBootScreen'),
    btnTestLeft: document.getElementById('btnTestLeft'),
    btnTestRight: document.getElementById('btnTestRight'),
    ariaLive: document.getElementById('ariaLive'),
    difficultyButtons: Array.from(document.querySelectorAll('.difficulty-btn')),
    btnTts: document.getElementById('btnTts'),
    btnSonarLoop: document.getElementById('btnSonarLoop'),
    btnBlindfold: document.getElementById('btnBlindfold'),
    btnContrast: document.getElementById('btnContrast'),
    btnControlsGuide: document.getElementById('btnControlsGuide'),
    controlsModal: document.getElementById('controlsModal'),
    radarCanvas: document.getElementById('radarCanvas'),
    radarCanvasBox: document.getElementById('radarCanvasBox'),
    oscCanvas: document.getElementById('oscCanvas'),
    sonarFreqLabel: document.getElementById('sonarFreqLabel'),
    panStatusLabel: document.getElementById('panStatusLabel'),
    proxTierText: document.getElementById('proxTierText'),
    proxBarTrack: document.getElementById('proxBarTrack'),
    attemptsVal: document.getElementById('attemptsVal'),
    rangeVal: document.getElementById('rangeVal'),
    deltaVal: document.getElementById('deltaVal'),
    sessionScoreLabel: document.getElementById('sessionScoreLabel'),
    feedbackBanner: document.getElementById('feedbackBanner'),
    feedbackMain: document.getElementById('feedbackMain'),
    feedbackSub: document.getElementById('feedbackSub'),
    guessForm: document.getElementById('guessForm'),
    guessInput: document.getElementById('guessInput'),
    btnFire: document.getElementById('btnFire'),
    btnRePing: document.getElementById('btnRePing'),
    btnSpeakStatus: document.getElementById('btnSpeakStatus'),
    btnNewGame: document.getElementById('btnNewGame'),
    historyToggle: document.getElementById('historyToggle'),
    turnLog: document.getElementById('turnLog'),
    regAX: document.getElementById('regAX'),
    regBX: document.getElementById('regBX'),
    regCX: document.getElementById('regCX'),
    regDX: document.getElementById('regDX'),
    regPIT: document.getElementById('regPIT'),
    regPort61: document.getElementById('regPort61'),
    flagZF: document.getElementById('flagZF'),
    flagSF: document.getElementById('flagSF'),
    flagOF: document.getElementById('flagOF'),
    flagCF: document.getElementById('flagCF'),
    asmTraceBox: document.getElementById('asmTraceBox')
  };
}

function toggleControlsModal() {
  const ui = S.ui || {};
  const modal = ui.controlsModal;
  if (!modal) return;

  const isOpen = !modal.classList.contains('is-open');
  modal.classList.toggle('is-open', isOpen);
  modal.setAttribute('aria-hidden', String(!isOpen));
  modal.style.display = isOpen ? 'flex' : 'none';
  modal.style.opacity = isOpen ? '1' : '0';
  modal.style.visibility = isOpen ? 'visible' : 'hidden';
  modal.style.pointerEvents = isOpen ? 'auto' : 'none';

  if (ui.btnControlsGuide) {
    ui.btnControlsGuide.setAttribute('aria-expanded', String(isOpen));
    ui.btnControlsGuide.classList.toggle('is-open', isOpen);
  }

  const introOverlay = document.getElementById('introOverlay');
  const introVisible = !!(introOverlay && !introOverlay.classList.contains('is-hidden'));
  if (isOpen && !introVisible) {
    document.body.style.overflow = 'hidden';
  } else if (!introVisible) {
    document.body.style.overflow = '';
  }

  if (isOpen) {
    document.addEventListener('keydown', handleGuideEsc, { once: true });
  }
}

function handleGuideEsc(event) {
  if (event.key === 'Escape' && S.ui.controlsModal && S.ui.controlsModal.classList.contains('is-open')) {
    toggleControlsModal();
  }
}

function showIntroOverlay() {
  const overlay = S.ui && S.ui.introOverlay ? S.ui.introOverlay : document.getElementById('introOverlay');
  if (!overlay) return;

  if (S.state) S.state.gameStarted = false;
  if (S.accessibility) S.accessibility.startupInitialized = false;

  overlay.classList.remove('is-hidden');
  overlay.classList.remove('is-closing');
  overlay.classList.add('is-visible');
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  overlay.style.visibility = 'visible';
  overlay.style.pointerEvents = 'auto';
  document.body.classList.add('intro-open');
  document.body.style.overflow = 'hidden';

  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function dismissIntroOverlay({ blindfold = false } = {}) {
  const overlay = S.ui && S.ui.introOverlay ? S.ui.introOverlay : document.getElementById('introOverlay');
  if (!overlay || overlay.classList.contains('is-hidden')) return;

  if (S.state) S.state.gameStarted = true;

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
  overlay.style.opacity = '0';
  overlay.style.visibility = 'hidden';
  document.body.classList.remove('intro-open');
  document.body.style.overflow = '';

  setTimeout(() => {
    overlay.classList.add('is-hidden');
    overlay.style.display = 'none';
  }, 350);
}

function wireEvents() {
  const ui = S.ui;

  if (ui.guessForm) ui.guessForm.addEventListener('submit', handleGuessSubmission);

  if (ui.guessInput) {
    ui.guessInput.addEventListener('input', (event) => {
      const value = event.target.value;
      const numericValue = value.replace(/\D/g, '');
      if (numericValue !== value) {
        event.target.value = numericValue;
      }
      ui.guessInput.classList.add('is-typing');
      if (event.target.value.length > 0) {
        const lastChar = event.target.value[event.target.value.length - 1];
        if (/\d/.test(lastChar)) {
          const digit = Number.parseInt(lastChar, 10);
          playSynthTone({ freqStart: 500 + digit * 45, duration: 0.045, type: 'sine', gainLevel: 0.12 });
          speakText(event.target.value, 0);
        }
      }
    });
  }

  if (ui.difficultyButtons && ui.difficultyButtons.length) {
    ui.difficultyButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const range = Number.parseInt(button.dataset.range || '100', 10);
        const attempts = Number.parseInt(button.dataset.attempts || '7', 10);
        ui.difficultyButtons.forEach((candidate) => {
          const active = candidate === button;
          candidate.classList.toggle('active', active);
          candidate.setAttribute('aria-pressed', String(active));
        });
        S.state.maxRange = range;
        S.state.maxAttempts = attempts;
        speakText(`Difficulty set to ${button.textContent.trim()}. Range is 1 to ${range}. You have ${attempts} attempts.`);
        startNewGame(true);
      });
    });
  }

  if (ui.btnTts) {
    ui.btnTts.addEventListener('click', () => {
      S.state.ttsEnabled = !S.state.ttsEnabled;
      ui.btnTts.classList.toggle('active', S.state.ttsEnabled);
      ui.btnTts.setAttribute('aria-pressed', String(S.state.ttsEnabled));
      ui.btnTts.innerHTML = `<span>${S.state.ttsEnabled ? '🔊 Voice TTS: ON' : '🔇 Voice TTS: OFF'}</span>`;
      if (S.state.ttsEnabled) speakText('Voice assistant enabled.');
    });
  }

  if (ui.btnSonarLoop) {
    ui.btnSonarLoop.addEventListener('click', () => {
      S.state.continuousPulse = !S.state.continuousPulse;
      ui.btnSonarLoop.classList.toggle('active', S.state.continuousPulse);
      ui.btnSonarLoop.setAttribute('aria-pressed', String(S.state.continuousPulse));
      ui.btnSonarLoop.innerHTML = `<span>📡 Pulse${S.state.continuousPulse ? ': ON' : ''}</span>`;

      if (S.state.continuousPulse) {
        if (typeof restartAmbientPulseTimer === 'function') restartAmbientPulseTimer();
        speakText('Continuous proximity pulse enabled.');
      } else {
        if (typeof restartAmbientPulseTimer === 'function') restartAmbientPulseTimer();
        speakText('Continuous proximity pulse disabled.');
      }
    });
  }

  if (ui.btnBlindfold) {
    ui.btnBlindfold.addEventListener('click', () => {
      const turningOn = !S.state.blindfoldMode;
      S.state.blindfoldMode = turningOn;
      S.state.continuousPulse = turningOn;

      if (ui.btnSonarLoop) {
        ui.btnSonarLoop.classList.toggle('active', S.state.continuousPulse);
        ui.btnSonarLoop.setAttribute('aria-pressed', String(S.state.continuousPulse));
        ui.btnSonarLoop.innerHTML = `<span>📡 Pulse${S.state.continuousPulse ? ': ON' : ''}</span>`;
      }

      if (typeof restartAmbientPulseTimer === 'function') {
        restartAmbientPulseTimer();
      }

      document.body.classList.toggle('blindfold-mode', S.state.blindfoldMode);
      ui.btnBlindfold.classList.toggle('blindfold-active', S.state.blindfoldMode);
      ui.btnBlindfold.setAttribute('aria-pressed', String(S.state.blindfoldMode));
      speakText(S.state.blindfoldMode ? 'Blindfold evaluation mode active. Visual radar and hints are hidden. Continuous sonar pulse enabled.' : 'Blindfold mode disabled. Continuous pulse stopped. Visual radar restored.');
      if (ui.guessInput) ui.guessInput.focus();
    });
  }

  if (ui.btnContrast) {
    ui.btnContrast.addEventListener('click', () => {
      S.state.highContrast = !S.state.highContrast;
      document.body.classList.toggle('high-contrast', S.state.highContrast);
      ui.btnContrast.classList.toggle('active', S.state.highContrast);
      ui.btnContrast.setAttribute('aria-pressed', String(S.state.highContrast));
      speakText(`High contrast mode ${S.state.highContrast ? 'enabled' : 'disabled'}.`);
    });
  }

  if (ui.btnRePing) {
    ui.btnRePing.addEventListener('click', () => {
      if (S.state.lastDelta === null || S.state.lastGuess === null) {
        playSynthTone({ freqStart: 440, duration: 0.08 });
        if (typeof spawnSonarShockwave === 'function') spawnSonarShockwave();
        speakText('No sonar ping recorded yet. Enter a guess between 1 and ' + S.state.maxRange);
        return;
      }
      const direction = S.state.lastGuess < S.state.targetNum ? 'LOW' : 'HIGH';
      triggerSonarSequence(S.state.lastDelta, direction);
      if (typeof spawnSonarShockwave === 'function') spawnSonarShockwave();
    });
  }

  if (ui.btnSpeakStatus) {
    ui.btnSpeakStatus.addEventListener('click', () => {
      if (S.state.lastGuess === null) {
        speakText(`Status report: Range is 1 to ${S.state.maxRange}. You have ${S.state.attemptsLeft} attempts left. No guesses made yet.`);
      } else {
        const direction = S.state.lastGuess < S.state.targetNum ? 'too low, aim higher' : 'too high, aim lower';
        const tier = getProximityTierInfo(S.state.lastDelta).label;
        speakText(`Status report: Last guess was ${S.state.lastGuess}, which was ${direction}. Proximity is ${tier}. You have ${S.state.attemptsLeft} attempts remaining.`);
      }
    });
  }

  if (ui.btnNewGame) {
    ui.btnNewGame.addEventListener('click', () => startNewGame(true));
  }

  if (ui.btnFire) {
    ui.btnFire.addEventListener('click', () => {
      ui.btnFire.classList.remove('is-fired');
      void ui.btnFire.offsetWidth;
      ui.btnFire.classList.add('is-fired');
    });
  }

  if (ui.btnControlsGuide) {
    ui.btnControlsGuide.addEventListener('click', toggleControlsModal);
  }

  if (ui.btnBootScreen) {
    ui.btnBootScreen.addEventListener('click', () => {
      if (S.state) S.state.gameStarted = false;
      if (S.accessibility) S.accessibility.startupInitialized = false;
      if (typeof window.showIntroOverlay === 'function') {
        window.showIntroOverlay();
      } else {
        const overlay = S.ui && S.ui.introOverlay ? S.ui.introOverlay : document.getElementById('introOverlay');
        if (!overlay) return;
        overlay.classList.remove('is-hidden');
        overlay.classList.remove('is-closing');
        overlay.style.display = 'flex';
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
        overlay.style.pointerEvents = 'auto';
        document.body.classList.add('intro-open');
        document.body.style.overflow = 'hidden';
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    });
  }

  const triggerStereoTest = (button, side) => {
    if (!button) return;
    button.classList.remove('testing-active');
    void button.offsetWidth;
    button.classList.add('testing-active');
    setTimeout(() => button.classList.remove('testing-active'), 800);
    if (typeof window.playStereoEarTest === 'function') {
      window.playStereoEarTest(side);
    } else if (typeof playStereoEarTest === 'function') {
      playStereoEarTest(side);
    }
  };

  if (ui.btnTestLeft) {
    ui.btnTestLeft.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      triggerStereoTest(ui.btnTestLeft, 'left');
    });
  }

  if (ui.btnTestRight) {
    ui.btnTestRight.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      triggerStereoTest(ui.btnTestRight, 'right');
    });
  }

  if (ui.introLaunchButton) {
    ui.introLaunchButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      dismissIntroOverlay({ blindfold: false });
    });
  }

  const blindModeLaunchButton = document.querySelector('.intro-preview-blind');
  if (blindModeLaunchButton) {
    blindModeLaunchButton.addEventListener('click', () => dismissIntroOverlay({ blindfold: true }));
  }

  if (ui.btnControlsGuide) {
    ui.btnControlsGuide.innerHTML = '⌨️ Controls & Audio Guide (Key: ?)';
    ui.btnControlsGuide.classList.remove('is-open');
  }

  const closeButton = document.querySelector('[data-close-controls]');
  if (closeButton) closeButton.addEventListener('click', toggleControlsModal);

  if (ui.controlsModal) {
    ui.controlsModal.addEventListener('click', (event) => {
      if (event.target === ui.controlsModal) toggleControlsModal();
    });
  }

  if (ui.historyToggle) {
    ui.historyToggle.addEventListener('click', () => {
      ui.turnLog.classList.toggle('collapsed');
      updateTurnHistoryToggle();
    });
    updateTurnHistoryToggle();
  }

  document.querySelectorAll('.mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const modeName = tab.dataset.mode;
      if (modeName && typeof window.setGameMode === 'function') {
        window.setGameMode(modeName, true);
      }
    });
  });

  document.querySelectorAll('.dial-button').forEach((button) => {
    const applyDialIncrement = () => {
      const currentValue = ui.guessInput.value.trim() === '' ? '' : Number(ui.guessInput.value);
      const step = Number(button.dataset.increment) || 1;
      const next = Number.isFinite(currentValue) ? currentValue + step : step;
      const bounded = Math.max(1, Math.min(S.state.maxRange, next));
      ui.guessInput.value = String(bounded);
      ui.guessInput.classList.add('is-typing');
      updateTargetBracket();
    };

    let holdTimer = null;
    const stopHold = () => {
      if (holdTimer) {
        clearInterval(holdTimer);
        holdTimer = null;
      }
    };

    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.dataset.ignoreClick = 'true';
      applyDialIncrement();
      holdTimer = setInterval(() => {
        applyDialIncrement();
      }, 120);
    });

    ['pointerup', 'pointerleave', 'pointercancel'].forEach((eventName) => {
      button.addEventListener(eventName, stopHold);
    });

    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (button.dataset.ignoreClick === 'true') {
        button.dataset.ignoreClick = 'false';
        return;
      }
      applyDialIncrement();
    });
  });

  window.toggleControlsModal = toggleControlsModal;
  window.showIntroOverlay = showIntroOverlay;
  window.dismissIntroOverlay = dismissIntroOverlay;
  window.setGameMode = window.setGameMode || (typeof setGameMode === 'function' ? setGameMode : null);
  window.cycleGameMode = window.cycleGameMode || (typeof cycleGameMode === 'function' ? cycleGameMode : null);

  const overlay = S.ui && S.ui.introOverlay ? S.ui.introOverlay : document.getElementById('introOverlay');
  if (overlay) {
    overlay.classList.remove('is-hidden');
    overlay.style.display = 'flex';
    document.body.classList.add('intro-open');
    document.body.style.overflow = 'hidden';
  }

  document.addEventListener('keydown', (event) => {
    const introOverlay = S.ui && S.ui.introOverlay ? S.ui.introOverlay : document.getElementById('introOverlay');
    const overlayVisible = !!(introOverlay && !introOverlay.classList.contains('is-hidden'));

    if (event.key === 'Escape') {
      if (S.ui.controlsModal && S.ui.controlsModal.classList.contains('is-open')) {
        toggleControlsModal();
        return;
      }
      if (overlayVisible) {
        return;
      }
      showIntroOverlay();
      return;
    }

    if (overlayVisible) {
      if (event.key === '1') {
        event.preventDefault();
        event.stopPropagation();
        if (S.ui && S.ui.btnTestLeft) S.ui.btnTestLeft.click();
        return;
      }

      if (event.key === '2') {
        event.preventDefault();
        event.stopPropagation();
        if (S.ui && S.ui.btnTestRight) S.ui.btnTestRight.click();
        return;
      }

      const key = event.key.toLowerCase();
      if (event.key === 'Enter' || event.code === 'Space' || key === ' ' || key === 'spacebar' || key === 'b') {
        event.preventDefault();
        event.stopPropagation();
        dismissIntroOverlay({ blindfold: key === 'b' });
      }
    }
  });
}

assignUi();
wireEvents();
startNewGame(false);
