// ─────────────────────────────────────────────────────────────
// Minha Casa — leitura de extratos bancários (OFX/QFX e CSV)
//
// Tudo roda no aparelho da pessoa: o arquivo do banco nunca é enviado
// para o servidor. Entende o padrão brasileiro (dd/mm/aaaa, 1.234,56,
// separador ";", acentos em Latin-1) e o canadense/americano
// (aaaa-mm-dd, 1,234.56, separador ",").
//
// window.MCBanco.ler(texto, opcoes) → { formato, linhas, transacoes, mapa, aviso }
//   transacoes: [{ data:'aaaa-mm-dd', desc, valor (>0), tipo:'debito'|'credito' }]
// ─────────────────────────────────────────────────────────────
(function (raiz) {
  'use strict';

  // Lista de bancos. "como" = passo a passo mostrado no app (os nomes dos menus mudam com o tempo).
  var BANCOS = [
    { id: 'nubank', pais: 'BR', nome: 'Nubank', formato: 'OFX ou CSV', como: ['No app do Nubank, toque no saldo da conta.', 'Toque em "Exportar extrato" (ou "Pedir extrato").', 'Escolha o período e o formato OFX (ou CSV).', 'Receba por e-mail ou salve no celular e escolha o arquivo aqui.'] },
    { id: 'itau', pais: 'BR', nome: 'Itaú', formato: 'OFX', como: ['Entre no Internet Banking do Itaú.', 'Vá em Conta corrente > Consultar extrato por período.', 'Escolha o período e salve em OFX.'] },
    { id: 'bradesco', pais: 'BR', nome: 'Bradesco', formato: 'OFX', como: ['Entre no Internet Banking do Bradesco.', 'Abra o Extrato da conta e escolha o período.', 'Use a opção de salvar ou exportar em OFX.'] },
    { id: 'bb', pais: 'BR', nome: 'Banco do Brasil', formato: 'OFX', como: ['Entre no Internet Banking do Banco do Brasil.', 'Abra o Extrato da conta corrente e escolha o período.', 'Use a opção de salvar em OFX (Money).'] },
    { id: 'caixa', pais: 'BR', nome: 'Caixa', formato: 'OFX', como: ['Entre no Internet Banking da Caixa.', 'Abra o Extrato e escolha o período.', 'Use a opção de salvar em OFX.'] },
    { id: 'santander', pais: 'BR', nome: 'Santander', formato: 'OFX', como: ['Entre no Internet Banking do Santander.', 'Vá em Conta Corrente > Extrato (Money).', 'Escolha o período e salve em OFX.'] },
    { id: 'inter', pais: 'BR', nome: 'Inter', formato: 'OFX', como: ['Entre na sua conta do Inter.', 'Vá em Conta Digital > Extrato.', 'Toque em Exportar e escolha OFX.'] },
    { id: 'c6', pais: 'BR', nome: 'C6 Bank', formato: 'OFX ou CSV', como: ['No app do C6, abra o Extrato.', 'Use a opção de exportar ou compartilhar o extrato.', 'Escolha OFX ou CSV, se disponível.'] },
    { id: 'cibc', pais: 'CA', nome: 'CIBC', formato: 'CSV', como: ['Entre no CIBC Online Banking pelo site cibc.com (no celular, peça o "site para computador").', 'Na página inicial, em "More", escolha "Download Transactions".', 'Escolha o cartão ou a conta, o período e o formato CSV.', 'Clique em "Download Transactions" e escolha o arquivo aqui.'] },
    { id: 'rbc', pais: 'CA', nome: 'RBC', formato: 'CSV ou OFX', como: ['Entre no RBC Online Banking pelo site.', 'Procure a opção de baixar transações (Download Transactions).', 'Escolha a conta, o período e CSV ou OFX.'] },
    { id: 'td', pais: 'CA', nome: 'TD', formato: 'CSV ou OFX', como: ['Entre no EasyWeb pelo site.', 'Abra a conta ou o cartão e procure "Download".', 'Escolha o período e CSV ou OFX.'] },
    { id: 'scotia', pais: 'CA', nome: 'Scotiabank', formato: 'CSV', como: ['Entre no Scotia OnLine pelo site.', 'Abra a conta ou o cartão e procure a opção de baixar transações.', 'Escolha o período e CSV.'] },
    { id: 'bmo', pais: 'CA', nome: 'BMO', formato: 'CSV ou OFX', como: ['Entre no BMO Online Banking pelo site.', 'Abra a conta ou o cartão e procure "Download transactions".', 'Escolha o período e CSV ou OFX.'] },
    { id: 'desjardins', pais: 'CA', nome: 'Desjardins', formato: 'CSV ou OFX', como: ['Entre no AccèsD pelo site.', 'Abra a conta e procure a opção de exportar transações.', 'Escolha o período e CSV ou OFX.'] },
    { id: 'outro', pais: '', nome: 'Outro banco', formato: 'OFX ou CSV', como: ['Entre no site ou app do seu banco.', 'Abra o extrato (ou a fatura) e escolha o período.', 'Procure "Exportar", "Baixar" ou "Salvar" e escolha OFX (melhor) ou CSV.', 'Se o app não reconhecer as colunas sozinho, ele pergunta qual é qual e guarda a resposta.'] }
  ];

  // ── números: "1.234,56" · "1,234.56" · "-12,50" · "(12.50)" · "R$ 12,50" · "12,50 D" ──
  function numero(s) {
    if (s == null) return NaN;
    s = String(s).trim();
    if (!s) return NaN;
    var neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (/\s*[Dd]$/.test(s) && /\d/.test(s)) { neg = true; s = s.replace(/\s*[Dd]$/, ''); }
    else if (/\s*[Cc]$/.test(s) && /\d/.test(s)) { s = s.replace(/\s*[Cc]$/, ''); }
    s = s.replace(/[^\d,.\-+]/g, '');
    if (/^-|-$/.test(s)) { neg = !neg; s = s.replace(/-/g, ''); }
    s = s.replace(/^\+/, '');
    if (!/\d/.test(s)) return NaN;
    var ip = s.lastIndexOf('.'), iv = s.lastIndexOf(',');
    if (ip >= 0 && iv >= 0) {
      s = iv > ip ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (iv >= 0) {
      // só vírgula: decimal se tiver 1 ou 2 dígitos depois da última; senão é milhar
      s = /,\d{1,2}$/.test(s) && s.split(',').length === 2 ? s.replace(',', '.') : s.replace(/,/g, '');
    } else if (ip >= 0 && s.split('.').length > 2) {
      s = s.replace(/\./g, '');   // 1.234.567 → milhar
    }
    var n = parseFloat(s);
    return isNaN(n) ? NaN : (neg ? -n : n);
  }

  // ── datas: aaaa-mm-dd · aaaa/mm/dd · dd/mm/aaaa · mm/dd/aaaa · dd-mm-aa · aaaammdd ──
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function montar(a, m, d) {
    a = +a; m = +m; d = +d;
    if (a < 100) a += 2000;
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31 && a > 1990 && a < 2100)) return null;
    return a + '-' + pad(m) + '-' + pad(d);
  }
  function partesData(s) {
    s = String(s || '').trim();
    var m;
    if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return { iso: montar(m[1], m[2], m[3]) };
    if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/))) return { p1: +m[1], p2: +m[2], a: m[3] };
    if ((m = s.match(/^(\d{4})(\d{2})(\d{2})/))) return { iso: montar(m[1], m[2], m[3]) };
    var mes = { jan: 1, fev: 2, feb: 2, mar: 3, abr: 4, apr: 4, mai: 5, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, out: 10, oct: 10, nov: 11, dez: 12, dec: 12 };
    if ((m = s.match(/^(\d{1,2})[\s\-\/]([A-Za-zçÇ]{3})[a-z]*\.?[\s\-\/,]+(\d{2,4})/)) && mes[m[2].toLowerCase()]) return { iso: montar(m[3], mes[m[2].toLowerCase()], m[1]) };
    if ((m = s.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/)) && mes[m[1].toLowerCase()]) return { iso: montar(m[3], mes[m[1].toLowerCase()], m[2]) };
    return null;
  }
  function pareceData(s) { var p = partesData(s); return !!(p && (p.iso || (p.p1 && p.p2))); }
  // ordem 'dmy' (Brasil) ou 'mdy' (EUA); descobre pela coluna inteira quando possível
  function ordemDatas(valores, padrao) {
    var dmy = false, mdy = false;
    valores.forEach(function (v) { var p = partesData(v); if (p && !p.iso) { if (p.p1 > 12) dmy = true; if (p.p2 > 12) mdy = true; } });
    if (dmy && !mdy) return 'dmy';
    if (mdy && !dmy) return 'mdy';
    return padrao || 'dmy';
  }
  function data(s, ordem) {
    var p = partesData(s);
    if (!p) return null;
    if (p.iso) return p.iso;
    return ordem === 'mdy' ? montar(p.a, p.p1, p.p2) : montar(p.a, p.p2, p.p1);
  }

  // ── texto: tira acentos quebrados de Latin-1 lido como UTF-8 não dá para desfazer aqui;
  //    por isso a tela lê o arquivo primeiro como UTF-8 e, se aparecer "�", relê como Latin-1. ──
  function limpar(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

  // ═════════════ OFX / QFX (SGML antigo ou XML) ═════════════
  function eOFX(t) { return /<OFX>|OFXHEADER|<STMTTRN>/i.test(t); }
  function tag(bloco, nome) {
    var m = bloco.match(new RegExp('<' + nome + '>([^<\\r\\n]*)', 'i'));
    return m ? m[1].trim() : '';
  }
  function lerOFX(t) {
    var partes = t.split(/<STMTTRN>/i).slice(1), out = [];
    var cartao = /<CREDITCARDMSGSRSV1>|<CCSTMTRS>/i.test(t);
    partes.forEach(function (b) {
      b = b.split(/<\/STMTTRN>/i)[0];
      var v = numero(tag(b, 'TRNAMT')), d = data(tag(b, 'DTPOSTED') || tag(b, 'DTUSER'));
      if (isNaN(v) || !d) return;
      var tipo = (tag(b, 'TRNTYPE') || '').toUpperCase();
      var desc = limpar(tag(b, 'MEMO') || tag(b, 'NAME') || tag(b, 'PAYEE'));
      if (tag(b, 'NAME') && tag(b, 'MEMO') && tag(b, 'NAME') !== tag(b, 'MEMO')) desc = limpar(tag(b, 'NAME') + ' · ' + tag(b, 'MEMO'));
      out.push({ data: d, desc: desc, bruto: v, tipoOfx: tipo, id: tag(b, 'FITID') });
    });
    // No padrão OFX o gasto é negativo. Alguns bancos mandam tudo positivo e indicam pelo TRNTYPE.
    var temNeg = out.some(function (x) { return x.bruto < 0; });
    out.forEach(function (x) {
      var debito = temNeg ? x.bruto < 0 : (x.tipoOfx === 'DEBIT' || x.tipoOfx === 'PAYMENT' || x.tipoOfx === 'POS' || x.tipoOfx === 'FEE' || x.tipoOfx === 'SRVCHG' || (cartao && x.tipoOfx !== 'CREDIT'));
      x.tipo = debito ? 'debito' : 'credito';
      x.valor = Math.abs(x.bruto);
    });
    return { formato: 'OFX', transacoes: out };
  }

  // ═════════════ CSV ═════════════
  function separador(t) {
    var amostra = t.split(/\r?\n/).slice(0, 15).join('\n'), melhor = ',', n = -1;
    [';', ',', '\t', '|'].forEach(function (s) {
      var k = 0, aspas = false;
      for (var i = 0; i < amostra.length; i++) { var ch = amostra[i]; if (ch === '"') aspas = !aspas; else if (ch === s && !aspas) k++; }
      if (k > n) { n = k; melhor = s; }
    });
    return melhor;
  }
  function linhasCSV(t, sep) {
    var rows = [], row = [], campo = '', aspas = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      if (aspas) {
        if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
        else campo += ch;
      } else if (ch === '"') aspas = true;
      else if (ch === sep) { row.push(campo); campo = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && t[i + 1] === '\n') i++;
        row.push(campo); campo = '';
        if (row.some(function (c) { return c.trim() !== ''; })) rows.push(row);
        row = [];
      } else campo += ch;
    }
    row.push(campo);
    if (row.some(function (c) { return c.trim() !== ''; })) rows.push(row);
    return rows.map(function (r) { return r.map(function (c) { return c.trim(); }); });
  }
  function eNum(s) { return s !== '' && !isNaN(numero(s)) && !pareceData(s) && /^[\s(+\-]*(R\$|\$|CA\$|US\$)?\s*[\d.,]+\s*\)?\s*[DdCc]?$/.test(s); }

  // Descobre as colunas sozinho. Devolve mapa {data, desc, valor | debito+credito, inicio, ordem, sinal}
  function adivinhar(rows, banco) {
    var nCol = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    var corpo = rows.slice(0, 60);
    // linha de cabeçalho: a primeira sem nenhuma data
    var inicio = 0;
    while (inicio < Math.min(rows.length, 10) && !rows[inicio].some(pareceData)) inicio++;
    if (inicio >= Math.min(rows.length, 10)) inicio = 0;
    var cab = inicio > 0 ? rows[inicio - 1].map(function (c) { return c.toLowerCase(); }) : [];
    corpo = rows.slice(inicio, inicio + 60);
    var est = [];
    for (var c = 0; c < nCol; c++) {
      var vals = corpo.map(function (r) { return r[c] || ''; }), cheios = vals.filter(function (v) { return v !== ''; });
      est.push({
        c: c, cheios: cheios.length,
        datas: cheios.filter(pareceData).length,
        nums: cheios.filter(eNum).length,
        texto: cheios.filter(function (v) { return /[A-Za-zÀ-ú]{3}/.test(v) && !pareceData(v); }).length,
        tam: cheios.reduce(function (s, v) { return s + v.length; }, 0) / (cheios.length || 1),
        neg: cheios.filter(function (v) { return eNum(v) && numero(v) < 0; }).length,
        dist: cheios.filter(function (v, i, a) { return a.indexOf(v) === i; }).length / (cheios.length || 1),
        nome: cab[c] || ''
      });
    }
    function porNome(re) { var e = est.filter(function (x) { return re.test(x.nome); })[0]; return e ? e.c : -1; }
    var m = { inicio: inicio };
    // data
    m.data = porNome(/^(data|date|dt|transaction date|data lan|data da transa|data de lan)/);
    if (m.data < 0) { var ds = est.slice().sort(function (a, b) { return b.datas - a.datas; }); m.data = ds[0] && ds[0].datas ? ds[0].c : -1; }
    // valores
    var deb = porNome(/(d[ée]bito|debit|sa[íi]da|withdraw)/), cred = porNome(/(cr[ée]dito|credit|entrada|deposit)/);
    var ident = /(account|conta|card|cart[ãa]o|n[uú]mero|number|item|cheque|ref|#)/;
    var numCols = est.filter(function (x) { return x.c !== m.data && x.nums >= Math.max(1, x.cheios * 0.8) && x.cheios > 0 && !(x.nome && ident.test(x.nome) && !/amount|valor|montant/.test(x.nome)); });
    // descarta coluna de saldo
    var saldo = porNome(/(saldo|balance)/);
    numCols = numCols.filter(function (x) { return x.c !== saldo; });
    if (deb >= 0 && cred >= 0) { m.debito = deb; m.credito = cred; }
    else {
      var val = porNome(/^(valor|amount|montante|value|quantia)|transaction amount|montant|^cad\$|^r\$/);
      if (val >= 0) m.valor = val;
      else if (numCols.length >= 2) {
        // duas colunas que se completam (uma vazia quando a outra tem valor) = débito e crédito (ex.: CIBC)
        var a = numCols[0], b = numCols[1], comp = corpo.every(function (r) { return !((r[a.c] || '') !== '' && (r[b.c] || '') !== ''); });
        if (comp) { m.debito = a.c; m.credito = b.c; } else m.valor = a.c;
      } else if (numCols.length === 1) m.valor = numCols[0].c;
    }
    // descrição: coluna de texto mais longa, fora data/valores; cartão mascarado (5268****8553) não conta
    var usadas = [m.data, m.valor, m.debito, m.credito];
    var dsc = porNome(/(descri|hist[óo]rico|description|estabelecimento|title|t[íi]tulo|lan[çc]amento|memo|payee|merchant)/);
    if (dsc < 0 || usadas.indexOf(dsc) >= 0) {
      var tx = est.filter(function (x) { return usadas.indexOf(x.c) < 0 && x.texto > 0; }).sort(function (p, q) { return q.texto * q.tam * (0.3 + q.dist) - p.texto * p.tam * (0.3 + p.dist); }); // nome da loja varia; "PURCHASE" se repete
      dsc = tx[0] ? tx[0].c : -1;
    }
    m.desc = dsc;
    m.ordem = ordemDatas(corpo.map(function (r) { return r[m.data]; }), banco && banco.pais === 'CA' ? 'mdy' : 'dmy');
    // sinal dos gastos quando há uma coluna só: se a maioria é negativa, gasto = negativo (extrato de conta);
    // se quase tudo é positivo, gasto = positivo (fatura de cartão, ex.: Nubank cartão)
    if (m.valor != null && m.valor >= 0) {
      var e2 = est[m.valor];
      m.sinal = e2.neg >= e2.nums / 2 ? 'negativo' : 'positivo';
      // pagamento da fatura ("PAYMENT", "PAGAMENTO", "MERCI") é sempre entrada: o sinal dele decide (20/11/2026)
      if (m.desc >= 0) {
        var pg = corpo.filter(function (r) { return /payment.{0,12}(received|thank)|thank you|merci|paiement re[çc]u|pagamento recebido|pagamento da fatura|pagto\.? fatura/i.test(r[m.desc] || '') && eNum(r[m.valor] || ''); });
        if (pg.length) { var pn = pg.filter(function (r) { return numero(r[m.valor]) < 0; }).length; m.sinal = pn > pg.length / 2 ? 'positivo' : 'negativo'; }
      }
    }
    return m;
  }

  function aplicar(rows, m) {
    var out = [];
    rows.slice(m.inicio || 0).forEach(function (r) {
      var d = data(r[m.data], m.ordem);
      if (!d) return;
      var v, tipo;
      if (m.debito != null && m.debito >= 0) {
        var dv = numero(r[m.debito]), cv = numero(r[m.credito]);
        if (!isNaN(dv) && dv !== 0) { v = Math.abs(dv); tipo = dv < 0 ? 'credito' : 'debito'; }
        else if (!isNaN(cv) && cv !== 0) { v = Math.abs(cv); tipo = 'credito'; }
        else return;
      } else {
        var x = numero(r[m.valor]);
        if (isNaN(x) || x === 0) return;
        v = Math.abs(x);
        tipo = (m.sinal === 'positivo') === (x > 0) ? 'debito' : 'credito';
      }
      out.push({ data: d, desc: limpar(m.desc >= 0 ? r[m.desc] : ''), valor: Math.round(v * 100) / 100, tipo: tipo });
    });
    return out;
  }

  function ler(texto, op) {
    op = op || {};
    texto = String(texto || '').replace(/^﻿/, '');
    if (eOFX(texto)) {
      var o = lerOFX(texto);
      o.transacoes.forEach(function (x) { x.valor = Math.round(x.valor * 100) / 100; });
      return { formato: 'OFX', transacoes: o.transacoes, linhas: null, mapa: null, aviso: o.transacoes.length ? '' : 'Não encontrei lançamentos no arquivo OFX.' };
    }
    var sep = separador(texto), rows = linhasCSV(texto, sep);
    if (!rows.length) return { formato: 'CSV', transacoes: [], linhas: [], mapa: null, aviso: 'O arquivo está vazio.' };
    var mapa = op.mapa || adivinhar(rows, op.banco);
    var ok = mapa.data >= 0 && (mapa.valor >= 0 || mapa.debito >= 0);
    var trs = ok ? aplicar(rows, mapa) : [];
    return { formato: 'CSV', separador: sep, linhas: rows, mapa: mapa, transacoes: trs,
      aviso: !ok ? 'Não consegui descobrir sozinho as colunas de data e valor.' : (!trs.length ? 'Não encontrei lançamentos com data e valor.' : '') };
  }

  // ═════════════ conferência: banco × app ═════════════
  // banco: débitos [{data, desc, valor}]; app: [{id, data, valor, ...}]
  // Pares um-para-um, em passes: mesmo valor e dia → mesmo valor até ±7 dias (lançamento feito dias depois da compra) → centavos diferentes (até 1,00) até ±2 dias.
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 864e5); }
  function conferir(banco, app, op) {
    op = op || {};
    var B = banco.map(function (x, i) { return { i: i, x: x, par: null }; });
    var A = app.map(function (x) { return { x: x, usado: false }; });
    function passo(cond, status) {
      B.forEach(function (b) {
        if (b.par) return;
        var melhor = null, dist = 1e9;
        A.forEach(function (a) {
          if (a.usado || !cond(b.x, a.x)) return;
          var dd = Math.abs(dias(b.x.data, a.x.data)) * 100 + Math.abs(b.x.valor - a.x.valor) * 100;
          if (dd < dist) { dist = dd; melhor = a; }
        });
        if (melhor) { melhor.usado = true; b.par = { app: melhor.x, status: status }; }
      });
    }
    var cents = function (v) { return Math.round(v * 100); };
    passo(function (b, a) { return cents(b.valor) === cents(a.valor) && b.data === a.data; }, 'ok');
    passo(function (b, a) { return cents(b.valor) === cents(a.valor) && Math.abs(dias(b.data, a.data)) <= (op.janela || 7); }, 'data');
    passo(function (b, a) { var df = Math.abs(cents(b.valor) - cents(a.valor)); return df > 0 && df <= 100 && df <= cents(b.valor) * 0.05 && Math.abs(dias(b.data, a.data)) <= 2; }, 'valor');
    var ini = op.inicio || banco.reduce(function (m, x) { return !m || x.data < m ? x.data : m; }, null);
    var fim = op.fim || banco.reduce(function (m, x) { return !m || x.data > m ? x.data : m; }, null);
    return {
      inicio: ini, fim: fim,
      linhas: B.map(function (b) { return { banco: b.x, app: b.par ? b.par.app : null, status: b.par ? b.par.status : 'falta' }; }),
      soApp: A.filter(function (a) { return !a.usado && ini && a.x.data >= ini && a.x.data <= fim; }).map(function (a) { return a.x; })
    };
  }

  // ── Devoluções (16/11/2026) ──
  // Nome da loja numa descrição de extrato: primeira palavra que diz algo ("WINNERS #213 MONCTON NB" → WINNERS).
  var VAZIAS = /^(ESTORNO|ESTORNADO|REFUND|RETURN|RETURNS|CREDIT|CREDITO|VOUCHER|DEVOLUCAO|DEVOL|REEMBOLSO|REMBOURSEMENT|REMB|COMPRA|COMPRAS|PURCHASE|POS|DEB|DEBITO|CARTAO|CARD|VISA|MASTERCARD|MC|ELO|PAG|PAGTO|SQ|SQU|TST|THE|LES|DE|DO|DA|DOS|DAS|E|EM|NO|NA|LOJA|LOJAS|INC|LTD|LTDA|SA|ME|EIRELI|CO|COM|WWW|HTTP|HTTPS)$/;
  function palavras(t) {
    return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim().split(' ')
      .filter(function (w) { return w.length >= 3 && !/^\d+$/.test(w) && !VAZIAS.test(w); });
  }
  function loja(t) { return palavras(t)[0] || ''; }
  function mesmaLoja(a, b) {
    var la = loja(a), lb = loja(b); if (!la || !lb) return false;
    if (la === lb) return true;
    var pa = palavras(a), pb = palavras(b);
    return pb.indexOf(la) >= 0 || pa.indexOf(lb) >= 0 || (la.length >= 5 && lb.length >= 5 && (la.indexOf(lb) === 0 || lb.indexOf(la) === 0));
  }
  // Crédito que NÃO é devolução: pagamento da fatura, salário, transferência, juros, cashback…
  var NAO_DEV = /PAYMENT|PAIEMENT|PAGAMENTO|PAGTO|PGTO|PAG FATURA|FATURA|THANK YOU|MERCI|TRANSFER|TRANSF|VIREMENT|E TRANSFER|INTERAC|\bTED\b|\bDOC\b|\bPIX\b|SALARIO|PAYROLL|PAIE|DEPOSIT|DEPOSITO|DEPOT|INTEREST|INTERET|JUROS|RENDIMENTO|CASHBACK|REWARD|RECOMPENSA|BONUS|RESGATE|APLICACAO|DIVIDEND|SAQUE/;
  var E_DEV = /ESTORNO|ESTORNADO|REFUND|RETURN|REMBOURSEMENT|DEVOLUCAO|DEVOL|REEMBOLSO|CREDIT VOUCHER|CHARGEBACK|CANCELAMENTO|CANCELAD/;
  // credito: {desc, data, valor}; outras: lista de {desc} (débitos do extrato e compras do app)
  function pareceDevolucao(credito, outras) {
    var d = String(credito.desc || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ');
    if (E_DEV.test(d)) return true;
    if (NAO_DEV.test(d)) return false;
    return (outras || []).some(function (o) { return mesmaLoja(credito.desc, o.desc); });
  }

  // Qual banco é este arquivo? Pelo OFX (ORG/FID), por cabeçalhos típicos ou pelo nome do arquivo (20/11/2026).
  // Não olha a descrição das compras (uma loja "Scotiabank Arena" enganaria). Sem certeza, devolve ''.
  function detectarBanco(texto, nome) {
    var t = String(texto || '').slice(0, 4000), n = String(nome || '').toLowerCase(), cab = '';
    if (eOFX(t)) cab = (((/<ORG>\s*([^<\r\n]+)/i.exec(t) || [])[1] || '') + ' ' + ((/<FID>\s*([^<\r\n]+)/i.exec(t) || [])[1] || '')).toUpperCase();
    else cab = (t.split(/\r?\n/).slice(0, 8).filter(function (l) { return !/\d{1,4}[\/.-]\d{1,2}[\/.-]\d{2,4}/.test(l); }).join(' | ')).toUpperCase();
    var L = [
      ['desjardins', /DESJARDINS/, /desjardins/], ['cibc', /\bCIBC\b/, /cibc/], ['rbc', /ROYAL BANK|\bRBC\b|DESCRIPTION 1"?\s*,/, /\brbc|^csv\d/],
      ['td', /\bTD\b|TORONTO-DOMINION/, /^td[\s_-]|accountactivity/], ['scotia', /SCOTIA/, /scotia/], ['bmo', /\bBMO\b|BANK OF MONTREAL|ITEM #|CARD #/, /bmo/],
      ['nubank', /NUBANK|NU PAGAMENTOS/, /nubank|^nu_/], ['itau', /ITA[UÚ]/, /ita[uú]/], ['bradesco', /BRADESCO/, /bradesco/], ['bb', /BANCO DO BRASIL/, /bancodobrasil|banco_do_brasil/],
      ['caixa', /CAIXA ECON/, /caixa/], ['santander', /SANTANDER/, /santander/], ['inter', /BANCO INTER\b/, /bancointer|banco_inter/], ['c6', /C6 BANK/, /c6bank|c6_bank/]
    ];
    for (var i = 0; i < L.length; i++) if ((cab && L[i][1].test(cab)) || L[i][2].test(n)) return BANCOS.some(function (b) { return b.id === L[i][0]; }) ? L[i][0] : '';
    // CIBC sem cabeçalho: aaaa-mm-dd, descrição, débito, crédito, cartão mascarado
    if (/^\d{4}-\d{2}-\d{2},.*,\d{4}\*{4,}\d{4}\s*$/m.test(t.split(/\r?\n/)[0] || '')) return 'cibc';
    return '';
  }

  raiz.MCBanco = { detectarBanco: detectarBanco, loja: loja, mesmaLoja: mesmaLoja, pareceDevolucao: pareceDevolucao, BANCOS: BANCOS, ler: ler, adivinhar: adivinhar, aplicar: aplicar, numero: numero, data: data, ordemDatas: ordemDatas, conferir: conferir, linhasCSV: linhasCSV, separador: separador };
})(typeof window !== 'undefined' ? window : globalThis);
