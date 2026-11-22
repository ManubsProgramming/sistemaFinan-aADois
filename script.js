const STORAGE_KEY = "financas_completas_v3";

function getMesAtualISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

function somarMeses(mesISO, delta) {
  const [ano, mes] = mesISO.split("-").map(Number);
  const data = new Date(ano, mes - 1 + delta, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function diferencaMeses(mesInicioISO, mesAlvoISO) {
  const [a1, m1] = mesInicioISO.split("-").map(Number);
  const [a2, m2] = mesAlvoISO.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

function formatarMesExtenso(mesISO) {
  const [ano, mes] = mesISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, 1);
  const texto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function formatarMesCurto(mesISO) {
  const [ano, mes] = mesISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, 1);
  return data.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
}

const mesAtualPadrao = getMesAtualISO();

const estadoInicial = {
  visaoAtiva: "todos",
  mesSelecionado: mesAtualPadrao,
  pessoas: [
    { id: "p-1", nome: "Pessoa 1", papel: "Principal", salario: 2500 },
    { id: "p-2", nome: "Pessoa 2", papel: "Parceiro(a)", salario: 2500 }
  ],
  fixosMensais: [], // Prioridades recorrentes de todos os meses (ex: Aluguel)
  gastos: [],       // Gastos pontuais ou parcelados com mesInicio
  pagamentosMes: {}, // Chave `${itemId}_${mesISO}` -> true
  investimentoAtivo: true,
  aporteMensal: 400,
  pctCarro: 60
};

let estado = JSON.parse(localStorage.getItem(STORAGE_KEY)) || estadoInicial;
if (!estado.mesSelecionado) estado.mesSelecionado = mesAtualPadrao;
if (!estado.fixosMensais) estado.fixosMensais = [];
if (!estado.pagamentosMes) estado.pagamentosMes = {};
if (typeof estado.investimentoAtivo !== "boolean") estado.investimentoAtivo = true;

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

// Navegação de Meses (Março, Maio, Junho, etc.)
function renderizarBarraMeses() {
  const seletor = document.getElementById("seletor-mes");
  seletor.value = estado.mesSelecionado;

  document.getElementById("titulo-mes-despesas").textContent = formatarMesExtenso(estado.mesSelecionado);

  const atalhos = document.getElementById("atalhos-meses");
  const base = getMesAtualISO();
  const offsets = [-1, 0, 1, 2, 3, 4];

  atalhos.innerHTML = offsets
    .map((off) => {
      const m = somarMeses(base, off);
      const ativo = m === estado.mesSelecionado ? "active" : "";
      return `<button type="button" class="month-chip ${ativo}" data-mes="${m}">${formatarMesCurto(m)}</button>`;
    })
    .join("");

  atalhos.querySelectorAll(".month-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      estado.mesSelecionado = chip.dataset.mes;
      salvar();
      renderizar();
    });
  });
}

function renderizarAbasEResponsaveis() {
  const switcher = document.getElementById("perfil-switcher");
  const selectResp = document.getElementById("responsavel");
  const selectFixoResp = document.getElementById("fixo-responsavel");
  const totalPessoas = Math.max(estado.pessoas.length, 1);

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

  let optsHtml = `<option value="dividido">👥 Dividir entre todos (${totalPessoas}x)</option>`;
  estado.pessoas.forEach((p) => {
    optsHtml += `<option value="${p.id}">👤 Só ${p.nome} (${p.papel})</option>`;
  });

  const prevGasto = selectResp.value;
  const prevFixo = selectFixoResp.value;
  selectResp.innerHTML = optsHtml;
  selectFixoResp.innerHTML = optsHtml;

  if (prevGasto && [...selectResp.options].some((o) => o.value === prevGasto)) selectResp.value = prevGasto;
  if (prevFixo && [...selectFixoResp.options].some((o) => o.value === prevFixo)) selectFixoResp.value = prevFixo;
}

