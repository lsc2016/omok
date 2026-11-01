/* 오목 규칙: 판, 승리 판정, 렌주 금수 */
'use strict';

const Rules = (() => {
  const SIZE = 15;
  const EMPTY = 0, BLACK = 1, WHITE = 2;
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  const createBoard = () => new Int8Array(SIZE * SIZE);
  const inside = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
  const get = (b, x, y) => (inside(x, y) ? b[y * SIZE + x] : -1);
  const other = (c) => (c === BLACK ? WHITE : BLACK);

  // (x,y)를 지나는 dx,dy 방향의 같은 색 연속 돌 칸 목록
  function lineCells(b, x, y, dx, dy, color) {
    const cells = [[x, y]];
    let i = x + dx, j = y + dy;
    while (get(b, i, j) === color) { cells.push([i, j]); i += dx; j += dy; }
    i = x - dx; j = y - dy;
    while (get(b, i, j) === color) { cells.unshift([i, j]); i -= dx; j -= dy; }
    return cells;
  }

  // (x,y)에 color 돌이 놓여 있다고 보고, 이긴 줄을 돌려줌 (없으면 null)
  // exactFive: 정확히 5개만 승리로 인정 (렌주 규칙의 흑)
  function findWin(b, x, y, color, exactFive) {
    for (const [dx, dy] of DIRS) {
      const cells = lineCells(b, x, y, dx, dy, color);
      if (exactFive ? cells.length === 5 : cells.length >= 5) return cells;
    }
    return null;
  }

  // ---------- 렌주 금수 (흑만 해당) ----------
  // (x,y)를 지나는 한 방향의 연속 흑돌 수
  function runLen(b, x, y, dx, dy) {
    let n = 1, i = x + dx, j = y + dy;
    while (get(b, i, j) === BLACK) { n++; i += dx; j += dy; }
    i = x - dx; j = y - dy;
    while (get(b, i, j) === BLACK) { n++; i -= dx; j -= dy; }
    return n;
  }

  // (x,y)에 흑이 있다고 볼 때, 이 방향에서 한 수만 더 두면 (x,y)를 포함한
  // 정확한 다섯이 되는 빈칸들의 위치(오프셋)
  function fivePoints(b, x, y, dx, dy) {
    const pts = [];
    for (let k = -4; k <= 4; k++) {
      if (k === 0) continue;
      const i = x + dx * k, j = y + dy * k;
      if (get(b, i, j) !== EMPTY) continue;
      b[j * SIZE + i] = BLACK;
      if (runLen(b, x, y, dx, dy) === 5) pts.push(k);
      b[j * SIZE + i] = EMPTY;
    }
    return pts;
  }

  // 이 방향의 '4' 개수 (0, 1, 2). 열린 4(.XXXX.)는 하나로 셈
  function fourCount(b, x, y, dx, dy) {
    const pts = fivePoints(b, x, y, dx, dy);
    if (pts.length === 2 && pts[1] - pts[0] === 5) return 1;
    return Math.min(pts.length, 2);
  }

  function isStraightFour(b, x, y, dx, dy) {
    const pts = fivePoints(b, x, y, dx, dy);
    return pts.length === 2 && pts[1] - pts[0] === 5;
  }

  // 이 방향이 '열린 3'인지: 한 수 더 두어 열린 4를 만들 수 있고, 그 자리가 금수가 아님
  function isOpenThree(b, x, y, dx, dy, depth) {
    for (let k = -4; k <= 4; k++) {
      if (k === 0) continue;
      const i = x + dx * k, j = y + dy * k;
      if (get(b, i, j) !== EMPTY) continue;
      b[j * SIZE + i] = BLACK;
      const straight = isStraightFour(b, x, y, dx, dy);
      b[j * SIZE + i] = EMPTY;
      if (straight && (depth >= 2 || !isForbidden(b, i, j, depth + 1))) return true;
    }
    return false;
  }

  // 흑이 빈칸 (x,y)에 두면 금수인지: 3-3, 4-4, 6목(장목)
  // 정확한 다섯이 되면 금수가 아님
  function isForbidden(b, x, y, depth = 0) {
    const idx = y * SIZE + x;
    if (b[idx] !== EMPTY) return false;
    b[idx] = BLACK;
    try {
      let overline = false;
      for (const [dx, dy] of DIRS) {
        const n = runLen(b, x, y, dx, dy);
        if (n === 5) return false;
        if (n > 5) overline = true;
      }
      if (overline) return true;
      let fours = 0, threes = 0;
      for (const [dx, dy] of DIRS) {
        const f = fourCount(b, x, y, dx, dy);
        if (f) fours += f;
        else if (isOpenThree(b, x, y, dx, dy, depth)) threes++;
      }
      return fours >= 2 || threes >= 2;
    } finally {
      b[idx] = EMPTY;
    }
  }

  // 금수 이유 (안내 문구용)
  function forbiddenReason(b, x, y) {
    const idx = y * SIZE + x;
    b[idx] = BLACK;
    try {
      for (const [dx, dy] of DIRS) if (runLen(b, x, y, dx, dy) > 5) return '6목';
      let fours = 0;
      for (const [dx, dy] of DIRS) fours += fourCount(b, x, y, dx, dy);
      return fours >= 2 ? '4-4' : '3-3';
    } finally {
      b[idx] = EMPTY;
    }
  }

  return {
    SIZE, EMPTY, BLACK, WHITE, DIRS, createBoard, inside, get, other, lineCells, findWin,
    isForbidden, forbiddenReason,
  };
})();
