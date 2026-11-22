const STORAGE_KEY = "financas_a_dois_prototipo_v1";

const estadoInicial = {
  perfilAtivo: "casal",
  salarios: {
    manuela: 2500,
    wendel: 2500
  },
  aporteMensal: 400,
  pctCarro: 60,
  gastos: [
    {
      id: "1",
      descricao: "Mercado do Mês",
      valorTotal: 800,
      parcelasTotais: 1,
      parcelaAtual: 1,
      valorParcela: 800,
      prioridade: "alta",
      responsavel: "casal",
      quitado: false
    },
    {
      id: "2",
      descricao: "Notebook / Estudos",
      valorTotal: 2400,
      parcelasTotais: 12,
      parcelaAtual: 3,
      valorParcela: 200,
      prioridade: "media",
      responsavel: "manuela",
      quitado: false
    }
  ]
};

let estado = JSON.parse(localStorage.getItem(STORAGE_KEY)) || estadoInicial;

function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function moeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Cálculo de juros compostos mensal (aprox. 0.85% a.m. ~ 10.7% a.a. líquido)
function calcularJurosCompostos(aporte, meses, taxaMensal = 0.0085) {
  if (aporte <= 0) return 0;
  return aporte * ((Math.pow(1 + taxaMensal, meses) - 1) / taxaMensal);
}

function obterVisaoPerfil() {
  const p = estado.perfilAtivo;
  const renda =
    p === "casal"
      ? estado.salarios.manuela + estado.salarios.wendel
      : estado.salarios[p];

  const gastosVisiveis = estado.gastos
    .filter((g) => p === "casal" || g.responsavel === p || g.responsavel === "casal")
    .map((g) => {
      const divisor = p !== "casal" && g.responsavel === "casal" ? 0.5 : 1;
      return {
        ...g,
        parcelaPerfil: g.valorParcela * divisor,
        totalPerfil: g.valorTotal * divisor
      };
    });

  const aportePerfil = p === "casal" ? estado.aporteMensal : estado.aporteMensal / 2;
  return { renda, gastosVisiveis, aportePerfil };
}

