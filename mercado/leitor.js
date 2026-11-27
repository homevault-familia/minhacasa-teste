// Leitor de texto de recibo (Texto ao Vivo do iPhone). Sem rede, sem custo.
// Usado pela página /mercado e pelos testes (node).
var Leitor = (function () {
  var LOJAS = [
    ['nofrills', /NO\s*FRILLS|NOFRILLS/],
    ['superstore', /SUPERSTORE|SUPER\s*STORE|LOBLAW/],
    ['walmart', /WAL[\s\-*]?MART/],
    ['sobeys', /SOBEYS/],
    ['costco', /COSTCO/],
    ['gianttiger', /GIANT\s*TIGER/],
    ['outro', /FOODLAND|CO-?OP|SAVE\s*EASY|SHOPPERS/]
  ];
  var PULAR = /(SUB\s*-?\s*TOTAL|\bTOTAL\b|\bHST\b|\bGST\b|\bPST\b|\bTAX|\bTVH|CHANGE|\bCASH\b|VISA|MASTER\s*CARD|\bDEBIT|INTERAC|AMEX|CREDIT|BALANCE|POINTS|OPTIMUM|SCENE\+?|AUTH|APPROV|ACCOUNT|\bCARD\b|TERMINAL|\bREF\b|INVOICE|TRANS(ACTION)?\b|CASHIER|\bTEL\b|PHONE|THANK|MERCI|ITEMS?\s*SOLD|NUMBER OF ITEMS|TENDER|AMOUNT|YOU SAVED|TOTAL SAVINGS|SAVINGS|REWARDS|MEMBER|RECEIPT|SURVEY|WWW\.|\.COM|\.CA\b|STORE\s*#|ST#|OP#|TE#|TR#|CUSTOMER COPY|SIGNATURE|AID:|TVR|RETAIN|HAVE A|GREAT DAY|NICE DAY|COME AGAIN|SEE YOU|PAYER|DROP-?IN|CUSTOMER|PRODUCT SALE|SOLD BY|SERVED BY|CLERK|REGISTER|LANE\b)/;
  var DESCONTO = /(SAVE|DISCOUNT|COUPON|REDUCTION|RABAIS|INSTANT|PROMO|MULTI\s*BUY|\bOFF\b|PRICE\s*MATCH|ROLLBACK\s*SAV|CPN|TPD|\bREDUC)/;
  var EXPANDE = { BLK: 'BLACK', WHT: 'WHITE', CHKN: 'CHICKEN', CKN: 'CHICKEN', BRST: 'BREAST', BNLS: 'BONELESS', SKNLS: 'SKINLESS', BRD: 'BREAD', ORG: 'ORGANIC', GRN: 'GREEN', RD: 'RED', YLW: 'YELLOW', VEG: 'VEGETABLE', VEGS: 'VEGETABLES', FRZ: 'FROZEN', FZN: 'FROZEN', BF: 'BEEF', GRND: 'GROUND', LN: 'LEAN', XLN: 'EXTRA LEAN', CHS: 'CHEESE', CHSE: 'CHEESE', CHED: 'CHEDDAR', MOZZ: 'MOZZARELLA', YOG: 'YOGURT', YGRT: 'YOGURT', BTR: 'BUTTER', MLK: 'MILK', CRM: 'CREAM', SR: 'SOUR', PNT: 'PEANUT', BTTR: 'BUTTER', JCE: 'JUICE', ORNG: 'ORANGE', APPL: 'APPLE', BAN: 'BANANA', BANAN: 'BANANAS', POT: 'POTATO', POTS: 'POTATOES', TOM: 'TOMATO', TOMS: 'TOMATOES', ONIO: 'ONION', LETT: 'LETTUCE', CUC: 'CUCUMBER', STRAWB: 'STRAWBERRIES', BLUEB: 'BLUEBERRIES', WW: 'WHOLE WHEAT', WHL: 'WHOLE', WHT_: 'WHEAT', MUSH: 'MUSHROOMS', PEPP: 'PEPPERS', SAUS: 'SAUSAGE', PK: 'PORK', TKY: 'TURKEY', SLMN: 'SALMON', CRL: 'CEREAL', OATML: 'OATMEAL', PSTA: 'PASTA', SPAG: 'SPAGHETTI', SCE: 'SAUCE', TP: 'TOILET PAPER', PT: 'PAPER TOWEL', DET: 'DETERGENT', LIQ: 'LIQUID', DISH: 'DISH', SHMP: 'SHAMPOO', TOOTHP: 'TOOTHPASTE', BTL: 'BOTTLE', PKG: 'PACK', LRG: 'LARGE', LG: 'LARGE', MED: 'MEDIUM', SM: 'SMALL', XL: 'EXTRA LARGE', GV: 'GREAT VALUE', NN: 'NO NAME', CMPL: 'COMPLIMENTS', KS: 'KIRKLAND', FLK: 'FLAKES', FLKS: 'FLAKES', ORIG: 'ORIGINAL', ENG: 'ENGLISH', BNS: 'BEANS', GRK: 'GREEK', CRNCH: 'CRUNCH', HNY: 'HONEY', SWT: 'SWEET', PEAN: 'PEANUT', ALMD: 'ALMOND', CHOC: 'CHOCOLATE', STRWB: 'STRAWBERRY', RSP: 'RASPBERRY', CRN: 'CORN', OLV: 'OLIVE', VEGG: 'VEGGIE', TORT: 'TORTILLA', SNDWCH: 'SANDWICH' };
  var CATS = [
    ['Mercearia', /CRUSHED|DICED|CANNED|TOMATO PASTE|PASTA SAUCE|SOUP|FLAKES|CHEERIOS|CEREAL|OATS|GRANOLA\b/],
    ['Bebidas', /JUICE/],
    ['Hortifruti', /BANANA|APPLE|ORANGE|LEMON|LIME|GRAPE|BERR|RASPBERR|STRAWB|BLUEB|PEAR|PEACH|MANGO|AVOCADO|POTATO|TOMATO|ONION|GARLIC|LETTUCE|SPINACH|KALE|CARROT|CELERY|BROCCOLI|CAULI|CUCUMBER|PEPPER|MUSHROOM|ZUCCHINI|SQUASH|CORN|SALAD|CABBAGE|MELON|PINEAPPLE|KIWI|CILANTRO|PARSLEY|PRODUCE|ORGANIC VEG/],
    ['Carnes e peixes', /CHICKEN|BEEF|PORK|TURKEY|HAM|BACON|SAUSAGE|STEAK|GROUND|SALMON|TUNA|FISH|SHRIMP|COD|HADDOCK|LOBSTER|WINGS|THIGH|BREAST|ROAST|MEAT|DELI|SALAMI|PEPPERONI|WIENER/],
    ['Laticínios e ovos', /MILK|EGG|CHEESE|CHEDDAR|MOZZ|YOGURT|YOGOURT|BUTTER|CREAM|KEFIR|COTTAGE|MARGARINE|NATREL|NEILSON|BLACK DIAMOND|ACTIVIA|OIKOS|ISLAND ABBEY/],
    ['Padaria', /BREAD|BAGEL|BUN|ROLL|TORTILLA|WRAP|PITA|MUFFIN|CROISSANT|CAKE|DEMPSTER|VILLAGGIO|BAKERY|NAAN|ENGLISH MUFFIN/],
    ['Congelados', /FROZEN|FRZ|ICE CREAM|PIZZA|FRIES|NUGGET|POPSICLE|WAFFLE/],
    ['Bebidas', /JUICE|COLA|COKE|PEPSI|SODA|WATER|COFFEE|TEA|GINGER ALE|SPRITE|GATORADE|POWERADE|KOMBUCHA|DRINK|BEVERAGE|NESCAFE|TIM HORTONS|FOLGERS|MAXWELL/],
    ['Lanches e doces', /CHIP|CHOC|COOKIE|CANDY|CRACKER|POPCORN|PRETZEL|SNACK|GUM|BAR\b|BARS\b|OREO|LAYS|DORITOS|PRINGLES|NUTELLA|GRANOLA BAR|SWEET/],
    ['Limpeza', /DETERGENT|TIDE|GAIN|BLEACH|CLEAN|LYSOL|DISH|DAWN|CASCADE|SPONGE|GARBAGE|TRASH|BAGS|FOIL|WRAP PLASTIC|PAPER TOWEL|BOUNTY|SOFTENER|DOWNY|WINDEX|MR CLEAN|SWIFFER/],
    ['Higiene', /SHAMPOO|CONDITIONER|SOAP|BODY WASH|TOOTH|COLGATE|CREST|DEODOR|RAZOR|TOILET|CHARMIN|CASHMERE|ROYALE|TISSUE|KLEENEX|LOTION|FLOSS|MOUTHWASH|PAD|TAMPON/],
    ['Bebê e pet', /DIAPER|WIPES|BABY|FORMULA|PET|DOG|CAT\b|PURINA|LITTER/],
    ['Mercearia', /RICE|PASTA|SPAGHETTI|SAUCE|BEAN|LENTIL|FLOUR|SUGAR|SALT|OIL|VINEGAR|CEREAL|OAT|SOUP|CANNED|TOMATO PASTE|PEANUT BUTTER|JAM|HONEY|SPICE|KETCHUP|MUSTARD|MAYO|DRESSING|BROTH|STOCK|CORNSTARCH|BAKING|YEAST|NOODLE|KRAFT/]
  ];
  var PRECO = /(-?\$?\s?\d{1,4}[.,]\d{2})\s?(-)?(?:\s+[A-Z]{1,4})?$/;
  function num(t) { return parseFloat(String(t).replace(/[$\s]/g, '').replace(',', '.')); }
  function limpar(d) {
    var t = ' ' + d.toUpperCase() + ' ';
    t = t.replace(/\$/g, ' ').replace(/[*#]+/g, ' ');
    t = t.replace(/^\s*\d{4,}\s+/, ' ');                     // código/UPC no começo
    t = t.replace(/\s\d{6,}[A-Z]{0,2}(?=\s)/g, ' ');            // UPC no meio (Walmart: 000000004011F)
    t = t.replace(/\s+/g, ' ').trim();
    // marcas de imposto no fim: MRJ, HMRJ, N, J, F, H, T, Y, GC, D, X
    for (var i = 0; i < 3; i++) t = t.replace(/\s(H?M?R?J|[A-Z]{1,2}|GC|HC|HST)$/, function (m, g) { return /^(KG|LB|ML|L|G|OZ|PK|CT|XL|LG)$/.test(g) ? m : ''; }).trim();
    return t;
  }
  function expandir(t) {
    return t.split(' ').map(function (w) { return EXPANDE[w] || w; }).join(' ');
  }
  function titulo(t) {
    var U = { ml: 'mL', l: 'L', g: 'g', kg: 'kg', lb: 'lb', oz: 'oz', ct: 'un', pk: 'un' };
    return t.toLowerCase().replace(/(^|\s)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); })
      .replace(/\b(\d+(?:\.\d+)?)\s?(ml|l|g|kg|lb|oz|ct|pk)\b/gi, function (m, n, u) { return n + ' ' + U[u.toLowerCase()]; })
      .replace(/\bPc\b/g, 'PC').replace(/\bGv\b/g, 'GV');
  }
  function categoria(t) { for (var i = 0; i < CATS.length; i++) if (new RegExp('\\b(?:' + CATS[i][1].source + ')').test(t)) return CATS[i][0]; return 'Outros'; }
  function data(texto, hoje) {
    hoje = hoje || new Date();
    var limite = new Date(hoje.getTime() + 86400000), velho = new Date(hoje.getTime() - 400 * 86400000), cands = [], m, re;
    var ok = function (y, mo, d) { if (y < 100) y += 2000; var dt = new Date(y, mo - 1, d); if (dt.getMonth() !== mo - 1 || dt > limite || dt < velho) return; cands.push(dt); };
    re = /\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/g; while ((m = re.exec(texto))) ok(+m[1], +m[2], +m[3]);
    re = /\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/g;
    while ((m = re.exec(texto))) { var a = +m[1], b = +m[2], c = +m[3]; ok(c, a, b); ok(c, b, a); if (m[3].length === 2) ok(a, b, c); }
    var MES = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
    re = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/gi; while ((m = re.exec(texto))) ok(+m[3], MES[m[1].toUpperCase()], +m[2]);
    re = /\b(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\.?\s+(20\d{2})\b/gi; while ((m = re.exec(texto))) ok(+m[3], MES[m[2].toUpperCase()], +m[1]);
    if (!cands.length) return null;
    cands.sort(function (x, y) { return y - x; });
    var d = cands[0];
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function linhaQtd(l) {
    var m = l.match(/(\d+(?:[.,]\d+)?)\s*(KG|LB)\s*@\s*\$?\s?(\d+[.,]\d{2})\s*\/?\s*(KG|LB)?/i);
    if (m) return { qtd: num(m[1]), un: num(m[3]), peso: true, u: m[2].toLowerCase() };
    m = l.match(/^\s*(\d+(?:[.,]\d+)?)\s*(K[G9]|LB|L8)\s*[@E]?\s*\$?\s?(\d+[.,]\d{2})\s*\/\s*(K[G9]|LB|L8)\b/i);
    if (m) { var pq = m[1]; if (/^0\d{2,}$/.test(pq)) pq = '0.' + pq.slice(1); return { qtd: num(pq), un: num(m[3]), peso: true, u: /^K/i.test(m[2]) ? 'kg' : 'lb' }; }
    m = l.match(/^\s*(\d{1,3})\s*(?:@|AT|X)\s*\$?\s?(\d+[.,]\d{2})/i);
    if (m) return { qtd: +m[1], un: num(m[2]) };
    m = l.match(/^\s*(\d{1,3})\s*(?:@|AT)\s*(\d+)\s*(?:\/|FOR)\s*\$?\s?(\d+[.,]\d{2})/i);
    if (m) return { qtd: +m[1], un: num(m[3]) / +m[2] };
    return null;
  }
  function ler(texto, hoje) {
    var bruto = String(texto || '').replace(/\r/g, '');
    var U = bruto.toUpperCase();
    var loja = 'outro';
    for (var i = 0; i < LOJAS.length; i++) if (LOJAS[i][1].test(U)) { loja = LOJAS[i][0]; break; }
    var linhas = bruto.split('\n').map(function (l) {
      l = l.replace(/\s+/g, ' ').trim();
      // OCR do Atalhos: lixo depois do preço ("$2.84 0）", "$9.97日") e "D" lido como "0"
      l = l.replace(/[^\x20-\x7E]+$/, '').trim();
      l = l.replace(/(\d[.,]\d{2})\s+[0O]\)?$/, '$1 D');
      return l;
    }).filter(Boolean);
    var itens = [], total = null, imposto = 0;
    function addItem(raw, tot, q) {
      var lim = limpar(raw); if (!/[A-Z]{2,}/.test(lim)) return null;
      var it = { raw: lim, qtd: 1, un: tot, total: tot };
      if (q && (q.peso || Math.abs(q.qtd * q.un - tot) < 0.06)) { it.qtd = q.qtd; it.un = q.un; }
      itens.push(it); return it;
    }
    // 1) classifica cada linha
    var C = linhas.map(function (l) {
      var L = l.toUpperCase(), pm = L.match(PRECO), valor = pm ? num(pm[1]) * (pm[2] ? -1 : 1) : null;
      if (/\bTOTAL\b/.test(L) && !/SUB\s*-?\s*TOTAL|SAVING|ITEMS|POINTS/.test(L) && valor != null) return { t: 'total', v: valor };
      if (/\b(HST|GST|PST|TAX|TVH)\b/.test(L) && valor != null && !/TOTAL/.test(L)) return { t: 'imposto', v: valor };
      if (valor == null && /\bTOTAL\b/.test(L) && !/SUB\s*-?\s*TOTAL|SAVING|ITEMS|POINTS/.test(L)) return { t: 'pular', rot: 'total' };
      if (valor == null && /\b(HST|GST|PST|TAX|TVH)\b/.test(L)) return { t: 'pular', rot: 'imposto' };
      if (PULAR.test(L) || LOJAS.some(function (x) { return x[1].test(L); })) return { t: 'pular', rot: valor == null ? 'ignorar' : null };
      if (/^\d{8,14}[A-Z]?$/.test(L)) return { t: 'codigo' };
      var q = linhaQtd(L);
      if (q) { var resto = L.replace(/(\d+(?:[.,]\d+)?)\s*(KG|LB)?\s*(@|AT|X)\s*\$?\s?\d+[.,]\d{2}\s*\/?\s*(KG|LB)?/i, '').replace(/^\s*\d+(?:[.,]\d+)?\s*(K[G9]|LB|L8)\s*[@E]?\s*\$?\s?\d+[.,]\d{2}\s*\/\s*(K[G9]|LB|L8)\b/i, ''); var tp = resto.match(PRECO); return { t: 'qtd', q: q, v: tp ? num(tp[1]) : null }; }
      if (valor != null && (valor < 0 || DESCONTO.test(L))) return { t: 'desc', v: Math.abs(valor) };
      if (valor != null) { var d = L.replace(PRECO, '').trim(); return /[A-Z]{2,}/.test(limpar(d)) ? { t: 'item', d: d, v: valor } : { t: 'preco', v: valor }; }
      if (/[A-Z]{3,}/.test(L) && L.length <= 60 && !/^\d{1,5}\s+[A-Z].*\b(ST|AVE|RD|DR|BLVD|WAY|STREET|ROAD)\b/.test(L)) return { t: 'nome', d: L };
      return { t: 'pular' };
    });
    // 2) Texto ao Vivo às vezes copia a coluna de nomes e depois a de preços: junta os blocos em ordem
    var emparelhou = false;
    for (var k = 0; k < C.length; k++) {
      if (C[k].t !== 'nome') continue;
      var n1 = k; while (n1 < C.length && (C[n1].t === 'nome' || C[n1].t === 'codigo' || C[n1].t === 'qtd' && C[n1].v == null)) n1++;
      var nomes = C.slice(k, n1).filter(function (c) { return c.t === 'nome'; });
      var p1 = n1; while (p1 < C.length && C[p1].t === 'preco') p1++;
      var precos = C.slice(n1, p1);
      if (nomes.length >= 2 && precos.length >= 2) {
        var n = Math.min(nomes.length, precos.length), off = nomes.length - n;
        for (var j = 0; j < n; j++) { nomes[off + j].t = 'item'; nomes[off + j].v = precos[j].v; precos[j].t = 'usado'; }
        for (var z = 0; z < off; z++) nomes[z].t = 'pular';
        emparelhou = true;
      }
      k = Math.max(k, p1 - 1);
    }
    // 3) percorre em ordem
    // Texto ao Vivo também separa rótulo e valor: "Subtotal" numa linha e "$8.25" na de baixo
    // ...ou um bloco de rótulos seguido de um bloco de valores, na mesma ordem
    var pend = null, pendQtd = null, ultimo = null, rots = [];
    C.forEach(function (c) {
      if (c.t === 'preco' && rots.length) { var r0 = rots.shift(); if (r0 === 'total') { if (total == null || c.v > total) total = c.v; } else if (r0 === 'imposto') imposto += c.v; return; }
      if (c.t !== 'pular' && c.t !== 'preco' && c.t !== 'codigo') rots = [];
      if (c.t === 'total') { if (total == null || c.v > total) total = c.v; ultimo = null; return; }
      if (c.t === 'imposto') { imposto += c.v; ultimo = null; return; }
      if (c.t === 'pular') { if (c.rot) { rots.push(c.rot); pend = null; } ultimo = null; return; }
      if (c.t === 'usado') { ultimo = null; return; }
      if (c.t === 'codigo') return;
      if (c.t === 'qtd') {
        if (c.v != null && pend) { ultimo = addItem(pend, c.v, c.q); pend = null; return; }
        if (ultimo && (c.q.peso || Math.abs(c.q.qtd * c.q.un - ultimo.total) < 0.06)) { ultimo.qtd = c.q.qtd; ultimo.un = c.q.un; return; }
        pendQtd = c.q; return;
      }
      if (c.t === 'desc') { var x = itens[itens.length - 1]; if (x) { x.total = Math.round((x.total - c.v) * 100) / 100; x.un = Math.round(x.total / x.qtd * 100) / 100; } return; }
      if (c.t === 'preco') { if (pend && !(total != null && itens.length && Math.abs(c.v - total) < 0.005)) { ultimo = addItem(pend, c.v, pendQtd); pendQtd = null; } pend = null; return; }
      if (c.t === 'item') { pend = null; ultimo = addItem(c.d, c.v, pendQtd); pendQtd = null; return; }
      if (c.t === 'nome') { pend = c.d; ultimo = null; }
    });
    itens.forEach(function (it) { it.en = titulo(expandir(it.raw)); it.cat = categoria(expandir(it.raw)); it.total = Math.round(it.total * 100) / 100; it.un = Math.round(it.un * 100) / 100; });
    var soma = Math.round(itens.reduce(function (s, it) { return s + it.total; }, 0) * 100) / 100;
    // OCR confunde dígitos parecidos (4/9, 1/7, 3/8...). Se trocar 1 dígito de 1 preço fecha o total, corrige.
    if (total != null && Math.abs(soma + imposto - total) > 0.005) {
      var PAR = { '0': '86', '1': '7', '2': '7', '3': '8', '4': '9', '5': '6', '6': '58', '7': '12', '8': '036', '9': '4' }, achou = [];
      itens.forEach(function (it, ix) {
        if (it.qtd !== 1) return;
        var t = it.total.toFixed(2);
        for (var p = 0; p < t.length; p++) { var ds = PAR[t[p]]; if (!ds) continue;
          for (var q = 0; q < ds.length; q++) { var nv = parseFloat(t.slice(0, p) + ds[q] + t.slice(p + 1));
            if (Math.abs(soma - it.total + nv + imposto - total) < 0.005) achou.push([ix, nv]); } }
      });
      if (achou.length === 1) { var ic = itens[achou[0][0]]; ic.lido = ic.total; ic.total = ic.un = achou[0][1]; ic.corrigido = true;
        soma = Math.round(itens.reduce(function (s, it) { return s + it.total; }, 0) * 100) / 100; }
    }
    return { loja: loja, data: data(bruto, hoje), itens: itens, total: total, imposto: Math.round(imposto * 100) / 100, soma: soma, emparelhou: emparelhou };
  }
  function chave(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'item';
  }
  return { ler: ler, chave: chave, categoria: categoria, expandir: expandir };
})();
if (typeof module !== 'undefined') module.exports = Leitor;
