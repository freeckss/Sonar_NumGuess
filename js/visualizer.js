window.Sonar = window.Sonar || {};
var S = window.Sonar;

function getTargetFrequencyHz(value) {
  return 220 + Math.max(1, Number(value) || 1) * 7.5;
}

function getPlayerFrequencyHz(value) {
  return 200 + Math.max(1, Number(value) || 1) * 8.5;
}

function initAmbientParticles() {
  if (document.getElementById('ambientParticlesCanvas')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'ambientParticlesCanvas';
  canvas.setAttribute('aria-hidden', 'true');

  const firstChild = document.body.firstChild;
  if (firstChild) {
    document.body.insertBefore(canvas, firstChild);
  } else {
    document.body.appendChild(canvas);
  }

  const particles = Array.from({ length: 18 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 2.4 + 0.8,
    speedX: (Math.random() - 0.5) * 0.18,
    speedY: (Math.random() - 0.5) * 0.12,
    alpha: Math.random() * 0.5 + 0.18
  }));

  const ctx = canvas.getContext('2d');
  const resize = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  };

  function animateParticles() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    ctx.clearRect(0, 0, width, height);

    for (const particle of particles) {
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      if (particle.x < -10) particle.x = width + 10;
      if (particle.x > width + 10) particle.x = -10;
      if (particle.y < -10) particle.y = height + 10;
      if (particle.y > height + 10) particle.y = -10;

      ctx.beginPath();
      ctx.fillStyle = `rgba(0, 229, 255, ${particle.alpha})`;
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(animateParticles);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(animateParticles);
}

function triggerRadarPowerOn() {
  const ui = S.ui || {};
  const radarBox = ui.radarCanvasBox;
  if (!radarBox) return;

  radarBox.classList.remove('radar-powered-on');
  void radarBox.offsetWidth;
  radarBox.classList.add('radar-powered-on');
  setTimeout(() => radarBox.classList.remove('radar-powered-on'), 520);
}

function ensureShockwaveState() {
  S.state.sonarShockwaves = S.state.sonarShockwaves || [];
}

function spawnSonarShockwave(color = 'rgba(0, 229, 255, 0.7)') {
  ensureShockwaveState();
  S.state.sonarShockwaves.push({
    startedAt: performance.now(),
    duration: 1200,
    maxRadius: 1,
    color,
    pulse: 0
  });
  if (S.state.sonarShockwaves.length > 8) {
    S.state.sonarShockwaves.shift();
  }
}

