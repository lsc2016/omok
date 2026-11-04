# omok — 에이전트 안내

## 이 프로젝트는
- 브라우저에서 바로 하는 오목 게임. 서버 없이 HTML/CSS/JavaScript 만 쓴다 (맥·휴대폰).
- 둘이서 하기 / 컴퓨터와 하기(쉬움·보통·어려움), 자유 규칙 / 렌주 규칙(흑 3-3·4-4·6목 금지).
- GitHub Pages 로 올려 쓰는 것을 생각하고 만듦 (`.nojekyll`). 자세한 설명은 `README.md`.

## 폴더 지도
| 위치 | 설명 |
|---|---|
| `index.html` | 화면 뼈대 (첫 화면 `#home`, 게임 화면 `#game`, 결과 창 `#resultModal`) |
| `css/style.css` | 모양 |
| `js/rules.js` | 판, 승리 판정, 렌주 금수 판정 (`Rules`) |
| `js/ai.js` | 컴퓨터 상대 (`AI.chooseMove`) |
| `js/sound.js` | 돌 소리, Web Audio 로 만듦 (`Sound`) |
| `js/app.js` | 화면 전환, 입력, 그리기, 게임 진행 |
| `.nojekyll` | GitHub Pages 용 빈 파일 |

## 시작점
- `index.html` 을 브라우저로 열면 바로 됨. 빌드·설치 없음.
- 스크립트 순서가 중요: `rules.js` → `ai.js` → `sound.js` → `app.js` (index.html 102-105줄).
- 읽는 순서: `README.md` → `js/app.js` → 필요한 것만 `rules.js`/`ai.js`.
- 검사: `node --check js/*.js` 정도.

## 고치는 규칙
- 있는 것을 지우고 새로 만들지 말고, 더하고 보완하기.
- 사람이 승인하기 전에 데이터 파일·설정 파일을 지우거나 덮어쓰지 않기.
- 삭제 명령(rm -rf 등)은 쓰지 않기.
- 어느 화면에서든 첫 화면으로 돌아갈 길(왼쪽 위 "오목" 로고 → `goHome`, app.js 485줄)을 없애지 않기.
- 이 저장소의 기준 브랜치는 `main` 이 아니라 `claude/web-omok-game-m4ue7s`.

## 읽는 양 줄이기
| 이런 일이면 | 이 파일만 읽어라 |
|---|---|
| 화면 문구·버튼 | `index.html`, `js/app.js` (맨 아래 "연결" 부분) |
| 모양·색 | `css/style.css` |
| 이기는 판정·금수 | `js/rules.js` |
| 컴퓨터가 두는 수 | `js/ai.js` (난이도별 `easy`/`normal`/`hard`, 바깥 입구 `chooseMove`) |
| 소리 | `js/sound.js` |
| 판 그리기 | `js/app.js` 246-424줄 |

열지 말 것: 없음 (작은 저장소).

## 용어
| 우리말 | 코드 |
|---|---|
| 흑 / 백 | `BLACK`(1) / `WHITE`(2) |
| 금수 | `isForbidden`, `forbiddenReason` |
| 무르기 | `undo` |
| 미리 보기(흐린 돌) | `game.pending`(터치), `game.hover`(마우스) |
| 첫 화면 | `#home`, `goHome` |

## 다른 프로젝트와의 연결
- 없음 (다른 저장소를 읽거나 쓰지 않음, `board_signal.py` 같은 신호 조각도 없음).

## 저장소 밖
- 브라우저 localStorage: `omok.settings`(설정), `omok.sound`(소리 켬/끔).

## 모르는 것 (확인 필요)
- GitHub Pages 에 실제로 올렸는지, 어느 브랜치로 올렸는지 (README 는 `main` 을 예로 들지만 `main` 브랜치는 없음).
