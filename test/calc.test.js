const test = require("node:test");
const assert = require("node:assert/strict");
const Calc = require("../assets/calc.js");

const semTaxas = {
  custoProduto: 50,
  frete: 0,
  embalagem: 0,
  outros: 0,
  taxaMarketplace: 0,
  imposto: 0,
};

const perto = (a, b, tolerancia = 0.01) =>
  assert.ok(
    Math.abs(a - b) < tolerancia,
    `esperava ~${b}, recebeu ${a}`
  );

test("sem taxas: margem de 20% exige preço = custo / 0,8", () => {
  const r = Calc.precoParaMargem(semTaxas, 20);
  assert.equal(r.possivel, true);
  perto(r.preco, 62.5);
  perto(r.lucro, 12.5);
  perto(r.margem, 20);
});

test("margem informada é a margem real, mesmo com taxa e imposto", () => {
  const custos = {
    custoProduto: 100,
    frete: 15,
    embalagem: 3,
    outros: 2,
    taxaMarketplace: 16,
    imposto: 6,
  };
  const r = Calc.precoParaMargem(custos, 25);
  assert.equal(r.possivel, true);
  // o preço encontrado, reanalisado do zero, tem que devolver os 25%
  perto(Calc.analisar(custos, r.preco).margem, 25);
});

test("markup simples (custo x 1,20) NÃO entrega 20% de margem", () => {
  const custos = { ...semTaxas, taxaMarketplace: 16, imposto: 6 };
  const ingenuo = Calc.analisar(custos, 50 * 1.2);
  assert.ok(
    ingenuo.margem < 20,
    `margem real foi ${ingenuo.margem.toFixed(1)}%, deveria ser menor que 20%`
  );
});

test("margem impossível quando taxas + margem passam de 100%", () => {
  const custos = { ...semTaxas, taxaMarketplace: 60, imposto: 20 };
  const r = Calc.precoParaMargem(custos, 30);
  assert.equal(r.possivel, false);
  assert.match(r.motivo, /110%/);
});

test("preço mínimo zera o lucro", () => {
  const custos = { ...semTaxas, custoProduto: 100, taxaMarketplace: 10 };
  const minimo = Calc.precoMinimo(custos);
  perto(minimo, 111.11);
  perto(Calc.analisar(custos, minimo).lucro, 0);
});

test("preço mínimo é null se taxas comem 100% da venda", () => {
  const custos = { ...semTaxas, taxaMarketplace: 70, imposto: 30 };
  assert.equal(Calc.precoMinimo(custos), null);
});

test("vender abaixo do custo devolve lucro e margem negativos", () => {
  const r = Calc.analisar({ ...semTaxas, custoProduto: 80 }, 60);
  perto(r.lucro, -20);
  assert.ok(r.margem < 0);
});

test("markup é a razão entre preço e custo", () => {
  const r = Calc.analisar(semTaxas, 100);
  perto(r.markup, 2);
});

test("composição soma o preço quando há lucro", () => {
  const custos = {
    custoProduto: 40,
    frete: 10,
    embalagem: 2,
    outros: 1,
    taxaMarketplace: 12,
    imposto: 5,
  };
  const r = Calc.precoParaMargem(custos, 15);
  const soma = Object.values(r.composicao).reduce((a, b) => a + b, 0);
  perto(soma, r.preco);
});

test("campos vazios ou inválidos contam como zero", () => {
  const r = Calc.analisar(
    { custoProduto: 30, frete: NaN, embalagem: undefined, taxaMarketplace: 10 },
    100
  );
  perto(r.custosDiretos, 30);
  perto(r.lucro, 60);
});
