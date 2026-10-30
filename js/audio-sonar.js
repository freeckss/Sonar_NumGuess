window.Sonar = window.Sonar || {};
var S = window.Sonar;

S.audio = S.audio || {};
S.audio.audioCtx = null;
S.audio.analyser = null;
S.audio.ambientTimer = null;

function initAudio() {
  if (!S.audio.audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    S.audio.audioCtx = new AudioContextClass();
    S.audio.analyser = S.audio.audioCtx.createAnalyser();
    S.audio.analyser.fftSize = 1024;
    S.audio.analyser.connect(S.audio.audioCtx.destination);
  }
  if (S.audio.audioCtx.state === 'suspended') {
    S.audio.audioCtx.resume();
  }
}

function playDopplerDrift(direction) {
  const base = 260;
  const driftFreq = direction === 'LOW' ? base - 28 : base + 28;
  playSynthTone({ freqStart: driftFreq, freqEnd: direction === 'LOW' ? base - 90 : base + 90, duration: 0.22, type: 'sawtooth', pan: direction === 'LOW' ? -0.65 : 0.65, gainLevel: 0.12 });
}

function playHarmonicTune(targetValue, guessValue) {
  const targetFreq = 240 + (Number(targetValue) || 1) * 9;
  const guessFreq = 260 + (Number(guessValue) || 1) * 9;
  playSynthTone({ freqStart: targetFreq, duration: 0.12, type: 'sine', pan: -0.8, gainLevel: 0.08 });
  playSynthTone({ freqStart: guessFreq, duration: 0.12, type: 'sine', pan: 0.8, gainLevel: 0.08, delayStart: 0.02 });
}

function playSynthTone({ freqStart, freqEnd = null, duration = 0.12, type = 'sine', pan = 0, gainLevel = 0.28, delayStart = 0 }) {
  initAudio();
  S.state.lastAudioPulseAt = performance.now();
  const now = S.audio.audioCtx.currentTime + delayStart;
  const osc = S.audio.audioCtx.createOscillator();
  const gain = S.audio.audioCtx.createGain();
  const panner = S.audio.audioCtx.createStereoPanner ? S.audio.audioCtx.createStereoPanner() : null;

  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, now);
  if (freqEnd !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
  }

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(gainLevel, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

  if (panner) {
    panner.pan.setValueAtTime(pan, now);
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(S.audio.analyser);
  } else {
    osc.connect(gain);
    gain.connect(S.audio.analyser);
  }

  osc.start(now);
  osc.stop(now + duration + 0.02);

  const pitDivisor = Math.round(1193180 / freqStart);
  const ui = S.ui;
  if (ui.sonarFreqLabel) ui.sonarFreqLabel.textContent = `PIT: ${Math.round(freqStart)} Hz`;
  if (ui.regPIT) ui.regPIT.textContent = `${toHex16(pitDivisor)} (${Math.round(freqStart)}Hz)`;
  if (ui.panStatusLabel) {
    ui.panStatusLabel.textContent =
      pan < -0.1 ? 'STEREO PAN: LEFT (LOW)' :
      pan > 0.1 ? 'STEREO PAN: RIGHT (HIGH)' : 'STEREO PAN: CENTER';
  }
}

