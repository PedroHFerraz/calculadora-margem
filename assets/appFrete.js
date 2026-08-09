/* Liga o formulário ao núcleo de cálculo (assets/calcFrete.js). */
(function () {
  "use strict";

  var CHAVE = "simulador-frete:v1";

  var CAMPOS = [
    "peso",
    "comprimento",
    "largura",
    "altura",
    "valorDeclarado",
    "regiao",
    "enviosMes",
  ];

  var SEGMENTOS = [
    { chave: "taxaFixa", nome: "Taxa fixa da região", cor: "var(--azul)" },
    { chave: "custoPeso", nome: "Custo por peso", cor: "var(--roxo)" },
    { chave: "seguro", nome: "Seguro", cor: "var(--ambar)" },
  ];

  var el = {};
  CAMPOS.forEach(function (id) {
    el[id] = document.getElementById(id);
  });

  var modalidade = "padrao";

  // ---------- helpers ----------

  var dinheiro = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  /** Aceita "1.234,56", "1234,56", "1234.56" e "R$ 19,90". */
  function parseNumero(texto) {
    if (typeof texto !== "string") return 0;
    var s = texto.replace(/[R$\s%]/g, "").trim();
    if (!s) return 0;

    var temVirgula = s.indexOf(",") !== -1;
    var temPonto = s.indexOf(".") !== -1;

    if (temVirgula && temPonto) s = s.replace(/\./g, "").replace(",", ".");
    else if (temVirgula) s = s.replace(",", ".");
    else if (temPonto && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");

    var n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function lerDados() {
    return {
      peso: parseNumero(el.peso.value),
      comprimento: parseNumero(el.comprimento.value),
      largura: parseNumero(el.largura.value),
      altura: parseNumero(el.altura.value),
      valorDeclarado: parseNumero(el.valorDeclarado.value),
      regiao: el.regiao.value,
      modalidade: modalidade,
    };
  }

  // ---------- render ----------

  function render() {
    var r = CalcFrete.simular(lerDados());

    document.getElementById("destaqueValor").textContent = dinheiro.format(r.total);
    document.getElementById("destaqueNota").textContent =
      r.regiaoNome + " · " + r.modalidadeNome;

    document.getElementById("mPeso").textContent =
      r.pesoConsiderado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
      " kg";
    document.getElementById("mPrazo").textContent =
      r.prazoDias + (r.prazoDias === 1 ? " dia útil" : " dias úteis");
    document.getElementById("mSeguro").textContent = dinheiro.format(r.seguro);

    renderComposicao(r);
    renderVolume(r);
    renderAviso(r);
    salvar();
  }

  function renderComposicao(r) {
    var total = SEGMENTOS.reduce(function (soma, seg) {
      return soma + r[seg.chave];
    }, 0);

    var barra = document.getElementById("barra");
    var legenda = document.getElementById("legenda");
    barra.innerHTML = "";
    legenda.innerHTML = "";

    SEGMENTOS.forEach(function (seg) {
      var valor = r[seg.chave];
      if (valor <= 0) return;
      var fatia = total > 0 ? (valor / total) * 100 : 0;

      var pedaco = document.createElement("div");
      pedaco.style.width = fatia + "%";
      pedaco.style.background = seg.cor;
      pedaco.title = seg.nome + ": " + dinheiro.format(valor);
      barra.appendChild(pedaco);

      var item = document.createElement("li");
      item.innerHTML =
        '<i style="background:' + seg.cor + '"></i>' +
        '<span class="nome">' + seg.nome + " · " + fatia.toFixed(0) + "%</span>" +
        '<span class="valor">' + dinheiro.format(valor) + "</span>";
      legenda.appendChild(item);
    });
  }

  function renderVolume(r) {
    var qtd = Math.max(0, Math.round(parseNumero(el.enviosMes.value)));
    document.getElementById("totalMes").textContent =
      dinheiro.format(r.total * qtd) + " no total";
  }

  function renderAviso(r) {
    var aviso = document.getElementById("aviso");
    if (r.usouCubagem) {
      aviso.textContent =
        "Essa caixa ocupa mais espaço do que pesa: a transportadora cobra pelo " +
        "peso cubado (" + r.pesoCubado.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) +
        " kg), não pelos " + r.pesoReal.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) +
        " kg reais. Embalagens menores reduzem o frete.";
      aviso.classList.add("visivel");
    } else {
      aviso.classList.remove("visivel");
    }
  }

  // ---------- persistência ----------

  function salvar() {
    try {
      var dados = { modalidade: modalidade };
      CAMPOS.forEach(function (id) {
        dados[id] = el[id].value;
      });
      localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch (e) {
      /* modo privado / storage bloqueado: seguir sem salvar */
    }
  }

  function restaurar() {
    try {
      var dados = JSON.parse(localStorage.getItem(CHAVE) || "null");
      if (!dados) return;
      CAMPOS.forEach(function (id) {
        if (typeof dados[id] === "string") el[id].value = dados[id];
      });
      if (CalcFrete.MODALIDADES[dados.modalidade]) trocarModalidade(dados.modalidade);
    } catch (e) {
      /* dado corrompido: ignora e usa os valores padrão */
    }
  }

  // ---------- eventos ----------

  function trocarModalidade(nova) {
    modalidade = nova;
    document.querySelectorAll(".aba").forEach(function (aba) {
      aba.setAttribute("aria-selected", String(aba.dataset.modalidade === nova));
    });
  }

  document.querySelectorAll(".aba").forEach(function (aba) {
    aba.addEventListener("click", function () {
      trocarModalidade(aba.dataset.modalidade);
      render();
    });
  });

  CAMPOS.forEach(function (id) {
    el[id].addEventListener("input", render);
    el[id].addEventListener("change", render);
  });

  document.getElementById("copiar").addEventListener("click", function (ev) {
    var r = CalcFrete.simular(lerDados());

    var texto = [
      "Frete estimado: " + dinheiro.format(r.total),
      "Destino: " + r.regiaoNome,
      "Modalidade: " + r.modalidadeNome,
      "Peso considerado: " + r.pesoConsiderado.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " kg",
      "Prazo estimado: " + r.prazoDias + (r.prazoDias === 1 ? " dia útil" : " dias úteis"),
    ].join("\n");

    var botao = ev.currentTarget;
    navigator.clipboard.writeText(texto).then(
      function () {
        botao.textContent = "Copiado";
        setTimeout(function () {
          botao.textContent = "Copiar resumo";
        }, 1500);
      },
      function () {
        botao.textContent = "Não foi possível copiar";
        setTimeout(function () {
          botao.textContent = "Copiar resumo";
        }, 1500);
      }
    );
  });

  restaurar();
  render();
})();
