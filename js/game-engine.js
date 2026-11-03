window.Sonar = window.Sonar || {};
var S = window.Sonar;

function getProximityTierInfo(delta) {
  const ratio = delta / S.state.maxRange;
  if (delta <= Math.max(2, Math.round(S.state.maxRange * 0.05))) {
    return { label: 'CRITICAL LOCK (VERY CLOSE)', segments: 10, colorClass: 'lit-high' };
  } else if (ratio <= 0.15) {
    return { label: 'STRONG SONAR ECHO', segments: 8, colorClass: 'lit-high' };
  } else if (ratio <= 0.35) {
    return { label: 'MODERATE SONAR ECHO', segments: 5, colorClass: 'lit-med' };
  }
  return { label: 'DISTANT SONAR ECHO', segments: 2, colorClass: 'lit-low' };
}

function updateProximityBar(delta) {
  const ui = S.ui || {};
  const segs = ui.proxBarTrack ? ui.proxBarTrack.querySelectorAll('.prox-seg') : [];
  if ((delta === null && S.state.activeMode !== 'WORDLE') || segs.length === 0) {
    if (ui.proxTierText) ui.proxTierText.textContent = 'AWAITING PING';
    segs.forEach((segment) => { segment.className = 'prox-seg'; });
    return;
  }

  if (S.state.activeMode === 'WORDLE') {
    const ratio = Math.max(0, Math.min(1, Number(S.state.lastSignalLockRatio) || 0));
    const segments = ratio >= 0.9 ? 10 : ratio >= 0.6 ? Math.max(6, Math.round(ratio * 10)) : ratio >= 0.3 ? Math.max(3, Math.round(ratio * 10)) : Math.max(1, Math.ceil(ratio * 10));
    const info = {
      label: ratio >= 0.9 ? 'TARGET LOCKED' : ratio >= 0.6 ? 'STRONG LOCK' : ratio >= 0.3 ? 'MODERATE RESONANCE' : ratio > 0 ? 'WEAK SIGNAL' : 'NO ECHO',
      segments,
      colorClass: ratio >= 0.6 ? 'lit-high' : ratio >= 0.3 ? 'lit-med' : 'lit-low'
    };
    if (ui.proxTierText) ui.proxTierText.textContent = info.label;
    segs.forEach((segment, index) => {
      segment.className = index < info.segments ? `prox-seg ${info.colorClass}` : 'prox-seg';
    });
    return;
  }

  const info = getProximityTierInfo(delta);
  if (ui.proxTierText) ui.proxTierText.textContent = info.label;
  segs.forEach((segment, index) => {
    segment.className = index < info.segments ? `prox-seg ${info.colorClass}` : 'prox-seg';
  });
}

function appendLog(text, color = 'var(--text-main)') {
  const row = document.createElement('div');
  row.className = 'log-entry';
  row.style.color = color;
  row.innerHTML = text;
  S.ui.turnLog.prepend(row);
  const rows = [...S.ui.turnLog.querySelectorAll('.log-entry')];
  if (rows.length > 5) {
    rows.slice(5).forEach((entry) => entry.remove());
  }
}

function updateTurnHistoryToggle() {
  const ui = S.ui || {};
  if (!ui.turnLog || !ui.historyToggle) return;
  const collapsed = ui.turnLog.classList.contains('collapsed');
  ui.historyToggle.textContent = collapsed ? 'Expand' : 'Collapse';
  ui.historyToggle.setAttribute('aria-expanded', String(!collapsed));
}

function updateScoreDisplay() {
  const ui = S.ui || {};
  const winsText = `${S.state.wins} WINS`;
  const bestText = S.state.bestTurns > 0 ? `BEST: ${S.state.bestTurns} TURNS` : 'BEST: --';

  if (ui.sessionScoreLabel) ui.sessionScoreLabel.textContent = winsText;
  if (ui.deltaVal) ui.deltaVal.textContent = bestText;
  if (S.state.activeMode === 'WORDLE' && ui.deltaVal) {
    ui.deltaVal.textContent = `SIGNAL LOCK: ${Math.round((S.state.lastSignalLockRatio || 0) * 100)}%`;
  }
}

function resetTargetBracket() {
  S.state.minPossible = 1;
  S.state.maxPossible = Number(S.state.maxRange) || 100;
  updateTargetBracket();
}

function updateTargetBracket() {
  return;
}

function getModeList() {
  return ['classic', 'wordle', 'defusal', 'harmonic'];
}

function getModeLabel(modeName) {
  const labels = {
    classic: 'CLASSIC CALIBRATION (CAO10 STD)',
    wordle: 'CIPHER WORDLE (DIGIT DEDUCTION)',
    defusal: 'DEPTH-CHARGE DEFUSAL (TIME ATTACK)',
    harmonic: 'HARMONIC FREQUENCY TUNER'
  };
  return labels[modeName] || labels.classic;
}

