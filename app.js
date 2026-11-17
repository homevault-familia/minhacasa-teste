/* MinhaCasa (antigo MinhaCasa) — app.js
 * Mesmo desenho e mesmas regras do "Gastos da Casa", com categorias e subcategorias
 * definidas por cada família. Dados criptografados no aparelho (AES-GCM 256, chave
 * derivada da senha da casa com PBKDF2-SHA256) antes de irem ao Firebase.
 */
(function () {
'use strict';

var VERSAO = '2.29.5';
var PBKDF2_ITER = 310000;
var VERIF_TEXTO = 'HOMEVAULT-OK';
var PARC = 'parcelados';
// Parcelados desligados (pedido em 13/11/2026). Para religar, troque para true.
var COM_PARCELADOS = false;
var PALETA = ['#e53935', '#fb8c00', '#43a047', '#0284c7', '#00897b', '#d81b60', '#6d4c41', '#3949ab', '#f4511e', '#8e24aa', '#546e7a', '#c0a000'];
var ICO_P = {"edit": "<path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z\"/>", "trash": "<path d=\"M3 6h18\"/><path d=\"M8 6V4h8v2\"/><path d=\"M19 6l-1 14H6L5 6\"/><path d=\"M10 11v6M14 11v6\"/>", "check": "<path d=\"M20 6 9 17l-5-5\"/>", "file": "<path d=\"M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"/><path d=\"M14 3v6h6\"/>", "sliders": "<path d=\"M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6\"/>", "lock": "<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>", "download": "<path d=\"M12 3v12M7 10l5 5 5-5M4 21h16\"/>", "upload": "<path d=\"M12 15V3M7 8l5-5 5 5M4 21h16\"/>", "table": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 10h18M9 4v16\"/>", "plus": "<path d=\"M12 5v14M5 12h14\"/>", "logout": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><path d=\"M16 17l5-5-5-5M21 12H9\"/>", "calendar": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M16 2v4M8 2v4M3 10h18\"/>", "pie": "<path d=\"M21 12A9 9 0 1 1 12 3v9z\"/><path d=\"M21 12a9 9 0 0 0-9-9\"/>", "trend": "<path d=\"M3 17l6-6 4 4 8-8\"/><path d=\"M15 7h6v6\"/>", "key": "<circle cx=\"7.5\" cy=\"15.5\" r=\"4.5\"/><path d=\"m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2.5 2.5\"/>", "compass": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m15.5 8.5-2 5-5 2 2-5z\"/>"};
function ICO(n) { return '<svg class="ic" aria-hidden="true" viewBox="0 0 24 24">' + ICO_P[n] + '</svg>'; }
var EMOJIS = ['🚗', '⛽', '🛒', '🛍️', '🏠', '💡', '✈️', '🍽️', '☕', '🩺', '💊', '🐾', '👕', '📚', '🎓', '🎉', '🎮', '💳', '🏦', '📱', '🔧', '👶', '🏋️', '💇', '🎁', '🍺', '🧾', '📦', '⚽', '🏖️'];
var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
var MESES_C = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ═════════════════════════ utilitários ═════════════════════════
function $(id) { return document.getElementById(id); }
function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
var ALFA = 'abcdefghijkmnpqrstuvwxyz23456789';
function rid(n) {
  var b = new Uint8Array(n), s = '';
  crypto.getRandomValues(b);
  for (var i = 0; i < n; i++) s += ALFA[b[i] % ALFA.length];
  return s;
}
function isoDe(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function hoje() { return isoDe(new Date()); }
function mesAtual() { return hoje().slice(0, 7); }
function dataObj(s) { return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), 12); }
function proxDia(s) { var d = dataObj(s); d.setDate(d.getDate() + 1); return isoDe(d); }
function diasEntre(a, b) { return Math.round((dataObj(b) - dataObj(a)) / 86400000); }
function ultimoDiaMes(ym) { return isoDe(new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0)); }
function addMeses(dataStr, meses) {
  var ano = +dataStr.slice(0, 4), mes = +dataStr.slice(5, 7) - 1, dia = +dataStr.slice(8, 10);
  var nm = mes + meses, na = ano + Math.floor(nm / 12);
  nm = ((nm % 12) + 12) % 12;
  dia = Math.min(dia, new Date(na, nm + 1, 0).getDate());
  return na + '-' + String(nm + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
}
function formatarData(s) { return s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : ''; }
function nomeMes(k) { return MESES[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4); }
var SIMB = { CAD: 'CA$', USD: 'US$', BRL: 'R$', EUR: '€' };
function moeda() { return (S.cfg && S.cfg.moeda) || 'CAD'; }
function formatar(n) {
  n = +n || 0;
  var neg = n < 0; n = Math.abs(n);
  var br = moeda() === 'BRL' || moeda() === 'EUR';
  var s = n.toFixed(2), int = s.slice(0, -3), dec = s.slice(-2);
  int = int.replace(/\B(?=(\d{3})+(?!\d))/g, br ? '.' : ',');
  return (neg ? '-' : '') + SIMB[moeda()] + ' ' + int + (br ? ',' : '.') + dec;
}
// Aceita "12,50", "12.50", "1.234,56", "1,234.56", "1.500", "R$ 7,5" → número (2 casas).
// Recusa (NaN): negativo, letras, mais de 2 casas decimais, milhar mal formado e valores acima de 10 milhões (14/11/2026).
var VALOR_MAX = 10000000;
function lerValor(txt) {
  var s = String(txt == null ? '' : txt).trim().replace(/^(CA\$|US\$|R\$|\$|€)\s*/i, '').replace(/\s+/g, '');
  if (!s || /[^\d.,]/.test(s)) return NaN;
  var ult = Math.max(s.lastIndexOf(','), s.lastIndexOf('.')), intp = s, decp = '';
  var temDois = s.indexOf(',') >= 0 && s.indexOf('.') >= 0, sep = ult >= 0 ? s.charAt(ult) : '';
  var nSep = sep ? s.split(sep).length - 1 : 0;
  if (ult >= 0) {
    var depois = s.slice(ult + 1);
    if (temDois || (nSep === 1 && depois.length !== 3)) { intp = s.slice(0, ult); decp = depois; if (decp.length > 2 || !decp.length) return NaN; }
    else { intp = s; decp = ''; }
  }
  var grupos = intp.split(/[.,]/);
  if (grupos.length > 1) {
    if (!/^\d{1,3}$/.test(grupos[0]) || /^0/.test(grupos[0])) return NaN;
    for (var g = 1; g < grupos.length; g++) if (!/^\d{3}$/.test(grupos[g])) return NaN;
  }
  var n = parseFloat(grupos.join('') + (decp ? '.' + decp : ''));
  if (!isFinite(n) || n > VALOR_MAX) return NaN;
  return Math.round(n * 100) / 100;
}
function numTxt(v) { return v ? String(v).replace('.', moeda() === 'BRL' || moeda() === 'EUR' ? ',' : '.') : ''; }
var _tmr = null;
function mostrarToast(ic, msg, ms) {
  $('ti').textContent = ic; $('tm').textContent = msg;
  var t = $('toast'); t.classList.add('visivel');
  clearTimeout(_tmr); _tmr = setTimeout(function () { t.classList.remove('visivel'); }, ms || 2400);
}
function alfa(cor, a) { return cor + a; } // cor "#rrggbb" + alfa hex "22"

// ═════════════════════════ criptografia ═════════════════════════
var enc = new TextEncoder(), dec = new TextDecoder();
function b64(buf) {
  var bytes = new Uint8Array(buf), s = '';
  for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(str) { var s = atob(str), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
function derivarChave(senha, saltB64) {
  return crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveKey']).then(function (base) {
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: PBKDF2_ITER, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  });
}
function cifrar(chave, obj) {
  var iv = crypto.getRandomValues(new Uint8Array(12));
  return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, chave, enc.encode(JSON.stringify(obj)))
    .then(function (ct) { return { iv: b64(iv), d: b64(ct) }; });
}
// Prova da senha da casa (14/11/2026): valor que só quem tem a chave consegue calcular.
// As regras do Firebase exigem convite + ':' + prova para entrar, então o link sozinho não basta.
// AES-GCM com IV fixo só neste texto constante: o resultado é sempre o mesmo e não revela a chave.
function provaDaChave(chave) {
  return crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(12) }, chave, enc.encode('minhacasa:prova:v1'))
    .then(function (ct) { return crypto.subtle.digest('SHA-256', ct); })
    .then(function (h) { return Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); });
}
function decifrar(chave, pac) {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(pac.iv) }, chave, unb64(pac.d))
    .then(function (pt) { return JSON.parse(dec.decode(pt)); });
}
var IDB = {
  abrir: function () {
    return new Promise(function (ok, erro) {
      var r = indexedDB.open('homevault', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('chaves'); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { erro(r.error); };
    });
  },
  op: function (modo, fn) {
    return IDB.abrir().then(function (db) {
      return new Promise(function (ok, erro) {
        var tx = db.transaction('chaves', modo), req = fn(tx.objectStore('chaves'));
        tx.oncomplete = function () { ok(req && req.result); };
        tx.onerror = function () { erro(tx.error); };
      });
    });
  },
  get: function (k) { return IDB.op('readonly', function (s) { return s.get(k); }).catch(function () { return null; }); },
  set: function (k, v) { return IDB.op('readwrite', function (s) { return s.put(v, k); }).catch(function () {}); },
  del: function (k) { return IDB.op('readwrite', function (s) { return s.delete(k); }).catch(function () {}); }
};

// ═════════════════════════ estado ═════════════════════════
var S = {
  user: null, casa: null, chave: null, meta: null,
  cfg: null, raw: {}, perfis: {}, membros: {}, refs: [],
  tela: 'inicio', per: { hist: 'periodo', rel: 'periodo', relcat: 'periodo', proj: 'periodo' },
  mesHist: mesAtual(), rcCat: null,
  add: { cat: null, sub: null, nParc: 1, parcIni: 1, editId: null }
};
var db, auth;

// ═════════════════════════ categorias ═════════════════════════
function catsPadrao() {
  function c(emoji, nome, cor, subs) { return { id: rid(8), emoji: emoji, nome: nome, cor: cor, orc: 0, subs: subs.map(function (n) { return { id: rid(8), nome: n }; }) }; }
  return [
    c('🚗', 'Carro', '#e53935', ['Combustível', 'Manutenção', 'Seguro', 'Estacionamento', 'Outros']),
    c('🛒', 'Supermercado', '#43a047', ['Supermercado', 'Feira', 'Padaria', 'Farmácia']),
    c('🛍️', 'Diversos', '#fb8c00', ['Roupas', 'Restaurantes', 'Lazer', 'Assinaturas', 'Saúde', 'Pets', 'Outros']),
    c('🏠', 'Casa', '#00897b', ['Aluguel / Financiamento', 'Luz', 'Água', 'Internet / Telefone', 'Manutenção']),
    c('✈️', 'Viagens', '#0284c7', ['Hospedagem', 'Alimentação', 'Transporte', 'Passeios'])
  ];
}
function periodoMesAtual() { var m = mesAtual(); return { inicio: m + '-01', fim: ultimoDiaMes(m) }; }
// Garante o formato v2 (também converte casas criadas na versão 1)
function normalizarCfg(c) {
  var mudou = false;
  c = c || {};
  if (c.v !== 2) {
    c.cats = (c.cats || []).filter(function (x) { return x.tipo !== 'receita'; }).map(function (x, i) {
      return { id: x.id, emoji: x.emoji || '📦', nome: x.nome, cor: x.cor || PALETA[i % PALETA.length], orc: +x.orc || 0, subs: x.subs || [] };
    });
    if (c.limite == null) c.limite = 0;
    if (!c.alertaPct) c.alertaPct = 80;
    if (!c.periodo) c.periodo = periodoMesAtual();
    if (c.orcParc == null) c.orcParc = 0;
    c.v = 2; mudou = true;
  }
  limparCfg(c);
  return { cfg: c, mudou: mudou };
}
// Segurança (14/11/2026): tudo o que vem do banco ou de um backup é conferido antes de ir para a tela.
// Ids só com letras, números, _ e -; cores só no formato #rrggbb; textos com tamanho máximo.
var ID_OK = /^[A-Za-z0-9_-]{1,64}$/, COR_OK = /^#[0-9a-fA-F]{6}$/, DATA_OK = /^\d{4}-\d{2}-\d{2}$/;
function txtCurto(v, max) { return String(v == null ? '' : v).slice(0, max); }
function limparCfg(c) {
  c.nome = txtCurto(c.nome || 'Minha casa', 60);
  if (!SIMB[c.moeda]) c.moeda = 'CAD';
  c.limite = isFinite(+c.limite) && +c.limite > 0 ? +c.limite : 0;
  c.alertaPct = isFinite(+c.alertaPct) && +c.alertaPct > 0 ? Math.min(100, +c.alertaPct) : 80;
  if (!c.periodo || !DATA_OK.test(c.periodo.inicio) || !DATA_OK.test(c.periodo.fim)) c.periodo = periodoMesAtual();
  c.cats = (Array.isArray(c.cats) ? c.cats : []).filter(function (x) { return x && ID_OK.test(x.id); }).map(function (x, i) {
    return { id: x.id, emoji: txtCurto(x.emoji || '📦', 8), nome: txtCurto(x.nome || 'Categoria', 40),
      cor: COR_OK.test(x.cor) ? x.cor : PALETA[i % PALETA.length], orc: isFinite(+x.orc) && +x.orc > 0 ? +x.orc : 0,
      subs: (Array.isArray(x.subs) ? x.subs : []).filter(function (u) { return u && ID_OK.test(u.id); }).map(function (u) { return { id: u.id, nome: txtCurto(u.nome || 'Sub', 40) }; }) };
  });
  return c;
}
function limparReg(id, r) {
  if (!ID_OK.test(String(id)) || !r || typeof r !== 'object') return null;
  var o = { v: Math.max(0, Math.round(+r.v || 0)), dt: DATA_OK.test(r.dt) ? r.dt : null, c: ID_OK.test(r.c) ? r.c : null,
    s: ID_OK.test(r.s) ? r.s : null, d: txtCurto(r.d, 200), por: ID_OK.test(r.por) ? r.por : null, ts: +r.ts || 0 };
  if (r.t) o.t = txtCurto(r.t, 20);
  // devolução (16/11/2026): t:'dev', o = compra de origem, lj = virou crédito na loja.
  // compra paga com crédito da loja: cl = devolução usada, clv = centavos tirados do crédito.
  if (ID_OK.test(r.o)) o.o = r.o;
  if (r.lj) o.lj = 1;
  if (r.ap) o.ap = 1; // veio de um pagamento com Apple Pay (atalho do iPhone)
  if (ID_OK.test(r.cl)) { o.cl = r.cl; o.clv = Math.max(0, Math.min(o.v, Math.round(+r.clv || 0))); }
  if (r.p && typeof r.p === 'object') o.p = { n: Math.max(1, Math.round(+r.p.n || 1)), total: Math.max(1, Math.round(+r.p.total || 1)), g: ID_OK.test(r.p.g) ? r.p.g : 'g', vt: Math.max(0, Math.round(+r.p.vt || 0)) };
  if (!o.dt || !(o.v > 0) || o.v > VALOR_MAX * 100) return null;
  return o;
}
function catsComuns() { return (S.cfg && S.cfg.cats) || []; }
function catParc() { return { id: PARC, emoji: '📦', nome: 'Parcelados', cor: '#7c3aed', orc: (S.cfg && +S.cfg.orcParc) || 0, subs: [] }; }
function todasCats() { return COM_PARCELADOS ? catsComuns().concat([catParc()]) : catsComuns(); }
function catPorId(id) {
  if (id === PARC) return catParc();
  var cs = catsComuns();
  for (var i = 0; i < cs.length; i++) if (cs[i].id === id) return cs[i];
  return null;
}
function NOME(id) { var c = catPorId(id); return c ? c.nome : 'Sem categoria'; }
function COR(id) { var c = catPorId(id); return c ? c.cor : '#9ca3af'; }
function EMO(id) { var c = catPorId(id); return c ? c.emoji : '❔'; }
function nomeSub(catId, subId) {
  if (!subId) return '';
  var c = catPorId(catId); if (!c) return '';
  for (var i = 0; i < c.subs.length; i++) if (c.subs[i].id === subId) return c.subs[i].nome;
  return '';
}
function orcDe(id) { var c = catPorId(id); return c ? (+c.orc || 0) : 0; }

// ═════════════════════════ lançamentos (visão) ═════════════════════════
// Registro guardado (cifrado): { v: centavos, dt, c, s, d, por, ts, p?: { n, total, g, vt } }
function lancamentos() {
  return Object.keys(S.raw).map(function (id) {
    var r = S.raw[id];
    if (!r || r.t === 'receita') return null;
    return {
      id: id, data: r.dt, valor: (r.t === 'dev' ? -1 : 1) * (r.v || 0) / 100, cat: r.p ? PARC : r.c, sub: r.s || null, desc: r.d || '',
      por: r.por, ts: r.ts || 0,
      dev: r.t === 'dev', orig: r.t === 'dev' && r.o ? r.o : null, lj: !!(r.t === 'dev' && r.lj),
      cl: r.cl || null, clv: (r.clv || 0) / 100, ap: !!r.ap,
      parcela: r.p ? { n: r.p.n, total: r.p.total, grupoId: r.p.g, valorTotal: (r.p.vt || 0) / 100 } : null
    };
  }).filter(Boolean);
}
// Devoluções ligadas a cada compra: { idCompra: total devolvido }
function devolvidoPorCompra(exceto) {
  var m = {};
  Object.keys(S.raw).forEach(function (id) { var r = S.raw[id]; if (r && r.t === 'dev' && r.o && id !== exceto) m[r.o] = (m[r.o] || 0) + (r.v || 0) / 100; });
  return m;
}
// Créditos na loja ainda com saldo: [{ id, nome, saldo }]
function creditosLoja(excetoCompra) {
  var usado = {};
  Object.keys(S.raw).forEach(function (id) { var r = S.raw[id]; if (r && r.cl && id !== excetoCompra) usado[r.cl] = (usado[r.cl] || 0) + (r.clv || 0) / 100; });
  return lancamentos().filter(function (l) { return l.dev && l.lj; }).map(function (l) {
    return { id: l.id, nome: descLanc(l), data: l.data, cat: l.cat, saldo: c2(-l.valor - (usado[l.id] || 0)) };
  });
}
function lancamentosPeriodo(lista, p) { return lista.filter(function (l) { return l.data && l.data >= p.inicio && l.data <= p.fim; }); }
function descLanc(l) { return l.desc || nomeSub(l.cat, l.sub) || NOME(l.cat); }
function metaLanc(l, comData) {
  var s = (comData ? formatarData(l.data) + ' · ' : '') + NOME(l.cat);
  var sb = nomeSub(l.cat, l.sub);
  if (sb && l.desc) s += ' · ' + sb;
  if (Object.keys(S.membros).length > 1 && S.perfis[l.por]) s += ' · ' + S.perfis[l.por].nome;
  return esc(s);
}

// Parcelamentos (mesma lógica do app original)
function resolverGrupos(lista) {
  var grupos = {};
  lista.forEach(function (l) {
    if (!l.parcela) return;
    var gid = l.parcela.grupoId;
    if (!grupos[gid]) grupos[gid] = { total: l.parcela.total, valorParc: l.valor, desc: l.desc || '', lancs: {}, valorTotal: l.parcela.valorTotal };
    grupos[gid].lancs[l.parcela.n] = l;
    if (!grupos[gid].desc && l.desc) grupos[gid].desc = l.desc;
  });
  return grupos;
}
function planosAtivos(lista) {
  var hj = hoje(), grupos = resolverGrupos(lista), planos = [];
  Object.keys(grupos).forEach(function (gid) {
    var g = grupos[gid], pagas = 0;
    Object.keys(g.lancs).forEach(function (n) { if (g.lancs[n].data <= hj && +n > pagas) pagas = +n; });
    planos.push({ gid: gid, desc: g.desc || 'Parcelado', valorParc: g.valorParc, total: g.total, pagas: pagas, quitado: pagas >= g.total, valorTotal: g.valorTotal, lancs: g.lancs });
  });
  return planos;
}
function calcularMensalParcelados(lista) {
  return planosAtivos(lista).reduce(function (s, p) { return s + (p.quitado ? 0 : p.valorParc); }, 0);
}
function buildPagasMap(lista) {
  var hj = hoje(), map = {};
  lista.forEach(function (l) {
    if (!l.parcela) return;
    var g = l.parcela.grupoId;
    if (!(g in map)) map[g] = 0;
    if (l.data < hj && l.parcela.n > map[g]) map[g] = l.parcela.n;
  });
  return map;
}
function parcelaBadgeHtml(l, pagasMap) {
  if (!l.parcela) return '';
  var pagas = (pagasMap && l.parcela.grupoId in pagasMap) ? pagasMap[l.parcela.grupoId] : 0;
  return '<span class="lanc-parcela">' + Math.min(pagas + 1, l.parcela.total) + '/' + l.parcela.total + '</span>';
}

// Totais do período: gastos comuns por categoria + parcelados (compromisso mensal ativo)
function totaisPeriodo(p) {
  var todos = lancamentos(), lista = lancamentosPeriodo(todos, p);
  var tots = {}, qtds = {}, porDia = {}, porDiaCat = {}, comum = 0, nComuns = 0;
  todasCats().forEach(function (c) { tots[c.id] = 0; qtds[c.id] = 0; porDiaCat[c.id] = {}; });
  lista.forEach(function (l) {
    var k = l.cat;
    if (!(k in tots)) { tots[k] = 0; qtds[k] = 0; porDiaCat[k] = {}; }
    if (l.valor > 0) qtds[k]++;
    if (k === PARC) return;
    tots[k] += l.valor; comum += l.valor; if (l.valor > 0) nComuns++;
    porDia[l.data] = (porDia[l.data] || 0) + l.valor;
    porDiaCat[k][l.data] = (porDiaCat[k][l.data] || 0) + l.valor;
  });
  tots[PARC] = COM_PARCELADOS ? calcularMensalParcelados(todos) : 0;
  return { todos: todos, lista: lista, tots: tots, qtds: qtds, comum: comum, nComuns: nComuns, porDia: porDia, porDiaCat: porDiaCat };
}
function orcComum() { return catsComuns().reduce(function (s, c) { return s + (+c.orc || 0); }, 0); }
// Valor-base para "Disponível": o valor para gastar no período; sem ele, a soma dos orçamentos
function baseDisponivel() { var lim = +S.cfg.limite || 0; return lim > 0 ? lim : orcComum(); }

// ═════════════════════════ telas ═════════════════════════
function mostrarEntrada(card) {
  ['card-semconfig', 'card-auth', 'card-casa', 'card-unlock'].forEach(function (id) { $(id).style.display = id === card ? '' : 'none'; });
  prepararConvite(card);
  $('tela-login').classList.add('ativa');
  $('nav').style.display = 'none';
  qsa('.tela').forEach(function (t) { t.classList.remove('ativa'); });
  $('app-loading').style.display = 'none';
}
function prepararConvite(card) {
  var c = convitePendente(); if (!c) return;
  if (card === 'card-auth' && !S.avisouConvite) {
    S.avisouConvite = true; setModoCriar(true);
    $('au-erro').innerHTML = '<span style="color:#1d4ed8">📩 Você recebeu um convite! Crie sua conta abaixo. Se já tem conta, toque em <b>Entrar</b>.</span>';
  }
  if (card === 'card-casa') {
    setAbaCasa(true);
    $('cv-codigo').value = c;
    var campo = $('cv-codigo').parentNode; if (campo) campo.style.display = 'none';
    var nota = $('cv-nota');
    if (!nota) { nota = document.createElement('div'); nota.id = 'cv-nota'; $('box-convite').insertBefore(nota, $('box-convite').firstChild); }
    nota.innerHTML = '<div style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;border-radius:12px;padding:10px 12px;font-size:13.5px;margin-bottom:12px">✅ <b>Convite recebido.</b> Agora é só digitar a <b>senha da casa</b> que te passaram.</div>';
  }
}
function carregando(txt) { $('ld-txt').textContent = txt || 'Carregando…'; $('app-loading').style.display = ''; }

function irPara(tela) {
  if (!S.chave) return;
  $('tela-login').classList.remove('ativa');
  $('app-loading').style.display = 'none';
  $('nav').style.display = '';
  qsa('.tela').forEach(function (t) { t.classList.remove('ativa'); });
  $('tela-' + tela).classList.add('ativa');
  S.tela = tela;
  document.body.classList.toggle('na-tela-add', tela === 'add');
  var navMap = { categoria: 'relatorio', semana: 'relatorio', relcat: 'relatorio', projecao: 'relatorio' };
  if (tela === 'semana') { S.semOff = 0; S.semCic = 0; S.semAberta = false; }
  qsa('.nav button').forEach(function (b) { b.classList.remove('active'); });
  var nb = $('nb-' + (navMap[tela] || tela)); if (nb) nb.classList.add('active');
  if (tela === 'add' && !S.add.editId) novoLancamento();
  renderTela();
  window.scrollTo(0, 0);
}
function renderTela() {
  if (!S.chave || !S.cfg) return;
  var t = S.tela;
  if (t === 'inicio') renderizar();
  else if (t === 'add') renderAdd();
  else if (t === 'historico') renderizarHistorico();
  else if (t === 'relatorio') renderizarRelatorio();
  else if (t === 'relcat') renderizarRelcat();
  else if (t === 'categoria') irParaCategoria(S.catAberta, true);
  else if (t === 'projecao') atualizarProjecao();
  else if (t === 'ajustes') renderAjustes();
  else if (t === 'semana') renderizarSemana();
}
var _rt;
function renderLogo() { clearTimeout(_rt); _rt = setTimeout(renderTela, 60); }

// ═════════════════════════ INÍCIO ═════════════════════════
function renderizar() {
  var c = S.cfg, p = c.periodo, T = totaisPeriodo(p);
  renderAvisoPeriodo();
  var hj = hoje();
  var totalHoje = T.todos.filter(function (l) { return l.data === hj; }).reduce(function (s, l) { return s + l.valor; }, 0);
  $('txt-casa').textContent = c.nome || 'MinhaCasa';
  $('txt-total').textContent = formatar(T.comum);
  var parc = T.tots[PARC] || 0;
  $('hero-parc-wrap').style.display = parc > 0 ? '' : 'none';
  $('txt-total-parc').textContent = formatar(parc);
  var i = p.inicio.split('-'), f = p.fim.split('-'), MC = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  $('hero-periodo').textContent = (+i[2]) + ' ' + MC[+i[1] - 1] + ' – ' + (+f[2]) + ' ' + MC[+f[1] - 1];

  var base = baseDisponivel(), rest = base - T.comum;
  $('txt-disponivel').textContent = base > 0 ? formatar(rest) : formatar(0);
  $('txt-disponivel').style.color = (base > 0 && rest < 0) ? '#ff6b6b' : 'white';
  $('txt-restante').textContent = (+c.limite > 0) ? 'Limite: ' + formatar(c.limite) : (base > 0 ? 'Soma dos orçamentos: ' + formatar(base) : 'Toque em Orçamento para definir');
  $('txt-hoje').textContent = 'Hoje: ' + formatar(totalHoje);
  var pct = base > 0 ? Math.min(T.comum / base * 100, 100) : 0;
  var excedeu = base > 0 && T.comum > base;
  $('barra').style.width = pct + '%';
  $('barra').style.background = excedeu ? '#f44336' : pct >= c.alertaPct ? '#ff9800' : '#4caf50';
  $('txt-pct').textContent = base > 0 ? pct.toFixed(1) + '% utilizado' : 'Sem orçamento definido';
  // Sem orçamento (14/11/2026): o cartão "Disponível" vira um botão para definir o limite
  var pill = document.querySelector('#tela-inicio .hero-pill');
  if (pill) {
    pill.classList.toggle('sem-orc', !(base > 0));
    if (!(base > 0)) {
      $('txt-disponivel').textContent = 'Definir orçamento';
      $('txt-restante').textContent = 'Toque para informar quanto pode gastar no período';
    }
    pill.onclick = base > 0 ? null : function () { abrirOrcamentoInicial(); };
  }
  $('barra').parentNode.style.display = base > 0 ? '' : 'none';
  if (S.pedirOrc && !(base > 0)) { S.pedirOrc = false; setTimeout(abrirOrcamentoInicial, 600); }
  var al = $('alerta');
  if (excedeu) { al.className = 'alerta excedido'; al.textContent = '🚨 LIMITE EXCEDIDO! Você gastou ' + formatar(T.comum - base) + ' além do disponível.'; }
  else if (base > 0 && pct >= c.alertaPct) { al.className = 'alerta atencao'; al.textContent = '⚠️ Atenção: ' + pct.toFixed(0) + '% do disponível utilizado. Restam ' + formatar(rest) + '.'; }
  else { al.className = 'alerta'; al.textContent = ''; }

  // Cards de categoria
  var nDev = {}; T.lista.forEach(function (l) { if (l.valor < 0) nDev[l.cat] = (nDev[l.cat] || 0) + 1; });
  $('grid-cat').innerHTML = todasCats().map(function (cat) {
    var gasto = T.tots[cat.id] || 0, orc = +cat.orc || 0, qtd = T.qtds[cat.id] || 0;
    var qtdTxt = qtd + ' lanç.' + (nDev[cat.id] ? ' · ' + nDev[cat.id] + ' devol.' : ''), rotG = gasto < 0 ? 'Devolvido' : 'Gasto';
    var corpo;
    if (orc > 0) {
      var pC = Math.max(0, Math.min(gasto / orc * 100, 100)), restC = orc - gasto;
      var corB = gasto > orc ? '#f44336' : pC >= 80 ? '#ff9800' : cat.cor;
      corpo = '<div class="cat-linha-vals"><div><div class="cat-rotulo">' + rotG + '</div><div class="cat-valor" style="color:' + (gasto < 0 ? '#16a34a' : cat.cor) + '">' + formatar(gasto) + '</div>' +
        '<div class="cat-sub-orc">Orç: ' + formatar(orc) + '</div></div>' +
        '<div style="text-align:right"><div class="cat-rotulo">Disponível</div><div class="cat-valor" style="color:' + (restC < 0 ? '#f44336' : '#43a047') + '">' + formatar(restC) + '</div></div></div>' +
        '<div class="cat-barra-fundo" style="display:block"><div class="cat-barra-fill" style="width:' + pC + '%;background:' + corB + '"></div></div>' +
        '<div class="cat-orc" style="color:' + (restC < 0 ? '#f44336' : '#bbb') + '">' + pC.toFixed(0) + '% utilizado</div>';
    } else {
      corpo = '<div class="cat-linha-vals"><div><div class="cat-rotulo">' + rotG + '</div><div class="cat-valor" style="color:' + (gasto < 0 ? '#16a34a' : cat.cor) + '">' + formatar(gasto) + '</div><div class="cat-sub-orc" style="color:#6b7280">Sem orçamento</div></div></div>';
    }
    return '<div class="card-cat" data-cat="' + cat.id + '">' +
      '<div class="cat-header"><span class="cat-icon" style="background:' + alfa(cat.cor, '22') + '">' + esc(cat.emoji) + '</span><span class="cat-nome">' + esc(cat.nome) + '</span><span class="cat-qtd">' + qtdTxt + '</span></div>' +
      corpo + '</div>';
  }).join('');

  renderizarPizza(T.tots, T.comum);
  renderizarBarras(T.lista, p);
  renderizarRecentes(T.todos);
  pintarCartaoSemana();
  if (!$('topo-config').classList.contains('editando')) preencherConfig();
}

function renderizarPizza(tots, total) {
  $('pizza-wrap').innerHTML = '<div class="pizza-legenda">' + todasCats().map(function (c) {
    var v = tots[c.id] || 0, orc = +c.orc || 0;
    var pct = orc > 0 ? (v / orc * 100).toFixed(0) : (total > 0 ? (v / total * 100).toFixed(0) : 0);
    var cor = v > orc && orc > 0 ? '#f44336' : v < 0 ? '#16a34a' : c.cor;
    return '<div class="pizza-item"><div class="pizza-cor" style="background:' + cor + '"></div>' +
      '<div class="pizza-txt">' + esc(c.nome) + ' <span style="color:#6b7280;font-size:11px">(' + (v < 0 ? 'devolução' : pct + '% ' + (orc > 0 ? 'do orç.' : 'do total')) + ')</span></div>' +
      '<div class="pizza-val" style="color:' + cor + '">' + formatar(v) + '</div></div>';
  }).join('') + '</div>';
}

function renderizarBarras(lista, p) {
  var el = $('barras-div'), porDia = {}, hj = hoje();
  lista.forEach(function (l) {
    if (!porDia[l.data]) porDia[l.data] = { total: 0 };
    porDia[l.data][l.cat] = (porDia[l.data][l.cat] || 0) + l.valor;
    porDia[l.data].total += l.valor;
  });
  var dias = [];
  for (var d = p.inicio; d <= p.fim && d <= hj; d = proxDia(d)) { dias.push(d); if (dias.length > 400) break; }
  if (!dias.length) { el.innerHTML = '<div class="vazio">Nenhum dado no período</div>'; return; }
  var maxVal = 0;
  dias.forEach(function (d) { if ((porDia[d] || {}).total > maxVal) maxVal = porDia[d].total; });
  if (maxVal === 0) maxVal = 1;
  var diasCom = dias.filter(function (d) { return porDia[d] && porDia[d].total > 0; });
  var totalGeral = diasCom.reduce(function (s, d) { return s + porDia[d].total; }, 0);
  var media = diasCom.length ? totalGeral / diasCom.length : 0;
  function fmtY(v) { return v >= 1000 ? SIMB[moeda()] + (v / 1000).toFixed(1) + 'k' : SIMB[moeda()] + Math.round(v); }
  var melhorDia = '', melhorVal = 0;
  dias.forEach(function (d) { if ((porDia[d] || {}).total > melhorVal) { melhorVal = porDia[d].total; melhorDia = d; } });
  var stats = '<div class="chart-stats">' +
    '<div class="chart-stat"><div class="chart-stat-val">' + fmtY(media) + '</div><div class="chart-stat-label">Média por dia c/ gasto</div></div>' +
    '<div class="chart-stat"><div class="chart-stat-val">' + diasCom.length + '</div><div class="chart-stat-label">Dias c/ gasto</div></div>' +
    '<div class="chart-stat"><div class="chart-stat-val">' + (melhorDia ? (+melhorDia.slice(8, 10)) + '/' + (+melhorDia.slice(5, 7)) : '—') + '</div><div class="chart-stat-label">Maior gasto</div></div></div>';
  var CHART_H = 160, barW = Math.max(12, Math.floor((300 - 38 - 3 * dias.length) / dias.length));
  var cats = todasCats();
  var bars = dias.map(function (d) {
    var data = porDia[d] || { total: 0 }, total = data.total;
    var totalH = total > 0 ? Math.max(6, Math.round(total / maxVal * CHART_H)) : 0;
    var segs = '';
    if (total > 0) {
      var usado = 0, partes = [];
      cats.concat([{ id: '_x', cor: '#9ca3af' }]).forEach(function (c) {
        var v = c.id === '_x' ? Object.keys(data).filter(function (k) { return k !== 'total' && !catPorId(k); }).reduce(function (s, k) { return s + data[k]; }, 0) : (data[c.id] || 0);
        if (v > 0) partes.push({ v: v, cor: c.cor });
      });
      var pos = partes.reduce(function (s2, pt) { return s2 + pt.v; }, 0) || 1; // devolução no mesmo dia: barra mostra o líquido
      partes.forEach(function (pt) { pt.h = Math.round(pt.v / pos * totalH); });
      partes.forEach(function (pt) { usado += pt.h; });
      if (partes.length) partes[0].h += totalH - usado;
      segs = partes.reverse().map(function (pt) { return pt.h > 0 ? '<div class="bar-seg" style="height:' + pt.h + 'px;background:' + pt.cor + '"></div>' : ''; }).join('');
    } else segs = '<div class="bar-empty"></div>';
    var lbl = (total > 0 && totalH > 20 && barW >= 14) ? (total >= 1000 ? (total / 1000).toFixed(1) + 'k' : Math.round(total) + '') : '';
    return '<div class="bar-col' + (d === hj ? ' bar-hoje' : '') + '" style="width:' + barW + 'px"><div class="bar-val">' + lbl + '</div>' +
      '<div class="bar-stack" style="height:' + CHART_H + 'px">' + segs + '</div><div class="bar-dia">' + (+d.slice(8, 10)) + '</div></div>';
  }).join('');
  var mediaPos = Math.round(media / maxVal * CHART_H);
  el.innerHTML = stats +
    '<div class="chart-wrap"><div class="chart-inner">' +
    '<div class="chart-yaxis"><div class="chart-ylabel">' + fmtY(maxVal) + '</div><div class="chart-ylabel">' + fmtY(maxVal / 2) + '</div><div class="chart-ylabel">' + fmtY(0) + '</div></div>' +
    '<div class="chart-body"><div class="chart-grid"><div class="chart-gridline"></div><div class="chart-gridline"></div><div class="chart-gridline"></div></div>' +
    (media > 0 ? '<div class="chart-media-line" style="bottom:' + (26 + mediaPos) + 'px"><span class="chart-media-label">méd ' + fmtY(media) + '</span></div>' : '') +
    '<div class="chart-bars" style="height:' + (CHART_H + 26) + 'px">' + bars + '</div></div></div></div>' +
    '<div class="chart-legenda">' + cats.map(function (c) { return '<div class="chart-leg-item"><div class="chart-leg-cor" style="background:' + c.cor + '"></div>' + esc(c.nome) + '</div>'; }).join('') +
    '<div class="chart-leg-item"><div style="width:14px;border-top:2px dashed rgba(29,78,216,.6)"></div>Média</div></div>';
}

// Selo de devolução / crédito na loja ao lado da descrição (16/11/2026)
function seloDev(l, devMap) {
  if (l.dev) return ''; // a seta ↩ já vai na etiqueta do valor, que nunca é cortada (16/11/2026)
  var h = '';
  var dv = (devMap || devolvidoPorCompra())[l.id];
  if (dv) h += '<span class="lanc-dev">' + (dv >= l.valor - 0.005 ? 'devolvido' : 'devolvido ' + formatar(dv)) + '</span>';
  if (l.cl && l.clv > 0) h += '<span class="lanc-dev">🎟️ ' + (l.clv >= l.valor - 0.005 ? 'pago com crédito' : formatar(l.clv) + ' de crédito') + '</span>';
  return h;
}
function linhaLanc(l, pagasMap, comData, classe, devMap) {
  return '<div class="' + (classe || 'lancamento') + (l.dev ? ' lanc-e-dev' : '') + '">' +
    '<div class="lanc-ponto" style="background:' + COR(l.cat) + ';flex-shrink:0"></div>' +
    '<div class="lanc-info"><div class="lanc-desc">' + esc(descLanc(l)) + parcelaBadgeHtml(l, pagasMap) + seloDev(l, devMap) + '</div>' +
    '<div class="lanc-meta">' + metaLanc(l, comData) + '</div></div>' +
    (l.dev ? '<div class="lanc-valor lanc-valor-dev"><span class="lvd-seta">\u21A9\uFE0E</span>' : '<div class="lanc-valor" style="color:' + COR(l.cat) + '">') + formatar(l.valor) + '</div>' +
    '<button class="lanc-edit" data-editar="' + l.id + '" aria-label="Editar lançamento">' + ICO('edit') + '</button>' +
    '<button class="lanc-del" data-excluir="' + l.id + '" aria-label="Excluir lançamento">' + ICO('trash') + '</button></div>';
}
function renderizarRecentes(todos) {
  var hj = hoje();
  var rec = todos.filter(function (l) { return l.data <= hj; }).sort(function (a, b) {
    return a.data < b.data ? 1 : a.data > b.data ? -1 : b.ts - a.ts;
  }).slice(0, 8);
  if (!rec.length) { $('lista-recentes').innerHTML = '<div class="vazio">📭 Nenhum lançamento ainda.<br>Toque em <b>Registrar</b> para começar.</div>'; return; }
  var pm = buildPagasMap(todos);
  var dm = devolvidoPorCompra();
  $('lista-recentes').innerHTML = rec.map(function (l) { return linhaLanc(l, pm, true, null, dm); }).join('');
}

// Configurações (limite, alerta, período, orçamentos)
function preencherConfig() {
  var c = S.cfg;
  $('inp-limite').value = numTxt(c.limite);
  $('inp-alerta').value = c.alertaPct || 80;
  $('inp-inicio').value = c.periodo.inicio;
  $('inp-fim').value = c.periodo.fim;
  $('grid-orc').innerHTML = todasCats().map(function (cat) {
    return '<div class="campo-orc"><label>' + esc(cat.emoji + ' ' + cat.nome) + '</label>' +
      '<input type="text" inputmode="decimal" data-orc="' + cat.id + '" data-orc-antes="' + (+cat.orc || 0) + '" placeholder="0" value="' + esc(numTxt(cat.orc)) + '"></div>';
  }).join('');
  atualizarSaldoOrc();
}

// ── Trava do orçamento (14/11/2026) ──
// A soma dos orçamentos das categorias não pode passar do "Valor para gastar no período".
// Enquanto digita, a linha abaixo do título mostra quanto ainda falta distribuir; ao sair do campo,
// um valor acima do que sobra é cortado para o máximo. Diminuir um orçamento é sempre permitido.
function c2(n) { return Math.round((+n || 0) * 100) / 100; }
function valOrcInp(inp) { var v = lerValor(inp.value); return isFinite(v) && v > 0 ? v : 0; }
function somaOrcInputs(exceto) {
  return c2(qsa('#grid-orc [data-orc]').reduce(function (s, inp) {
    return inp === exceto || inp.dataset.orc === PARC ? s : s + valOrcInp(inp);
  }, 0));
}
function limiteDigitado() { var v = lerValor($('inp-limite').value); return isFinite(v) && v > 0 ? v : 0; }
function atualizarSaldoOrc() {
  var el = $('orc-saldo'); if (!el) return;
  var lim = limiteDigitado(), soma = somaOrcInputs(null), resto = c2(lim - soma);
  qsa('#grid-orc [data-orc]').forEach(function (inp) {
    if (inp.dataset.orc === PARC) return;
    var max = Math.max(0, c2(lim - somaOrcInputs(inp)));
    inp.classList.toggle('orc-excede', lim > 0 && valOrcInp(inp) > max + 0.004);
    inp.placeholder = lim > 0 ? 'até ' + numTxt(max || 0) : '0';
    if (lim > 0 && !max) inp.placeholder = '0';
  });
  if (!(lim > 0)) {
    el.className = 'orc-saldo'; el.innerHTML = 'Soma das categorias: <b>' + formatar(soma) + '</b>. Defina o valor para gastar para controlar a distribuição.';
  } else if (resto > 0.004) {
    el.className = 'orc-saldo livre'; el.innerHTML = 'Distribuído <b>' + formatar(soma) + '</b> de ' + formatar(lim) + ' · ainda pode distribuir <b>' + formatar(resto) + '</b>';
  } else if (resto > -0.005) {
    el.className = 'orc-saldo cheio'; el.innerHTML = '✅ Todo o valor para gastar (' + formatar(lim) + ') está distribuído';
  } else {
    el.className = 'orc-saldo passou'; el.innerHTML = '⚠️ As categorias somam <b>' + formatar(soma) + '</b>, <b>' + formatar(-resto) + '</b> acima do valor para gastar. Reduza alguma categoria.';
  }
}
// Corta o orçamento digitado para o que ainda sobra. Devolve true se cortou.
function travarOrcInp(inp) {
  var lim = limiteDigitado(); if (!(lim > 0) || inp.dataset.orc === PARC) return false;
  var v = valOrcInp(inp), antes = +inp.dataset.orcAntes || 0, max = Math.max(0, c2(lim - somaOrcInputs(inp)));
  if (v <= max + 0.004 || v <= antes) return false; // dentro do saldo, ou diminuindo
  var novo = Math.max(max, antes);
  inp.value = numTxt(novo);
  var cat = catPorId(inp.dataset.orc);
  mostrarToast('⚠️', (novo > 0 ? 'Máximo para ' + (cat ? cat.nome : 'esta categoria') + ': ' + formatar(novo) : 'Não sobrou nada do valor para gastar') +
    '. As categorias não podem passar de ' + formatar(lim) + '.', 4500);
  return true;
}
function salvarConfigTopo(alvo) {
  var c = S.cfg, limAntes = +c.limite || 0;
  if (alvo && alvo.dataset && alvo.dataset.orc) travarOrcInp(alvo);
  var lim = lerValor($('inp-limite').value);
  c.limite = isFinite(lim) && lim > 0 ? lim : 0;
  var pct = parseInt($('inp-alerta').value, 10);
  c.alertaPct = pct > 0 && pct <= 100 ? pct : 80;
  var ini = $('inp-inicio').value, fim = $('inp-fim').value;
  if (ini && fim) {
    if (ini > fim) mostrarToast('⚠️', 'Início deve ser antes do fim');
    else c.periodo = { inicio: ini, fim: fim };
  }
  qsa('[data-orc]').forEach(function (inp) {
    var v = lerValor(inp.value); v = isFinite(v) && v > 0 ? v : 0;
    if (inp.dataset.orc === PARC) c.orcParc = v;
    else { var cat = catPorId(inp.dataset.orc); if (cat) cat.orc = v; }
    inp.dataset.orcAntes = v;
  });
  atualizarSaldoOrc();
  if (alvo && alvo.id === 'inp-limite' && c.limite > 0 && c.limite !== limAntes && orcComum() > c.limite + 0.004)
    mostrarToast('⚠️', 'As categorias somam ' + formatar(orcComum()) + ', acima do novo valor para gastar. Reduza alguma categoria.', 5000);
  salvarCfg();
  renderizar();
}
function toggleConfig() {
  var cfg = $('topo-config'), tg = $('cfg-toggle'), abrir = cfg.style.display !== 'block';
  cfg.style.display = abrir ? 'block' : 'none';
  tg.classList.toggle('aberto', abrir);
  if (abrir) preencherConfig();
}
// O período NÃO vira sozinho (pedido em 13/11/2026): quando ele termina, o Início mostra um aviso
// e o usuário define o novo período em Configurações. O botão já sugere as datas, mas só grava ao salvar.
function sugestaoProxPeriodo() {
  var p = S.cfg.periodo, ini = semAdd(p.fim, 1);
  return { inicio: ini, fim: semAdd(addMeses(ini, 1), -1) };
}
function renderAvisoPeriodo() {
  var wrap = $('sem-card-wrap'); if (!wrap || !S.cfg || !S.cfg.periodo) return;
  var el = $('aviso-periodo');
  if (!el) { el = document.createElement('div'); el.id = 'aviso-periodo'; wrap.parentNode.insertBefore(el, wrap); }
  var p = S.cfg.periodo;
  if (hoje() <= p.fim) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="card" style="border-left:5px solid #f59e0b;background:#fffbeb">' +
    '<div style="font-size:15px;font-weight:800;color:#92400e">📅 O período terminou</div>' +
    '<div style="font-size:13.5px;color:#78350f;margin-top:4px;line-height:1.45">O período <b>' + formatarData(p.inicio) + ' → ' + formatarData(p.fim) + '</b> acabou. ' +
    'Os gastos lançados depois de ' + formatarData(p.fim) + ' só entram nos totais quando você definir o novo período.</div>' +
    '<button type="button" id="btn-novo-periodo" style="margin-top:10px;width:100%;padding:12px;border:0;border-radius:12px;background:#d97706;color:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit">Definir novo período</button></div>';
  $('btn-novo-periodo').onclick = function () {
    if ($('topo-config').style.display !== 'block') toggleConfig();
    var sug = sugestaoProxPeriodo();
    $('inp-inicio').value = sug.inicio; $('inp-fim').value = sug.fim;
    mostrarToast('📅', 'Confira as datas sugeridas e toque em Salvar');
    var alvo = $('inp-inicio'); if (alvo && alvo.scrollIntoView) alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
}

// ═════════════════════════ DETALHE CATEGORIA ═════════════════════════
function irParaCategoria(cat, soRender) {
  S.catAberta = cat;
  var p = S.cfg.periodo, todos = lancamentos(), lista, total;
  var c = catPorId(cat) || { nome: 'Sem categoria', emoji: '❔', cor: '#9ca3af' };
  if (cat === PARC) {
    var ultimos = {};
    todos.forEach(function (l) { if (l.parcela) { var g = l.parcela.grupoId; if (!ultimos[g] || l.data > ultimos[g].data) ultimos[g] = l; } });
    lista = Object.keys(ultimos).map(function (g) { return ultimos[g]; });
    total = calcularMensalParcelados(todos);
  } else {
    lista = lancamentosPeriodo(todos, p).filter(function (l) { return l.cat === cat; });
    total = lista.reduce(function (s, l) { return s + l.valor; }, 0);
  }
  lista.sort(function (a, b) { return b.data.localeCompare(a.data); });
  $('topo-categoria').style.background = 'linear-gradient(160deg,' + c.cor + 'cc,' + c.cor + ')';
  $('titulo-categoria').textContent = c.emoji + ' ' + c.nome;
  $('resumo-categoria').innerHTML = '<div style="text-align:center;padding:8px 0 12px"><div style="font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:4px">' +
    (cat === PARC ? 'Total Mensal Ativo' : 'Total do Período') + '</div><div style="font-size:32px;font-weight:900;color:' + c.cor + '">' + formatar(total) + '</div></div>';
  var pm = buildPagasMap(todos);
  $('lista-categoria').innerHTML = lista.length ? (function (dm) { return lista.map(function (l) { return linhaLanc(l, pm, true, null, dm); }).join(''); })(devolvidoPorCompra()) : '<div class="vazio">📭 Sem lançamentos neste período</div>';
  if (!soRender) irPara('categoria');
}

// ═════════════════════════ REGISTRAR / EDITAR ═════════════════════════
function novoLancamento() {
  S.add = { cat: S.add.cat && catPorId(S.add.cat) && S.add.cat !== PARC ? S.add.cat : (catsComuns()[0] ? catsComuns()[0].id : null), sub: null, nParc: 1, parcIni: 1, editId: null,
    tipo: 'compra', orig: null, lj: false, cl: null };
  $('inp-valor').value = ''; $('inp-desc').value = ''; $('inp-data').value = hoje(); $('orig-busca').value = '';
  $('valor-pre').textContent = SIMB[moeda()];
  $('add-edit-extra').style.display = 'none'; $('pag-aviso').style.display = 'none';
  atualizarParcUI();
  pintarTipoAdd();
}
function editarLancamento(id) {
  var l = lancamentos().filter(function (x) { return x.id === id; })[0];
  if (!l) return;
  S.add = { cat: l.cat, sub: l.sub, nParc: 1, parcIni: 1, editId: id, tipo: l.dev ? 'dev' : 'compra', orig: l.orig, lj: l.lj, cl: l.cl, parc: !!l.parcela };
  $('inp-valor').value = numTxt(Math.abs(l.valor).toFixed(2));
  $('inp-data').value = l.data; $('inp-desc').value = l.desc || ''; $('orig-busca').value = '';
  $('valor-pre').textContent = SIMB[moeda()];
  $('add-edit-extra').style.display = ''; $('pag-aviso').style.display = 'none';
  irPara('add');
  pintarTipoAdd();
}

// ── Devolução (16/11/2026): entra negativa, na mesma categoria da compra, na data em que o dinheiro voltou ──
function pintarTipoAdd() {
  var a = S.add, dev = a.tipo === 'dev', ed = !!a.editId;
  qsa('#add-tipo [data-addtipo]').forEach(function (b) { b.classList.toggle('on', b.dataset.addtipo === a.tipo); });
  $('add-tipo').style.display = a.parc ? 'none' : '';
  $('add-hdr-title').textContent = a.parc ? 'Editar parcela' : dev ? (ed ? 'Editar Devolução' : 'Registrar Devolução') : (ed ? 'Editar Lançamento' : 'Registrar Gasto');
  $('btn-salvar-pro').innerHTML = ICO('check') + (ed ? 'Salvar alterações' : dev ? 'Salvar devolução' : 'Salvar lançamento');
  $('lbl-valor').textContent = dev ? 'Valor devolvido' : 'Valor Gasto';
  $('lbl-data').textContent = dev ? 'Data da devolução' : 'Data do Gasto';
  $('inp-valor').placeholder = numTxt('0.00');
  $('inp-desc').placeholder = dev ? 'Ex: Devolvi a calça, troca do presente…' : 'Ex: Gasolina no posto, compras da semana…';
  $('card-orig').style.display = dev ? '' : 'none';
  $('card-forma').style.display = 'none'; // opção "crédito na loja" retirada a pedido (16/11/2026); devoluções antigas com crédito continuam valendo
  $('card-parc').style.display = !dev && !ed && COM_PARCELADOS ? '' : 'none'; // parcelamento retirado do app (13/11/2026)
  qsa('#card-forma [data-addlj]').forEach(function (b) { b.classList.toggle('on', (b.dataset.addlj === '1') === !!a.lj); });
  $('forma-dica').textContent = a.lj ? 'O dinheiro não volta para o banco: a loja guarda o valor para você usar lá. O app anota esse crédito, e na próxima compra nessa loja é só escolher "Pagou com crédito da loja".'
    : 'O valor volta no cartão ou na conta. Na conferência com o banco, essa devolução aparece junto do crédito do extrato.';
  renderOrig(); renderCreditoAdd(); atualizarAvisoValor();
}
function compraPorId(id) { return id ? lancamentos().filter(function (x) { return x.id === id && !x.dev; })[0] : null; }
function restaDevolver(orig) { return orig ? c2(orig.valor - (devolvidoPorCompra(S.add.editId)[orig.id] || 0)) : 0; }
function renderOrig() {
  var a = S.add; if (a.tipo !== 'dev') return;
  var o = compraPorId(a.orig), dm = devolvidoPorCompra(a.editId);
  var item = function (l, on) {
    var dv = dm[l.id] || 0;
    return '<button type="button" class="orig-item' + (on ? ' on' : '') + '" data-origem="' + l.id + '"><span class="lanc-ponto" style="background:' + COR(l.cat) + '"></span>' +
      '<span class="oi-tx">' + esc(descLanc(l)) + '<small>' + formatarData(l.data) + ' · ' + esc(NOME(l.cat)) + (dv ? ' · já devolvido ' + formatar(dv) : '') + '</small></span>' +
      '<span class="oi-v">' + formatar(l.valor) + '</span>' + (on ? '<span class="oi-x" data-origtrocar>Trocar</span>' : '') + '</button>';
  };
  $('orig-escolhida').innerHTML = o ? item(o, true) : '';
  $('orig-busca-box').style.display = o ? 'none' : '';
  if (o) return;
  // Lista fechada: só abre quando digita a loja, a descrição, o valor ou o dia (16/11/2026)
  var bruto = $('orig-busca').value.trim(), dt = $('inp-data').value || hoje();
  if (!bruto) { $('orig-lista').innerHTML = '<div class="add-dica">Digite a loja, a descrição, o valor (ex.: 78,20) ou o dia (ex.: 15/11) para achar a compra. Se não quiser ligar a uma compra, escolha só a categoria abaixo.</div>'; return; }
  var termos = bruto.split(/\s+/);
  var bate = function (l) {
    var hay = normNome(descLanc(l) + ' ' + nomeSub(l.cat, l.sub) + ' ' + NOME(l.cat) + ' ' + l.valor.toFixed(2));
    return termos.every(function (t) {
      var d = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/); // dia só com barra: 78.20 e 12,50 são valores
      if (d && +d[1] >= 1 && +d[1] <= 31 && +d[2] >= 1 && +d[2] <= 12) {
        var dd = ('0' + d[1]).slice(-2), mm = ('0' + d[2]).slice(-2), aa = d[3] ? (d[3].length === 2 ? '20' + d[3] : d[3]) : null;
        return l.data.slice(8, 10) === dd && l.data.slice(5, 7) === mm && (!aa || l.data.slice(0, 4) === aa);
      }
      var n = normNome(t); return !n || hay.indexOf(n) >= 0;
    });
  };
  var lista = lancamentos().filter(function (l) { return !l.dev && l.valor > 0 && l.cat !== PARC && l.data <= dt && (dm[l.id] || 0) < l.valor - 0.005; })
    .filter(bate)
    .sort(function (x, y) { return y.data.localeCompare(x.data) || y.ts - x.ts; }).slice(0, 25);
  $('orig-lista').innerHTML = lista.length ? lista.map(function (l) { return item(l, false); }).join('')
    : '<div class="add-dica">Nenhuma compra encontrada com "' + esc(bruto) + '". Tente outro nome, valor ou dia, ou registre sem compra escolhendo a categoria abaixo.</div>';
}
// Subcategoria da compra; se a compra não tinha, procura a que tem o mesmo nome da descrição (ex.: "Costco")
function subDaCompra(o) {
  var c = catPorId(o.cat); if (!c || !c.subs.length) return null;
  if (o.sub && c.subs.some(function (s) { return s.id === o.sub; })) return o.sub;
  var d = normNome(o.desc); if (!d) return null;
  var s = c.subs.filter(function (x) { var n = normNome(x.nome); return n && (n === d || d.indexOf(n) === 0 || n.indexOf(d) === 0); })[0];
  return s ? s.id : null;
}
// Ao escolher ou trocar a compra: categoria e subcategoria vêm dela; valor devolvido e descrição ficam em branco
// para preencher (16/11/2026). manter = vindo da conferência, que já traz valor e descrição do extrato.
function escolherOrig(id, manter) {
  var a = S.add, o = compraPorId(id); if (!o) return;
  a.orig = id; a.cat = o.cat; a.sub = subDaCompra(o);
  if (manter) { if (!$('inp-desc').value.trim()) $('inp-desc').value = descLanc(o).slice(0, 140); }
  else { $('inp-valor').value = ''; $('inp-desc').value = ''; }
  renderAdd(); renderOrig(); atualizarAvisoValor();
}
function renderCreditoAdd() {
  var a = S.add, card = $('card-credito');
  // "pagar com crédito da loja" retirado (16/11/2026): só aparece ao editar uma compra antiga que já usou crédito
  if (!(a.editId && a.cl)) { card.style.display = 'none'; a.cl = null; return; }
  if (a.tipo !== 'compra' || a.parc) { card.style.display = 'none'; return; }
  var cs = creditosLoja(a.editId).filter(function (c) { return c.saldo > 0.005 || c.id === a.cl; });
  if (!cs.length) { card.style.display = 'none'; a.cl = null; return; }
  card.style.display = '';
  $('sel-credito').innerHTML = '<option value="">Não, paguei normalmente</option>' + cs.map(function (c) {
    return '<option value="' + c.id + '"' + (c.id === a.cl ? ' selected' : '') + '>' + esc(c.nome) + ' · saldo ' + formatar(c.saldo) + '</option>';
  }).join('');
  atualizarAvisoValor();
}
function usoCredito() {
  var a = S.add; if (a.tipo !== 'compra' || !a.cl) return null;
  var c = creditosLoja(a.editId).filter(function (x) { return x.id === a.cl; })[0]; if (!c) return null;
  var v = lerValor($('inp-valor').value); v = isFinite(v) && v > 0 ? v : 0;
  return { c: c, usa: c2(Math.min(v, Math.max(0, c.saldo))), v: v };
}
function atualizarAvisoValor() {
  var a = S.add, av = '', v = lerValor($('inp-valor').value);
  if (a.tipo === 'dev' && a.orig) {
    var o = compraPorId(a.orig), resta = restaDevolver(o);
    if (o && v > resta + 0.005) av = 'A compra foi de ' + formatar(o.valor) + (resta < o.valor - 0.005 ? ' e já teve ' + formatar(o.valor - resta) + ' devolvido' : '') + '. Dá para devolver até ' + formatar(resta) + '.';
  }
  $('valor-aviso').textContent = av;
  var u = usoCredito(), d = $('credito-dica');
  if (d) d.textContent = !u ? '' : !u.v ? 'Informe o valor da compra.' :
    formatar(u.usa) + ' sai do crédito da loja' + (u.v > u.usa + 0.005 ? '; o resto (' + formatar(u.v - u.usa) + ') no cartão ou em dinheiro' : '') + '. Sobra ' + formatar(Math.max(0, u.c.saldo - u.usa)) + ' de crédito.';
}
function renderAdd() {
  var a = S.add, editParc = a.editId && a.cat === PARC;
  var tiles = (editParc ? [catParc()] : catsComuns());
  $('add-cats').innerHTML = tiles.length ? tiles.map(function (c) {
    var on = c.id === a.cat;
    return '<div class="cat-tile" data-addcat="' + c.id + '"' + (on ? ' style="border-color:' + c.cor + ';background:' + alfa(c.cor, '12') + ';box-shadow:0 0 0 3px ' + alfa(c.cor, '26') + '"' : '') + '>' +
      '<div class="cat-tile-ic">' + esc(c.emoji) + '</div><div class="cat-tile-nm"' + (on ? ' style="color:' + c.cor + '"' : '') + '>' + esc(c.nome) + '</div></div>';
  }).join('') : '<div class="vazio">Nenhuma categoria. Crie em Ajustes.</div>';
  var cat = catPorId(a.cat);
  var hdr = $('add-header');
  if (cat) {
    hdr.style.background = 'linear-gradient(150deg,' + cat.cor + 'aa,' + cat.cor + ')';
    $('add-hdr-icon').textContent = cat.emoji;
    $('add-hdr-sub').textContent = cat.nome + (cat.subs.length ? ' · subcategoria e valor' : ' · valor e data');
    $('btn-salvar-pro').style.background = 'linear-gradient(135deg,' + cat.cor + 'dd,' + cat.cor + ')';
    $('btn-salvar-pro').style.boxShadow = '0 4px 14px ' + alfa(cat.cor, '55');
  } else {
    hdr.style.background = ''; $('add-hdr-icon').innerHTML = ICO('plus'); $('add-hdr-sub').textContent = 'Selecione a categoria';
    $('btn-salvar-pro').style.background = ''; $('btn-salvar-pro').style.boxShadow = '';
  }
  if (cat && cat.subs.length && cat.id !== PARC) {
    $('grupo-sub').style.display = '';
    $('sub-titulo').textContent = 'Subcategoria — ' + cat.nome;
    $('sub-step').style.background = cat.cor;
    $('sel-sub').innerHTML = '<option value="">— Selecione —</option>' + cat.subs.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === a.sub ? ' selected' : '') + '>' + esc(s.nome) + '</option>';
    }).join('');
  } else $('grupo-sub').style.display = 'none';
}
function atualizarParcUI() {
  var a = S.add, on = a.nParc > 1;
  var btn = $('btn-parcela-toggle');
  btn.textContent = on ? '📦 Parcelado em ' + a.nParc + 'x' : '💳 À vista';
  btn.classList.toggle('ativo', on);
  $('sel-parcelas').style.display = on ? '' : 'none';
  $('grupo-parc-ini').style.display = on ? '' : 'none';
  if (on) {
    var opts = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24, 36, 48];
    $('sel-parcelas').innerHTML = opts.map(function (n) { return '<option value="' + n + '"' + (n === a.nParc ? ' selected' : '') + '>' + n + 'x</option>'; }).join('');
    var ini = '';
    for (var i = 1; i <= a.nParc; i++) ini += '<option value="' + i + '"' + (i === a.parcIni ? ' selected' : '') + '>' + i + 'ª parcela' + (i === 1 ? ' (nova compra)' : '') + '</option>';
    $('sel-parcela-ini').innerHTML = ini;
  }
  atualizarPreviewParcela();
}
function atualizarPreviewParcela() {
  var a = S.add, v = lerValor($('inp-valor').value), pv = $('parcela-preview');
  if (a.nParc > 1 && v > 0) {
    var restantes = a.nParc - a.parcIni + 1;
    pv.textContent = a.nParc + 'x de ' + formatar(Math.round(v / a.nParc * 100) / 100) + ' · ' + restantes + ' parcela(s) serão lançadas, uma por mês, na categoria Parcelados';
  } else pv.textContent = a.nParc > 1 ? 'Informe o valor TOTAL da compra' : '';
}
function salvarLancamento() {
  var a = S.add, valor = lerValor($('inp-valor').value), data = $('inp-data').value, desc = $('inp-desc').value.trim();
  var dev = a.tipo === 'dev';
  if (!$('inp-valor').value.trim()) { mostrarToast('⚠️', dev ? 'Informe o valor devolvido' : 'Informe o valor gasto'); return; }
  if (!(valor > 0)) { mostrarToast('⚠️', 'Valor inválido. Use, por exemplo, 12,50 ou 1.234,56 (até 10 milhões)'); return; }
  if (!data) { mostrarToast('⚠️', 'Selecione a data'); return; }
  if (!a.cat || !catPorId(a.cat)) { mostrarToast('⚠️', 'Escolha uma categoria'); return; }
  var cat = catPorId(a.cat);
  if (cat.subs.length && cat.id !== PARC && !a.sub) { mostrarToast('⚠️', 'Escolha a subcategoria'); return; }
  var o = dev ? compraPorId(a.orig) : null;
  if (o && valor > restaDevolver(o) + 0.005) { mostrarToast('⚠️', 'A devolução passa do valor da compra. Dá para devolver até ' + formatar(restaDevolver(o)) + '.', 4500); return; }
  var u = usoCredito();
  // campos de devolução / crédito na loja, em cima do registro
  var tipar = function (r) {
    delete r.t; delete r.o; delete r.lj; delete r.cl; delete r.clv;
    if (dev) { r.t = 'dev'; if (o) r.o = o.id; if (a.lj) r.lj = 1; }
    else if (u && u.usa > 0) { r.cl = u.c.id; r.clv = Math.round(u.usa * 100); }
    if (a.viaPag && !a.editId && !dev) r.ap = 1;
    return r;
  };
  var ps = [];
  if (a.editId) {
    var r = Object.assign({}, S.raw[a.editId]);
    r.v = Math.round(valor * 100); r.dt = data; r.d = desc;
    if (!r.p) { r.c = a.cat; r.s = a.sub || null; tipar(r); }
    ps.push(gravarLanc(a.editId, r));
    mostrarToast('✅', dev ? 'Devolução atualizada' : 'Lançamento atualizado');
  } else if (dev) {
    ps.push(gravarLanc(Date.now().toString(36) + rid(6), tipar({ v: Math.round(valor * 100), dt: data, c: a.cat, s: a.sub || null, d: desc, por: S.user.uid, ts: Date.now() })));
    mostrarToast('↩️', 'Devolução de ' + formatar(valor) + ' em ' + cat.nome + (a.lj ? ' (crédito na loja)' : ''), 3500);
  } else if (COM_PARCELADOS && a.nParc > 1) {
    var gid = Date.now().toString(36) + rid(4), parcV = Math.round(valor / a.nParc * 100);
    for (var i = a.parcIni - 1, off = 0; i < a.nParc; i++, off++) {
      ps.push(gravarLanc(gid + '-' + (i + 1), {
        v: parcV, dt: addMeses(data, off), c: PARC, s: null, d: desc || cat.nome, por: S.user.uid, ts: Date.now(),
        p: { n: i + 1, total: a.nParc, g: gid, vt: Math.round(valor * 100), origem: a.cat }
      }));
    }
    mostrarToast('📦', 'Parcelamento salvo: ' + a.nParc + 'x de ' + formatar(parcV / 100));
  } else {
    ps.push(gravarLanc(Date.now().toString(36) + rid(6), tipar({ v: Math.round(valor * 100), dt: data, c: a.cat, s: a.sub || null, d: desc, por: S.user.uid, ts: Date.now() })));
    mostrarToast('✅', 'Salvo: ' + formatar(valor) + ' em ' + cat.nome + (u && u.usa > 0 ? ' (' + formatar(u.usa) + ' do crédito da loja)' : ''));
  }
  Promise.all(ps).catch(function () { mostrarToast('⚠️', 'Erro ao salvar. Verifique a conexão.'); });
  var voltar = a.editId ? (S.voltarPara || 'inicio') : (a.voltarConf ? 'ajustes' : 'inicio');
  var reabrirConf = !!a.voltarConf;
  S.add.editId = null; S.add.voltarConf = false; S.add.tipo = 'compra'; S.add.orig = null; S.add.lj = false; S.add.cl = null; S.add.parc = false; S.add.viaPag = false;
  irPara(voltar);
  if (reabrirConf) setTimeout(recalcularConferencia, 250);
}

// Exclusão (com opção de apagar o plano inteiro de parcelas)
function excluir(id) {
  var l = lancamentos().filter(function (x) { return x.id === id; })[0];
  if (!l) return;
  if (l.parcela) {
    var g = l.parcela.grupoId;
    var irmas = lancamentos().filter(function (x) { return x.parcela && x.parcela.grupoId === g; });
    abrirSheet('<h3>🗑️ Excluir parcela</h3><p style="color:#6b7280;font-size:14px">"' + esc(descLanc(l)) + '" faz parte de um parcelamento (' + irmas.length + ' parcela(s) lançadas).</p>' +
      '<button class="aj-btn aj-full" id="ex-uma">Excluir só esta parcela (' + l.parcela.n + '/' + l.parcela.total + ')</button>' +
      '<button class="aj-btn perigo aj-full" id="ex-todas">Excluir o plano inteiro</button>' +
      '<button class="aj-btn aj-full" data-fechar>Cancelar</button>');
    $('ex-uma').onclick = function () { fecharSheet(); apagar([id]); };
    $('ex-todas').onclick = function () { fecharSheet(); apagar(irmas.map(function (x) { return x.id; })); };
    return;
  }
  if (!confirm('Excluir "' + descLanc(l) + '" (' + formatar(l.valor) + ')?')) return;
  apagar([id]);
}
function apagar(ids) {
  ids.forEach(function (id) { delete S.raw[id]; });
  renderLogo();
  Promise.all(ids.map(function (id) { return db.ref('casas/' + S.casa + '/dados/lanc/' + id).remove(); }))
    .then(function () { mostrarToast('🗑️', ids.length > 1 ? ids.length + ' lançamentos excluídos' : 'Lançamento excluído'); },
      function () { mostrarToast('⚠️', 'Erro ao excluir'); });
  if (S.tela === 'add') { S.add.editId = null; irPara(S.voltarPara || 'inicio'); }
}

// ═════════════════════════ PERÍODOS (Histórico, Relatório, Cat., Projeção) ═════════════════════════
function setPer(qual, tipo) {
  S.per[qual] = tipo;
  qsa('[data-per="' + qual + '"] .rel-per-btn').forEach(function (b) { b.classList.toggle('ativo', b.dataset.tipo === tipo); });
  var cd = $(qual + '-custom-datas'); if (cd) cd.style.display = tipo === 'custom' ? 'block' : 'none';
  if (qual === 'hist') $('hist-nav-mes').style.display = tipo === 'mes' ? 'block' : 'none';
  renderTela();
}
function getPer(qual) {
  var t = S.per[qual];
  if (t === 'periodo') return { inicio: S.cfg.periodo.inicio, fim: S.cfg.periodo.fim };
  if (t === 'mes') { var m = qual === 'hist' ? S.mesHist : mesAtual(); return { inicio: m + '-01', fim: ultimoDiaMes(m) }; }
  var ini = $(qual + '-ini').value, fim = $(qual + '-fim').value;
  if (!ini || !fim) return null;
  return ini <= fim ? { inicio: ini, fim: fim } : { inicio: fim, fim: ini };
}

// ═════════════════════════ HISTÓRICO ═════════════════════════
function listaHistorico(per) {
  return lancamentosPeriodo(lancamentos(), per).filter(function (l) { return l.cat !== PARC; })
    .sort(function (a, b) { return b.data.localeCompare(a.data) || b.ts - a.ts; });
}
function renderizarHistorico() {
  $('label-hist').textContent = nomeMes(S.mesHist);
  var per = getPer('hist'), el = $('corpo-historico');
  if (!per) { el.innerHTML = '<div class="vazio">Selecione as datas do período</div>'; return; }
  var lista = listaHistorico(per);
  if (!lista.length) { el.innerHTML = '<div class="vazio">📭 Sem lançamentos neste período</div>'; return; }
  var pm = buildPagasMap(lancamentos()), porDia = {}, dm = devolvidoPorCompra();
  lista.forEach(function (l) { (porDia[l.data] = porDia[l.data] || []).push(l); });
  var total = lista.reduce(function (s, l) { return s + l.valor; }, 0);
  el.innerHTML = '<div class="hist-dia-header" style="background:#eef2ff"><span class="hist-dia-data">Total · ' + lista.length + ' lançamentos</span><span class="hist-dia-total">' + formatar(total) + '</span></div>' +
    Object.keys(porDia).sort(function (a, b) { return b.localeCompare(a); }).map(function (data) {
      var tot = porDia[data].reduce(function (s, l) { return s + l.valor; }, 0);
      return '<div class="hist-dia-header"><span class="hist-dia-data">' + formatarData(data) + '</span><span class="hist-dia-total">' + formatar(tot) + '</span></div>' +
        porDia[data].map(function (l) { return linhaLanc(l, pm, false, 'hist-linha', dm); }).join('');
    }).join('');
}
function compartilharTexto(msg) {
  if (navigator.share) navigator.share({ text: msg }).catch(function () {});
  else window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}
function compartilharHistorico() {
  var per = getPer('hist'), lista = per ? listaHistorico(per) : [];
  if (!lista.length) { mostrarToast('⚠️', 'Sem lançamentos neste período'); return; }
  var total = lista.reduce(function (s, l) { return s + l.valor; }, 0), porDia = {};
  var msg = '📋 *HISTÓRICO — ' + formatarData(per.inicio) + ' → ' + formatarData(per.fim) + '*\n━━━━━━━━━━━━━━━━\n';
  lista.forEach(function (l) { (porDia[l.data] = porDia[l.data] || []).push(l); });
  Object.keys(porDia).sort(function (a, b) { return b.localeCompare(a); }).forEach(function (d) {
    msg += '\n📅 *' + formatarData(d) + '* — ' + formatar(porDia[d].reduce(function (s, l) { return s + l.valor; }, 0)) + '\n';
    porDia[d].forEach(function (l) { var sb = nomeSub(l.cat, l.sub); msg += '  • ' + (l.dev ? '↩ Devolução · ' : '') + NOME(l.cat) + (sb ? ' (' + sb + ')' : '') + ': ' + formatar(l.valor) + (l.desc ? ' — ' + l.desc : '') + '\n'; });
  });
  msg += '\n━━━━━━━━━━━━━━━━\n💰 *Total: ' + formatar(total) + '*\n\n_Enviado via MinhaCasa_';
  compartilharTexto(msg);
}
function abrirImpressao(titulo, corpo) {
  var w = window.open('', '_blank');
  if (!w) { mostrarToast('⚠️', 'Permita pop-ups para gerar o PDF'); return; }
  w.document.write('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(titulo) + '</title><style>' +
    'body{margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:#111827}h1{font-size:20px;margin:0 0 4px}.sub{color:#6b7280;font-size:13px;margin-bottom:16px}' +
    'table{width:100%;border-collapse:collapse}td{padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:13px}.dia td{background:#f8fafc;font-weight:800;color:#475569;font-size:12px;text-transform:uppercase}' +
    '.v{text-align:right;font-weight:700;white-space:nowrap}.tot{margin-top:14px;font-size:16px;font-weight:800;text-align:right}.pill{display:inline-block;margin:0 8px 8px 0;padding:5px 12px;border-radius:20px;font-size:12.5px;font-weight:700;border:1.5px solid}' +
    '@media print{.np{display:none}}</style></head><body>' + corpo +
    '<p class="np" style="margin-top:24px"><button onclick="window.print()" style="padding:10px 18px;font-size:15px;border-radius:10px;border:0;background:#1d4ed8;color:#fff">🖨️ Imprimir / Salvar PDF</button></p>' +
    '<script>setTimeout(function(){window.print()},400)<\/script></body></html>');
  w.document.close();
}
function exportarPDFHistorico() {
  var per = getPer('hist'), lista = per ? listaHistorico(per) : [];
  if (!lista.length) { mostrarToast('⚠️', 'Sem lançamentos neste período'); return; }
  var porDia = {}, totCat = {}, total = 0;
  lista.forEach(function (l) { (porDia[l.data] = porDia[l.data] || []).push(l); totCat[l.cat] = (totCat[l.cat] || 0) + l.valor; total += l.valor; });
  var pills = Object.keys(totCat).map(function (c) { return '<span class="pill" style="color:' + COR(c) + ';border-color:' + COR(c) + ';background:' + alfa(COR(c), '12') + '">' + esc(EMO(c) + ' ' + NOME(c)) + ': ' + formatar(totCat[c]) + '</span>'; }).join('');
  var linhas = Object.keys(porDia).sort(function (a, b) { return b.localeCompare(a); }).map(function (d) {
    return '<tr class="dia"><td colspan="2">' + formatarData(d) + '</td><td class="v">' + formatar(porDia[d].reduce(function (s, l) { return s + l.valor; }, 0)) + '</td></tr>' +
      porDia[d].map(function (l) { return '<tr><td>' + (l.dev ? '↩ ' : '') + esc(descLanc(l)) + (l.dev ? ' <small style="color:#16a34a">(devolução' + (l.lj ? ', crédito na loja' : '') + ')</small>' : '') + '</td><td style="color:#6b7280">' + esc(NOME(l.cat) + (nomeSub(l.cat, l.sub) ? ' · ' + nomeSub(l.cat, l.sub) : '')) + '</td><td class="v" style="' + (l.dev ? 'color:#15803d;background:#dcfce7' : 'color:' + COR(l.cat)) + '">' + formatar(l.valor) + '</td></tr>'; }).join('');
  }).join('');
  abrirImpressao('MinhaCasa — Histórico', '<h1>📋 ' + esc(S.cfg.nome || 'MinhaCasa') + ' — Histórico</h1><div class="sub">' + formatarData(per.inicio) + ' → ' + formatarData(per.fim) + ' · ' + lista.length + ' lançamentos</div>' +
    pills + '<table>' + linhas + '</table><div class="tot">Total: ' + formatar(total) + '</div>');
}

// ═════════════════════════ RELATÓRIO ═════════════════════════
function renderizarRelatorio() {
  var per = getPer('rel'), el = $('corpo-relatorio');
  if (!per) { el.innerHTML = '<div class="vazio">Selecione as datas do período</div>'; return; }
  var T = totaisPeriodo(per), grand = T.comum, lim = baseDisponivel();
  var disp = lim - grand, pctLim = lim > 0 ? grand / lim * 100 : 0;
  var dias = Object.keys(T.porDia).filter(function (d) { return T.porDia[d] > 0; }), diasCom = dias.length, mediaDia = diasCom ? grand / diasCom : 0;
  var maiorDia = '', maiorVal = 0;
  dias.forEach(function (d) { if (T.porDia[d] > maiorVal) { maiorVal = T.porDia[d]; maiorDia = d; } });
  var diasPeriodo = diasEntre(per.inicio, per.fim) + 1;
  // mesma conta da tela Projeção: já gasto + o que ainda deve entrar pela frequência (16/11/2026)
  var hjR = hoje(), passadosR = hjR < per.inicio ? 0 : Math.min(diasPeriodo, diasEntre(per.inicio, hjR) + 1);
  var mediaCorrida = passadosR ? grand / passadosR : 0;
  var projecao = hjR > per.fim ? grand : hjR < per.inicio ? 0 : grand + projecaoFreq(per).aindaVem; // pela frequência de compras (16/11/2026)
  mediaDia = hjR > per.fim ? grand / diasPeriodo : mediaCorrida;
  var corLim = pctLim > 100 ? '#f44336' : pctLim >= 80 ? '#ff9800' : '#1565c0';
  var excede = projecao > 0 && lim > 0 && projecao > lim, dentro = projecao > 0 && lim > 0 && !excede;
  var met = '<div class="rel-metricas">' +
    '<div class="rel-met-card"><div class="rel-met-val" style="color:#1565c0">' + formatar(grand) + '</div><div class="rel-met-lbl">Total Gasto</div><div class="rel-met-sub">' + diasCom + ' dias c/ gasto</div></div>' +
    (lim > 0 ? '<div class="rel-met-card"><div class="rel-met-val" style="color:' + (disp < 0 ? '#f44336' : '#43a047') + '">' + formatar(disp) + '</div><div class="rel-met-lbl">Disponível</div><div class="rel-met-sub">Limite: ' + formatar(lim) + '</div></div>' +
    '<div class="rel-met-card"><div class="rel-met-val" style="color:' + corLim + '">' + pctLim.toFixed(1) + '%</div><div class="rel-met-lbl">% do Limite</div><div class="rel-met-sub">' + T.nComuns + ' lançamentos</div></div>'
    : '') +
    '<div class="rel-met-card" style="background:' + (excede ? '#fef2f2' : dentro ? '#f0fdf4' : 'white') + ';border:' + (excede ? '2px solid #ef4444' : dentro ? '2px solid #22c55e' : 'none') + '">' +
    '<div class="rel-met-val" style="color:' + (excede ? '#ef4444' : dentro ? '#16a34a' : '#555') + '">' + formatar(mediaDia) + '</div><div class="rel-met-lbl">Média por dia</div>' +
    '<div class="rel-met-sub" style="color:' + (excede ? '#ef4444' : dentro ? '#16a34a' : '#9ca3af') + ';font-weight:700">Projeção: ' + formatar(projecao) + '</div></div>' +
    (maiorDia ? '<div class="rel-met-card" style="grid-column:1/-1"><div class="rel-met-val" style="color:#e53935;font-size:15px">' + formatar(maiorVal) + '</div><div class="rel-met-lbl">Maior gasto — ' + formatarData(maiorDia) + '</div></div>' : '') +
    '</div>';
  if (!(lim > 0)) met += '<div class="card" style="cursor:pointer;border:1px solid #fcd34d;background:#fffbeb" id="rel-sem-orc"><div style="color:#b45309;font-size:16px;font-weight:800">Sem orçamento definido</div><div style="font-size:13px;color:#4b5563;margin-top:4px">Toque para informar o limite do período e ver quanto ainda pode gastar. ' + T.nComuns + ' lançamentos no período.</div></div>';

  // Subtotais por subcategoria
  var subTot = {};
  T.lista.forEach(function (l) { if (l.cat === PARC || !l.sub) return; var k = l.cat + '|' + l.sub; subTot[k] = (subTot[k] || 0) + l.valor; });
  var cats = '<div style="font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin:12px 0 8px">Por Categoria</div>' +
    todasCats().filter(function (c) { return (T.tots[c.id] || 0) !== 0; }).map(function (c) { // só categorias com gasto no período (14/11/2026)
      var g = T.tots[c.id] || 0, o = +c.orc || 0, pC = o > 0 ? Math.max(0, Math.min(g / o * 100, 100)) : 0, pTot = grand > 0 ? g / grand * 100 : 0;
      var corB = g > o && o > 0 ? '#f44336' : pC >= 80 ? '#ff9800' : c.cor, restC = o - g;
      var barra = o > 0 ? '<div class="orc-barra-fundo"><div class="orc-barra-fill" style="width:' + pC.toFixed(1) + '%;background:' + corB + '"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:3px"><span style="color:#6b7280">' + pC.toFixed(0) + '% do orçado ' + formatar(o) + '</span>' +
        '<span style="color:' + (restC < 0 ? '#f44336' : '#43a047') + ';font-weight:700">' + (restC >= 0 ? 'sobra ' : 'excedeu ') + formatar(Math.abs(restC)) + '</span></div>' : '';
      var subs = c.subs.map(function (s) {
        var v = subTot[c.id + '|' + s.id]; if (!v) return '';
        return '<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-top:1px solid #f5f5f5"><span style="color:#888">' + esc(s.nome) + '</span><span style="font-weight:700;color:' + c.cor + '">' + formatar(v) + '</span></div>';
      }).join('');
      return '<div class="rel-cat-bloco" style="border-color:' + c.cor + '"><div class="rel-cat-header"><span class="rel-cat-nome">' + esc(c.emoji + ' ' + c.nome) + '</span><span class="rel-cat-pct-total">' + (c.id === PARC ? 'compromisso mensal' : g < 0 ? 'só devolução' : pTot.toFixed(1) + '% do total') + '</span></div>' +
        '<div class="rel-cat-nums"><div class="rel-cat-num"><div class="rel-cat-num-val" style="color:' + c.cor + '">' + formatar(g) + '</div><div class="rel-cat-num-lbl">' + (g < 0 ? 'Devolvido' : 'Gasto') + '</div></div>' +
        (o > 0 ? '<div class="rel-cat-num"><div class="rel-cat-num-val" style="color:#555">' + formatar(o) + '</div><div class="rel-cat-num-lbl">Orçado</div></div>' +
          '<div class="rel-cat-num"><div class="rel-cat-num-val" style="color:' + (restC < 0 ? '#f44336' : '#43a047') + '">' + formatar(Math.abs(restC)) + '</div><div class="rel-cat-num-lbl">' + (restC < 0 ? 'Excedeu' : 'Disponível') + '</div></div>' : '') +
        '</div>' + barra + subs + '</div>';
    }).join('');

  var top5 = T.lista.filter(function (l) { return l.cat !== PARC; }).sort(function (a, b) { return b.valor - a.valor; }).slice(0, 5);
  var top = top5.length ? '<div class="card" style="margin-bottom:8px"><div class="card-titulo">Top 5 Maiores Gastos</div>' + top5.map(function (l, i) {
    return '<div class="rel-top-item"><div class="rel-top-num">' + (i + 1) + '</div><div class="lanc-ponto" style="background:' + COR(l.cat) + ';flex-shrink:0;width:8px;height:8px;border-radius:50%"></div>' +
      '<div class="rel-top-info"><div class="rel-top-desc">' + esc(descLanc(l)) + '</div><div class="rel-top-meta">' + formatarData(l.data) + ' · ' + esc(NOME(l.cat)) + '</div></div>' +
      '<div class="rel-top-val" style="color:' + COR(l.cat) + '">' + formatar(l.valor) + '</div></div>';
  }).join('') + '</div>' : '';

  // "Dias até o limite por categoria" removido a pedido (14/11/2026).

  // Mapa de calor
  var maxDia = 0; dias.forEach(function (d) { if (T.porDia[d] > maxDia) maxDia = T.porDia[d]; });
  var heatDays = [];
  for (var d = per.inicio; d <= per.fim; d = proxDia(d)) { heatDays.push({ date: d, dow: dataObj(d).getDay(), day: +d.slice(8, 10), val: T.porDia[d] || 0 }); if (heatDays.length > 400) break; }
  var cells = '';
  for (var i = 0; i < (heatDays[0] ? heatDays[0].dow : 0); i++) cells += '<div class="heatmap-cell heatmap-empty"></div>';
  heatDays.forEach(function (h) { cells += '<div class="heatmap-cell ' + (!h.val ? 'heatmap-zero' : h.val <= maxDia * .33 ? 'heatmap-low' : h.val <= maxDia * .67 ? 'heatmap-mid' : 'heatmap-high') + '">' + h.day + '</div>'; });
  var heat = '<div class="heatmap-card"><div class="card-titulo">🗓️ Mapa de Calor — Gastos por Dia</div><div class="heatmap-dow-row">' +
    ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(function (l) { return '<div class="heatmap-dow-cell">' + l + '</div>'; }).join('') + '</div><div class="heatmap-grid">' + cells + '</div>' +
    '<div class="heatmap-leg"><div class="heatmap-leg-dot" style="background:#f3f4f6"></div><span class="heatmap-leg-lbl">Sem gasto</span><div class="heatmap-leg-dot" style="background:#bbf7d0"></div><span class="heatmap-leg-lbl">Baixo</span>' +
    '<div class="heatmap-leg-dot" style="background:#fde68a"></div><span class="heatmap-leg-lbl">Médio</span><div class="heatmap-leg-dot" style="background:#fca5a5"></div><span class="heatmap-leg-lbl">Alto</span></div></div>';

  // Semana a semana
  var semanas = [], st = 0, sd = 0;
  heatDays.forEach(function (h, i) { st += h.val; sd++; if ((i + 1) % 7 === 0 || i === heatDays.length - 1) { semanas.push({ lbl: 'Sem ' + (semanas.length + 1), total: st, dias: sd }); st = 0; sd = 0; } });
  var maxSem = semanas.reduce(function (m, s) { return Math.max(m, s.total); }, 0), orcDia = lim > 0 && heatDays.length ? lim / heatDays.length : 0;
  var sem = '<div class="card" style="margin-bottom:8px"><div class="card-titulo">📅 Semana a Semana</div>' + semanas.map(function (s) {
    var pct = maxSem > 0 ? (s.total / maxSem * 100).toFixed(1) : 0, orcSem = orcDia * s.dias, op = orcSem > 0 ? Math.round(s.total / orcSem * 100) : null;
    var cor = op === null ? '#1d4ed8' : op <= 50 ? '#22c55e' : op <= 85 ? '#f59e0b' : '#ef4444';
    return '<div class="semana-row"><div class="semana-lbl">' + s.lbl + (s.dias < 7 ? ' <span style="font-size:10px;color:#6b7280">(' + s.dias + 'd)</span>' : '') + '</div>' +
      '<div class="semana-barra-bg"><div class="semana-barra-fill" style="width:' + pct + '%;background:' + cor + '"></div></div><div class="semana-val" style="color:' + cor + '">' + formatar(s.total) + '</div>' +
      (op !== null ? '<span style="font-size:11px;font-weight:700;color:' + cor + ';min-width:38px;text-align:right">' + op + '%</span>' : '') + '</div>';
  }).join('') + (orcDia > 0 ? '<div style="font-size:11px;color:#6b7280;margin-top:6px;text-align:right">Limite: ' + formatar(lim) + ' ÷ ' + heatDays.length + ' dias</div>' : '') + '</div>';

  el.innerHTML = '<div style="font-size:12px;color:#6b7280;font-weight:600;margin-bottom:10px;text-align:center">📅 ' + formatarData(per.inicio) + ' → ' + formatarData(per.fim) + '</div>' +
    met + cats + top + heat + sem +
    '<div class="card"><button class="btn-whatsapp" id="rel-wa">📱 Enviar por WhatsApp</button></div>';
  if ($('rel-sem-orc')) $('rel-sem-orc').onclick = abrirOrcamentoInicial;
  $('rel-wa').onclick = function () {
    var msg = '📊 *RELATÓRIO — ' + formatarData(per.inicio) + ' → ' + formatarData(per.fim) + '*\n━━━━━━━━━━━━━━━━\n';
    todasCats().forEach(function (c) { var g = T.tots[c.id] || 0; if (g || +c.orc) msg += c.emoji + ' ' + c.nome + ': ' + formatar(g) + (+c.orc ? ' / ' + formatar(c.orc) : '') + '\n'; });
    msg += '━━━━━━━━━━━━━━━━\n💰 *Total gasto: ' + formatar(grand) + '*\n✅ Disponível: ' + formatar(disp) + (lim ? ' (' + pctLim.toFixed(0) + '% usado)' : '') + '\n\n_Enviado via MinhaCasa_';
    compartilharTexto(msg);
  };
}

// ═════════════════════════ POR CATEGORIA ═════════════════════════
function renderizarRelcat() {
  var abas = COM_PARCELADOS ? todasCats().concat([{ id: '_planos', emoji: '📊', nome: 'Planos', cor: '#7c3aed' }]) : todasCats();
  // Só aparecem as categorias com gasto no período escolhido (14/11/2026)
  var perAbas = getPer('relcat');
  if (perAbas) {
    var comGasto = {}, todosL = lancamentos();
    lancamentosPeriodo(todosL, perAbas).forEach(function (l) { comGasto[l.cat] = true; });
    if (todosL.some(function (l) { return l.parcela; })) comGasto[PARC] = true;
    abas = abas.filter(function (a) { return a.id === '_planos' || comGasto[a.id]; });
    if (!abas.length || (abas.length === 1 && abas[0].id === '_planos' && S.rcCat !== '_planos')) {
      $('relcat-tabs').innerHTML = abas.length ? '<button class="relcat-tab" data-rc="_planos">📊<br>Planos</button>' : '';
      $('relcat-per-card').style.display = '';
      $('corpo-relcat').innerHTML = '<div class="vazio">📭 Nenhum gasto neste período</div>';
      return;
    }
  }
  if (!S.rcCat || !abas.some(function (a) { return a.id === S.rcCat; })) S.rcCat = abas[0].id;
  $('relcat-tabs').innerHTML = abas.map(function (a) {
    var on = a.id === S.rcCat;
    return '<button class="relcat-tab" data-rc="' + a.id + '"' + (on ? ' style="border-color:' + a.cor + ';background:' + alfa(a.cor, '12') + ';color:' + a.cor + '"' : '') + '>' + esc(a.emoji) + '<br>' + esc(a.nome) + '</button>';
  }).join('');
  var el = $('corpo-relcat');
  $('relcat-per-card').style.display = S.rcCat === '_planos' ? 'none' : '';
  if (S.rcCat === '_planos') { el.innerHTML = renderizarPlanos(); return; }
  var per = getPer('relcat');
  if (!per) { el.innerHTML = '<div class="vazio">Selecione as datas do período</div>'; return; }
  var c = catPorId(S.rcCat), cor = c.cor, orc = +c.orc || 0, todos = lancamentos(), lista, total;
  if (c.id === PARC) {
    var ult = {};
    todos.forEach(function (l) { if (l.parcela) { var g = l.parcela.grupoId; if (!ult[g] || l.data > ult[g].data) ult[g] = l; } });
    lista = Object.keys(ult).map(function (g) { return ult[g]; });
    total = calcularMensalParcelados(todos);
  } else {
    lista = lancamentosPeriodo(todos, per).filter(function (l) { return l.cat === c.id; });
    total = lista.reduce(function (s, l) { return s + l.valor; }, 0);
  }
  lista.sort(function (a, b) { return b.data.localeCompare(a.data); });
  if (!lista.length) { el.innerHTML = '<div class="vazio">📭 Nenhum lançamento neste período</div>'; return; }
  var subTots = {};
  lista.forEach(function (l) { var k = c.id === PARC ? descLanc(l) : (nomeSub(l.cat, l.sub) || '—'); subTots[k] = (subTots[k] || 0) + l.valor; });
  var subKeys = Object.keys(subTots).sort(function (a, b) { return subTots[b] - subTots[a]; }), maxSub = subKeys.length ? subTots[subKeys[0]] : 1;
  var porDia = {};
  lista.forEach(function (l) { porDia[l.data] = (porDia[l.data] || 0) + l.valor; });
  var diasCom = Object.keys(porDia).filter(function (d) { return porDia[d] > 0; }).length, mediaDia = diasCom ? total / diasCom : 0;
  var nCompras = lista.filter(function (l) { return l.valor > 0; }).length;
  var maior = lista.reduce(function (m, l) { return l.valor > (m.valor || 0) ? l : m; }, {});
  var pctOrc = orc > 0 ? Math.max(0, Math.min(total / orc * 100, 100)) : 0, corB = total > orc && orc > 0 ? '#f44336' : pctOrc >= 80 ? '#ff9800' : cor;
  var hero = '<div class="card" style="margin-bottom:10px"><div class="relcat-hero"><div class="relcat-hero-val" style="color:' + cor + '">' + formatar(total) + '</div>' +
    '<div class="relcat-hero-sub">' + (c.id === PARC ? lista.length + ' planos · compromisso mensal' : lista.length + ' lançamentos · ' + formatarData(per.inicio) + ' → ' + formatarData(per.fim)) + '</div></div>' +
    (orc > 0 ? '<div class="orc-barra-fundo" style="height:10px;margin-top:8px"><div class="orc-barra-fill" style="width:' + pctOrc.toFixed(1) + '%;background:' + corB + '"></div></div>' +
      '<div class="relcat-orc-row"><span style="color:#6b7280">Orçado: ' + formatar(orc) + '</span><span style="color:' + corB + ';font-weight:800">' + pctOrc.toFixed(1) + '% utilizado</span>' +
      '<span style="color:' + (total > orc ? '#f44336' : '#43a047') + ';font-weight:700">' + (total > orc ? 'Excedeu ' : 'Sobra ') + formatar(Math.abs(orc - total)) + '</span></div>' : '') + '</div>';
  var stats = '<div class="relcat-stats">' +
    '<div class="relcat-stat"><div class="relcat-stat-val" style="color:' + cor + '">' + formatar(mediaDia) + '</div><div class="relcat-stat-lbl">Média por dia c/ gasto</div></div>' +
    '<div class="relcat-stat"><div class="relcat-stat-val" style="color:#374151">' + diasCom + '</div><div class="relcat-stat-lbl">Dias com gasto</div></div>' +
    (maior.valor ? '<div class="relcat-stat"><div class="relcat-stat-val" style="color:#e53935">' + formatar(maior.valor) + '</div><div class="relcat-stat-lbl">Maior gasto · ' + formatarData(maior.data) + '</div></div>' : '') +
    '<div class="relcat-stat"><div class="relcat-stat-val" style="color:#374151">' + (nCompras ? formatar(total / nCompras) : '—') + '</div><div class="relcat-stat-lbl">Média por compra</div></div></div>';
  var subs = '<div class="card" style="margin-bottom:10px"><div class="card-titulo">' + (c.id === PARC ? 'Por Plano' : 'Por Subcategoria') + '</div>' + subKeys.map(function (k) {
    var v = subTots[k];
    return '<div class="relcat-sub-row"><div class="relcat-sub-nome">' + esc(k) + '</div><div class="relcat-sub-bar-wrap"><div class="relcat-sub-bar-fill" style="width:' + (v / maxSub * 100).toFixed(1) + '%;background:' + cor + '"></div></div>' +
      '<div class="relcat-sub-val" style="color:' + cor + '">' + formatar(v) + '</div><div class="relcat-sub-pct">' + (total > 0 ? (v / total * 100).toFixed(0) : 0) + '%</div></div>';
  }).join('') + '</div>';
  var pm = buildPagasMap(todos);
  var acoes = '<div class="card" style="display:flex;gap:10px;margin-bottom:10px">' +
    '<button style="flex:1;padding:13px 8px;border:none;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;background:' + cor + ';color:#fff;font-family:inherit" id="rc-pdf">🖨️ PDF</button>' +
    '<button style="flex:1;padding:13px 8px;border:none;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;background:#25d366;color:#fff;font-family:inherit" id="rc-wa">📱 WhatsApp</button></div>';
  var lst = '<div class="card"><div class="card-titulo">Lançamentos (' + lista.length + ')</div>' + lista.map(function (l) { return linhaLanc(l, pm, true); }).join('') + '</div>';
  el.innerHTML = hero + stats + subs + acoes + lst;
  $('rc-wa').onclick = function () {
    var msg = c.emoji + ' *' + c.nome.toUpperCase() + '* — ' + formatarData(per.inicio) + ' → ' + formatarData(per.fim) + '\n━━━━━━━━━━━━━━━━\n';
    subKeys.forEach(function (k) { msg += '• ' + k + ': ' + formatar(subTots[k]) + '\n'; });
    msg += '━━━━━━━━━━━━━━━━\n💰 *Total: ' + formatar(total) + '*' + (orc ? ' / orçado ' + formatar(orc) : '') + '\n\n_Enviado via MinhaCasa_';
    compartilharTexto(msg);
  };
  $('rc-pdf').onclick = function () {
    abrirImpressao('MinhaCasa — ' + c.nome, '<h1>' + esc(c.emoji + ' ' + c.nome) + '</h1><div class="sub">' + formatarData(per.inicio) + ' → ' + formatarData(per.fim) + ' · ' + lista.length + ' lançamentos</div>' +
      '<table>' + subKeys.map(function (k) { return '<tr><td>' + esc(k) + '</td><td class="v">' + formatar(subTots[k]) + '</td></tr>'; }).join('') + '</table>' +
      '<h3 style="margin-top:20px">Lançamentos</h3><table>' + lista.map(function (l) { return '<tr><td>' + formatarData(l.data) + '</td><td>' + esc(descLanc(l)) + '</td><td class="v">' + formatar(l.valor) + '</td></tr>'; }).join('') + '</table>' +
      '<div class="tot">Total: ' + formatar(total) + (orc ? ' · Orçado: ' + formatar(orc) : '') + '</div>');
  };
}
function renderizarPlanos() {
  var planos = planosAtivos(lancamentos()).sort(function (a, b) { return (a.quitado - b.quitado) || b.valorParc - a.valorParc; });
  if (!planos.length) return '<div class="vazio">📦 Nenhum parcelamento.<br>Ao registrar um gasto, toque em <b>À vista</b> para parcelar.</div>';
  return planos.map(function (p) {
    var pct = p.total ? p.pagas / p.total * 100 : 0, restante = (p.total - p.pagas) * p.valorParc;
    var nums = '';
    for (var n = 1; n <= p.total; n++) nums += '<span class="parc-num ' + (n <= p.pagas ? 'parc-num-paga' : p.lancs[n] ? 'parc-num-futura' : 'parc-num-ausente') + '">' + n + '</span>';
    return '<div class="parc-grupo-card"><div class="parc-grupo-hdr"><div><div class="parc-grupo-desc">' + esc(p.desc) + (p.quitado ? ' ✅' : '') + '</div>' +
      '<div class="parc-grupo-sub">' + p.pagas + '/' + p.total + ' pagas · ' + formatar(p.valorParc) + '/mês' + (p.valorTotal ? ' · total ' + formatar(p.valorTotal) : '') + '</div></div>' +
      '<div class="parc-grupo-val">' + (p.quitado ? 'Quitado' : formatar(restante)) + '</div></div>' +
      '<div class="parc-barra-wrap"><div class="parc-barra-fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
      '<div class="parc-numeros">' + nums + '</div>' +
      (!p.quitado ? '<button class="aj-btn perigo" style="margin-top:10px" data-cancelar-plano="' + p.gid + '">Cancelar parcelas futuras</button>' : '') + '</div>';
  }).join('');
}
function cancelarPlano(gid) {
  var hj = hoje(), fut = lancamentos().filter(function (l) { return l.parcela && l.parcela.grupoId === gid && l.data > hj; });
  if (!fut.length) { mostrarToast('ℹ️', 'Não há parcelas futuras'); return; }
  if (!confirm('Excluir ' + fut.length + ' parcela(s) futura(s) deste plano? As já pagas ficam no histórico.')) return;
  apagar(fut.map(function (l) { return l.id; }));
}

// ═════════════════════════ PROJEÇÃO PELA FREQUÊNCIA (16/11/2026) ═════════════════════════
// Em vez de "gasto por dia × dias do período": para cada lugar (subcategoria ou
// descrição), quantas vezes você vai por período e quanto gasta por ida, nos
// períodos anteriores do mesmo tamanho (até 6). Nos dias que faltam conta o MENOR entre
//   • frequência × (dias que faltam ÷ dias do período)  (o ritmo normal) e
//   • frequência − idas que já fez neste período        (o que falta para o normal).
// Ex.: Costco 2×/período e já foi 2× → não conta mais nenhuma ida.
// Compra sem histórico não é repetida. Sem histórico nenhum, usa o ritmo por dia.
// nome comparável: sem acento, emoji, espaço ou apóstrofo (McDonald's = McDonalds = Mc Donalds) (16/11/2026)
function normNome(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function lugarDe(l) {
  var nome = nomeSub(l.cat, l.sub) || (l.desc ? String(l.desc).trim() : '') || NOME(l.cat);
  return { chave: l.cat + '|' + (normNome(nome) || nome.toLowerCase()), nome: nome };
}
function periodosAnteriores(p, qtd) {
  var N = diasEntre(p.inicio, p.fim) + 1, mensal = N >= 28 && N <= 31, out = [];
  for (var j = 1; j <= qtd; j++) {
    var ini, fim;
    if (mensal) { ini = addMeses(p.inicio, -j); var prox = addMeses(p.inicio, -j + 1), d = dataObj(prox); d.setDate(d.getDate() - 1); fim = isoDe(d); }
    else { var a = dataObj(p.inicio); a.setDate(a.getDate() - N * j); ini = isoDe(a); var b = dataObj(ini); b.setDate(b.getDate() + N - 1); fim = isoDe(b); }
    out.push({ inicio: ini, fim: fim });
  }
  return out;
}
function projecaoFreq(p) {
  var todos = lancamentos().filter(function (l) { return l.cat !== PARC && l.data; }), hj = hoje();
  var N = diasEntre(p.inicio, p.fim) + 1;
  var ate = hj < p.fim ? hj : p.fim;
  var passados = hj < p.inicio ? 0 : diasEntre(p.inicio, ate) + 1, rest = Math.max(0, N - passados);
  var prim = todos.reduce(function (m, l) { return l.data < m ? l.data : m; }, hj);
  // períodos anteriores com dados (para no primeiro de antes do 1º lançamento)
  var H = [];
  periodosAnteriores(p, 6).some(function (h) {
    if (h.fim < prim || diasEntre(h.inicio < prim ? prim : h.inicio, h.fim) + 1 < 0.8 * (diasEntre(h.inicio, h.fim) + 1)) return true;
    H.push(h); return false;
  });
  var m = {}, gasto = 0;
  function pega(l) { var g = lugarDe(l); if (!m[g.chave]) m[g.chave] = { chave: g.chave, nome: g.nome, cat: l.cat, nH: 0, vH: 0, n: 0, v: 0 }; return m[g.chave]; }
  // idas = DIAS em que comprou ali (várias peças no mesmo dia = 1 ida)
  H.forEach(function (h) { todos.forEach(function (l) { if (l.data < h.inicio || l.data > h.fim) return; var s = pega(l); s.vH += l.valor; s.dH = s.dH || {}; if (l.valor > 0 && !s.dH[l.data]) { s.dH[l.data] = 1; s.nH++; } }); });
  todos.forEach(function (l) { if (l.data < p.inicio || l.data > ate) return; var s = pega(l); s.v += l.valor; gasto += l.valor; s.dA = s.dA || {}; if (l.valor > 0 && !s.dA[l.data]) { s.dA[l.data] = 1; s.n++; } });
  var R = { gasto: gasto, aindaVem: 0, cat: {}, lugares: [], nHist: H.length, linear: !H.length, rest: rest, passados: passados, N: N };
  Object.keys(m).forEach(function (k) {
    var s = m[k];
    if (R.linear) { s.freq = 0; s.ticket = s.n ? s.v / s.n : 0; s.esperV = passados ? s.v * rest / passados : 0; s.esperN = s.ticket ? s.esperV / s.ticket : 0; }
    else { s.freq = s.nH / H.length; s.ticket = s.nH ? s.vH / s.nH : 0; s.esperN = Math.min(s.freq * rest / N, Math.max(0, s.freq - s.n)); s.esperV = s.esperN * s.ticket; }
    R.aindaVem += s.esperV; R.cat[s.cat] = (R.cat[s.cat] || 0) + s.esperV; R.lugares.push(s);
  });
  R.lugares.sort(function (a, b) { return b.esperV - a.esperV; });
  R.final = gasto + R.aindaVem;
  return R;
}
// frequência em número inteiro ("17 vezes", "1 vez", "menos de 1 vez") e idas nos dias que faltam (16/11/2026)
function vezesF(x) { x = +x || 0; var r = Math.round(x); return x < 0.75 ? 'menos de 1 vez' : r === 1 ? '1 vez' : r + ' vezes'; }
function idasFaltamF(e) {
  if (e < 0.95) return 'talvez 1 (' + Math.round(e * 100) + '% de chance)';
  var r = Math.round(e); return Math.abs(e - r) < 0.25 ? 'cerca de ' + r + (r === 1 ? ' vez' : ' vezes') : Math.floor(e) + ' a ' + Math.ceil(e) + ' vezes';
}

// ═════════════════════════ PROJEÇÃO ═════════════════════════
function atualizarProjecao() {
  var p = getPer('proj');
  if (COM_PARCELADOS) { renderizarTermometroDivida(); renderizarProjecaoParcelados(); }
  else { $('proj-termometro').innerHTML = ''; $('proj-parcelados').innerHTML = ''; }
  var lim = baseDisponivel();
  $('proj-sem-limite').style.display = lim > 0 ? 'none' : '';
  $('proj-conteudo').style.display = lim > 0 && p ? '' : 'none';
  if (!p || lim <= 0) { $('proj-subtitle').textContent = '—'; $('proj-badge').textContent = ''; $('proj-badge').className = 'proj-badge'; return; }
  var T = totaisPeriodo(p), hj = hoje(), gasto = T.comum;
  var totalDias = Math.max(1, diasEntre(p.inicio, p.fim) + 1);
  var passados = Math.min(totalDias, Math.max(1, diasEntre(p.inicio, hj) + 1)), restantes = Math.max(0, totalDias - passados);
  var PF = projecaoFreq(p);
  var realDia = gasto / passados, projFinal = hj > p.fim ? gasto : gasto + PF.aindaVem, orcRest = lim - gasto;
  var metaDia = restantes > 0 ? Math.max(0, orcRest) / restantes : 0, desvio = realDia - metaDia;
  var pctTempo = passados / totalDias * 100, pctGasto = Math.min(120, gasto / lim * 100);
  function fmtD(v) { return formatar(Math.abs(v)); }
  $('proj-subtitle').textContent = 'Limite ' + formatar(lim) + ' · Gasto: ' + formatar(gasto) + ' · Livre ' + formatar(lim - gasto);
  var badge = $('proj-badge');
  if (projFinal > lim) { badge.textContent = '⚠️ Vai exceder'; badge.className = 'proj-badge over'; }
  else if (desvio > metaDia * 0.15) { badge.textContent = '📈 Acima'; badge.className = 'proj-badge warn'; }
  else { badge.textContent = '✅ No controle'; badge.className = 'proj-badge ok'; }
  $('proj-padrao').textContent = orcRest <= 0 ? formatar(0) : fmtD(metaDia);
  $('proj-padrao').nextElementSibling.textContent = orcRest <= 0 ? 'limite já passado' : 'meta/dia restante';
  $('proj-real').textContent = fmtD(realDia);
  $('proj-desvio').textContent = (desvio >= 0 ? '+' : '−') + fmtD(desvio);
  $('proj-desvio').style.color = desvio > 0 ? '#f87171' : '#4ade80';
  $('proj-desvio-sub').textContent = desvio > 0 ? 'acima/dia' : 'abaixo/dia';
  $('proj-btempo').style.width = pctTempo.toFixed(1) + '%';
  $('proj-ptempo').textContent = Math.round(pctTempo) + '%';
  var corG = pctGasto > 100 ? '#f87171' : pctGasto > 85 ? '#fbbf24' : '#4ade80';
  $('proj-bgasto').style.width = Math.min(100, pctGasto).toFixed(1) + '%'; $('proj-bgasto').style.background = corG;
  $('proj-pgasto').textContent = Math.round(pctGasto) + '%'; $('proj-pgasto').style.color = corG;
  var sa = lim - gasto;
  $('proj-saldo-atual').textContent = (sa >= 0 ? '+ ' : '− ') + formatar(Math.abs(sa)); $('proj-saldo-atual').style.color = sa >= 0 ? '#4ade80' : '#f87171';
  $('proj-saldo-atual-sub').textContent = sa >= 0 ? 'disponível' : 'acima do limite';
  var sf = lim - projFinal;
  $('proj-final').textContent = (sf >= 0 ? '+ ' : '− ') + formatar(Math.abs(sf)); $('proj-final').style.color = sf >= 0 ? '#4ade80' : '#f87171';
  $('proj-final-sub').textContent = hj > p.fim ? (sf >= 0 ? 'sobrou' : 'excedeu') : (sf >= 0 ? 'sobrando' : 'excedendo') + (PF.linear ? ' se mantiver o ritmo por dia' : ' pela sua frequência de compras');
  renderizarFreqProjecao(PF, gasto, projFinal, lim, hj > p.fim);
  renderizarGraficoProjecao(T, p, lim, hj, projFinal);
}
// o que ainda deve entrar e onde você foi mais vezes que o normal (16/11/2026)
function renderizarFreqProjecao(PF, gasto, projFinal, lim, acabou) {
  var el = $('proj-freq'); if (!el) return;
  if (acabou) { el.innerHTML = ''; return; }
  var base = PF.linear ? 'no ritmo por dia (ainda não há período anterior para medir a sua frequência)' : 'pela sua frequência nos ' + PF.nHist + ' períodos anteriores';
  var h = '<div class="proj-freq-txt">' + (PF.rest > 0 ? 'Faltam <b>' + PF.rest + (PF.rest === 1 ? ' dia' : ' dias') + '</b>. ' + (PF.aindaVem >= 1 ? 'Ainda devem entrar cerca de <b>' + formatar(PF.aindaVem) + '</b>, ' + base : 'Não deve entrar mais nada, ' + base) +
    ' → fecha em <b style="color:' + (projFinal > lim ? '#f87171' : '#4ade80') + '">' + formatar(projFinal) + '</b> (' + Math.round(projFinal / lim * 100) + '% do limite).' : 'Último dia do período.') + '</div>';
  if (!PF.linear) {
    var cont = {}; PF.lugares.forEach(function (s) { var k = s.nome.toLowerCase(); cont[k] = (cont[k] || 0) + 1; });
    var nomeL = function (s) { return '<b>' + esc(s.nome) + '</b>' + (cont[s.nome.toLowerCase()] > 1 ? ' <span style="opacity:.6;font-weight:400">(' + esc(NOME(s.cat)) + ')</span>' : ''); };
    var vem = PF.lugares.filter(function (s) { return s.esperV >= 5; }).slice(0, 5);
    if (PF.rest > 0 && vem.length) {
      var ex = vem.filter(function (s) { return s.esperN < 0.95; })[0];
      h += '<div class="proj-freq-tit">O que ainda deve entrar (pelo seu costume)</div>' + vem.map(function (s) {
        return '<div class="proj-freq-row"><span>' + nomeL(s) + '<small>costuma ir ' + vezesF(s.freq) + ' por período, ' + formatar(s.ticket) + ' cada · neste período: ' + (s.n ? s.n + (s.n === 1 ? ' vez' : ' vezes') : 'nenhuma') + ' · nos ' + PF.rest + (PF.rest === 1 ? ' dia' : ' dias') + ' que faltam: ' + idasFaltamF(s.esperN) + '</small></span><span>' + formatar(s.esperV) + '</span></div>'; }).join('') +
        '<div style="font-size:10.5px;opacity:.55;margin-top:6px;line-height:1.4">Conta só as idas que ainda cabem no seu costume. ' + (ex ? 'Quando é menos de uma ida, entra só a parte da chance: ' + esc(ex.nome) + ' tem ' + Math.round(ex.esperN * 100) + '% de chance × ' + formatar(ex.ticket) + ' ≈ ' + formatar(ex.esperV) + '. ' : '') + 'Se você não for, fecha abaixo disso.</div>';
    }
    var mais = PF.lugares.filter(function (s) { return s.n >= 2 && s.n >= s.freq + 1; }).map(function (s) { s.extraV = s.v - s.freq * s.ticket; return s; })
      .filter(function (s) { return s.extraV >= 10; }).sort(function (a, b) { return b.extraV - a.extraV; }).slice(0, 5);
    if (mais.length) h += '<div class="proj-freq-tit">Neste período você foi mais vezes que de costume</div>' + mais.map(function (s) {
      return '<div class="proj-freq-row"><span>' + nomeL(s) + '<small>' + s.n + ' vezes, ' + formatar(s.v) + ' · você costuma ir ' + vezesF(s.freq) + ' por período</small></span><span style="color:#f87171">+ ' + formatar(s.extraV) + '</span></div>'; }).join('');
    var novos = PF.lugares.filter(function (s) { return !s.nH && s.v >= 50; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 4);
    if (novos.length) h += '<div class="proj-freq-tit">Gastos que não aparecem antes (não projetados de novo)</div>' + novos.map(function (s) {
      return '<div class="proj-freq-row"><span>' + nomeL(s) + '</span><span>' + formatar(s.v) + '</span></div>'; }).join('');
  }
  el.innerHTML = h;
}
function renderizarGraficoProjecao(T, p, lim, hj, projFinal) {
  var dias = [];
  for (var d = p.inicio; d <= p.fim; d = proxDia(d)) { dias.push(d); if (dias.length > 400) break; }
  var N = dias.length, acum = 0;
  var cumReal = dias.map(function (dt) { if (dt <= hj) { acum += T.porDia[dt] || 0; return acum; } return null; });
  var cumOrc = dias.map(function (dt, i) { return lim * (i + 1) / N; });
  var maxY = Math.max(lim * 1.08, acum * 1.08, (projFinal || 0) * 1.08, 1), todayIdx = dias.indexOf(hj);
  var W = 320, H = 190, pL = 46, pR = 14, pT = 14, pB = 28, cW = W - pL - pR, cH = H - pT - pB;
  function xp(i) { return pL + (N > 1 ? i / (N - 1) * cW : cW / 2); }
  function yp(v) { return pT + cH - (v / maxY * cH); }
  function fmtY(v) { return v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'k' : '$' + Math.round(v); }
  var orcPath = dias.map(function (dt, i) { return (i ? 'L' : 'M') + xp(i).toFixed(1) + ',' + yp(cumOrc[i]).toFixed(1); }).join(' ');
  var pts = cumReal.map(function (v, i) { return v !== null ? { x: xp(i), y: yp(v) } : null; }).filter(Boolean);
  var realPath = pts.map(function (pt, i) { return (i ? 'L' : 'M') + pt.x.toFixed(1) + ',' + pt.y.toFixed(1); }).join(' ');
  var area = pts.length ? realPath + ' L' + pts[pts.length - 1].x.toFixed(1) + ',' + (pT + cH) + ' L' + pL + ',' + (pT + cH) + ' Z' : '';
  var corR = acum <= lim ? '#4ade80' : '#f87171', corA = acum <= lim ? 'rgba(74,222,128,.12)' : 'rgba(248,113,113,.12)';
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block">' +
    [0, lim / 2, lim].map(function (v) { var y = yp(v).toFixed(1); return '<line x1="' + pL + '" y1="' + y + '" x2="' + (W - pR) + '" y2="' + y + '" stroke="rgba(255,255,255,.08)"/><text x="' + (pL - 5) + '" y="' + (+y + 3.5) + '" text-anchor="end" font-size="8.5" fill="rgba(255,255,255,.4)" font-family="system-ui,sans-serif">' + fmtY(v) + '</text>'; }).join('') +
    '<line x1="' + pL + '" y1="' + yp(lim).toFixed(1) + '" x2="' + (W - pR) + '" y2="' + yp(lim).toFixed(1) + '" stroke="#fbbf24" stroke-dasharray="3,3" opacity=".6"/>' +
    (area ? '<path d="' + area + '" fill="' + corA + '"/>' : '') +
    '<path d="' + orcPath + '" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-dasharray="5,3"/>' +
    (realPath ? '<path d="' + realPath + '" fill="none" stroke="' + corR + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' : '') +
    (todayIdx >= 0 && todayIdx < N - 1 && projFinal > 0 ? '<line x1="' + xp(todayIdx).toFixed(1) + '" y1="' + yp(cumReal[todayIdx]).toFixed(1) + '" x2="' + xp(N - 1).toFixed(1) + '" y2="' + yp(projFinal).toFixed(1) + '" stroke="' + (projFinal > lim ? '#f87171' : '#4ade80') + '" stroke-width="1.8" stroke-dasharray="4,3" opacity=".8"/><circle cx="' + xp(N - 1).toFixed(1) + '" cy="' + yp(projFinal).toFixed(1) + '" r="3" fill="' + (projFinal > lim ? '#f87171' : '#4ade80') + '"/>' : '') +
    (todayIdx >= 0 ? '<line x1="' + xp(todayIdx).toFixed(1) + '" y1="' + pT + '" x2="' + xp(todayIdx).toFixed(1) + '" y2="' + (pT + cH) + '" stroke="rgba(255,255,255,.2)" stroke-dasharray="3,3"/>' +
      '<circle cx="' + xp(todayIdx).toFixed(1) + '" cy="' + yp(cumReal[todayIdx]).toFixed(1) + '" r="4.5" fill="' + corR + '" stroke="#0f172a" stroke-width="2"/>' +
      '<text x="' + xp(todayIdx).toFixed(1) + '" y="' + (pT - 3) + '" text-anchor="middle" font-size="8" fill="rgba(255,255,255,.5)" font-family="system-ui,sans-serif">hoje</text>' : '') +
    [0, Math.floor(N / 2), N - 1].map(function (i) { var dt = dias[i]; return '<text x="' + xp(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,.4)" font-family="system-ui,sans-serif">' + (+dt.slice(8, 10)) + '/' + (+dt.slice(5, 7)) + '</text>'; }).join('') +
    '</svg>';
  $('proj-grafico').innerHTML = svg;
}
function renderizarTermometroDivida() {
  var planos = planosAtivos(lancamentos()).filter(function (p) { return !p.quitado; }), el = $('proj-termometro');
  if (!planos.length) { el.innerHTML = ''; return; }
  var saldoHoje = planos.reduce(function (s, p) { return s + (p.total - p.pagas) * p.valorParc; }, 0);
  var totalOrig = planos.reduce(function (s, p) { return s + p.total * p.valorParc; }, 0), pctPago = totalOrig > 0 ? (totalOrig - saldoHoje) / totalOrig * 100 : 0;
  var base = new Date(); base.setDate(1);
  var html = '<div class="card" style="margin-bottom:14px;border-left:4px solid #dc2626"><div class="card-titulo" style="color:#7f1d1d">💳 Termômetro da Dívida</div>' +
    '<div style="font-size:.72rem;color:#6b7280;margin-bottom:10px">Total ainda a pagar em todos os planos ativos</div>' +
    '<div class="termo-total-row"><div class="termo-total-val">' + formatar(saldoHoje) + '</div><div class="termo-total-pago"><span style="color:#16a34a;font-weight:800">' + pctPago.toFixed(0) + '%</span> já pago<br><span style="font-size:10px">Total original: ' + formatar(totalOrig) + '</span></div></div>' +
    '<div class="termo-prog-bg"><div class="termo-prog-fill" style="width:' + pctPago.toFixed(1) + '%"></div></div>';
  for (var i = 0; i < 48; i++) {
    var dt = new Date(base); dt.setMonth(base.getMonth() + i);
    var saldo = planos.reduce(function (s, p) { var r = p.total - p.pagas - i; return s + (r > 0 ? r * p.valorParc : 0); }, 0);
    var quit = planos.filter(function (p) { return p.pagas + i < p.total && p.pagas + i + 1 === p.total; }).map(function (p) { return p.desc; });
    var badge = (i === 0 ? '<span class="parc-proj-badge parc-proj-hoje">hoje</span> ' : '') + quit.map(function (d) { return '<span class="termo-badge-ok">✓ ' + esc(d) + '</span> '; }).join('');
    if (saldo > 0) html += '<div class="termo-row"><div class="termo-mes">' + MESES_C[dt.getMonth()] + '/' + String(dt.getFullYear()).slice(2) + '</div>' +
      '<div class="termo-barra-bg"><div class="termo-barra-fill" style="width:' + (saldoHoje > 0 ? saldo / saldoHoje * 100 : 0).toFixed(1) + '%"></div></div><div class="termo-val">' + formatar(saldo) + '</div>' +
      (badge ? '<div style="display:flex;gap:3px;flex-wrap:wrap">' + badge + '</div>' : '') + '</div>';
    if (saldo <= 0) break;
  }
  el.innerHTML = html + '</div>';
}
function renderizarProjecaoParcelados() {
  var planos = planosAtivos(lancamentos()).filter(function (p) { return !p.quitado; }), el = $('proj-parcelados');
  if (!planos.length) { el.innerHTML = ''; return; }
  var base = new Date(); base.setDate(1);
  var linhas = [], maxBar = 0;
  for (var i = 0; i < 24; i++) {
    var dt = new Date(base); dt.setMonth(base.getMonth() + i);
    var tot = 0, quit = [];
    planos.forEach(function (p) { if (p.pagas + i < p.total) { tot += p.valorParc; if (p.pagas + i + 1 === p.total) quit.push(p.desc); } });
    maxBar = Math.max(maxBar, tot);
    linhas.push({ m: dt.getMonth(), a: dt.getFullYear(), tot: tot, quit: quit, hoje: i === 0 });
  }
  el.innerHTML = '<div class="card" style="margin-bottom:14px"><div class="card-titulo" style="color:#5b21b6">📦 Projeção de Parcelados — 24 meses</div><div style="font-size:.72rem;color:#6b7280;margin-bottom:10px">Compromisso mensal com planos ativos</div>' +
    linhas.filter(function (l) { return l.tot > 0 || l.hoje; }).map(function (l) {
      var badge = (l.hoje ? '<span class="parc-proj-badge parc-proj-hoje">hoje</span>' : '') + l.quit.map(function (d) { return ' <span class="parc-proj-badge parc-proj-fim">✓ ' + esc(d) + '</span>'; }).join('');
      return '<div class="parc-proj-row"><div class="parc-proj-mes">' + MESES_C[l.m] + '/' + String(l.a).slice(2) + '</div><div class="parc-proj-barra-bg"><div class="parc-proj-barra-fill" style="width:' + (maxBar ? l.tot / maxBar * 100 : 0).toFixed(1) + '%"></div></div>' +
        '<div class="parc-proj-val">' + formatar(l.tot) + '</div>' + (badge ? '<div style="display:flex;gap:3px;flex-wrap:wrap">' + badge + '</div>' : '') + '</div>';
    }).join('') + '</div>';
}

// ═════════════════════════ RELATÓRIO SEMANAL ═════════════════════════
// Mesma lógica do "Resumo da semana" do Gastos da Casa: compara a última semana fechada
// (segunda a domingo) com o SEU normal (média das 12 semanas anteriores) em cada
// subcategoria, aponta onde mais vazou e sugere até 4 ações para a semana que começa.
var SEM_BASE = 12, SEM_PEQ = 25, MESC = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function semAdd(s, n) { var d = dataObj(s); d.setDate(d.getDate() + n); return isoDe(d); }
function semND(a, b) { return diasEntre(a, b) + 1; }
function semFD(s) { var d = dataObj(s); return d.getDate() + ' ' + MESC[d.getMonth()]; }
function m0(n) { return formatar(Math.round(+n || 0)).replace(/[.,]00$/, ''); }
function semSub(l) { return nomeSub(l.cat, l.sub) || (l.desc ? String(l.desc).trim() : '') || NOME(l.cat) + ' sem tipo'; }
// com que frequência compra ali nas semanas da base: "2 vezes por semana", "1 vez a cada 4 semanas" (16/11/2026)
// o que aconteceu ali nas semanas da base, como DADO (não como "costume") (16/11/2026)
function semHist(x, semBase) { return x.nb ? 'comprou em ' + x.sb + ' das ' + semBase + ' semanas (' + m0(x.base) + ' no total)' : 'não comprou nas ' + semBase + ' semanas'; }
// compras que são esporádicas por natureza: nunca viram "vazamento" só por acontecerem
var SEM_ESPOR = /roup|vestu|cal[cç]ad|sapat|t[eê]nis|presente|eletr[oô]n|m[oó]ve(l|is)|decora/i;
function semOutros(nome) { return /^outros?$|^outras( despesas)?$|sem (tipo|categoria)$/i.test(String(nome).trim()); }
// fim do ciclo k: período que termina no último dia do mês continua terminando no último dia
function fimCicloK(fim, k) { var d1 = semAdd(fim, 1); return d1.slice(8) === '01' ? semAdd(addMeses(d1, k), -1) : addMeses(fim, k); }
function cicloDe(per, h) {
  var k = 0; while (h > fimCicloK(per.fim, k) && k < 36) k++;
  while (h < addMeses(per.inicio, k) && k > -36) k--;
  return { inicio: addMeses(per.inicio, k), fim: fimCicloK(per.fim, k) };
}
function analisarSemana(hojeRef, parcial) {
  var hj = parcial ? hoje() : (hojeRef || hoje());
  var L = lancamentos().filter(function (l) { return l.data && !l.parcela && l.cat !== PARC; });
  if (!L.length) return null;
  var w = dataObj(hj).getDay();
  var seg = semAdd(hj, -((w + 6) % 7) - (parcial ? 0 : 7)), dom = semAdd(seg, 6);
  // Semana atual (parcial): conta só até hoje e compara com a parte proporcional do normal e do alvo
  var ate = parcial ? hj : dom, diasDec = parcial ? semND(seg, hj) : 7, frac = diasDec / 7;
  var base0 = semAdd(seg, -7 * SEM_BASE), primeiro = L.reduce(function (a, l) { return l.data < a ? l.data : a; }, hj);
  var histDias = semND(primeiro < base0 ? base0 : primeiro, semAdd(seg, -1));
  var semBase = Math.max(1, Math.min(SEM_BASE, Math.floor(histDias / 7)));
  var iniBase = semAdd(seg, -7 * semBase);
  var cic = cicloDe(S.cfg.periodo, hj), diasCic = semND(cic.inicio, cic.fim);
  var lim = baseDisponivel(), alvoSem = lim * 7 / diasCic * frac;
  var Sx = L.filter(function (l) { return l.data >= seg && l.data <= ate; });
  var B = L.filter(function (l) { return l.data >= iniBase && l.data < seg; });
  var tot = Sx.reduce(function (s, l) { return s + l.valor; }, 0);
  var normalTot = B.reduce(function (s, l) { return s + l.valor; }, 0) / semBase * frac;
  var m = {};
  // mesmo lugar com nomes escritos diferente vira um só; "compras" = DIAS em que comprou ali (16/11/2026)
  function k(l) { return l.cat + '|' + (normNome(semSub(l)) || semSub(l).toLowerCase()); }
  function pegaS(l) {
    var q = k(l), x = m[q] || (m[q] = { nome: semSub(l), cat: l.cat, sem: 0, n: 0, base: 0, nb: 0, dS: {}, dB: {}, gr: {} });
    var g = semSub(l); x.gr[g] = (x.gr[g] || 0) + 1; if (x.gr[g] > (x.gr[x.nome] || 0)) x.nome = g; // mostra a grafia mais usada
    return x;
  }
  Sx.forEach(function (l) { var x = pegaS(l); x.sem += l.valor; if (l.valor > 0 && !x.dS[l.data]) { x.dS[l.data] = 1; x.n++; } });
  B.forEach(function (l) {
    var x = pegaS(l), w = Math.floor((semND(iniBase, l.data) - 1) / 7); x.base += l.valor; if (l.valor > 0 && !x.dB[l.data]) { x.dB[l.data] = 1; x.nb++; }
    x.wB = x.wB || {}; if (l.valor > 0 && !x.wB[w]) { x.wB[w] = 1; x.sb = (x.sb || 0) + 1; }
  });
  var lugares = Object.keys(m).map(function (q) { var x = m[q]; x.normal = x.base / semBase * frac; x.nNormal = x.nb / semBase * frac; x.exc = x.sem - x.normal; return x; });
  // compra "de vez em quando" (menos de 1 por semana): uma compra só, no valor de costume, não é vazamento (16/11/2026)
  // Compra esporádica (roupas e parecidos, ou o que apareceu em menos de 3 de cada 4 semanas): compara com o que você
  // gasta numa semana em que compra ali, não com a média das 12 semanas. Só vira vazamento se passar disso.
  lugares.forEach(function (x) { x.sb = x.sb || 0; x.esp = SEM_ESPOR.test(x.nome); x.raro = x.esp || (x.nb > 0 && x.sb / semBase < 0.75); x.ticketSem = x.sb ? x.base / x.sb : 0; });
  var vaz = lugares.filter(function (x) { return !x.esp && x.exc > Math.max(10, x.normal * .15) && !(x.raro && (!x.sb || x.sem <= x.ticketSem * 1.15)); }).sort(function (a, b) { return b.exc - a.exc; });
  var esporSem = lugares.filter(function (x) { return x.esp && x.sem > 0; }).sort(function (a, b) { return b.sem - a.sem; });
  var cats = catsComuns().map(function (c) {
    var sm = Sx.filter(function (l) { return l.cat === c.id; }).reduce(function (a, l) { return a + l.valor; }, 0);
    var o = (+c.orc || 0) * 7 / diasCic * frac;
    return { cat: c.id, nome: c.nome, emoji: c.emoji, cor: c.cor, sem: sm, orcSem: o, exc: o ? sm - o : 0 };
  }).filter(function (c) { return c.sem > 0 || c.orcSem > 0; });
  var peq = Sx.filter(function (l) { return l.valor > 0 && l.valor < SEM_PEQ; }), peqT = peq.reduce(function (a, l) { return a + l.valor; }, 0);
  // "Mercado": a categoria com nome de mercado/supermercado, se existir
  var catMerc = catsComuns().filter(function (c) { return /mercad|grocer/i.test(c.nome); }).map(function (c) { return c.id; });
  var merc = Sx.filter(function (l) { return l.valor > 0 && catMerc.indexOf(l.cat) >= 0; }).length;
  var mercNormal = B.filter(function (l) { return l.valor > 0 && catMerc.indexOf(l.cat) >= 0; }).length / semBase * frac;
  var dias = {}; Sx.forEach(function (l) { if (l.valor > 0) dias[l.data] = 1; });
  var outros = Sx.filter(function (l) { return semOutros(semSub(l)) || / sem tipo$/.test(semSub(l)); }).reduce(function (a, l) { return a + l.valor; }, 0);
  var assin = lugares.filter(function (x) { return /subscri|assinat|netflix|spotify|disney|prime|apple|streaming/i.test(x.nome) && x.exc > 5; })[0];
  var hjReal = hoje() < cic.fim ? hoje() : cic.fim;
  var noCic = L.filter(function (l) { return l.data >= cic.inicio && l.data <= hjReal; }).reduce(function (a, l) { return a + l.valor; }, 0);
  var decor = semND(cic.inicio, hjReal), resta = Math.max(0, diasCic - decor);
  var ideal = lim * decor / diasCic, livre = lim - noCic, porDia = resta ? Math.max(0, livre) / resta : 0;
  // O teto de cada lugar não pode passar do que sobra do limite do ciclo (16/11/2026).
  // Limite já passado: nada até o fim do ciclo; o teto normal só volta no ciclo novo.
  var hjAgora = hoje(), cicAtual = hjAgora >= cic.inicio && hjAgora <= cic.fim;
  var domAtual = semAdd(hjAgora, 6 - ((dataObj(hjAgora).getDay() + 6) % 7)), novoCic = semAdd(cic.fim, 1) <= domAtual ? semAdd(cic.fim, 1) : null;
  var acabou = cicAtual && lim > 0 && livre <= 0;
  function teto(nome, normal, nVezes) {
    var vz = nVezes ? 'no máximo <b>' + nVezes + (nVezes === 1 ? ' vez' : ' vezes') + '</b>, com ' : '';
    if (acabou) return 'O limite do ciclo já acabou: até ' + semFD(cic.fim) + ', <b>nada</b> em ' + esc(nome) + '.';
    var t = cicAtual && lim > 0 ? Math.min(normal, livre) : normal;
    return 'Esta semana, ' + vz + 'teto de <b>' + m0(t) + '</b>' + (t < normal ? ' (é tudo o que sobra do limite até ' + semFD(cic.fim) + ', para todas as compras)' : '') + '.';
  }

  var acoes = [];
  vaz.slice(0, 2).forEach(function (x) {
    var nome = x.nome;
    if (/restaur|lanche|caf[eé]|coffee|tim ?hortons|fast|pizza|delivery|ifood|uber ?eats|skip|bar\b|padaria/i.test(nome))
      acoes.push('<b>' + esc(nome) + '</b>: ' + x.n + ' vezes ' + (parcial ? 'nesta semana, até agora' : 'na semana passada') + ' (' + m0(x.sem) + '). Você costuma ir ' + Math.max(1, Math.round(x.nNormal)) + (parcial && !acabou ? ' até este dia da semana. Segure as próximas idas até domingo.' : (parcial ? ' até este dia da semana. ' : ' por semana. ') + teto(nome, x.normal, Math.max(1, Math.round(parcial ? x.nb / semBase : x.nNormal)))));
    else if (semOutros(x.nome) || / sem tipo$/.test(x.nome))
      acoes.push('<b>' + esc(nome) + ' (' + esc(NOME(x.cat)) + ')</b> subiu para ' + m0(x.sem) + '. Ao lançar, escolha a subcategoria certa: sem saber onde foi, não dá para cortar.');
    else if (x.raro)
      acoes.push('<b>' + esc(nome) + '</b>: ' + m0(x.sem) + (parcial ? ' nesta semana, até agora' : ' na semana') + '. Nas ' + semBase + ' semanas antes, você comprou ali em ' + x.sb + (x.sb === 1 ? ' semana' : ' semanas') + ', cerca de ' + m0(x.ticketSem) + ' em cada: desta vez foi mais. ' +
        (acabou ? 'O limite do ciclo já acabou: até ' + semFD(cic.fim) + ', <b>nada</b> em ' + esc(nome) + '.' : 'Evite comprar de novo nas próximas semanas.'));
    else
      acoes.push('<b>' + esc(nome) + '</b>: ' + m0(x.sem) + ' em ' + x.n + (x.n === 1 ? ' compra' : ' compras') + ', ' + m0(x.exc) + ' acima da sua média por semana ali. ' + teto(nome, Math.max(parcial ? x.base / semBase : x.normal, 0)));
  });
  if (acabou) {
    acoes.unshift('Ciclo ' + semFD(cic.inicio) + ' – ' + semFD(cic.fim) + ': o limite de ' + m0(lim) + ' já foi passado em <b style="color:#dc2626">' + m0(-livre) + '</b>. Não sobra orçamento: até ' + semFD(cic.fim) + ', só o essencial' + (novoCic ? '. O ciclo novo começa em ' + semFD(novoCic) + '.' : '.'));
  } else if (lim > 0 && resta > 0) {
    if (noCic > ideal) acoes.push('Ciclo ' + semFD(cic.inicio) + ' – ' + semFD(cic.fim) + ': ' + m0(noCic - ideal) + ' adiantado. Para fechar no limite, gaste no máximo <b>' + m0(porDia) + ' por dia</b> nos próximos ' + resta + ' dias.');
    else acoes.push('Ciclo ' + semFD(cic.inicio) + ' – ' + semFD(cic.fim) + ': você tem ' + m0(ideal - noCic) + ' de folga. Dá para gastar até <b>' + m0(porDia) + ' por dia</b> até o fim do ciclo e ainda fechar no limite.');
  }
  if (catMerc.length && merc >= Math.round(mercNormal) + 2) acoes.push('Foram <b>' + merc + ' idas ao mercado</b> (costuma ser ' + Math.round(mercNormal) + '). Junte as compras: lista pronta e 1 ou 2 idas na semana.');
  if (peq.length >= 6 && (peqT >= 60 || peqT > tot * .15)) acoes.push('<b>' + peq.length + ' compras pequenas</b> (abaixo de ' + m0(SEM_PEQ) + ') somaram ' + m0(peqT) + '. Antes de uma compra pequena por impulso, espere um dia.');
  if (outros > tot * .2 && outros > 40 && !vaz.slice(0, 2).some(function (x) { return semOutros(x.nome) || / sem tipo$/.test(x.nome); }))
    acoes.push(m0(outros) + ' (' + Math.round(outros / tot * 100) + '% da semana) foram lançados como <b>"Outros"</b> ou sem subcategoria. Escolha a subcategoria ao lançar.');
  if (assin) acoes.push('<b>Assinaturas</b> subiram para ' + m0(assin.sem) + '. Revise se todas ainda valem a pena.');
  if (!parcial && Object.keys(dias).length >= 6) acoes.push('Houve gasto em <b>' + Object.keys(dias).length + ' dos 7 dias</b>. Marque 2 dias sem gasto nesta semana.');
  if (!acoes.length) acoes.push('Semana dentro da sua média. Mantenha o ritmo.');
  return { parcial: !!parcial, ate: ate, diasDec: diasDec, seg: seg, dom: dom, semBase: semBase, poucoHist: histDias < 14, tot: tot, n: Sx.length, normalTot: normalTot, alvoSem: alvoSem, lim: lim,
    vaz: vaz.slice(0, 3), esporSem: esporSem, cats: cats, peq: peq.length, peqT: peqT, merc: merc, mercNormal: mercNormal, diasGasto: Object.keys(dias).length,
    outros: outros, ciclo: cic, noCic: noCic, ideal: ideal, resta: resta, porDia: porDia, acoes: acoes.slice(0, 4) };
}
function statusSemana(r) { var ref = r.alvoSem > 0 ? r.alvoSem : r.normalTot; return r.tot > ref * 1.05 ? 'bad' : r.tot < ref * .95 ? 'good' : 'mid'; }
function corStatus(st) { return st === 'bad' ? '#dc2626' : st === 'good' ? '#16a34a' : '#b26b00'; }
function chaveSemFechado() { return 'hv_sem_fechado_' + (S.casa || ''); }
function pintarCartaoSemana() {
  var wrap = $('sem-card-wrap'); if (!wrap) return;
  var r = null; try { r = analisarSemana(); } catch (e) { console.warn('semana:', e && e.message); }
  if (!r || !r.n) { wrap.innerHTML = ''; return; }
  try { if (localStorage.getItem(chaveSemFechado()) === r.seg) { wrap.innerHTML = ''; return; } } catch (e) {}
  var st = statusSemana(r), cor = corStatus(st), ref = r.alvoSem > 0 ? 'alvo ' + m0(r.alvoSem) : 'sua média ' + m0(r.normalTot), v = r.vaz[0];
  wrap.innerHTML = '<div style="background:#fff;border-radius:16px;padding:14px 16px;margin:0 0 12px;box-shadow:0 2px 12px rgba(0,0,0,.06);border-left:5px solid ' + cor + ';position:relative">' +
    '<button type="button" id="sem-fechar" aria-label="Fechar" style="position:absolute;top:8px;right:8px;border:0;background:none;font-size:18px;color:#6b7280;cursor:pointer;padding:4px 8px">×</button>' +
    '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;color:#6b7280;text-transform:uppercase">📌 Semana ' + semFD(r.seg) + ' – ' + semFD(r.dom) + '</div>' +
    '<div style="font-size:20px;font-weight:800;margin:4px 0 2px;color:' + cor + '">' + m0(r.tot) + ' <span style="font-size:13px;font-weight:600;color:#6b7280">· ' + ref + '</span></div>' +
    (v ? '<div style="font-size:13px;color:#374151;margin-top:4px">Maior vazamento: <b>' + esc(v.nome) + '</b>, ' + m0(v.sem) + ' (média por semana ali: ' + m0(v.normal) + ')</div>'
      : '<div style="font-size:13px;color:#374151;margin-top:4px">Nenhum lugar passou da sua média.</div>') +
    '<div style="font-size:13px;color:#374151;margin-top:6px">👉 ' + r.acoes[0] + '</div>' +
    '<button type="button" data-ir="semana" style="margin-top:8px;font-size:13px;font-weight:700;color:#1d4ed8;background:none;border:0;padding:0;cursor:pointer;font-family:inherit">Ver todas as ações ›</button></div>';
  $('sem-fechar').onclick = function () { try { localStorage.setItem(chaveSemFechado(), r.seg); } catch (e) {} wrap.innerHTML = ''; };
}
// Período (ciclo) com as semanas dentro dele; tocar numa semana abre o relatório dela (14/11/2026)
function segundaDe(s) { var w = dataObj(s).getDay(); return semAdd(s, -((w + 6) % 7)); }
function cicloSemana(k) {
  var per = (S.cfg && S.cfg.periodo) || periodoMesAtual(), c = cicloDe(per, hoje());
  var fim = addMeses(c.fim, k);
  // período que termina no último dia do mês continua terminando no último dia (30 nov → 31 out, e não 30 out)
  if (semAdd(c.fim, 1).slice(8) === '01') fim = semAdd(addMeses(semAdd(c.fim, 1), k), -1);
  return { inicio: addMeses(c.inicio, k), fim: fim };
}
function offDaSemana(seg) { return Math.round(diasEntre(seg, segundaDe(hoje())) / 7) - 1; }
function semanasDoCiclo(c) {
  var out = [], hj = hoje(), seg0 = segundaDe(hoje());
  for (var seg = segundaDe(c.inicio); seg <= c.fim; seg = semAdd(seg, 7)) {
    var off = offDaSemana(seg), fut = seg > seg0, r = null;
    if (!fut) { try { r = off < 0 ? analisarSemana(hj, true) : analisarSemana(semAdd(seg, 7)); } catch (e) {} }
    out.push({ seg: seg, dom: semAdd(seg, 6), off: off, futura: fut, atual: off === -1, r: r });
  }
  return out;
}
function renderizarListaSemanas() {
  var k = S.semCic || 0, c = cicloSemana(k), hj = hoje();
  $('sem-label').textContent = 'Período ' + semFD(c.inicio) + ' – ' + semFD(c.fim) + ' ' + c.fim.slice(0, 4);
  $('sem-prox').style.visibility = k < 0 ? 'visible' : 'hidden';
  $('sem-prox').title = '';
  var sem = semanasDoCiclo(c);
  var ate = hj < c.fim ? hj : c.fim;
  var gasto = lancamentos().filter(function (l) { return l.data && !l.parcela && l.cat !== PARC && l.data >= c.inicio && l.data <= ate; })
    .reduce(function (s2, l) { return s2 + l.valor; }, 0);
  var lim = baseDisponivel(), pctL = lim > 0 ? gasto / lim * 100 : 0, corL = pctL > 100 ? '#dc2626' : pctL >= 80 ? '#b26b00' : '#16a34a';
  var diasC = semND(c.inicio, c.fim), decor = hj < c.inicio ? 0 : Math.min(diasC, semND(c.inicio, ate));
  var topo = '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:2px 2px 6px">' +
    '<div><div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6b7280">Gasto no período</div>' +
    '<div style="font-size:22px;font-weight:900;color:' + corL + '">' + m0(gasto) + (lim > 0 ? ' <span style="font-size:13px;font-weight:600;color:#6b7280">de ' + m0(lim) + '</span>' : '') + '</div></div>' +
    '<div style="text-align:right;font-size:12px;color:#6b7280">' + (k < 0 ? 'período fechado' : 'dia ' + decor + ' de ' + diasC) + (lim > 0 ? '<br><b style="color:' + corL + '">' + pctL.toFixed(0) + '% do limite</b>' : '') + '</div></div>' +
    (lim > 0 ? '<div class="orc-barra-fundo" style="margin:0 2px 12px"><div class="orc-barra-fill" style="width:' + Math.min(pctL, 100).toFixed(1) + '%;background:' + corL + '"></div></div>' : '');
  var linhas = sem.map(function (x, i) {
    var sel = S.semAberta && !x.futura && x.off === S.semOff, st = x.r && x.r.n ? statusSemana(x.r) : null, cor = st ? corStatus(st) : '#d1d5db';
    var dir = x.futura ? '<span style="color:#6b7280;font-size:12px">ainda não começou</span>'
      : !x.r || !x.r.n ? '<span style="color:#6b7280;font-size:12px">sem gastos</span>'
      : '<b style="color:' + cor + ';font-size:15px">' + m0(x.r.tot) + '</b>' + (x.r.alvoSem > 0 ? '<div style="font-size:11px;color:#6b7280">alvo ' + m0(x.r.alvoSem) + '</div>' : '');
    return '<button type="button" class="sem-item' + (sel ? ' sel' : '') + '" data-semoff="' + x.off + '"' + (x.futura ? ' disabled' : '') +
      ' style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;font-family:inherit;padding:10px 12px;margin:0 0 6px;border-radius:12px;cursor:' + (x.futura ? 'default' : 'pointer') + ';' +
      'border:' + (sel ? '2px solid #7c3aed' : '1px solid #e5e7eb') + ';background:' + (sel ? '#f5f3ff' : x.futura ? '#f9fafb' : '#fff') + ';opacity:' + (x.futura ? '.6' : '1') + '">' +
      '<span style="width:6px;align-self:stretch;border-radius:3px;background:' + cor + '"></span>' +
      '<span style="flex:1;min-width:0"><b style="font-size:14px;color:#111827">Semana ' + (i + 1) + '</b>' + (x.atual ? ' <span style="font-size:10.5px;font-weight:800;color:#7c3aed;background:#ede9fe;border-radius:6px;padding:2px 6px;vertical-align:1px">EM ANDAMENTO</span>' : '') +
      '<div style="font-size:12px;color:#6b7280">' + semFD(x.seg) + ' – ' + semFD(x.dom) + '</div></span>' +
      '<span style="text-align:right">' + dir + '</span>' + (x.futura ? '' : '<span style="color:' + (sel ? '#7c3aed' : '#9ca3af') + ';font-size:18px;display:inline-block;transform:rotate(' + (sel ? '90' : '0') + 'deg)">›</span>') + '</button>';
  }).join('');
  var el = $('sem-semanas'), corpo = $('corpo-semana');
  if (!el) { el = document.createElement('div'); el.id = 'sem-semanas'; corpo.parentNode.insertBefore(el, corpo); }
  // o relatório da semana fica dentro da lista, logo abaixo da semana aberta; antes de redesenhar, ele volta para fora
  if (el.contains && el.contains(corpo)) el.parentNode.insertBefore(corpo, el.nextSibling);
  el.innerHTML = '<div class="card" style="padding:12px 12px 6px">' + topo +
    '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;margin:0 2px 8px">Semanas do período · toque para abrir ou fechar</div>' + linhas +
    '<div style="font-size:11px;color:#6b7280;margin:2px 2px 6px">Semanas de segunda a domingo. A cor compara o gasto com o alvo semanal: verde abaixo, amarelo perto, vermelho acima.</div></div>';
  qsa('#sem-semanas .sem-item').forEach(function (b) {
    if (b.disabled) return;
    if (S.semAberta && b.classList.contains('sel')) b.parentNode.insertBefore(corpo, b.nextSibling);
    b.onclick = function () {
      var off = +b.dataset.semoff;
      if (S.semAberta && S.semOff === off) S.semAberta = false; else { S.semOff = off; S.semAberta = true; }
      renderizarSemana();
      var alvo = qsa('#sem-semanas .sem-item.sel')[0];
      if (alvo && alvo.scrollIntoView) setTimeout(function () { alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
    };
  });
}
function renderizarSemana() {
  renderizarListaSemanas();
  if (!S.semAberta) { $('corpo-semana').innerHTML = ''; return; }
  var off = S.semOff || 0, atual = off < 0;
  var hjRef = atual ? hoje() : semAdd(hoje(), -7 * off);
  var r = null; try { r = analisarSemana(hjRef, atual); } catch (e) { console.warn('semana:', e && e.message); }
  var w = dataObj(hjRef).getDay(), seg = semAdd(hjRef, -((w + 6) % 7) - (atual ? 0 : 7));
  var el = $('corpo-semana');
  var dica = '';
  if (!r || !r.n) { el.innerHTML = dica + '<div class="vazio">📭 Nenhum gasto ' + (atual ? 'nesta semana até agora' : 'nesta semana') + '.<br><span style="font-size:12px">' + (atual ? 'Os lançamentos de segunda até hoje aparecem aqui.' : 'Esta tela mostra a semana fechada (segunda a domingo).') + '</span></div>'; return; }
  var st = statusSemana(r), cor = corStatus(st);
  var ref = r.alvoSem > 0 ? (r.parcial ? 'Alvo até hoje pelo limite: <b>' : 'Alvo da semana pelo limite: <b>') + m0(r.alvoSem) + '</b>' : 'Sem limite definido (defina em Início → Orçamento)';
  var resumo = '<div class="card sem-st" style="border-left-color:' + cor + '">' +
    '<div class="card-titulo">' + (r.parcial ? 'Semana em andamento · até hoje (' + r.diasDec + ' de 7 dias)' : 'Resumo da semana') + '</div>' +
    '<div style="font-size:30px;font-weight:900;color:' + cor + ';letter-spacing:-1px">' + m0(r.tot) + '</div>' +
    '<div style="font-size:13px;color:#6b7280;margin-top:2px">' + r.n + ' lançamentos · ' + r.diasGasto + ' de ' + r.diasDec + ' dias com gasto</div>' +
    '<div style="font-size:13px;color:#374151;margin-top:8px">' + ref + '<br>Sua média: <b>' + m0(r.normalTot) + '</b> ' + (r.parcial ? 'até este dia da semana' : 'por semana') + ' <span style="color:#6b7280">(média das ' + r.semBase + ' semana' + (r.semBase > 1 ? 's' : '') + ' anteriores)</span></div>' +
    (r.parcial ? '<div style="font-size:11.5px;color:#6b7280;margin-top:8px">A semana ainda não terminou. Média e alvo são proporcionais aos ' + r.diasDec + ' dias já passados. O relatório completo sai na segunda-feira.</div>' : '') +
    (r.poucoHist ? '<div class="alerta atencao" style="margin:10px 0 0">Ainda há pouco histórico. A média fica mais precisa depois de algumas semanas de lançamentos.</div>' : '') + '</div>';
  var catsH = r.cats.filter(function (c) { return c.orcSem > 0; }).map(function (c) {
    var pct = Math.min(c.sem / c.orcSem * 100, 100), corB = c.exc > 0 ? '#f44336' : pct >= 80 ? '#ff9800' : c.cor;
    return '<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:13px"><span>' + esc(c.emoji + ' ' + c.nome) + '</span>' +
      '<span><b style="color:' + (c.exc > 0 ? '#dc2626' : '#16a34a') + '">' + m0(c.sem) + '</b> <span style="color:#6b7280">/ ' + m0(c.orcSem) + '</span></span></div>' +
      '<div class="orc-barra-fundo" style="margin-top:4px"><div class="orc-barra-fill" style="width:' + pct.toFixed(1) + '%;background:' + corB + '"></div></div></div>';
  }).join('');
  var catsCard = catsH ? '<div class="card"><div class="card-titulo">Categorias × orçamento semanal</div>' + catsH +
    '<div style="font-size:11px;color:#6b7280;margin-top:6px">Orçamento semanal = orçamento do período ÷ dias do período × 7' + (r.parcial ? ', proporcional aos dias já passados' : '') + '</div></div>' : '';
  var thMed = r.parcial ? 'Média até este dia' : 'Média por semana';
  var linhas = r.vaz.length ? r.vaz.map(function (x) {
    return '<tr><td><b>' + esc(x.nome) + '</b><br><span style="font-size:11px;color:#6b7280">' + esc(NOME(x.cat)) + ' · nas ' + r.semBase + ' semanas antes: ' + semHist(x, r.semBase) + '</span></td><td>' + m0(x.sem) + '<br><span style="font-size:11px;color:#6b7280">' + x.n + (x.n === 1 ? ' compra' : ' compras') + '</span></td><td>' + m0(x.normal) + '</td><td style="color:#dc2626;font-weight:800">+' + m0(x.exc) + '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="color:#16a34a">Nenhum lugar passou da sua média. 👏</td></tr>';
  var vazCard = '<div class="card"><div class="card-titulo">Onde mais vazou</div>' +
    '<div style="font-size:11.5px;color:#6b7280;margin:-4px 0 8px">"Vazou" = gastou mais do que a sua média por semana naquele lugar (' + r.semBase + ' semanas anteriores)</div>' +
    (r.esporSem.length ? '<div style="font-size:11.5px;color:#374151;margin:0 0 8px">Compras esporádicas na semana (não entram em "vazou"): ' + r.esporSem.map(function (x) { return '<b>' + esc(x.nome) + '</b> ' + m0(x.sem); }).join(' · ') + '</div>' : '') +
    '<div style="overflow-x:auto"><table class="sem-tab"><thead><tr><th>Onde</th><th>Esta semana</th><th>' + thMed + '</th><th>A mais</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
    '<div style="font-size:11px;color:#6b7280;margin-top:6px">Média por semana = o que você gastou ali nas ' + r.semBase + ' semanas anteriores ÷ ' + r.semBase + '.' + ' Roupas, calçados, presentes, eletrônicos e móveis não entram aqui. O que você não compra quase toda semana só aparece se a semana passou do que você costuma gastar numa semana em que compra ali.</div></div>';
  var acoesCard = '<div class="card" style="border-left:5px solid #7c3aed"><div class="card-titulo">✅ O que fazer nesta semana</div><ol class="sem-acoes">' +
    r.acoes.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ol>' +
    '<div style="display:flex;gap:8px;margin-top:12px"><button id="sem-pdf" style="flex:1;padding:12px 8px;border:0;border-radius:12px;background:#1d4ed8;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">📄 PDF</button>' +
    '<button class="btn-whatsapp" id="sem-wa" style="flex:1;margin:0">📱 WhatsApp</button></div></div>';
  el.innerHTML = dica + resumo + vazCard + acoesCard + catsCard;
  $('sem-pdf').onclick = function () { exportarPDFSemana(r); };
  $('sem-wa').onclick = function () {
    var txt = function (h) { return h.replace(/<b>|<\/b>/g, '*').replace(/<[^>]+>/g, ''); };
    var msg = '📌 *' + (r.parcial ? 'SEMANA ATUAL (ATÉ ' + semFD(r.ate).toUpperCase() + ') ' : 'SEMANA ') + semFD(r.seg).toUpperCase() + ' – ' + semFD(r.dom).toUpperCase() + '*\n━━━━━━━━━━━━━━━━\n💰 Gasto: *' + m0(r.tot) + '*' + (r.alvoSem > 0 ? ' (alvo ' + m0(r.alvoSem) + ')' : '') + '\n📊 Sua média por semana: ' + m0(r.normalTot) + '\n';
    if (r.vaz.length) { msg += '\n🔻 *Onde mais vazou*\n'; r.vaz.forEach(function (x) { msg += '• ' + x.nome + ': ' + m0(x.sem) + ' (média por semana ali ' + m0(x.normal) + ', +' + m0(x.exc) + '; nas ' + r.semBase + ' semanas antes: ' + semHist(x, r.semBase) + ')\n'; }); }
    msg += '\n✅ *O que fazer nesta semana*\n'; r.acoes.forEach(function (a, i) { msg += (i + 1) + '. ' + txt(a) + '\n'; });
    compartilharTexto(msg + '\n_Enviado via MinhaCasa_');
  };
}

// Relatório semanal em PDF: abre a versão para impressão, e o "Salvar PDF" fica no próprio diálogo (14/11/2026)
function exportarPDFSemana(r) {
  var st = statusSemana(r), cor = corStatus(st);
  var titulo = (r.parcial ? 'Semana atual (até ' + semFD(r.ate) + ')' : 'Semana') + ' · ' + semFD(r.seg) + ' – ' + semFD(r.dom);
  var vaz = r.vaz.length ? r.vaz.map(function (x) {
    return '<tr><td><b>' + esc(x.nome) + '</b><br><span style="font-size:11px;color:#6b7280">' + esc(NOME(x.cat)) + '</span></td><td class="v">' + m0(x.sem) + '<br><span style="font-size:11px;color:#6b7280">' + x.n + (x.n === 1 ? ' compra' : ' compras') + '</span></td><td style="font-size:12px;color:#374151">' + semHist(x, r.semBase) + '</td><td class="v" style="color:#6b7280">' + m0(x.normal) + '</td><td class="v" style="color:#dc2626">+' + m0(x.exc) + '</td></tr>';
  }).join('') : '<tr><td colspan="5" style="color:#16a34a">Nenhum lugar passou da sua média. 👏</td></tr>';
  var cats = r.cats.filter(function (c) { return c.orcSem > 0 || c.sem > 0; }).map(function (c) {
    var pct = c.orcSem > 0 ? Math.min(c.sem / c.orcSem * 100, 100) : 0, corB = c.exc > 0 ? '#f44336' : pct >= 80 ? '#ff9800' : c.cor;
    return '<tr><td>' + esc(c.emoji + ' ' + c.nome) + '<div style="height:6px;background:#f1f5f9;border-radius:3px;margin-top:5px"><div style="height:6px;border-radius:3px;width:' + pct.toFixed(1) + '%;background:' + corB + '"></div></div></td>' +
      '<td class="v" style="color:' + (c.exc > 0 ? '#dc2626' : '#16a34a') + '">' + m0(c.sem) + '</td><td class="v" style="color:#6b7280">' + (c.orcSem > 0 ? m0(c.orcSem) : '—') + '</td></tr>';
  }).join('');
  var th = function (t, dir) { return '<th style="padding:8px 10px;background:#1d4ed8;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.5px;text-align:' + (dir || 'left') + '">' + t + '</th>'; };
  var corpo = '<style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}h2{font-size:15px;margin:22px 0 8px;color:#0f172a}ol{margin:0;padding-left:20px}ol li{margin:6px 0;font-size:13.5px;line-height:1.45}</style>' +
    '<h1>📌 ' + esc(S.cfg.nome || 'MinhaCasa') + ' — Relatório semanal</h1><div class="sub">' + esc(titulo) + '</div>' +
    '<div style="background:#f8fafc;border-left:5px solid ' + cor + ';border-radius:10px;padding:14px 18px">' +
      '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280">' + (r.parcial ? 'Gasto até hoje' : 'Gasto da semana') + '</div>' +
      '<div style="font-size:28px;font-weight:900;color:' + cor + '">' + m0(r.tot) + '</div>' +
      '<div style="font-size:13px;color:#374151;margin-top:4px">' + r.n + ' lançamentos · ' + r.diasGasto + ' de ' + r.diasDec + ' dias com gasto<br>' +
      (r.alvoSem > 0 ? (r.parcial ? 'Alvo até hoje: ' : 'Alvo da semana: ') + '<b>' + m0(r.alvoSem) + '</b> · ' : '') +
      'Sua média por semana: <b>' + m0(r.normalTot) + '</b> <span style="color:#6b7280">(nas ' + r.semBase + ' semana' + (r.semBase > 1 ? 's' : '') + ' anteriores)</span></div></div>' +
    '<h2>🔻 Onde mais vazou</h2><table><thead><tr>' + th('Onde') + th('Esta semana', 'right') + th('Nas ' + r.semBase + ' semanas antes') + th(r.parcial ? 'Média até este dia' : 'Média por semana', 'right') + th('A mais', 'right') + '</tr></thead><tbody>' + vaz + '</tbody></table>' +
    '<h2>✅ O que fazer nesta semana</h2><ol>' + r.acoes.map(function (a) { return '<li>' + a + '</li>'; }).join('') + '</ol>' +
    (cats ? '<h2>📊 Categorias × orçamento semanal</h2><table><thead><tr>' + th('Categoria') + th('Gasto', 'right') + th('Orçamento', 'right') + '</tr></thead><tbody>' + cats + '</tbody></table>' : '') +
    '<div style="margin-top:22px;font-size:11px;color:#6b7280;text-align:center">Gerado em ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) + ' · MinhaCasa</div>';
  abrirImpressao('MinhaCasa — ' + titulo, corpo);
}

// ═════════════════════════ RELATÓRIO COMPLETO (vários ciclos) ═════════════════════════
// Mesmo relatório do Gastos da Casa ("Onde o orçamento está quebrando"), com filtros de período e PDF (14/11/2026).
// Abre numa janela própria com os dados já decifrados deste aparelho; nada é enviado para fora.
var REL_CSS = ":root{\n  --bg:#f6f7f9; --s1:#fff; --line:#e3e6ea; --grid:#eceef1;\n  --tx:#14171c; --tx2:#4b5361; --tx3:#7a8392;\n    --bad:#c23a2b; --warn:#b26b00; --good:#1f7a3a; --acc:#1d4ed8;\n  --mono:ui-monospace,\"SF Mono\",Menlo,Consolas,monospace;\n}\n*{box-sizing:border-box}\nhtml,body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.45 -apple-system,system-ui,\"Segoe UI\",Roboto,sans-serif;-webkit-text-size-adjust:100%}\n.wrap{max-width:1040px;margin:0 auto;padding:18px 16px 40px}\na{color:var(--acc)}\n.voltar{display:inline-block;margin-bottom:10px;font-size:13px;text-decoration:none;font-weight:600}\nheader.top{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;border-bottom:2px solid var(--tx);padding-bottom:10px;margin-bottom:12px}\n.kick{font:600 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--tx3)}\nh1{font-size:26px;margin:6px 0 0;letter-spacing:-.02em}\n.stamp{font:12px/1.5 var(--mono);color:var(--tx2);text-align:right}\n.barra{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px}\n.barra .fonte{font-size:12px;color:var(--tx3);flex:1;min-width:200px}\n.periodo{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:-4px 0 14px}\n.periodo .plab{font:600 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--tx3);margin-right:4px}\n.periodo .pb{font:inherit;font-size:13px;font-weight:600;padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--s1);color:var(--tx2);cursor:pointer;min-height:36px}\n.periodo .pb[aria-pressed=\"true\"]{background:var(--tx);border-color:var(--tx);color:#fff}\n.periodo .pcustom[hidden]{display:none}\n.periodo .pcustom{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px;color:var(--tx2)}\n.periodo input[type=date]{font:13px var(--mono);padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--s1);color:var(--tx);min-height:36px}\n.periodo .btn{min-height:36px;padding:6px 14px}\n.btn{font:inherit;font-weight:700;font-size:13px;padding:9px 14px;border-radius:9px;border:1px solid var(--tx);background:var(--tx);color:#fff;cursor:pointer;min-height:40px}\n.btn.sec{background:transparent;color:var(--tx)}\n.grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px;align-items:start}\n.card{background:var(--s1);border:1px solid var(--line);border-radius:12px;padding:14px 16px;min-width:0;grid-column:span 12}\n.c6{grid-column:span 6}\n@media(max-width:760px){.c6{grid-column:span 12}}\n.card h2{font-size:17px;margin:0;letter-spacing:-.01em}\n.ch{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:8px}\n.note{font-size:12px;color:var(--tx3)}\n.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--line);border-radius:12px;background:var(--s1);overflow:hidden}\n.kpi{padding:12px 14px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);min-width:0}\n.kpi .l{font-size:12px;color:var(--tx2)}\n.kpi .v{font-size:23px;font-weight:800;letter-spacing:-.02em;margin:3px 0 2px;white-space:nowrap}\n.kpi .s{font:11px/1.35 var(--mono);color:var(--tx3)}\n@media(max-width:760px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.kpi .v{font-size:20px}}\n.bad{color:var(--bad)} .good{color:var(--good)} .warn{color:var(--warn)}\n.alvo{border-left:4px solid var(--bad)}\n.alvo ol{margin:6px 0 0;padding-left:20px}\n.alvo li{margin:7px 0}\n.alvo li b.v{white-space:nowrap}\n.ok-msg{border-left:4px solid var(--good)}\ntable{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}\nth,td{padding:6px 7px;border-bottom:1px solid var(--grid);text-align:right;white-space:nowrap}\nth{font:600 10px/1.25 var(--mono);color:var(--tx3);text-transform:uppercase;letter-spacing:.04em;white-space:normal;vertical-align:bottom}\ntd:first-child,th:first-child{text-align:left}\ntd.t{text-align:left;white-space:normal}\ntr.tot td{font-weight:700;border-top:1.5px solid var(--tx)}\n.tw{overflow-x:auto}\n.sw{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}\n.tag{font:600 10px/1 var(--mono);padding:2px 5px;border-radius:4px;border:1px solid var(--line);color:var(--tx3);margin-left:5px;vertical-align:1px}\n.legend{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--tx2);margin:2px 0 6px}\n.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}\nsvg{display:block;width:100%;height:auto;overflow:visible}\nsvg text{font-family:var(--mono);font-size:10.5px;fill:var(--tx3)}\nsvg .lbl{fill:var(--tx);font-weight:600}\n.vazio{padding:30px 10px;text-align:center;color:var(--tx3)}\n.hit{cursor:default}\n.bul{display:grid;grid-template-columns:minmax(0,30%) minmax(0,1fr) auto;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--grid)}\n.bul:last-child{border-bottom:0}\n.bul .n{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.bul .trk{position:relative;height:16px;background:var(--grid);border-radius:4px}\n.bul .fill{position:absolute;left:0;top:0;bottom:0;border-radius:4px}\n.bul .orc{position:absolute;top:-4px;bottom:-4px;width:2px;background:var(--tx)}\n.bul .vv{font:12px var(--mono);text-align:right;white-space:nowrap}\n.foot{font-size:11.5px;color:var(--tx3);margin-top:16px;line-height:1.5}\n@media print{\n  @page{size:A4;margin:11mm}\n  html,body{background:#fff}\n  .wrap{max-width:none;padding:0}\n  .barra,.periodo{display:none!important}\n  .grid,.kpis{display:block!important}\n  .card,.card.c6,.card.longa{display:block;width:auto;margin:0 0 10px;border-color:#ccc;break-inside:auto;page-break-inside:auto}\n  .kpis{border:1px solid #ccc}\n  .kpi{display:inline-block;width:24.6%;vertical-align:top;border-bottom:0}\n  svg,tr,li,.bul{break-inside:avoid;page-break-inside:avoid}\n  .ch,h2{break-after:avoid;page-break-after:avoid}\n  .legend span{display:inline-block;margin-right:12px}\n  thead{display:table-header-group}\n  .tw{overflow:visible}\n  table{font-size:10.5px}\n  th,td{padding:4px 4px}\n  th{font-size:8.5px}\n}";
function motorRelatorio(D) {
  var NOMES = {}, COR = {}, ORC = {}, COMUNS = [];
  D.cats.forEach(function (c) { NOMES[c.id] = c.nome; COR[c.id] = c.cor || '#9ca3af'; ORC[c.id] = +c.orc || 0; COMUNS.push(c.id); });
  var DIASEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var MESC = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var PEQUENO = 25;
  var catMerc = D.cats.filter(function (c) { return /mercado/i.test(c.nome); })[0];
  function addMeses(s, m) {
    var p = s.split('-'), ano = +p[0], mes = +p[1] - 1, dia = +p[2];
    var nm = mes + m, na = ano + Math.floor(nm / 12); nm = ((nm % 12) + 12) % 12;
    dia = Math.min(dia, new Date(na, nm + 1, 0).getDate());
    return na + '-' + String(nm + 1).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
  }
  function hojeIso() { var n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); }
  function dt(s) { return new Date(s + 'T12:00:00'); }
  function dias(a, b) { return Math.round((dt(b) - dt(a)) / 864e5) + 1; }
  function addDias(s, n) { var d = dt(s); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fD(s) { var d = dt(s); return d.getDate() + ' ' + MESC[d.getMonth()]; }
  function fDA(s) { var d = dt(s); return d.getDate() + ' ' + MESC[d.getMonth()] + ' ' + d.getFullYear(); }
  function money(n, dec) {
    n = +n || 0; var neg = n < 0; n = Math.abs(n);
    var s = n.toFixed(dec === 0 ? 0 : 2), int = dec === 0 ? s : s.slice(0, -3), cent = dec === 0 ? '' : s.slice(-2);
    int = int.replace(/\B(?=(\d{3})+(?!\d))/g, D.br ? '.' : ',');
    return (neg ? '-' : '') + D.simb + ' ' + int + (cent ? (D.br ? ',' : '.') + cent : '');
  }
  function m0(n) { return money(n, 0); }
  function semS(n) { return m0(n).replace(D.simb + ' ', ''); }
  function pct(x) { return isFinite(x) ? Math.round(x * 100) + '%' : '—'; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function val(l) { return +l.valor || 0; }
  function subDe(l) { return l.sub || (l.desc ? String(l.desc).trim() : '') || (NOMES[l.cat] || 'Sem categoria') + ' (sem tipo)'; }
  function nomeCat(k) { return NOMES[k] || 'Sem categoria'; }
  function corCat(k) { return COR[k] || '#9ca3af'; }
  var d = { lancamentos: D.lanc, periodo: D.periodo, limite: +D.limite || 0 };
  var $ = function (id) { return document.getElementById(id); };

  var PER = { n: 3 };
  try { var _p = JSON.parse(localStorage.getItem('mc.relper') || 'null'); if (_p && (_p.n || (_p.de && _p.ate))) PER = _p; } catch (e) {}
  function fimK(fim, k) { var d1 = addDias(fim, 1); return d1.slice(8) === '01' ? addDias(addMeses(d1, k), -1) : addMeses(fim, k); }
  function idxAtual(p, h) { var k = 0; while (h > fimK(p.fim, k) && k < 36) k++; while (h < addMeses(p.inicio, k) && k > -36) k--; return k; }
  function prepara(c, h) {
    c.dias = dias(c.inicio, c.fim);
    c.emCurso = h >= c.inicio && h <= c.fim && c.fimCheio >= h;
    c.decorridos = c.emCurso ? dias(c.inicio, h) : c.dias;
    c.parcial = !c.emCurso && c.dias < c.cheio;
    c.peso = c.emCurso ? 0 : c.dias / c.cheio;
    c.rot = fD(c.inicio) + ' – ' + fD(c.fim);
    return c;
  }
  function cicloK(p, k) { var a = addMeses(p.inicio, k), b = fimK(p.fim, k); return { inicio: a, fim: b, fimCheio: b, cheio: dias(a, b) }; }
  function cicloAtual() { var h = hojeIso(); return prepara(cicloK(d.periodo, idxAtual(d.periodo, h)), h); }
  function ciclos() {
    var p = d.periodo, h = hojeIso(), k = idxAtual(p, h), out = [];
    if (PER.n) { for (var j = k - PER.n; j <= k; j++) out.push(cicloK(p, j)); }
    else {
      var de = PER.de, ate = PER.ate > h ? h : PER.ate;
      for (var j2 = k - 120; j2 <= k; j2++) {
        var c = cicloK(p, j2); if (c.fim < de || c.inicio > ate) continue;
        if (c.inicio < de) c.inicio = de;
        if (c.fim > ate && !(h >= c.inicio && h <= c.fimCheio && ate === h)) c.fim = ate;
        out.push(c);
      }
    }
    var prim = d.lancamentos.reduce(function (m, l) { return l.data && l.data < m ? l.data : m; }, h);
    out = out.filter(function (c) { return c.fim >= prim; });
    return out.map(function (c) { return prepara(c, h); });
  }
  function rotPeriodo(nF) {
    if (PER.n) return 'nos ' + nF + ' últimos ciclos fechados';
    return 'de ' + fDA(PER.de) + ' a ' + fDA(PER.ate > hojeIso() ? hojeIso() : PER.ate);
  }
  function calcular(lista) {
    var C = lista || ciclos(), L = d.lancamentos, h = hojeIso();
    C.forEach(function (c) {
      c.l = L.filter(function (l) { return l.data >= c.inicio && l.data <= c.fim && l.data <= h; });
      c.cat = {}; COMUNS.forEach(function (k) { c.cat[k] = 0; });
      c.comum = 0; c.n = 0;
      c.l.forEach(function (l) { if (c.cat[l.cat] === undefined) c.cat[l.cat] = 0; c.cat[l.cat] += val(l); c.comum += val(l); if (val(l) > 0) c.n++; });
      c.fator = c.emCurso ? c.dias / Math.max(1, c.decorridos) : 1;
      c.projCat = {}; Object.keys(c.cat).forEach(function (k) { c.projCat[k] = c.cat[k]; });
      c.proj = c.comum;
      if (c.emCurso) {
        var R = restanteCiclo(); c.R = R;
        Object.keys(R.cat).forEach(function (k) { c.projCat[k] = (c.projCat[k] || 0) + R.cat[k]; });
        c.proj = c.comum + R.tot;
      }
    });
    return C;
  }
  /* Projeção pela FREQUÊNCIA (16/11/2026), não por dia: para cada lugar, quantas
     vezes você vai por ciclo e quanto gasta por ida (últimos ciclos fechados, até 6).
     Nos dias que faltam conta o MENOR entre frequência × dias que faltam ÷ dias do
     ciclo e frequência − idas já feitas no ciclo. Compra sem histórico não se repete.
     Sem ciclo fechado no app, cai no ritmo por dia. */
  function normNome(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function chaveLugar(l) { return l.cat + '|' + (normNome(subDe(l)) || subDe(l).toLowerCase()); }
  function historico() {
    var p = d.periodo, h = hojeIso(), k = idxAtual(p, h), L = d.lancamentos;
    var prim = L.reduce(function (m, l) { return l.data && l.data < m ? l.data : m; }, h), H = [];
    for (var j = k - 1; j >= k - 24 && H.length < 6; j--) {
      var c = cicloK(p, j);
      if (c.fim < prim || dias(c.inicio < prim ? prim : c.inicio, c.fim) < 0.8 * c.cheio) break;
      H.push(c);
    }
    return H;
  }
  function restanteCiclo() {
    var h = hojeIso(), at = prepara(cicloK(d.periodo, idxAtual(d.periodo, h)), h), L = d.lancamentos;
    var rest = Math.max(0, at.dias - at.decorridos), H = historico();
    var R = { cat: {}, tot: 0, lugares: [], porChave: {}, nHist: H.length, rest: rest, linear: !H.length, ciclo: at }, m = {};
    function pega(l) { var k = chaveLugar(l); if (!m[k]) m[k] = { chave: k, nome: subDe(l), cat: l.cat, nH: 0, vH: 0, n: 0, v: 0 }; return m[k]; }
    H.forEach(function (c) { L.forEach(function (l) { if (l.data < c.inicio || l.data > c.fim) return; var s = pega(l); s.vH += val(l); s.dH = s.dH || {}; if (val(l) > 0 && !s.dH[l.data]) { s.dH[l.data] = 1; s.nH++; } }); });
    L.forEach(function (l) { if (l.data < at.inicio || l.data > h) return; var s = pega(l); s.v += val(l); s.dA = s.dA || {}; if (val(l) > 0 && !s.dA[l.data]) { s.dA[l.data] = 1; s.n++; } });
    Object.keys(m).forEach(function (k) {
      var s = m[k];
      if (R.linear) { s.freq = 0; s.ticket = s.n ? s.v / s.n : 0; s.esperV = at.decorridos ? s.v * rest / at.decorridos : 0; s.esperN = s.ticket ? s.esperV / s.ticket : 0; }
      else { s.freq = s.nH / H.length; s.ticket = s.nH ? s.vH / s.nH : 0; s.esperN = Math.min(s.freq * rest / at.dias, Math.max(0, s.freq - s.n)); s.esperV = s.esperN * s.ticket; }
      R.cat[s.cat] = (R.cat[s.cat] || 0) + s.esperV; R.tot += s.esperV; R.porChave[k] = s; R.lugares.push(s);
    });
    R.lugares.sort(function (a, b) { return b.esperV - a.esperV; });
    return R;
  }
  function vezes(x) { x = +x || 0; var r = Math.round(x); return x < 0.75 ? 'menos de 1 vez' : r === 1 ? '1 vez' : r + ' vezes'; }
  function idasFaltam(e) {
    if (e < 0.95) return 'talvez 1 (' + Math.round(e * 100) + '% de chance)';
    var r = Math.round(e); return Math.abs(e - r) < 0.25 ? 'cerca de ' + r + (r === 1 ? ' vez' : ' vezes') : Math.floor(e) + ' a ' + Math.ceil(e) + ' vezes';
  }
  function blocoFrequencia(at, lim) {
    var R = at.R; if (!R) return '';
    var base = R.linear ? 'no ritmo por dia (ainda não há ciclo fechado para medir a sua frequência)' : 'pela sua frequência nos últimos ' + R.nHist + (R.nHist === 1 ? ' ciclo' : ' ciclos');
    var cls = lim > 0 && at.proj > lim ? 'bad' : '';
    var x = '<p style="margin:0 0 8px">' + (R.rest > 0 ? 'Faltam ' + R.rest + (R.rest === 1 ? ' dia' : ' dias') + '. ' + (R.tot >= 1 ? 'Ainda devem entrar cerca de <b>' + m0(R.tot) + '</b>, ' + base : 'Não deve entrar mais nada, ' + base) +
      ' → o ciclo fecha em <b class="' + cls + '">' + m0(at.proj) + '</b>' + (lim > 0 ? ' (' + pct(at.proj / lim) + ' do limite)' : '') + '.' : 'O ciclo fecha hoje em <b class="' + cls + '">' + m0(at.proj) + '</b>.') + '</p>';
    if (R.linear) return x;
    var cont = {}; R.lugares.forEach(function (s) { var k = s.nome.toLowerCase(); cont[k] = (cont[k] || 0) + 1; });
    function nomeL(s) { return '<b>' + esc(s.nome) + '</b>' + (cont[s.nome.toLowerCase()] > 1 ? ' <span class="note">(' + esc(nomeCat(s.cat)) + ')</span>' : ''); }
    var vem = R.lugares.filter(function (s) { return s.esperV >= 5; }).slice(0, 6);
    if (R.rest > 0 && vem.length) {
      var ex = vem.filter(function (s) { return s.esperN < 0.95; })[0];
      x += '<p class="note" style="margin:0 0 4px"><b>O que ainda deve entrar até ' + fD(R.ciclo.fim) + '</b> · pelo seu costume nos últimos ' + R.nHist + (R.nHist === 1 ? ' ciclo' : ' ciclos') + '</p>' +
        '<div class="tw"><table><thead><tr><th>Onde</th><th>Você costuma ir</th><th>Neste ciclo, até hoje</th><th>Nos ' + R.rest + (R.rest === 1 ? ' dia' : ' dias') + ' que faltam</th><th>Entra na projeção</th></tr></thead><tbody>' +
        vem.map(function (s) { return '<tr><td class="t">' + nomeL(s) + '</td><td class="t">' + vezes(s.freq) + ' por ciclo, ' + m0(s.ticket) + ' cada</td><td>' + (s.n ? s.n + (s.n === 1 ? ' vez' : ' vezes') : 'nenhuma') + '</td><td class="t">' + idasFaltam(s.esperN) + '</td><td><b>' + m0(s.esperV) + '</b></td></tr>'; }).join('') +
        '</tbody></table></div><p class="note" style="margin:4px 0 10px">Como ler: nos dias que faltam, conta só as idas que ainda cabem no seu costume. ' +
        (ex ? 'Quando é menos de uma ida, entra só a parte da chance: ' + esc(ex.nome) + ' tem ' + Math.round(ex.esperN * 100) + '% de chance × ' + m0(ex.ticket) + ' por ida ≈ ' + m0(ex.esperV) + '. ' : '') +
        'Se você não for, o ciclo fecha abaixo da projeção.</p>';
    }
    var mais = R.lugares.filter(function (s) { return s.n >= 2 && s.n >= s.freq + 1; }).map(function (s) { s.extraV = s.v - s.freq * s.ticket; return s; })
      .filter(function (s) { return s.extraV >= 10; }).sort(function (a, b) { return b.extraV - a.extraV; }).slice(0, 6);
    if (mais.length) x += '<p class="note" style="margin:0 0 4px"><b>Neste ciclo você foi mais vezes que de costume</b></p><ul style="margin:0 0 10px;padding-left:20px">' +
      mais.map(function (s) { return '<li>' + nomeL(s) + ': ' + s.n + ' vezes, ' + m0(s.v) + ' (você costuma ir ' + vezes(s.freq) + ' por ciclo, cerca de ' + m0(s.vH / R.nHist) + ') → <span class="bad">' + m0(s.extraV) + ' a mais</span></li>'; }).join('') + '</ul>';
    var novos = R.lugares.filter(function (s) { return !s.nH && s.v >= 50; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 4);
    if (novos.length) x += '<p class="note" style="margin:0 0 4px"><b>Gastos que não aparecem nos ciclos anteriores</b> (não foram projetados de novo)</p><ul style="margin:0 0 10px;padding-left:20px">' +
      novos.map(function (s) { return '<li>' + nomeL(s) + ': ' + m0(s.v) + (s.n > 1 ? ' em ' + s.n + ' vezes' : '') + '</li>'; }).join('') + '</ul>';
    return x;
  }

  var PRINT = false;
  function niceMax(v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; var st = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find(function (x) { return f <= x * 1.0001; }); return st * p; }
  function largura(def) { if (PRINT) return 740; var c = $('conteudo'); var cw = (c && c.clientWidth) || def; return Math.round(Math.min(def, Math.max(320, cw - 34))); }
  function barrasCiclo(C, lim, cats) {
    var W = largura(1000), H = 270, ml = 50, mr = 10, mt = 24, mb = 34, iw = W - ml - mr, ih = H - mt - mb;
    var tot = C.map(function (c) { return cats.reduce(function (s, k) { return s + (c.cat[k] || 0); }, 0); });
    var projs = C.map(function (c, i) { return c.emCurso ? cats.reduce(function (s, k) { return s + (c.projCat[k] || 0); }, 0) : tot[i]; });
    var mx = niceMax(Math.max.apply(null, projs.concat([lim * 1.05, 1])));
    var n = C.length, bw = iw / n, w = Math.min(150, bw * .5);
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gasto por ciclo">';
    for (var i = 0; i <= 4; i++) { var y = mt + ih - ih * i / 4; g += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y + '" y2="' + y + '" stroke="var(--grid)"/><text x="' + (ml - 6) + '" y="' + (y + 3.5) + '" text-anchor="end">' + semS(mx * i / 4) + '</text>'; }
    C.forEach(function (c, i) {
      var x = ml + i * bw + (bw - w) / 2, y = mt + ih;
      if (c.emCurso && projs[i] - tot[i] > mx * 0.04) {
        var hp = ih * projs[i] / mx;
        g += '<rect x="' + x + '" y="' + (mt + ih - hp) + '" width="' + w + '" height="' + hp + '" fill="none" stroke="var(--tx3)" stroke-dasharray="4 3" rx="4"/>';
        g += '<text x="' + (x + w / 2) + '" y="' + (mt + ih - hp - 6) + '" text-anchor="middle" style="font-weight:600;fill:var(--tx2)">proj. ' + semS(projs[i]) + '</text>';
      }
      cats.forEach(function (k) {
        var v = c.cat[k] || 0; if (!v) return; var hh = ih * v / mx;
        g += '<rect x="' + x + '" y="' + (y - hh) + '" width="' + w + '" height="' + Math.max(0, hh - 1.5) + '" fill="' + corCat(k) + '"/>';
        if (hh > 16) g += '<text x="' + (x + w / 2) + '" y="' + (y - hh / 2 + 3.5) + '" text-anchor="middle" style="fill:#fff;font-weight:600;font-size:10px">' + semS(v) + '</text>';
        y -= hh;
      });
      g += '<text class="lbl" x="' + (x + w / 2) + '" y="' + (y - 6) + '" text-anchor="middle">' + m0(tot[i]) + '</text>';
      g += '<text x="' + (x + w / 2) + '" y="' + (H - mb + 15) + '" text-anchor="middle">' + fD(c.inicio) + ' –</text><text x="' + (x + w / 2) + '" y="' + (H - mb + 27) + '" text-anchor="middle">' + fD(c.fim) + (c.emCurso ? ' *' : '') + '</text>';
    });
    if (lim > 0) { var yl = mt + ih - ih * lim / mx; g += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + yl + '" y2="' + yl + '" stroke="var(--bad)" stroke-width="1.5" stroke-dasharray="6 4"/>'; }
    return g + '</svg>';
  }
  function acumulado(C, lim) {
    var W = largura(1000), H = 240, ml = 58, mr = 12, mt = 16, mb = 30, iw = W - ml - mr, ih = H - mt - mb;
    var N = Math.max.apply(null, C.map(function (c) { return c.dias; }));
    var series = C.map(function (c) {
      var por = {}; c.l.forEach(function (l) { por[l.data] = (por[l.data] || 0) + val(l); });
      var a = [], s = 0; for (var i = 0; i < c.decorridos; i++) { s += por[addDias(c.inicio, i)] || 0; a.push(s); } return a;
    });
    var mx = niceMax(Math.max.apply(null, [lim * 1.05, 1].concat(series.map(function (s) { return s.length ? s[s.length - 1] : 0; }))));
    var X = function (i) { return ml + iw * i / Math.max(1, N - 1); }, Y = function (v) { return mt + ih - ih * v / mx; };
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gasto acumulado no ciclo">';
    for (var i = 0; i <= 4; i++) { var y = Y(mx * i / 4); g += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y + '" y2="' + y + '" stroke="var(--grid)"/><text x="' + (ml - 6) + '" y="' + (y + 3.5) + '" text-anchor="end">' + semS(mx * i / 4) + '</text>'; }
    if (lim > 0) g += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(N - 1) + '" y2="' + Y(lim) + '" stroke="var(--bad)" stroke-dasharray="6 4" stroke-width="1.3"/><text x="' + X(Math.round(N * .55)) + '" y="' + (Y(lim * .55) + 16) + '" text-anchor="start" style="fill:var(--bad);font-weight:600">ritmo do limite</text>';
    var cores = ['#c3c9d2', '#9aa3b0', '#5b6573', 'var(--acc)'];
    series.forEach(function (s, j) {
      if (!s.length) return; var p = '';
      s.forEach(function (v, i) { p += (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); });
      var cor = cores[j + (4 - series.length)];
      g += '<path d="' + p + '" fill="none" stroke="' + cor + '" stroke-width="' + (j === series.length - 1 ? 2.6 : 1.6) + '"/>';
      var u = s.length - 1; g += '<circle cx="' + X(u) + '" cy="' + Y(s[u]) + '" r="3.5" fill="' + cor + '"/>';
      if (j === series.length - 1) g += '<text class="lbl" x="' + (X(u) + 7) + '" y="' + (Y(s[u]) - 7) + '">' + m0(s[u]) + ' até hoje</text>';
    });
    [1, 8, 15, 22, 29].forEach(function (dd) { if (dd <= N) g += '<text x="' + X(dd - 1) + '" y="' + (H - mb + 16) + '" text-anchor="middle">dia ' + dd + '</text>'; });
    return g + '</svg><div class="legend">' + C.map(function (c, j) { return '<span><i style="background:' + cores[j + (4 - C.length)] + '"></i>' + esc(c.rot) + (c.emCurso ? ' (atual)' : ' · fechou em ' + m0(c.comum)) + '</span>'; }).join('') + '</div>';
  }
  function colunas(rows, o) {
    var W = largura(o.w || 470), H = o.h || 200, ml = 50, mr = 8, mt = 20, mb = 26, iw = W - ml - mr, ih = H - mt - mb;
    var mx = niceMax(Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1])));
    var n = rows.length, bw = iw / n, w = Math.min(46, bw * .62);
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '">';
    for (var i = 0; i <= 4; i++) { var y = mt + ih - ih * i / 4; g += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y + '" y2="' + y + '" stroke="var(--grid)"/><text x="' + (ml - 6) + '" y="' + (y + 3.5) + '" text-anchor="end">' + semS(mx * i / 4) + '</text>'; }
    rows.forEach(function (r, i) {
      var x = ml + i * bw + (bw - w) / 2, hh = ih * r.v / mx;
      g += '<rect x="' + x + '" y="' + (mt + ih - hh) + '" width="' + w + '" height="' + hh + '" rx="3" fill="' + (r.c || 'var(--acc)') + '"/>';
      if (r.v > 0) g += '<text class="lbl" x="' + (x + w / 2) + '" y="' + (mt + ih - hh - 5) + '" text-anchor="middle">' + semS(r.v) + '</text>';
      g += '<text x="' + (x + w / 2) + '" y="' + (H - mb + 15) + '" text-anchor="middle">' + esc(r.lab) + '</text>';
    });
    return g + '</svg>';
  }
  function kpi(l, v, s) { return '<div class="kpi"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="s">' + s + '</div></div>'; }
  function linhaI(a, b, c) { return '<tr><td class="t"><b>' + a + '</b></td><td>' + b + '</td><td class="t note">' + c + '</td></tr>'; }
  function topSubs(C, nEq, RF) {
    var m = {}, comumT = 0, ult = C[C.length - 1], ant = C[C.length - 2];
    C.forEach(function (c) {
      c.l.forEach(function (l) {
        var nome = subDe(l), k = l.cat + '|' + (normNome(nome) || nome.toLowerCase()); comumT += val(l);
        if (!m[k]) m[k] = { nome: nome, cat: l.cat, tot: 0, n: 0, ult: 0, ant: 0, d: {} };
        m[k].tot += val(l); if (val(l) > 0 && !m[k].d[l.data]) { m[k].d[l.data] = 1; m[k].n++; } // compras = dias com compra ali
        if (c === ult) m[k].ult += val(l); if (c === ant) m[k].ant += val(l);
      });
    });
    return Object.keys(m).map(function (k) { var s = m[k]; s.porCiclo = RF ? s.tot + ((RF.porChave[k] || {}).esperV || 0) : s.tot / (nEq || C.length || 1); s.share = comumT ? s.tot / comumT : 0; return s; }).sort(function (a, b) { return b.tot - a.tot; });
  }

  function render() {
    var el = $('conteudo');
    if (!d.lancamentos.length) { el.innerHTML = '<div class="vazio">Ainda não há lançamentos.</div>'; return; }
    var C = calcular(), lim = d.limite;
    var atual = calcular([cicloAtual()])[0], fech = C.filter(function (c) { return !c.emCurso; }), temAtual = C.some(function (c) { return c.emCurso; });
    var h = hojeIso();
    if (!C.length) { el.innerHTML = '<div class="vazio">Não há lançamentos nesse período. Escolha outras datas.</div>'; $('stamp').innerHTML = ''; return; }
    $('stamp').innerHTML = 'Período <b>' + fDA(C[0].inicio) + ' – ' + fDA(C[C.length - 1].fim) + '</b><br>' + d.lancamentos.length + ' lançamentos no app<br>Gerado em ' + fDA(h);
    var MIN_PESO = 0.5;
    fech.forEach(function (c) { c.naMedia = c.peso >= MIN_PESO; });
    var curtos = fech.filter(function (c) { return !c.naMedia; });
    var F = fech.filter(function (c) { return c.naMedia; }), usaAtual = !F.length;
    if (usaAtual) { atual.peso = 1; atual.naMedia = true; F = [atual]; }
    var R = atual.R, restam = atual.dias - atual.decorridos;
    var nC = F.length || 1, nEq = F.reduce(function (s, c) { return s + c.peso; }, 0) || 1;
    var RP = usaAtual ? 'ciclo atual (' + esc(atual.rot) + ', dia ' + atual.decorridos + ' de ' + atual.dias + ')' : rotPeriodo(F.length);
    var notaCurtos = curtos.length ? 'Ciclos cortados com menos da metade dos dias (' + curtos.map(function (c) { return esc(c.rot); }).join(', ') + ') aparecem só como referência e não entram nas médias. ' : '';
    var notaBase = usaAtual ? 'Não há ciclo fechado no período escolhido: a base é o ciclo atual (o que já gastou + o que ainda deve entrar pela sua frequência). Para comparar com ciclos inteiros, escolha "3 ciclos". ' : '';
    function mediaCat(k) { return usaAtual ? (atual.projCat[k] || 0) : F.reduce(function (s, c) { return s + (c.cat[k] || 0); }, 0) / nEq; }
    var mediaComum = usaAtual ? atual.proj : F.reduce(function (s, c) { return s + c.comum; }, 0) / nEq;
    var acima = F.filter(function (c) { return lim > 0 && c.comum / c.peso > lim; }).length;
    var cats = COMUNS.concat(Object.keys(C.reduce(function (m, c) { Object.keys(c.cat).forEach(function (k) { if (COMUNS.indexOf(k) < 0 && c.cat[k]) m[k] = 1; }); return m; }, {})));

    var html = '<div class="kpis">' +
      kpi(usaAtual ? 'Gasto projetado no ciclo' : 'Gasto médio por ciclo', m0(mediaComum), lim > 0 ? '<span class="' + (mediaComum > lim ? 'bad' : 'good') + '">' + pct(mediaComum / lim) + ' do limite de ' + m0(lim) + '</span>' : 'sem limite definido no app') +
      (usaAtual ? kpi('Ciclos acima do limite', '—', 'nenhum ciclo fechado no período; escolha "3 ciclos"') :
        kpi('Ciclos acima do limite', lim > 0 ? acima + ' de ' + nC : '—', lim > 0 ? RP + (F.some(function (c) { return c.parcial; }) ? ' (cortados, proporcional)' : '') : 'defina o limite no app')) +
      kpi('Ciclo atual até hoje', m0(atual.comum), 'dia ' + atual.decorridos + ' de ' + atual.dias + ' · projeção <b class="' + (lim > 0 && atual.proj > lim ? 'bad' : '') + '">' + m0(atual.proj) + '</b>') +
      (function () {
        var rest = atual.dias - atual.decorridos, livre = lim - atual.comum;
        if (!(lim > 0)) return kpi('Pode gastar por dia', '—', 'defina o limite no app');
        if (rest <= 0) return kpi('Pode gastar por dia', '—', 'último dia do ciclo');
        if (livre <= 0) return kpi('Pode gastar por dia', '<span class="bad">' + m0(0) + '</span>', 'limite passado em ' + m0(-livre) + ' · só o essencial até ' + fD(atual.fim));
        return kpi('Pode gastar por dia', m0(livre / rest), m0(livre) + ' livres · ' + rest + ' dias até ' + fD(atual.fim));
      })() + '</div>';

    var alvos = COMUNS.map(function (k) {
      var orc = ORC[k] || 0, med = mediaCat(k), estouros = F.filter(function (c) { return orc > 0 && (c.cat[k] || 0) / c.peso > orc; }).length;
      return { k: k, orc: orc, med: med, exc: orc > 0 ? med - orc : 0, estouros: estouros };
    }).filter(function (a) { return a.med > 0; });
    var ruins = alvos.filter(function (a) { return a.orc > 0 && a.exc > 0; }).sort(function (a, b) { return b.exc - a.exc; });
    var semOrc = alvos.filter(function (a) { return !a.orc; });
    var subsTop = topSubs(F, nEq, usaAtual ? R : null);
    html += '<div class="grid" style="margin-top:12px">';
    if (ruins.length) {
      html += '<section class="card alvo"><div class="ch"><h2>Onde atacar primeiro</h2><span class="note">' + (usaAtual ? 'projeção' : 'média por ciclo') + ', ' + RP + ' × orçamento da categoria</span></div><ol>' +
        ruins.map(function (a) {
          var sub = subsTop.filter(function (s) { return s.cat === a.k; }).slice(0, 2);
          if (usaAtual) {
            var ja = atual.cat[a.k] || 0, vem = R.cat[a.k] || 0;
            return '<li><b>' + esc(nomeCat(a.k)) + '</b>: já gastou <b class="v">' + m0(ja) + '</b> de <b class="v">' + m0(a.orc) + '</b>' +
              (restam > 0 ? (vem >= 1 ? '; pela sua frequência ainda devem entrar <b class="v">' + m0(vem) + '</b>' : '; pela sua frequência não deve entrar mais nada') + ' → fecha em <b class="v">' + m0(a.med) + '</b>' : '') +
              ', <b class="v bad">' + m0(a.exc) + ' acima (' + pct(a.med / a.orc) + ' do orçamento)</b>.' +
              (sub.length ? ' O peso maior está em ' + sub.map(function (s) {
                var f = R.porChave[s.cat + '|' + (normNome(s.nome) || s.nome.toLowerCase())];
                return '<b>' + esc(s.nome) + '</b> (' + m0(s.tot) + ' em ' + s.n + (s.n === 1 ? ' ida' : ' idas') + (f && f.nH ? '; você costuma ir ' + vezes(f.freq) + ' por ciclo' : '') + ')';
              }).join(' e ') + '.' : '') + '</li>';
          }
          return '<li><b>' + esc(nomeCat(a.k)) + '</b>: gasta em média <b class="v">' + m0(a.med) + '</b> por ciclo, orçamento <b class="v">' + m0(a.orc) + '</b> → <b class="v bad">' + m0(a.exc) + ' acima (' + pct(a.med / a.orc) + ' do orçamento)</b>. Estourou em ' + a.estouros + ' de ' + nC + ' ciclos.' +
            (sub.length ? ' O peso maior está em ' + sub.map(function (s) { return '<b>' + esc(s.nome) + '</b> (' + m0(s.porCiclo) + '/ciclo: ' + vezes(s.n / nEq) + ' por ciclo, ' + m0(s.tot / s.n) + ' cada)'; }).join(' e ') + '.' : '') + '</li>';
        }).join('') +
        '</ol>' + (lim > 0 && mediaComum > lim ? '<p class="note" style="margin:8px 0 0">' + (usaAtual ?
          (restam > 0 ? 'Faltam ' + restam + (restam === 1 ? ' dia' : ' dias') + '. ' + (atual.comum >= lim ? 'O limite de ' + m0(lim) + ' já foi passado em <b class="bad">' + m0(atual.comum - lim) + '</b>: o que dá para fazer agora é não somar mais, só o essencial até ' + fD(atual.fim) + '.' : 'Sobram <b>' + m0(lim - atual.comum) + '</b> do limite, mas pela sua frequência devem entrar ' + m0(R.tot) + '. Corte ou adie ' + m0(mediaComum - lim) + ' disso.') : 'O ciclo fecha hoje.') + ' Para o próximo ciclo, veja no Ritmo onde você foi mais vezes que de costume.'
          : 'Para voltar ao limite, o gasto precisa cair <b class="bad">' + m0(mediaComum - lim) + ' por ciclo</b> (cerca de ' + m0((mediaComum - lim) / (atual.dias / 7)) + ' por semana).') + '</p>' : '') + '</section>';
    } else {
      html += '<section class="card ok-msg"><div class="ch"><h2>Onde atacar primeiro</h2></div><p style="margin:0">' + (alvos.some(function (a) { return a.orc > 0; }) ? 'Nenhuma categoria com orçamento está acima na média, ' + RP + '.' : 'Nenhuma categoria tem orçamento definido no app, então não há com o que comparar.') +
        (lim > 0 && mediaComum > lim ? ' Mas o <b>total</b> está ' + m0(mediaComum - lim) + ' acima do limite por ciclo: o limite é menor que a soma dos orçamentos, ou há gasto em categoria sem orçamento.' : '') + '</p></section>';
    }

    html += '<section class="card"><div class="ch"><h2>Gasto por ciclo</h2><span class="note">' + D.simb + ' por categoria · * ciclo em curso, até hoje</span></div>' +
      '<div class="legend">' + cats.filter(function (k) { return C.some(function (c) { return c.cat[k]; }); }).map(function (k) { return '<span><i style="background:' + corCat(k) + '"></i>' + esc(nomeCat(k)) + '</span>'; }).join('') + (lim > 0 ? '<span><i style="background:none;border-top:2px dashed var(--bad);border-radius:0;height:0;vertical-align:3px"></i>Limite ' + m0(lim) + '</span>' : '') + '<span><i style="background:none;border:1px dashed var(--tx3)"></i>Projeção do ciclo atual</span></div>' +
      barrasCiclo(C, lim, cats) + '</section>';

    html += '<section class="card"><div class="ch"><h2>Categorias: ciclo a ciclo × orçamento</h2><span class="note">o ciclo atual mostra o gasto até hoje e a projeção pela sua frequência</span></div><div class="tw"><table><thead><tr><th>Categoria</th>' +
      C.map(function (c) { return '<th>' + esc(c.rot) + (c.emCurso ? ' *' : c.parcial ? ' (parcial)' : '') + '</th>'; }).join('') + (temAtual ? '<th>Projeção do atual</th>' : '') + '<th>' + (usaAtual ? 'Base (projeção)' : 'Média por ciclo') + '</th><th>Orçamento</th><th>' + (usaAtual ? 'Base' : 'Média') + ' × orç.</th></tr></thead><tbody>' +
      cats.map(function (k) {
        var orc = ORC[k] || 0, vals = C.map(function (c) { return c.cat[k] || 0; });
        var proj = atual.projCat[k] || 0, med = mediaCat(k);
        if (!vals.some(Boolean) && !orc) return '';
        var r = orc ? med / orc : NaN;
        return '<tr><td><span class="sw" style="background:' + corCat(k) + '"></span>' + esc(nomeCat(k)) + '</td>' +
          vals.map(function (v, i) { var cl = orc && !C[i].emCurso && C[i].naMedia && v / C[i].peso > orc ? ' class="bad"' : ''; return '<td' + cl + '>' + m0(v) + '</td>'; }).join('') +
          (temAtual ? '<td' + (orc && proj > orc ? ' class="bad"' : '') + '>' + m0(proj) + '</td>' : '') + '<td><b>' + m0(med) + '</b></td><td>' + (orc ? m0(orc) : '—') + '</td><td class="' + (r > 1 ? 'bad' : r > .9 ? 'warn' : 'good') + '">' + (orc ? pct(r) : '—') + '</td></tr>';
      }).join('') +
      '<tr class="tot"><td>Total</td>' + C.map(function (c) { return '<td' + (lim && !c.emCurso && c.naMedia && c.comum / c.peso > lim ? ' class="bad"' : '') + '>' + m0(c.comum) + '</td>'; }).join('') +
      (temAtual ? '<td' + (lim && atual.proj > lim ? ' class="bad"' : '') + '>' + m0(atual.proj) + '</td>' : '') + '<td>' + m0(mediaComum) + '</td><td>' + (lim ? m0(lim) : '—') + '</td><td class="' + (lim && mediaComum > lim ? 'bad' : 'good') + '">' + (lim ? pct(mediaComum / lim) : '—') + '</td></tr>' +
      '</tbody></table></div><p class="note" style="margin:6px 0 0">' + (temAtual ? '* ciclo em curso, até ' + fD(h) + '. ' : '') + notaBase + notaCurtos + (F.some(function (c) { return c.parcial && !c.emCurso; }) ? 'Ciclos cortados nas datas escolhidas contam proporcionalmente na média. ' : '') + 'Vermelho = acima do orçamento.' + (semOrc.length ? ' Sem orçamento no app: ' + semOrc.map(function (a) { return esc(nomeCat(a.k)); }).join(', ') + '.' : '') + '</p></section>';

    var livre = lim - atual.comum, idealHoje = lim * atual.decorridos / atual.dias;
    html += '<section class="card"><div class="ch"><h2>Ritmo do ciclo atual</h2><span class="note">' + esc(atual.rot) + ' · dia ' + atual.decorridos + ' de ' + atual.dias + '</span></div>' +
      (lim > 0 && livre <= 0 ? '<p style="margin:0 0 8px">Até hoje você gastou <b>' + m0(atual.comum) + '</b>. Você já passou do limite de ' + m0(lim) + ' em <b class="bad">' + m0(-livre) + '</b>.' +
        (restam > 0 ? ' Até ' + fD(atual.fim) + ' (faltam ' + restam + (restam === 1 ? ' dia' : ' dias') + '), só o essencial.' : '') + '</p>' :
      lim > 0 ? '<p style="margin:0 0 8px">Até hoje você gastou <b>' + m0(atual.comum) + '</b>; no ritmo do limite seriam <b>' + m0(idealHoje) + '</b> ' +
        (atual.comum > idealHoje ? '→ <b class="bad">' + m0(atual.comum - idealHoje) + ' adiantado</b>.' : '→ <b class="good">' + m0(idealHoje - atual.comum) + ' de folga</b>.') +
        (restam > 0 ? ' Para fechar dentro do limite, sobram <b class="' + (livre < 0 ? 'bad' : '') + '">' + m0(Math.max(0, livre)) + '</b> para ' + restam + ' dias: <b>' + m0(Math.max(0, livre) / restam) + ' por dia</b> (até agora a média foi ' + m0(atual.comum / Math.max(1, atual.decorridos)) + ' por dia).' : '') + '</p>' : '') +
      blocoFrequencia(atual, lim) +
      acumulado(fech.filter(function (c) { return !c.parcial; }).slice(-3).concat([atual]), lim) + '</section>';

    html += '<section class="card longa"><div class="ch"><h2>Para onde o dinheiro vai</h2><span class="note">subcategoria ou descrição · ' + RP + '</span></div><div class="tw"><table><thead><tr><th>Onde</th><th>Categoria</th><th>Compras</th><th>Total</th><th>Por ciclo</th><th>Média por compra</th><th>% do total</th><th>Último × anterior</th></tr></thead><tbody>' +
      subsTop.slice(0, 15).map(function (s) {
        var vr = s.ant > 0 ? (s.ult - s.ant) / s.ant : NaN;
        return '<tr><td class="t"><b>' + esc(s.nome) + '</b></td><td><span class="sw" style="background:' + corCat(s.cat) + '"></span>' + esc(nomeCat(s.cat)) + '</td><td>' + s.n + '</td><td>' + m0(s.tot) + '</td><td>' + m0(s.porCiclo) + '</td><td>' + money(s.tot / s.n) + '</td><td>' + pct(s.share) + '</td><td class="' + (vr > .1 ? 'bad' : vr < -.1 ? 'good' : '') + '">' + (isFinite(vr) ? (vr > 0 ? '▲ ' : '▼ ') + pct(Math.abs(vr)) : '—') + '</td></tr>';
      }).join('') +
      '</tbody></table></div><p class="note" style="margin:6px 0 0">' + (usaAtual ? 'Total = ciclo atual até hoje; "por ciclo" = total + o que ainda deve entrar pela sua frequência. ' : 'Total = soma dos ciclos usados na média; "por ciclo" = total ÷ ciclos. ') + '"Último × anterior" compara os dois últimos ciclos fechados' + (F.length < 2 || usaAtual ? ' (precisa de 2 ciclos fechados)' : '') + '.</p></section>';

    var comuns = []; F.forEach(function (c) { c.l.forEach(function (l) { comuns.push(l); }); });
    var totC = comuns.reduce(function (s, l) { return s + val(l); }, 0) || 1;
    var peq = comuns.filter(function (l) { return val(l) > 0 && val(l) < PEQUENO; }), peqT = peq.reduce(function (s, l) { return s + val(l); }, 0);
    var mercTodos = catMerc ? comuns.filter(function (l) { return l.cat === catMerc.id; }) : [], merc = mercTodos.filter(function (l) { return val(l) > 0; }), mercT = mercTodos.reduce(function (s, l) { return s + val(l); }, 0);
    var diasCom = {}; comuns.forEach(function (l) { if (val(l) > 0) diasCom[l.data] = 1; });
    var diasTot = F.reduce(function (s, c) { return s + c.decorridos; }, 0) || 1, nDias = Object.keys(diasCom).length;
    var fds = comuns.filter(function (l) { var w = dt(l.data).getDay(); return w === 0 || w === 6; }).reduce(function (s, l) { return s + val(l); }, 0);
    html += '<section class="card"><div class="ch"><h2>Índices de comportamento</h2><span class="note">' + RP + '</span></div><div class="tw"><table><thead><tr><th>Índice</th><th>Valor</th><th>O que quer dizer</th></tr></thead><tbody>' +
      linhaI('Gastos pequenos (abaixo de ' + D.simb + ' ' + PEQUENO + ')', peq.length + ' compras · ' + m0(peqT) + ' (' + pct(peqT / totC) + ')', 'O "vazamento": cada um parece nada, somados ' + (usaAtual ? 'já são ' + m0(peqT) + ' neste ciclo.' : 'viram ' + m0(peqT / nEq) + ' por ciclo.')) +
      (catMerc ? linhaI('Idas ao ' + esc(catMerc.nome.toLowerCase()), (usaAtual ? merc.length + ' neste ciclo até hoje' + (R && R.nHist ? ' (costuma ser ' + vezes(R.lugares.filter(function (s) { return s.cat === catMerc.id; }).reduce(function (t, s) { return t + s.freq; }, 0)).replace('×', '') + ' por ciclo)' : '') : (merc.length / nEq).toFixed(1).replace('.', ',') + ' por ciclo') + ' · média por compra ' + money(merc.length ? mercT / merc.length : 0), 'Menos idas, com lista, costuma baixar o total: cada ida tem compra por impulso.') : '') +
      linhaI('Dias com gasto', nDias + ' de ' + diasTot + ' dias (' + pct(nDias / diasTot) + ')', 'Dias "sem gasto" são o jeito mais simples de cortar sem sentir.') +
      linhaI('Gasto médio por dia', money(totC / diasTot), lim > 0 ? 'O limite permite ' + money(lim / atual.dias) + ' por dia.' : '') +
      linhaI('Fim de semana', m0(fds) + ' (' + pct(fds / totC) + ')', 'Sáb e dom são 29% dos dias; acima disso, o fim de semana pesa.') +
      linhaI('Concentração', pct(subsTop.slice(0, 3).reduce(function (s, x) { return s + x.tot; }, 0) / totC) + ' em 3 lugares', 'Os 3 maiores destinos: ' + subsTop.slice(0, 3).map(function (s) { return esc(s.nome); }).join(', ') + '.') +
      '</tbody></table></div></section>';

    var porDS = [0, 0, 0, 0, 0, 0, 0], ocDS = [0, 0, 0, 0, 0, 0, 0];
    F.forEach(function (c) { for (var i = 0; i < c.decorridos; i++) ocDS[dt(addDias(c.inicio, i)).getDay()]++; });
    comuns.forEach(function (l) { porDS[dt(l.data).getDay()] += val(l); });
    html += '<section class="card c6"><div class="ch"><h2>Gasto por dia da semana</h2><span class="note">média por dia, ' + D.simb + '</span></div>' +
      colunas([1, 2, 3, 4, 5, 6, 0].map(function (w) { var v = ocDS[w] ? porDS[w] / ocDS[w] : 0; return { lab: DIASEM[w], v: v, c: (w === 0 || w === 6) ? '#eb6834' : 'var(--acc)' }; }), { aria: 'Gasto médio por dia da semana', w: 470, h: 210 }) + '</section>';
    html += '<section class="card c6"><div class="ch"><h2>10 maiores gastos</h2><span class="note">' + RP + '</span></div><div class="tw"><table><thead><tr><th>Data</th><th>Onde</th><th>Valor</th></tr></thead><tbody>' +
      comuns.slice().sort(function (a, b) { return val(b) - val(a); }).slice(0, 10).map(function (l) { return '<tr><td>' + fD(l.data) + '</td><td class="t"><span class="sw" style="background:' + corCat(l.cat) + '"></span>' + esc(l.desc || subDe(l)) + '</td><td>' + money(val(l)) + '</td></tr>'; }).join('') +
      '</tbody></table></div></section>';
    html += '</div><p class="foot">Total = soma de todas as categorias do app (sem parcelados). Ciclos = o Período do app (' + fD(d.periodo.inicio) + ' → ' + fD(d.periodo.fim) + '), repetido mês a mês. Projeção do ciclo atual = o que já gastou + o que ainda deve entrar pela sua frequência: para cada lugar, quantas vezes você vai por ciclo e quanto gasta por ida (últimos ciclos fechados, até 6); nos dias que faltam conta só as idas que ainda cabem no seu costume (se já foi as vezes de sempre, não conta mais). Compra sem histórico não é repetida. Médias, índices e "onde atacar" usam os ciclos fechados do período escolhido (' + RP + '); ciclo cortado com menos da metade dos dias fica fora; sem nenhum ciclo fechado, a base é o ciclo atual com essa projeção. O Ritmo mostra sempre o ciclo de hoje.</p>';
    el.innerHTML = html;
  }

  function paraPDF(sim) { if (PRINT === sim) return; PRINT = sim; render(); }
  $('btPdf').onclick = function () { paraPDF(true); setTimeout(function () { window.print(); setTimeout(function () { paraPDF(false); }, 800); }, 120); };
  window.addEventListener('beforeprint', function () { paraPDF(true); });
  window.addEventListener('afterprint', function () { paraPDF(false); });
  $('btFechar').onclick = function () { window.close(); };
  function pintarPeriodo() {
    var modo = PER.n ? String(PER.n) : (PER.ano ? 'ano' : 'custom');
    document.querySelectorAll('.periodo .pb').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.n === modo ? 'true' : 'false'); });
    $('pCustom').hidden = modo !== 'custom';
    if (!PER.n) { $('pDe').value = PER.de; $('pAte').value = PER.ate; }
  }
  function usarPeriodo(p) { PER = p; try { localStorage.setItem('mc.relper', JSON.stringify(p)); } catch (e) {} pintarPeriodo(); render(); }
  document.querySelectorAll('.periodo .pb').forEach(function (b) {
    b.onclick = function () {
      var n = b.dataset.n, h = hojeIso();
      if (n === 'ano') usarPeriodo({ de: h.slice(0, 4) + '-01-01', ate: h, ano: true });
      else if (n === 'custom') {
        $('pCustom').hidden = false;
        document.querySelectorAll('.periodo .pb').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        if (!$('pDe').value) { $('pDe').value = addMeses(h, -3); $('pAte').value = h; }
        $('pDe').focus();
      } else usarPeriodo({ n: +n });
    };
  });
  $('pOk').onclick = function () {
    var a = $('pDe').value, b = $('pAte').value;
    if (!a || !b) return;
    if (a > b) { var t = a; a = b; b = t; }
    usarPeriodo({ de: a, ate: b });
  };
  pintarPeriodo();
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (!PRINT) render(); }, 200); });
  render();
}

function abrirRelatorioCompleto() {
  var lanc = lancamentos().filter(function (l) { return l.cat !== PARC && l.data; }).map(function (l) {
    return { data: l.data, valor: l.valor, cat: l.cat, sub: nomeSub(l.cat, l.sub) || '', desc: l.desc || '' };
  });
  if (!lanc.length) { mostrarToast('⚠️', 'Ainda não há lançamentos'); return; }
  var D = { lanc: lanc, cats: catsComuns().map(function (c) { return { id: c.id, nome: c.nome, cor: c.cor, orc: +c.orc || 0 }; }),
    limite: baseDisponivel(), periodo: S.cfg.periodo || periodoMesAtual(), simb: SIMB[moeda()] || '$', br: moeda() === 'BRL' || moeda() === 'EUR' };
  var w = window.open('', '_blank');
  if (!w) { mostrarToast('⚠️', 'Permita pop-ups para abrir o relatório'); return; }
  var json = JSON.stringify(D).replace(/</g, '\\u003c');
  var nome = esc(S.cfg.nome || 'MinhaCasa');
  w.document.open();
  w.document.write('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
    '<title>' + nome + ' — Relatório</title><style>' + REL_CSS + '</style></head><body><div class="wrap">' +
    '<header class="top"><div><div class="kick">' + nome + ' · Relatório</div><h1>Onde o orçamento está quebrando</h1></div><div class="stamp" id="stamp"></div></header>' +
    '<div class="barra"><div class="fonte">Dados do app, lidos agora</div><button class="btn sec" id="btFechar" type="button">Fechar</button><button class="btn" id="btPdf" type="button">Salvar PDF</button></div>' +
    '<div class="periodo" role="group" aria-label="Período do relatório"><span class="plab">Período</span>' +
    '<button type="button" class="pb" data-n="3">3 ciclos</button><button type="button" class="pb" data-n="6">6 ciclos</button><button type="button" class="pb" data-n="12">12 ciclos</button>' +
    '<button type="button" class="pb" data-n="ano">Este ano</button><button type="button" class="pb" data-n="custom">Escolher datas</button>' +
    '<span class="pcustom" id="pCustom" hidden><label>de <input type="date" id="pDe"></label><label>até <input type="date" id="pAte"></label><button type="button" class="btn" id="pOk">Aplicar</button></span></div>' +
    '<div id="conteudo"><div class="vazio">Carregando…</div></div></div>' +
    '<script>(' + motorRelatorio.toString() + ')(' + json + ');<\/script></body></html>');
  w.document.close();
}
function ligarBotaoRelatorioCompleto() {
  // o atalho agora faz parte da central de Relatórios (index.html)
  if ($('btn-rel-completo')) $('btn-rel-completo').onclick = abrirRelatorioCompleto;
}

// ═════════════════════════ AJUSTES ═════════════════════════
function codigoConvite() { return S.meta && S.meta.convite ? 'HV-' + S.casa + '-' + S.meta.convite : ''; }
// Link de convite: o código vai dentro do link, e a pessoa só precisa tocar nele (14/11/2026)
function linkConvite() { var c = codigoConvite(); return c ? location.origin + location.pathname + '#convite=' + c : ''; }
var CHAVE_CONV = 'hv_convite_pendente';
function convitePendente() { try { return localStorage.getItem(CHAVE_CONV) || ''; } catch (e) { return ''; } }
function capturarConviteDoLink() {
  var m = /[#&]convite=([^&]+)/i.exec(location.hash || '');
  if (!m) return;
  var c = decodeURIComponent(m[1]);
  if (lerConvite(c)) { try { localStorage.setItem(CHAVE_CONV, c); } catch (e) {} }
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
}
function souDono() { return S.meta && S.user && S.meta.dono === S.user.uid; }
function renderAjustes() {
  if (document.activeElement !== $('aj-nome')) { $('aj-nome').value = S.cfg.nome || ''; $('aj-moeda').value = moeda(); }
  $('aj-cats').innerHTML = todasCats().map(function (c) {
    return '<div class="aj-linha"><div class="aj-ic" style="background:' + alfa(c.cor, '22') + '">' + esc(c.emoji) + '</div>' +
      '<div class="aj-nm">' + esc(c.nome) + '<small>' + (c.id === PARC ? 'Fixa · recebe as compras parceladas' : c.subs.length + ' subcategoria' + (c.subs.length === 1 ? '' : 's')) +
      ' · orçamento ' + (+c.orc ? formatar(c.orc) : '—') + '</small></div>' +
      (c.id === PARC ? '<button class="aj-btn" data-editcat="' + PARC + '">Orçamento</button>' :
        '<button class="aj-btn" data-subircat="' + c.id + '" aria-label="Subir">↑</button><button class="aj-btn" data-editcat="' + c.id + '">Editar</button>') + '</div>';
  }).join('');
  $('aj-codigo').textContent = linkConvite();
  $('aj-copiar').textContent = 'Copiar link';
  var dsc = $('aj-codigo').previousElementSibling; if (dsc) dsc.innerHTML = 'Toque em <b>Compartilhar</b> e mande o link pelo WhatsApp. A pessoa toca no link, cria a conta e digita a <b>senha da casa</b>, que você passa <b>à parte</b> (pessoalmente ou por ligação).';
  $('aj-novocod').style.display = souDono() ? '' : 'none';
  if ($('aj-trocarsenha')) $('aj-trocarsenha').style.display = souDono() ? '' : 'none';
  $('aj-membros').innerHTML = Object.keys(S.membros).map(function (uid) {
    var p = S.perfis[uid] || {}, eu = uid === S.user.uid, dono = S.meta && S.meta.dono === uid;
    return '<div class="aj-linha"><div class="aj-ic" style="background:#eef2ff">👤</div><div class="aj-nm">' + esc(p.nome || 'Membro') + (eu ? ' (você)' : '') +
      '<small>' + esc(p.email || '') + (dono ? ' · criou a casa' : '') + '</small></div>' +
      (souDono() && !eu ? '<button class="aj-btn perigo" data-remover="' + uid + '">Remover</button>' : '') + '</div>';
  }).join('');
  renderAdmin();
  renderLimparTeste();
  $('aj-conferir').onclick = abrirConferencia;
  $('aj-applepay').onclick = abrirApplePay; renderStatusApplePay();
  $('aj-conta').textContent = 'Conectado como ' + (S.user.email || '') + '.';
  $('aj-versao').textContent = VERSAO;
}
function salvarCasaAj() {
  var nome = $('aj-nome').value.trim();
  if (!nome) { mostrarToast('⚠️', 'Informe o nome da casa'); return; }
  S.cfg.nome = nome; S.cfg.moeda = $('aj-moeda').value;
  salvarCfg().then(function () { mostrarToast('✅', 'Salvo'); });
  renderTela();
}
function subirCat(id) {
  var cs = S.cfg.cats, i = -1;
  cs.forEach(function (c, k) { if (c.id === id) i = k; });
  if (i <= 0) return;
  var t = cs[i]; cs[i] = cs[i - 1]; cs[i - 1] = t;
  salvarCfg(); renderTela();
}

// Folha de edição de categoria
var _ed = null;
function abrirSheet(html) {
  $('sheet-box').innerHTML = html;
  $('sheet').classList.add('on');
}
function fecharSheet() { $('sheet').classList.remove('on'); _ed = null; }

// Orçamento inicial (14/11/2026): pergunta o limite do período logo depois de criar a casa,
// e também quando a pessoa toca em "Definir orçamento". Pode pular e definir depois.
function abrirOrcamentoInicial() {
  var p = S.cfg.periodo;
  abrirSheet('<div style="font-size:17px;font-weight:800;margin-bottom:6px">💰 Quanto vocês podem gastar?</div>' +
    '<div style="font-size:13px;color:#4b5563;line-height:1.45;margin-bottom:10px">Com um limite, o app mostra quanto ainda está disponível, avisa quando estiver perto de estourar e calcula quanto dá para gastar por dia.</div>' +
    '<label class="aj-label" for="oi-limite">Limite de gastos no período (' + (SIMB[moeda()] || '$') + ')</label><input class="aj-input" id="oi-limite" inputmode="decimal" placeholder="Ex.: 3.000,00">' +
    '<div style="display:flex;gap:8px"><div style="flex:1"><label class="aj-label" for="oi-ini">Início do período</label><input class="aj-input" id="oi-ini" type="date" value="' + esc(p.inicio) + '"></div>' +
    '<div style="flex:1"><label class="aj-label" for="oi-fim">Fim</label><input class="aj-input" id="oi-fim" type="date" value="' + esc(p.fim) + '"></div></div>' +
    '<div style="font-size:12px;color:#6b7280;margin-top:6px">Dá para mudar depois em Início → Configurações. Os orçamentos de cada categoria ficam em Ajustes.</div>' +
    '<div id="oi-erro" style="color:#dc2626;font-size:13px;margin-top:8px;min-height:18px"></div>' +
    '<div style="display:flex;gap:8px;margin-top:4px"><button class="aj-btn" style="flex:1" id="oi-depois">Depois</button><button class="aj-btn pri" style="flex:1" id="oi-ok">Salvar</button></div>');
  $('oi-depois').onclick = fecharSheet;
  $('oi-ok').onclick = function () {
    var v = lerValor($('oi-limite').value), a = $('oi-ini').value, b = $('oi-fim').value;
    if (!(v > 0)) { $('oi-erro').textContent = 'Informe um valor válido, por exemplo 3.000,00.'; return; }
    if (!a || !b || a > b) { $('oi-erro').textContent = 'Confira as datas: o início precisa vir antes do fim.'; return; }
    S.cfg.limite = v; S.cfg.periodo = { inicio: a, fim: b };
    var somaC = orcComum();
    salvarCfg().then(function () { fecharSheet(); mostrarToast(somaC > v + 0.004 ? '⚠️' : '✅', somaC > v + 0.004 ? 'Salvo. Mas as categorias somam ' + formatar(somaC) + ', acima do limite: reduza em Início → Configurações.' : 'Orçamento salvo', somaC > v + 0.004 ? 5500 : undefined); renderTela(); }, function () { $('oi-erro').textContent = 'Não foi possível salvar agora. Tente de novo.'; });
  };
}

// ── Trocar senha da casa (14/11/2026) ──
// Só o dono. Gera chave nova, recriptografa config, lançamentos e perfis e troca salt, verificação, prova e convite
// numa única gravação (tudo ou nada). Os outros membros passam a precisar da senha nova.
function abrirTrocarSenha() {
  if (!souDono()) return;
  abrirSheet('<div class="sheet-tit" style="font-size:17px;font-weight:800;margin-bottom:6px">🔑 Trocar senha da casa</div>' +
    '<div style="font-size:13px;color:#4b5563;line-height:1.45;margin-bottom:10px">Use quando alguém sair da casa ou se a senha vazou. Os outros membros vão precisar digitar a senha nova, e o link de convite antigo para de valer.</div>' +
    '<label class="aj-label" for="ts-atual">Senha atual da casa</label><input class="aj-input" id="ts-atual" type="password" autocomplete="off">' +
    '<label class="aj-label" for="ts-nova">Senha nova (mínimo 10 caracteres)</label><input class="aj-input" id="ts-nova" type="password" autocomplete="new-password">' +
    '<label class="aj-label" for="ts-nova2">Repita a senha nova</label><input class="aj-input" id="ts-nova2" type="password" autocomplete="new-password">' +
    '<label style="display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#374151;margin-top:10px"><input type="checkbox" id="ts-ciente" style="margin-top:3px"> Anotei a senha nova. Sem ela, ninguém consegue abrir os dados (nem eu).</label>' +
    '<div id="ts-erro" style="color:#dc2626;font-size:13px;margin-top:8px;min-height:18px"></div>' +
    '<div style="display:flex;gap:8px;margin-top:6px"><button class="aj-btn" style="flex:1" id="ts-cancelar">Cancelar</button><button class="aj-btn pri" style="flex:1" id="ts-ok">Trocar senha</button></div>');
  $('ts-cancelar').onclick = fecharSheet;
  $('ts-ok').onclick = trocarSenhaCasa;
}
function trocarSenhaCasa() {
  var atual = $('ts-atual').value, nova = $('ts-nova').value, nova2 = $('ts-nova2').value, er = $('ts-erro');
  er.textContent = '';
  if (!atual) { er.textContent = 'Digite a senha atual.'; return; }
  if (nova.length < 10) { er.textContent = 'A senha nova precisa ter pelo menos 10 caracteres.'; return; }
  if (nova !== nova2) { er.textContent = 'As senhas novas não conferem.'; return; }
  if (nova === atual) { er.textContent = 'A senha nova precisa ser diferente da atual.'; return; }
  if (!$('ts-ciente').checked) { er.textContent = 'Confirme que anotou a senha nova.'; return; }
  var btn = $('ts-ok'); btn.disabled = true; btn.textContent = 'Trocando…';
  var casa = S.casa, salt = b64(crypto.getRandomValues(new Uint8Array(16))), convite = rid(24), nk, upd = {};
  derivarChave(atual, S.meta.salt)
    .then(function (k) { return decifrar(k, S.meta.verif).catch(function () { throw { msg: 'Senha atual incorreta.' }; }); })
    .then(function () { return derivarChave(nova, salt); })
    .then(function (k) {
      nk = k;
      var ps = [cifrar(nk, VERIF_TEXTO).then(function (v) { upd.verif = v; }),
        provaDaChave(nk).then(function (pv) { upd.prova = pv; }),
        cifrar(nk, S.cfg).then(function (c) { upd['dados/config'] = c; })];
      Object.keys(S.raw).forEach(function (id) { ps.push(cifrar(nk, S.raw[id]).then(function (c) { upd['dados/lanc/' + id] = c; })); });
      Object.keys(S.perfis || {}).forEach(function (uid) { ps.push(cifrar(nk, S.perfis[uid]).then(function (c) { upd['dados/perfis/' + uid] = c; })); });
      return Promise.all(ps);
    })
    .then(function () {
      upd.salt = salt; upd.convite = convite; upd.convVer = 2;
      upd['membros/' + S.user.uid] = convite + ':' + upd.prova;
      pararEscuta();
      return db.ref('casas/' + casa).update(upd);
    })
    .then(function () {
      S.meta.salt = salt; S.meta.verif = upd.verif; S.meta.prova = upd.prova; S.meta.convite = convite; S.meta.convVer = 2;
      return IDB.set(S.user.uid + ':' + casa, nk);
    })
    .then(function () { fecharSheet(); abrirCasa(nk); mostrarToast('🔑', 'Senha da casa trocada. Mande o link de convite novo para quem mora com você.'); })
    .catch(function (e) {
      if (S.chave && !S.refs.length) escutar();
      er.textContent = (e && e.msg) || 'Não foi possível trocar a senha agora (' + ((e && e.code) || 'erro') + '). Nada foi alterado.';
      btn.disabled = false; btn.textContent = 'Trocar senha';
    });
}
// Membro cuja chave guardada deixou de abrir os dados: a senha da casa foi trocada
function senhaDaCasaMudou() {
  pararEscuta();
  var casa = S.casa;
  IDB.del(S.user.uid + ':' + casa).then(function () { return db.ref('casas/' + casa).once('value'); }).then(function (snap) {
    S.meta = snap.val() || S.meta; S.chave = null; S.raw = {}; S.cfg = null;
    mostrarEntrada('card-unlock');
    $('ul-erro').textContent = 'A senha da casa foi trocada. Digite a senha nova (peça para quem criou a casa).';
  }, function () { mostrarEntrada('card-unlock'); });
}
function abrirCat(id) {
  if (id === PARC) {
    abrirSheet('<h3>📦 Parcelados</h3><p style="color:#6b7280;font-size:13.5px">Categoria fixa: recebe automaticamente as compras parceladas. Defina o orçamento mensal para parcelas.</p>' +
      '<label class="aj-label">Orçamento</label><input class="aj-input" id="ed-orc" inputmode="decimal" value="' + esc(numTxt(S.cfg.orcParc)) + '" placeholder="0">' +
      '<button class="aj-btn pri aj-full" id="ed-salvar">Salvar</button><button class="aj-btn aj-full" data-fechar>Cancelar</button>');
    $('ed-salvar').onclick = function () { var v = lerValor($('ed-orc').value); S.cfg.orcParc = v > 0 ? v : 0; salvarCfg(); fecharSheet(); renderTela(); };
    return;
  }
  var orig = id ? catPorId(id) : null;
  _ed = orig ? JSON.parse(JSON.stringify(orig)) : { id: rid(8), emoji: '📦', nome: '', cor: PALETA[catsComuns().length % PALETA.length], orc: 0, subs: [], nova: true };
  _ed.orcAntes = +_ed.orc || 0;
  desenharCat();
}
function desenharCat() {
  var c = _ed;
  abrirSheet('<h3>' + (c.nova ? 'Nova categoria' : 'Editar categoria') + '</h3>' +
    '<label class="aj-label">Nome</label><input class="aj-input" id="ed-nome" maxlength="30" value="' + esc(c.nome) + '">' +
    '<label class="aj-label">Orçamento no período</label><input class="aj-input" id="ed-orc" inputmode="decimal" placeholder="0 = sem orçamento" value="' + esc(numTxt(c.orc)) + '">' +
    '<div class="ed-orc-info" id="ed-orc-info"></div>' +
    '<label class="aj-label">Ícone</label><div class="emo-grid">' + EMOJIS.map(function (e) { return '<button class="' + (e === c.emoji ? 'on' : '') + '" data-emo="' + e + '">' + e + '</button>'; }).join('') + '</div>' +
    '<label class="aj-label">Cor</label><div class="cor-grid">' + PALETA.map(function (k) { return '<button class="' + (k === c.cor ? 'on' : '') + '" data-cor="' + k + '" style="background:' + k + '"></button>'; }).join('') + '</div>' +
    '<label class="aj-label">Subcategorias</label>' +
    c.subs.map(function (s, i) { return '<div class="sub-ed"><input class="aj-input" data-subnome="' + i + '" maxlength="40" value="' + esc(s.nome) + '"><button class="aj-btn perigo" data-subdel="' + i + '">Excluir</button></div>'; }).join('') +
    '<div class="sub-ed"><input class="aj-input" id="ed-novasub" maxlength="40" placeholder="Nova subcategoria"><button class="aj-btn" id="ed-addsub">Adicionar</button></div>' +
    '<div class="hv-erro" id="ed-erro"></div>' +
    '<button class="aj-btn pri aj-full" id="ed-salvar">Salvar categoria</button>' +
    '<button class="aj-btn aj-full" data-fechar>Cancelar</button>' +
    (c.nova ? '' : '<button class="aj-btn perigo aj-full" id="ed-excluir">Excluir categoria</button>'));
  $('ed-orc').oninput = infoOrcCat; infoOrcCat();
}
// Trava do orçamento na edição da categoria: quanto ainda sobra do valor para gastar para esta categoria.
function maxOrcCat(id) {
  var lim = +S.cfg.limite || 0; if (!(lim > 0)) return Infinity;
  var outros = catsComuns().reduce(function (s, x) { return x.id === id ? s : s + (+x.orc || 0); }, 0);
  return Math.max(0, c2(lim - outros));
}
function infoOrcCat() {
  var el = $('ed-orc-info'); if (!el || !_ed) return;
  var max = maxOrcCat(_ed.id);
  if (max === Infinity) { el.textContent = 'Sem "valor para gastar" definido no Início, então não há limite para a soma das categorias.'; el.className = 'ed-orc-info'; return; }
  var v = lerValor($('ed-orc').value); v = isFinite(v) && v > 0 ? v : 0;
  var passou = v > max + 0.004 && v > (_ed.orcAntes || 0);
  el.className = 'ed-orc-info' + (passou ? ' passou' : '');
  el.innerHTML = passou ? '⚠️ Passa ' + formatar(c2(v - max)) + ' do que sobra. Máximo para esta categoria: <b>' + formatar(max) + '</b>.'
    : 'Disponível para esta categoria: até <b>' + formatar(max) + '</b> (valor para gastar ' + formatar(+S.cfg.limite) + ').' + (v ? ' Depois sobram ' + formatar(c2(max - v)) + ' para as outras.' : '');
}
function lerCatInputs() {
  if (!_ed || !$('ed-nome')) return;
  _ed.nome = $('ed-nome').value;
  var v = lerValor($('ed-orc').value); _ed.orc = v > 0 ? v : 0;
  qsa('[data-subnome]').forEach(function (inp) { _ed.subs[+inp.dataset.subnome].nome = inp.value; });
}
function salvarCat() {
  lerCatInputs();
  var c = _ed; c.nome = c.nome.trim();
  if (!c.nome) { $('ed-erro').textContent = 'Informe o nome da categoria.'; return; }
  var maxO = maxOrcCat(c.id);
  if (c.orc > maxO + 0.004 && c.orc > (c.orcAntes || 0)) {
    $('ed-erro').textContent = 'A soma das categorias passaria do valor para gastar (' + formatar(+S.cfg.limite) + '). O máximo para esta categoria é ' + formatar(maxO) + '.';
    return;
  }
  delete c.orcAntes;
  var pend = $('ed-novasub').value.trim();
  if (pend) c.subs.push({ id: rid(8), nome: pend });
  c.subs = c.subs.map(function (s) { return { id: s.id, nome: s.nome.trim() }; }).filter(function (s) { return s.nome; });
  var nova = c.nova; delete c.nova;
  if (nova) S.cfg.cats.push(c);
  else S.cfg.cats = S.cfg.cats.map(function (x) { return x.id === c.id ? c : x; });
  fecharSheet(); renderTela();
  salvarCfg().then(function () { mostrarToast('✅', 'Categoria salva'); });
}
function excluirCat() {
  var c = _ed, usados = lancamentos().filter(function (l) { return l.cat === c.id; }).length;
  if (!confirm('Excluir a categoria "' + c.nome + '"?' + (usados ? '\n\n' + usados + ' lançamento(s) ficarão como "Sem categoria".' : ''))) return;
  S.cfg.cats = S.cfg.cats.filter(function (x) { return x.id !== c.id; });
  fecharSheet(); renderTela(); salvarCfg();
}

// Convite / membros
// ── Administrador (14/11/2026) ──
// O cartão só aparece se o Firebase deixar ler admin/codigoAcesso. Quem pode ler e trocar é decidido nas regras
// (o dono da casa do Luiz), então esconder o cartão não é a proteção: a proteção é o servidor recusar os outros.
// Convites com nome (14/11/2026): um código por pessoa, que vale uma vez. Ao criar a casa, o app grava em
// convites/<código> quem usou (uid, e-mail, data). contas/<uid> guarda e-mail e último acesso. Só o admin lê os dois.
var _adm = { uid: null, codigo: null, confirmar: null, convites: {}, contas: {} };
var CHARS_COD = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function aleatorio(n) { var r = crypto.getRandomValues(new Uint8Array(n)), t = ''; for (var i = 0; i < n; i++) t += CHARS_COD[r[i] % CHARS_COD.length]; return t; }
function dataHora(ts) { if (!ts) return '—'; var d = new Date(ts); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function renderAdmin() {
  var box = $('aj-admin'); if (!box || !S.user) return;
  if (_adm.uid === S.user.uid) { mostrarAdmin(); return; }
  _adm.uid = S.user.uid; _adm.codigo = null;
  db.ref('admin/codigoAcesso').once('value').then(function (snap) { _adm.codigo = snap.val() || ''; mostrarAdmin(); carregarConvites(); }, function () { _adm.codigo = null; box.style.display = 'none'; });
}
function carregarConvites() {
  return Promise.all([db.ref('convites').once('value'), db.ref('contas').once('value').catch(function () { return null; })]).then(function (r) {
    _adm.convites = r[0].val() || {}; _adm.contas = (r[1] && r[1].val()) || {}; mostrarAdmin();
  }, function (e) { $('adm-erro').textContent = 'Não foi possível ler os convites (' + ((e && e.code) || e) + '). As regras do Firebase estão atualizadas?'; });
}
function msgConvite(nome, cod) {
  return '🏠 Olá, ' + nome + '! Você foi convidado para testar o Minha Casa.\n\n1. Abra: ' + location.origin + '\n2. Crie sua conta (e-mail e senha)\n3. Em "Criar casa", use o seu código pessoal: ' + cod + '\n\nEste código é só seu e vale uma vez.';
}
function mostrarAdmin() {
  var box = $('aj-admin'); if (_adm.codigo === null) { box.style.display = 'none'; return; }
  box.style.display = '';
  // convites com nome
  var ids = Object.keys(_adm.convites).sort(function (a, b) { return (_adm.convites[b].criado || 0) - (_adm.convites[a].criado || 0); });
  $('adm-lista').innerHTML = !ids.length ? '<div style="font-size:13px;color:#9ca3af;padding:8px 0">Nenhum convite criado ainda.</div>' : ids.map(function (cod) {
    var c = _adm.convites[cod], conta = c.usadoPor ? _adm.contas[c.usadoPor] || {} : null;
    var st = c.usadoPor ? '<span style="color:#16a34a;font-weight:700">✅ Criou a casa em ' + dataHora(c.usadoEm) + '</span>'
      : c.cancelado ? '<span style="color:#9ca3af;font-weight:700">⛔ Cancelado</span>' : '<span style="color:#b45309;font-weight:700">⏳ Ainda não usou</span>';
    var det = c.usadoPor ? esc(c.email || conta.email || '') + '<br>Último acesso: ' + dataHora(conta.ultimo) : '<span style="font-family:monospace">' + esc(cod) + '</span>';
    var conf = _adm.confirmar === cod;
    var bts = c.usadoPor ? '' : c.cancelado ? '<button class="aj-btn perigo" data-admapagar="' + esc(cod) + '">' + (conf ? 'Confirmar' : 'Apagar') + '</button>'
      : '<button class="aj-btn" data-admenviar="' + esc(cod) + '">Enviar</button><button class="aj-btn perigo" data-admcancelar="' + esc(cod) + '">' + (conf ? 'Confirmar' : 'Cancelar') + '</button>';
    return '<div class="aj-linha" style="align-items:flex-start"><div class="aj-ic" style="background:#eef2ff">👤</div><div class="aj-nm">' + esc(c.nome) +
      '<small style="display:block;line-height:1.5">' + st + '<br>' + det + '</small></div>' + (bts ? '<div style="display:flex;flex-direction:column;gap:4px">' + bts + '</div>' : '') + '</div>';
  }).join('');
  $('adm-criar').onclick = function () {
    var nome = $('adm-nome').value.trim(), er = $('adm-erro'); er.textContent = '';
    if (!nome) { er.textContent = 'Digite o nome da pessoa.'; return; }
    var base = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'PESSOA';
    var cod = 'CASA-' + base + '-' + aleatorio(5), btn = $('adm-criar'); btn.disabled = true;
    db.ref('convites/' + cod).set({ nome: nome, criado: firebase.database.ServerValue.TIMESTAMP }).then(function () {
      $('adm-nome').value = ''; mostrarToast('✅', 'Convite criado para ' + nome + '. Toque em Enviar.', 4000); return carregarConvites();
    }, function (e) { er.textContent = 'Não foi possível criar o convite (' + ((e && e.code) || e) + ').'; }).then(function () { btn.disabled = false; });
  };
  qsa('#adm-lista [data-admenviar]').forEach(function (b) { b.onclick = function () {
    var cod = b.dataset.admenviar, txt = msgConvite(_adm.convites[cod].nome, cod);
    if (navigator.share) navigator.share({ text: txt }).catch(function () {}); else copiar(txt);
  }; });
  function confirmarDepois(cod, acao) {
    if (_adm.confirmar !== cod) { _adm.confirmar = cod; mostrarAdmin(); setTimeout(function () { if (_adm.confirmar === cod) { _adm.confirmar = null; mostrarAdmin(); } }, 5000); return; }
    _adm.confirmar = null; acao().then(carregarConvites, function (e) { $('adm-erro').textContent = 'Não foi possível (' + ((e && e.code) || e) + ').'; });
  }
  qsa('#adm-lista [data-admcancelar]').forEach(function (b) { b.onclick = function () { var cod = b.dataset.admcancelar; confirmarDepois(cod, function () { return db.ref('convites/' + cod + '/cancelado').set(true); }); }; });
  qsa('#adm-lista [data-admapagar]').forEach(function (b) { b.onclick = function () { var cod = b.dataset.admapagar; confirmarDepois(cod, function () { return db.ref('convites/' + cod).remove(); }); }; });
  // código geral
  $('adm-codigo').textContent = _adm.codigo || '(desativado)';
  $('adm-copiar').disabled = !_adm.codigo; $('adm-desativar').disabled = !_adm.codigo;
  $('adm-copiar').onclick = function () { if (_adm.codigo) copiar(_adm.codigo); };
  var bn = $('adm-novo'), bd = $('adm-desativar');
  bn.textContent = _adm.confirmar === '_trocar' ? 'Confirmar' : (_adm.codigo ? 'Trocar' : 'Ativar');
  bd.textContent = _adm.confirmar === '_desativar' ? 'Confirmar' : 'Desativar';
  bn.onclick = function () { confirmarDepois('_trocar', function () {
    var c = 'CASA-' + aleatorio(4) + '-' + aleatorio(4);
    return db.ref('admin/codigoAcesso').set(c).then(function () { _adm.codigo = c; mostrarToast('🔑', 'Código geral novo: ' + c + '. O anterior não vale mais.', 5000); });
  }); };
  bd.onclick = function () { if (!_adm.codigo) return; confirmarDepois('_desativar', function () {
    return db.ref('admin/codigoAcesso').remove().then(function () { _adm.codigo = ''; mostrarToast('⛔', 'Código geral desativado. Só os convites com nome funcionam.', 5000); });
  }); };
}

// ═════════════════════════ CONFERIR COM O BANCO (16/11/2026) ═════════════════════════
// O arquivo do banco (OFX/CSV) é lido neste aparelho, com banco.js (window.MCBanco). Só os DÉBITOS entram.
// Estado em memória (_conf): banco escolhido, texto do arquivo e o resultado. Mapa de colunas de CSV fica
// guardado neste aparelho, por banco, para a próxima vez ser automático.
var _conf = { banco: null, texto: '', nomeArq: '', res: null, ajustando: false, verOk: false };
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function bancoPorId(id) { return MCBanco.BANCOS.filter(function (b) { return b.id === id; })[0] || MCBanco.BANCOS[MCBanco.BANCOS.length - 1]; }
function abrirConferencia() {
  if (!window.MCBanco) { mostrarToast('⚠️', 'Atualize o app para usar a conferência'); return; }
  if (!_conf.banco) _conf.banco = lsGet('mc_banco') || (moeda() === 'BRL' ? 'nubank' : 'cibc');
  var b = bancoPorId(_conf.banco);
  var grupo = function (pais, rot) {
    return '<optgroup label="' + rot + '">' + MCBanco.BANCOS.filter(function (x) { return x.pais === pais; }).map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === b.id ? ' selected' : '') + '>' + esc(x.nome) + '</option>'; }).join('') + '</optgroup>';
  };
  abrirSheet('<h3>🏦 Conferir com o banco</h3>' +
    '<label class="aj-label" for="cf-banco" style="margin-top:4px">Seu banco</label>' +
    '<select class="aj-input" id="cf-banco">' + grupo('BR', 'Brasil') + grupo('CA', 'Canadá') + grupo('', 'Outro') + '</select>' +
    '<div style="font-size:13px;font-weight:700;color:#111827;margin-top:12px">Como baixar o extrato no ' + esc(b.nome) + ' (' + esc(b.formato) + '):</div>' +
    '<ol class="cf-passos">' + b.como.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol>' +
    '<div style="font-size:12px;color:#6b7280;margin:-4px 0 10px">Os nomes dos menus podem mudar no site ou app do banco.</div>' +
    '<label class="aj-btn pri aj-full" for="cf-arq" style="display:block;text-align:center;cursor:pointer">Escolher o arquivo do extrato</label>' +
    '<input type="file" id="cf-arq" accept=".ofx,.qfx,.csv,.txt,text/csv,application/x-ofx" style="display:none">' +
    (_conf.res ? '<button class="aj-btn aj-full" id="cf-ver">Ver a última conferência (' + esc(_conf.nomeArq) + ')</button>' : '') +
    '<button class="aj-btn aj-full" data-fechar>Fechar</button>');
  $('cf-banco').onchange = function () { _conf.banco = this.value; lsSet('mc_banco', this.value); abrirConferencia(); };
  if ($('cf-ver')) $('cf-ver').onclick = recalcularConferencia;
  $('cf-arq').onchange = function () {
    var f = this.files && this.files[0]; if (!f) return;
    lerArquivoTexto(f).then(function (t) { _conf.texto = t; _conf.nomeArq = f.name; _conf.ajustando = false; _conf.verOk = false; processarConferencia(); },
      function () { mostrarToast('⚠️', 'Não consegui ler o arquivo'); });
  };
}
// Lê como UTF-8; se aparecer caractere quebrado (arquivo em Latin-1, comum em bancos brasileiros), relê.
function lerArquivoTexto(f) {
  function ler(enc) { return new Promise(function (ok, erro) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = erro; r.readAsText(f, enc); }); }
  return ler('UTF-8').then(function (t) { return t.indexOf('�') >= 0 ? ler('ISO-8859-1') : t; });
}
function processarConferencia(mapaManual) {
  var b = bancoPorId(_conf.banco), salvo = null;
  try { salvo = JSON.parse(lsGet('mc_mapa_' + b.id) || 'null'); } catch (e) {}
  var r = MCBanco.ler(_conf.texto, { banco: b, mapa: mapaManual || salvo || null });
  // mapa salvo que não serve mais para este arquivo → tenta descobrir de novo
  if (!mapaManual && salvo && r.formato === 'CSV' && !r.transacoes.length) r = MCBanco.ler(_conf.texto, { banco: b });
  if (mapaManual) lsSet('mc_mapa_' + b.id, JSON.stringify(mapaManual));
  _conf.leitura = r;
  if (r.formato === 'CSV' && (r.aviso || _conf.ajustando)) { mostrarMapa(); return; }
  if (!r.transacoes.length) { mostrarToast('⚠️', r.aviso || 'Nenhum lançamento no arquivo'); return; }
  var deb = r.transacoes.filter(function (x) { return x.tipo === 'debito'; });
  _conf.creditosL = r.transacoes.filter(function (x) { return x.tipo !== 'debito'; });
  _conf.debitos = deb;
  recalcularConferencia();
}
// refaz o cruzamento com os lançamentos de agora (depois de lançar ou corrigir algo)
// Débitos × compras (a parte paga com crédito da loja não passa pelo banco);
// créditos × devoluções que voltaram no cartão/conta (16/11/2026).
function recalcularConferencia() {
  if (_conf.debitos) {
    var todos = lancamentos(), deb = _conf.debitos, cred = _conf.creditosL || [];
    var datas = deb.concat(cred).map(function (x) { return x.data; }).sort();
    var faixa = { inicio: datas[0], fim: datas[datas.length - 1] };
    var compras = todos.filter(function (l) { return !l.dev && l.valor > 0; }).map(function (l) {
      return l.clv > 0 ? Object.assign({}, l, { valor: c2(l.valor - l.clv), credLoja: l.clv }) : l;
    }).filter(function (l) { return l.valor > 0.005; });
    var devs = todos.filter(function (l) { return l.dev && !l.lj; }).map(function (l) { return Object.assign({}, l, { valor: -l.valor }); });
    _conf.res = MCBanco.conferir(deb, compras, faixa);
    var outras = deb.concat(compras.map(function (l) { return { desc: descLanc(l) + ' ' + nomeSub(l.cat, l.sub) }; }));
    var cr = MCBanco.conferir(cred, devs, faixa);
    _conf.dev = {
      ok: cr.linhas.filter(function (l) { return l.status !== 'falta'; }),
      falta: cr.linhas.filter(function (l) { return l.status === 'falta' && MCBanco.pareceDevolucao(l.banco, outras); }),
      soApp: cr.soApp
    };
    _conf.ignorados = cred.length - _conf.dev.ok.length - _conf.dev.falta.length;
  }
  mostrarConferencia();
}
// Compra de onde provavelmente veio a devolução do extrato: mesma loja, antes da data, com valor que comporta
function compraDaDevolucao(b) {
  var dm = devolvidoPorCompra();
  return lancamentos().filter(function (l) {
    return !l.dev && l.valor > 0 && l.cat !== PARC && l.data <= b.data && l.valor - (dm[l.id] || 0) >= b.valor - 0.005 &&
      MCBanco.mesmaLoja(b.desc, descLanc(l) + ' ' + nomeSub(l.cat, l.sub));
  }).sort(function (x, y) { return y.data.localeCompare(x.data); })[0] || null;
}
function mostrarMapa() {
  var r = _conf.leitura, m = r.mapa || {}, rows = r.linhas || [], ini = m.inicio || 0;
  var nCol = Math.max.apply(null, rows.slice(0, 20).map(function (x) { return x.length; }));
  var amostra = rows.slice(Math.max(0, ini - 1), ini + 5);
  var opc = function (sel, comNenhum) {
    var h = comNenhum ? '<option value="-1">—</option>' : '';
    for (var c = 0; c < nCol; c++) h += '<option value="' + c + '"' + (sel === c ? ' selected' : '') + '>Coluna ' + (c + 1) + '</option>';
    return h;
  };
  var duas = m.debito != null && m.debito >= 0;
  abrirSheet('<h3>Quais colunas são quais?</h3>' +
    '<div style="font-size:13px;color:#4b5563;line-height:1.45">' + (r.aviso ? esc(r.aviso) + ' ' : '') + 'Confira as primeiras linhas do arquivo e diga onde está cada informação. O app guarda isso para o ' + esc(bancoPorId(_conf.banco).nome) + '.</div>' +
    '<table class="cf-map"><tr>' + Array.apply(null, Array(nCol)).map(function (_, c) { return '<th>Coluna ' + (c + 1) + '</th>'; }).join('') + '</tr>' +
    amostra.map(function (row) { return '<tr>' + Array.apply(null, Array(nCol)).map(function (_, c) { return '<td>' + esc(row[c] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>' +
    '<label class="aj-label">Data</label><select class="aj-input" id="mp-data">' + opc(m.data) + '</select>' +
    '<label class="aj-label">Formato da data</label><select class="aj-input" id="mp-ordem"><option value="dmy"' + (m.ordem !== 'mdy' ? ' selected' : '') + '>dia/mês/ano (Brasil)</option><option value="mdy"' + (m.ordem === 'mdy' ? ' selected' : '') + '>mês/dia/ano (EUA)</option></select>' +
    '<label class="aj-label">Descrição</label><select class="aj-input" id="mp-desc">' + opc(m.desc, true) + '</select>' +
    '<label class="aj-label">Os valores vêm em</label><select class="aj-input" id="mp-modo"><option value="1"' + (!duas ? ' selected' : '') + '>Uma coluna (com sinal)</option><option value="2"' + (duas ? ' selected' : '') + '>Duas colunas: débito e crédito</option></select>' +
    '<div id="mp-um"' + (duas ? ' style="display:none"' : '') + '><label class="aj-label">Valor</label><select class="aj-input" id="mp-valor">' + opc(m.valor) + '</select>' +
    '<label class="aj-label">Os gastos aparecem como</label><select class="aj-input" id="mp-sinal"><option value="negativo"' + (m.sinal !== 'positivo' ? ' selected' : '') + '>Negativos (ex.: -45,90)</option><option value="positivo"' + (m.sinal === 'positivo' ? ' selected' : '') + '>Positivos (ex.: fatura de cartão)</option></select></div>' +
    '<div id="mp-dois"' + (duas ? '' : ' style="display:none"') + '><label class="aj-label">Débito (gastos)</label><select class="aj-input" id="mp-deb">' + opc(m.debito) + '</select>' +
    '<label class="aj-label">Crédito (entradas)</label><select class="aj-input" id="mp-cred">' + opc(m.credito) + '</select></div>' +
    '<label class="aj-label">Primeira linha com lançamento</label><input class="aj-input" id="mp-ini" type="number" min="1" value="' + (ini + 1) + '">' +
    '<button class="aj-btn pri aj-full" id="mp-ok" style="margin-top:12px">Usar estas colunas</button><button class="aj-btn aj-full" id="mp-voltar">Voltar</button>');
  $('mp-modo').onchange = function () { $('mp-um').style.display = this.value === '1' ? '' : 'none'; $('mp-dois').style.display = this.value === '2' ? '' : 'none'; };
  $('mp-voltar').onclick = abrirConferencia;
  $('mp-ok').onclick = function () {
    var dois = $('mp-modo').value === '2';
    var novo = { inicio: Math.max(0, (+$('mp-ini').value || 1) - 1), data: +$('mp-data').value, desc: +$('mp-desc').value, ordem: $('mp-ordem').value };
    if (dois) { novo.debito = +$('mp-deb').value; novo.credito = +$('mp-cred').value; } else { novo.valor = +$('mp-valor').value; novo.sinal = $('mp-sinal').value; }
    _conf.ajustando = false;
    var teste = MCBanco.ler(_conf.texto, { mapa: novo });
    if (!teste.transacoes.length) { mostrarToast('⚠️', 'Com essas colunas não encontrei nenhum lançamento. Confira a data e o valor.', 4500); return; }
    processarConferencia(novo);
  };
}
function mostrarConferencia() {
  var c = _conf.res; if (!c) { abrirConferencia(); return; }
  var por = { ok: [], data: [], valor: [], falta: [] };
  c.linhas.forEach(function (l) { por[l.status].push(l); });
  var nomeApp = function (a) { return a ? esc(descLanc(a)) : ''; };
  var item = function (cls, txt, sub, valor, botao) {
    return '<div class="cf-item ' + cls + '"><div class="cf-tx">' + txt + (sub ? '<small>' + sub + '</small>' : '') + '</div><div class="cf-v">' + valor + '</div>' + (botao || '') + '</div>';
  };
  var html = '<h3>🏦 Banco × app</h3><div style="font-size:12px;color:#6b7280">' + esc(_conf.nomeArq) + ' · ' + formatarData(c.inicio) + ' a ' + formatarData(c.fim) + ' · gastos e devoluções' + (_conf.ignorados ? ' (' + _conf.ignorados + ' outro' + (_conf.ignorados > 1 ? 's' : '') + ' crédito' + (_conf.ignorados > 1 ? 's' : '') + ' ignorado' + (_conf.ignorados > 1 ? 's' : '') + ': pagamentos, salário, transferências)' : '') + '</div>' +
    '<div class="cf-resumo"><div class="cf-ok"><b>' + por.ok.length + '</b>batem</div><div class="cf-data"><b>' + por.data.length + '</b>data dif.</div><div class="cf-valor"><b>' + por.valor.length + '</b>valor dif.</div><div class="cf-falta"><b>' + por.falta.length + '</b>faltam</div></div>';
  if (por.falta.length) html += '<div class="cf-grupo">No banco e não no app</div>' + por.falta.map(function (l) {
    var i = c.linhas.indexOf(l);
    return item('cf-falta', esc(l.banco.desc || '(sem descrição)'), formatarData(l.banco.data), formatar(l.banco.valor), '<button class="aj-btn pri" data-cflancar="' + i + '">Lançar</button>');
  }).join('');
  var D = _conf.dev || { ok: [], falta: [], soApp: [] };
  if (D.falta.length) html += '<div class="cf-grupo">Devolução no banco e não no app</div>' + D.falta.map(function (l, i) {
    var o = compraDaDevolucao(l.banco);
    return item('cf-dev', esc(l.banco.desc || '(sem descrição)'), formatarData(l.banco.data) + (o ? ' · da compra ' + esc(descLanc(o)) + ' de ' + formatarData(o.data) : ''), '+' + formatar(l.banco.valor), '<button class="aj-btn pri" data-cfdev="' + i + '">Lançar</button>');
  }).join('');
  if (por.valor.length) html += '<div class="cf-grupo">Valor diferente</div>' + por.valor.map(function (l) {
    var i = c.linhas.indexOf(l);
    return item('cf-valor', esc(l.banco.desc || '(sem descrição)'), formatarData(l.banco.data) + ' · no app: ' + nomeApp(l.app) + ' ' + formatar(l.app.valor) + (l.app.credLoja ? ' no cartão (+' + formatar(l.app.credLoja) + ' de crédito da loja)' : ''), formatar(l.banco.valor), '<button class="aj-btn" data-cfcorrigir="' + i + '">Corrigir</button>');
  }).join('');
  if (c.soApp.length) html += '<div class="cf-grupo">No app e não no banco</div>' + c.soApp.map(function (a) {
    return item('cf-soapp', nomeApp(a), formatarData(a.data) + ' · pode ter sido pago com outro cartão ou conta', formatar(a.valor));
  }).join('');
  if (D.soApp.length) html += '<div class="cf-grupo">Devolução no app e não no banco</div>' + D.soApp.map(function (a) {
    return item('cf-soapp', nomeApp(a), formatarData(a.data) + ' · pode ter voltado em outro cartão ou conta, ou ainda não caiu', '+' + formatar(a.valor));
  }).join('');
  if (D.ok.length) html += '<div class="cf-grupo">Devoluções que batem (' + D.ok.length + ')</div>' + D.ok.map(function (l) {
    return item('cf-ok', esc(l.banco.desc || '(sem descrição)'), formatarData(l.banco.data) + ' · ' + nomeApp(l.app) + (l.status === 'data' ? ' (app ' + formatarData(l.app.data) + ')' : l.status === 'valor' ? ' (app ' + formatar(l.app.valor) + ')' : ''), '+' + formatar(l.banco.valor));
  }).join('');
  // mesmo valor, data diferente: corrigir a data do app para a do banco, um a um ou todos (16/11/2026)
  if (por.data.length) html += '<div class="cf-grupo">Mesmo valor, data diferente</div>' + por.data.map(function (l) {
    var i = c.linhas.indexOf(l);
    return item('cf-data', esc(l.banco.desc || '(sem descrição)'), 'banco ' + formatarData(l.banco.data) + ' · app ' + formatarData(l.app.data) + ' (' + nomeApp(l.app) + ')', formatar(l.banco.valor), '<button class="aj-btn" data-cfdata="' + i + '">Corrigir data</button>');
  }).join('') + (por.data.length > 1 ? '<button class="aj-btn aj-full" id="cf-datas">Corrigir as ' + por.data.length + ' datas para as do banco</button>' : '');
  if (por.ok.length) html += '<div class="cf-grupo">Batem (' + por.ok.length + ')</div>' + (_conf.verOk ? por.ok.map(function (l) {
    return item('cf-ok', esc(l.banco.desc || '(sem descrição)'), formatarData(l.banco.data) + ' · ' + nomeApp(l.app), formatar(l.banco.valor));
  }).join('') : '<button class="aj-btn aj-full" id="cf-verok">Mostrar os ' + por.ok.length + ' que batem</button>');
  html += '<div style="height:8px"></div>' + (_conf.leitura && _conf.leitura.formato === 'CSV' ? '<button class="aj-btn aj-full" id="cf-ajustar">Ajustar colunas do arquivo</button>' : '') +
    '<button class="aj-btn aj-full" id="cf-outro">Escolher outro arquivo</button><button class="aj-btn aj-full" data-fechar>Fechar</button>';
  abrirSheet(html);
  if ($('cf-verok')) $('cf-verok').onclick = function () { _conf.verOk = true; mostrarConferencia(); };
  if ($('cf-ajustar')) $('cf-ajustar').onclick = function () { _conf.ajustando = true; mostrarMapa(); };
  $('cf-outro').onclick = abrirConferencia;
  qsa('#sheet-box [data-cflancar]').forEach(function (bt) { bt.onclick = function () {
    var l = c.linhas[+bt.dataset.cflancar];
    fecharSheet(); irPara('add');
    S.add.voltarConf = true;
    $('inp-valor').value = numTxt(l.banco.valor.toFixed(2)); $('inp-data').value = l.banco.data; $('inp-desc').value = (l.banco.desc || '').slice(0, 60);
    mostrarToast('🏦', 'Escolha a categoria e salve. Depois o app volta para a conferência.', 4000);
  }; });
  qsa('#sheet-box [data-cfdev]').forEach(function (bt) { bt.onclick = function () {
    var l = D.falta[+bt.dataset.cfdev], o = compraDaDevolucao(l.banco);
    fecharSheet(); irPara('add');
    S.add.voltarConf = true; S.add.tipo = 'dev'; S.add.lj = false; S.add.cl = null;
    $('inp-valor').value = numTxt(l.banco.valor.toFixed(2)); $('inp-data').value = l.banco.data; $('inp-desc').value = '';
    pintarTipoAdd();
    if (o) escolherOrig(o.id, true);
    if (!$('inp-desc').value.trim()) $('inp-desc').value = (l.banco.desc || '').slice(0, 60);
    mostrarToast('↩️', o ? 'Confira a compra e salve. Depois o app volta para a conferência.' : 'Escolha a compra ou a categoria e salve.', 4000);
  }; });
  var corrigirDatas = function (linhas) {
    var ps = [], n = 0;
    linhas.forEach(function (l) {
      var reg = S.raw[l.app.id]; if (!reg || !l.banco.data) return;
      var novo = Object.assign({}, reg); novo.dt = l.banco.data;
      ps.push(gravarLanc(l.app.id, novo)); n++;
    });
    if (!n) { mostrarToast('⚠️', 'Lançamento não encontrado'); return; }
    Promise.all(ps).then(function () { mostrarToast('📅', n === 1 ? 'Data corrigida para ' + formatarData(linhas[0].banco.data) : n + ' datas corrigidas para as do banco'); }, function () { mostrarToast('⚠️', 'Erro ao salvar'); });
    recalcularConferencia();
  };
  qsa('#sheet-box [data-cfdata]').forEach(function (bt) { bt.onclick = function () { corrigirDatas([c.linhas[+bt.dataset.cfdata]]); }; });
  if ($('cf-datas')) $('cf-datas').onclick = function () { corrigirDatas(por.data); };
  qsa('#sheet-box [data-cfcorrigir]').forEach(function (bt) { bt.onclick = function () {
    var l = c.linhas[+bt.dataset.cfcorrigir], reg = S.raw[l.app.id];
    if (!reg) { mostrarToast('⚠️', 'Lançamento não encontrado'); return; }
    var novo = Object.assign({}, reg); novo.v = Math.round((l.banco.valor + (l.app.credLoja || 0)) * 100);
    gravarLanc(l.app.id, novo).then(function () { mostrarToast('✅', 'Corrigido para ' + formatar(l.banco.valor)); }, function () { mostrarToast('⚠️', 'Erro ao salvar'); });
    recalcularConferencia();
  }; });
}

// ═════════════════ LANÇAR AO PAGAR (Apple Pay, 16/11/2026) ═════════════════
// O atalho do iPhone (automação "Carteira"/"Transação") abre  …/#lancar=<valor>|<loja>|<cartão>
// (a parte depois do "=" vem codificada). O app abre o Registrar já preenchido e sugere a categoria pela loja.
var CHAVE_PAG = 'mc_pag_pend';
function capturarPagamentoDoLink() {
  var m = /[#&]lancar=([^&]*)/i.exec(location.hash || '');
  if (!m) return false;
  var t = m[1];
  try { t = decodeURIComponent(t); } catch (e) {}
  try { t = decodeURIComponent(t); } catch (e) {} // se o atalho codificou duas vezes
  // separador: "|" ou quebra de linha; sem separador, o valor é o trecho com cara de dinheiro no fim ou no começo
  // ("CIRCLE K 2742 CA$45.20", "$12.50 Tim Hortons") (16/11/2026)
  if (!/[|\n]/.test(t)) {
    var mFim = /^(.*?)\s*((?:(?<=\s|^)[A-Z]{1,3})?[$€£]\s?-?\d[\d.,]*|-?\d[\d.,]*[.,]\d{2}(?:\s?(?:[$€£]|CAD|BRL|USD|EUR))?)\s*$/i.exec(t.trim());
    var mIni = /^\s*((?:[A-Z]{1,3})?[$€£]\s?-?\d[\d.,]*|-?\d[\d.,]*[.,]\d{2}(?:\s?(?:[$€£]|CAD|BRL|USD|EUR))?)\s*(.*)$/i.exec(t.trim());
    if (mFim && mFim[1]) t = mFim[1] + '|' + mFim[2]; else if (mIni) t = mIni[1] + '|' + mIni[2];
  }
  var partes = t.split(/[|\n]/).map(function (x) { return x.trim(); });
  // aceita "valor|loja" e "loja|valor": o valor é a parte que só tem número e moeda (16/11/2026)
  var ehValor = function (x) { var y = String(x || '').replace(/(CA|US|R|A|NZ|C)?\$|CAD|BRL|USD|EUR|€|£|\s/gi, ''); return /^-?\d[\d.,]*$/.test(y); };
  var iv = partes.findIndex(ehValor);
  var valorTxt = iv >= 0 ? partes[iv] : '';
  var resto = partes.filter(function (x, k) { return k !== iv && x; });
  partes = [valorTxt, resto[0] || '', resto[1] || ''];
  var v = MCBanco.numero(partes[0]);
  var pag = { valor: isFinite(v) ? Math.abs(v) : 0, loja: txtCurto((partes[1] || '').replace(/\s+/g, ' ').trim(), 140), cartao: txtCurto((partes[2] || '').trim(), 60), em: Date.now() };
  S.pagPend = pag;
  try { sessionStorage.setItem(CHAVE_PAG, JSON.stringify(pag)); } catch (e) {} // sobrevive ao login
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  return true;
}
// Categoria e subcategoria mais usadas nessa loja; se não houver histórico, uma subcategoria com o nome da loja
function sugerirCatLoja(loja) {
  if (!loja) return null;
  var pt = {}, hist = {}, hj = hoje();
  lancamentos().forEach(function (l) {
    if (l.dev || l.cat === PARC || !catPorId(l.cat)) return;
    if (!MCBanco.mesmaLoja(loja, (l.desc || '') + ' ' + (nomeSub(l.cat, l.sub) || ''))) return;
    var k = l.cat + '|' + (l.sub || ''), idade = Math.max(0, diasEntre(l.data, hj));
    pt[k] = (pt[k] || 0) + 1 + 1 / (1 + idade / 30); hist[k] = 1; // mais vezes e mais recente pesa mais
  });
  catsComuns().forEach(function (c) { c.subs.forEach(function (s) { if (MCBanco.mesmaLoja(loja, s.nome)) { var k = c.id + '|' + s.id; pt[k] = (pt[k] || 0) + 0.5; } }); });
  var melhor = Object.keys(pt).sort(function (a, b) { return pt[b] - pt[a]; })[0];
  if (!melhor) return null;
  var x = melhor.split('|');
  return { cat: x[0], sub: x[1] || null, peloNome: !hist[melhor] };
}
function aplicarPagamento() {
  if (!S.pagPend) { try { S.pagPend = JSON.parse(sessionStorage.getItem(CHAVE_PAG) || 'null'); } catch (e) {} }
  var p = S.pagPend;
  if (!p || !S.chave || !S.cfg) return;
  S.pagPend = null; try { sessionStorage.removeItem(CHAVE_PAG); } catch (e) {}
  if (Date.now() - (p.em || 0) > 6 * 3600000) return; // link velho (ex.: aba reaberta no dia seguinte)
  // o mesmo pagamento aberto duas vezes seguidas: não abre de novo
  var assin = p.valor.toFixed(2) + '|' + normNome(p.loja), ult = null;
  try { ult = JSON.parse(lsGet('mc_pag_ult') || 'null'); } catch (e) {}
  if (ult && ult.a === assin && Date.now() - ult.t < 120000) return;
  lsSet('mc_pag_ult', JSON.stringify({ a: assin, t: Date.now() }));
  fecharSheet();
  S.add.editId = null;
  irPara('add');
  if (p.valor > 0) $('inp-valor').value = numTxt(p.valor.toFixed(2));
  $('inp-desc').value = p.loja;
  $('inp-data').value = hoje();
  var sg = sugerirCatLoja(p.loja);
  S.add.cat = sg ? sg.cat : null; S.add.sub = sg ? sg.sub : null;
  S.add.viaPag = !p.teste;
  if (!p.teste) lsSet('mc_pag_ok', JSON.stringify({ t: Date.now(), valor: p.valor, loja: p.loja }));
  renderAdd(); renderCreditoAdd(); atualizarAvisoValor();
  // já existe um gasto igual hoje? (lançou à mão antes de o atalho abrir)
  var dup = p.valor > 0 && lancamentos().filter(function (l) { return !l.dev && l.data === hoje() && Math.abs(l.valor - p.valor) < 0.005; })[0];
  var av = $('pag-aviso');
  av.innerHTML = '📲 <b>Pagamento ' + (p.cartao ? 'no ' + esc(p.cartao) : 'com Apple Pay') + '</b>: ' + (p.loja ? esc(p.loja) + ' · ' : '') + (p.valor > 0 ? formatar(p.valor) : 'valor não veio, digite abaixo') + '<br>' +
    (sg ? (sg.peloNome ? 'Categoria sugerida pelo nome da subcategoria. ' : 'Categoria sugerida pelas suas compras anteriores nessa loja. ') : 'Escolha a categoria. Da próxima vez nessa loja o app já sugere. ') + 'Confira e toque em salvar.' +
    (dup ? '<span class="pag-dup">⚠️ Já existe um lançamento de ' + formatar(dup.valor) + ' hoje (' + esc(descLanc(dup)) + '). Se for o mesmo, não salve: toque no ✕.</span>' : '');
  av.style.display = '';
}
function linkPagamento() { return location.origin + location.pathname.replace(/index\.html$/, '') + '#lancar='; }
// Links do iCloud do atalho pronto ("MinhaCasa"), um por ambiente: cada um abre o endereço do seu ambiente.
// Os dois links abrem o app oficial (minhacasaapp.com); no ambiente de teste também aparecem, com um aviso.
var ATALHO_ICLOUD = 'https://www.icloud.com/shortcuts/5e8401a26f594d0d929cf04e8255c506';   // atalho "MinhaCasa" (as ações)
var AUTOMACAO_ICLOUD = 'https://www.icloud.com/shortcuts/8d5e3595437b441fa14025435e1415c9'; // com Any Card // "Cartão MinhaCasa" (gatilho do cartão + Run MinhaCasa), testado 16/11/2026
function linkAtalho() { return ATALHO_ICLOUD; }
var FRASE_IA = {
  pt: 'Quando eu pagar com qualquer cartão da Carteira, sem perguntar: crie um Texto com o Comerciante e o Valor da transação, e execute o atalho "MinhaCasa" com esse Texto como entrada.',
  en: 'When I pay with any card in Wallet, without asking: make a Text with the transaction\'s Merchant and Amount, then run the shortcut "MinhaCasa" with that Text as input.'
};
function eIPhone() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
// Funciona? 1) algum lançamento salvo a partir do Apple Pay (vale para a casa toda, em qualquer aparelho);
// 2) um pagamento que chegou neste aparelho, mesmo sem salvar.
function statusApplePay() {
  var ult = lancamentos().filter(function (l) { return l.ap; }).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0) || b.data.localeCompare(a.data); })[0];
  var loc = null; try { loc = JSON.parse(lsGet('mc_pag_ok') || 'null'); } catch (e) {}
  if (ult) return { ok: true, txt: 'Funcionando. Último lançamento vindo do Apple Pay: ' + formatarData(ult.data) + ' · ' + descLanc(ult) + ' · ' + formatar(ult.valor) + '.' };
  if (loc && loc.t) return { ok: true, txt: 'Funcionando. Último pagamento recebido neste aparelho em ' + formatarData(isoDe(new Date(loc.t))) + (loc.loja ? ' · ' + loc.loja : '') + (loc.valor ? ' · ' + formatar(loc.valor) : '') + '.' };
  return { ok: false, txt: 'Ainda não chegou nenhum pagamento. Depois de configurar, pague algo pequeno por aproximação para testar.' };
}
function renderStatusApplePay() {
  var el = $('aj-applepay-st'); if (!el) return;
  var st = statusApplePay();
  el.className = 'ap-st ' + (st.ok ? 'ok' : 'nao'); el.textContent = (st.ok ? '✅ ' : '⏳ ') + st.txt;
}
function abrirApplePay() {
  var url = linkPagamento(), lk = linkAtalho(), st = statusApplePay(), ios = eIPhone();
  var fraseBtns = '<div class="ap-frase">' + esc(FRASE_IA.pt) + '</div><button class="aj-btn aj-full" data-apfrase="pt">Copiar frase em português</button>' +
    '<div class="ap-frase">' + esc(FRASE_IA.en) + '</div><button class="aj-btn aj-full" data-apfrase="en">Copiar frase em inglês</button>';
  abrirSheet('<h3>📲 Lançar ao pagar com Apple Pay</h3>' +
    '<div class="ap-st ' + (st.ok ? 'ok' : 'nao') + '">' + (st.ok ? '✅ ' : '⏳ ') + esc(st.txt) + '</div>' +
    (ios ? '' : '<div class="ap-aviso">Este recurso é do <b>iPhone</b> (Apple Pay). No Android não existe um jeito de o celular avisar o app na hora do pagamento; use a <b>Conferência com o banco</b> para achar o que faltou lançar. Se você tem iPhone, abra o MinhaCasa nele para configurar.</div>') +
    '<div style="font-size:13px;color:#4b5563;line-height:1.45;margin-top:8px">Cada pagamento por aproximação com o cartão que você escolher abre o MinhaCasa já com o valor e a loja. São 3 passos, uns 2 minutos, com o app <b>Atalhos</b> (Shortcuts) da Apple. Os nomes aparecem em português ou em inglês, conforme o idioma do iPhone.</div>' +
    (window.MINHACASA_AMBIENTE === 'teste' ? '<div class="ap-aviso">Ambiente de teste: estes links instalam a versão que abre o <b>app oficial</b> (minhacasaapp.com).</div>' : '') +

    '<div class="ap-parte">1 · Instalar o atalho MinhaCasa</div>' +
    (lk ? '<div class="ap-txt">Toque no botão. Na página que abrir, toque em <b>Obter Atalho</b> (Get Shortcut) e, no app Atalhos, em <b>Adicionar Atalho</b> (Add Shortcut). Se o iPhone pedir para baixar o app <b>Atalhos</b>, toque em <b>Mostrar na App Store</b> e baixe (é gratuito, da Apple); depois toque de novo no botão.</div><a class="aj-btn pri aj-full ap-link" href="' + esc(lk) + '" target="_blank" rel="noopener">Instalar o atalho MinhaCasa</a>'
        : '<div class="ap-txt">O atalho pronto para instalar com um toque ainda está sendo preparado. Por enquanto, monte à mão (leva uns minutos a mais):</div>') +
    '<details class="ap-det"' + (lk ? '' : ' open') + '><summary>Montar o atalho à mão</summary><ol class="cf-passos ap-passos">' +
    '<li>No app <b>Atalhos</b>, em <b>Atalhos</b> (Shortcuts), toque no <b>+</b>. Se aparecer a caixa "Descreva um atalho" (Describe a shortcut), toque em <b>Editar</b> (Edit).</li>' +
    '<li>Adicione <b>Codificar URL</b> (URL Encode) e, dentro dela, a variável <b>Entrada do Atalho</b> (Shortcut Input).</li>' +
    '<li>Adicione outro <b>Texto</b> (Text) com o endereço abaixo e, colado nele, a variável <b>URL Codificado</b> (URL Encoded Text):<div class="ap-url">' + esc(url) + '</div><button class="aj-btn aj-full" id="ap-copiar">Copiar endereço</button></li>' +
    '<li>Adicione <b>Abrir URLs</b> (Open URLs).</li>' +
    '<li>Dê o nome <b>MinhaCasa</b> ao atalho (tocando no nome, em cima) e saia.</li></ol></details>' +

    '<div class="ap-parte">2 · Instalar a ligação com o cartão</div>' +
    '<div class="ap-txt">Toque no botão e, do mesmo jeito, em <b>Obter Atalho</b> e <b>Adicionar Atalho</b>. Ele se chama <b>Cartão MinhaCasa</b>.</div>' +
    '<a class="aj-btn pri aj-full ap-link" href="' + esc(AUTOMACAO_ICLOUD) + '" target="_blank" rel="noopener">Instalar o Cartão MinhaCasa</a>' +
    '<div class="ap-parte">3 · Escolher o seu cartão e ligar</div>' +
    '<ol class="cf-passos ap-passos">' +
    '<li>No app <b>Atalhos</b>, abra <b>Automação</b> (Automation) e toque em <b>Quando eu tocar num passe ou cartão da Carteira</b> (When I tap a Wallet pass or payment card).</li>' +
    '<li>Toque em <b>Editar</b> (Edit). No bloco <b>Quando… for tocado</b> (When… is tapped), toque no nome do cartão e marque <b>o seu cartão</b>, o que você controla no MinhaCasa. O nome tem que ficar <b>azul</b>.</li>' +
    '<li>Confira se o bloco <b>Executar</b> (Run) mostra <b>MinhaCasa</b>. Se mostrar outro nome ou um aviso vermelho, toque nele e escolha <b>MinhaCasa</b>.</li>' +
    '<li>Toque na setinha <b>›</b> ao lado de "for tocado" (is tapped) e ligue <b>Automação</b> (Automation): fica verde e some o aviso "Automação desligada" (Automation is turned off). Se o iPhone perguntar se pode executar outro atalho, toque em <b>Permitir</b> (Allow).</li></ol>' +
    '<details class="ap-det"><summary>Não deu certo? Criar a ligação de outro jeito</summary>' +
    '<div class="ap-txt">No app Atalhos, abra <b>Automação</b> (Automation) e toque no <b>+</b>. O que aparece?</div>' +
    '<div class="ap-esc"><button type="button" class="aj-btn" data-apcam="a"><span>Uma caixa</span><b>"Descreva um atalho"</b></button><button type="button" class="aj-btn" data-apcam="b"><span>Uma lista</span><b>Hora, Chegar, Carteira…</b></button></div>' +
    '<div id="ap-cam-a" class="ap-cam" style="display:none"><div class="ap-cam-t">Com a IA do iPhone</div><ol class="cf-passos ap-passos">' +
    '<li>Copie uma das frases abaixo (a do idioma do seu iPhone), cole na caixa e envie.' + fraseBtns + '</li>' +
    '<li>Se o iPhone perguntar se pode executar outro atalho, toque em <b>Permitir</b> (Allow).</li>' +
    '<li>Volte em <b>Automação</b>, toque na automação nova e em <b>Editar</b> (Edit). No bloco "Quando… for tocado" (When… is tapped), toque em <b>Qualquer Cartão</b> (Any Card) e deixe marcado <b>só o cartão</b> que você controla no MinhaCasa.</li>' +
    '<li>Confira os blocos: um <b>Texto</b> (Text) com <b>Comerciante</b> (Merchant) e <b>Valor</b> (Amount), e <b>Executar MinhaCasa</b> (Run MinhaCasa) com a entrada <b>Texto</b> (toque na setinha do Run para ver).</li>' +
    '<li>Toque na setinha do bloco do cartão e confira se <b>Automação</b> (Automation) está ligada.</li></ol></div>' +
    '<div id="ap-cam-b" class="ap-cam" style="display:none"><div class="ap-cam-t">Sem a IA</div><ol class="cf-passos ap-passos">' +
    '<li>Na lista, escolha <b>Carteira</b> (Wallet). Em alguns iPhones aparece como <b>Transação</b> (Transaction).</li>' +
    '<li>Marque <b>só o cartão</b> que você controla no MinhaCasa e escolha <b>Executar Imediatamente</b> (Run Immediately). Toque em <b>Seguinte</b> (Next).</li>' +
    '<li>Toque em <b>Nova Automação em Branco</b> (New Blank Automation). Adicione <b>Texto</b> (Text) e, dentro dele, insira a variável do pagamento duas vezes: uma como <b>Comerciante</b> (Merchant) e outra como <b>Valor</b> (Amount) (toque na bolinha para escolher).</li>' +
    '<li>Adicione <b>Executar Atalho</b> (Run Shortcut), escolha <b>MinhaCasa</b> e, na setinha, ponha a entrada (Input) como <b>Texto</b>. Toque em <b>OK</b> (Done).</li></ol></div>' +

    '</details>' +

    '<div class="ap-parte">4 · Testar</div>' +
    '<div class="ap-txt">Pague algo pequeno por aproximação com esse cartão. O MinhaCasa deve abrir com o valor e a loja; confira a categoria e salve. Esta tela passa a mostrar <b>✅ Funcionando</b>.</div>' +
    '<div style="font-size:12.5px;color:#6b7280;line-height:1.45;margin:8px 0 10px"><b>Na primeira vez</b>, o link abre no Safari: se pedir, entre na sua conta e marque <b>lembrar a senha da casa</b>. Só funciona com pagamento por <b>aproximação</b> (Apple Pay); cartão físico na maquininha não avisa o iPhone. Depois de atualizar o iOS, confira se a automação continua ligada.</div>' +
    '<button class="aj-btn aj-full" id="ap-testar">Ver como fica (simula um pagamento)</button>' +
    '<button class="aj-btn aj-full" data-fechar>Fechar</button>');
  $('ap-copiar').onclick = function () { copiar(url); };
  qsa('#sheet-box [data-apfrase]').forEach(function (b) { b.onclick = function () { copiar(FRASE_IA[b.dataset.apfrase]); }; });
  qsa('#sheet-box [data-apcam]').forEach(function (b) { b.onclick = function () {
    var c = b.dataset.apcam;
    qsa('#sheet-box [data-apcam]').forEach(function (x) { x.classList.toggle('on', x === b); });
    $('ap-cam-a').style.display = c === 'a' ? '' : 'none'; $('ap-cam-b').style.display = c === 'b' ? '' : 'none';
  }; });
  $('ap-testar').onclick = function () {
    lsSet('mc_pag_ult', '');
    S.pagPend = { valor: 12.34, loja: 'Teste do atalho', cartao: '', em: Date.now(), teste: true };
    aplicarPagamento();
    mostrarToast('📲', 'Assim abre depois de um pagamento. Este é só um teste: toque no ✕ para não salvar.', 4500);
  };
}

// ── Só no ambiente de teste (14/11/2026): apagar todos os lançamentos da casa ──
// Escondido em produção pelo config.js (MINHACASA_AMBIENTE). Pede dois toques.
var _limparConf = false;
function renderLimparTeste() {
  var box = $('aj-limpar-teste'); if (!box) return;
  if (window.MINHACASA_AMBIENTE !== 'teste') { box.style.display = 'none'; return; }
  box.style.display = '';
  var n = Object.keys(S.raw).length, b = $('aj-limpar-btn');
  b.disabled = !n;
  b.textContent = !n ? 'Nenhum lançamento para apagar' : _limparConf ? 'Toque de novo para apagar ' + n + ' lançamento' + (n === 1 ? '' : 's') : 'Apagar todos os lançamentos (' + n + ')';
  b.onclick = function () {
    if (window.MINHACASA_AMBIENTE !== 'teste') return;
    if (!_limparConf) { _limparConf = true; renderLimparTeste(); setTimeout(function () { if (_limparConf) { _limparConf = false; renderLimparTeste(); } }, 5000); return; }
    _limparConf = false; b.disabled = true; b.textContent = 'Apagando…';
    db.ref('casas/' + S.casa + '/dados/lanc').remove().then(function () {
      S.raw = {}; mostrarToast('🗑️', n + ' lançamento' + (n === 1 ? '' : 's') + ' apagado' + (n === 1 ? '' : 's')); renderLogo();
    }, function (e) { mostrarToast('⚠️', 'Erro ao apagar (' + ((e && e.code) || e) + ')'); renderLimparTeste(); });
  };
}
function copiar(txt) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { mostrarToast('📋', 'Copiado'); }, function () { mostrarToast('ℹ️', 'Toque e segure o código para copiar'); });
  else mostrarToast('ℹ️', 'Toque e segure o código para copiar');
}
function compartilharConvite() {
  var txt = '🏠 Te convidei para a nossa casa no MinhaCasa!\n\n1. Toque no link: ' + linkConvite() + '\n2. Crie sua conta (e-mail e senha)\n3. Digite a senha da casa, que vou te passar à parte';
  if (navigator.share) navigator.share({ text: txt }).catch(function () {}); else copiar(txt);
}
function novoCodigo() {
  if (!confirm('Gerar um novo código? O atual deixa de funcionar para novos convites. Quem já está na casa não é afetado.')) return;
  db.ref('casas/' + S.casa + '/convite').set(rid(24)).then(function () { mostrarToast('✅', 'Novo código gerado'); }, function () { mostrarToast('⚠️', 'Erro'); });
}
function removerMembro(uid) {
  var p = S.perfis[uid] || {};
  if (!confirm('Remover ' + (p.nome || 'este membro') + ' da casa?\n\nDepois, troque a senha da casa: a pessoa conhece a senha atual e poderia voltar a ler os dados com ela.')) return;
  Promise.all([db.ref('casas/' + S.casa + '/membros/' + uid).remove(), db.ref('casas/' + S.casa + '/dados/perfis/' + uid).remove()])
    .then(function () { mostrarToast('✅', 'Membro removido. Agora troque a senha da casa.'); abrirTrocarSenha(); }, function () { mostrarToast('⚠️', 'Erro ao remover'); });
}

// Backup
function baixar(nome, tipo, conteudo) {
  var blob = new Blob([conteudo], { type: tipo });
  try {
    var arq = new File([blob], nome, { type: tipo });
    if (navigator.canShare && navigator.canShare({ files: [arq] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { navigator.share({ files: [arq], title: nome }).catch(function () {}); return; }
  } catch (e) {}
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function exportarJSON() {
  baixar('minhacasa-backup-' + hoje() + '.json', 'application/json', JSON.stringify({ app: 'HomeVault', formato: 2, exportado: new Date().toISOString(), config: S.cfg, lancamentos: S.raw }, null, 1));
}
function exportarCSV() {
  var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; };
  var linhas = ['Data;Categoria;Subcategoria;Descrição;Parcela;Valor'];
  lancamentos().sort(function (a, b) { return a.data < b.data ? -1 : 1; }).forEach(function (l) {
    linhas.push([l.data, q(NOME(l.cat)), q(nomeSub(l.cat, l.sub)), q(l.desc), l.parcela ? l.parcela.n + '/' + l.parcela.total : '', l.valor.toFixed(2).replace('.', ',')].join(';'));
  });
  baixar('minhacasa-' + hoje() + '.csv', 'text/csv;charset=utf-8', '﻿' + linhas.join('\r\n'));
}
function importarJSON(arquivo) {
  var r = new FileReader();
  r.onload = function () {
    var d; try { d = JSON.parse(r.result); } catch (e) { mostrarToast('⚠️', 'Arquivo inválido'); return; }
    if (!d || d.app !== 'HomeVault' || !d.lancamentos) { mostrarToast('⚠️', 'Não é um backup do MinhaCasa'); return; }
    var regs = d.lancamentos;
    if (Array.isArray(regs)) { // formato 1
      var obj = {}; regs.forEach(function (l) { if (l && l.id && l.v) obj[l.id] = { v: l.v, dt: l.dt, c: l.c, s: l.s, d: l.d, por: l.por, ts: l.ts, t: l.t, o: l.o, lj: l.lj, cl: l.cl, clv: l.clv }; }); regs = obj;
    }
    var ids = Object.keys(regs);
    if (!confirm('Restaurar ' + ids.length + ' lançamento(s) deste backup?\n\nLançamentos com o mesmo identificador serão substituídos; os demais serão mantidos. Categorias que não existem serão adicionadas.')) return;
    var cfgB = d.config || { cats: d.categorias || [] }, existentes = {};
    S.cfg.cats.forEach(function (c) { existentes[c.id] = true; });
    (normalizarCfg(JSON.parse(JSON.stringify(cfgB))).cfg.cats || []).forEach(function (c) { if (c && c.id && !existentes[c.id]) S.cfg.cats.push(c); });
    var ps = [salvarCfg()];
    ids.forEach(function (id) { var x = limparReg(id, regs[id]); if (x) ps.push(gravarLanc(id, x)); });
    Promise.all(ps).then(function () { mostrarToast('✅', 'Backup restaurado'); }, function () { mostrarToast('⚠️', 'Parte do backup não foi salva'); });
  };
  r.readAsText(arquivo);
}

// ═════════════════════════ gravação ═════════════════════════
function salvarCfg() {
  return cifrar(S.chave, S.cfg).then(function (c) { return db.ref('casas/' + S.casa + '/dados/config').set(c); })
    .catch(function () { mostrarToast('⚠️', 'Erro ao salvar configurações'); });
}
function gravarLanc(id, reg) {
  S.raw[id] = reg; renderLogo();
  return cifrar(S.chave, reg).then(function (c) { return db.ref('casas/' + S.casa + '/dados/lanc/' + id).set(c); });
}

// ═════════════════════════ entrada: conta, casa, chave ═════════════════════════
function iniciar() {
  var cfg = window.HOMEVAULT_FIREBASE;
  capturarConviteDoLink();
  capturarPagamentoDoLink();
  window.addEventListener('hashchange', function () { if (capturarPagamentoDoLink()) aplicarPagamento(); });
  ligarEventos();
  if (!cfg || !cfg.apiKey || /COLE_AQUI/.test(cfg.apiKey) || typeof firebase === 'undefined') { mostrarEntrada('card-semconfig'); return; }
  firebase.initializeApp(cfg);
  auth = firebase.auth(); db = firebase.database();
  auth.onAuthStateChanged(function (u) {
    pararEscuta(); limparFormularios();
    S.user = u; S.casa = null; S.chave = null; S.cfg = null; S.raw = {}; S.perfis = {}; S.membros = {};
    if (!u) { mostrarEntrada('card-auth'); return; }
    db.ref('contas/' + u.uid).set({ email: u.email || '', ultimo: firebase.database.ServerValue.TIMESTAMP }).catch(function () {});
    carregarCasa();
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
}
function limparFormularios() {
  qsa('#tela-login input').forEach(function (i) { if (i.type === 'checkbox') i.checked = i.id === 'ul-lembrar'; else i.value = ''; });
  qsa('.login-erro').forEach(function (e) { e.textContent = ''; });
  setAbaCasa(false); setModoCriar(false);
  $('nc-moeda').value = 'CAD';
  fecharSheet();
  $('topo-config').style.display = 'none'; $('cfg-toggle').classList.remove('aberto');
  S.per = { hist: 'periodo', rel: 'periodo', relcat: 'periodo', proj: 'periodo' }; S.rcCat = null; S.mesHist = mesAtual();
  qsa('[data-per]').forEach(function (g) { qsa('.rel-per-btn', g).forEach(function (b) { b.classList.toggle('ativo', b.dataset.tipo === 'periodo'); }); });
  ['hist', 'rel', 'relcat', 'proj'].forEach(function (q) { $(q + '-custom-datas').style.display = 'none'; });
  $('hist-nav-mes').style.display = 'none';
}
function carregarCasa() {
  carregando();
  db.ref('usuarios/' + S.user.uid + '/casa').once('value').then(function (snap) {
    var casa = snap.val();
    if (!casa) { mostrarEntrada('card-casa'); return; }
    return db.ref('casas/' + casa).once('value').then(function (cs) {
      var m = cs.val();
      if (!m || !m.salt) throw { code: 'PERMISSION_DENIED' };
      S.casa = casa; S.meta = m;
      return IDB.get(S.user.uid + ':' + casa).then(function (k) {
        if (!k) { mostrarEntrada('card-unlock'); return; }
        return decifrar(k, m.verif).then(function () { abrirCasa(k); }, function () { mostrarEntrada('card-unlock'); });
      });
    });
  }).catch(function (e) {
    if (e && /PERMISSION_DENIED|permission/i.test(e.code || e.message || '')) {
      db.ref('usuarios/' + S.user.uid + '/casa').remove().catch(function () {});
      mostrarEntrada('card-casa');
      $('nc-erro').textContent = 'Você não tem mais acesso à casa anterior. Crie uma casa ou use um convite.';
    } else {
      carregando('Não foi possível conectar. Verifique a internet e abra o app de novo.');
    }
  });
}
function abrirCasa(chave) {
  S.chave = chave; S.cfg = null;
  // o dono grava a prova uma vez (casas criadas antes da 2.10 não têm)
  if (souDono() && S.meta && !S.meta.prova) {
    var casaP = S.casa;
    provaDaChave(chave).then(function (pv) {
      return db.ref('casas/' + casaP + '/prova').set(pv).then(function () { return db.ref('casas/' + casaP + '/convVer').set(2); })
        .then(function () { if (S.meta) { S.meta.prova = pv; S.meta.convVer = 2; } });
    }).catch(function (e) { console.warn('prova:', e && (e.code || e.message)); });
  }
  carregando('Abrindo a casa…');
  escutar();
}
function pararEscuta() { S.refs.forEach(function (r) { r.off(); }); S.refs = []; }
function escutar() {
  pararEscuta();
  var base = 'casas/' + S.casa;
  var rCfg = db.ref(base + '/dados/config'), rLanc = db.ref(base + '/dados/lanc'), rPerf = db.ref(base + '/dados/perfis');
  var rMem = db.ref(base + '/membros'), rConv = db.ref(base + '/convite'), rCon = db.ref('.info/connected');
  S.refs = [rCfg, rLanc, rPerf, rMem, rConv, rCon];
  var negado = function () { carregarCasa(); };
  var primeiro = true;
  rCfg.on('value', function (s) {
    var v = s.val();
    var p = v ? decifrar(S.chave, v) : Promise.resolve(null);
    p.catch(function () { senhaDaCasaMudou(); return 'mudou'; }).then(function (c) {
      if (c === 'mudou') return;
      var n = normalizarCfg(c || { cats: catsPadrao(), nome: 'Minha casa', moeda: 'CAD' });
      S.cfg = n.cfg;
      if (n.mudou || !c) salvarCfg();
      if (primeiro) { primeiro = false; irPara('inicio'); setTimeout(aplicarPagamento, 1200); } // espera os lançamentos para sugerir a categoria
      else renderLogo();
    });
  }, negado);
  function addLanc(s) { var id = s.key; decifrar(S.chave, s.val()).then(function (l) { var r = limparReg(id, l); if (r) S.raw[id] = r; else delete S.raw[id]; renderLogo(); }, function () {}); }
  rLanc.on('child_added', addLanc, negado);
  rLanc.on('child_changed', addLanc);
  rLanc.on('child_removed', function (s) { delete S.raw[s.key]; renderLogo(); });
  rPerf.on('value', function (s) {
    var v = s.val() || {}, out = {};
    Promise.all(Object.keys(v).map(function (uid) { return decifrar(S.chave, v[uid]).then(function (p) { out[uid] = p; }, function () {}); }))
      .then(function () { S.perfis = out; renderLogo(); });
  });
  rMem.on('value', function (s) { S.membros = s.val() || {}; renderLogo(); });
  rConv.on('value', function (s) { if (S.meta) S.meta.convite = s.val(); renderLogo(); });
  rCon.on('value', function (s) {
    var on = !!s.val();
    $('sync-dot').style.background = on ? '#43a047' : '#f59e0b';
    $('sync-txt').textContent = on ? 'sincronizado ✓' : 'offline';
  });
}

var modoCriar = false;
function msgAuth(e) {
  var c = (e && e.code) || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'E-mail ou senha incorretos.';
  if (/email-already-in-use/.test(c)) return 'Já existe uma conta com este e-mail. Use "Entrar".';
  if (/weak-password/.test(c)) return 'Senha fraca. Use pelo menos 8 caracteres.';
  if (/invalid-email/.test(c)) return 'E-mail inválido.';
  if (/too-many-requests/.test(c)) return 'Muitas tentativas. Aguarde alguns minutos.';
  if (/network/.test(c)) return 'Sem conexão com a internet.';
  return 'Não foi possível concluir (' + (c || 'erro') + ').';
}
function setModoCriar(v) {
  modoCriar = v;
  $('tab-entrar').classList.toggle('on', !v); $('tab-criar').classList.toggle('on', v);
  $('campo-nome').style.display = v ? '' : 'none';
  $('au-btn').textContent = v ? 'Criar conta' : 'Entrar';
  $('au-esqueci').style.display = v ? 'none' : '';
  $('au-erro').textContent = '';
}
function setAbaCasa(convite) {
  $('tab-nova').classList.toggle('on', !convite); $('tab-convite').classList.toggle('on', convite);
  $('box-nova').style.display = convite ? 'none' : ''; $('box-convite').style.display = convite ? '' : 'none';
}
function enviarAuth() {
  var email = $('au-email').value.trim(), senha = $('au-senha').value, nome = $('au-nome').value.trim(), er = $('au-erro');
  er.textContent = '';
  if (!email || !senha) { er.textContent = 'Preencha e-mail e senha.'; return; }
  if (modoCriar && !nome) { er.textContent = 'Informe seu nome.'; return; }
  if (modoCriar && senha.length < 8) { er.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
  var btn = $('au-btn'); btn.disabled = true;
  var p = modoCriar ? auth.createUserWithEmailAndPassword(email, senha).then(function (r) { return r.user.updateProfile({ displayName: nome }); })
    : auth.signInWithEmailAndPassword(email, senha);
  p.catch(function (e) { er.textContent = msgAuth(e); }).then(function () { btn.disabled = false; });
}
function esqueci() {
  var email = $('au-email').value.trim();
  if (!email) { $('au-erro').textContent = 'Digite seu e-mail acima e toque de novo em "Esqueci minha senha".'; return; }
  auth.sendPasswordResetEmail(email).then(function () { $('au-erro').innerHTML = '<span style="color:#16a34a">Enviamos um e-mail para redefinir a senha.</span>'; },
    function (e) { $('au-erro').textContent = msgAuth(e); });
}
function nomeUsuario() { return (S.user && (S.user.displayName || (S.user.email || '').split('@')[0])) || 'Eu'; }
function criarCasa() {
  var nome = $('nc-nome').value.trim(), md = $('nc-moeda').value, s1 = $('nc-senha').value, s2 = $('nc-senha2').value, er = $('nc-erro');
  er.textContent = '';
  // Fase de testes (14/11/2026): só cria casa quem tem o código de acesso. A conferência é feita nas regras do Firebase (admin/codigoAcesso).
  var acesso = $('nc-acesso').value.trim().toUpperCase().replace(/\s+/g, '');
  if (!acesso) { er.textContent = 'Digite o código de acesso. O Minha Casa está em fase de testes.'; return; }
  if (!/^[A-Z0-9-]{6,40}$/.test(acesso)) { er.textContent = 'Código de acesso inválido. Confira o código que você recebeu.'; return; }
  if (!nome) { er.textContent = 'Dê um nome para a casa.'; return; }
  if (s1.length < 8) { er.textContent = 'A senha da casa precisa ter pelo menos 8 caracteres.'; return; }
  if (s1 !== s2) { er.textContent = 'As senhas da casa não conferem.'; return; }
  if (!$('nc-ciente').checked) { er.textContent = 'Confirme que anotou a senha da casa.'; return; }
  var btn = $('nc-btn'); btn.disabled = true; btn.textContent = 'Criando…';
  var casa = rid(20), convite = rid(24), salt = b64(crypto.getRandomValues(new Uint8Array(16))), chave;
  derivarChave(s1, salt).then(function (k) { chave = k; return cifrar(k, VERIF_TEXTO); }).then(function (verif) {
    var m = {}; m[S.user.uid] = convite;
    var nova = { dono: S.user.uid, convite: convite, salt: salt, verif: verif, membros: m, acesso: acesso, criada: firebase.database.ServerValue.TIMESTAMP };
    var negado = function (e) { return e && /permission/i.test(e.code || e.message || ''); };
    // 1º convite com nome (grava junto quem usou; tudo ou nada) · 2º código geral
    var upd = {}; upd['casas/' + casa] = nova;
    upd['convites/' + acesso + '/usadoPor'] = S.user.uid; upd['convites/' + acesso + '/usadoEm'] = firebase.database.ServerValue.TIMESTAMP; upd['convites/' + acesso + '/email'] = S.user.email || '';
    return db.ref().update(upd).catch(function (e) {
      if (!negado(e)) throw e;
      return db.ref('casas/' + casa).set(nova);
    }).catch(function (e) { if (negado(e)) throw { codigoAcesso: true }; throw e; });
  }).then(function () {
    return cifrar(chave, { v: 2, nome: nome, moeda: md, cats: catsPadrao(), limite: 0, alertaPct: 80, periodo: periodoMesAtual(), orcParc: 0 });
  }).then(function (c) { return db.ref('casas/' + casa + '/dados/config').set(c); })
    .then(function () { return entrouNaCasa(casa, chave, true); })
    .catch(function (e) { er.textContent = e && e.codigoAcesso ? 'Código de acesso inválido. Confira o código que você recebeu.' : 'Não foi possível criar a casa (' + ((e && e.code) || e) + ').'; })
    .then(function () { btn.disabled = false; btn.textContent = 'Criar casa'; });
}
function lerConvite(txt) {
  var m = String(txt || '').trim().toLowerCase().replace(/\s+/g, '').match(/^hv-([a-z0-9]{20})-([a-z0-9]{24})$/);
  return m ? { casa: m[1], convite: m[2] } : null;
}
function entrarConvite() {
  var cv = lerConvite($('cv-codigo').value), senha = $('cv-senha').value, er = $('cv-erro');
  er.textContent = '';
  if (!cv) { er.textContent = 'Convite inválido. Toque de novo no link que você recebeu, ou cole o código inteiro (começa com HV-).'; var cp = $('cv-codigo').parentNode; if (cp) cp.style.display = ''; try { localStorage.removeItem(CHAVE_CONV); } catch (e) {} return; }
  if (!senha) { er.textContent = 'Digite a senha da casa.'; return; }
  var btn = $('cv-btn'); btn.disabled = true; btn.textContent = 'Entrando…';
  var memRef = db.ref('casas/' + cv.casa + '/membros/' + S.user.uid), chave;
  // 1) lê o salt (público) e a versão do convite; 2) calcula a chave e a prova com a senha digitada;
  // 3) só entra se as regras aceitarem convite + prova (senha certa e convite válido)
  Promise.all([db.ref('casas/' + cv.casa + '/salt').once('value'), db.ref('casas/' + cv.casa + '/convVer').once('value')])
    .catch(function () { throw { msg: 'Convite inválido ou expirado. Peça um link novo.' }; })
    .then(function (r) {
      if (!r[0].exists()) throw { msg: 'Convite inválido ou expirado. Peça um link novo.' };
      if (r[1].val() !== 2) throw { msg: 'Este convite ainda não está ativo. Peça para quem criou a casa abrir o MinhaCasa uma vez e mandar o link de novo.' };
      return derivarChave(senha, r[0].val());
    })
    .then(function (k) { chave = k; return provaDaChave(k); })
    .then(function (pv) { return memRef.set(cv.convite + ':' + pv).catch(function () { throw { msg: 'Senha da casa incorreta, ou o convite expirou. Confira a senha ou peça um link novo.' }; }); })
    .then(function () { return db.ref('casas/' + cv.casa).once('value'); })
    .then(function (snap) {
      var m = snap.val();
      return decifrar(chave, m.verif).then(function () { S.meta = m; try { localStorage.removeItem(CHAVE_CONV); } catch (e) {} return entrouNaCasa(cv.casa, chave, false); },
        function () { return memRef.remove().then(function () { throw { msg: 'Senha da casa incorreta.' }; }); });
    }).catch(function (e) { er.textContent = (e && e.msg) || 'Não foi possível entrar (' + ((e && e.code) || e) + ').'; })
    .then(function () { btn.disabled = false; btn.textContent = 'Entrar na casa'; });
}
function entrouNaCasa(casa, chave, criou) {
  return db.ref('usuarios/' + S.user.uid + '/casa').set(casa)
    .then(function () { return IDB.set(S.user.uid + ':' + casa, chave); })
    .then(function () { return cifrar(chave, { nome: nomeUsuario(), email: S.user.email || '' }); })
    .then(function (p) { return db.ref('casas/' + casa + '/dados/perfis/' + S.user.uid).set(p); })
    .then(function () { return db.ref('casas/' + casa).once('value'); })
    .then(function (snap) {
      S.casa = casa; S.meta = snap.val();
      abrirCasa(chave);
      mostrarToast(criou ? '🎉' : '👋', criou ? 'Casa criada!' : 'Bem-vindo(a) à casa!');
      if (criou) S.pedirOrc = true;
    });
}
function desbloquear() {
  var senha = $('ul-senha').value, er = $('ul-erro');
  er.textContent = '';
  if (!senha) { er.textContent = 'Digite a senha da casa.'; return; }
  var btn = $('ul-btn'); btn.disabled = true; btn.textContent = 'Verificando…';
  derivarChave(senha, S.meta.salt).then(function (k) {
    return decifrar(k, S.meta.verif).then(function () {
      return ($('ul-lembrar').checked ? IDB.set(S.user.uid + ':' + S.casa, k) : Promise.resolve()).then(function () { $('ul-senha').value = ''; abrirCasa(k); });
    }, function () { er.textContent = 'Senha da casa incorreta.'; });
  }).catch(function () { er.textContent = 'Não foi possível desbloquear.'; })
    .then(function () { btn.disabled = false; btn.textContent = 'Desbloquear'; });
}
function bloquear() {
  if (!confirm('Bloquear? Será preciso digitar a senha da casa para abrir de novo neste aparelho.')) return;
  IDB.del(S.user.uid + ':' + S.casa).then(function () { pararEscuta(); S.chave = null; S.raw = {}; S.cfg = null; mostrarEntrada('card-unlock'); });
}
function sair() {
  var p = (S.user && S.casa) ? IDB.del(S.user.uid + ':' + S.casa) : Promise.resolve();
  p.then(function () { pararEscuta(); S.chave = null; return auth.signOut(); });
}

// ═════════════════════════ eventos ═════════════════════════
function ligarEventos() {
  ligarBotaoRelatorioCompleto();
  $('tab-entrar').onclick = function () { setModoCriar(false); };
  $('tab-criar').onclick = function () { setModoCriar(true); };
  $('au-btn').onclick = enviarAuth;
  $('au-senha').onkeydown = function (e) { if (e.key === 'Enter') enviarAuth(); };
  $('au-esqueci').onclick = esqueci;
  $('tab-nova').onclick = function () { setAbaCasa(false); };
  $('tab-convite').onclick = function () { setAbaCasa(true); };
  $('nc-btn').onclick = criarCasa;
  $('cv-btn').onclick = entrarConvite;
  $('ul-btn').onclick = desbloquear;
  $('ul-senha').onkeydown = function (e) { if (e.key === 'Enter') desbloquear(); };

  document.addEventListener('click', function (e) {
    var t = e.target, b;
    if ((b = t.closest('[data-acao="sair"]'))) { sair(); return; }
    if ((b = t.closest('[data-ir]'))) { if (b.dataset.ir === 'add') S.add.editId = null; irPara(b.dataset.ir); return; }
    if ((b = t.closest('[data-editar]'))) { S.voltarPara = S.tela === 'add' ? 'inicio' : S.tela; editarLancamento(b.dataset.editar); return; }
    if ((b = t.closest('[data-excluir]'))) { excluir(b.dataset.excluir); return; }
    if ((b = t.closest('.card-cat[data-cat]'))) { irParaCategoria(b.dataset.cat); return; }
    if ((b = t.closest('[data-addtipo]'))) { if (S.add.tipo !== b.dataset.addtipo) { S.add.tipo = b.dataset.addtipo; if (S.add.tipo === 'compra') { S.add.orig = null; S.add.lj = false; } else S.add.cl = null; pintarTipoAdd(); } return; }
    if ((b = t.closest('[data-addlj]'))) { S.add.lj = b.dataset.addlj === '1'; pintarTipoAdd(); return; }
    if (t.closest('[data-origtrocar]')) { S.add.orig = null; $('inp-valor').value = ''; $('inp-desc').value = ''; renderOrig(); atualizarAvisoValor(); return; }
    if ((b = t.closest('[data-origem]'))) { if (S.add.orig !== b.dataset.origem) escolherOrig(b.dataset.origem); return; }
    if ((b = t.closest('[data-addcat]'))) { if (S.add.cat !== b.dataset.addcat) S.add.sub = null; S.add.cat = b.dataset.addcat; renderAdd(); return; }
    if ((b = t.closest('[data-per] .rel-per-btn'))) { setPer(b.parentNode.dataset.per, b.dataset.tipo); return; }
    if ((b = t.closest('[data-rc]'))) { S.rcCat = b.dataset.rc; renderizarRelcat(); return; }
    if ((b = t.closest('[data-cancelar-plano]'))) { cancelarPlano(b.dataset.cancelarPlano); return; }
    if ((b = t.closest('[data-editcat]'))) { abrirCat(b.dataset.editcat); return; }
    if ((b = t.closest('[data-subircat]'))) { subirCat(b.dataset.subircat); return; }
    if ((b = t.closest('[data-remover]'))) { removerMembro(b.dataset.remover); return; }
    if ((b = t.closest('[data-fechar]'))) { fecharSheet(); return; }
    // dentro da folha de categoria
    if (_ed) {
      if ((b = t.closest('[data-emo]'))) { lerCatInputs(); _ed.emoji = b.dataset.emo; desenharCat(); return; }
      if ((b = t.closest('[data-cor]'))) { lerCatInputs(); _ed.cor = b.dataset.cor; desenharCat(); return; }
      if ((b = t.closest('[data-subdel]'))) { lerCatInputs(); _ed.subs.splice(+b.dataset.subdel, 1); desenharCat(); return; }
      if (t.id === 'ed-addsub') { lerCatInputs(); var n = $('ed-novasub').value.trim(); if (n) { _ed.subs.push({ id: rid(8), nome: n }); desenharCat(); $('ed-novasub').focus(); } return; }
      if (t.id === 'ed-salvar') { salvarCat(); return; }
      if (t.id === 'ed-excluir') { excluirCat(); return; }
    }
  });
  $('sheet').onclick = function (e) { if (e.target.id === 'sheet') fecharSheet(); };
  $('sheet').onkeydown = function (e) { if (e.key === 'Enter' && e.target.id === 'ed-novasub') { e.preventDefault(); $('ed-addsub').click(); } };

  // Início / config
  $('btn-config-top').onclick = toggleConfig;
  $('cfg-toggle').onclick = toggleConfig;
  $('topo-config').addEventListener('focusin', function () { $('topo-config').classList.add('editando'); });
  $('topo-config').addEventListener('focusout', function () { $('topo-config').classList.remove('editando'); });
  $('topo-config').addEventListener('change', function (e) { if (e.target.tagName === 'INPUT') salvarConfigTopo(e.target); });
  $('topo-config').addEventListener('input', function (e) { if (e.target.id === 'inp-limite' || (e.target.dataset && e.target.dataset.orc)) atualizarSaldoOrc(); });
  $('cfg-cats').onclick = function () { irPara('ajustes'); };
  $('cfg-ajustes').onclick = function () { irPara('ajustes'); };
  $('cfg-backup').onclick = exportarJSON;
  $('cfg-restaurar').onclick = function () { $('inp-restaurar').click(); };
  $('inp-restaurar').onchange = function () { if (this.files[0]) importarJSON(this.files[0]); this.value = ''; };

  // Registrar
  $('sel-sub').onchange = function () { S.add.sub = this.value || null; };
  $('btn-hoje').onclick = function () { $('inp-data').value = hoje(); };
  $('inp-valor').oninput = function () { atualizarPreviewParcela(); atualizarAvisoValor(); };
  $('orig-busca').oninput = renderOrig;
  $('inp-data').addEventListener('change', renderOrig);
  $('sel-credito').onchange = function () { S.add.cl = this.value || null; atualizarAvisoValor(); };
  if (!COM_PARCELADOS) {
    $('card-parc').style.display = 'none';
    var n5 = $('card-parc').nextElementSibling && $('card-parc').nextElementSibling.querySelector('.add-step-n'); if (n5) n5.textContent = '4';
  }
  $('btn-parcela-toggle').onclick = function () { S.add.nParc = S.add.nParc > 1 ? 1 : 2; S.add.parcIni = 1; atualizarParcUI(); };
  $('sel-parcelas').onchange = function () { S.add.nParc = +this.value; if (S.add.parcIni > S.add.nParc) S.add.parcIni = 1; atualizarParcUI(); };
  $('sel-parcela-ini').onchange = function () { S.add.parcIni = +this.value; atualizarPreviewParcela(); };
  $('btn-salvar-pro').onclick = salvarLancamento;
  $('btn-excluir-edit').onclick = function () { excluir(S.add.editId); };

  // Histórico
  $('hist-mes-ant').onclick = function () { S.mesHist = addMeses(S.mesHist + '-01', -1).slice(0, 7); renderizarHistorico(); };
  $('hist-mes-prox').onclick = function () { S.mesHist = addMeses(S.mesHist + '-01', 1).slice(0, 7); renderizarHistorico(); };
  ['hist', 'rel', 'relcat', 'proj'].forEach(function (q) { [q + '-ini', q + '-fim'].forEach(function (id) { $(id).onchange = renderTela; }); });
  $('hist-wa').onclick = compartilharHistorico;
  $('sem-ant').onclick = function () { S.semCic = (S.semCic || 0) - 1; S.semAberta = false; renderizarSemana(); };
  $('sem-prox').onclick = function () { S.semCic = Math.min(0, (S.semCic || 0) + 1); S.semAberta = false; renderizarSemana(); };
  $('hist-pdf').onclick = exportarPDFHistorico;

  // Ajustes
  $('aj-salvar').onclick = salvarCasaAj;
  $('aj-novacat').onclick = function () { abrirCat(null); };
  $('aj-copiar').onclick = function () { copiar(linkConvite()); };
  $('aj-compart').onclick = compartilharConvite;
  $('aj-novocod').onclick = novoCodigo;
  if (!$('aj-trocarsenha') && $('aj-membros')) {
    var bts = document.createElement('button'); bts.id = 'aj-trocarsenha'; bts.className = 'aj-btn aj-full'; bts.type = 'button';
    bts.style.display = 'none'; bts.innerHTML = ICO('key') + 'Trocar senha da casa';
    $('aj-membros').parentNode.insertBefore(bts, $('aj-membros').nextSibling);
    bts.onclick = abrirTrocarSenha;
  }
  $('aj-exp-json').onclick = exportarJSON;
  $('aj-exp-csv').onclick = exportarCSV;
  $('aj-imp').onclick = function () { $('inp-restaurar').click(); };
  $('aj-bloquear').onclick = bloquear;
}

if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__HV = { gravarLanc: gravarLanc, analisarSemana: analisarSemana, S: S, lerValor: lerValor, formatar: formatar, lancamentos: lancamentos, totaisPeriodo: totaisPeriodo, abrirCasa: abrirCasa, irPara: irPara, abrirRelatorioCompleto: abrirRelatorioCompleto };
iniciar();
})();
