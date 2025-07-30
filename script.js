// Configurações da aplicação
const CONFIG = {
  apiBCB: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json',
  fallbackCDI: 0.05,
  diasUteisAno: 252,
  bancos: [
    { nome: 'Nubank', percentual: 100, logo: 'NU' },
    { nome: 'Itaú', percentual: 98, logo: 'IT' },
    { nome: 'Bradesco', percentual: 97, logo: 'BR' },
    { nome: 'Santander', percentual: 99, logo: 'SA' },
    { nome: 'Inter', percentual: 102, logo: 'IN' },
    { nome: 'C6 Bank', percentual: 101, logo: 'C6' },
    { nome: 'BTG Pactual', percentual: 105, logo: 'BT' },
    { nome: 'XP Investimentos', percentual: 108, logo: 'XP' },
    { nome: 'Mercado Livre', percentual: 110, logo: 'ML', especial: true }
  ]
};

// Estado da aplicação
const state = {
  cdi: {
    diario: 0.05,
    anual: 12.65,
    data: '26/07/2025'
  },
  chart: null,
  history: [],
  theme: 'dark'
};

// Elementos DOM
const DOM = {
  cdiDiario: document.getElementById('cdiDiario'),
  cdiAnual: document.getElementById('cdiAnual'),
  cdiData: document.getElementById('cdiData'),
  themeToggle: document.getElementById('themeToggle'),
  btnCalcular: document.getElementById('btnCalcular'),
  btnLimpar: document.getElementById('btnLimpar'),
  btnSalvar: document.getElementById('btnSalvar'),
  resultado: document.getElementById('resultado'),
  chartCanvas: document.getElementById('rendimentoChart'),
  comparisonContainer: document.getElementById('comparisonContainer'),
  historyContainer: document.getElementById('historyContainer'),
  notification: document.getElementById('notification'),
  currentYear: document.getElementById('current-year'),
  proximaAtualizacao: document.getElementById('proximaAtualizacao')
};

// Formatar moeda
const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);
};

// Formatar porcentagem
const formatarPorcentagem = (valor, casas = 2) => {
  return valor.toFixed(casas) + '%';
};

// Mostrar notificação
const showNotification = (title, message, isError = false) => {
  const notification = DOM.notification;
  notification.querySelector('.notification-title').textContent = title;
  notification.querySelector('.notification-message').textContent = message;
  notification.classList.toggle('error', isError);
  notification.querySelector('i').className = isError ? 
    'fas fa-exclamation-circle' : 'fas fa-check-circle';
  
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
};

// Carregar histórico do localStorage
const loadHistory = () => {
  const savedHistory = localStorage.getItem('cdiHistory');
  if (savedHistory) {
    state.history = JSON.parse(savedHistory);
    renderHistory();
  }
};

// Salvar histórico no localStorage
const saveHistory = () => {
  localStorage.setItem('cdiHistory', JSON.stringify(state.history));
};