function updateModeTabs() {
  document.querySelectorAll('.mode-tab').forEach((tab) => {
    const isActive = tab.dataset.mode === S.state.gameMode;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

function updateDifficultyToolbarUI() {
  const ui = S.ui || {};
  const tier = Math.max(0, Math.min(2, Number(S.state.difficultyTier) || 0));
  const isWordle = S.state.gameMode === 'wordle';
  const classicProfiles = [
    { label: 'Classic 1-100', range: 100, attempts: 7 },
    { label: 'Wide 1-250', range: 250, attempts: 8 },
    { label: 'Deep 1-500', range: 500, attempts: 11 }
  ];
  const wordleProfiles = [
    { label: '3-Digit Code', digits: 3, attempts: 6, space: '000 - 999' },
    { label: '4-Digit Code', digits: 4, attempts: 6, space: '0000 - 9999' },
    { label: '5-Digit Code', digits: 5, attempts: 7, space: '00000 - 99999' }
  ];
  const profiles = isWordle ? wordleProfiles : classicProfiles;
  ui.difficultyButtons.forEach((button, index) => {
    const profile = profiles[index];
    button.textContent = profile.label;
    button.dataset.tier = String(index);
    if (!isWordle) {
      button.dataset.range = String(profile.range);
      button.dataset.attempts = String(profile.attempts);
    } else {
      button.dataset.attempts = String(profile.attempts);
    }
    const active = index === tier;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (isWordle) {
    const profile = wordleProfiles[tier];
    S.state.wordleDigits = profile.digits;
    S.state.codeLength = profile.digits;
    S.state.codeSpaceText = profile.space;
    S.state.maxAttempts = profile.attempts;
  }
}

function stopCountdownTimer() {
  if (S.state.countdownTimer) {
    clearInterval(S.state.countdownTimer);
    S.state.countdownTimer = null;
  }
}

function updateTimerDisplay() {
  const ui = S.ui || {};
  if (ui.rangeLabel) {
    ui.rangeLabel.textContent =
      S.state.gameMode === 'wordle' ? 'CODE SPACE' :
        S.state.gameMode === 'defusal' ? 'DEFUSAL TIME' :
          S.state.gameMode === 'harmonic' ? 'TARGET RANGE' : 'RANGE';
  }
  if (ui.rangeVal) {
    if (S.state.gameMode === 'defusal') {
      ui.rangeVal.textContent = `${S.state.timeLeft}s`;
    } else if (S.state.gameMode === 'wordle') {
      ui.rangeVal.textContent = `${'0'.repeat(S.state.codeLength)} - ${'9'.repeat(S.state.codeLength)}`;
    } else {
      ui.rangeVal.textContent = `1 - ${S.state.maxRange}`;
    }
  }
  if (ui.feedbackSub && S.state.gameMode === 'defusal') {
    ui.feedbackSub.textContent = `Defusal timer: ${S.state.timeLeft}s • Streak: ${S.state.defusalStreak}.`;
  }
}

function startDefusalTimer() {
  stopCountdownTimer();
  if (S.state.gameMode !== 'defusal' || S.state.gameOver) return;

  S.state.countdownTimer = setInterval(() => {
    if (S.state.gameMode !== 'defusal' || S.state.gameOver) {
      stopCountdownTimer();
      return;
    }

    S.state.timeLeft = Math.max(0, S.state.timeLeft - 1);
    updateTimerDisplay();

    if (S.state.timeLeft <= 10) {
      playSynthTone({
        freqStart: 340 + (10 - S.state.timeLeft) * 36,
        duration: 0.08,
        type: 'square',
        pan: 0,
        gainLevel: 0.08
      });
    }

    if (S.state.timeLeft <= 0) {
      stopCountdownTimer();
      S.state.gameOver = true;
      playDefeatTone();
      if (S.ui.feedbackBanner) S.ui.feedbackBanner.className = 'feedback-banner error';
      if (S.ui.feedbackMain) S.ui.feedbackMain.textContent = '[X] DEFUSAL FAILURE! EXPIRED BEFORE TARGET LOCK.';
      if (S.ui.feedbackSub) S.ui.feedbackSub.textContent = `Timer expired. Streak was ${S.state.defusalStreak}. Press Enter or Y to restart.`;
      appendLog(`<span>[X] Time expired on defusal run.</span><span>Streak: ${S.state.defusalStreak}</span>`, 'var(--coral)');
      speakText(`Defusal failure. Time expired. Your streak was ${S.state.defusalStreak}. Press Y or Enter to restart.`, 550);
    }
  }, 1000);
}

function updateTacticalModeAttribute() {
  const panel = document.getElementById('tacticalCommand');
  if (!panel) return;
  const modeAttribute = {
    classic: 'CLASSIC',
    wordle: 'WORDLE',
    defusal: 'DEFUSAL',
    harmonic: 'TUNER'
  }[S.state.gameMode] || 'CLASSIC';
  S.state.activeMode = modeAttribute;
  panel.setAttribute('data-mode', S.state.activeMode);
}

function setGameMode(modeName, announce = true) {
  const modes = getModeList();
  const safeMode = modes.includes(modeName) ? modeName : 'classic';
  S.state.gameMode = safeMode;
  updateTacticalModeAttribute();
  S.state.timeLimit = 60;
  S.state.timeLeft = S.state.timeLimit;
  S.state.defusalStreak = safeMode === 'defusal' ? S.state.defusalStreak : 0;
  updateModeTabs();
  updateDifficultyToolbarUI();

  if (safeMode !== 'defusal') {
    stopCountdownTimer();
  }

  if (announce) {
    speakText(`${getModeLabel(safeMode)} selected.`);
  }

  startNewGame(false);
}

function cycleGameMode() {
  const modes = getModeList();
  const currentIndex = modes.indexOf(S.state.gameMode);
  const nextMode = modes[(currentIndex + 1) % modes.length];
  setGameMode(nextMode, true);
}

function getSelectedDifficultyProfile() {
  const ui = S.ui || {};
  const tier = Math.max(0, Math.min(2, Number(S.state.difficultyTier) || 0));
  if (S.state.gameMode === 'wordle') {
    const profiles = [
      { range: S.state.maxRange, attempts: 6 },
      { range: S.state.maxRange, attempts: 6 },
      { range: S.state.maxRange, attempts: 7 }
    ];
    return profiles[tier];
  }

  if (ui.difficultyButtons && ui.difficultyButtons.length) {
    const activeButton = ui.difficultyButtons.find((button) => Number(button.dataset.tier) === tier) || ui.difficultyButtons[0];
    if (activeButton) {
      return {
        range: Number.parseInt(activeButton.dataset.range || '100', 10),
        attempts: Number.parseInt(activeButton.dataset.attempts || '7', 10)
      };
    }
  }

  if (S.state && S.state.maxRange) {
    return { range: Number(S.state.maxRange), attempts: Number(S.state.maxAttempts || 7) };
  }

  return { range: 100, attempts: 7 };
}

function seedTargetRound({ announce = false, preserveTimer = false } = {}) {
  const ui = S.ui || {};
  updateTacticalModeAttribute();
  updateDifficultyToolbarUI();
  const profile = getSelectedDifficultyProfile();
  if (S.state.gameMode !== 'wordle') {
    S.state.maxRange = profile.range;
  }
  S.state.maxAttempts = S.state.gameMode === 'wordle' ? 6 : profile.attempts;
  if (S.state.gameMode === 'wordle') {
    S.state.codeLength = S.state.wordleDigits;
    S.state.maxAttempts = profile.attempts;
  }
  S.state.attemptsLeft = S.state.maxAttempts;
  S.state.lastGuess = null;
  S.state.lastDelta = null;
  S.state.lastSignalLockRatio = null;
  S.state.signalLockRatio = 0;
  S.state.minPossible = 1;
  S.state.maxPossible = S.state.maxRange;
  S.state.gameOver = false;
  S.state.guessHistory = [];
  S.state.wordleHistory = [];

  if (!preserveTimer) {
    S.state.timeLeft = S.state.timeLimit;
    if (S.state.gameMode === 'defusal') {
      S.state.defusalStreak = Math.max(0, S.state.defusalStreak);
    }
  }

  const randBuf = new Uint32Array(1);
  window.crypto.getRandomValues(randBuf);
  S.state.targetNum = (randBuf[0] % S.state.maxRange) + 1;
  if (S.state.gameMode === 'wordle') {
    const codeBytes = new Uint8Array(S.state.wordleDigits);
    window.crypto.getRandomValues(codeBytes);
    S.state.targetCode = Array.from(codeBytes, (value) => String(value % 10));
  }
  S.state.targetFrequencyHz = 220 + S.state.targetNum * 7.5;
  S.state.playerFrequencyHz = 220 + (ui.guessInput && ui.guessInput.value ? Number(ui.guessInput.value) : 1) * 8.5;

  if (ui.attemptsVal) ui.attemptsVal.textContent = String(S.state.attemptsLeft);
  updateTimerDisplay();
  if (ui.deltaVal) ui.deltaVal.textContent = 'BEST: --';
  if (ui.guessInput) {
    ui.guessInput.value = '';
    ui.guessInput.placeholder = S.state.gameMode === 'wordle'
      ? `Enter ${S.state.codeLength}-digit code...`
      : `Enter guess (1-${S.state.maxRange})...`;
    ui.guessInput.maxLength = S.state.gameMode === 'wordle' ? S.state.codeLength : 20;
    ui.guessInput.setAttribute('aria-label', S.state.gameMode === 'wordle' ? `Enter ${S.state.codeLength}-digit code` : 'Guess a number');
    ui.guessInput.disabled = false;
  }
  if (ui.feedbackBanner) ui.feedbackBanner.className = 'feedback-banner';
  if (ui.feedbackMain) ui.feedbackMain.textContent = S.state.gameMode === 'wordle'
    ? `${getModeLabel(S.state.gameMode)} // ${S.state.codeLength}-DIGIT CODE`
    : `${getModeLabel(S.state.gameMode)} // RANGE: 1 TO ${S.state.maxRange}`;
  if (ui.feedbackSub) {
    ui.feedbackSub.textContent = S.state.gameMode === 'defusal'
      ? `Defusal timer: ${S.state.timeLeft}s • Streak: ${S.state.defusalStreak}. Focus on target lock.`
      : S.state.gameMode === 'wordle'
        ? `You have ${S.state.attemptsLeft} attempts. Enter a ${S.state.codeLength}-digit code to scan.`
        : `You have ${S.state.attemptsLeft} attempts. Type digits and press Enter to fire acoustic sonar.`;
  }
  if (ui.turnLog) ui.turnLog.innerHTML = `<div class="log-entry" style="color: var(--cyan);"><span>[BOOT] ${getModeLabel(S.state.gameMode)} // target seeded in [1, ${S.state.maxRange}].</span></div>`;
  if (ui.wordleGrid) {
    ui.wordleGrid.classList.toggle('is-active', S.state.gameMode === 'wordle');
    const tileSize = S.state.maxAttempts > 6 ? 36 : 44;
    const tileGap = S.state.maxAttempts > 6 ? 5 : 6;
    const gridWidth = (S.state.wordleDigits * tileSize) + ((S.state.wordleDigits - 1) * tileGap);
    ui.wordleGrid.style.setProperty('--wordle-cols', String(S.state.wordleDigits));
    ui.wordleGrid.style.setProperty('--wordle-rows', String(S.state.maxAttempts));
    ui.wordleGrid.style.setProperty('--wordle-tile-size', `${tileSize}px`);
    ui.wordleGrid.style.setProperty('--wordle-gap', `${tileGap}px`);
    ui.wordleGrid.style.setProperty('--wordle-grid-width', `${gridWidth}px`);
    ui.wordleGrid.innerHTML = S.state.gameMode === 'wordle'
      ? Array.from({ length: S.state.maxAttempts * S.state.codeLength }, (_, index) => `<span class="wordle-tile" data-row="${Math.floor(index / S.state.codeLength)}" data-col="${index % S.state.codeLength}" aria-label="Empty tile"></span>`).join('')
      : '';
  }
  if (ui.guessForm) ui.guessForm.classList.toggle('wordle-active', S.state.gameMode === 'wordle');
  if (ui.tacticalCommand) ui.tacticalCommand.classList.toggle('wordle-active', S.state.gameMode === 'wordle');
  if (ui.btnFire) {
    ui.btnFire.textContent = 'Fire';
    ui.btnFire.disabled = false;
  }

  updateProximityBar(null);
  updateScoreDisplay();
  updateTargetBracket();
  restartAmbientPulseTimer();
  updateModeTabs();
  if (S.state.gameMode === 'defusal') startDefusalTimer();

  updateX86Telemetry({
    ax: 0,
    bx: S.state.maxRange,
    cx: S.state.attemptsLeft,
    dx: S.state.lastDelta || 0,
    zf: 0,
    sf: 0,
    of: 0,
    cf: 0,
    traceLines: [
      `; ${getModeLabel(S.state.gameMode)}`,
      `XOR AH, AH / INT 1Ah   ; Read clock ticks`,
      `DIV BX / INC DX        ; Target bounded [1..${S.state.maxRange}]`,
      `MOV WORD [attempts], ${S.state.maxAttempts} ; Ready for input`
    ]
  });

  playSynthTone({ freqStart: 523.25, duration: 0.08, type: 'sine', delayStart: 0 });
  playSynthTone({ freqStart: 783.99, duration: 0.12, type: 'sine', delayStart: 0.09 });

  if (announce) {
    const intro = S.state.gameMode === 'defusal'
      ? `Depth-charge defusal mode online. Time remaining ${S.state.timeLeft} seconds. Reach a target lock to gain twelve seconds.`
      : S.state.gameMode === 'wordle'
        ? `Cipher Wordle online. Deduce the ${S.state.codeLength}-digit code in six attempts. Green is correct, amber is misplaced, and gray is absent.`
      : `New Sonar Mission started. Guess a number between 1 and ${S.state.maxRange}. You have ${S.state.maxAttempts} attempts.`;
    speakText(intro, 220);
  }
  if (ui.guessInput) ui.guessInput.focus();
}

function startNewGame(announce = true) {
  const ui = S.ui || {};
  const profile = getSelectedDifficultyProfile();
  if (S.state.gameMode !== 'wordle') {
    S.state.maxRange = profile.range;
  }
  S.state.maxAttempts = profile.attempts;
  S.state.gameStarted = true;
  if (S.state.gameMode === 'defusal') {
    S.state.timeLimit = 60;
  }
  seedTargetRound({ announce, preserveTimer: false });
  if (typeof resetIdlePromptTimer === 'function') resetIdlePromptTimer();
}

function evaluateWordleGuess(guess, target) {
  const results = Array(target.length).fill('absent');
  const remaining = target.slice();
  guess.split('').forEach((digit, index) => {
    if (digit === target[index]) {
      results[index] = 'correct';
      remaining[index] = null;
    }
  });
  guess.split('').forEach((digit, index) => {
    if (results[index] === 'correct') return;
    const matchIndex = remaining.indexOf(digit);
    if (matchIndex !== -1) {
      results[index] = 'misplaced';
      remaining[matchIndex] = null;
    }
  });
  return results;
}

function renderWordleGuess(guess, results, row) {
  const tiles = S.ui.wordleGrid ? S.ui.wordleGrid.querySelectorAll(`[data-row="${row}"]`) : [];
  [...tiles].forEach((tile, index) => {
    tile.textContent = guess[index];
    tile.classList.add('submitted', results[index]);
    tile.setAttribute('aria-label', `${guess[index]}, ${results[index]}`);
    tile.style.animationDelay = `${index * 150}ms`;
  });
}

function submitWordleGuess(raw) {
  const length = S.state.codeLength;
  if (!new RegExp(`^\\d{${length}}$`).test(raw)) {
    playErrorBuzzer();
    S.ui.feedbackBanner.className = 'feedback-banner error';
    S.ui.feedbackMain.textContent = `[!] ERROR: ENTER EXACTLY ${length} DIGITS.`;
    S.ui.feedbackSub.textContent = `Attempt preserved (${S.state.attemptsLeft} left).`;
    speakText(`Please enter exactly ${length} digits.`, 280);
    return;
  }

  const results = evaluateWordleGuess(raw, S.state.targetCode);
  const row = S.state.wordleHistory.length;
  S.state.wordleHistory.push({ guess: raw, results });
  S.state.lastGuess = raw;
  S.state.lastDelta = null;
  const totalPoints = results.reduce((total, result) => total + (result === 'correct' ? 2 : result === 'misplaced' ? 1 : 0), 0);
  S.state.signalLockRatio = totalPoints / (length * 2);
  S.state.lastSignalLockRatio = S.state.signalLockRatio;
  S.state.guessHistory.push({
    guess: raw,
    results,
    signalLockRatio: S.state.signalLockRatio,
    angle: row * ((Math.PI * 2) / S.state.maxAttempts)
  });
  renderWordleGuess(raw, results, row);
  playWordleReadout(results);
  updateProximityBar(null);
  updateScoreDisplay();

  const counts = results.reduce((summary, result) => {
    summary[result] += 1;
    return summary;
  }, { correct: 0, misplaced: 0, absent: 0 });
  const resultText = results.map((result) => result === 'correct' ? 'green' : result === 'misplaced' ? 'amber' : 'absent').join(', ');
  if (counts.correct === length) {
    S.state.gameOver = true;
    S.state.wins += 1;
    const turnsUsed = S.state.wordleHistory.length;
    if (S.state.bestTurns === 0 || turnsUsed < S.state.bestTurns) S.state.bestTurns = turnsUsed;
    try {
      window.sessionStorage.setItem('sonar_x86_wins', String(S.state.wins));
      window.sessionStorage.setItem('sonar_x86_best', String(S.state.bestTurns));
    } catch (error) {}
    updateScoreDisplay();
    if (S.ui.attemptsVal) S.ui.attemptsVal.textContent = String(S.state.attemptsLeft);
    S.ui.feedbackBanner.className = 'feedback-banner win';
    S.ui.feedbackMain.textContent = `[*] CIPHER CRACKED! CODE WAS ${raw}`;
    S.ui.feedbackSub.textContent = 'Press Y or New Mission to play again.';
    if (S.ui.btnFire) S.ui.btnFire.textContent = 'New Mission';
    appendLog(`<span>[WORDLE] ${raw} // ${resultText}</span><span>CRACKED</span>`, 'var(--emerald)');
    setTimeout(() => {
      playVictoryFanfare();
      speakText('Cipher cracked! All digits correct! Press Y or New Mission to play again.', 0);
    }, length * 150);
    return;
  }
  S.state.attemptsLeft -= 1;
  if (S.ui.attemptsVal) S.ui.attemptsVal.textContent = String(S.state.attemptsLeft);
  const announcement = `Guess ${raw.split('').join(' ')}: ${results.map((result) => result === 'correct' ? 'green' : result === 'misplaced' ? 'amber' : 'gray').join(', ')}. ${S.state.attemptsLeft} left.`;
  appendLog(`<span>[WORDLE] ${raw} // ${resultText}</span><span>${S.state.attemptsLeft} LEFT</span>`, 'var(--cyan)');
  if (S.state.attemptsLeft === 0) {
    S.state.gameOver = true;
    S.ui.feedbackBanner.className = 'feedback-banner error';
    S.ui.feedbackMain.textContent = `[X] CIPHER LOCKED. CODE: ${S.state.targetCode.join('')}`;
    S.ui.feedbackSub.textContent = 'Out of attempts. Press Enter or Y to start a new mission.';
    setTimeout(() => {
      playDefeatTone();
      speakText(`No more attempts. Code ${S.state.targetCode.join('')}.`, 0);
    }, length * 150);
    if (S.ui.btnFire) S.ui.btnFire.textContent = 'New Mission';
    return;
  }
  S.ui.feedbackBanner.className = 'feedback-banner';
  S.ui.feedbackMain.textContent = `[SCAN] ${raw} // ${resultText.toUpperCase()}`;
  S.ui.feedbackSub.textContent = `${counts.correct} green, ${counts.misplaced} amber, ${counts.absent} gray. ${S.state.attemptsLeft} attempts left.`;
  restartAmbientPulseTimer();
  setTimeout(() => speakText(announcement, 0), length * 150);
}

function handleGuessSubmission(event) {
  if (event) event.preventDefault();
  if (S.state.gameOver) {
    startNewGame(true);
    return;
  }

  const raw = (S.ui.guessInput.value || '').trim();
  S.ui.guessInput.value = '';

  if (S.state.gameMode === 'wordle') {
    submitWordleGuess(raw);
    return;
  }

  if (raw.length === 0 || !/^\d+$/.test(raw)) {
    playErrorBuzzer();
    S.ui.feedbackBanner.className = 'feedback-banner error';
    S.ui.feedbackMain.textContent = '[!] ERROR: INVALID INPUT! DIGITS ONLY.';
    S.ui.feedbackSub.textContent = `Attempt preserved (${S.state.attemptsLeft} left). Non-numeric keystrokes rejected by ASCII bounds check.`;
    appendLog(`<span>[!] Rejected input "${raw || 'EMPTY'}" (JB '0' / JA '9')</span><span>Attempts: ${S.state.attemptsLeft}</span>`, 'var(--coral)');
    updateX86Telemetry({
      ax: 0, bx: S.state.maxRange, cx: S.state.attemptsLeft, dx: 0,
      zf: 0, sf: 1, of: 0, cf: 1,
      traceLines: [
        `MOV BL, [SI]           ; Read ASCII byte`,
        `CMP BL, '0' / CMP BL, '9'`,
        `JB INVALID_INPUT       ; Non-digit rejected!`,
        `JMP GAME_LOOP          ; Attempts preserved (${S.state.attemptsLeft})`
      ]
    });
    speakText(`Error. Invalid input. Please enter digits only. You still have ${S.state.attemptsLeft} attempts.`, 280);
    return;
  }

  const userVal = Number.parseInt(raw, 10);
  if (userVal < 1 || userVal > S.state.maxRange) {
    playErrorBuzzer();
    S.ui.feedbackBanner.className = 'feedback-banner error';
    S.ui.feedbackMain.textContent = `[!] ERROR: OUT OF RANGE! ENTER 1 TO ${S.state.maxRange}.`;
    S.ui.feedbackSub.textContent = `Attempt preserved (${S.state.attemptsLeft} left). Value ${userVal} failed boundary check.`;
    appendLog(`<span>[!] Out of range: ${userVal} (Valid: 1-${S.state.maxRange})</span><span>Attempts: ${S.state.attemptsLeft}</span>`, 'var(--coral)');
    updateX86Telemetry({
      ax: userVal, bx: S.state.maxRange, cx: S.state.attemptsLeft, dx: 0,
      zf: 0, sf: 0, of: 0, cf: 1,
      traceLines: [
        `MOV AX, [user_val]     ; AX = ${userVal}`,
        `CMP AX, ${S.state.maxRange}            ; Check upper bound`,
        `JA OUT_OF_RANGE        ; Out of bounds!`,
        `JMP GAME_LOOP          ; Attempts preserved (${S.state.attemptsLeft})`
      ]
    });
    speakText(`Error. ${userVal} is out of range. Enter a number from 1 to ${S.state.maxRange}. ${S.state.attemptsLeft} attempts left.`, 280);
    return;
  }

  if (S.state.gameMode === 'harmonic') {
    playHarmonicTune(S.state.targetNum, userVal);
  }

  if (typeof spawnSonarShockwave === 'function') {
    spawnSonarShockwave();
  }

  const delta = Math.abs(S.state.targetNum - userVal);
  S.state.lastGuess = userVal;
  S.state.lastDelta = delta;

  if (userVal < S.state.targetNum) {
    S.state.minPossible = Math.max(S.state.minPossible || 1, userVal + 1);
  } else if (userVal > S.state.targetNum) {
    S.state.maxPossible = Math.min(S.state.maxPossible || S.state.maxRange, userVal - 1);
  }

  if (S.state.minPossible > S.state.maxPossible) {
    S.state.minPossible = 1;
    S.state.maxPossible = S.state.maxRange;
  }

  updateTargetBracket();
  const blipAngle = ((userVal / S.state.maxRange) * Math.PI * 2) - (Math.PI / 2);

  if (typeof resetIdlePromptTimer === 'function') resetIdlePromptTimer();

  if (userVal === S.state.targetNum) {
    if (S.state.gameMode === 'defusal') {
      S.state.defusalStreak += 1;
      S.state.timeLeft = Math.min(180, S.state.timeLeft + 12);
      S.state.gameOver = false;
      S.state.guessHistory = [];
      S.state.lastGuess = null;
      S.state.lastDelta = null;
      updateScoreDisplay();
      if (S.ui.feedbackBanner) S.ui.feedbackBanner.className = 'feedback-banner win';
      if (S.ui.feedbackMain) S.ui.feedbackMain.textContent = `[*] TARGET LOCKED // DEFUSAL STREAK ${S.state.defusalStreak}!`;
      if (S.ui.feedbackSub) S.ui.feedbackSub.textContent = `Bonus +12s granted. New target seeded. Timer: ${S.state.timeLeft}s.`;
      appendLog(`<span>[*] DEFUSAL LOCK ${userVal} // ZF=1</span><span>Streak: ${S.state.defusalStreak}</span>`, 'var(--emerald)');
      updateX86Telemetry({
        ax: userVal, bx: S.state.maxRange, cx: S.state.attemptsLeft, dx: S.state.targetNum,
        zf: 1, sf: 0, of: 0, cf: 0,
        traceLines: [
          `MOV AX, ${userVal}             ; Validated user_val`,
          `CMP AX, [target_num]   ; Compare ${userVal} vs ${S.state.targetNum}`,
          `JE DEFUSE             ; ZF = 1 (Lock Acquired)`,
          `ADD WORD [timer], 12  ; +12 second bonus`,
        ]
      });
      speakText(`Target locked. Defusal streak ${S.state.defusalStreak}. Bonus twelve seconds granted. New target seeded.`, 480);
      playVictoryFanfare();
      const randBuf = new Uint32Array(1);
      window.crypto.getRandomValues(randBuf);
      S.state.targetNum = (randBuf[0] % S.state.maxRange) + 1;
      S.state.lastGuess = null;
      S.state.lastDelta = null;
      S.state.guessHistory = [];
      S.state.minPossible = 1;
      S.state.maxPossible = S.state.maxRange;
      if (S.ui.guessInput) S.ui.guessInput.value = '';
      updateProximityBar(null);
      updateTargetBracket();
      updateTimerDisplay();
      updateModeTabs();
      return;
    }

    S.state.gameOver = true;
    const turnsUsed = (S.state.maxAttempts - S.state.attemptsLeft) + 1;
    S.state.wins += 1;
    if (S.state.bestTurns === 0 || turnsUsed < S.state.bestTurns) {
      S.state.bestTurns = turnsUsed;
    }
    try {
      window.sessionStorage.setItem('sonar_x86_wins', String(S.state.wins));
      window.sessionStorage.setItem('sonar_x86_best', String(S.state.bestTurns));
    } catch (error) {}
    updateScoreDisplay();

    if (S.ui.radarCanvasBox) {
      S.ui.radarCanvasBox.classList.remove('radar-fired');
      void S.ui.radarCanvasBox.offsetWidth;
      S.ui.radarCanvasBox.classList.add('radar-fired');
    }
    S.state.guessHistory.push({ guess: userVal, delta: 0, direction: 'WIN', angle: blipAngle });
    updateProximityBar(0);
    restartAmbientPulseTimer();
    playVictoryFanfare();
    S.ui.feedbackBanner.className = 'feedback-banner win';
    S.ui.feedbackMain.textContent = `[*] TARGET LOCKED! SECRET NUMBER WAS ${S.state.targetNum}!`;
    S.ui.feedbackSub.textContent = `Victory in ${turnsUsed} turn(s)! Press Enter or Y to launch a new mission.`;
    appendLog(`<span>[*] EXACT MATCH: ${userVal} (ZF=1, JE VICTORY)</span><span>WON IN ${turnsUsed} TURNS</span>`, 'var(--emerald)');
    updateX86Telemetry({
      ax: userVal, bx: S.state.maxRange, cx: S.state.attemptsLeft, dx: S.state.targetNum,
      zf: 1, sf: 0, of: 0, cf: 0,
      traceLines: [
        `MOV AX, ${userVal}             ; Validated user_val`,
        `CMP AX, [target_num]   ; Compare ${userVal} vs ${S.state.targetNum}`,
        `JE VICTORY             ; ZF = 1 (Exact Match!)`,
        `CALL SOUND_VICTORY     ; Target Lock Confirmed`
      ]
    });
    speakText(`Target locked! Correct! You guessed the secret number ${S.state.targetNum} in ${turnsUsed} turns. Press Y or Enter to play again.`, 550);
    return;
  }

  S.state.attemptsLeft -= 1;
  if (S.ui.attemptsVal) S.ui.attemptsVal.textContent = String(S.state.attemptsLeft);

  const direction = userVal < S.state.targetNum ? 'LOW' : 'HIGH';
  const tierInfo = getProximityTierInfo(delta);
  if (S.ui.radarCanvasBox) {
    S.ui.radarCanvasBox.classList.remove('radar-fired');
    void S.ui.radarCanvasBox.offsetWidth;
    S.ui.radarCanvasBox.classList.add('radar-fired');
  }
  S.state.guessHistory.push({ guess: userVal, delta, direction, angle: blipAngle });
  updateProximityBar(delta);

  if (S.state.attemptsLeft === 0) {
    S.state.gameOver = true;
    stopCountdownTimer();
    restartAmbientPulseTimer();
    playDefeatTone();
    S.ui.feedbackBanner.className = 'feedback-banner error';
    S.ui.feedbackMain.textContent = `[X] GAME OVER! OUT OF ATTEMPTS. SECRET NUMBER WAS: ${S.state.targetNum}`;
    S.ui.feedbackSub.textContent = `Your last guess was ${userVal}. Press Enter or Y to start a new game.`;
    appendLog(`<span>[X] GAME OVER on guess ${userVal}. Target revealed: ${S.state.targetNum}</span><span>0 LEFT</span>`, 'var(--coral)');
    updateX86Telemetry({
      ax: userVal, bx: S.state.maxRange, cx: 0, dx: S.state.targetNum,
      zf: 0, sf: direction === 'LOW' ? 1 : 0, of: 0, cf: direction === 'LOW' ? 1 : 0,
      traceLines: [
        `DEC WORD [attempts]    ; Attempts = 0`,
        `CMP WORD [attempts], 0 ; Check exhaustion`,
        `JE GAME_OVER           ; Branch to Defeat`,
        `CALL PRINT_NUM         ; Revealed target: ${S.state.targetNum}`
      ]
    });
    speakText(`Game over! You ran out of attempts. The secret number was ${S.state.targetNum}. Press Y or Enter to play again.`, 750);
    return;
  }

  triggerSonarSequence(delta, direction);
  restartAmbientPulseTimer();

  if (direction === 'LOW') {
    S.ui.feedbackBanner.className = 'feedback-banner low';
    S.ui.feedbackMain.textContent = `>> [-] ${userVal} IS TOO LOW! AIM HIGHER.`;
    S.ui.feedbackSub.textContent = `Sonar: ${tierInfo.label} • Left-Ear Ascending Sweep • ${S.state.attemptsLeft} attempts left.`;
    appendLog(`<span>[-] Guess: ${userVal} (TOO LOW • JL)</span><span>${tierInfo.label}</span>`, 'var(--amber)');
    updateX86Telemetry({
      ax: userVal, bx: S.state.maxRange, cx: S.state.attemptsLeft, dx: delta,
      zf: 0, sf: 1, of: 0, cf: 1,
      traceLines: [
        `MOV AX, ${userVal}             ; Validated user_val`,
        `CMP AX, [target_num]   ; SF != OF (Less Than)`,
        `JL GUESS_LOW           ; Branch to Too Low`,
        `OUT 42h, AL            ; Ascending Sweep + Ping`
      ]
    });
    speakText(`${userVal} is too low. Aim higher. ${tierInfo.label}. ${S.state.attemptsLeft} attempts left.`, 920);
  } else {
    S.ui.feedbackBanner.className = 'feedback-banner high';
    S.ui.feedbackMain.textContent = `>> [+] ${userVal} IS TOO HIGH! AIM LOWER.`;
    S.ui.feedbackSub.textContent = `Sonar: ${tierInfo.label} • Right-Ear Descending Sweep • ${S.state.attemptsLeft} attempts left.`;
    appendLog(`<span>[+] Guess: ${userVal} (TOO HIGH • JG)</span><span>${tierInfo.label}</span>`, 'var(--magenta)');
    updateX86Telemetry({
      ax: userVal, bx: S.state.maxRange, cx: S.state.attemptsLeft, dx: delta,
      zf: 0, sf: 0, of: 0, cf: 0,
      traceLines: [
        `MOV AX, ${userVal}             ; Validated user_val`,
        `CMP AX, [target_num]   ; ZF=0, SF=OF (Greater)`,
        `JG GUESS_HIGH          ; Branch to Too High`,
        `OUT 42h, AL            ; Descending Sweep + Ping`
      ]
    });
    speakText(`${userVal} is too high. Aim lower. ${tierInfo.label}. ${S.state.attemptsLeft} attempts left.`, 920);
  }
}

window.startNewGame = startNewGame;
window.handleGuessSubmission = handleGuessSubmission;
window.getProximityTierInfo = getProximityTierInfo;
window.setGameMode = setGameMode;
window.cycleGameMode = cycleGameMode;
