/**
 * Núcleo de cálculo da precificação. Funções puras, sem DOM.
 *
 * Roda no navegador (expõe window.Calc) e no Node (module.exports),
 * para que os testes usem exatamente o mesmo código da página.
 *
 * Entradas esperadas (objeto `custos`):
 *   custoProduto     R$  quanto você paga no produto
 *   frete            R$  frete que sai do seu bolso por venda
 *   embalagem        R$  caixa, fita, etiqueta
 *   outros           R$  qualquer custo fixo por venda (brinde, comissão fixa)
 *   taxaMarketplace  %   percentual cobrado pelo canal de venda
 *   imposto          %   percentual de imposto sobre a venda
 */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function n(v) {
    return Number.isFinite(v) ? v : 0;
  }

  /** Custos em reais que não dependem do preço de venda. */
  function custosDiretos(c) {
    return n(c.custoProduto) + n(c.frete) + n(c.embalagem) + n(c.outros);
  }

  /** Fatia do preço que vai embora em percentuais (0 a 1). */
  function fatorPercentual(c) {
    return (n(c.taxaMarketplace) + n(c.imposto)) / 100;
  }

  /**
   * Dado um preço de venda, quebra o dinheiro em pedaços.
   * É daqui que sai o lucro real — o que sobra depois de tudo.
   */
  function analisar(custos, precoVenda) {
    var preco = n(precoVenda);
    var diretos = custosDiretos(custos);
    var taxa = (preco * n(custos.taxaMarketplace)) / 100;
    var imposto = (preco * n(custos.imposto)) / 100;
    var lucro = preco - diretos - taxa - imposto;

    return {
      preco: preco,
      custosDiretos: diretos,
      taxa: taxa,
      imposto: imposto,
      lucro: lucro,
      // margem = lucro sobre o PREÇO (é o número que o lojista usa)
      margem: preco > 0 ? (lucro / preco) * 100 : 0,
      // markup = quantas vezes o preço cobre o custo (2 = "vendo pelo dobro")
      markup: diretos > 0 ? preco / diretos : 0,
      composicao: {
        produto: n(custos.custoProduto),
        frete: n(custos.frete),
        extras: n(custos.embalagem) + n(custos.outros),
        taxa: taxa,
        imposto: imposto,
        lucro: Math.max(lucro, 0),
      },
    };
  }

  /**
   * Menor preço que não dá prejuízo (lucro exatamente zero).
   * Retorna null quando taxa + imposto comem 100% ou mais da venda.
   */
  function precoMinimo(custos) {
    var f = fatorPercentual(custos);
    if (f >= 1) return null;
    return custosDiretos(custos) / (1 - f);
  }

  /**
   * Preço de venda necessário para atingir uma margem alvo.
   *
   *   preço = custos diretos / (1 - taxas% - margem%)
   *
   * O erro clássico é fazer `custo * (1 + margem)`: isso ignora que a taxa
   * e o imposto incidem sobre o preço final, e não sobre o custo — o lojista
   * acha que tem 20% de margem e na prática tem bem menos.
   */
  function precoParaMargem(custos, margemAlvo) {
    var m = n(margemAlvo) / 100;
    var f = fatorPercentual(custos);
    var divisor = 1 - f - m;

    if (divisor <= 0) {
      return {
        possivel: false,
        motivo:
          "Taxa + imposto + margem desejada somam " +
          Math.round((f + m) * 100) +
          "% do preço. Não sobra espaço: baixe a margem ou as taxas.",
      };
    }

    var resultado = analisar(custos, custosDiretos(custos) / divisor);
    resultado.possivel = true;
    return resultado;
  }

  return {
    custosDiretos: custosDiretos,
    fatorPercentual: fatorPercentual,
    analisar: analisar,
    precoMinimo: precoMinimo,
    precoParaMargem: precoParaMargem,
  };
});