function renderizarListaRendas() {
  const container = document.getElementById("lista-rendas");
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

function renderizarFixosCadastrados() {
  const container = document.getElementById("lista-fixos");
  const totalPessoas = Math.max(estado.pessoas.length, 1);
  document.getElementById("contador-fixos").textContent = `${estado.fixosMensais.length} fixo(s)`;

  if (estado.fixosMensais.length === 0) {
    container.innerHTML = `<p class="muted" style="margin-bottom:0;">Nenhuma prioridade fixa cadastrada (ex.: aluguel). Adicione acima para valer todos os meses.</p>`;
    return;
  }

  container.innerHTML = estado.fixosMensais
    .map((f) => {
      const respLabel =
        f.responsavel === "dividido"
          ? `Dividido (${totalPessoas} pessoas)`
          : (getPessoaById(f.responsavel)?.nome || "Integrante");

      return `
        <div class="gasto-item" style="padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <strong>${f.descricao}</strong>
            <span class="tag tag-fixo" style="margin-left:6px;">TODO MÊS</span>
            <span class="tag tag-resp" style="margin-left:4px;">${respLabel}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <strong>${moeda(f.valor)}/mês</strong>
            <button class="btn-del" onclick="excluirFixo('${f.id}')">Excluir</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function obterDadosDoMes() {
  const mes = estado.mesSelecionado;
  const totalPessoas = Math.max(estado.pessoas.length, 1);
  const isTodos = estado.visaoAtiva === "todos";
  const pessoa = isTodos ? null : (getPessoaById(estado.visaoAtiva) || estado.pessoas[0]);

  const renda = isTodos
    ? estado.pessoas.reduce((acc, p) => acc + (Number(p.salario) || 0), 0)
    : (Number(pessoa?.salario) || 0);

  const itensDoMes = [];

  // 1. Adiciona as Prioridades Fixas (recorrentes em todos os meses)
  estado.fixosMensais.forEach((f) => {
    if (!isTodos && f.responsavel !== "dividido" && f.responsavel !== pessoa?.id) return;
    const fator = !isTodos && f.responsavel === "dividido" ? 1 / totalPessoas : 1;
    const chavePgto = `fixo_${f.id}_${mes}`;

    itensDoMes.push({
      tipo: "fixo",
      idOriginal: f.id,
      chavePgto,
      descricao: f.descricao,
      prioridade: "alta",
      valorMes: f.valor * fator,
      valorTotal: f.valor * fator,
      parcelaAtual: null,
      parcelasTotais: null,
      pagoNoMes: Boolean(estado.pagamentosMes[chavePgto]),
      labelResp:
        f.responsavel === "dividido"
          ? isTodos ? `Dividido (${totalPessoas}x)` : `Parte 1/${totalPessoas}`
          : (getPessoaById(f.responsavel)?.nome || "Integrante")
    });
  });

  // 2. Adiciona Parcelas e Gastos Avulsos que caem neste mês
  estado.gastos.forEach((g) => {
    if (!isTodos && g.responsavel !== "dividido" && g.responsavel !== pessoa?.id) return;

    const inicio = g.mesInicio || mesAtualPadrao;
    const indiceParcela = diferencaMeses(inicio, mes); // 0 = 1ª parcela

    if (indiceParcela >= 0 && indiceParcela < g.parcelasTotais) {
      const fator = !isTodos && g.responsavel === "dividido" ? 1 / totalPessoas : 1;
      const parcelaNum = indiceParcela + 1;
      const chavePgto = `gasto_${g.id}_${mes}`;

      itensDoMes.push({
        tipo: "parcela",
        idOriginal: g.id,
        chavePgto,
        descricao: g.descricao,
        prioridade: g.prioridade,
        valorMes: g.valorParcela * fator,
        valorTotal: g.valorTotal * fator,
        parcelaAtual: parcelaNum,
        parcelasTotais: g.parcelasTotais,
        mesInicio: inicio,
        pagoNoMes: Boolean(estado.pagamentosMes[chavePgto]),
        labelResp:
          g.responsavel === "dividido"
            ? isTodos ? `Dividido (${totalPessoas}x)` : `Parte 1/${totalPessoas}`
            : (getPessoaById(g.responsavel)?.nome || "Integrante")
      });
    }
  });

  const aporteBase = estado.investimentoAtivo ? estado.aporteMensal : 0;
  const aporteExibido = isTodos ? aporteBase : aporteBase / totalPessoas;

  return {
    renda,
    itensDoMes,
    aporteExibido,
    legendaRenda: isTodos ? `${estado.pessoas.length} pessoa(s)` : `${pessoa.nome} (${pessoa.papel})`,
    legendaMeta: !estado.investimentoAtivo
      ? "Investimento desativado"
      : isTodos
      ? "Meta mensal total"
      : `Parte de ${pessoa.nome} (1/${totalPessoas})`
  };
}

function atualizarConsultor(renda, itensDoMes, aporte, sobra) {
  const lista = document.getElementById("consultor-lista");
  const status = document.getElementById("status-saude");
  const mensagens = [];

  const totalBaixa = itensDoMes
    .filter((i) => i.prioridade === "baixa")
    .reduce((acc, i) => acc + i.valorMes, 0);

  if (sobra < 0) {
    status.textContent = "Atenção no Mês";
    status.style.background = "#fee2e2";
    status.style.color = "#dc2626";

    mensagens.push(
      `⚠️ Em <strong>${formatarMesExtenso(estado.mesSelecionado)}</strong>, faltam <strong>${moeda(Math.abs(sobra))}</strong> para fechar as contas${estado.investimentoAtivo ? ` com o investimento de ${moeda(aporte)}` : ""}.`
    );

    if (totalBaixa > 0) {
      mensagens.push(
        `✂️ Você tem <strong>${moeda(totalBaixa)}</strong> em gastos de <strong>Baixa Prioridade</strong> neste mês. Reduzir esses itens ajuda a fechar no azul.`
      );
    } else if (estado.investimentoAtivo) {
      mensagens.push(
        `⏸️ Como os gastos deste mês são essenciais/fixos, você pode reduzir o aporte para <strong>R$ 100,00</strong> ou desativar o investimento temporariamente.`
      );
    }
  } else if (sobra < 200) {
    status.textContent = "No Limite";
    status.style.background = "#fef3c7";
    status.style.color = "#d97706";

    mensagens.push(
      `🟡 Mês equilibrado, mas com folga curta de <strong>${moeda(sobra)}</strong>. Evite iniciar novos parcelamentos em ${formatarMesExtenso(estado.mesSelecionado)}.`
    );
  } else {
    status.textContent = "Saudável";
    status.style.background = "#dcfce7";
    status.style.color = "#16a34a";

    mensagens.push(
      `✅ Em <strong>${formatarMesExtenso(estado.mesSelecionado)}</strong>, sobram <strong>${moeda(sobra)}</strong> livres após prioridades fixas, parcelas${estado.investimentoAtivo ? " e investimento" : ""}.`
    );

    if (!estado.investimentoAtivo && sobra >= 100) {
      mensagens.push(
        `💡 Você tem folga para ativar o investimento (a partir de <strong>R$ 100,00</strong>) e acelerar o plano do carro ou da casa.`
      );
    }
  }

  const encerrando = itensDoMes.find(
    (i) => i.tipo === "parcela" && i.parcelasTotais > 1 && i.parcelaAtual === i.parcelasTotais
  );
  if (encerrando) {
    mensagens.push(
      `🎉 <strong>"${encerrando.descricao}"</strong> termina neste mês! No mês seguinte você ganha <strong>${moeda(encerrando.valorMes)}</strong> a mais de folga.`
    );
  }

  lista.innerHTML = mensagens.map((m) => `<div class="consultor-item">${m}</div>`).join("");
}

function atualizarSimulador() {
  const toggle = document.getElementById("toggle-investimento");
  const areaSim = document.getElementById("area-simulador");
  const areaSem = document.getElementById("area-sem-investimento");

  toggle.checked = estado.investimentoAtivo;
  areaSim.classList.toggle("hidden", !estado.investimentoAtivo);
  areaSem.classList.toggle("hidden", estado.investimentoAtivo);

  if (!estado.investimentoAtivo) return;

  const aporte = Math.max(100, estado.aporteMensal);
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
  renderizarBarraMeses();
  renderizarAbasEResponsaveis();
  renderizarListaRendas();
  renderizarFixosCadastrados();

  const { renda, itensDoMes, aporteExibido, legendaRenda, legendaMeta } = obterDadosDoMes();

  // Despesas totais comprometidas no mês (fixas + parcelas)
  const totalDespesasMes = itensDoMes.reduce((acc, item) => acc + item.valorMes, 0);
  const totalEmAbertoMes = itensDoMes
    .filter((i) => !i.pagoNoMes)
    .reduce((acc, item) => acc + item.valorMes, 0);

  const sobra = renda - totalDespesasMes - aporteExibido;

  document.getElementById("kpi-renda").textContent = moeda(renda);
  document.getElementById("kpi-renda-sub").textContent = legendaRenda;

  document.getElementById("kpi-gastos").textContent = moeda(totalDespesasMes);
  document.getElementById("kpi-gastos-sub").textContent = `Falta pagar no mês: ${moeda(totalEmAbertoMes)}`;

  document.getElementById("kpi-investimento").textContent = moeda(aporteExibido);
  document.getElementById("kpi-investimento-sub").textContent = legendaMeta;

  const elSobra = document.getElementById("kpi-sobra");
  const cardSobra = document.getElementById("card-sobra");
  elSobra.textContent = moeda(sobra);
  elSobra.className = `kpi-value ${sobra < 0 ? "text-danger" : "text-success"}`;
  cardSobra.classList.toggle("negative", sobra < 0);

  const container = document.getElementById("lista-gastos");
  document.getElementById("contador-itens").textContent = `${itensDoMes.length} lançamento(s)`;

  if (itensDoMes.length === 0) {
    container.innerHTML = `<p class="muted">Nenhuma despesa fixa ou parcela prevista para ${formatarMesExtenso(estado.mesSelecionado)}.</p>`;
  } else {
    container.innerHTML = itensDoMes
      .map((item) => {
        const isFixo = item.tipo === "fixo";
        const pctProgresso = isFixo
          ? (item.pagoNoMes ? 100 : 0)
          : Math.round((item.parcelaAtual / item.parcelasTotais) * 100);

        const parcelasRestantes = isFixo ? 0 : item.parcelasTotais - item.parcelaAtual;
        const saldoFuturo = parcelasRestantes * item.valorMes;

        const labelPrioridade = isFixo
          ? "Fixo Mensal"
          : item.prioridade === "alta"
          ? "Alta"
          : item.prioridade === "media"
          ? "Média"
          : "Baixa";

        return `
          <div class="gasto-item ${item.pagoNoMes ? "quitado" : ""}">
            <div class="gasto-top">
              <div>
                <strong>${item.descricao}</strong>
                <div class="tags">
                  <span class="tag ${isFixo ? "tag-fixo" : `tag-${item.prioridade}`}">${labelPrioridade}</span>
                  <span class="tag tag-resp">${item.labelResp}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <strong>${moeda(item.valorMes)}</strong>
                ${
                  !isFixo && item.parcelasTotais > 1
                    ? `<div style="font-size: 0.78rem; color: var(--muted);">Total: ${moeda(item.valorTotal)}</div>`
                    : ""
                }
              </div>
            </div>

            <div class="progress-bar">
              <div class="progress-fill" style="width: ${pctProgresso}%"></div>
            </div>

            <div class="gasto-footer">
              <span>
                ${
                  isFixo
                    ? `Conta recorrente • ${item.pagoNoMes ? "Pago neste mês" : "Pendente neste mês"}`
                    : `Parcela <strong>${item.parcelaAtual}/${item.parcelasTotais}</strong> (início ${formatarMesCurto(item.mesInicio)}) • Após este mês falta: <strong>${moeda(saldoFuturo)}</strong>`
                }
              </span>
              <div style="display: flex; gap: 6px;">
                <button
                  class="${item.pagoNoMes ? "btn-paid-badge" : "btn-pay"}"
                  onclick="alternarPagamentoMes('${item.chavePgto}')"
                >
                  ${item.pagoNoMes ? "✓ Pago no mês" : "Marcar Pago"}
                </button>
                ${
                  !isFixo
                    ? `<button class="btn-del" onclick="excluirGasto('${item.idOriginal}')">Excluir</button>`
                    : ""
                }
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  atualizarConsultor(renda, itensDoMes, aporteExibido, sobra);
  atualizarSimulador();
}

// Ações Globais
window.alternarPagamentoMes = function (chavePgto) {
  estado.pagamentosMes[chavePgto] = !estado.pagamentosMes[chavePgto];
  salvar();
  renderizar();
};

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
  estado.gastos = estado.gastos.map((g) => (g.responsavel === id ? { ...g, responsavel: "dividido" } : g));
  estado.fixosMensais = estado.fixosMensais.map((f) => (f.responsavel === id ? { ...f, responsavel: "dividido" } : f));
  if (estado.visaoAtiva === id) estado.visaoAtiva = "todos";
  salvar();
  renderizar();
};

window.excluirFixo = function (id) {
  estado.fixosMensais = estado.fixosMensais.filter((f) => f.id !== id);
  salvar();
  renderizar();
};

window.excluirGasto = function (id) {
  estado.gastos = estado.gastos.filter((g) => g.id !== id);
  salvar();
  renderizar();
};

// Eventos da Interface
document.getElementById("btn-toggle-rendas").addEventListener("click", () => {
  document.getElementById("rendas-drawer").classList.toggle("hidden");
});

document.getElementById("seletor-mes").addEventListener("change", (e) => {
  if (e.target.value) {
    estado.mesSelecionado = e.target.value;
    salvar();
    renderizar();
  }
});

document.getElementById("btn-mes-anterior").addEventListener("click", () => {
  estado.mesSelecionado = somarMeses(estado.mesSelecionado, -1);
  salvar();
  renderizar();
});

document.getElementById("btn-mes-proximo").addEventListener("click", () => {
  estado.mesSelecionado = somarMeses(estado.mesSelecionado, 1);
  salvar();
  renderizar();
});

document.getElementById("form-renda").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = document.getElementById("renda-nome").value.trim();
  const papel = document.getElementById("renda-papel").value.trim() || "Integrante";
  const salario = parseFloat(document.getElementById("renda-valor").value) || 0;
  if (!nome) return;

  estado.pessoas.push({ id: `p-${Date.now()}`, nome, papel, salario });
  salvar();
  e.target.reset();
  renderizar();
});

