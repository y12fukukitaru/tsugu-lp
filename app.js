/* =====================================================
   Tsugu Ai -継- LP 共通スクリプト
   index.html / partner.html の両方から読み込まれる
   ===================================================== */

// ===== モバイルメニュー =====
(function () {
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  var closeBtn = document.getElementById('mobileMenuClose');
  var overlay = document.getElementById('mobileMenuOverlay');
  if (!toggle || !menu) return;

  function closeMenu() {
    toggle.classList.remove('is-open');
    menu.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
  }
  function openMenu() {
    toggle.classList.add('is-open');
    menu.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    document.body.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
  }
  toggle.addEventListener('click', function () {
    menu.classList.contains('is-open') ? closeMenu() : openMenu();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);
  menu.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
  });
})();

// ===== お問い合わせフォーム送信 =====
async function handleSubmit(e) {
  e.preventDefault();
  var form = e.target;
  var submitBtn = form.querySelector('.form-submit');
  var original = submitBtn.textContent;
  submitBtn.textContent = '送信中...';
  submitBtn.disabled = true;
  try {
    var response = await fetch('https://formspree.io/f/mrejeqej', {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    });
    if (response.ok) {
      form.style.display = 'none';
      document.getElementById('form-success').style.display = 'flex';
      document.getElementById('form-success').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert('送信に失敗しました。入力内容をご確認ください。');
      submitBtn.textContent = original;
      submitBtn.disabled = false;
    }
  } catch (err) {
    alert('通信エラーが発生しました。インターネット接続をご確認ください。');
    submitBtn.textContent = original;
    submitBtn.disabled = false;
  }
}

// ===== ナビの背景切り替え =====
(function () {
  var nav = document.getElementById('main-nav');
  if (!nav) return;
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
})();

// ===== スクロール表示アニメーション（フェイルセーフ付き） =====
(function () {
  var els = document.querySelectorAll('.reveal');
  function revealAll() { els.forEach(function (el) { el.classList.add('revealed'); }); }
  if (!('IntersectionObserver' in window)) { revealAll(); return; }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add('revealed');
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (el) { observer.observe(el); });

  // iframe埋め込み等で監視が発火しない場合に備え、読み込み後に全表示
  function failSafe() { setTimeout(revealAll, 2500); }
  if (document.readyState === 'complete') failSafe();
  else window.addEventListener('load', failSafe);
})();

// ===== 数字のカウントアップ =====
(function () {
  var els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  function animate(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = (el.getAttribute('data-decimals') | 0);
    var dur = 1600;
    var start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
    return;
  }
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); }
    });
  }, { threshold: 0.4 });
  els.forEach(function (el) { obs.observe(el); });
})();

// ===== 結びのSVG描画 =====
(function () {
  var svg = document.getElementById('convSvg');
  if (!svg) return;
  if (!('IntersectionObserver' in window)) { svg.classList.add('drawn'); return; }
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { svg.classList.add('drawn'); obs.disconnect(); }
    });
  }, { threshold: 0.3 });
  obs.observe(svg);

  // フェイルセーフ：iframe埋め込み等で監視が発火しない場合に備え、
  // スクロール時にも画面内に入ったかを自前で判定する。
  // （時間経過だけで発火させると、利用者が図に到達する前に
  //   アニメーションが終わってしまうため条件付きにする）
  function checkInView() {
    if (svg.classList.contains('drawn')) return;
    var r = svg.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.85 && r.bottom > 0) {
      svg.classList.add('drawn');
      obs.disconnect();
      window.removeEventListener('scroll', checkInView);
    }
  }
  window.addEventListener('scroll', checkInView, { passive: true });
})();