function playStereoEarTest(side) {
  if (!side || !['left', 'right'].includes(side)) return;

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  initAudio();
  if (S.audio.audioCtx && S.audio.audioCtx.state === 'suspended') {
    S.audio.audioCtx.resume();
  }

  const isLeft = side === 'left';
  const sweepStart = isLeft ? 280 : 880;
  const sweepEnd = isLeft ? 680 : 320;
  const pingFreq = isLeft ? 750 : 420;
  const panValue = isLeft ? -1 : 1;
  const message = isLeft
    ? 'Left ear check. Ascending pitch means your guess is too low. Aim higher.'
    : 'Right ear check. Descending pitch means your guess is too high. Aim lower.';

  const playDiscreteTone = (frequency, duration, cStart, gainLevel = 0.22) => {
    const ctx = S.audio.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const now = ctx.currentTime + cStart;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainLevel, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (panner) {
      panner.pan.setValueAtTime(panValue, now);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);
    } else {
      const merger = ctx.createChannelMerger(2);
      const leftGain = ctx.createGain();
      const rightGain = ctx.createGain();
      leftGain.gain.value = isLeft ? 1 : 0;
      rightGain.gain.value = isLeft ? 0 : 1;
      osc.connect(gain);
      gain.connect(leftGain);
      gain.connect(rightGain);
      leftGain.connect(merger, 0, 0);
      rightGain.connect(merger, 0, 1);
      merger.connect(ctx.destination);
    }

    osc.start(now);
    osc.stop(now + duration + 0.04);
  };

  const sweepDuration = 0.35;
  const rampOsc = S.audio.audioCtx.createOscillator();
  const rampGain = S.audio.audioCtx.createGain();
  const rampPanner = S.audio.audioCtx.createStereoPanner ? S.audio.audioCtx.createStereoPanner() : null;
  const sweepStartTime = S.audio.audioCtx.currentTime;

  rampOsc.type = 'triangle';
  rampOsc.frequency.setValueAtTime(sweepStart, sweepStartTime);
  rampOsc.frequency.exponentialRampToValueAtTime(Math.max(40, sweepEnd), sweepStartTime + sweepDuration);
  rampGain.gain.setValueAtTime(0.001, sweepStartTime);
  rampGain.gain.linearRampToValueAtTime(0.22, sweepStartTime + 0.03);
  rampGain.gain.exponentialRampToValueAtTime(0.0001, sweepStartTime + sweepDuration);

  if (rampPanner) {
    rampPanner.pan.setValueAtTime(panValue, sweepStartTime);
    rampOsc.connect(rampGain);
    rampGain.connect(rampPanner);
    rampPanner.connect(S.audio.audioCtx.destination);
  } else {
    const merger = S.audio.audioCtx.createChannelMerger(2);
    const leftGain = S.audio.audioCtx.createGain();
    const rightGain = S.audio.audioCtx.createGain();
    leftGain.gain.value = isLeft ? 1 : 0;
    rightGain.gain.value = isLeft ? 0 : 1;
    rampOsc.connect(rampGain);
    rampGain.connect(leftGain);
    rampGain.connect(rightGain);
    leftGain.connect(merger, 0, 0);
    rightGain.connect(merger, 0, 1);
    merger.connect(S.audio.audioCtx.destination);
  }

  rampOsc.start(sweepStartTime);
  rampOsc.stop(sweepStartTime + sweepDuration + 0.04);

  setTimeout(() => {
    playDiscreteTone(pingFreq, 0.09, 0, 0.2);
    playDiscreteTone(pingFreq, 0.09, 0.12, 0.18);
  }, 420);

  const announceStereoTest = () => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.25;
    utterance.pitch = 1.08;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  setTimeout(announceStereoTest, 750);

  window.playStereoEarTest = window.playStereoEarTest || playStereoEarTest;
}

function triggerSonarSequence(delta, direction) {
  initAudio();
  const normDist = Math.min(1, delta / S.state.maxRange);
  const proximity = 1 - normDist;
  const panVal = direction === 'LOW' ? -0.6 : 0.6;

  if (direction === 'LOW') {
    playSynthTone({ freqStart: 330, freqEnd: 620, duration: 0.18, type: 'triangle', pan: panVal, gainLevel: 0.26, delayStart: 0 });
  } else {
    playSynthTone({ freqStart: 780, freqEnd: 380, duration: 0.18, type: 'triangle', pan: panVal, gainLevel: 0.26, delayStart: 0 });
  }

  const pingFreq = Math.round(380 + proximity * 1120);
  const pingGapSec = 0.09 + normDist * 0.28;

  for (let i = 0; i < 3; i++) {
    const startOffset = 0.26 + i * pingGapSec;
    playSynthTone({ freqStart: pingFreq, freqEnd: pingFreq * 0.92, duration: 0.075, type: 'sine', pan: panVal * 0.5, gainLevel: 0.34, delayStart: startOffset });
    playSynthTone({ freqStart: pingFreq, freqEnd: pingFreq * 0.88, duration: 0.11, type: 'sine', pan: -panVal * 0.3, gainLevel: 0.09, delayStart: startOffset + 0.055 });
  }
}

function playErrorBuzzer() {
  playSynthTone({ freqStart: 220, freqEnd: 190, duration: 0.12, type: 'sawtooth', pan: 0, gainLevel: 0.22, delayStart: 0 });
  playSynthTone({ freqStart: 165, freqEnd: 145, duration: 0.18, type: 'sawtooth', pan: 0, gainLevel: 0.24, delayStart: 0.15 });
}

function playVictoryFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => {
    playSynthTone({ freqStart: freq, freqEnd: freq, duration: idx === 3 ? 0.38 : 0.12, type: 'triangle', pan: 0, gainLevel: 0.32, delayStart: idx * 0.13 });
  });
}

function playDefeatTone() {
  const notes = [440, 349.23, 293.66, 220];
  notes.forEach((freq, idx) => {
    playSynthTone({ freqStart: freq, freqEnd: freq * 0.95, duration: 0.18, type: 'sawtooth', pan: 0, gainLevel: 0.2, delayStart: idx * 0.17 });
  });
}

function restartAmbientPulseTimer() {
  if (S.audio.ambientTimer) clearInterval(S.audio.ambientTimer);
  if (!S.state.continuousPulse || S.state.gameOver || S.state.lastDelta === null) return;

  const normDist = Math.min(1, S.state.lastDelta / S.state.maxRange);
  const intervalMs = Math.round(220 + normDist * 950);
  const pingFreq = Math.round(380 + (1 - normDist) * 1120);

  S.audio.ambientTimer = setInterval(() => {
    if (!S.state.continuousPulse || S.state.gameOver) return;
    playSynthTone({ freqStart: pingFreq, freqEnd: pingFreq * 0.94, duration: 0.06, type: 'sine', pan: 0, gainLevel: 0.14 });
  }, intervalMs);
}
