const STORAGE_KEY = "financas_dinamicas_v2";

const estadoInicial = {
  visaoAtiva: "todos", // "todos" ou o id de uma pessoa cadastrada
  pessoas: [
    { id: "p-1", nome: "Pessoa 1", papel: "Principal", salario: 2500 },
    { id: "p-2", nome: "Pessoa 2", papel: "Parceiro(a)", salario: 2500 }
  ],
  aporteMensal: 400,
  pctCarro: 60,
  gastos: []
};

let estado = JSON.parse(localStorage.getItem(STORAGE_KEY)) || estadoInicial;

function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function moeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcularJurosCompostos(aporte, meses, taxaMensal = 0.0085) {
  if (aporte <= 0) return 0;
  return aporte * ((Math.pow(1 + taxaMensal, meses) - 1) / taxaMensal);
}

function getPessoaById(id) {
  return estado.pessoas.find((p) => p.id === id);
}

function renderizarAbasEResponsaveis() {
  const switcher = document.getElementById("perfil-switcher");
  const selectResp = document.getElementById("responsavel");
  const respAnterior = selectResp.value;

  const totalPessoas = Math.max(estado.pessoas.length, 1);

  // Abas no topo
  let tabsHtml = `<button class="tab-btn ${estado.visaoAtiva === "todos" ? "active" : ""}" data-visao="todos">Todos (Total)</button>`;
  estado.pessoas.forEach((p) => {
    const ativa = estado.visaoAtiva === p.id ? "active" : "";
    tabsHtml += `<button class="tab-btn ${ativa}" data-visao="${p.id}">${p.nome} <small style="opacity:0.7;">(${p.papel})</small></button>`;
  });
  switcher.innerHTML = tabsHtml;

  switcher.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      estado.visaoAtiva = btn.dataset.visao;
      salvar();
      renderizar();
    });
  });

  // Select de responsável no formulário de gastos
  let optsHtml = `<option value="dividido">👥 Dividir igualmente entre todos (${totalPessoas}x)</option>`;
  estado.pessoas.forEach((p) => {
    optsHtml += `<option value="${p.id}">👤 Só ${p.nome} (${p.papel})</option>`;
  });
  selectResp.innerHTML = optsHtml;

  if (respAnterior && [...selectResp.options].some((o) => o.value === respAnterior)) {
    selectResp.value = respAnterior;
  }
}

function renderizarListaRendas() {
  const container = document.getElementById("lista-rendas");

  if (estado.pessoas.length === 0) {
    container.innerHTML = `<p class="muted">Nenhuma pessoa/renda cadastrada. Adicione alguém acima.</p>`;
    return;
  }

  container.innerHTML = estado.pessoas
    .map(
      (p) => `
      <div class="gasto-item" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:8px; padding:10px 14px;">
        <div>
          <strong>${p.nome}</strong>
          <span class="tag tag-resp" style="margin-left:6px;">${p.papel}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <input
            type="number"
            step="0.01"
            min="0"
            value="${p.salario}"
            aria-label="Salário de ${p.nome}"
            style="width:130px; padding:6px 10px;"
            onchange="atualizarSalarioPessoa('${p.id}', this.value)"
          />
          ${
            estado.pessoas.length > 1
              ? `<button class="btn-del" onclick="removerPessoa('${p.id}')">Remover</button>`
              : ""
          }
        </div>
      </div>
    `
    )
    .join("");
}

