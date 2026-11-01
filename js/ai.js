/* 컴퓨터 상대 (쉬움 / 보통 / 어려움) */
'use strict';

const AI = (() => {
  const { SIZE, EMPTY, BLACK, WHITE, DIRS } = Rules;
  const N = SIZE * SIZE;

  // ---------- 한 방향 모양 판별표 ----------
  // 놓을 자리를 가운데로 두고 양쪽 4칸씩, 9칸을 본다.
  // 0 = 빈칸, 1 = 내 돌, 2 = 막힘(상대 돌 또는 판 밖)
  const NONE = 0, ONE = 1, TWO = 2, OPEN2 = 3, THREE = 4, OPEN3 = 5, FOUR = 6, OPEN4 = 7, FIVE = 8;
  const POW3 = [1, 3, 9, 27, 81, 243, 729, 2187, 6561];
  const PATTERNS = 19683; // 3^9

  // 다섯 칸 창 중 '한 수로 다섯이 되는 빈칸' 수. 이미 다섯이면 -1
  function completions(cells) {
    let a = -1, b = -1;
    for (let s = 0; s <= 4; s++) {
      let k = 0, e = -1, blocked = false;
      for (let t = 0; t < 5; t++) {
        const v = cells[s + t];
        if (v === 2) { blocked = true; break; }
        if (v === 1) k++; else e = s + t;
      }
      if (blocked) continue;
      if (k === 5) return -1;
      if (k === 4) {
        if (a < 0) a = e; else if (e !== a) b = e;
      }
    }
    return a < 0 ? 0 : b < 0 ? 1 : 2;
  }

  const memo = [new Int8Array(PATTERNS).fill(-1), new Int8Array(PATTERNS).fill(-1),
    new Int8Array(PATTERNS).fill(-1), new Int8Array(PATTERNS).fill(-1)];
  const UPGRADE = { [OPEN4]: OPEN3, [FOUR]: THREE, [OPEN3]: OPEN2, [THREE]: TWO, [OPEN2]: ONE, [TWO]: ONE };

  function level(cells, idx, depth) {
    const m = memo[depth][idx];
    if (m >= 0) return m;
    let r;
    const c = completions(cells);
    if (c < 0) r = FIVE;
    else if (c === 2) r = OPEN4;
    else if (c === 1) r = FOUR;
    else if (depth === 0) r = NONE;
    else {
      r = NONE;
      for (let e = 0; e < 9; e++) {
        if (cells[e] !== 0) continue;
        cells[e] = 1;
        const l = level(cells, idx + POW3[e], depth - 1);
        cells[e] = 0;
        const u = UPGRADE[l] || NONE;
        if (u > r) r = u;
      }
    }
    memo[depth][idx] = r;
    return r;
  }

  const SHAPE = new Uint8Array(PATTERNS);
  (function buildTable() {
    const cells = new Array(9);
    for (let idx = 0; idx < PATTERNS; idx++) {
      let v = idx;
      for (let i = 0; i < 9; i++) { cells[i] = v % 3; v = (v / 3) | 0; }
      if (cells[4] !== 1) continue;
      SHAPE[idx] = level(cells, idx, 3);
    }
  })();

  // (x,y)에 color를 놓았을 때 각 방향 모양
  function shapeAt(b, x, y, dx, dy, color) {
    let idx = POW3[4];
    for (let k = -4; k <= 4; k++) {
      if (k === 0) continue;
      const i = x + dx * k, j = y + dy * k;
      let v;
      if (i < 0 || j < 0 || i >= SIZE || j >= SIZE) v = 2;
      else {
        const c = b[j * SIZE + i];
        v = c === EMPTY ? 0 : c === color ? 1 : 2;
      }
      idx += v * POW3[k + 4];
    }
    return SHAPE[idx];
  }

  const SHAPE_SCORE = [0, 10, 60, 400, 700, 5000, 6000, 500000, 10000000];
  const WIN_SCORE = SHAPE_SCORE[FIVE];

  // 빈칸 (x,y)에 color를 놓을 때의 가치
  function pointScore(b, x, y, color) {
    let s = 0, fours = 0, threes = 0;
    for (const [dx, dy] of DIRS) {
      const sh = shapeAt(b, x, y, dx, dy, color);
      s += SHAPE_SCORE[sh];
      if (sh === FOUR || sh === OPEN4) fours++;
      else if (sh === OPEN3) threes++;
    }
    if (fours >= 2) s += 400000;
    else if (fours && threes) s += 300000;
    else if (threes >= 2) s += 100000;
    return s;
  }

  // ---------- 후보 수 ----------
  function nearbyEmpty(b, dist) {
    const mark = new Uint8Array(N);
    const out = [];
    for (let p = 0; p < N; p++) {
      if (b[p] === EMPTY) continue;
      const x = p % SIZE, y = (p / SIZE) | 0;
      for (let j = Math.max(0, y - dist); j <= Math.min(SIZE - 1, y + dist); j++) {
        for (let i = Math.max(0, x - dist); i <= Math.min(SIZE - 1, x + dist); i++) {
          const q = j * SIZE + i;
          if (b[q] === EMPTY && !mark[q]) { mark[q] = 1; out.push(q); }
        }
      }
    }
    return out;
  }

  // 렌주 규칙이면 흑의 금수 자리는 둘 수 없음
  function legal(b, p, color, opts) {
    if (!opts.renju || color !== BLACK) return true;
    const x = p % SIZE, y = (p / SIZE) | 0;
    // 빠른 거르기: 3 이상인 방향이 둘 미만이고 한 줄 4-4·6목 가능성도 없으면 금수 아님
    let strong = 0;
    for (const [dx, dy] of DIRS) {
      const sh = shapeAt(b, x, y, dx, dy, BLACK);
      if (sh === OPEN4 || sh === FIVE) { strong = 2; break; }
      if (sh >= OPEN3) strong++;
    }
    if (strong < 2) return true;
    return !Rules.isForbidden(b, x, y);
  }

  // 정말 다섯이 되는지 (렌주 흑은 정확히 다섯)
  function makesFive(b, p, color, opts) {
    b[p] = color;
    const ok = !!Rules.findWin(b, p % SIZE, (p / SIZE) | 0, color, opts.renju && color === BLACK);
    b[p] = EMPTY;
    return ok;
  }

  // 점수를 매긴 후보 목록 (좋은 순)
  function scoredMoves(b, color, opts, dist = 2) {
    const opp = Rules.other(color);
    const list = [];
    for (const p of nearbyEmpty(b, dist)) {
      const x = p % SIZE, y = (p / SIZE) | 0;
      const a = pointScore(b, x, y, color);
      let d = pointScore(b, x, y, opp);
      // 상대가 흑이고 그 자리가 금수면 막을 필요 없음
      if (d >= 5000 && !legal(b, p, opp, opts)) d = 0;
      // 붙어 있는 돌이 많을수록 조금 더 (같은 점수면 자연스러운 자리)
      let near = 0;
      for (let j = Math.max(0, y - 1); j <= Math.min(SIZE - 1, y + 1); j++) {
        for (let i = Math.max(0, x - 1); i <= Math.min(SIZE - 1, x + 1); i++) {
          if (b[j * SIZE + i] !== EMPTY) near++;
        }
      }
      list.push({ p, a, d, s: a + d * 0.85 + near * 40 });
    }
    list.sort((m, n) => n.s - m.s);
    return list;
  }

  function firstLegal(b, list, color, opts, pred) {
    for (const m of list) if ((!pred || pred(m)) && legal(b, m.p, color, opts)) return m;
    return null;
  }

  function openingMove(b) {
    let count = 0, last = -1;
    for (let p = 0; p < N; p++) if (b[p] !== EMPTY) { count++; last = p; }
    const c = (SIZE >> 1) * SIZE + (SIZE >> 1);
    if (count === 0) return c;
    if (count === 1) {
      const x = last % SIZE, y = (last / SIZE) | 0;
      const opts = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [0, 1], [-1, 0], [0, -1]]
        .map(([dx, dy]) => [x + dx, y + dy])
        .filter(([i, j]) => Rules.inside(i, j))
        .sort((p1, p2) => Math.hypot(p1[0] - 7, p1[1] - 7) - Math.hypot(p2[0] - 7, p2[1] - 7));
      const pick = opts[Math.random() < 0.5 ? 0 : Math.min(1, opts.length - 1)];
      return pick[1] * SIZE + pick[0];
    }
    return -1;
  }

  // 이길 수 있으면 이기고, 상대가 다섯을 만들 자리가 있으면 막기
  function urgentMove(b, list, color, opts) {
    const opp = Rules.other(color);
    const win = firstLegal(b, list, color, opts, (m) => m.a >= WIN_SCORE && makesFive(b, m.p, color, opts));
    if (win) return win.p;
    const block = firstLegal(b, list, color, opts, (m) => m.d >= WIN_SCORE && makesFive(b, m.p, opp, opts));
    if (block) return block.p;
    return -1;
  }

  // ---------- 쉬움 ----------
  function easy(b, color, opts) {
    const list = scoredMoves(b, color, opts, 1);
    const u = urgentMove(b, list, color, opts);
    if (u >= 0) return u;
    // 내 돌을 단순히 이어 가는 수 + 약간의 무작위
    let best = null, bestS = -1;
    for (const m of list) {
      if (!legal(b, m.p, color, opts)) continue;
      const s = Math.min(m.a, 6000) + Math.random() * 900;
      if (s > bestS) { bestS = s; best = m; }
    }
    return best ? best.p : -1;
  }

  // ---------- 보통 ----------
  function normal(b, color, opts) {
    const list = scoredMoves(b, color, opts);
    const u = urgentMove(b, list, color, opts);
    if (u >= 0) return u;
    const legalList = list.filter((m) => legal(b, m.p, color, opts));
    if (!legalList.length) return -1;
    const top = legalList[0].s;
    const ties = legalList.filter((m) => m.s >= top * 0.995);
    return ties[(Math.random() * ties.length) | 0].p;
  }

  // ---------- 어려움: 점수 + 몇 수 앞 탐색 ----------
  // 판 전체 평가: 같은 색만 들어 있는 다섯 칸 창마다 점수를 더함
  const TUPLE = [0, 2, 20, 200, 3000, 1000000];
  const WINDOWS = (() => {
    const w = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        for (const [dx, dy] of DIRS) {
          const ex = x + dx * 4, ey = y + dy * 4;
          if (!Rules.inside(ex, ey)) continue;
          const cells = [];
          for (let k = 0; k < 5; k++) cells.push((y + dy * k) * SIZE + (x + dx * k));
          w.push(cells);
        }
      }
    }
    return w;
  })();

  const BIG = 1e9;

  function evaluate(b, color) {
    let mine = 0, theirs = 0, myFour = false;
    for (const w of WINDOWS) {
      let m = 0, t = 0;
      for (let k = 0; k < 5; k++) {
        const v = b[w[k]];
        if (v === color) m++; else if (v !== EMPTY) t++;
      }
      if (m && !t) { mine += TUPLE[m]; if (m === 4) myFour = true; }
      else if (t && !m) theirs += TUPLE[t];
    }
    if (myFour) return BIG / 2; // 둘 차례에 4가 있으면 다음 수로 이김
    return mine * 1.1 - theirs;
  }

  class Timeout extends Error {}

  // ---------- 연속 4로 이기는 길 찾기 (VCF) ----------
  // p에 side 돌이 있을 때, 한 수 더 두면 다섯이 되는 빈칸들
  function fiveSpotsThrough(b, p, side, opts) {
    const x = p % SIZE, y = (p / SIZE) | 0;
    const spots = [];
    for (const [dx, dy] of DIRS) {
      for (let k = -4; k <= 4; k++) {
        if (!k) continue;
        const i = x + dx * k, j = y + dy * k;
        if (!Rules.inside(i, j)) continue;
        const q = j * SIZE + i;
        if (b[q] === EMPTY && !spots.includes(q) && makesFive(b, q, side, opts)) spots.push(q);
      }
    }
    return spots;
  }

  function hasFiveSpot(b, side, opts) {
    for (const p of nearbyEmpty(b, 1)) {
      const x = p % SIZE, y = (p / SIZE) | 0;
      for (const [dx, dy] of DIRS) {
        if (shapeAt(b, x, y, dx, dy, side) === FIVE && makesFive(b, p, side, opts)) return true;
      }
    }
    return false;
  }

  // side가 4를 계속 두어 이길 수 있으면 첫 수를 돌려줌 (없으면 -1)
  function findVCF(b, side, opts, maxDepth, budget, deadline) {
    const opp = Rules.other(side);
    let nodes = 0;
    function rec(depth) {
      if (++nodes > budget || depth === 0) return -1;
      if ((nodes & 15) === 0 && performance.now() > deadline) { nodes = budget + 1; return -1; }
      for (const p of nearbyEmpty(b, 2)) {
        const x = p % SIZE, y = (p / SIZE) | 0;
        let four = false;
        for (const [dx, dy] of DIRS) {
          const sh = shapeAt(b, x, y, dx, dy, side);
          if (sh === FOUR || sh === OPEN4) { four = true; break; }
        }
        if (!four || !legal(b, p, side, opts)) continue;
        b[p] = side;
        let win = false;
        const spots = fiveSpotsThrough(b, p, side, opts);
        if (spots.length >= 2) win = true;
        else if (spots.length === 1) {
          const q = spots[0];
          if (!legal(b, q, opp, opts)) win = true; // 상대(흑)가 금수라 못 막음
          else {
            b[q] = opp;
            // 막은 수로 상대가 다섯이 되거나, 상대에게 다섯 자리가 생기면 이 길은 실패
            const oppFive = Rules.findWin(b, q % SIZE, (q / SIZE) | 0, opp, opts.renju && opp === BLACK);
            if (!oppFive && !fiveSpotsThrough(b, q, opp, opts).length) win = rec(depth - 1) >= 0;
            b[q] = EMPTY;
          }
        }
        b[p] = EMPTY;
        if (win) return p;
        if (nodes > budget) return -1;
      }
      return -1;
    }
    if (hasFiveSpot(b, opp, opts)) return -1; // 상대가 먼저 다섯을 만들 수 있으면 의미 없음
    return rec(maxDepth);
  }

  function hard(b, color, opts) {
    const limit = opts.timeLimit || 700;
    const start = performance.now();
    const deadline = start + limit;
    const rootList = scoredMoves(b, color, opts);
    const u = urgentMove(b, rootList, color, opts);
    if (u >= 0) return u;

    // 4를 연달아 두어 이기는 길이 있으면 그대로
    for (const d of [1, 2, 3, 5, 8, 11]) {
      const vcf = findVCF(b, color, opts, d, 2500, start + limit * 0.2);
      if (vcf >= 0) return vcf;
    }
    const searchEnd = start + limit * 0.75;

    const rootMoves = [];
    for (const m of rootList) {
      if (rootMoves.length >= 14) break;
      if (legal(b, m.p, color, opts)) rootMoves.push(m);
    }
    if (!rootMoves.length) return -1;
    if (rootMoves.length === 1) return rootMoves[0].p;

    let nodes = 0;

    function negamax(side, depth, alpha, beta, ply) {
      if ((++nodes & 63) === 0 && performance.now() > searchEnd) throw new Timeout();
      if (depth === 0) return evaluate(b, side);

      const list = scoredMoves(b, side, opts);
      if (!list.length) return 0;
      const opp = Rules.other(side);

      // 바로 이길 수 있음
      for (const m of list) {
        if (m.a < WIN_SCORE) break;
        if (legal(b, m.p, side, opts) && makesFive(b, m.p, side, opts)) return BIG - ply;
      }
      // 상대의 다섯 자리를 막아야 함
      let moves = list.filter((m) => m.d >= WIN_SCORE && makesFive(b, m.p, opp, opts));
      if (moves.length >= 2) return -(BIG - ply - 1);
      if (!moves.length) moves = list;

      const limit = ply < 2 ? 10 : 7;
      let best = -Infinity, tried = 0;
      for (const m of moves) {
        if (tried >= limit) break;
        if (!legal(b, m.p, side, opts)) continue;
        tried++;
        b[m.p] = side;
        let v;
        try { v = -negamax(opp, depth - 1, -beta, -alpha, ply + 1); }
        finally { b[m.p] = EMPTY; }
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
      return tried ? best : 0;
    }

    let bestMove = rootMoves[0].p;
    const opp = Rules.other(color);
    try {
      for (let depth = 2; depth <= 10; depth += 2) {
        let alpha = -Infinity, iterBest = rootMoves[0], iterScore = -Infinity;
        for (const m of rootMoves) {
          b[m.p] = color;
          let v;
          try { v = -negamax(opp, depth - 1, -Infinity, -alpha, 1); }
          finally { b[m.p] = EMPTY; }
          if (v > iterScore) { iterScore = v; iterBest = m; }
          if (v > alpha) alpha = v;
        }
        bestMove = iterBest.p;
        // 다음 깊이에서는 가장 좋았던 수를 먼저 봄
        rootMoves.splice(rootMoves.indexOf(iterBest), 1);
        rootMoves.unshift(iterBest);
        if (iterScore >= BIG / 2 || iterScore <= -BIG / 2) break; // 승패가 보이면 끝
      }
    } catch (e) {
      if (!(e instanceof Timeout)) throw e;
    }

    // 고른 수 다음에 상대가 4를 연달아 두어 이기는 길이 생기는지 확인하고, 생기면 다른 후보로
    const order = [bestMove, ...rootMoves.map((m) => m.p).filter((p) => p !== bestMove)];
    for (const p of order) {
      if (performance.now() > deadline) break;
      b[p] = color;
      const threat = findVCF(b, opp, opts, 8, 800, deadline);
      b[p] = EMPTY;
      if (threat < 0) return p;
    }
    return bestMove;
  }

  // ---------- 바깥에서 쓰는 함수 ----------
  // 돌려주는 값: { x, y } (둘 곳이 없으면 null)
  function chooseMove(board, color, level, opts = {}) {
    const b = Int8Array.from(board);
    let p = openingMove(b);
    if (p < 0 || !legal(b, p, color, opts)) {
      p = level === 'easy' ? easy(b, color, opts)
        : level === 'hard' ? hard(b, color, opts)
          : normal(b, color, opts);
    }
    if (p < 0) {
      // 비상용: 둘 수 있는 아무 빈칸
      for (let q = 0; q < N; q++) if (b[q] === EMPTY && legal(b, q, color, opts)) { p = q; break; }
    }
    return p < 0 ? null : { x: p % SIZE, y: (p / SIZE) | 0 };
  }

  return { chooseMove, pointScore };
})();
