/* Liga o formulário ao núcleo de cálculo (assets/calc.js). */
(function () {
  "use strict";

  var CHAVE = "calculadora-margem:v1";

  var CAMPOS = [
    "custoProduto",
    "frete",
    "embalagem",
    "outros",
    "taxaMarketplace",
    "imposto",
    "margemDesejada",
    "precoVenda",
    "vendasMes",
  ];

  // Ordem da fita: custos em cinzas graduados, lucro em tinta cheia.
  var SEGMENTOS = [
    { chave: "produto", nome: "Produto", cor: "var(--c1)" },
    { chave: "frete", nome: "Frete", cor: "var(--c2)" },
    { chave: "extras", nome: "Embalagem e outros", cor: "var(--c3)" },
    { chave: "taxa", nome: "Taxa do canal", cor: "var(--c4)" },
    { chave: "imposto", nome: "Imposto", cor: "var(--c5)" },
    { chave: "lucro", nome: "Seu lucro", cor: "var(--tinta)" },
  ];

  var el = {};
  CAMPOS.forEach(function (id) {
    el[id] = document.getElementById(id);
  });

  var modo = "margem";

  // ---------- helpers ----------

  var dinheiro = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function porcento(v) {
    return v.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + "%";
  }

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

  function lerCustos() {
    return {
      custoProduto: parseNumero(el.custoProduto.value),
      frete: parseNumero(el.frete.value),
      embalagem: parseNumero(el.embalagem.value),
      outros: parseNumero(el.outros.value),
      taxaMarketplace: parseNumero(el.taxaMarketplace.value),
      imposto: parseNumero(el.imposto.value),
    };
  }

  // ---------- render ----------

  function render() {
    var custos = lerCustos();
    var r;

    if (modo === "margem") {
      r = Calc.precoParaMargem(custos, parseNumero(el.margemDesejada.value));
      if (!r.possivel) return renderImpossivel(r.motivo);
      mostrarDestaque(
        "Preço de venda necessário",
        dinheiro.format(r.preco),
        false
      );
    } else {
      r = Calc.analisar(custos, parseNumero(el.precoVenda.value));
      mostrarDestaque(
        r.lucro >= 0 ? "Sobra para você" : "Prejuízo por venda",
        dinheiro.format(r.lucro),
        r.lucro < 0
      );
    }

    var minimo = Calc.precoMinimo(custos);
    document.getElementById("destaqueNota").textContent =
      minimo === null
        ? "Taxa + imposto consomem toda a venda."
        : "Abaixo de " + dinheiro.format(minimo) + " você vende no prejuízo.";

    document.getElementById("mLucro").textContent = dinheiro.format(r.lucro);
    document.getElementById("mMargem").textContent = porcento(r.margem);
    document.getElementById("mMarkup").textContent =
      r.markup.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "x";

    renderComposicao(r);
    renderVolume(r);
    renderAviso(r);
    salvar();
  }

  function mostrarDestaque(rotulo, valor, negativo) {
    document.getElementById("destaqueRotulo").textContent = rotulo;
    var alvo = document.getElementById("destaqueValor");
    alvo.textContent = valor;
    alvo.classList.toggle("negativo", !!negativo);
  }

  function renderImpossivel(motivo) {
    mostrarDestaque("Combinação impossível", "—", true);
    document.getElementById("destaqueNota").textContent = "Ajuste os números ao lado.";
    ["mLucro", "mMargem", "mMarkup"].forEach(function (id) {
      document.getElementById(id).textContent = "—";
    });
    document.getElementById("barra").innerHTML = "";
    document.getElementById("legenda").innerHTML = "";
    document.getElementById("lucroMes").textContent = "—";
    var aviso = document.getElementById("aviso");
    aviso.textContent = motivo;
    aviso.classList.add("visivel");
  }

  function renderComposicao(r) {
    var total = Object.keys(r.composicao).reduce(function (soma, k) {
      return soma + r.composicao[k];
    }, 0);

    var barra = document.getElementById("barra");
    var legenda = document.getElementById("legenda");
    barra.innerHTML = "";
    legenda.innerHTML = "";

    SEGMENTOS.forEach(function (seg) {
      var valor = r.composicao[seg.chave];
      if (valor <= 0) return;
      var fatia = total > 0 ? (valor / total) * 100 : 0;

      var pedaco = document.createElement("div");
      pedaco.style.width = fatia + "%";
      pedaco.style.background = seg.cor;
      pedaco.title = seg.nome + ": " + dinheiro.format(valor);
      barra.appendChild(pedaco);

      var linha = document.createElement("div");
      linha.className = "linha" + (seg.chave === "lucro" ? " linha-lucro" : "");
      linha.innerHTML =
        '<span class="marca" style="background:' + seg.cor + '"></span>' +
        "<dt>" + seg.nome + "</dt>" +
        '<span class="parte">' + fatia.toFixed(0) + "%</span>" +
        "<dd>" + dinheiro.format(valor) + "</dd>";
      legenda.appendChild(linha);
    });
  }

  function renderVolume(r) {
    var qtd = Math.max(0, Math.round(parseNumero(el.vendasMes.value)));
    var alvo = document.getElementById("lucroMes");
    alvo.textContent = dinheiro.format(r.lucro * qtd);
    alvo.style.color = r.lucro < 0 ? "var(--vermelho)" : "";
  }

  function renderAviso(r) {
    var aviso = document.getElementById("aviso");
    if (r.lucro < 0) {
      aviso.textContent =
        "Nesse preço você perde " + dinheiro.format(Math.abs(r.lucro)) +
        " a cada venda. Quanto mais vender, mais perde.";
      aviso.classList.add("visivel");
    } else if (r.margem > 0 && r.margem < 5) {
      aviso.textContent =
        "Margem de " + porcento(r.margem) +
        ": qualquer devolução ou troca apaga o lucro de várias vendas.";
      aviso.classList.add("visivel");
    } else {
      aviso.classList.remove("visivel");
    }
  }

  // ---------- persistência ----------

  function salvar() {
    try {
      var dados = { modo: modo };
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
      if (dados.modo === "preco" || dados.modo === "margem") trocarModo(dados.modo);
      document.getElementById("margemSlider").value =
        parseNumero(el.margemDesejada.value);
    } catch (e) {
      /* dado corrompido: ignora e usa os valores padrão */
    }
  }

  // ---------- eventos ----------

  function trocarModo(novo) {
    modo = novo;
    document.querySelectorAll(".alternador-opcao").forEach(function (opcao) {
      opcao.setAttribute("aria-selected", String(opcao.dataset.modo === novo));
    });
    document.getElementById("bloco-margem").hidden = novo !== "margem";
    document.getElementById("bloco-preco").hidden = novo !== "preco";
  }

  document.querySelectorAll(".alternador-opcao").forEach(function (opcao) {
    opcao.addEventListener("click", function () {
      trocarModo(opcao.dataset.modo);
      render();
    });
  });

  document.querySelectorAll(".atalho").forEach(function (botao) {
    botao.addEventListener("click", function () {
      var alvo = botao.closest(".atalhos").dataset.alvo;
      el[alvo].value = botao.dataset.valor.replace(".", ",");
      render();
    });
  });

  var slider = document.getElementById("margemSlider");
  slider.addEventListener("input", function () {
    el.margemDesejada.value = slider.value;
    render();
  });

  el.margemDesejada.addEventListener("input", function () {
    slider.value = parseNumero(el.margemDesejada.value);
  });

  CAMPOS.forEach(function (id) {
    el[id].addEventListener("input", render);
  });

  document.getElementById("copiar").addEventListener("click", function (ev) {
    var custos = lerCustos();
    var r =
      modo === "margem"
        ? Calc.precoParaMargem(custos, parseNumero(el.margemDesejada.value))
        : Calc.analisar(custos, parseNumero(el.precoVenda.value));

    if (r.possivel === false) return;

    var texto = [
      "Preço de venda: " + dinheiro.format(r.preco),
      "Custos diretos: " + dinheiro.format(r.custosDiretos),
      "Taxa do canal: " + dinheiro.format(r.taxa),
      "Imposto: " + dinheiro.format(r.imposto),
      "Lucro por venda: " + dinheiro.format(r.lucro) + " (" + porcento(r.margem) + ")",
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