function obterVisao() {
  const totalPessoas = Math.max(estado.pessoas.length, 1);

  if (estado.visaoAtiva === "todos") {
    const renda = estado.pessoas.reduce((acc, p) => acc + (Number(p.salario) || 0), 0);
    const gastosVisiveis = estado.gastos.map((g) => ({
      ...g,
      parcelaExibida: g.valorParcela,
      totalExibido: g.valorTotal,
      labelResponsavel:
        g.responsavel === "dividido"
          ? `Dividido (${totalPessoas} pessoas)`
          : (getPessoaById(g.responsavel)?.nome || "Pessoa removida")
    }));

    return {
      renda,
      gastosVisiveis,
      aporteExibido: estado.aporteMensal,
      legendaRenda: `${estado.pessoas.length} pessoa(s) somada(s)`,
      legendaMeta: "Meta mensal total"
    };
  }

  const pessoa = getPessoaById(estado.visaoAtiva) || estado.pessoas[0];
  const renda = pessoa ? Number(pessoa.salario) || 0 : 0;

  const gastosVisiveis = estado.gastos
    .filter((g) => g.responsavel === "dividido" || g.responsavel === pessoa?.id)
    .map((g) => {
      const fator = g.responsavel === "dividido" ? 1 / totalPessoas : 1;
      return {
        ...g,
        parcelaExibida: g.valorParcela * fator,
        totalExibido: g.valorTotal * fator,
        labelResponsavel:
          g.responsavel === "dividido"
            ? `Parte de ${pessoa.nome} (1/${totalPessoas})`
            : `Só ${pessoa.nome}`
      };
    });

  return {
    renda,
    gastosVisiveis,
    aporteExibido: estado.aporteMensal / totalPessoas,
    legendaRenda: `${pessoa.nome} • ${pessoa.papel}`,
    legendaMeta: `Parte de ${pessoa.nome} (1/${totalPessoas})`
  };
}

function atualizarConsultor(renda, gastosAtivos, aporte, sobra) {
  const lista = document.getElementById("consultor-lista");
  const status = document.getElementById("status-saude");
  const mensagens = [];

  const totalBaixa = gastosAtivos
    .filter((g) => g.prioridade === "baixa")
    .reduce((acc, g) => acc + g.parcelaExibida, 0);

  if (sobra < 0) {
    status.textContent = "Atenção";
    status.style.background = "#fee2e2";
    status.style.color = "#dc2626";

    mensagens.push(
      `⚠️ <strong>Faltam ${moeda(Math.abs(sobra))}</strong> para fechar esta visão reservando ${moeda(aporte)}.`
    );

    if (totalBaixa > 0) {
      mensagens.push(
        `✂️ Há <strong>${moeda(totalBaixa)}/mês</strong> em gastos de <strong>Baixa Prioridade</strong>. Cortar ou segurar esses itens ajuda a equilibrar.`
      );
    } else {
      mensagens.push(
        `📉 Se os gastos são prioritários, ajuste o aporte mensal para algo entre <strong>R$ 300 e R$ 500</strong> conforme a folga.`
      );
    }
  } else if (sobra < 250) {
    status.textContent = "No Limite";
    status.style.background = "#fef3c7";
    status.style.color = "#d97706";

    mensagens.push(
      `🟡 Você cobre o aporte de <strong>${moeda(aporte)}</strong>, mas sobram apenas <strong>${moeda(sobra)}</strong>. Evite novas parcelas agora.`
    );
  } else {
    status.textContent = "Saudável";
    status.style.background = "#dcfce7";
    status.style.color = "#16a34a";

    mensagens.push(
      `✅ Ótimo ritmo! Reservando <strong>${moeda(aporte)}/mês</strong>, ainda sobram <strong>${moeda(sobra)}</strong>.`
    );
  }

  const pertoDeQuitar = gastosAtivos.find(
    (g) => g.parcelasTotais > 1 && g.parcelasTotais - g.parcelaAtual <= 1
  );
  if (pertoDeQuitar) {
    mensagens.push(
      `🎉 <strong>"${pertoDeQuitar.descricao}"</strong> está na última parcela! Ao quitar, você libera <strong>${moeda(pertoDeQuitar.parcelaExibida)}/mês</strong>.`
    );
  }

  lista.innerHTML = mensagens.map((m) => `<div class="consultor-item">${m}</div>`).join("");
}

