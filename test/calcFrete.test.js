const test = require("node:test");
const assert = require("node:assert/strict");
const CalcFrete = require("../assets/calcFrete.js");

const semTaxas = {
  distancia: 500,
  consumo: 2.5,
  precoCombustivel: 6,
  pedagio: 0,
  alimentacao: 0,
  outros: 0,
  comissao: 0,
  imposto: 0,
};

const perto = (a, b, tolerancia = 0.01) =>
  assert.ok(Math.abs(a - b) < tolerancia, `esperava ~${b}, recebeu ${a}`);

test("custo de combustível é distância / consumo x preço do litro", () => {
  perto(CalcFrete.custoCombustivel(semTaxas), 1200); // (500/2.5) * 6
});

test("consumo zero ou inválido não quebra (custo de combustível é zero)", () => {
  perto(CalcFrete.custoCombustivel({ ...semTaxas, consumo: 0 }), 0);
  perto(CalcFrete.custoCombustivel({ ...semTaxas, consumo: NaN }), 0);
});

test("sem comissão nem imposto: margem de 20% exige valor = custo / 0,8", () => {
  const dados = { ...semTaxas, distancia: 0, pedagio: 100, alimentacao: 0, outros: 0 };
  // custosDiretos = 100 (sem distância não há combustível)
  const r = CalcFrete.valorParaMargem(dados, 20);
  assert.equal(r.possivel, true);
  perto(r.valor, 125);
  perto(r.lucro, 25);
  perto(r.margem, 20);
});

test("margem informada é a margem real, mesmo com comissão e imposto", () => {
  const dados = {
    distancia: 400,
    consumo: 3,
    precoCombustivel: 6,
    pedagio: 60,
    alimentacao: 80,
    outros: 20,
    comissao: 10,
    imposto: 3,
  };
  const r = CalcFrete.valorParaMargem(dados, 15);
  assert.equal(r.possivel, true);
  perto(CalcFrete.analisar(dados, r.valor).margem, 15);
});

test("margem impossível quando comissão + imposto + margem passam de 100%", () => {
  const dados = { ...semTaxas, pedagio: 100, comissao: 60, imposto: 20 };
  const r = CalcFrete.valorParaMargem(dados, 30);
  assert.equal(r.possivel, false);
  assert.match(r.motivo, /110%/);
});

test("valor mínimo zera o lucro", () => {
  const dados = { ...semTaxas, distancia: 0, pedagio: 300, comissao: 10 };
  const minimo = CalcFrete.valorMinimo(dados);
  perto(minimo, 333.33);
  perto(CalcFrete.analisar(dados, minimo).lucro, 0);
});

test("valor mínimo é null se comissão + imposto comem 100% do frete", () => {
  const dados = { ...semTaxas, comissao: 70, imposto: 30 };
  assert.equal(CalcFrete.valorMinimo(dados), null);
});

test("proposta abaixo do custo dá lucro e margem negativos", () => {
  const dados = { ...semTaxas, distancia: 0, pedagio: 200 };
  const r = CalcFrete.analisar(dados, 100);
  perto(r.lucro, -100);
  assert.ok(r.margem < 0);
});

test("lucro por km ajuda a comparar viagens de tamanhos diferentes", () => {
  const dados = { ...semTaxas, distancia: 500, pedagio: 0 };
  const r = CalcFrete.analisar(dados, 1700); // lucro = 1700 - 1200 = 500
  perto(r.lucroPorKm, 1); // 500 / 500 km
});

test("composição soma o valor do frete quando há lucro", () => {
  const dados = {
    distancia: 300,
    consumo: 3,
    precoCombustivel: 5,
    pedagio: 40,
    alimentacao: 30,
    outros: 10,
    comissao: 8,
    imposto: 4,
  };
  const r = CalcFrete.valorParaMargem(dados, 12);
  const soma = Object.values(r.composicao).reduce((a, b) => a + b, 0);
  perto(soma, r.valor);
});

test("campos vazios ou inválidos contam como zero", () => {
  const r = CalcFrete.analisar(
    { distancia: 100, consumo: undefined, pedagio: 50, comissao: NaN },
    200
  );
  perto(r.custosDiretos, 50);
  perto(r.lucro, 150);
});
