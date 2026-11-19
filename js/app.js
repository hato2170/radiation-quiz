/* ============================================================
   放射線技師クイズ — アプリ本体
   ・出題（カテゴリ／難易度／ランダム／今日の10問／復習）
   ・正誤と解説の表示
   ・localStorage への進捗保存（正答率・解いた数・間違えた問題・続き）
   ============================================================ */
(function () {
  'use strict';

  var DB = window.QUIZ_DATA;
  var CAT = {};
  var DIFF = {};
  var BY_ID = {};
  DB.categories.forEach(function (c) { CAT[c.id] = c; });
  DB.difficulties.forEach(function (d) { DIFF[d.id] = d; });
  DB.questions.forEach(function (q) { BY_ID[q.id] = q; });

  var KEY = 'radiation_quiz_v1';
  var GOAL = 10;
  var LETTERS = ['A', 'B', 'C', 'D'];

  var state = loadState();
  var quiz = null;
  var lastConfig = null;

  function $(id) { return document.getElementById(id); }

  /* ---------------- 保存まわり ---------------- */
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function defaultState() {
    return { v: 1, perQ: {}, today: { date: todayKey(), answered: 0, correct: 0 }, session: null };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return defaultState();
      s.v = 1;
      s.perQ = s.perQ || {};
      s.today = s.today || { date: todayKey(), answered: 0, correct: 0 };
      if (s.today.date !== todayKey()) s.today = { date: todayKey(), answered: 0, correct: 0 };
      s.session = s.session || null;
      return s;
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 容量不足などは無視 */ }
  }

  function ensureToday() {
    if (state.today.date !== todayKey()) {
      state.today = { date: todayKey(), answered: 0, correct: 0 };
      save();
    }
  }

  function stat(id) {
    if (!state.perQ[id]) state.perQ[id] = { seen: 0, correct: 0, last: null };
    return state.perQ[id];
  }

  function totals() {
    var a = 0, c = 0;
    for (var id in state.perQ) {
      if (!Object.prototype.hasOwnProperty.call(state.perQ, id)) continue;
      if (!BY_ID[id]) continue;
      a += state.perQ[id].seen || 0;
      c += state.perQ[id].correct || 0;
    }
    return { answered: a, correct: c };
  }

  function solvedCount() {
    return DB.questions.filter(function (q) {
      return state.perQ[q.id] && state.perQ[q.id].seen > 0;
    }).length;
  }

  function wrongIds() {
    return DB.questions.filter(function (q) {
      return state.perQ[q.id] && state.perQ[q.id].last === 'wrong';
    }).map(function (q) { return q.id; });
  }

  function pct(a, b) { return b > 0 ? Math.round(a / b * 100) + '%' : '—'; }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function show(name) {
    ['home', 'quiz', 'result'].forEach(function (n) {
      $('screen-' + n).hidden = (n !== name);
    });
  }

  /* ---------------- ホーム ---------------- */
  function renderHome() {
    ensureToday();
    var t = state.today;
    $('goalNow').textContent = String(Math.min(t.answered, GOAL));
    $('goalMax').textContent = String(GOAL);
    $('goalBar').style.width = Math.min(100, t.answered / GOAL * 100) + '%';
    $('statTodayAcc').textContent = t.answered ? pct(t.correct, t.answered) : '—';

    var all = totals();
    $('statAllAcc').textContent = all.answered ? pct(all.correct, all.answered) : '—';
    $('statSolved').innerHTML = solvedCount() + '<span class="unit">/' + DB.questions.length + '</span>';

    var s = state.session;
    var resume = $('resumeCard');
    if (s && s.ids && s.ids.length) {
      resume.hidden = false;
      $('resumeTitle').textContent = s.label || '前回の続き';
      $('resumePos').textContent = (s.pos >= s.ids.length)
        ? '結果を見る'
        : (s.pos + 1) + ' / ' + s.ids.length + '問目';
    } else {
      resume.hidden = true;
    }

    var w = wrongIds();
    $('reviewCount').textContent = String(w.length);
    $('btnReview').disabled = w.length === 0;

    var catHtml = '';
    DB.categories.forEach(function (c) {
      var qs = DB.questions.filter(function (q) { return q.cat === c.id; });
      var a = 0, c2 = 0, done = 0;
      qs.forEach(function (q) {
        var st = state.perQ[q.id];
        if (!st) return;
        a += st.seen || 0;
        c2 += st.correct || 0;
        if (st.seen > 0) done += 1;
      });
      catHtml += '<button type="button" class="row" data-cat="' + c.id + '">' +
        '<span class="row-main">' +
          '<span class="row-name">' + c.name + '</span>' +
          '<span class="row-meta">解いた ' + done + '/' + qs.length +
          ' ・ 正答率 ' + (a ? pct(c2, a) : '—') + '</span>' +
        '</span>' +
        '<span class="mini-bar"><i style="width:' + (a ? Math.round(c2 / a * 100) : 0) + '%"></i></span>' +
        '<span class="chev">›</span>' +
      '</button>';
    });
    $('catList').innerHTML = catHtml;

    var diffHtml = '';
    DB.difficulties.forEach(function (d) {
      var n = DB.questions.filter(function (q) { return q.diff === d.id; }).length;
      diffHtml += '<button type="button" class="diff-btn" data-diff="' + d.id + '">' +
        '<b>' + d.name + '</b><span>' + n + '問</span></button>';
    });
    $('diffList').innerHTML = diffHtml;
  }

  /* ---------------- 出題 ---------------- */
  function startQuiz(ids, mode, label) {
    if (!ids || !ids.length) return;
    lastConfig = { ids: ids.slice(), mode: mode, label: label };
    quiz = {
      ids: ids, pos: 0, correct: 0, mode: mode, label: label,
      answered: false, selected: -1
    };
    state.session = { ids: ids, pos: 0, mode: mode, label: label, correct: 0 };
    save();
    show('quiz');
    renderQuestion();
    window.scrollTo(0, 0);
  }

  function resumeQuiz() {
    var s = state.session;
    if (!s || !s.ids || !s.ids.length) return;
    lastConfig = { ids: s.ids.slice(), mode: s.mode, label: s.label };
    quiz = {
      ids: s.ids,
      pos: Math.min(s.pos || 0, s.ids.length - 1),
      correct: s.correct || 0,
      mode: s.mode,
      label: s.label,
      answered: false,
      selected: -1
    };
    if ((s.pos || 0) >= s.ids.length) {
      quiz.pos = s.ids.length - 1;
      showResult();
      return;
    }
    show('quiz');
    renderQuestion();
    window.scrollTo(0, 0);
  }

  function renderQuestion() {
    var q = BY_ID[quiz.ids[quiz.pos]];
    quiz.answered = false;
    quiz.selected = -1;

    $('quizLabel').textContent = quiz.label;
    $('quizCount').textContent = (quiz.pos + 1) + ' / ' + quiz.ids.length;
    $('quizScore').textContent = '正解 ' + quiz.correct;
    $('quizBar').style.width = (quiz.pos / quiz.ids.length * 100) + '%';
    $('tagCat').textContent = CAT[q.cat].name;
    $('tagDiff').textContent = DIFF[q.diff].name;
    $('qText').textContent = q.q;

    var box = $('choices');
    box.innerHTML = '';
    q.choices.forEach(function (text, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.setAttribute('data-i', String(i));

      var mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = LETTERS[i];

      var label = document.createElement('span');
      label.className = 'label';
      label.textContent = text;

      b.appendChild(mark);
      b.appendChild(label);
      b.addEventListener('click', function () { answer(i); });
      box.appendChild(b);
    });

    $('feedback').hidden = true;
    $('expText').textContent = '';
    $('pointText').textContent = '';
    $('pointRow').hidden = true;
    $('btnNext').textContent = '次の問題へ';
  }

  function answer(i) {
    if (!quiz || quiz.answered) return;
    quiz.answered = true;
    quiz.selected = i;

    ensureToday();
    var q = BY_ID[quiz.ids[quiz.pos]];
    var ok = (i === q.answer);

    var st = stat(q.id);
    st.seen += 1;
    if (ok) st.correct += 1;
    st.last = ok ? 'correct' : 'wrong';
    state.today.answered += 1;
    if (ok) state.today.correct += 1;
    if (ok) quiz.correct += 1;

    var btns = $('choices').querySelectorAll('.choice');
    for (var k = 0; k < btns.length; k++) {
      var b = btns[k];
      b.disabled = true;
      if (k === q.answer) b.classList.add('correct');
      else if (k === i) b.classList.add('wrong');
      else b.classList.add('dim');
    }

    var v = $('verdict');
    v.className = 'verdict ' + (ok ? 'ok' : 'ng');
    v.innerHTML = '<span class="badge-ico">' + (ok ? '✓' : '×') + '</span>';
    var txt = document.createElement('span');
    txt.textContent = ok ? '正解！' : '不正解 — 正解は「' + q.choices[q.answer] + '」';
    v.appendChild(txt);

    $('expText').textContent = q.exp;
    if (q.point) {
      $('pointText').textContent = q.point;
      $('pointRow').hidden = false;
    } else {
      $('pointRow').hidden = true;
    }

    $('feedback').hidden = false;
    $('quizScore').textContent = '正解 ' + quiz.correct;
    $('quizBar').style.width = ((quiz.pos + 1) / quiz.ids.length * 100) + '%';

    var isLast = (quiz.pos === quiz.ids.length - 1);
    $('btnNext').textContent = isLast ? '結果を見る' : '次の問題へ';
    $('btnNext').classList.toggle('is-last', isLast);

    state.session = {
      ids: quiz.ids,
      pos: quiz.pos + 1,
      mode: quiz.mode,
      label: quiz.label,
      correct: quiz.correct
    };
    save();

    setTimeout(function () {
      var f = $('feedback');
      if (f && typeof f.scrollIntoView === 'function') {
        f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);
  }

  function next() {
    if (!quiz || !quiz.answered) return;
    if (quiz.pos + 1 >= quiz.ids.length) {
      showResult();
      return;
    }
    quiz.pos += 1;
    renderQuestion();
    window.scrollTo(0, 0);
  }

  /* ---------------- 結果 ---------------- */
  function resultMessage(acc, total) {
    if (total === 0) return '';
    if (acc === 100) return '全問正解です。この調子で、解説の「なぜ」まで說明できるか確かめてみましょう。';
    if (acc >= 80) return 'よくできています。間違えた問題は、解説を読んで理由まで押さえると定着します。';
    if (acc >= 50) return '半分は取れています。間違えた問題を復習モードで解き直すと、次の正答率が上がります。';
    return 'まずは解説を読んで「なぜそうなるか」をつかみましょう。復習モードでもう一度解くと効果的です。';
  }

  function showResult() {
    var total = quiz.ids.length;
    var acc = total ? Math.round(quiz.correct / total * 100) : 0;

    $('resultLabel').textContent = quiz.label;
    $('resultScore').textContent = String(quiz.correct);
    $('resultTotal').textContent = '/ ' + total;
    $('resultBar').style.width = acc + '%';
    $('resultAcc').textContent = acc + '%';
    $('resultWrong').textContent = (total - quiz.correct) + '問';
    $('resultMsg').textContent = resultMessage(acc, total);

    var w = wrongIds();
    $('btnResultReview').textContent = w.length
      ? '間違えた問題を復習する（' + w.length + '）'
      : '間違えた問題はありません';
    $('btnResultReview').disabled = (w.length === 0);

    state.session = null;
    save();

    show('result');
    window.scrollTo(0, 0);
  }

  /* ---------------- 開始メニュー ---------------- */
  function pickDaily(n) {
    var pool = DB.questions.map(function (q) {
      var st = state.perQ[q.id];
      return { id: q.id, seen: st ? st.seen : 0, r: Math.random() };
    });
    pool.sort(function (a, b) {
      if (a.seen !== b.seen) return a.seen - b.seen;
      return a.r - b.r;
    });
    return pool.slice(0, n).map(function (x) { return x.id; });
  }

  function startDaily() {
    startQuiz(shuffle(pickDaily(Math.min(GOAL, DB.questions.length))), 'daily', '今日の10問');
  }

  function startRandom() {
    var n = Math.min(20, DB.questions.length);
    startQuiz(shuffle(DB.questions.map(function (q) { return q.id; })).slice(0, n),
      'random', 'ランダム' + n + '問');
  }

  function startReview() {
    var ids = shuffle(wrongIds());
    if (!ids.length) return;
    startQuiz(ids, 'review', '復習モード');
  }

  function startCategory(id) {
    var ids = shuffle(DB.questions.filter(function (q) { return q.cat === id; })
      .map(function (q) { return q.id; }));
    startQuiz(ids, 'category', 'カテゴリ：' + CAT[id].name);
  }

  function startDifficulty(id) {
    var ids = shuffle(DB.questions.filter(function (q) { return q.diff === id; })
      .map(function (q) { return q.id; }));
    startQuiz(ids, 'difficulty', '難易度：' + DIFF[id].name);
  }

  /* ---------------- イベント ---------------- */
  function bind() {
    $('btnDaily').addEventListener('click', startDaily);
    $('btnRandom').addEventListener('click', startRandom);
    $('btnReview').addEventListener('click', startReview);
    $('resumeCard').addEventListener('click', resumeQuiz);

    $('catList').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-cat]') : null;
      if (!btn) return;
      startCategory(btn.getAttribute('data-cat'));
    });

    $('diffList').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-diff]') : null;
      if (!btn) return;
      startDifficulty(btn.getAttribute('data-diff'));
    });

    $('btnQuit').addEventListener('click', function () {
      show('home');
      renderHome();
      window.scrollTo(0, 0);
    });

    $('btnNext').addEventListener('click', next);

    $('btnResultHome').addEventListener('click', function () {
      show('home');
      renderHome();
      window.scrollTo(0, 0);
    });

    $('btnResultReview').addEventListener('click', startReview);

    $('btnResultAgain').addEventListener('click', function () {
      if (!lastConfig) return;
      startQuiz(shuffle(lastConfig.ids), lastConfig.mode, lastConfig.label);
    });

    $('btnReset').addEventListener('click', function () {
      if (!window.confirm('学習の記録（正答率・復習リスト・続き）をすべて消します。よろしいですか？')) return;
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      state = defaultState();
      save();
      renderHome();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && !$('screen-home').hidden) renderHome();
    });
  }

  /* ---------------- 起動 ---------------- */
  bind();
  renderHome();
  show('home');
})();