function atualizarConsultor(renda, gastosAtivos, aporte, sobra) {
  const lista = document.getElementById("consultor-lista");
  const status = document.getElementById("status-saude");
  const mensagens = [];

  const gastosBaixa = gastosAtivos.filter((g) => g.prioridade === "baixa");
  const somaBaixa = gastosBaixa.reduce((acc, g) => acc + g.parcelaPerfil, 0);

  if (sobra < 0) {
    status.textContent = "Atenção no Orçamento";
    status.style.background = "#fee2e2";
    status.style.color = "#dc2626";

    mensagens.push(
      `⚠️ <strong>Faltam ${moeda(Math.abs(sobra))}</strong> para fechar o mês investindo ${moeda(aporte)}.`
    );

    if (somaBaixa > 0) {
      mensagens.push(
        `✂️ Você tem <strong>${moeda(somaBaixa)}/mês</strong> em gastos de <strong>Baixa Prioridade</strong>. Reduzir ou evitar novos gastos nessa categoria já equilibra as contas.`
      );
    } else {
      mensagens.push(
        `📉 Como suas contas atuais são essenciais, ajuste o aporte temporariamente para <strong>R$ 300,00</strong> até quitar a parcela mais próxima.`
      );
    }
  } else if (sobra < 250) {
    status.textContent = "No Limite";
    status.style.background = "#fef3c7";
    status.style.color = "#d97706";

    mensagens.push(
      `🟡 Você consegue investir <strong>${moeda(aporte)}</strong>, mas a folga é de apenas <strong>${moeda(sobra)}</strong>. Evite parcelamentos novos este mês.`
    );
  } else {
    status.textContent = "Saudável";
    status.style.background = "#dcfce7";
    status.style.color = "#16a34a";

    mensagens.push(
      `✅ Excelente! Mesmo investindo <strong>${moeda(aporte)}/mês</strong>, ainda sobram <strong>${moeda(sobra)}</strong> livres.`
    );

    if (estado.aporteMensal < 500 && sobra >= 150) {
      mensagens.push(
        `🚀 Há espaço no orçamento para subir o investimento do casal para <strong>R$ 500,00/mês</strong> e antecipar o carro ou a entrada da casa.`
      );
    }
  }

  // Dica sobre maior parcela próxima de acabar
  const pertoDeQuitar = gastosAtivos.find(
    (g) => g.parcelasTotais > 1 && g.parcelasTotais - g.parcelaAtual <= 1
  );
  if (pertoDeQuitar) {
    mensagens.push(
      `🎉 <strong>Alívio próximo:</strong> "${pertoDeQuitar.descricao}" está na reta final! Quando quitar, você libera mais <strong>${moeda(pertoDeQuitar.parcelaPerfil)}/mês</strong>.`
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
  const { renda, gastosVisiveis, aportePerfil } = obterVisaoPerfil();
  const ativos = gastosVisiveis.filter((g) => !g.quitado);
  const totalParcelasMes = ativos.reduce((acc, g) => acc + g.parcelaPerfil, 0);
  const sobra = renda - totalParcelasMes - aportePerfil;

  // KPIs
  document.getElementById("kpi-renda").textContent = moeda(renda);
  document.getElementById("kpi-renda-sub").textContent =
    estado.perfilAtivo === "casal" ? "Manuela + Wendel" : "Salário individual";

  document.getElementById("kpi-gastos").textContent = moeda(totalParcelasMes);
  document.getElementById("kpi-gastos-sub").textContent = `${ativos.length} conta(s) ativa(s) no mês`;

  document.getElementById("kpi-investimento").textContent = moeda(aportePerfil);

  const elSobra = document.getElementById("kpi-sobra");
  const cardSobra = document.getElementById("card-sobra");
  elSobra.textContent = moeda(sobra);
  elSobra.className = `kpi-value ${sobra < 0 ? "text-danger" : "text-success"}`;
  cardSobra.classList.toggle("negative", sobra < 0);

  // Abas ativas
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.perfil === estado.perfilAtivo);
  });

  // Lista de gastos
  const container = document.getElementById("lista-gastos");
  document.getElementById("contador-itens").textContent = `${gastosVisiveis.length} itens`;

  if (gastosVisiveis.length === 0) {
    container.innerHTML = `<p class="muted">Nenhum gasto registrado neste perfil.</p>`;
  } else {
    container.innerHTML = gastosVisiveis
      .map((item) => {
        const pctProgresso = item.quitado
          ? 100
          : Math.round(((item.parcelaAtual - 1) / item.parcelasTotais) * 100);
        const parcelasFaltando = item.quitado ? 0 : item.parcelasTotais - item.parcelaAtual + 1;
        const saldoDevedor = parcelasFaltando * item.parcelaPerfil;

        const labelPrioridade =
          item.prioridade === "alta" ? "Alta" : item.prioridade === "media" ? "Média" : "Baixa";
        const labelResp =
          item.responsavel === "casal"
            ? "Casal 50/50"
            : item.responsavel === "manuela"
            ? "Manuela"
            : "Wendel";

        return `
          <div class="gasto-item ${item.quitado ? "quitado" : ""}">
            <div class="gasto-top">
              <div>
                <strong>${item.descricao}</strong>
                <div class="tags">
                  <span class="tag tag-${item.prioridade}">${labelPrioridade}</span>
                  <span class="tag tag-resp">${labelResp}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <strong>${moeda(item.parcelaPerfil)}/mês</strong>
                <div style="font-size: 0.78rem; color: var(--muted);">Total: ${moeda(item.totalPerfil)}</div>
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

  atualizarConsultor(renda, ativos, aportePerfil, sobra);
  atualizarSimulador();
}

// Eventos
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

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    estado.perfilAtivo = btn.dataset.perfil;
    salvar();
    renderizar();
  });
});

document.getElementById("btn-toggle-salarios").addEventListener("click", () => {
  document.getElementById("salarios-drawer").classList.toggle("hidden");
});

const inputManuela = document.getElementById("sal-manuela");
const inputWendel = document.getElementById("sal-wendel");
inputManuela.value = estado.salarios.manuela;
inputWendel.value = estado.salarios.wendel;

inputManuela.addEventListener("input", (e) => {
  estado.salarios.manuela = parseFloat(e.target.value) || 0;
  salvar();
  renderizar();
});

inputWendel.addEventListener("input", (e) => {
  estado.salarios.wendel = parseFloat(e.target.value) || 0;
  salvar();
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

// Inicializar
renderizar();