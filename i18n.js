// MinhaCasa™ — idiomas (português, inglês, francês do Canadá). 20/11/2026
// Como funciona:
//  - O texto em português dentro do código É a chave: T('Salvar') devolve 'Save' em inglês.
//  - Se faltar uma tradução, aparece o português (o app nunca quebra por falta de tradução).
//  - As traduções ficam em i18n-en.js e i18n-fr.js (MCI18N.add('en', {...})).
//  - Trocar de idioma recarrega o app, para tudo ser desenhado de novo no idioma novo.
(function (raiz) {
  'use strict';
  var IDIOMAS = ['pt', 'en', 'fr'];
  var NOMES = { pt: 'Português', en: 'English', fr: 'Français' };
  var LOCALE = { pt: 'pt-BR', en: 'en-CA', fr: 'fr-CA' };
  var CHAVE = 'mc_lang';

  function ler() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function doAparelho() {
    var ls = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < ls.length; i++) {
      var c = String(ls[i] || '').slice(0, 2).toLowerCase();
      if (IDIOMAS.indexOf(c) >= 0) return c;
    }
    return 'en';
  }
  var salvo = ler();
  // Quem já usava o app antes dos idiomas (tem 'mc_versao_vista') continua em português até escolher outro.
  var jaUsava = false; try { jaUsava = !!localStorage.getItem('mc_versao_vista'); } catch (e) {}
  var lang = IDIOMAS.indexOf(salvo) >= 0 ? salvo : (jaUsava ? 'pt' : doAparelho());
  if (IDIOMAS.indexOf(salvo) < 0) { try { localStorage.setItem(CHAVE, lang); } catch (e) {} } // a partir daqui, fica a escolha deste aparelho
  var D = { en: {}, fr: {} };
  var faltam = {}, blocos = {};

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  function preencher(r, v) {
    if (!v) return r;
    return r.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; });
  }
  function T(s, v) {
    s = String(s);
    if (lang === 'pt') return preencher(s, v);
    var d = D[lang], r = d[s];
    if (r == null) {
      var n = norm(s);
      r = d[n];
      if (r == null) { faltam[n] = 1; r = s; }
      else { // mantém os espaços das pontas do original ("Total: " + valor)
        var ini = /^\s*/.exec(s)[0], fim = /\s*$/.exec(s)[0];
        r = ini + r + fim;
      }
    }
    return preencher(r, v);
  }

  // Traduz o HTML fixo da página (index.html), uma vez, antes do app desenhar as telas.
  var INLINE = { B: 1, I: 1, STRONG: 1, EM: 1, BR: 1, SUP: 1, SMALL: 1, U: 1, CODE: 1, A: 1, SPAN: 1 };
  function soInline(el) {
    // bloco de texto com <b>, <br> etc., sem ids nem elementos de controle dentro
    var temTexto = false, temTag = false;
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) { if (/[A-Za-zÀ-ú]/.test(n.nodeValue)) temTexto = true; }
      else if (n.nodeType === 1) {
        if (!INLINE[n.tagName] || n.id || n.attributes.length > 1 || (n.attributes.length === 1 && n.tagName !== 'A' && n.attributes[0].name !== 'class' && n.attributes[0].name !== 'style')) return false;
        if (n.querySelector && n.querySelector('[id],input,select,button,svg,img')) return false;
        temTag = true;
      }
    }
    return temTexto && temTag;
  }
  var ATRS = ['placeholder', 'aria-label', 'title', 'alt'];
  function traduzirPagina(raizEl) {
    if (lang === 'pt') return;
    var d = D[lang];
    (function andar(el) {
      if (el.nodeType !== 1 || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.hasAttribute('data-i18n-nao')) return;
      for (var a = 0; a < ATRS.length; a++) {
        var v = el.getAttribute(ATRS[a]);
        if (v && /[A-Za-zÀ-ú]/.test(v)) el.setAttribute(ATRS[a], T(v));
      }
      if (soInline(el)) {
        var k = norm(el.innerHTML);
        if (d[k] != null) { el.innerHTML = d[k]; return; }
        blocos[k] = 1;
      }
      for (var n = el.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) {
          var t = n.nodeValue;
          if (/[A-Za-zÀ-ú]/.test(t)) n.nodeValue = T(t);
        } else andar(n);
      }
    })(raizEl || document.body);
  }

  function definir(novo) {
    if (IDIOMAS.indexOf(novo) < 0) return false;
    try { localStorage.setItem(CHAVE, novo); } catch (e) {}
    return novo !== lang;
  }

  var MESES = {
    pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  };
  var MESES_C = {
    pt: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    fr: ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
  };

  var DIAS_C = {
    pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  };

  document.documentElement.lang = LOCALE[lang];

  raiz.MCI18N = {
    lang: lang,
    locale: LOCALE[lang],
    idiomas: IDIOMAS,
    nomes: NOMES,
    T: T,
    add: function (l, obj) { if (!D[l]) return; for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) D[l][norm(k)] = obj[k]; },
    traduzirPagina: traduzirPagina,
    definir: definir,
    escolhido: function () { return IDIOMAS.indexOf(ler()) >= 0; },
    meses: MESES[lang],
    mesesCurtos: MESES_C[lang],
    diasCurtos: DIAS_C[lang],
    dicionario: function () { return lang === 'pt' ? null : D[lang]; },
    faltam: function () { return Object.keys(faltam); },
    blocosSemTraducao: function () { return Object.keys(blocos); }
  };
  raiz.T = T;
})(typeof window !== 'undefined' ? window : this);
