/**
 * Núcleo de cálculo do frete do caminhoneiro. Funções puras, sem DOM.
 *
 * Roda no navegador (expõe window.CalcFrete) e no Node (module.exports),
 * para que os testes usem exatamente o mesmo código da página.
 *
 * Entradas esperadas (objeto `dados`):
 *   distancia          km  quilômetros da viagem (ida, ou ida e volta se for o caso)
 *   consumo            km/l consumo médio do caminhão carregado
 *   precoCombustivel   R$  preço do litro do diesel
 *   pedagio            R$  pedágio da rota
 *   alimentacao        R$  alimentação e hospedagem durante a viagem
 *   outros             R$  qualquer outro custo fixo da viagem (manutenção, ajudante)
 *   comissao           %   percentual retido pela plataforma/agência de frete
 *   imposto            %   percentual de imposto sobre o valor do frete
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

  /** Quanto o diesel custa nessa viagem: (distância / consumo) x preço do litro. */
  function custoCombustivel(dados) {
    var consumo = n(dados.consumo);
    if (consumo <= 0) return 0;
    return (n(dados.distancia) / consumo) * n(dados.precoCombustivel);
  }

  /** Custos em reais que não dependem do valor do frete. */
  function custosDiretos(dados) {
    return (
      custoCombustivel(dados) + n(dados.pedagio) + n(dados.alimentacao) + n(dados.outros)
    );
  }

  /** Fatia do frete que vai embora em percentuais (0 a 1): comissão + imposto. */
  function fatorPercentual(dados) {
    return (n(dados.comissao) + n(dados.imposto)) / 100;
  }

  /**
   * Dado um valor de frete, quebra o dinheiro em pedaços.
   * É daqui que sai o lucro real da viagem.
   */
  function analisar(dados, valorFrete) {
    var valor = n(valorFrete);
    var diretos = custosDiretos(dados);
    var comissao = (valor * n(dados.comissao)) / 100;
    var imposto = (valor * n(dados.imposto)) / 100;
    var lucro = valor - diretos - comissao - imposto;
    var distancia = n(dados.distancia);

    return {
      valor: valor,
      custosDiretos: diretos,
      comissao: comissao,
      imposto: imposto,
      lucro: lucro,
      // margem = lucro sobre o VALOR DO FRETE (o número que o caminhoneiro usa)
      margem: valor > 0 ? (lucro / valor) * 100 : 0,
      // lucro por km: ajuda a comparar viagens de distâncias diferentes
      lucroPorKm: distancia > 0 ? lucro / distancia : 0,
      composicao: {
        combustivel: custoCombustivel(dados),
        pedagio: n(dados.pedagio),
        outros: n(dados.alimentacao) + n(dados.outros),
        comissao: comissao,
        imposto: imposto,
        lucro: Math.max(lucro, 0),
      },
    };
  }

  /**
   * Menor valor de frete que não dá prejuízo (lucro exatamente zero).
   * Retorna null quando comissão + imposto comem 100% ou mais do frete.
   */
  function valorMinimo(dados) {
    var f = fatorPercentual(dados);
    if (f >= 1) return null;
    return custosDiretos(dados) / (1 - f);
  }

  /**
   * Valor de frete necessário para atingir uma margem alvo.
   *
   *   valor = custos diretos / (1 - comissão% - imposto% - margem%)
   *
   * O erro clássico é somar uma margem fixa em cima do diesel gasto: isso
   * ignora que a comissão da plataforma e o imposto incidem sobre o valor
   * do frete, não sobre o custo da viagem.
   */
  function valorParaMargem(dados, margemAlvo) {
    var m = n(margemAlvo) / 100;
    var f = fatorPercentual(dados);
    var divisor = 1 - f - m;

    if (divisor <= 0) {
      return {
        possivel: false,
        motivo:
          "Comissão + imposto + margem desejada somam " +
          Math.round((f + m) * 100) +
          "% do frete. Não sobra espaço: baixe a margem ou negocie a comissão.",
      };
    }

    var resultado = analisar(dados, custosDiretos(dados) / divisor);
    resultado.possivel = true;
    return resultado;
  }

  return {
    custoCombustivel: custoCombustivel,
    custosDiretos: custosDiretos,
    fatorPercentual: fatorPercentual,
    analisar: analisar,
    valorMinimo: valorMinimo,
    valorParaMargem: valorParaMargem,
  };
});
