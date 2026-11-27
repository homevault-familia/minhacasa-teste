// ═══════════════════════════════════════════════════════════════════
// MinhaCasa™ — Mercado (27/11/2026)
// Página pessoal, separada do app das famílias. Os dados ficam em mercado/<uid> no Firebase,
// e as regras (database.rules.json) só deixam a PRÓPRIA conta ler e gravar, e só se ela for
// administradora e tiver entrado com o Google. Esconder a página não é a proteção: é o servidor.
// Recibos: o texto vem do "Texto ao Vivo" do iPhone (copiar/colar) e é lido aqui no aparelho
// pelo leitor.js. Nada é enviado para fora, sem custo.
// Saudável: consulta o Open Food Facts (base aberta e gratuita, a mesma que o Nutri-Score usa).
// ═══════════════════════════════════════════════════════════════════
window.iniciarMercado = function (F) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var qsa = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var din = function (v) { return (v == null || isNaN(v)) ? '—' : '$' + Number(v).toFixed(2); };
  var chave = Leitor.chave;
  var hojeISO = function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var mesDe = function (d) { return String(d || '').slice(0, 7); };
  var NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var mesBR = function (m) { var p = m.split('-'); return NOMES_MES[+p[1] - 1] + '/' + p[0].slice(2); };

  var LOJAS = [
    { id: 'superstore', n: 'Superstore', l: 'Atlantic Superstore · 168 Rothesay Ave e 680 Somerset St', busca: 'https://www.atlanticsuperstore.ca/search?search-bar=' },
    { id: 'nofrills', n: 'No Frills', l: 'No Frills · 621 Fairville Blvd', busca: 'https://www.nofrills.ca/search?search-bar=' },
    { id: 'walmart', n: 'Walmart', l: 'Walmart · 450 Westmorland Rd e 621 Fairville Blvd', busca: 'https://www.walmart.ca/search?q=' },
    { id: 'sobeys', n: 'Sobeys', l: 'Sobeys · Lansdowne, 1 Plaza Ave e East Point', busca: 'https://www.google.com/search?q=Sobeys+' },
    { id: 'costco', n: 'Costco', l: 'Costco · 300 Retail Dr (embalagens grandes)', busca: 'https://www.costco.ca/CatalogSearch?keyword=' },
    { id: 'gianttiger', n: 'Giant Tiger', l: 'Giant Tiger · 100 Prince Edward St e 88 Consumers Dr', busca: 'https://www.gianttiger.com/search?q=' },
    { id: 'outro', n: 'Outro', l: 'Foodland, Co-op, feira e outros' }
  ];
  var LN = {}; LOJAS.forEach(function (l) { LN[l.id] = l.n; });
  var COMPARA = LOJAS.filter(function (l) { return l.id !== 'outro'; });
  var CATS = ['Hortifruti', 'Carnes e peixes', 'Laticínios e ovos', 'Padaria', 'Mercearia', 'Congelados', 'Bebidas', 'Lanches e doces', 'Limpeza', 'Higiene', 'Bebê e pet', 'Outros'];
  var COMIDA = { 'Hortifruti': 1, 'Carnes e peixes': 1, 'Laticínios e ovos': 1, 'Padaria': 1, 'Mercearia': 1, 'Congelados': 1, 'Bebidas': 1, 'Lanches e doces': 1 };

  var app = F.initializeApp(window.HOMEVAULT_FIREBASE), A = F.getAuth(app), DB = F.getDatabase(app);
  A.languageCode = 'pt-BR';
  var U = null, base = '', dono = '', ehDono = true, parar = null;
  var M = { recibos: {}, produtos: {}, dic: {}, ajustes: {} };
  var UI = { aba: 'lista', rev: null, texto: '', off: {}, agrupar: 'cat' };

  if (window.MINHACASA_AMBIENTE !== 'producao') document.body.classList.add('teste');

  function toast(t) { var el = $('toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(function () { el.style.display = 'none'; }, 3200); }
  function mostrar(v) { ['v-login', 'v-negado', 'v-app'].forEach(function (x) { $(x).style.display = x === v ? '' : 'none'; }); }
  function erroTxt(e) { var c = (e && e.code) || String(e); return /PERMISSION/i.test(c) ? 'o Firebase recusou (as regras novas do Mercado já foram publicadas?)' : c; }
  function gravar(mudancas) { return F.update(F.ref(DB, base), mudancas).catch(function (e) { toast('Não salvou: ' + erroTxt(e)); throw e; }); }
  function abrirFolha(html) { $('folha').innerHTML = html; $('fundo').classList.add('on'); }
  function fecharFolha() { $('fundo').classList.remove('on'); $('folha').innerHTML = ''; }
  $('fundo').addEventListener('click', function (e) { if (e.target === $('fundo')) fecharFolha(); });

  // ── login ──
  function provGoogle() { var p = new F.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); return p; }
  $('l-google').onclick = function () {
    $('l-erro').textContent = '';
    F.signInWithPopup(A, provGoogle()).catch(function (e) {
      var c = (e && e.code) || String(e);
      if (/popup-closed|cancelled-popup/.test(c)) return;
      $('l-erro').textContent = /popup-blocked/.test(c) ? 'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente de novo.' : 'Não foi possível entrar (' + c + ').';
    });
  };
  $('l-entrar').onclick = function () {
    var em = $('l-email').value.trim(), se = $('l-senha').value; $('l-erro2').textContent = '';
    if (!em || !se) { $('l-erro2').textContent = 'Digite o e-mail e a senha do MinhaCasa.'; return; }
    $('l-entrar').disabled = true;
    F.signInWithEmailAndPassword(A, em, se).catch(function (e) {
      var c = (e && e.code) || String(e);
      $('l-erro2').textContent = /wrong-password|invalid-credential|user-not-found|invalid-login|invalid-email/.test(c) ? 'E-mail ou senha incorretos.' : /multi-factor/.test(c) ? 'Esta conta usa verificação em duas etapas: entre com o Google.' : 'Não foi possível entrar (' + c + ').';
    }).then(function () { $('l-entrar').disabled = false; });
  };
  $('l-senha').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('l-entrar').click(); });
  $('p-sair').onclick = $('n-sair').onclick = function () { F.signOut(A); };
  $('n-copiar').onclick = function () { compartilharTexto('Código do Mercado (MinhaCasa) de ' + ((U && U.email) || '') + ':\n' + (U ? U.uid : ''), 'Código do Mercado'); };

  function semAcesso(u, e) {
    var negado = /PERMISSION/i.test((e && e.code) || String(e || 'PERMISSION'));
    $('n-msg').innerHTML = negado
      ? 'A conta <b>' + esc(u.email || '') + '</b> ainda não tem acesso ao Mercado.<br>Para liberar, mande o código abaixo para quem administra o Mercado da casa.'
      : 'Não foi possível ler os dados (' + esc(erroTxt(e)) + ').';
    $('n-cod').textContent = negado ? u.uid : '';
    $('n-codbox').style.display = negado ? '' : 'none';
    mostrar('v-negado');
  }
  F.onAuthStateChanged(A, function (u) {
    if (parar) { parar(); parar = null; }
    U = u;
    if (!u) { mostrar('v-login'); return; }
    $('p-quem').textContent = u.email || '';
    // Membro da família? mercadoDe/<uid> diz de quem é o Mercado que esta conta pode usar.
    F.get(F.ref(DB, 'mercadoDe/' + u.uid)).then(function (s) { return s.val(); }, function () { return null; }).then(function (d) {
      if (U !== u) return;
      dono = (typeof d === 'string' && d) ? d : u.uid; ehDono = dono === u.uid; base = 'mercado/' + dono;
      var primeira = true;
      parar = F.onValue(F.ref(DB, base), function (s) {
        var v = s.val() || {};
        M = { recibos: v.recibos || {}, produtos: v.produtos || {}, dic: v.dic || {}, ajustes: v.ajustes || {}, membros: v.membros || {} };
        if (primeira) { primeira = false; mostrar('v-app'); }
        desenhar();
      }, function (e) { semAcesso(u, e); });
    });
  });

  // ── abas ──
  qsa('#abas button').forEach(function (b) { b.onclick = function () { UI.aba = b.dataset.aba; qsa('#abas button').forEach(function (x) { x.classList.toggle('on', x === b); }); desenhar(); window.scrollTo(0, 0); }; });

  // ── dados derivados ──
  function recibos() { return Object.keys(M.recibos).map(function (id) { var r = M.recibos[id]; return Object.assign({ id: id }, r, { itens: [].concat(r.itens || []).filter(Boolean) }); }); }
  function ultimosMeses(n) { var s = {}; recibos().forEach(function (r) { s[mesDe(r.data)] = 1; }); return Object.keys(s).sort().reverse().slice(0, n); }
  function catalogo() {
    var c = {};
    recibos().forEach(function (r) {
      r.itens.forEach(function (it) {
        var k = chave(it.pt || it.raw); var p = c[k] || (c[k] = { k: k, pt: it.pt || it.raw, cat: it.cat || 'Outros', compras: [] });
        p.compras.push({ data: r.data, loja: r.loja, p: +it.un || (+it.total / (+it.qtd || 1)), qtd: +it.qtd || 1, total: +it.total || 0 });
      });
    });
    Object.keys(M.produtos).forEach(function (k) { var p = M.produtos[k]; if (!c[k] && p.fixo === true) c[k] = { k: k, pt: p.pt || k, cat: p.cat || 'Outros', compras: [] }; if (c[k] && p.cat) c[k].cat = p.cat; });
    return c;
  }
  function precoEm(k, loja, cat) {
    var m = null;
    ((cat[k] && cat[k].compras) || []).forEach(function (b) { if (b.loja === loja && (!m || b.data > m.data)) m = { p: b.p, data: b.data, fonte: 'recibo' }; });
    var r = M.produtos[k] && M.produtos[k].precos && M.produtos[k].precos[loja];
    if (r && r.p > 0 && (!m || (r.data || '') >= m.data)) m = { p: +r.p, data: r.data, fonte: r.fonte || 'anotado' };
    return m;
  }
  function listaDoMes() {
    var cat = catalogo(), meses = ultimosMeses(3), nm = Math.max(meses.length, 1), out = [];
    Object.keys(cat).forEach(function (k) {
      var c = cat[k], fixo = M.produtos[k] && M.produtos[k].fixo;
      if (fixo === false) return;
      var jan = c.compras.filter(function (b) { return meses.indexOf(mesDe(b.data)) >= 0; });
      var ms = {}; jan.forEach(function (b) { ms[mesDe(b.data)] = 1; });
      var nMeses = Object.keys(ms).length;
      var auto = meses.length < 2 ? nMeses >= 1 : nMeses >= 2;
      if (!auto && fixo !== true) return;
      var soma = jan.reduce(function (s, b) { return s + b.qtd; }, 0) / nm, peso = jan.some(function (b) { return b.qtd % 1; });
      var qtd = peso ? Math.max(0.1, Math.round(soma * 10) / 10) : Math.max(1, Math.round(soma));
      var pr = M.produtos[k] || {}; if (+pr.qtd > 0) qtd = +pr.qtd;
      var ult = c.compras.slice().sort(function (a, b) { return b.data.localeCompare(a.data); })[0] || null;
      var precos = COMPARA.map(function (l) { var p = precoEm(k, l.id, cat); return p ? Object.assign({ loja: l.id }, p) : null; }).filter(Boolean);
      var min = precos.reduce(function (a, b) { return !a || b.p < a.p ? b : a; }, null);
      out.push({ k: k, pt: c.pt, cat: c.cat, qtd: qtd, ult: ult, precos: precos, min: min, meses: nMeses, marcado: pr.marcado === mesDe(hojeISO()) });
    });
    return out.sort(function (a, b) { return CATS.indexOf(a.cat) - CATS.indexOf(b.cat) || a.pt.localeCompare(b.pt); });
  }
  function resumo(L) {
    var sempre = 0, melhor = 0;
    L.forEach(function (i) { var u = i.ult ? i.ult.p : (i.min ? i.min.p : 0); sempre += u * i.qtd; melhor += (i.min ? i.min.p : u) * i.qtd; });
    return { sempre: sempre, melhor: melhor };
  }
  function gastoMes(m) { return recibos().filter(function (r) { return mesDe(r.data) === m; }).reduce(function (s, r) { return s + (+r.total || 0); }, 0); }

  // ── telas ──
  function desenhar() {
    var f = { lista: telaLista, recibo: telaRecibo, precos: telaPrecos, saude: telaSaude, gastos: telaGastos }[UI.aba];
    $('conteudo').innerHTML = f();
    ligar();
  }
  function kpis() {
    var L = listaDoMes(), r = resumo(L), orc = +M.ajustes.orcamento || 0, g = gastoMes(mesDe(hojeISO()));
    return '<div class="kpis"><div class="kpi azul"><b>' + din(g) + '</b><span>gasto este mês</span></div>' +
      '<div class="kpi ' + (orc && g > orc ? 'vermelho' : '') + '"><b>' + (orc ? din(Math.max(0, orc - g)) : '—') + '</b><span>' + (orc ? (g > orc ? 'acima do orçamento' : 'sobra do orçamento') : 'defina o orçamento em Gastos') + '</span></div>' +
      '<div class="kpi verde"><b>' + (L.length ? din(Math.max(0, r.sempre - r.melhor)) : '—') + '</b><span>economia possível na lista</span></div></div>';
  }
  function nomesConhecidos() { var n = {}; Object.keys(M.dic).forEach(function (k) { n[M.dic[k].pt] = 1; }); Object.values(catalogo()).forEach(function (c) { n[c.pt] = 1; }); return Object.keys(n).sort(); }
  function grupos(L) {
    var g = [], idx = {};
    L.forEach(function (i) {
      var nome = UI.agrupar === 'loja' ? (i.min ? LN[i.min.loja] : 'Sem preço ainda') : i.cat;
      if (!(nome in idx)) { idx[nome] = g.length; g.push({ nome: nome, itens: [] }); }
      g[idx[nome]].itens.push(i);
    });
    if (UI.agrupar === 'loja') g.sort(function (a, b) { return (a.nome === 'Sem preço ainda') - (b.nome === 'Sem preço ainda') || b.itens.length - a.itens.length; });
    return g;
  }
  function textoLista(L) {
    var linhas = ['🛒 Lista do mercado — ' + mesBR(mesDe(hojeISO()))];
    grupos(L).forEach(function (g) {
      var sub = g.itens.reduce(function (s, i) { return s + (i.min ? i.min.p * i.qtd : 0); }, 0);
      linhas.push('', '*' + g.nome + '*' + (UI.agrupar === 'loja' && sub ? ' (~' + din(sub) + ')' : ''));
      g.itens.forEach(function (i) { linhas.push((i.marcado ? '☑ ' : '☐ ') + i.qtd + ' × ' + i.pt + (UI.agrupar !== 'loja' && i.min ? ' — ' + LN[i.min.loja] + ' ' + din(i.min.p) : '')); });
    });
    var r = resumo(L);
    if (r.melhor) linhas.push('', 'Estimativa: ' + din(r.melhor));
    return linhas.join('\n');
  }
  function compartilharTexto(t, titulo) {
    if (navigator.share) { navigator.share({ title: titulo || 'Lista do mercado', text: t }).catch(function (e) { if (e && e.name !== 'AbortError') copiarTexto(t); }); return; }
    copiarTexto(t);
  }
  function copiarTexto(t) {
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Copiado. Cole no WhatsApp ou no e-mail.'); }, function () {
      abrirFolha('<h3>Copie o texto</h3><textarea class="in" style="min-height:260px">' + esc(t) + '</textarea><button class="btn cheio" id="f-fechar" style="margin-top:10px">Fechar</button>'); $('f-fechar').onclick = fecharFolha;
    });
  }
  function cartaoIncluir() {
    return '<div class="card"><h2>Incluir na lista</h2><datalist id="nomes-l">' + nomesConhecidos().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<input class="in" id="add-nome" list="nomes-l" placeholder="Ex.: Café 925 g, detergente…" aria-label="Item para incluir">' +
      '<div class="grade3" style="grid-template-columns:minmax(0,1fr) 5.5em auto;margin-top:6px"><select class="in" id="add-cat" aria-label="Categoria">' + CATS.map(function (c) { return '<option' + (c === 'Mercearia' ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<label class="mini">Qtd<input class="in" id="add-qtd" type="number" min="0.1" step="0.1" inputmode="decimal" value="1"></label><button class="btn pri" id="add-ok">Incluir</button></div><div class="erro" id="add-erro"></div></div>';
  }
  function telaLista() {
    var L = listaDoMes();
    if (!L.length) return kpis() + cartaoIncluir() + '<div class="card"><h2>A lista se monta sozinha</h2><p class="nota">Com o que você compra com frequência nos recibos, ou com os itens que você incluir acima.</p><button class="btn" data-ir="recibo">Adicionar recibo</button></div>';
    var r = resumo(L), meses = ultimosMeses(3).map(mesBR).join(', '), marcados = L.filter(function (i) { return i.marcado; }).length;
    var h = kpis() + cartaoIncluir() + '<div class="card"><h2>Lista do mês · ' + L.length + ' itens' + (marcados ? ' · ' + marcados + ' no carrinho' : '') + '</h2>' +
      '<p class="nota">' + (meses ? 'O que você comprou em pelo menos 2 dos últimos 3 meses (' + esc(meses) + ') e o que você incluiu. ' : '') + 'Comprando cada item onde é mais barato: <b>' + din(r.melhor) + '</b>' + (r.sempre > r.melhor ? ' em vez de ' + din(r.sempre) : '') + '. Toque no quadradinho para marcar o que já pegou.</p>' +
      '<div class="filtros"><button data-agrupar="cat" class="' + (UI.agrupar === 'cat' ? 'on' : '') + '">Por categoria</button><button data-agrupar="loja" class="' + (UI.agrupar === 'loja' ? 'on' : '') + '">Por mercado</button></div>';
    grupos(L).forEach(function (g) {
      var sub = g.itens.reduce(function (s, i) { return s + (i.min ? i.min.p * i.qtd : 0); }, 0);
      h += '<div class="selo" style="margin:12px 0 2px">' + esc(g.nome) + (UI.agrupar === 'loja' && sub ? ' · ~' + din(sub) : '') + '</div>';
      g.itens.forEach(function (i) {
        h += '<div class="linha' + (i.marcado ? ' feito' : '') + '"><button class="caixa" data-marcar="' + esc(i.k) + '" aria-pressed="' + i.marcado + '" aria-label="Marcar ' + esc(i.pt) + '">' + (i.marcado ? '✓' : '') + '</button><div class="info"><div class="t">' + esc(i.qtd) + ' × ' + esc(i.pt) + '</div><div class="s">' +
          (i.min ? (UI.agrupar === 'loja' ? din(i.min.p) + ' cada' : 'Mais barato: ' + esc(LN[i.min.loja]) + ' ' + din(i.min.p)) : 'Sem preço para comparar') + (i.ult && UI.agrupar !== 'loja' ? ' · última vez ' + din(i.ult.p) + ' (' + esc(LN[i.ult.loja] || '') + ')' : '') + '</div></div>' +
          '<button class="btn sm" data-qtd="' + esc(i.k) + '" aria-label="Mudar quantidade de ' + esc(i.pt) + '">Qtd</button><button class="btn sm" data-tirar="' + esc(i.k) + '" aria-label="Tirar ' + esc(i.pt) + ' da lista">Tirar</button></div>';
      });
    });
    h += '<div class="grupo-btn" style="margin-top:14px"><button class="btn pri" id="compartilhar">Compartilhar</button><button class="btn" id="copiar-lista">Copiar</button>' + (marcados ? '<button class="btn" id="desmarcar">Desmarcar tudo</button>' : '') + '</div>' +
      '<p class="nota" style="margin-top:8px">Compartilhar abre o WhatsApp, o e-mail ou as Mensagens do iPhone com a lista pronta' + (UI.agrupar === 'loja' ? ', separada por mercado' : '') + '.</p></div>';
    var fora = Object.values(catalogo()).filter(function (c) { return !L.some(function (l) { return l.k === c.k; }); }).sort(function (a, b) { return a.pt.localeCompare(b.pt); });
    if (fora.length) h += '<div class="card"><h2>Outros itens já comprados</h2><p class="nota">Toque para colocar na lista.</p><div class="chips">' + fora.map(function (c) { return '<button class="chip" data-fixar="' + esc(c.k) + '">+ ' + esc(c.pt) + '</button>'; }).join('') + '</div></div>';
    return h;
  }
  function telaRecibo() {
    if (UI.rev) return telaRevisar();
    var h = '<div class="card"><h2>Novo recibo</h2><ol class="passos"><li>Tire a foto do recibo, bem reta e com luz.</li><li>No app <b>Fotos</b>, abra a foto e toque no ícone de <b>Texto ao Vivo</b> (o quadradinho com linhas, no canto de baixo).</li><li>Toque e segure no texto → <b>Selecionar Tudo</b> → <b>Copiar</b>.</li><li>Volte aqui e toque em <b>Colar recibo</b>.</li></ol>' +
      '<div class="grupo-btn" style="margin-top:12px"><button class="btn pri" id="colar">Colar recibo</button></div>' +
      '<label class="lb" for="texto">Ou cole/digite o texto aqui</label><textarea class="in" id="texto" placeholder="ATLANTIC SUPERSTORE&#10;PC BLK BEANS   MRJ  1.29&#10;…">' + esc(UI.texto) + '</textarea>' +
      '<div class="grupo-btn" style="margin-top:10px"><button class="btn" id="ler">Ler texto</button><button class="btn" id="manual">Recibo em branco</button></div><div class="erro" id="r-erro"></div></div>';
    var rs = recibos().sort(function (a, b) { return (b.data || '').localeCompare(a.data || '') || (b.criado || 0) - (a.criado || 0); });
    h += '<div class="card"><h2>Recibos salvos</h2>' + (rs.length ? rs.slice(0, 40).map(function (r) {
      return '<div class="linha"><div class="info"><div class="t">' + esc(LN[r.loja] || 'Outro') + ' · ' + esc(r.data) + '</div><div class="s">' + r.itens.length + ' itens</div></div><div class="valor">' + din(r.total) + '</div><button class="btn sm" data-ver="' + esc(r.id) + '">Ver</button></div>';
    }).join('') : '<div class="vazio">Nenhum recibo ainda.</div>') + '</div>';
    var nd = Object.keys(M.dic).length;
    if (nd) h += '<div class="card"><h2>Nomes aprendidos · ' + nd + '</h2><p class="nota">Cada código do recibo que você renomeia fica guardado. Na próxima vez ele já vem com o seu nome e a categoria certa.</p><button class="btn sm" id="ver-dic">Ver e corrigir</button></div>';
    return h;
  }
  function itemDoLeitor(it) {
    var d = M.dic[chave(it.raw)];
    return { raw: it.raw, pt: d ? d.pt : it.en, cat: d ? d.cat : it.cat, qtd: it.qtd, un: it.un, total: it.total, novo: !d };
  }
  function telaRevisar() {
    var r = UI.rev, soma = r.itens.reduce(function (s, i) { return s + (+i.total || 0); }, 0);
    var dif = r.total ? Math.abs(soma + (+r.imposto || 0) - r.total) : 0;
    var nomes = {}; Object.keys(M.dic).forEach(function (k) { nomes[M.dic[k].pt] = 1; }); Object.values(catalogo()).forEach(function (c) { nomes[c.pt] = 1; });
    var h = '<datalist id="nomes">' + Object.keys(nomes).sort().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>';
    h += '<div class="card"><h2>' + (r.id ? 'Editar recibo' : 'Conferir recibo') + '</h2>' +
      (r.emparelhou ? '<p class="nota">O texto veio com os nomes e os preços em colunas separadas. Juntei na ordem; confira se cada preço ficou no item certo.</p>' : '') +
      '<div class="grade3" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><div><label class="lb" for="rv-loja">Mercado</label><select class="in" id="rv-loja">' + LOJAS.map(function (l) { return '<option value="' + l.id + '"' + (l.id === r.loja ? ' selected' : '') + '>' + esc(l.n) + '</option>'; }).join('') + '</select></div>' +
      '<div><label class="lb" for="rv-data">Data</label><input class="in" type="date" id="rv-data" value="' + esc(r.data) + '"></div>' +
      '<div><label class="lb" for="rv-total">Total pago</label><input class="in" type="number" step="0.01" inputmode="decimal" id="rv-total" value="' + esc(r.total == null ? '' : r.total) + '"></div>' +
      '<div><label class="lb" for="rv-imp">Imposto (HST)</label><input class="in" type="number" step="0.01" inputmode="decimal" id="rv-imp" value="' + esc(r.imposto || '') + '"></div></div>' +
      '<p class="nota" style="margin-top:10px">Itens: <b>' + din(soma) + '</b>' + (r.total ? ' + imposto ' + din(r.imposto || 0) + ' = ' + din(soma + (+r.imposto || 0)) + (dif > 0.05 ? ' · <b style="color:#b91c1c">diferença de ' + din(dif) + ' para o total pago — confira</b>' : ' · confere com o total ✓') : '') + '</p></div>';
    h += '<div class="card"><h2>' + r.itens.length + ' itens</h2><p class="nota">Dê a cada item o nome que você usa (ex.: “Leite 2% 4 L”). Use sempre o mesmo nome em mercados diferentes para comparar os preços. O app lembra na próxima vez.</p>' +
      r.itens.map(function (it, i) {
        return '<div class="item-rev">' + (it.raw ? '<div class="raw">' + esc(it.raw) + (it.novo ? ' · <b style="color:#b45309">novo</b>' : '') + '</div>' : '') +
          '<input class="in" list="nomes" data-i="' + i + '" data-f="pt" value="' + esc(it.pt) + '" aria-label="Nome do item">' +
          '<div class="grade3"><select class="in" data-i="' + i + '" data-f="cat" aria-label="Categoria">' + CATS.map(function (c) { return '<option' + (c === it.cat ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
          '<label class="mini">Qtd<input class="in" type="number" step="0.001" inputmode="decimal" data-i="' + i + '" data-f="qtd" value="' + esc(it.qtd) + '"></label>' +
          '<label class="mini">Total $<input class="in" type="number" step="0.01" inputmode="decimal" data-i="' + i + '" data-f="total" value="' + esc(it.total) + '"></label>' +
          '<button class="btn sm" data-rm="' + i + '" aria-label="Remover item">×</button></div></div>';
      }).join('') +
      '<div class="grupo-btn" style="margin-top:12px"><button class="btn" id="rv-mais">+ Item</button></div></div>' +
      '<div class="grupo-btn"><button class="btn pri" id="rv-salvar" style="flex:1">Salvar recibo</button><button class="btn" id="rv-cancelar">Cancelar</button>' + (r.id ? '<button class="btn" id="rv-apagar" style="color:#b91c1c">Apagar</button>' : '') + '</div><div class="erro" id="rv-erro"></div>';
    return h;
  }
  function telaPrecos() {
    var L = listaDoMes(), cat = catalogo();
    if (!L.length) return '<div class="card"><h2>Preços</h2><p class="vazio">A comparação aparece quando houver itens na lista do mês.</p></div>';
    var r = resumo(L);
    var tot = COMPARA.map(function (l) { var s = 0, n = 0; L.forEach(function (i) { var p = precoEm(i.k, l.id, cat); if (p) { s += p.p * i.qtd; n++; } }); return { l: l, s: s, n: n }; });
    var completo = tot.filter(function (t) { return t.n === L.length; }).sort(function (a, b) { return a.s - b.s; })[0];
    var h = '<div class="kpis"><div class="kpi"><b>' + din(r.sempre) + '</b><span>pagando como sempre</span></div><div class="kpi verde"><b>' + din(r.melhor) + '</b><span>melhor preço em cada item</span></div>' +
      '<div class="kpi azul"><b>' + (completo ? din(completo.s) : '—') + '</b><span>' + (completo ? 'tudo na ' + esc(completo.l.n) : 'faltam preços para comparar um mercado só') + '</span></div></div>';
    h += '<div class="card"><p class="nota" style="margin:0">Os preços vêm dos seus recibos e do que você anota. Toque num mercado para anotar o preço que viu no folheto, no Flipp ou na prateleira. Compare sempre a mesma embalagem. Em amarelo, o mais barato.</p></div>';
    var c = '';
    L.forEach(function (i) {
      if (i.cat !== c) { c = i.cat; h += '<div class="selo" style="margin:6px 0 8px">' + esc(c) + '</div>'; }
      h += '<div class="card" style="padding:12px 14px"><div class="t" style="font-weight:700">' + esc(i.qtd) + ' × ' + esc(i.pt) + '</div><div class="chips">' +
        COMPARA.map(function (l) {
          var p = precoEm(i.k, l.id, cat), melhor = p && i.min && p.p === i.min.p;
          return '<button class="chip' + (melhor ? ' melhor' : '') + (p ? '' : ' falta') + '" data-k="' + esc(i.k) + '" data-loja="' + l.id + '">' + esc(l.n) + (p ? '<b>' + din(p.p) + '</b><small>' + esc(p.fonte) + ' ' + esc((p.data || '').slice(5).split('-').reverse().join('/')) + '</small>' : '<b>+</b>') + '</button>';
        }).join('') + '</div></div>';
    });
    h += '<div class="card"><h2>Total da lista por mercado</h2>' + tot.map(function (t) { return '<div class="linha"><div class="info"><div class="t">' + esc(t.l.n) + '</div><div class="s">' + t.n + ' de ' + L.length + ' itens com preço</div></div><div class="valor">' + (t.n ? din(t.s) : '—') + '</div></div>'; }).join('') + '</div>';
    h += '<div class="card"><h2>Mercados de Saint John</h2>' + LOJAS.map(function (l) { return '<div class="s" style="font-size:13px;color:#475569;margin:4px 0">' + esc(l.l) + '</div>'; }).join('') + '</div>';
    return h;
  }
  function nsBadge(g) { g = String(g || '').toLowerCase(); return /^[a-e]$/.test(g) ? '<span class="ns ns-' + g + '">' + g.toUpperCase() + '</span>' : ''; }
  function yukaCor(v) { return v < 25 ? 'y0' : v < 50 ? 'y1' : v < 75 ? 'y2' : 'y3'; }
  function telaSaude() {
    var L = listaDoMes().filter(function (i) { return COMIDA[i.cat]; });
    var h = '<div class="card"><h2>Mais saudável</h2><p class="nota">Para cada alimento da lista, busque o produto no <b>Open Food Facts</b> (base aberta e gratuita) para ver o Nutri-Score e a classificação NOVA, e depois opções melhores vendidas no Canadá. O Yuka não tem ligação aberta com outros apps: escaneie no Yuka e anote a nota aqui.</p>' +
      '<p class="nota" style="margin:0">Nutri-Score: ' + ['a', 'b', 'c', 'd', 'e'].map(nsBadge).join(' ') + ' (A é o melhor). NOVA: 1 natural … 4 ultraprocessado. Yuka: <span class="ns y0">0–24</span> <span class="ns y1">25–49</span> <span class="ns y2">50–74</span> <span class="ns y3">75–100</span></p></div>';
    if (!L.length) return h + '<div class="vazio">Os alimentos da sua lista aparecem aqui.</div>';
    L.forEach(function (i) {
      var p = M.produtos[i.k] || {}, o = p.off, alts = [].concat(p.alts || []).filter(Boolean), res = UI.off[i.k];
      h += '<div class="card"><div class="linha" style="padding:0"><div class="info"><div class="t">' + esc(i.pt) + '</div><div class="s">' + (o ? esc(o.nome) + (o.marca ? ' · ' + esc(o.marca) : '') + ' ' + nsBadge(o.ns) + (o.nova ? ' <span class="selo">NOVA ' + esc(o.nova) + '</span>' : '') : 'Ainda não buscado') + '</div></div>' +
        (p.yuka != null ? '<span class="ns ' + yukaCor(+p.yuka) + '">' + esc(p.yuka) + '</span>' : '') + '</div>';
      if (res && res.lista) {
        h += '<p class="nota" style="margin-top:10px">Qual destes é o seu?</p>' + (res.lista.length ? res.lista.map(function (x, j) { return '<div class="linha"><div class="info"><div class="t" style="font-size:14px">' + esc(x.product_name || '?') + '</div><div class="s">' + esc(x.brands || '') + ' ' + esc(x.quantity || '') + ' ' + nsBadge(x.nutriscore_grade) + '</div></div><button class="btn sm" data-escolher="' + esc(i.k) + '" data-j="' + j + '">É este</button></div>'; }).join('') : '<div class="vazio">Nada encontrado. Tente outro nome.</div>');
      }
      if (res && res.msg) h += '<p class="nota" style="margin-top:10px">' + esc(res.msg) + '</p>';
      if (alts.length) h += '<p class="nota" style="margin:12px 0 2px"><b>Opções melhores no Canadá</b></p>' + alts.map(function (a) { return '<div class="linha"><div class="info"><div class="t" style="font-size:14px">' + nsBadge(a.ns) + ' ' + esc(a.nome) + '</div><div class="s">' + esc(a.marca || '') + ' ' + esc(a.qtd || '') + (a.nova ? ' · NOVA ' + esc(a.nova) : '') + '</div></div>' + (/^\d{6,14}$/.test(a.code || '') ? '<a class="btn sm" href="https://world.openfoodfacts.org/product/' + esc(a.code) + '" target="_blank" rel="noopener">Ver</a>' : '') + '</div>'; }).join('');
      h += '<input class="in" style="margin-top:10px" data-busca="' + esc(i.k) + '" value="' + esc((res && res.q) || p.en || i.pt) + '" aria-label="Nome para buscar no Open Food Facts">' +
        '<div class="grupo-btn" style="margin-top:6px"><button class="btn sm" data-off="' + esc(i.k) + '">Buscar no Open Food Facts</button>' + (o && o.cat ? '<button class="btn sm" data-alt="' + esc(i.k) + '">Opções melhores</button>' : '') + '</div>' +
        '<div class="grade3" style="grid-template-columns:auto 6em;justify-content:start;margin-top:4px"><label class="nota" for="y-' + esc(i.k) + '" style="margin:0">Nota Yuka</label><input class="in" id="y-' + esc(i.k) + '" type="number" min="0" max="100" inputmode="numeric" data-yuka="' + esc(i.k) + '" value="' + esc(p.yuka == null ? '' : p.yuka) + '"></div></div>';
    });
    return h;
  }
  function barras(linhas, max, limite) {
    if (!linhas.length) return '<div class="vazio">Sem dados.</div>';
    return linhas.map(function (r) { return '<div class="barra' + (limite && r.v > limite ? ' passou' : '') + '"><span>' + esc(r.l) + '</span><div class="tr"><i style="width:' + (max ? Math.max(2, r.v / max * 100) : 0) + '%"></i></div><span class="valor">' + din(r.v) + '</span></div>'; }).join('');
  }
  function telaGastos() {
    var orc = +M.ajustes.orcamento || 0, rs = recibos(), pm = {};
    rs.forEach(function (r) { var m = mesDe(r.data); pm[m] = (pm[m] || 0) + (+r.total || 0); });
    var meses = Object.keys(pm).sort().slice(-12).map(function (m) { return { l: mesBR(m), v: pm[m] }; });
    var este = mesDe(hojeISO()), pc = {};
    rs.filter(function (r) { return mesDe(r.data) === este; }).forEach(function (r) { r.itens.forEach(function (i) { pc[i.cat || 'Outros'] = (pc[i.cat || 'Outros'] || 0) + (+i.total || 0); }); });
    var cats = Object.keys(pc).map(function (c) { return { l: c, v: pc[c] }; }).sort(function (a, b) { return b.v - a.v; });
    var u3 = ultimosMeses(3), pl = {};
    rs.filter(function (r) { return u3.indexOf(mesDe(r.data)) >= 0; }).forEach(function (r) { var n = LN[r.loja] || 'Outro'; pl[n] = (pl[n] || 0) + (+r.total || 0); });
    var lojas = Object.keys(pl).map(function (n) { return { l: n, v: pl[n] }; }).sort(function (a, b) { return b.v - a.v; });
    var mx = function (a) { return Math.max.apply(null, [1].concat(a.map(function (r) { return r.v; }))); };
    return kpis() + '<div class="card"><h2>Orçamento mensal do mercado</h2><div class="grade3" style="grid-template-columns:minmax(0,10em) auto;justify-content:start"><input class="in" type="number" min="0" step="10" inputmode="decimal" id="orc" value="' + esc(orc || '') + '" placeholder="CAD" aria-label="Orçamento mensal em dólares"><button class="btn" id="orc-salvar">Salvar</button></div></div>' +
      '<div class="card"><h2>Por mês</h2>' + barras(meses, Math.max(orc, mx(meses)), orc) + (orc ? '<p class="nota" style="margin-top:8px">Em vermelho, os meses acima de ' + din(orc) + '.</p>' : '') + '</div>' +
      '<div class="card"><h2>Este mês por categoria</h2>' + barras(cats, mx(cats)) + '</div>' +
      '<div class="card"><h2>Por mercado · últimos 3 meses</h2>' + barras(lojas, mx(lojas)) + '</div>' + cartaoFamilia();
  }

  // ── ações ──
  function ligar() {
    qsa('[data-ir]').forEach(function (b) { b.onclick = function () { qsa('#abas button').forEach(function (x) { if (x.dataset.aba === b.dataset.ir) x.click(); }); }; });
    qsa('[data-tirar]').forEach(function (b) { b.onclick = function () { var k = b.dataset.tirar, m = {}; m['produtos/' + k + '/fixo'] = false; gravar(m).then(function () { toast('Tirado da lista'); }); }; });
    qsa('[data-fixar]').forEach(function (b) { b.onclick = function () { var k = b.dataset.fixar, c = catalogo()[k], m = {}; m['produtos/' + k + '/fixo'] = true; m['produtos/' + k + '/pt'] = c.pt; m['produtos/' + k + '/cat'] = c.cat; gravar(m); }; });
    if ($('copiar-lista')) $('copiar-lista').onclick = function () { copiarTexto(textoLista(listaDoMes())); };
    if ($('compartilhar')) $('compartilhar').onclick = function () { compartilharTexto(textoLista(listaDoMes())); };
    qsa('[data-agrupar]').forEach(function (b) { b.onclick = function () { UI.agrupar = b.dataset.agrupar; desenhar(); }; });
    qsa('[data-marcar]').forEach(function (b) { b.onclick = function () { var k = b.dataset.marcar, on = b.getAttribute('aria-pressed') !== 'true', m = {}; m['produtos/' + k + '/marcado'] = on ? mesDe(hojeISO()) : null; m['produtos/' + k + '/pt'] = (catalogo()[k] || {}).pt || k; gravar(m); }; });
    if ($('desmarcar')) $('desmarcar').onclick = function () { var m = {}; listaDoMes().forEach(function (i) { if (i.marcado) m['produtos/' + i.k + '/marcado'] = null; }); gravar(m); };
    qsa('[data-qtd]').forEach(function (b) { b.onclick = function () { editarQtd(b.dataset.qtd); }; });
    if ($('add-nome')) {
      $('add-nome').onchange = function () { var k = chave(this.value), c = catalogo()[k], p = M.produtos[k], d = Object.keys(M.dic).map(function (x) { return M.dic[x]; }).filter(function (x) { return chave(x.pt) === k; })[0]; var cat = (c && c.cat) || (p && p.cat) || (d && d.cat); if (cat) $('add-cat').value = cat; };
      $('add-ok').onclick = function () {
        var nome = $('add-nome').value.trim().slice(0, 80), q = +$('add-qtd').value || 1;
        if (!nome) { $('add-erro').textContent = 'Digite o nome do item.'; return; }
        var k = chave(nome), m = {}, existe = catalogo()[k];
        m['produtos/' + k + '/pt'] = existe ? existe.pt : nome; m['produtos/' + k + '/cat'] = $('add-cat').value; m['produtos/' + k + '/fixo'] = true; m['produtos/' + k + '/qtd'] = q;
        gravar(m).then(function () { toast('Incluído: ' + nome); });
      };
      $('add-nome').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('add-ok').click(); });
    }
    if ($('mb-add')) $('mb-add').onclick = adicionarMembro;
    qsa('[data-mbrm]').forEach(function (b) { b.onclick = function () { if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = 'Confirmar'; return; } removerMembro(b.dataset.mbrm); }; });
    // recibo
    if ($('texto')) $('texto').oninput = function () { UI.texto = this.value; };
    if ($('colar')) $('colar').onclick = function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) { $('texto').focus(); $('r-erro').textContent = 'Toque e segure na caixa abaixo e escolha Colar.'; return; }
      navigator.clipboard.readText().then(function (t) { if (!t.trim()) { $('r-erro').textContent = 'A área de transferência está vazia. Copie o texto do recibo no app Fotos.'; return; } UI.texto = t; lerTexto(); },
        function () { $('texto').focus(); $('r-erro').textContent = 'Toque e segure na caixa abaixo e escolha Colar.'; });
    };
    if ($('ler')) $('ler').onclick = function () { UI.texto = $('texto').value; lerTexto(); };
    if ($('manual')) $('manual').onclick = function () { UI.rev = { loja: 'superstore', data: hojeISO(), total: null, imposto: 0, itens: [{ raw: '', pt: '', cat: 'Mercearia', qtd: 1, un: 0, total: 0 }] }; desenhar(); };
    qsa('[data-ver]').forEach(function (b) { b.onclick = function () { var r = recibos().filter(function (x) { return x.id === b.dataset.ver; })[0]; if (!r) return; UI.rev = JSON.parse(JSON.stringify(r)); desenhar(); window.scrollTo(0, 0); }; });
    if ($('ver-dic')) $('ver-dic').onclick = abrirDic;
    if (UI.rev && $('rv-salvar')) ligarRevisao();
    // preços
    qsa('[data-loja]').forEach(function (b) { b.onclick = function () { editarPreco(b.dataset.k, b.dataset.loja); }; });
    // saudável
    qsa('[data-off]').forEach(function (b) { b.onclick = function () { var k = b.dataset.off, q = qsa('[data-busca]').filter(function (x) { return x.dataset.busca === k; })[0].value.trim(); buscarOFF(k, q); }; });
    qsa('[data-escolher]').forEach(function (b) { b.onclick = function () { escolherOFF(b.dataset.escolher, +b.dataset.j); }; });
    qsa('[data-alt]').forEach(function (b) { b.onclick = function () { alternativas(b.dataset.alt); }; });
    qsa('[data-yuka]').forEach(function (inp) { inp.onchange = function () { var k = inp.dataset.yuka, v = inp.value === '' ? null : Math.max(0, Math.min(100, Math.round(+inp.value))), m = {}; m['produtos/' + k + '/yuka'] = v; m['produtos/' + k + '/pt'] = (catalogo()[k] || {}).pt || k; gravar(m).then(function () { toast('Nota Yuka salva'); }); }; });
    // gastos
    if ($('orc-salvar')) $('orc-salvar').onclick = function () { gravar({ 'ajustes/orcamento': +$('orc').value || 0 }).then(function () { toast('Orçamento salvo'); }); };
  }
  function lerTexto() {
    var t = UI.texto || '';
    if (!t.trim()) { $('r-erro').textContent = 'Cole o texto do recibo primeiro.'; return; }
    var r = Leitor.ler(t);
    if (!r.itens.length) { $('r-erro').textContent = 'Não encontrei itens com preço neste texto. Confira se copiou o recibo inteiro, ou use “Recibo em branco”.'; return; }
    UI.rev = { loja: r.loja, data: r.data || hojeISO(), total: r.total, imposto: r.imposto, emparelhou: r.emparelhou, itens: r.itens.map(itemDoLeitor) };
    desenhar(); window.scrollTo(0, 0);
  }
  function ligarRevisao() {
    var r = UI.rev;
    qsa('[data-f]').forEach(function (inp) {
      inp.oninput = inp.onchange = function () { var it = r.itens[+inp.dataset.i], f = inp.dataset.f; it[f] = (f === 'qtd' || f === 'total') ? +inp.value : inp.value; if (f === 'qtd' || f === 'total') it.un = it.qtd ? Math.round(it.total / it.qtd * 100) / 100 : it.total;
        if (f === 'pt') { var d = Object.keys(M.dic).map(function (k) { return M.dic[k]; }).filter(function (x) { return x.pt === inp.value; })[0]; if (d) { it.cat = d.cat; var s = qsa('select[data-i="' + inp.dataset.i + '"]')[0]; if (s) s.value = d.cat; } } };
      if (inp.dataset.f === 'total') inp.onblur = function () { desenhar(); };
    });
    $('rv-loja').onchange = function () { r.loja = this.value; };
    $('rv-data').onchange = function () { r.data = this.value; };
    $('rv-total').onchange = function () { r.total = this.value === '' ? null : +this.value; desenhar(); };
    $('rv-imp').onchange = function () { r.imposto = +this.value || 0; desenhar(); };
    qsa('[data-rm]').forEach(function (b) { b.onclick = function () { r.itens.splice(+b.dataset.rm, 1); desenhar(); }; });
    $('rv-mais').onclick = function () { r.itens.push({ raw: '', pt: '', cat: 'Mercearia', qtd: 1, un: 0, total: 0 }); desenhar(); };
    $('rv-cancelar').onclick = function () { UI.rev = null; desenhar(); };
    if ($('rv-apagar')) $('rv-apagar').onclick = function () {
      var b = $('rv-apagar'); if (b.dataset.ok !== '1') { b.dataset.ok = '1'; b.textContent = 'Confirmar apagar'; return; }
      var m = {}; m['recibos/' + r.id] = null; gravar(m).then(function () { UI.rev = null; toast('Recibo apagado'); desenhar(); });
    };
    $('rv-salvar').onclick = function () {
      var itens = r.itens.filter(function (i) { return (i.pt || '').trim() && +i.total; });
      if (!itens.length) { $('rv-erro').textContent = 'Nenhum item com nome e valor.'; return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data || '')) { $('rv-erro').textContent = 'Confira a data.'; return; }
      var id = r.id || (r.data + '-' + r.loja + '-' + Math.random().toString(36).slice(2, 7)), m = {};
      var soma = itens.reduce(function (s, i) { return s + i.total; }, 0);
      m['recibos/' + id] = { loja: r.loja, data: r.data, total: r.total == null ? Math.round((soma + (+r.imposto || 0)) * 100) / 100 : +r.total, imposto: +r.imposto || 0, criado: r.criado || Date.now(),
        itens: itens.map(function (i) { return { raw: String(i.raw || '').slice(0, 80), pt: i.pt.trim().slice(0, 80), cat: i.cat, qtd: +i.qtd || 1, un: Math.round((+i.total / (+i.qtd || 1)) * 100) / 100, total: Math.round(+i.total * 100) / 100 }; }) };
      itens.forEach(function (i) {
        if (i.raw) m['dic/' + chave(i.raw)] = { pt: i.pt.trim().slice(0, 80), cat: i.cat };
        var k = chave(i.pt); if (!M.produtos[k] || !M.produtos[k].en) { m['produtos/' + k + '/pt'] = i.pt.trim().slice(0, 80); m['produtos/' + k + '/cat'] = i.cat; if (i.raw) m['produtos/' + k + '/en'] = Leitor.expandir(i.raw).toLowerCase(); }
      });
      $('rv-salvar').disabled = true;
      gravar(m).then(function () { UI.rev = null; UI.texto = ''; toast('Recibo salvo'); desenhar(); }, function () { $('rv-salvar').disabled = false; });
    };
  }
  function editarQtd(k) {
    var c = catalogo()[k], i = listaDoMes().filter(function (x) { return x.k === k; })[0]; if (!c || !i) return;
    var auto = !(+((M.produtos[k] || {}).qtd) > 0);
    abrirFolha('<h3>' + esc(c.pt) + '</h3><p class="nota">' + (auto ? 'A quantidade vem da sua média por mês.' : 'Quantidade definida por você.') + '</p><label class="lb" for="f-qtd">Quantidade no mês</label><input class="in" id="f-qtd" type="number" min="0.1" step="0.1" inputmode="decimal" value="' + esc(i.qtd) + '">' +
      '<div class="grupo-btn" style="margin-top:12px"><button class="btn pri" id="f-ok" style="flex:1">Salvar</button>' + (auto ? '' : '<button class="btn" id="f-auto">Usar a média</button>') + '<button class="btn" id="f-fechar">Cancelar</button></div>');
    $('f-fechar').onclick = fecharFolha;
    var salva = function (v) { var m = {}; m['produtos/' + k + '/qtd'] = v; m['produtos/' + k + '/pt'] = c.pt; gravar(m).then(fecharFolha); };
    $('f-ok').onclick = function () { var v = +$('f-qtd').value; if (v > 0) salva(Math.round(v * 10) / 10); else fecharFolha(); };
    if ($('f-auto')) $('f-auto').onclick = function () { salva(null); };
  }
  // ── família: o dono libera outras contas pelo código delas ──
  function cartaoFamilia() {
    if (!ehDono) return '<div class="card"><h2>Mercado compartilhado</h2><p class="nota" style="margin:0">Você está usando o Mercado da casa, liberado pelo administrador. Tudo o que você incluir, marcar ou salvar aparece para ele também.</p></div>';
    var ms = M.membros || {}, ids = Object.keys(ms);
    return '<div class="card"><h2>Compartilhar com a família</h2><p class="nota">Quem você liberar vê e mexe em tudo do Mercado: lista, preços, recibos e gastos. Para liberar, a pessoa abre <b>minhacasaapp.com/mercado</b>, entra com o e-mail e a senha dela do MinhaCasa e te manda o código que aparece.</p>' +
      (ids.length ? ids.map(function (id) { return '<div class="linha"><div class="info"><div class="t">' + esc(ms[id].nome || 'Sem nome') + '</div><div class="s mono">' + esc(id.slice(0, 10)) + '…</div></div><button class="btn sm" data-mbrm="' + esc(id) + '">Remover</button></div>'; }).join('') : '') +
      '<label class="lb" for="mb-nome">Nome</label><input class="in" id="mb-nome" placeholder="Ex.: Esposa">' +
      '<label class="lb" for="mb-cod">Código que a pessoa te mandou</label><input class="in mono" id="mb-cod" autocapitalize="off" autocomplete="off" spellcheck="false">' +
      '<div class="grupo-btn" style="margin-top:10px"><button class="btn pri" id="mb-add">Liberar acesso</button></div><div class="erro" id="mb-erro"></div></div>';
  }
  function raiz(m) { return F.update(F.ref(DB), m).catch(function (e) { toast('Não salvou: ' + erroTxt(e)); throw e; }); }
  function adicionarMembro() {
    var cod = ($('mb-cod').value.match(/[A-Za-z0-9]{20,40}/) || [''])[0], nome = $('mb-nome').value.trim().slice(0, 40) || 'Família';
    if (!cod) { $('mb-erro').textContent = 'Cole o código completo (são umas 28 letras e números).'; return; }
    if (cod === U.uid) { $('mb-erro').textContent = 'Esse é o seu próprio código.'; return; }
    var m = {}; m['mercadoMembros/' + dono + '/' + cod] = true; m['mercadoDe/' + cod] = dono; m[base + '/membros/' + cod] = { nome: nome, desde: hojeISO() };
    raiz(m).then(function () { toast('Acesso liberado para ' + nome); });
  }
  function removerMembro(cod) {
    var m = {}; m['mercadoMembros/' + dono + '/' + cod] = null; m['mercadoDe/' + cod] = null; m[base + '/membros/' + cod] = null;
    raiz(m).then(function () { toast('Acesso removido'); });
  }
  function abrirDic() {
    var ks = Object.keys(M.dic).sort(function (a, b) { return M.dic[a].pt.localeCompare(M.dic[b].pt); });
    abrirFolha('<h3>Nomes aprendidos</h3><p class="nota">Código do recibo → seu nome. Apague um para o app perguntar de novo.</p>' + ks.map(function (k) { return '<div class="linha"><div class="info"><div class="t" style="font-size:14px">' + esc(M.dic[k].pt) + '</div><div class="s mono">' + esc(k.replace(/-/g, ' ').toUpperCase()) + ' · ' + esc(M.dic[k].cat) + '</div></div><button class="btn sm" data-dicrm="' + esc(k) + '">Apagar</button></div>'; }).join('') + '<button class="btn cheio" id="f-fechar" style="margin-top:12px">Fechar</button>');
    $('f-fechar').onclick = fecharFolha;
    qsa('[data-dicrm]').forEach(function (b) { b.onclick = function () { var m = {}; m['dic/' + b.dataset.dicrm] = null; gravar(m).then(function () { b.closest('.linha').remove(); }); }; });
  }
  function editarPreco(k, loja) {
    var c = catalogo()[k]; if (!c) return;
    var p = M.produtos[k] || {}, atual = p.precos && p.precos[loja], l = LOJAS.filter(function (x) { return x.id === loja; })[0];
    var termo = encodeURIComponent((p.en || c.pt).slice(0, 60));
    abrirFolha('<h3>' + esc(c.pt) + '</h3><p class="nota">' + esc(l.l) + '</p>' +
      '<label class="lb" for="f-preco">Preço (CAD), mesma embalagem</label><input class="in" id="f-preco" type="number" step="0.01" min="0" inputmode="decimal" value="' + esc(atual ? atual.p : '') + '">' +
      '<label class="lb" for="f-fonte">De onde</label><select class="in" id="f-fonte">' + ['folheto', 'Flipp', 'site', 'prateleira'].map(function (f) { return '<option' + (atual && atual.fonte === f ? ' selected' : '') + '>' + f + '</option>'; }).join('') + '</select>' +
      (l.busca ? '<p class="nota" style="margin-top:10px"><a href="' + l.busca + termo + '" target="_blank" rel="noopener">Procurar no site da ' + esc(l.n) + '</a></p>' : '') +
      '<div class="grupo-btn" style="margin-top:12px"><button class="btn pri" id="f-ok" style="flex:1">Salvar</button>' + (atual ? '<button class="btn" id="f-apagar">Apagar</button>' : '') + '<button class="btn" id="f-fechar">Cancelar</button></div>');
    setTimeout(function () { if ($('f-preco')) $('f-preco').focus(); }, 60);
    $('f-fechar').onclick = fecharFolha;
    var salva = function (v) { var m = {}; m['produtos/' + k + '/precos/' + loja] = v; m['produtos/' + k + '/pt'] = c.pt; gravar(m).then(function () { fecharFolha(); toast('Preço salvo'); }); };
    $('f-ok').onclick = function () { var v = parseFloat($('f-preco').value); if (!(v > 0)) { fecharFolha(); return; } salva({ p: Math.round(v * 100) / 100, data: hojeISO(), fonte: $('f-fonte').value }); };
    if ($('f-apagar')) $('f-apagar').onclick = function () { salva(null); };
  }
  // ── Open Food Facts (gratuito; até 10 buscas por minuto) ──
  var OFF = 'https://world.openfoodfacts.org';
  var CAMPOS = 'code,product_name,brands,quantity,nutriscore_grade,nova_group,categories_tags';
  function pedirOFF(url) { return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { if (r.status === 429) throw { code: 'limite' }; if (!r.ok) throw { code: 'http' }; return r.json(); }); }
  function falhaOFF(k, e) { UI.off[k] = Object.assign(UI.off[k] || {}, { lista: null, msg: e && e.code === 'limite' ? 'O Open Food Facts limita a 10 buscas por minuto. Espere um pouco e tente de novo.' : 'O Open Food Facts não respondeu agora (ele é gratuito e às vezes fica lento). Tente de novo em instantes.' }); desenhar(); }
  function buscarOFF(k, q) {
    if (!q) return;
    UI.off[k] = { q: q, msg: 'Buscando…' }; desenhar();
    pedirOFF(OFF + '/cgi/search.pl?search_terms=' + encodeURIComponent(q) + '&search_simple=1&action=process&json=1&page_size=6&tagtype_0=countries&tag_contains_0=contains&tag_0=canada&fields=' + CAMPOS)
      .then(function (d) { UI.off[k] = { q: q, lista: (d.products || []).slice(0, 6) }; desenhar(); }, function (e) { falhaOFF(k, e); });
  }
  function escolherOFF(k, j) {
    var x = UI.off[k] && UI.off[k].lista && UI.off[k].lista[j]; if (!x) return;
    var tags = x.categories_tags || [], m = {};
    m['produtos/' + k + '/off'] = { code: String(x.code || ''), nome: String(x.product_name || '').slice(0, 80), marca: String(x.brands || '').slice(0, 60), ns: String(x.nutriscore_grade || '').slice(0, 1), nova: x.nova_group || null, cat: String(tags[tags.length - 1] || '').slice(0, 80) };
    m['produtos/' + k + '/pt'] = (catalogo()[k] || {}).pt || k;
    gravar(m).then(function () { UI.off[k] = null; desenhar(); });
  }
  function alternativas(k) {
    var o = (M.produtos[k] || {}).off; if (!o || !o.cat) return;
    var atual = 'abcde'.indexOf(o.ns || 'e'); if (atual < 0) atual = 4;
    var notas = 'abcde'.slice(0, Math.max(1, atual)).split('').join('|') || 'a';
    UI.off[k] = { msg: 'Procurando opções melhores…' }; desenhar();
    pedirOFF(OFF + '/api/v2/search?categories_tags=' + encodeURIComponent(o.cat) + '&countries_tags_en=canada&nutrition_grades_tags=' + encodeURIComponent(notas) + '&sort_by=popularity_key&page_size=8&fields=' + CAMPOS)
      .then(function (d) {
        var alts = (d.products || []).filter(function (x) { return x.product_name && String(x.code) !== o.code; }).slice(0, 4).map(function (x) { return { code: String(x.code || ''), nome: String(x.product_name).slice(0, 80), marca: String(x.brands || '').slice(0, 60), qtd: String(x.quantity || '').slice(0, 30), ns: String(x.nutriscore_grade || '').slice(0, 1), nova: x.nova_group || null }; });
        if (!alts.length) { UI.off[k] = { msg: atual === 0 ? 'Este já é Nutri-Score A. Boa escolha!' : 'Não achei opções melhores nesta categoria vendidas no Canadá.' }; desenhar(); return; }
        var m = {}; m['produtos/' + k + '/alts'] = alts; gravar(m).then(function () { UI.off[k] = null; desenhar(); });
      }, function (e) { falhaOFF(k, e); });
  }
};
