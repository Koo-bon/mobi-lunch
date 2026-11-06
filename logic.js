// 돌림판의 순수 계산 부분. 화면·소리와 분리해서 node로도 그대로 검증할 수 있게 둔다.
(() => {
  const TAU = Math.PI * 2;
  const MAX = 12;                 // 조각이 이보다 많으면 글씨가 안 보인다

  // 캔버스 각도는 0이 오른쪽, 시계방향으로 증가한다. 화살표는 맨 위(-90도)에 있다.
  const POINTER = -Math.PI / 2;

  /** 바늘이 가리키는 조각 번호. rot은 돌림판이 돌아간 각도(라디안). */
  function winnerIndex(rot, n) {
    if (n <= 0) return -1;
    const slice = TAU / n;
    const a = (((POINTER - rot) % TAU) + TAU) % TAU;
    return Math.min(n - 1, Math.floor(a / slice));
  }

  /** 목록을 링크에 실을 수 있는 문자열로. */
  function encodeList(names) {
    return encodeURIComponent(names.join('|'));
  }

  /** 링크에서 목록을 되살린다. 공백·중복·초과분을 걸러 낸다. */
  function decodeList(raw) {
    if (!raw) return [];
    let s = String(raw).replace(/^#?(l=)?/, '');
    try { s = decodeURIComponent(s); } catch { return []; }
    return cleanList(s.split('|'));
  }

  /** 입력 목록 정리: 앞뒤 공백 제거, 빈 값·중복 제거, 최대 개수까지만. */
  function cleanList(names) {
    const out = [];
    for (const raw of names) {
      const v = String(raw).trim().slice(0, 20);
      if (v && !out.includes(v)) out.push(v);
      if (out.length >= MAX) break;
    }
    return out;
  }

  const CATEGORIES = [
    { name: '한식',   items: ['김치찌개', '된장찌개', '제육볶음', '순대국', '비빔밥', '불고기'] },
    { name: '중식',   items: ['짜장면', '짬뽕', '탕수육', '마라탕', '볶음밥', '유린기'] },
    { name: '일식',   items: ['돈까스', '초밥', '라멘', '우동', '규동', '카레'] },
    { name: '양식',   items: ['파스타', '피자', '스테이크', '리조또', '햄버거', '샐러드'] },
    { name: '분식',   items: ['떡볶이', '김밥', '라면', '순대', '튀김', '쫄면'] },
    { name: '아시안', items: ['쌀국수', '팟타이', '분짜', '나시고렝', '카오팟', '월남쌈'] },
    { name: '아무거나', items: ['김치찌개', '짜장면', '돈까스', '파스타', '떡볶이', '쌀국수', '순대국', '초밥'] }
  ];

  // 농담은 여기에만 조용히 남긴다
  const QUIPS = [
    '이미 정해져 있었습니다',
    '반대하시는 분이 사면 됩니다',
    '다시 돌려도 비슷합니다',
    '맛없으면 돌림판 탓',
    '오늘은 그런 날입니다',
    '소화 잘 되시길'
  ];

  // 차분한 색만 쓴다. 글씨는 전부 어두운 색이라 어느 칸에서도 읽힌다.
  const COLORS = ['#E9B294', '#F0D79B', '#BFD2A8', '#9DC2CD', '#C4B4D8', '#E8B6B4',
                  '#AFC9AC', '#DCC6A8', '#D3C0B0', '#BAC8D4', '#D8C8B0', '#C9BFD0'];

  const api = { TAU, MAX, POINTER, winnerIndex, encodeList, decodeList, cleanList,
                CATEGORIES, QUIPS, COLORS };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.Wheel = api;
})();
