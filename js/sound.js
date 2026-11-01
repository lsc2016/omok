/* 돌 놓는 "딱" 소리 (파일 없이 Web Audio로 만듦) */
'use strict';

const Sound = (() => {
  const KEY = 'omok.sound';
  let enabled = localStorage.getItem(KEY) !== 'off';
  let ctx = null;
  let noise = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      // 짧은 잡음 (나무 부딪히는 질감)
      const len = Math.floor(ctx.sampleRate * 0.05);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 휴대폰은 사용자가 화면을 누른 뒤에야 소리를 낼 수 있어서, 첫 터치 때 준비
  function unlock() { if (enabled) ensure(); }

  function play(color) {
    if (!enabled) return;
    const ac = ensure();
    if (!ac) return;
    const t = ac.currentTime + 0.005;
    const out = ac.createGain();
    out.gain.value = 0.9;
    out.connect(ac.destination);

    // 딱: 대역 필터를 거친 잡음
    const src = ac.createBufferSource();
    src.buffer = noise;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = color === 2 ? 2300 : 2000; // 흑·백 소리를 아주 살짝 다르게
    bp.Q.value = 1.4;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(1, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(bp).connect(ng).connect(out);
    src.start(t);

    // 판이 울리는 낮은 '톡'
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.06);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.5, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(og).connect(out);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  function setEnabled(on) {
    enabled = on;
    localStorage.setItem(KEY, on ? 'on' : 'off');
    if (on) ensure();
  }

  return { play, unlock, setEnabled, isEnabled: () => enabled };
})();
