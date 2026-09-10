// =============================================================
// 結びの図の試験（トップと「経営者の方へ」で同じに見えること）
//
//  守りたいのは三つです。
//
//   ① 二つのページで図が同じであること。
//      片方だけ直して、もう片方が置いていかれるのが一番起きやすい。
//
//   ② 面が枠で切れないこと。
//      SVG は viewBox の外を切り落とします。ぼかしが枠の外で 0 に
//      なる置き方だと、縁に濃さが残ったまま断ち切られ、左右に
//      縦の線が立ちます。枠の内側で溶かしきる必要があります。
//
//   ③ タグが釣り合っていること。
//      余分な </g> があっても画面は出ます。ブラウザが黙って捨てるので
//      気づけません。だから機械で見張ります。
// =============================================================
const fs = require('fs');
const D = __dirname + '/../';

let n = 0, bad = [];
function is(name, got, want) {
  n++;
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) bad.push({ name, got: g, want: w });
}
function ok(name, cond) { is(name, !!cond, true); }

const PAGES = ['index.html', 'owner.html'];
const src = {};
PAGES.forEach(p => { src[p] = fs.readFileSync(D + p, 'utf8'); });
const APP = fs.readFileSync(D + 'app.js', 'utf8');

//  図の中身（<svg class="st-conv"> 〜 </svg>）を取り出す
function conv(s) {
  const a = s.indexOf('<svg class="st-conv"');
  if (a < 0) return null;
  const b = s.indexOf('</svg>', a);
  return s.slice(a, b + 6);
}

// ---------------------------------------------------------------
// ① 二つのページで同じ図か
// ---------------------------------------------------------------
const blocks = PAGES.map(p => conv(src[p]));
PAGES.forEach((p, i) => ok(p + ' に図がある', !!blocks[i]));
is('トップと経営者ページの図が一字一句おなじ', blocks[0] === blocks[1], true);

//  面（点・線・面）が両方に入っていること。数まで合わせる
PAGES.forEach((p, i) => {
  const b = blocks[i] || '';
  ok(p + '：面のまとまりがある', /<g class="st-field"/.test(b));
  ok(p + '：抜き型がある', /id="stFieldMask"/.test(b));
  ok(p + '：ぼかしがある', /id="stFieldVignette"/.test(b));
  ok(p + '：色の帯がある', /id="stFieldGrad"/.test(b));
  ok(p + '：点が置かれている', (b.match(/st-fd-node/g) || []).length > 30);
  ok(p + '：面が置かれている', (b.match(/st-fd-face/g) || []).length > 30);
  ok(p + '：一行そえてある', /st-field-note/.test(src[p]));
});

// ---------------------------------------------------------------
// ② 面が枠で切れないか
// ---------------------------------------------------------------
//  app.js の数字をそのまま取り出して、幾何で確かめる。
//  ここを目で確かめると、直したつもりで直っていない、が起きる
const kM = /var K = narrow \? ([\d.]+) : ([\d.]+);/.exec(APP);
ok('引く量が読み取れる', !!kM);
const rM = /fade\.setAttribute\('r', String\(Math\.round\(900 \* K \/ 2 \* ([\d.]+)\)\)\)/.exec(APP);
ok('ぼかしの半径が「掛け算」で書かれている', !!rM);

//  縦は gradientTransform で 1/3 に潰してある。図の縦横比 3:1 と揃えるため
const sM = /scale\(1,\s*([\d.]+)\)/.exec(blocks[0] || '');
ok('縦の潰し具合が読み取れる', !!sM);

if (kM && rM && sM) {
  const mul = Number(rM[1]);
  const squash = Number(sM[1]);
  [['広い画面', Number(kM[2])], ['狭い画面', Number(kM[1])]].forEach(([label, K]) => {
    const halfW = 900 * K / 2;          // viewBox の半幅
    const halfH = 300 * K / 2;          // viewBox の半高
    const r = Math.round(900 * K / 2 * mul);
    ok(label + '：ぼかしが左右の枠の内側で消える', r < halfW);
    ok(label + '：ぼかしが上下の枠の内側で消える', r * squash < halfH);
    //  縮みすぎてもいけない。図の8割は面で埋まっていてほしい
    ok(label + '：ぼかしが小さくなりすぎていない', r > halfW * 0.85);
  });
}

//  昔の書き方（割り算）に戻っていないこと。戻ると縁がまた切れる
ok('割り算の書き方が残っていない', !/900 \* K \/ 2 \/ [\d.]+/.test(APP));

// ---------------------------------------------------------------
// ③ タグの釣り合い
// ---------------------------------------------------------------
PAGES.forEach((p, i) => {
  const b = blocks[i] || '';
  ['g', 'defs', 'mask', 'linearGradient', 'radialGradient'].forEach(tag => {
    let d = 0, floor = 0;
    const re = new RegExp('<(/?)' + tag + '[\\s>]', 'g');
    let m;
    while ((m = re.exec(b)) !== null) { d += m[1] ? -1 : 1; if (d < floor) floor = d; }
    is(p + '：<' + tag + '> の開きと閉じが合う', d, 0);
    is(p + '：<' + tag + '> の閉じが先に来ていない', floor, 0);
  });
});

// ---------------------------------------------------------------
// ④ 締めの文言
// ---------------------------------------------------------------
PAGES.forEach(p => {
  const m = /<p class="st-conv-close[^>]*>([\s\S]*?)<\/p>/.exec(src[p]);
  ok(p + '：締めの文がある', !!m);
  if (!m) return;
  const plain = m[1].replace(/<[^>]+>/g, '');
  is(p + '：文言', plain,
     '挑む人に、安定と信頼を。意思を継ぐ会社に、強固な基盤を。AIと人の力が、未来を照らす。');
  //  金の下線は <em> で付く。強調は2か所
  is(p + '：強調の数', (m[1].match(/<em>/g) || []).length, 2);
  ok(p + '：スマホ用の改行が残っている', /class="sp-only"/.test(m[1]));
});

// ---------------------------------------------------------------
console.log('試験 ' + n + '件');
if (bad.length) {
  console.log('\n合わないもの ' + bad.length + '件:');
  bad.forEach(b => console.log('  ✗ ' + b.name + '\n      出た: ' + b.got + '\n      欲しい: ' + b.want));
  process.exit(1);
}
console.log('ぜんぶ通りました。');
