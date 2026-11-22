# 💑 Finanças a Dois

Sistema web leve e intuitivo para organização financeira individual e de casais, com controle de prioridades, acompanhamento de parcelas em tempo real, simulador de objetivos (como carro ou casa) e recomendações práticas de orçamento.

> **Status do projeto:** Em evolução contínua — pronto para uso local ou hospedagem estática (como GitHub Pages) com suporte a instalação como PWA no computador e no celular.

---

## ✨ Funcionalidades

* **Visões por Perfil:** Alterne rapidamente entre o total do casal ou a visão individual de cada pessoa, com edição de rendas mensais.
* **Registro de Gastos e Prioridades:** Classifique despesas em **Alta (Essencial)**, **Média (Importante)** ou **Baixa (Desejo/Lazer)** e defina se o gasto é dividido ou individual.
* **Parcelamento Inteligente:** Informe o número de parcelas e acompanhe o progresso (`parcela atual / total`), o saldo devedor restante e quanto vai sobrar no mês ao registrar o pagamento de cada parcela.
* **Simulador de Metas (Carro e Casa):** Simule aportes mensais e a divisão percentual entre objetivos de curto/médio prazo (ex.: carro) e médio/longo prazo (ex.: entrada de imóvel).
* **Consultor Financeiro:** Analisa a sobra do mês, o peso dos gastos de baixa prioridade e parcelas próximas de encerrar para sugerir ajustes práticos.
* **Persistência Local e PWA:** Salva os dados no navegador (`localStorage`) e pode ser instalado na tela inicial/área de trabalho como aplicativo.

---

## 🛠️ Tecnologias Utilizadas

* **HTML5** — Estrutura semântica da interface.
* **CSS3** — Layout responsivo, cartões, barras de progresso e temas visuais.
* **JavaScript (Vanilla JS)** — Lógica de cálculo, alternância de perfis, simulador, consultor e armazenamento local.
* **PWA (`manifest.json` + `Service Worker`)** — Experiência instalável no navegador.

---

## 🚀 Como Usar

### Opção 1: Rodar localmente no computador

1. Clone este repositório no terminal:
   ```bash
   git clone [https://github.com/ManubsProgramming/sistemaFinan-aADois.git](https://github.com/ManubsProgramming/sistemaFinan-aADois.git)
   ```
2. Acesse a pasta do projeto:
   ```bash
   cd sistemaFinan-aADois
   ```
3. Abra o arquivo `index.html` no seu navegador (ou utilize a extensão **Live Server** no VS Code).

### Opção 2: Instalar como ícone no PC ou Celular (PWA)

1. Publique o repositório em uma hospedagem HTTPS (como o **GitHub Pages**).
2. Abra o link no navegador do computador ou celular.
3. Use a opção **Instalar aplicativo** / **Adicionar à tela inicial** do navegador para criar um atalho na tela.

---

## 📂 Estrutura do Projeto

```text
sistemaFinan-aADois/
├── index.html      # Estrutura da interface e seções do sistema
├── style.css       # Estilos, grades responsivas e componentes visuais
├── script.js       # Regras de negócio, parcelas, simulador e consultor
├── manifest.json   # Configurações para instalação como aplicativo (PWA)
├── sw.js           # Cache de arquivos para melhor carregamento
└── README.md       # Documentação do projeto
```

---

## 🔒 Privacidade e Armazenamento de Dados

* Os dados inseridos (salários, gastos, parcelas e metas) são armazenados **localmente no navegador** do dispositivo utilizado (`localStorage`), sem envio automático para servidores externos.
* Limpar os dados do site no navegador apaga as informações salvas localmente.

---

## 🤝 Contribuição e Melhorias Futuras

Sugestões, melhorias e correções são bem-vindas! Algumas evoluções possíveis para o projeto:

* Sincronização em nuvem entre múltiplos dispositivos.
* Exportação e importação de dados em JSON/CSV.
* Relatórios mensais detalhados por categoria e prioridade.

---

## 📄 Licença

Este projeto é distribuído para fins educacionais e de uso pessoal. Sinta-se à vontade para explorar, adaptar e melhorar.