/* 오목 규칙: 판, 승리 판정 */
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

  return { SIZE, EMPTY, BLACK, WHITE, DIRS, createBoard, inside, get, other, lineCells, findWin };
})();