// Renderizar histórico
const renderHistory = () => {
  if (!state.history.length) {
    DOM.historyContainer.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--texto-secundario);">
        <i class="fas fa-history" style="font-size: 3rem; margin-bottom: 15px;"></i>
        <p>Nenhuma simulação salva</p>
      </div>
    `;
    return;
  }

  let html = '';
  state.history.slice(0, 5).forEach(item => {
    html += `
      <div class="history-item">
        <div>
          <div class="history-value">${formatarMoeda(item.valorFinal)}</div>
          <div class="history-details">${item.valorInicial} | ${item.meses} meses | ${item.percentual}% CDI</div>
        </div>
        <div class="history-details">${item.data}</div>
      </div>
    `;
  });
  DOM.historyContainer.innerHTML = html;
};

// Renderizar comparação de bancos
const renderBankComparison = () => {
  const valorBase = parseFloat(document.getElementById('valor').value) || 10000;
  const mesesBase = parseInt(document.getElementById('meses').value) || 12;
  
  let html = '';
  
  CONFIG.bancos.forEach(banco => {
    const taxaAnual = (state.cdi.anual * banco.percentual / 100);
    const taxaMensal = Math.pow(1 + taxaAnual/100, 1/12) - 1;
    const rendimento = valorBase * Math.pow(1 + taxaMensal, mesesBase) - valorBase;
    const valorFinal = valorBase + rendimento;
    
    html += `
      <div class="comparison-card">
        <div class="comparison-header">
          <div class="comparison-logo ${banco.especial ? 'mercado-libre-logo' : ''}">${banco.logo}</div>
          <div class="comparison-name">
            ${banco.nome}
            ${banco.especial ? '<div class="recommended-badge">RECOMENDADO</div>' : ''}
          </div>
        </div>
        
        <div class="comparison-stats">
          <div class="stat-item">
            <div class="stat-label">% CDI</div>
            <div class="stat-value" style="color: ${banco.percentual >= 100 ? 'var(--sucesso)' : 'var(--erro)'}">
              ${banco.percentual}%
            </div>
          </div>
          
          <div class="stat-item">
            <div class="stat-label">Taxa Anual</div>
            <div class="stat-value">${taxaAnual.toFixed(2)}%</div>
          </div>
          
          <div class="stat-item">
            <div class="stat-label">Rendimento</div>
            <div class="stat-value">${formatarMoeda(rendimento)}</div>
          </div>
          
          <div class="stat-item">
            <div class="stat-label">Valor Final</div>
            <div class="stat-value" style="color: var(--sucesso)">${formatarMoeda(valorFinal)}</div>
          </div>
        </div>
      </div>
    `;
  });
  
  DOM.comparisonContainer.innerHTML = html;
};

// Criar gráfico de evolução
const criarGrafico = (valorInicial, meses, taxaMensal) => {
  const ctx = DOM.chartCanvas.getContext('2d');
  
  if (state.chart) {
    state.chart.destroy();
  }
  
  const labels = [];
  const data = [];
  let valorAtual = valorInicial;
  
  for (let i = 0; i <= meses; i++) {
    labels.push(i === 0 ? 'Início' : `Mês ${i}`);
    data.push(valorAtual);
    if (i < meses) valorAtual = valorAtual * (1 + taxaMensal);
  }
  
  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Evolução do Investimento',
        data: data,
        borderColor: '#4361ee',
        backgroundColor: 'rgba(67, 97, 238, 0.1)',
        borderWidth: 4,
        pointRadius: 5,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#4361ee',
        pointBorderWidth: 3,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          },
          ticks: {
            callback: function(value) {
              return 'R$ ' + value.toLocaleString('pt-BR', {maximumFractionDigits: 0});
            },
            font: {
              size: 13
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 13
            }
          }
        }
      },
      plugins: {
        tooltip: {
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          titleFont: {
            size: 15
          },
          bodyFont: {
            size: 15
          },
          padding: 12,
          callbacks: {
            label: function(context) {
              return 'Valor: ' + formatarMoeda(context.parsed.y);
            },
            title: function(context) {
              return context[0].label;
            }
          }
        },
        legend: {
          position: 'top',
          labels: {
            boxWidth: 15,
            padding: 20,
            font: {
              size: 15,
              family: "'Inter', sans-serif"
            }
          }
        }
      },
      animation: {
        duration: 2000,
        easing: 'easeOutQuart'
      }
    }
  });
};

// Calcular rendimentos
const calcularRendimentos = () => {
  const valor = parseFloat(document.getElementById('valor').value);
  const meses = parseInt(document.getElementById('meses').value);
  const percentual = parseFloat(document.getElementById('percentual').value);
  
  if(!valor || valor <= 0 || !meses || meses <= 0 || !percentual || percentual <= 0) {
    DOM.resultado.innerHTML = `
      <div style="color: var(--erro); padding: 20px; text-align: center; font-size: 18px;">
        <i class="fas fa-exclamation-triangle"></i> Por favor, preencha todos os campos com valores válidos
      </div>
    `;
    DOM.resultado.style.display = 'block';
    return;
  }

  // Efeito visual no botão
  const originalHTML = DOM.btnCalcular.innerHTML;
  DOM.btnCalcular.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculando...';
  DOM.btnCalcular.disabled = true;
  
  setTimeout(() => {
    const taxaEfetivaAnual = state.cdi.anual * (percentual / 100);
    const taxaMensal = Math.pow(1 + taxaEfetivaAnual/100, 1/12) - 1;
    const valorFinal = valor * Math.pow(1 + taxaMensal, meses);
    const rendimento = valorFinal - valor;
    const rentabilidadePercentual = ((valorFinal / valor - 1) * 100);
    const ir = rendimento * 0.15; // Simulação de IR
    const rendimentoLiquido = rendimento - ir;

    DOM.resultado.innerHTML = `
      <div style="margin-bottom: 20px; text-align: center;">
        <span style="font-size: 1.3em; background: var(--degrade-botao); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700;">
          <i class="fas fa-rocket"></i> Projeção para ${percentual}% do CDI
        </span><br>
        <small style="color: var(--texto-secundario);">(${taxaEfetivaAnual.toFixed(2)}% a.a.)</small>
      </div>
      
      <div class="result-grid">
        <div class="result-item">
          <div class="result-label">Investimento Inicial</div>
          <div class="result-value">${formatarMoeda(valor)}</div>
        </div>
        
        <div class="result-item">
          <div class="result-label">Período</div>
          <div class="result-value">${meses} meses</div>
        </div>
        
        <div class="result-item">
          <div class="result-label">Rentabilidade</div>
          <div class="result-value" style="color: var(--sucesso)">+${rentabilidadePercentual.toFixed(2)}%</div>
        </div>
        
        <div class="result-item">
          <div class="result-label">Imposto de Renda</div>
          <div class="result-value" style="color: var(--erro)">- ${formatarMoeda(ir)}</div>
        </div>
      </div>
      
      <div class="result-highlight">
        <div class="highlight-label">Valor Final</div>
        <div class="highlight-value">${formatarMoeda(valorFinal)}</div>
      </div>
      
      <div class="result-item" style="color: var(--sucesso); font-size: 1.2em; margin-top: 20px; text-align: center; padding: 15px; background: rgba(76, 175, 80, 0.1); border-radius: 12px;">
        <div class="result-label">Rendimento Líquido</div>
        <div class="result-value">+ ${formatarMoeda(rendimentoLiquido)}</div>
      </div>
    `;
    DOM.resultado.style.display = 'block';
    
    criarGrafico(valor, meses, taxaMensal);
    renderBankComparison();
    
    // Restaurar botão
    DOM.btnCalcular.innerHTML = originalHTML;
    DOM.btnCalcular.disabled = false;
  }, 800);
};

// Salvar simulação
const salvarSimulacao = () => {
  const valor = parseFloat(document.getElementById('valor').value);
  const meses = parseInt(document.getElementById('meses').value);
  const percentual = parseFloat(document.getElementById('percentual').value);
  
  if(!valor || !meses || !percentual) {
    showNotification('Erro', 'Preencha os campos para salvar a simulação', true);
    return;
  }
  
  const taxaEfetivaAnual = state.cdi.anual * (percentual / 100);
  const taxaMensal = Math.pow(1 + taxaEfetivaAnual/100, 1/12) - 1;
  const valorFinal = valor * Math.pow(1 + taxaMensal, meses);
  
  const simulation = {
    valorInicial: formatarMoeda(valor),
    meses: meses,
    percentual: percentual,
    valorFinal: formatarMoeda(valorFinal),
    data: new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
  
  state.history.unshift(simulation);
  if (state.history.length > 10) state.history.pop();
  
  saveHistory();
  renderHistory();
  showNotification('Sucesso', 'Simulação salva com sucesso!');
};

// Limpar campos
const limparCampos = () => {
  document.getElementById('valor').value = '';
  document.getElementById('percentual').value = '100';
  document.getElementById('meses').value = '';
  DOM.resultado.style.display = 'none';
  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }
};

// Alternar tema
const toggleTheme = () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('light-theme', state.theme === 'light');
  localStorage.setItem('cdiTheme', state.theme);
};

// Inicialização
const init = () => {
  // Definir ano atual
  DOM.currentYear.textContent = new Date().getFullYear();
  
  // Carregar tema
  const savedTheme = localStorage.getItem('cdiTheme');
  if (savedTheme) {
    state.theme = savedTheme;
    if (state.theme === 'light') {
      document.body.classList.add('light-theme');
    }
  }
  
  // Carregar histórico
  loadHistory();
  
  // Renderizar bancos
  renderBankComparison();
  
  // Event listeners
  DOM.themeToggle.addEventListener('click', toggleTheme);
  DOM.btnCalcular.addEventListener('click', calcularRendimentos);
  DOM.btnLimpar.addEventListener('click', limparCampos);
  DOM.btnSalvar.addEventListener('click', salvarSimulacao);
  
  // Atualizar contagem regressiva
  setInterval(() => {
    const now = new Date();
    const nextUpdate = new Date(now.getTime() + 5 * 60000);
    DOM.proximaAtualizacao.textContent = 
      nextUpdate.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
  }, 1000);
};

// Iniciar aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);