document.getElementById("form-fixo").addEventListener("submit", (e) => {
  e.preventDefault();
  const descricao = document.getElementById("fixo-descricao").value.trim();
  const valor = parseFloat(document.getElementById("fixo-valor").value);
  const responsavel = document.getElementById("fixo-responsavel").value;
  if (!descricao || !valor) return;

  estado.fixosMensais.push({
    id: Date.now().toString(),
    descricao,
    valor,
    responsavel
  });

  salvar();
  e.target.reset();
  renderizar();
});

// Preenche o campo "Começa a pagar em qual mês?" com o mês atual por padrão
document.getElementById("mes-inicio").value = estado.mesSelecionado;

document.getElementById("form-gasto").addEventListener("submit", (e) => {
  e.preventDefault();
  const descricao = document.getElementById("descricao").value.trim();
  const valorTotal = parseFloat(document.getElementById("valor-total").value);
  const parcelas = parseInt(document.getElementById("parcelas").value, 10);
  const mesInicio = document.getElementById("mes-inicio").value || estado.mesSelecionado;
  const prioridade = document.getElementById("prioridade").value;
  const responsavel = document.getElementById("responsavel").value;

  estado.gastos.unshift({
    id: Date.now().toString(),
    descricao,
    valorTotal,
    parcelasTotais: parcelas,
    valorParcela: valorTotal / parcelas,
    mesInicio,
    prioridade,
    responsavel
  });

  // Muda a visualização para o mês em que a compra começa a ser paga para o usuário ver na hora
  estado.mesSelecionado = mesInicio;
  salvar();
  e.target.reset();
  document.getElementById("mes-inicio").value = estado.mesSelecionado;
  renderizar();
});

document.getElementById("toggle-investimento").addEventListener("change", (e) => {
  estado.investimentoAtivo = e.target.checked;
  salvar();
  renderizar();
});

const rangeAporte = document.getElementById("range-aporte");
const rangeDivisao = document.getElementById("range-divisao");
rangeAporte.value = estado.aporteMensal;
rangeDivisao.value = estado.pctCarro;

rangeAporte.addEventListener("input", (e) => {
  estado.aporteMensal = Math.max(100, parseInt(e.target.value, 10));
  salvar();
  renderizar();
});

rangeDivisao.addEventListener("input", (e) => {
  estado.pctCarro = parseInt(e.target.value, 10);
  salvar();
  renderizar();
});

renderizar();