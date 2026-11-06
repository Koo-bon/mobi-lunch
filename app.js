(() => {
  const { TAU, MAX, winnerIndex, encodeList, decodeList, cleanList,
          CATEGORIES, QUIPS, COLORS } = Wheel;
  const $ = id => document.getElementById(id);
  const cv = $('cv'), ctx = cv.getContext('2d');
  const FONT = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

  let names = [];
  let rot = 0;            // 돌림판이 돌아간 각도
  let spinning = false;

  // ---------- 저장 (시크릿 모드에서는 조용히 포기) ----------
  const store = {
    get() { try { return decodeList(localStorage.getItem('lunch.list') || ''); } catch { return []; } },
    set(v) { try { localStorage.setItem('lunch.list', encodeList(v)); } catch {} }
  };

  // ---------- 소리: 파일 없이 브라우저가 직접 낸다 ----------
  const Sfx = (() => {
    let ctxA = null, on = true;
    const ac = () => ctxA ??= new (window.AudioContext || window.webkitAudioContext)();
    function beep(freq, at, dur, vol, type = 'square') {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(vol, at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(c.destination);
      o.start(at); o.stop(at + dur + 0.02);
    }
    return {
      get on() { return on; },
      toggle() { on = !on; return on; },
      tick() { if (!on) return; try { beep(880, ac().currentTime, 0.04, 0.09); } catch {} },
      // 당첨: 도-미-솔-도 올라가는 팡파레
      fanfare() {
        if (!on) return;
        try {
          const t = ac().currentTime;
          [523, 659, 784, 1047].forEach((f, i) => beep(f, t + i * 0.1, 0.3, 0.16, 'square'));
        } catch {}
      }
    };
  })();

  // ---------- 돌림판 그리기 ----------
  function resize() {
    const size = Math.min(360, window.innerWidth - 40);
    const dpr = window.devicePixelRatio || 1;
    cv.style.width = size + 'px';
    cv.style.height = size + 'px';
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    const w = parseFloat(cv.style.width) || 420;
    const cx = w / 2, cy = w / 2, r = w / 2 - 8;
    ctx.clearRect(0, 0, w, w);

    // 바깥 테두리
    ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, TAU);
    ctx.fillStyle = '#e4e1da'; ctx.fill();

    if (names.length === 0) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
      ctx.fillStyle = '#f2f0ec'; ctx.fill();
      ctx.fillStyle = '#8b857c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(w * 0.042)}px ${FONT}`;
      ctx.fillText('후보를 먼저 넣어주세요', cx, cy);
      return;
    }

    const n = names.length, slice = TAU / n;
    for (let i = 0; i < n; i++) {
      const a0 = rot + i * slice, a1 = a0 + slice;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();

      // 글씨는 조각 가운데를 따라 바깥쪽으로 눕힌다
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a0 + slice / 2);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const size = Math.max(11, Math.min(22, Math.round(w * 0.055) - Math.max(0, n - 6)));
      ctx.font = `600 ${size}px ${FONT}`;
      ctx.fillStyle = '#2c2a27';
      ctx.fillText(names[i], r - 14, 0);
      ctx.restore();
    }

    // 가운데 축
    ctx.beginPath(); ctx.arc(cx, cy, w * 0.07, 0, TAU);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#e4e1da'; ctx.stroke();
  }

  // ---------- 목록 화면 ----------
  function renderChips() {
    const box = $('chips');
    if (names.length === 0) {
      box.innerHTML = '<span id="empty">아직 후보가 없습니다. 위 버튼을 누르거나 직접 적어주세요.</span>';
    } else {
      box.innerHTML = names.map((v, i) =>
        `<span class="chip" style="background:${COLORS[i % COLORS.length]}">${esc(v)}` +
        `<button type="button" data-i="${i}" aria-label="삭제">×</button></span>`).join('');
      box.querySelectorAll('button').forEach(b =>
        b.addEventListener('click', () => { names.splice(+b.dataset.i, 1); commit(); }));
    }
    $('spin').disabled = spinning || names.length < 2;
  }

  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function commit() {
    names = cleanList(names);
    store.set(names);
    renderChips();
    draw();
  }

  // ---------- 돌리기 ----------
  function spin() {
    if (spinning || names.length < 2) return;
    spinning = true;
    $('spin').disabled = true;

    const from = rot;
    // 6~9바퀴 + 임의 각도. 최종 각도에서 당첨을 읽으므로 보이는 것과 결과가 항상 같다.
    const turns = 6 + Math.random() * 3;
    const to = from + turns * TAU + Math.random() * TAU;
    const dur = 4600;
    const t0 = performance.now();
    let lastIdx = winnerIndex(from, names.length);

    (function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);          // 끝으로 갈수록 천천히
      rot = from + (to - from) * eased;
      draw();

      const idx = winnerIndex(rot, names.length);
      if (idx !== lastIdx) { lastIdx = idx; Sfx.tick(); }

      if (p < 1) return requestAnimationFrame(frame);

      spinning = false;
      $('spin').disabled = names.length < 2;
      const winner = names[winnerIndex(rot, names.length)];
      $('win').textContent = winner;
      $('quip').textContent = QUIPS[Math.floor(Math.random() * QUIPS.length)];
      $('modal').classList.add('on');
      Sfx.fanfare();
    })(t0);
  }

  // ---------- 조작 연결 ----------
  $('cats').innerHTML = CATEGORIES.map((c, i) =>
    `<button class="cat" type="button" data-i="${i}">${c.name}</button>`).join('');
  $('cats').querySelectorAll('.cat').forEach(b =>
    b.addEventListener('click', () => { names = CATEGORIES[+b.dataset.i].items.slice(); commit(); }));

  $('form').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('name').value.trim();
    if (!v) return;
    if (names.length >= MAX) return toast(`후보는 ${MAX}개까지만!`);
    if (names.includes(v)) return toast('이미 있습니다');
    names.push(v);
    $('name').value = '';
    commit();
  });

  $('spin').addEventListener('click', spin);
  $('again').addEventListener('click', () => { $('modal').classList.remove('on'); spin(); });
  $('close').addEventListener('click', () => $('modal').classList.remove('on'));
  $('clear').addEventListener('click', () => { names = []; commit(); });

  $('sound').addEventListener('click', () => {
    const on = Sfx.toggle();
    $('sound').textContent = on ? '소리 끄기' : '소리 켜기';
  });

  $('share').addEventListener('click', async () => {
    if (names.length === 0) return toast('후보를 먼저 넣어주세요');
    const url = location.origin + location.pathname + '#l=' + encodeList(names);
    try {
      await navigator.clipboard.writeText(url);
      toast('링크 복사됨! 단톡방에 붙여넣기');
    } catch {
      location.hash = 'l=' + encodeList(names);
      toast('주소창의 링크를 복사해 주세요');
    }
  });

  let toastTimer = null;
  function toast(msg) {
    $('toast').textContent = msg;
    $('toast').classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('on'), 1900);
  }

  window.addEventListener('resize', resize);

  // ---------- 시작 ----------
  // 링크로 받은 목록이 가장 우선, 없으면 지난번 목록, 그것도 없으면 기본 추천
  const fromLink = decodeList(location.hash);
  names = fromLink.length ? fromLink
        : (store.get().length ? store.get() : CATEGORIES[CATEGORIES.length - 1].items.slice());
  commit();
  resize();
})();
