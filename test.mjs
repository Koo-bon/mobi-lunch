// 돌림판 계산이 맞는지 확인한다. 실행: node test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const W = require('./logic.js');
const { TAU, MAX, POINTER, winnerIndex, encodeList, decodeList, cleanList, CATEGORIES } = W;

// --- 1) 바늘이 가리키는 조각이 실제로 화면의 그 조각인가 --------------------
// 조각 i는 [rot + i*slice, rot + (i+1)*slice) 범위에 그려진다.
// 그 범위 한가운데를 바늘 위치로 만들었을 때 i가 나와야 한다.
for (const n of [2, 3, 5, 6, 8, 12]) {
  const slice = TAU / n;
  for (let i = 0; i < n; i++) {
    // 조각 i의 한가운데가 바늘에 오도록 돌림판을 돌린 각도
    const rot = POINTER - (i + 0.5) * slice;
    assert.equal(winnerIndex(rot, n), i, `${n}조각 중 ${i}번이 바늘에 와야 한다`);
    // 몇 바퀴를 더 돌아도 결과는 같아야 한다
    assert.equal(winnerIndex(rot + 7 * TAU, n), i, '여러 바퀴 돌아도 같아야 한다');
    assert.equal(winnerIndex(rot - 4 * TAU, n), i, '반대로 돌아도 같아야 한다');
  }
}

// --- 2) 경계에서도 범위를 벗어나지 않는다 ------------------------------------
for (const n of [2, 5, 7]) {
  for (let k = 0; k < 400; k++) {
    const idx = winnerIndex(Math.random() * 200 - 100, n);
    assert.ok(Number.isInteger(idx) && idx >= 0 && idx < n, `조각 번호가 0~${n - 1}이어야 한다: ${idx}`);
  }
}
assert.equal(winnerIndex(0, 0), -1, '후보가 없으면 -1');

// --- 3) 치우치지 않는가 (아무 각도나 돌렸을 때 고르게 나오는지) --------------
{
  const n = 6, hits = new Array(n).fill(0), N = 60000;
  for (let i = 0; i < N; i++) hits[winnerIndex(Math.random() * TAU, n)]++;
  const expect = N / n;
  hits.forEach((h, i) => assert.ok(Math.abs(h - expect) < expect * 0.1,
    `${i}번 조각이 너무 자주/드물게 나온다: ${h} (기대 ${expect})`));
}

// --- 4) 링크로 목록을 주고받을 수 있는가 -------------------------------------
{
  const list = ['김치찌개', '이모네 국밥', 'A&B 분식'];
  assert.deepEqual(decodeList('#l=' + encodeList(list)), list, '링크를 거쳐도 그대로여야 한다');
  assert.deepEqual(decodeList(encodeList(list)), list, '접두사가 없어도 읽혀야 한다');
  assert.deepEqual(decodeList(''), [], '빈 링크는 빈 목록');
  assert.deepEqual(decodeList('#l=%E0%A4%A'), [], '깨진 링크는 빈 목록 (터지면 안 된다)');
}

// --- 5) 목록 정리: 공백·중복·개수 제한 ---------------------------------------
{
  assert.deepEqual(cleanList(['  김밥 ', '김밥', '', '   ', '라면']), ['김밥', '라면'],
    '앞뒤 공백을 지우고 중복·빈 값을 뺀다');
  const many = Array.from({ length: 30 }, (_, i) => '가게' + i);
  assert.equal(cleanList(many).length, MAX, `후보는 ${MAX}개까지만 남는다`);
  assert.equal(cleanList(['x'.repeat(50)])[0].length, 20, '너무 긴 이름은 자른다');
}

// --- 6) 카테고리 프리셋이 바로 돌릴 수 있는 상태인가 -------------------------
for (const c of CATEGORIES) {
  assert.ok(c.name && c.items.length >= 2, `${c.name}: 후보가 2개 이상이어야 돌릴 수 있다`);
  assert.equal(cleanList(c.items).length, c.items.length, `${c.name}: 중복이 없어야 한다`);
}

console.log(`통과 — 카테고리 ${CATEGORIES.length}개, 최대 ${MAX}칸, 바늘·당첨 일치 및 균등성 확인`);
