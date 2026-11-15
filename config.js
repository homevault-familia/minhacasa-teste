// ─────────────────────────────────────────────────────────────
// Minha Casa — configuração do Firebase, por ambiente
//
// O mesmo código roda em dois endereços, cada um com o seu banco:
//   • PRODUÇÃO  minhacasaapp.com          → projeto homevault-1d1d3 (dados reais)
//   • TESTE     teste.minhacasaapp.com    → projeto minhacasa-test (só testes)
// O ambiente é escolhido pelo endereço aberto no navegador. Qualquer endereço
// que não seja o de produção usa o banco de TESTE, para um engano nunca
// gravar teste nos dados reais.
//
// Estes valores são públicos por natureza (todo app web do Firebase os
// expõe). A segurança vem das regras do banco (database.rules.json) e da
// criptografia feita no aparelho de cada usuário.
// ─────────────────────────────────────────────────────────────
(function () {
  var PRODUCAO = {
    apiKey: "AIzaSyDtruvfj47JyrpxrbZAIUiewJMz73uaCiI",
    authDomain: "homevault-1d1d3.firebaseapp.com",
    databaseURL: "https://homevault-1d1d3-default-rtdb.firebaseio.com",
    projectId: "homevault-1d1d3",
    storageBucket: "homevault-1d1d3.firebasestorage.app",
    messagingSenderId: "102739870937",
    appId: "1:102739870937:web:b6fd105eaeb137c22b6ac8"
  };
  var TESTE = {
    apiKey: "AIzaSyBZzLdA-gO5wzGlHnPyEcx5117Sw4R0hSc",
    authDomain: "minhacasa-test.firebaseapp.com",
    databaseURL: "https://minhacasa-test-default-rtdb.firebaseio.com",
    projectId: "minhacasa-test",
    storageBucket: "minhacasa-test.firebasestorage.app",
    messagingSenderId: "198259716696",
    appId: "1:198259716696:web:a03e67e89d5cbc6d81102d"
  };
  var host = location.hostname.toLowerCase();
  var ehProducao = host === 'minhacasaapp.com' || host === 'www.minhacasaapp.com' || host === 'homevault-familia.github.io';
  window.MINHACASA_AMBIENTE = ehProducao ? 'producao' : 'teste';
  window.HOMEVAULT_FIREBASE = ehProducao ? PRODUCAO : TESTE;

  // Faixa fixa no topo do ambiente de teste, para nunca confundir com o app de verdade.
  if (!ehProducao) {
    var faixa = function () {
      if (document.getElementById('faixa-teste')) return;
      var d = document.createElement('div');
      d.id = 'faixa-teste';
      d.textContent = '🧪 AMBIENTE DE TESTE · dados separados do app de verdade';
      d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#f59e0b;color:#111;font:700 11px/1 -apple-system,system-ui,sans-serif;letter-spacing:.3px;text-align:center;padding:calc(env(safe-area-inset-top) + 4px) 8px 4px;pointer-events:none';
      document.body.appendChild(d);
      document.title = '[TESTE] ' + document.title;
    };
    if (document.body) faixa(); else document.addEventListener('DOMContentLoaded', faixa);
  }
})();
