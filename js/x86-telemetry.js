window.Sonar = window.Sonar || {};
var S = window.Sonar;

function toHex16(n) {
  const val = ((n & 0xFFFF) >>> 0).toString(16).toUpperCase().padStart(4, '0');
  return `${val}h`;
}

function updateX86Telemetry({ ax = 0, bx = S.state.maxRange, cx = S.state.attemptsLeft, dx = S.state.targetNum, zf = 0, sf = 0, of = 0, cf = 0, traceLines = [] } = {}) {
  const ui = S.ui || {};
  const blindfold = !!(S.state && S.state.blindfoldMode);

  if (ui.regAX) ui.regAX.textContent = `${toHex16(ax)} (${ax})`;
  if (ui.regBX) ui.regBX.textContent = `${toHex16(bx)} (${bx})`;
  if (ui.regCX) ui.regCX.textContent = `${toHex16(cx)} (${cx})`;
  if (ui.regDX) ui.regDX.textContent = blindfold && !(S.state && S.state.gameOver) ? '????h (HIDDEN)' : `${toHex16(dx)} (${dx})`;
  if (ui.regPIT) ui.regPIT.textContent = `${toHex16(Math.round(1193180 / Math.max(1, ax || 1)))} (${Math.round(1193180 / Math.max(1, ax || 1))}Hz)`;
  if (ui.regPort61) ui.regPort61.textContent = `${toHex16((Math.random() * 255) | 0)} (${(Math.random() * 255) | 0})`;

  const setFlag = (node, name, value) => {
    if (!node) return;
    const small = node.querySelector('small');
    node.className = value ? 'flag-pill flag-set' : 'flag-pill';
    node.innerHTML = `${name} = ${value}<br/><small>${small ? small.textContent : 'Flag'}</small>`;
  };

  setFlag(ui.flagZF, 'ZF', zf);
  setFlag(ui.flagSF, 'SF', sf);
  setFlag(ui.flagOF, 'OF', of);
  setFlag(ui.flagCF, 'CF', cf);

  if (traceLines.length > 0 && ui.asmTraceBox) {
    ui.asmTraceBox.innerHTML = traceLines
      .map((line, index) => `<div class="${index === traceLines.length - 1 ? 'asm-line-active' : ''}">${line}</div>`)
      .join('');
  }
}
