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
  if (delta === null || segs.length === 0) {
    if (ui.proxTierText) ui.proxTierText.textContent = 'AWAITING PING';
    segs.forEach((segment) => { segment.className = 'prox-seg'; });
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
  return ['classic', 'evasive', 'defusal', 'harmonic'];
}

function getModeLabel(modeName) {
  const labels = {
    classic: 'CLASSIC CALIBRATION (CAO10 STD)',
    evasive: 'EVASIVE SUBMARINE (MOVING TARGET)',
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

function stopCountdownTimer() {
  if (S.state.countdownTimer) {
    clearInterval(S.state.countdownTimer);
    S.state.countdownTimer = null;
  }
}

function updateTimerDisplay() {
  const ui = S.ui || {};
  if (ui.rangeVal) {
    if (S.state.gameMode === 'defusal') {
      ui.rangeVal.textContent = `TIMER: ${S.state.timeLeft}s`;
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

function setGameMode(modeName, announce = true) {
  const modes = getModeList();
  const safeMode = modes.includes(modeName) ? modeName : 'classic';
  S.state.gameMode = safeMode;
  S.state.timeLimit = 60;
  S.state.timeLeft = S.state.timeLimit;
  S.state.defusalStreak = safeMode === 'defusal' ? S.state.defusalStreak : 0;
  updateModeTabs();

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

  if (ui.difficultyButtons && ui.difficultyButtons.length) {
    const activeButton = ui.difficultyButtons.find((button) => button.classList.contains('active')) || ui.difficultyButtons[0];
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
  const profile = getSelectedDifficultyProfile();
  S.state.maxRange = profile.range;
  S.state.maxAttempts = profile.attempts;
  S.state.attemptsLeft = S.state.maxAttempts;
  S.state.lastGuess = null;
  S.state.lastDelta = null;
  S.state.minPossible = 1;
  S.state.maxPossible = S.state.maxRange;
  S.state.gameOver = false;
  S.state.guessHistory = [];

  if (!preserveTimer) {
    S.state.timeLeft = S.state.timeLimit;
    if (S.state.gameMode === 'defusal') {
      S.state.defusalStreak = Math.max(0, S.state.defusalStreak);
    }
  }

  const randBuf = new Uint32Array(1);
  window.crypto.getRandomValues(randBuf);
  S.state.targetNum = (randBuf[0] % S.state.maxRange) + 1;
  S.state.targetFrequencyHz = 220 + S.state.targetNum * 7.5;
  S.state.playerFrequencyHz = 220 + (ui.guessInput && ui.guessInput.value ? Number(ui.guessInput.value) : 1) * 8.5;

  if (ui.attemptsVal) ui.attemptsVal.textContent = String(S.state.attemptsLeft);
  if (ui.rangeVal) ui.rangeVal.textContent = S.state.gameMode === 'defusal' ? `TIMER: ${S.state.timeLeft}s` : `1 - ${S.state.maxRange}`;
  if (ui.deltaVal) ui.deltaVal.textContent = 'BEST: --';
  if (ui.guessInput) {
    ui.guessInput.value = '';
    ui.guessInput.placeholder = `Enter guess (1-${S.state.maxRange})...`;
    ui.guessInput.disabled = false;
  }
  if (ui.feedbackBanner) ui.feedbackBanner.className = 'feedback-banner';
  if (ui.feedbackMain) ui.feedbackMain.textContent = `${getModeLabel(S.state.gameMode)} // RANGE: 1 TO ${S.state.maxRange}`;
  if (ui.feedbackSub) {
    ui.feedbackSub.textContent = S.state.gameMode === 'defusal'
      ? `Defusal timer: ${S.state.timeLeft}s • Streak: ${S.state.defusalStreak}. Focus on target lock.`
      : `You have ${S.state.attemptsLeft} attempts. Type digits and press Enter to fire acoustic sonar.`;
  }
  if (ui.turnLog) ui.turnLog.innerHTML = `<div class="log-entry" style="color: var(--cyan);"><span>[BOOT] ${getModeLabel(S.state.gameMode)} // target seeded in [1, ${S.state.maxRange}].</span></div>`;

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
      : `New Sonar Mission started. Guess a number between 1 and ${S.state.maxRange}. You have ${S.state.maxAttempts} attempts.`;
    speakText(intro, 220);
  }
  if (ui.guessInput) ui.guessInput.focus();
}

function startNewGame(announce = true) {
  const ui = S.ui || {};
  const profile = getSelectedDifficultyProfile();
  S.state.maxRange = profile.range;
  S.state.maxAttempts = profile.attempts;
  S.state.gameStarted = true;
  if (S.state.gameMode === 'defusal') {
    S.state.timeLimit = 60;
  }
  seedTargetRound({ announce, preserveTimer: false });
  if (typeof resetIdlePromptTimer === 'function') resetIdlePromptTimer();
}

function handleGuessSubmission(event) {
  if (event) event.preventDefault();
  if (S.state.gameOver) {
    startNewGame(true);
    return;
  }

  const raw = (S.ui.guessInput.value || '').trim();
  S.ui.guessInput.value = '';

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
      window.localStorage.setItem('sonar_x86_wins', String(S.state.wins));
      window.localStorage.setItem('sonar_x86_best', String(S.state.bestTurns));
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

  if (S.state.gameMode === 'evasive' && S.state.attemptsLeft > 0) {
    const drift = (Math.random() * 7 | 0) - 3;
    const previousTarget = S.state.targetNum;
    S.state.targetNum = Math.max(1, Math.min(S.state.maxRange, previousTarget + drift));
    const driftDirection = S.state.targetNum > previousTarget ? 'higher' : (S.state.targetNum < previousTarget ? 'lower' : 'steady');
    S.state.targetFrequencyHz = 220 + S.state.targetNum * 7.5;
    playDopplerDrift(S.state.targetNum > previousTarget ? 'HIGH' : 'LOW');
    appendLog(`<span>[EVADE] Target drifted ${driftDirection}: ${previousTarget} -> ${S.state.targetNum}</span><span>ADD WORD [target_num], DX ; Evasive drift</span>`, 'var(--cyan)');
    updateX86Telemetry({
      ax: userVal, bx: S.state.maxRange, cx: S.state.attemptsLeft, dx: S.state.targetNum,
      zf: 0, sf: 0, of: 0, cf: 0,
      traceLines: [
        `MOV AX, ${previousTarget}     ; Current target`,
        `ADD AX, ${drift}      ; Evasive drift`,
        `ADD WORD [target_num], DX ; Evasive drift`,
        `CMP AX, [target_num]     ; Drift applied to target`
      ]
    });
    speakText(`Evasive drift detected. Submarine moved ${driftDirection}. Target now ${S.state.targetNum}.`, 380);
  }

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
