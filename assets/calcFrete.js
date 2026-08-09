/**
 * Núcleo de cálculo do simulador de frete. Funções puras, sem DOM.
 *
 * Roda no navegador (expõe window.CalcFrete) e no Node (module.exports),
 * para que os testes usem exatamente o mesmo código da página.
 *
 * As tarifas abaixo são uma simulação didática (não são cotações reais de
 * transportadora): servem para o lojista ter uma ideia de ordem de grandeza
 * e entender como peso, dimensão, distância e modalidade pesam no frete.
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CalcFrete = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function n(v) {
    return Number.isFinite(v) ? v : 0;
  }

  // Fórmula padrão do mercado (a mesma usada por Correios e transportadoras)
  // para peso cubado no transporte rodoviário: (C x L x A, em cm) / 6000.
  var DIVISOR_CUBAGEM = 6000;

  var REGIOES = {
    local: { nome: "Mesma cidade", taxaFixa: 8, taxaPorKg: 1.2, prazoBase: 1 },
    estado: { nome: "Mesmo estado", taxaFixa: 12, taxaPorKg: 1.8, prazoBase: 3 },
    perto: { nome: "Sul / Sudeste", taxaFixa: 18, taxaPorKg: 2.5, prazoBase: 5 },
    longe: {
      nome: "Norte / Nordeste / Centro-Oeste",
      taxaFixa: 28,
      taxaPorKg: 3.8,
      prazoBase: 9,
    },
  };

  var MODALIDADES = {
    economico: { nome: "Econômico", multiplicador: 0.85, ajustePrazo: 3 },
    padrao: { nome: "Padrão", multiplicador: 1, ajustePrazo: 0 },
    expresso: { nome: "Expresso", multiplicador: 1.6, ajustePrazo: -2 },
  };

  // Seguro simulado sobre o valor declarado da mercadoria.
  var TAXA_SEGURO = 0.003;

  /** Peso "de mentirinha" que o volume ocupa, em kg — quanto maior a caixa, mais pesa. */
  function pesoCubado(comprimento, largura, altura) {
    return (n(comprimento) * n(largura) * n(altura)) / DIVISOR_CUBAGEM;
  }

  /**
   * Simula o frete de um envio.
   *
   * dados: { peso, comprimento, largura, altura, valorDeclarado, regiao, modalidade }
   * regiao e modalidade são chaves de REGIOES / MODALIDADES.
   */
  function simular(dados) {
    var regiao = REGIOES[dados.regiao] || REGIOES.estado;
    var modalidade = MODALIDADES[dados.modalidade] || MODALIDADES.padrao;

    var pesoReal = Math.max(0, n(dados.peso));
    var cubado = pesoCubado(dados.comprimento, dados.largura, dados.altura);
    var pesoConsiderado = Math.max(pesoReal, cubado);

    var taxaFixa = regiao.taxaFixa * modalidade.multiplicador;
    var custoPeso = regiao.taxaPorKg * pesoConsiderado * modalidade.multiplicador;
    var seguro = Math.max(0, n(dados.valorDeclarado)) * TAXA_SEGURO;

    var total = taxaFixa + custoPeso + seguro;
    var prazoDias = Math.max(1, regiao.prazoBase + modalidade.ajustePrazo);

    return {
      pesoReal: pesoReal,
      pesoCubado: cubado,
      pesoConsiderado: pesoConsiderado,
      usouCubagem: cubado > pesoReal,
      regiaoChave: dados.regiao,
      regiaoNome: regiao.nome,
      modalidadeChave: dados.modalidade,
      modalidadeNome: modalidade.nome,
      taxaFixa: taxaFixa,
      custoPeso: custoPeso,
      seguro: seguro,
      total: total,
      prazoDias: prazoDias,
    };
  }

  return {
    REGIOES: REGIOES,
    MODALIDADES: MODALIDADES,
    pesoCubado: pesoCubado,
    simular: simular,
  };
});
