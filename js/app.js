/* 오목 화면과 진행 */
'use strict';

(() => {
  const { SIZE, EMPTY, BLACK, WHITE } = Rules;
  const $ = (id) => document.getElementById(id);
  const colorName = (c) => (c === BLACK ? '흑' : '백');

  // ---------- 설정 ----------
  const SETTINGS_KEY = 'omok.settings';
  const settings = Object.assign(
    { mode: 'pvp' },
    JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
  );
  const saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

  function bindSegments() {
    document.querySelectorAll('.seg').forEach((seg) => {
      const name = seg.dataset.name;
      const buttons = [...seg.querySelectorAll('button')];
      const enabled = buttons.filter((b) => !b.disabled);
      if (!enabled.some((b) => b.dataset.value === String(settings[name]))) {
        settings[name] = enabled[0].dataset.value;
      }
      const refresh = () => buttons.forEach((b) =>
        b.classList.toggle('on', b.dataset.value === String(settings[name])));
      buttons.forEach((b) => b.addEventListener('click', () => {
        settings[name] = b.dataset.value;
        refresh();
        onSettingsChange();
      }));
      refresh();
    });
  }
  function onSettingsChange() { saveSettings(); }

  // ---------- 게임 상태 ----------
  const game = {
    board: Rules.createBoard(),
    moves: [],          // {x, y, color}
    turn: BLACK,
    over: false,
    winner: 0,          // BLACK / WHITE / 0(무승부)
    winLine: null,
    pending: null,      // 터치: 미리 보기 중인 칸
    hover: null,        // 마우스: 올려 둔 칸
  };

  function newGame() {
    game.board = Rules.createBoard();
    game.moves = [];
    game.turn = BLACK;
    game.over = false;
    game.winner = 0;
    game.winLine = null;
    game.pending = null;
    game.hover = null;
    hideModal();
    updateUI();
    draw();
  }

  function canPlay(x, y) {
    return !game.over && game.board[y * SIZE + x] === EMPTY;
  }

  function place(x, y) {
    const color = game.turn;
    game.board[y * SIZE + x] = color;
    game.moves.push({ x, y, color });
    game.pending = null;

    const line = Rules.findWin(game.board, x, y, color, false);
    if (line) {
      endGame(color, line);
    } else if (game.moves.length === SIZE * SIZE) {
      endGame(0, null);
    } else {
      game.turn = Rules.other(color);
    }
    updateUI();
    draw();
  }

  function endGame(winner, line) {
    game.over = true;
    game.winner = winner;
    game.winLine = line;
    game.hover = null;
    setTimeout(() => { if (game.over) showModal(); }, line ? 700 : 300);
  }

  function undo() {
    if (!game.moves.length) return;
    const m = game.moves.pop();
    game.board[m.y * SIZE + m.x] = EMPTY;
    game.turn = m.color;
    game.over = false;
    game.winner = 0;
    game.winLine = null;
    game.pending = null;
    hideModal();
    updateUI();
    draw();
  }

  // ---------- 화면 전환 ----------
  function showScreen(name) {
    $('home').hidden = name !== 'home';
    $('game').hidden = name !== 'game';
    if (name === 'game') requestAnimationFrame(resize);
  }

  function goHome() {
    hideModal();
    showScreen('home');
  }

  function startGame() {
    saveSettings();
    showScreen('game');
    newGame();
  }

  // ---------- 상태 표시 ----------
  function setStone(el, c) {
    el.classList.toggle('white', c === WHITE);
    el.classList.toggle('draw', c === 0);
  }

  function updateUI() {
    const stone = $('statusStone');
    const text = $('statusText');
    if (game.over) {
      setStone(stone, game.winner);
      text.textContent = game.winner ? `${colorName(game.winner)} 승리!` : '무승부';
    } else {
      setStone(stone, game.turn);
      text.textContent = `${colorName(game.turn)} 차례`;
    }
    $('undoBtn').disabled = game.moves.length === 0;
    $('info').textContent = '둘이서 하기 · 자유 규칙';
  }

  function showModal() {
    setStone($('resultStone'), game.winner);
    $('resultTitle').textContent = game.winner ? `${colorName(game.winner)} 승리!` : '무승부';
    $('resultSub').textContent = game.winner ? '다섯 개를 먼저 이었어요.' : '판이 꽉 찼어요.';
    $('resultModal').hidden = false;
  }
  function hideModal() { $('resultModal').hidden = true; }

  let toastTimer = 0;
  function toast(msg, ms = 1400) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  // ---------- 바둑판 그리기 ----------
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  let size = 0, cell = 0, dpr = 1;
  let woodLayer = null;

  const pos = (i) => (i + 0.5) * cell;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    size = rect.width;
    cell = size / SIZE;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    woodLayer = makeWood();
    draw();
  }

  // 나무 무늬 + 줄 + 화점을 미리 그려 둠
  function makeWood() {
    const c = document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);

    const bg = g.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#e6bf7e');
    bg.addColorStop(0.5, '#ddb06a');
    bg.addColorStop(1, '#d4a35b');
    g.fillStyle = bg;
    g.fillRect(0, 0, size, size);

    // 결 무늬 (항상 같은 모양이 나오도록 고정된 난수)
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 46; k++) {
      const y0 = rnd() * size;
      const amp = 2 + rnd() * 6;
      const freq = 0.004 + rnd() * 0.01;
      const phase = rnd() * 6.28;
      g.strokeStyle = `rgba(${120 + rnd() * 40 | 0}, ${70 + rnd() * 30 | 0}, 20, ${0.05 + rnd() * 0.08})`;
      g.lineWidth = 0.6 + rnd() * 1.8;
      g.beginPath();
      for (let x = 0; x <= size; x += 6) {
        const y = y0 + Math.sin(x * freq + phase) * amp + x * 0.04;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }

    // 줄
    g.strokeStyle = '#1d140b';
    g.lineWidth = Math.max(1, size / 600);
    g.beginPath();
    for (let i = 0; i < SIZE; i++) {
      const p = Math.round(pos(i) * dpr) / dpr + 0.5 / dpr;
      g.moveTo(pos(0), p); g.lineTo(pos(SIZE - 1), p);
      g.moveTo(p, pos(0)); g.lineTo(p, pos(SIZE - 1));
    }
    g.stroke();
    g.lineWidth = Math.max(1.5, size / 300);
    g.strokeRect(pos(0), pos(0), pos(SIZE - 1) - pos(0), pos(SIZE - 1) - pos(0));

    // 화점
    g.fillStyle = '#1d140b';
    for (const [x, y] of [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]]) {
      g.beginPath();
      g.arc(pos(x), pos(y), Math.max(2, cell * 0.11), 0, Math.PI * 2);
      g.fill();
    }
    return c;
  }

  function drawStone(x, y, color, alpha = 1) {
    const cx = pos(x), cy = pos(y), r = cell * 0.46;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (alpha === 1) {
      ctx.shadowColor = 'rgba(0,0,0,.35)';
      ctx.shadowBlur = cell * 0.12;
      ctx.shadowOffsetX = cell * 0.04;
      ctx.shadowOffsetY = cell * 0.07;
    }
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.08, cx, cy, r);
    if (color === BLACK) {
      g.addColorStop(0, '#7a7a7a');
      g.addColorStop(0.35, '#2a2a2a');
      g.addColorStop(1, '#050505');
    } else {
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.6, '#ececec');
      g.addColorStop(1, '#bdbdbd');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (alpha === 1) {
      // 반질반질한 하이라이트
      ctx.save();
      const h = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.45, 0, cx - r * 0.38, cy - r * 0.45, r * 0.55);
      h.addColorStop(0, color === BLACK ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.9)');
      h.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = h;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function draw() {
    if (!size || !woodLayer) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(woodLayer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const m of game.moves) drawStone(m.x, m.y, m.color);

    // 마지막 돌의 빨간 점
    const last = game.moves[game.moves.length - 1];
    if (last) {
      ctx.fillStyle = '#e02424';
      ctx.beginPath();
      ctx.arc(pos(last.x), pos(last.y), Math.max(2.5, cell * 0.11), 0, Math.PI * 2);
      ctx.fill();
    }

    // 이긴 다섯 돌 강조
    if (game.winLine) {
      ctx.strokeStyle = '#ffcf33';
      ctx.lineWidth = Math.max(2.5, cell * 0.1);
      ctx.shadowColor = 'rgba(255, 190, 0, .9)';
      ctx.shadowBlur = cell * 0.3;
      for (const [x, y] of game.winLine) {
        ctx.beginPath();
        ctx.arc(pos(x), pos(y), cell * 0.47, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    // 미리 보기 (흐린 돌)
    const ghost = game.pending || game.hover;
    if (ghost && canPlay(ghost.x, ghost.y)) {
      drawStone(ghost.x, ghost.y, game.turn, game.pending ? 0.55 : 0.35);
    }
  }

  // ---------- 입력 (마우스·터치) ----------
  let down = null;

  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * SIZE);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * SIZE);
    return Rules.inside(x, y) ? { x, y } : null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const c = cellFromEvent(e);
    const changed = !c !== !game.hover || (c && (c.x !== game.hover.x || c.y !== game.hover.y));
    if (changed) { game.hover = c; draw(); }
  });

  canvas.addEventListener('pointerleave', () => {
    if (game.hover) { game.hover = null; draw(); }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 12) return;
    const c = cellFromEvent(e);
    if (c) handleTap(c.x, c.y, e.pointerType === 'mouse');
  });

  let hintShown = false;

  function handleTap(x, y, isMouse) {
    if (game.over) return;
    if (game.board[y * SIZE + x] !== EMPTY) {
      game.pending = null;
      draw();
      return;
    }
    // 마우스는 바로 놓기, 터치는 미리 보기 → 같은 자리 한 번 더 누르면 확정
    if (isMouse || (game.pending && game.pending.x === x && game.pending.y === y)) {
      place(x, y);
    } else {
      game.pending = { x, y };
      if (!hintShown) { toast('같은 자리를 한 번 더 누르면 놓여요'); hintShown = true; }
      draw();
    }
  }

  // ---------- 연결 ----------
  $('logo').addEventListener('click', goHome);
  $('startBtn').addEventListener('click', startGame);
  $('undoBtn').addEventListener('click', undo);
  $('newBtn').addEventListener('click', newGame);
  $('againBtn').addEventListener('click', newGame);
  $('homeBtn').addEventListener('click', goHome);
  $('resultModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideModal(); // 바깥을 누르면 판 보기
  });

  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe($('boardWrap'));

  bindSegments();
  onSettingsChange();
  showScreen('home');
})();