// ===== 糸ナビ：進捗と現在章 =====
(function () {
  var progress = document.getElementById('threadProgress');
  if (!progress) return;
  var knots = document.querySelectorAll('.st-knots a');
  var sections = [].slice.call(knots)
    .map(function (a) { return document.getElementById(a.getAttribute('data-knot')); })
    .filter(Boolean);
  if (!sections.length) return;

  function update() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    progress.style.height = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    document.body.classList.toggle('st-hero-on', window.scrollY < window.innerHeight * 0.7);

    var current = sections[0];
    sections.forEach(function (sec) {
      if (sec.getBoundingClientRect().top <= window.innerHeight * 0.45) current = sec;
    });
    knots.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-knot') === current.id);
    });
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// ===== 追従CTAバー：ヒーローを過ぎたら表示、フォーム到達で隠す =====
(function () {
  var bar = document.querySelector('.sticky-cta');
  if (!bar) return;
  var contact = document.getElementById('contact');
  function update() {
    var pastHero = window.scrollY > window.innerHeight * 0.75;
    var atForm = contact
      ? contact.getBoundingClientRect().top < window.innerHeight * 0.9
      : false;
    bar.classList.toggle('is-visible', pastHero && !atForm);
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// ===== 相談種別の事前選択（パートナー向けCTA・ページ既定値） =====
(function () {
  function select(value) {
    var radio = document.querySelector('input[name="inquiry_type"][value="' + value + '"]');
    if (radio) radio.checked = true;
  }
  // パートナー向けCTAを押したとき
  document.querySelectorAll('.js-partner-cta').forEach(function (btn) {
    btn.addEventListener('click', function () { select('認定パートナーへの参加'); });
  });
  // 法人（エンタープライズ・パートナー）向けCTAを押したとき
  document.querySelectorAll('.js-enterprise-cta').forEach(function (btn) {
    btn.addEventListener('click', function () { select('法人でのご参加（エンタープライズ・パートナー）'); });
  });
  // ページ全体の既定値（partner.html で data-default-inquiry を指定）
  var def = document.body.getAttribute('data-default-inquiry');
  if (def) select(def);
})();

// ===== 事業承継リスク診断（ソフトCV） =====
(function () {
  var card = document.getElementById('riskCheck');
  if (!card) return;
  var questions = card.querySelectorAll('.check-q');
  var result = card.querySelector('.check-result');
  var scoreEl = card.querySelector('.check-result-score');
  var textEl = card.querySelector('.check-result-text');

  var messages = [
    {
      max: 0,
      score: '診断結果：現時点でのリスクは低い状態です',
      text: '承継の備えは整っています。この状態を維持し、さらに会社を伸ばす段階です。Tsugu Ai -継- は、次の成長やグループ化まで含めてご一緒できます。現状の確認だけでも、お気軽にご相談ください。'
    },
    {
      max: 2,
      score: '診断結果：いくつか空白が残っています',
      text: 'いま大きな問題は起きていなくても、空白のまま数年が過ぎると選択肢は確実に狭まります。早い段階なら、打てる手はまだ豊富です。何から手をつけるべきか、無料相談で一緒に整理しましょう。'
    },
    {
      max: 5,
      score: '診断結果：早めの着手をおすすめします',
      text: '後継者・株式・資金繰りのいずれかに空白がある状態です。黒字のまま廃業を選ぶ会社の多くが、この段階で相談先を持てないまま時間を失っています。まずは現状を言葉にするところから、伴走させてください。'
    }
  ];

  questions.forEach(function (q) {
    q.querySelectorAll('.check-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        q.querySelectorAll('.check-btn').forEach(function (b) { b.classList.remove('on'); });
        btn.classList.add('on');
        q.setAttribute('data-answer', btn.getAttribute('data-value'));
        evaluate();
      });
    });
  });

  function evaluate() {
    var answered = 0, risk = 0;
    questions.forEach(function (q) {
      var a = q.getAttribute('data-answer');
      if (a === null) return;
      answered++;
      if (a === 'risk') risk++;
    });
    if (answered < questions.length) return;

    var m = messages.find(function (x) { return risk <= x.max; }) || messages[messages.length - 1];
    scoreEl.textContent = m.score;
    textEl.textContent = m.text;
    result.classList.add('show');
  }
})();

// ===== 年内登録特典：申込期限までの残日数 =====
// 期限を過ぎたら自動的に非表示になるため、あとから消し忘れる心配がない。
(function () {
  var el = document.getElementById('offerCountdown');
  if (!el) return;
  // 日付どうしの差で数える（時刻の影響を受けないようにする）
  var deadline = new Date(2026, 11, 31);            // 2026-12-31（この日まで受付）
  var n = new Date();
  var today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  var days = Math.round((deadline - today) / 86400000);
  if (days < 0) return;               // 期限切れ：何も表示しない
  if (days === 0) {
    el.innerHTML = 'お申し込みは<strong>本日まで</strong>です';
  } else {
    el.innerHTML = 'お申し込み期限まで、あと<strong>' + days + '</strong>日';
  }
  el.hidden = false;
})();

// ===== 経営者ページ：立場の選択（買い手／売り手） =====
// 選んだ側のストーリーだけを表示する。URLに #grow / #succeed が付いていれば
// その立場で開く。トップページから「買い手の話を読む」で飛んできたときに使う。
(function () {
  var picker = document.querySelector('.stance-picker');
  if (!picker) return;
  var btns = picker.querySelectorAll('.stance-btn');
  var panes = document.querySelectorAll('[data-stance-pane]');

  function apply(stance, scroll) {
    btns.forEach(function (b) {
      var on = b.getAttribute('data-stance') === stance;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panes.forEach(function (p) {
      var on = p.getAttribute('data-stance-pane') === stance;
      p.hidden = !on;
      // 表示に切り替わった側は、出現アニメーションを効かせ直す
      if (on) p.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('revealed'); });
    });
    if (scroll) {
      var shown = document.querySelector('[data-stance-pane="' + stance + '"]:not([hidden])');
      if (shown) {
        window.scrollTo({
          top: shown.getBoundingClientRect().top + window.scrollY - 70,
          behavior: 'smooth'
        });
      }
    }
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () { apply(b.getAttribute('data-stance'), true); });
  });

  var hash = (location.hash || '').replace('#', '');
  if (hash === 'grow' || hash === 'succeed') apply(hash, false);
})();

// ===== ページ内アンカーのスムーススクロール =====
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - 80,
      behavior: 'smooth'
    });
  });
});