function drawRadar() {
  const ui = S.ui || {};
  const canvas = ui.radarCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = (w / 2) - 14;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (maxR / 4) * i, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(cx - maxR, cy);
  ctx.lineTo(cx + maxR, cy);
  ctx.moveTo(cx, cy - maxR);
  ctx.lineTo(cx, cy + maxR);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0, 230, 118, 0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(0, 229, 255, 0.38)';
  ctx.textAlign = 'left';
  for (let i = 1; i <= 4; i++) {
    const ringR = (maxR / 4) * i;
    ctx.fillText(`${Math.round((i / 4) * (S.state.maxRange || 100))}`, cx + 8, cy - ringR + 4);
  }

  ctx.textAlign = 'center';
  for (let deg = 0; deg < 360; deg += 15) {
    const angle = (deg - 90) * Math.PI / 180;
    const inner = maxR + 4;
    const outer = maxR + 12;
    const x1 = cx + Math.cos(angle) * inner;
    const y1 = cy + Math.sin(angle) * inner;
    const x2 = cx + Math.cos(angle) * outer;
    const y2 = cy + Math.sin(angle) * outer;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (deg % 90 === 0) {
      const label = `${String((deg % 360 + 360) % 360).padStart(3, '0')}°`;
      const lx = cx + Math.cos(angle) * (maxR + 24);
      const ly = cy + Math.sin(angle) * (maxR + 24);
      ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
      ctx.fillText(label, lx, ly + 3);
    }
  }

  ensureShockwaveState();
  const now = performance.now();
  S.state.sonarShockwaves = (S.state.sonarShockwaves || []).filter((wave) => now - wave.startedAt < wave.duration);
  for (const wave of S.state.sonarShockwaves) {
    const t = (now - wave.startedAt) / wave.duration;
    const radius = (0.1 + t) * maxR;
    const alpha = 1 - t;
    ctx.beginPath();
    ctx.strokeStyle = wave.color.replace(/0\.7\)|0.8\)|0.9\)/, `${alpha})`);
    ctx.lineWidth = 1.5;
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  S.state.radarAngle = (S.state.radarAngle + 0.03) % (Math.PI * 2);
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, maxR);
  grad.addColorStop(0, 'rgba(0, 229, 255, 0.28)');
  grad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, maxR, S.state.radarAngle - 0.45, S.state.radarAngle);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(S.state.radarAngle) * maxR, cy + Math.sin(S.state.radarAngle) * maxR);
  ctx.stroke();

  const history = S.state.guessHistory || [];
  history.forEach((item, idx) => {
    const normDist = Math.min(0.95, item.delta / S.state.maxRange);
    const r = item.delta === 0 ? 0 : 12 + normDist * (maxR - 18);
    const bx = cx + Math.cos(item.angle) * r;
    const by = cy + Math.sin(item.angle) * r;
    const color = item.direction === 'WIN' ? '#00e676' : item.direction === 'LOW' ? '#ffca28' : '#e040fb';
    const alphaBase = 0.18 + ((idx + 1) / Math.max(1, history.length)) * 0.9;
    ctx.beginPath();
    ctx.strokeStyle = `rgba(0, 229, 255, ${alphaBase * 0.4})`;
    ctx.lineWidth = 1.5;
    if (idx > 0) {
      const prev = history[idx - 1];
      const prevR = prev.delta === 0 ? 0 : 12 + Math.min(0.95, prev.delta / S.state.maxRange) * (maxR - 18);
      const prevX = cx + Math.cos(prev.angle) * prevR;
      const prevY = cy + Math.sin(prev.angle) * prevR;
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = idx === history.length - 1 ? 18 : 10;
    ctx.beginPath();
    ctx.arc(bx, by, idx === history.length - 1 ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();

    if (idx === history.length - 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx - 12, by);
      ctx.lineTo(bx + 12, by);
      ctx.moveTo(bx, by - 12);
      ctx.lineTo(bx, by + 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(bx, by, 16, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
      ctx.stroke();
    }

    ctx.fillStyle = '#e6f4ff';
    ctx.font = '11px monospace';
    ctx.fillText(item.guess, bx + 8, by + 4);
    ctx.shadowBlur = 0;
  });
}

function drawOscilloscope() {
  const ui = S.ui || {};
  const canvas = ui.oscCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const now = performance.now();
  const activeWindowMs = 420;
  const audioLive = !!(S.audio && S.audio.analyser) && ((now - (S.state.lastAudioPulseAt || 0)) < activeWindowMs);

  ctx.fillStyle = '#02070d';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.14)';
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  const isHarmonicMode = S.state.gameMode === 'harmonic';

  if (isHarmonicMode) {
    const targetFreq = getTargetFrequencyHz(S.state.targetNum);
    const guessValue = Number.parseInt((ui.guessInput && ui.guessInput.value) || S.state.lastGuess || S.state.targetNum || 1, 10);
    const playerFreq = getPlayerFrequencyHz(guessValue);
    const timePhase = (performance.now() / 1000) * 2;
    const deltaNorm = S.state.lastDelta == null ? 0 : Math.min(1, S.state.lastDelta / Math.max(1, S.state.maxRange));
    const phaseShift = deltaNorm * Math.PI;

    ctx.lineWidth = 2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(0, 229, 255, 0.8)';
    ctx.strokeStyle = '#00e5ff';
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const angle = (x / w) * Math.PI * 2 * 3;
      const waveform = Math.sin(angle * (targetFreq / 300) + timePhase) * 0.5;
      const y = h / 2 + waveform * (h * 0.28);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.shadowColor = 'rgba(255, 202, 40, 0.8)';
    ctx.strokeStyle = '#ffca28';
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const angle = (x / w) * Math.PI * 2 * 3;
      const waveform = Math.sin(angle * (playerFreq / 300) + timePhase + phaseShift) * 0.5;
      const y = h / 2 + waveform * (h * 0.28);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    return;
  }

  if (audioLive && S.audio && S.audio.analyser) {
    const analyser = S.audio.analyser;
    const bufferLen = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLen);
    analyser.getByteTimeDomainData(dataArray);

    ctx.lineWidth = 2.2;
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(0, 229, 255, 0.8)';
    ctx.strokeStyle = '#00e5ff';
    ctx.beginPath();
    const sliceWidth = w / bufferLen;
    let x = 0;
    for (let i = 0; i < bufferLen; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.shadowColor = 'rgba(54, 240, 180, 0.75)';
    ctx.strokeStyle = '#36f0b4';
    for (let x = 0; x <= w; x += 2) {
      const angle = (x / w) * Math.PI * 2 * 3;
      const waveform = Math.sin(angle + now / 370) * (0.18 + (now - (S.state.lastAudioPulseAt || now)) / 2000);
      const y = h / 2 + waveform * (h * 0.3);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    return;
  }

  ctx.lineWidth = 2;
  ctx.shadowBlur = 16;
  ctx.shadowColor = 'rgba(0, 229, 255, 0.35)';
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.72)';
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const angle = (x / w) * Math.PI * 2 * 2.4;
    const waveform = Math.sin(angle + now / 1000) * 0.42;
    const y = h / 2 + waveform * (h * 0.18);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function renderLoop() {
  drawRadar();
  drawOscilloscope();
  requestAnimationFrame(renderLoop);
}

initAmbientParticles();

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    initAmbientParticles();
    requestAnimationFrame(renderLoop);
  }, { once: true });
} else {
  initAmbientParticles();
  requestAnimationFrame(renderLoop);
}