function atualizarSimulador() {
  const aporte = estado.aporteMensal;
  const pctCarro = estado.pctCarro;
  const pctCasa = 100 - pctCarro;

  const valorCarro = (aporte * pctCarro) / 100;
  const valorCasa = (aporte * pctCasa) / 100;

  document.getElementById("label-aporte").textContent = moeda(aporte);
  document.getElementById("pct-carro").textContent = `${pctCarro}%`;
  document.getElementById("pct-casa").textContent = `${pctCasa}%`;

  document.getElementById("valor-mes-carro").textContent = `${moeda(valorCarro)}/mês`;
  document.getElementById("valor-mes-casa").textContent = `${moeda(valorCasa)}/mês`;

  document.getElementById("carro-1a").textContent = moeda(calcularJurosCompostos(valorCarro, 12));
  document.getElementById("carro-3a").textContent = moeda(calcularJurosCompostos(valorCarro, 36));

  document.getElementById("casa-2a").textContent = moeda(calcularJurosCompostos(valorCasa, 24));
  document.getElementById("casa-5a").textContent = moeda(calcularJurosCompostos(valorCasa, 60));
}

function renderizar() {
  renderizarAbasEResponsaveis();
  renderizarListaRendas();

  const { renda, gastosVisiveis, aporteExibido, legendaRenda, legendaMeta } = obterVisao();
  const ativos = gastosVisiveis.filter((g) => !g.quitado);
  const totalParcelasMes = ativos.reduce((acc, g) => acc + g.parcelaExibida, 0);
  const sobra = renda - totalParcelasMes - aporteExibido;

  document.getElementById("kpi-renda").textContent = moeda(renda);
  document.getElementById("kpi-renda-sub").textContent = legendaRenda;

  document.getElementById("kpi-gastos").textContent = moeda(totalParcelasMes);
  document.getElementById("kpi-gastos-sub").textContent = `${ativos.length} conta(s) ativa(s) no mês`;

  document.getElementById("kpi-investimento").textContent = moeda(aporteExibido);
  document.getElementById("kpi-investimento-sub").textContent = legendaMeta;

  const elSobra = document.getElementById("kpi-sobra");
  const cardSobra = document.getElementById("card-sobra");
  elSobra.textContent = moeda(sobra);
  elSobra.className = `kpi-value ${sobra < 0 ? "text-danger" : "text-success"}`;
  cardSobra.classList.toggle("negative", sobra < 0);

  const container = document.getElementById("lista-gastos");
  document.getElementById("contador-itens").textContent = `${gastosVisiveis.length} itens`;

  if (gastosVisiveis.length === 0) {
    container.innerHTML = `<p class="muted">Nenhum gasto registrado nesta visão.</p>`;
  } else {
    container.innerHTML = gastosVisiveis
      .map((item) => {
        const pctProgresso = item.quitado
          ? 100
          : Math.round(((item.parcelaAtual - 1) / item.parcelasTotais) * 100);
        const parcelasFaltando = item.quitado ? 0 : item.parcelasTotais - item.parcelaAtual + 1;
        const saldoDevedor = parcelasFaltando * item.parcelaExibida;

        const labelPrioridade =
          item.prioridade === "alta" ? "Alta" : item.prioridade === "media" ? "Média" : "Baixa";

        return `
          <div class="gasto-item ${item.quitado ? "quitado" : ""}">
            <div class="gasto-top">
              <div>
                <strong>${item.descricao}</strong>
                <div class="tags">
                  <span class="tag tag-${item.prioridade}">${labelPrioridade}</span>
                  <span class="tag tag-resp">${item.labelResponsavel}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <strong>${moeda(item.parcelaExibida)}/mês</strong>
                <div style="font-size: 0.78rem; color: var(--muted);">Total: ${moeda(item.totalExibido)}</div>
              </div>
            </div>

            <div class="progress-bar">
              <div class="progress-fill" style="width: ${pctProgresso}%"></div>
            </div>

            <div class="gasto-footer">
              <span>
                ${
                  item.quitado
                    ? "✅ Totalmente quitado!"
                    : `Parcela <strong>${item.parcelaAtual}/${item.parcelasTotais}</strong> • Falta pagar: <strong>${moeda(saldoDevedor)}</strong>`
                }
              </span>
              <div style="display: flex; gap: 6px;">
                ${
                  !item.quitado
                    ? `<button class="btn-pay" onclick="pagarParcela('${item.id}')">✓ Pagar Parcela</button>`
                    : ""
                }
                <button class="btn-del" onclick="excluirGasto('${item.id}')">Excluir</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  atualizarConsultor(renda, ativos, aporteExibido, sobra);
  atualizarSimulador();
}

// Ações globais
window.atualizarSalarioPessoa = function (id, novoValor) {
  const pessoa = getPessoaById(id);
  if (!pessoa) return;
  pessoa.salario = parseFloat(novoValor) || 0;
  salvar();
  renderizar();
};

window.removerPessoa = function (id) {
  if (estado.pessoas.length <= 1) return;
  estado.pessoas = estado.pessoas.filter((p) => p.id !== id);
  estado.gastos = estado.gastos.map((g) =>
    g.responsavel === id ? { ...g, responsavel: "dividido" } : g
  );
  if (estado.visaoAtiva === id) {
    estado.visaoAtiva = "todos";
  }
  salvar();
  renderizar();
};

window.pagarParcela = function (id) {
  const g = estado.gastos.find((item) => item.id === id);
  if (!g || g.quitado) return;

  if (g.parcelaAtual < g.parcelasTotais) {
    g.parcelaAtual += 1;
  } else {
    g.quitado = true;
  }
  salvar();
  renderizar();
};

window.excluirGasto = function (id) {
  estado.gastos = estado.gastos.filter((item) => item.id !== id);
  salvar();
  renderizar();
};

// Eventos de formulário e controles
document.getElementById("btn-toggle-rendas").addEventListener("click", () => {
  document.getElementById("rendas-drawer").classList.toggle("hidden");
});

document.getElementById("form-renda").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = document.getElementById("renda-nome").value.trim();
  const papel = document.getElementById("renda-papel").value.trim() || "Integrante";
  const salario = parseFloat(document.getElementById("renda-valor").value) || 0;

  if (!nome) return;

  estado.pessoas.push({
    id: `p-${Date.now()}`,
    nome,
    papel,
    salario
  });

  salvar();
  e.target.reset();
  renderizar();
});

const rangeAporte = document.getElementById("range-aporte");
const rangeDivisao = document.getElementById("range-divisao");
rangeAporte.value = estado.aporteMensal;
rangeDivisao.value = estado.pctCarro;

rangeAporte.addEventListener("input", (e) => {
  estado.aporteMensal = parseInt(e.target.value, 10);
  salvar();
  renderizar();
});

rangeDivisao.addEventListener("input", (e) => {
  estado.pctCarro = parseInt(e.target.value, 10);
  salvar();
  renderizar();
});

document.getElementById("form-gasto").addEventListener("submit", (e) => {
  e.preventDefault();
  const descricao = document.getElementById("descricao").value.trim();
  const valorTotal = parseFloat(document.getElementById("valor-total").value);
  const parcelas = parseInt(document.getElementById("parcelas").value, 10);
  const prioridade = document.getElementById("prioridade").value;
  const responsavel = document.getElementById("responsavel").value;

  estado.gastos.unshift({
    id: Date.now().toString(),
    descricao,
    valorTotal,
    parcelasTotais: parcelas,
    parcelaAtual: 1,
    valorParcela: valorTotal / parcelas,
    prioridade,
    responsavel,
    quitado: false
  });

  salvar();
  e.target.reset();
  renderizar();
});

renderizar();