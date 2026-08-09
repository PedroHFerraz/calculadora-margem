const test = require("node:test");
const assert = require("node:assert/strict");
const CalcFrete = require("../assets/calcFrete.js");

const base = {
  peso: 2,
  comprimento: 20,
  largura: 15,
  altura: 10,
  valorDeclarado: 0,
  regiao: "estado",
  modalidade: "padrao",
};

const perto = (a, b, tolerancia = 0.01) =>
  assert.ok(Math.abs(a - b) < tolerancia, `esperava ~${b}, recebeu ${a}`);

test("peso cubado segue a fórmula C x L x A / 6000", () => {
  perto(CalcFrete.pesoCubado(60, 50, 40), 20);
});

test("usa o peso real quando ele é maior que o cubado", () => {
  const r = CalcFrete.simular({ ...base, peso: 5, comprimento: 10, largura: 10, altura: 10 });
  assert.equal(r.usouCubagem, false);
  perto(r.pesoConsiderado, 5);
});

test("usa o peso cubado quando o volume pesa mais do que a balança", () => {
  const r = CalcFrete.simular({ ...base, peso: 1, comprimento: 60, largura: 50, altura: 40 });
  assert.equal(r.usouCubagem, true);
  perto(r.pesoConsiderado, 20);
});

test("frete cresce com a distância: região distante custa mais que a mesma cidade", () => {
  const pertoRegiao = CalcFrete.simular({ ...base, regiao: "local" }).total;
  const longeRegiao = CalcFrete.simular({ ...base, regiao: "longe" }).total;
  assert.ok(longeRegiao > pertoRegiao);
});

test("modalidade expresso é mais cara e mais rápida que a econômica", () => {
  const economico = CalcFrete.simular({ ...base, modalidade: "economico" });
  const expresso = CalcFrete.simular({ ...base, modalidade: "expresso" });
  assert.ok(expresso.total > economico.total);
  assert.ok(expresso.prazoDias < economico.prazoDias);
});

test("seguro é proporcional ao valor declarado", () => {
  const semSeguro = CalcFrete.simular({ ...base, valorDeclarado: 0 });
  const comSeguro = CalcFrete.simular({ ...base, valorDeclarado: 1000 });
  perto(comSeguro.seguro, 3);
  perto(comSeguro.total - semSeguro.total, 3);
});

test("prazo nunca é menor que 1 dia", () => {
  const r = CalcFrete.simular({ ...base, regiao: "local", modalidade: "expresso" });
  assert.ok(r.prazoDias >= 1);
});

test("campos vazios ou inválidos contam como zero", () => {
  const r = CalcFrete.simular({
    peso: NaN,
    comprimento: undefined,
    largura: 10,
    altura: 10,
    valorDeclarado: "abc",
    regiao: "estado",
    modalidade: "padrao",
  });
  perto(r.pesoReal, 0);
  perto(r.pesoCubado, 0);
  perto(r.seguro, 0);
});

test("região ou modalidade desconhecida cai no padrão sem quebrar", () => {
  const r = CalcFrete.simular({ ...base, regiao: "marte", modalidade: "foguete" });
  assert.equal(r.regiaoNome, CalcFrete.REGIOES.estado.nome);
  assert.equal(r.modalidadeNome, CalcFrete.MODALIDADES.padrao.nome);
});
