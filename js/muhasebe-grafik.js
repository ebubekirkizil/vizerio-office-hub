(function(){
  // Require Chart global
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js bulunamadı. Lütfen Chart.js yüklendiğinden emin olun.');
    return;
  }

  // Ensure accounting exists
  window.accounting = window.accounting || {};
  const ac = window.accounting;

  // Internal chart instance
  let financeChart = null;
  ac._chart = ac._chart || {};
  ac._chart.instance = () => financeChart;

  // Helper: convert any currency -> targetCurrency using window.liveRates
  // liveRates: { USD_TRY, EUR_TRY } where USD_TRY = 1 USD in TRY
  function convertAmount(amount, fromCurrency, toCurrency) {
    fromCurrency = (fromCurrency || 'TRY').toUpperCase();
    toCurrency = (toCurrency || 'TRY').toUpperCase();
    const lr = window.liveRates || {};
    // convert everything to TRY first
    let amountTRY = 0;
    if (fromCurrency === 'TRY') amountTRY = Number(amount || 0);
    else if (fromCurrency === 'USD') amountTRY = Number(amount || 0) * (lr.USD_TRY || 0);
    else if (fromCurrency === 'EUR') amountTRY = Number(amount || 0) * (lr.EUR_TRY || 0);
    else amountTRY = Number(amount || 0); // fallback treat as TRY

    if (toCurrency === 'TRY') return amountTRY;
    if (toCurrency === 'USD') return (lr.USD_TRY && lr.USD_TRY !== 0) ? (amountTRY / lr.USD_TRY) : 0;
    if (toCurrency === 'EUR') return (lr.EUR_TRY && lr.EUR_TRY !== 0) ? (amountTRY / lr.EUR_TRY) : 0;
    return amountTRY;
  }

  // Aggregate transactions by day (YYYY-MM-DD) within optional startDate filter
  function aggregateByDay(list, startDate, chartCurrency) {
    const map = new Map();
    list.forEach(item => {
      const created = item.created_at ? new Date(item.created_at) : null;
      if (!created) return;
      if (startDate && created < startDate) return;
      const dayKey = created.toISOString().slice(0,10); // YYYY-MM-DD
      if (!map.has(dayKey)) map.set(dayKey, { income: 0, expense: 0 });
      const rec = map.get(dayKey);
      const amt = Number(item.amount) || 0;
      const converted = convertAmount(amt, (item.currency || 'TRY'), chartCurrency);
      if (item.type === 'income') rec.income += converted;
      else rec.expense += converted;
    });
    // produce sorted arrays
    const sorted = Array.from(map.entries()).sort((a,b)=> a[0].localeCompare(b[0]));
    const labels = sorted.map(s => {
      const d = new Date(s[0] + 'T00:00:00');
      return d.toLocaleDateString('tr-TR'); // display friendly
    });
    const incomes = sorted.map(s => Number(s[1].income || 0));
    const expenses = sorted.map(s => Number(s[1].expense || 0));
    const profits = incomes.map((v,i) => v - expenses[i]);
    return { labels, incomes, expenses, profits };
  }

  // Create chart with empty data
  ac.initChart = function() {
    const ctx = document.getElementById('financeChart');
    if (!ctx) {
      console.warn('canvas #financeChart bulunamadı.');
      return;
    }
    const config = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Net Kâr',
            data: [],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.08)',
            tension: 0.25,
            yAxisID: 'y'
          },
          {
            label: 'Gelir',
            data: [],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.08)',
            tension: 0.25,
            yAxisID: 'y'
          },
          {
            label: 'Gider',
            data: [],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.08)',
            tension: 0.25,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        stacked: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: function(val){ return val; } }
          },
          x: {
            ticks: { maxRotation: 0, autoSkip: true },
          }
        },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const v = ctx.raw || 0;
                // format in TR locale
                return ctx.dataset.label + ': ' + Number(v).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
              }
            }
          }
        }
      }
    };
    if (financeChart) {
      try { financeChart.destroy(); } catch(e){/*ignore*/ }
    }
    financeChart = new Chart(ctx.getContext('2d'), config);
  };

  // filter: '24h','1w','1m','1y','all'
  ac.filterChartDate = function(filter, btnEl) {
    ac._chart.filter = filter || 'all';
    // update active class on buttons (if btnEl provided)
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    ac.updateChart();
  };

  // Update chart using ac.state.list and selected currency
  ac.updateChart = function() {
    if (!financeChart) ac.initChart();
    if (!financeChart) return;
    const filter = ac._chart.filter || 'all';
    let startDate = null;
    const now = new Date();
    if (filter === '24h') startDate = new Date(now.getTime() - (24*60*60*1000));
    else if (filter === '1w') startDate = new Date(now.getTime() - (7*24*60*60*1000));
    else if (filter === '1m') startDate = new Date(now.getTime() - (30*24*60*60*1000));
    else if (filter === '1y') startDate = new Date(now.getTime() - (365*24*60*60*1000));
    else startDate = null; // all

    const chartCurrencyEl = document.getElementById('chart-currency');
    const chartCurrency = chartCurrencyEl ? chartCurrencyEl.value : 'TRY';

    const agg = aggregateByDay(ac.state.list || [], startDate, chartCurrency);
    // If no labels (e.g. small timeframe), create at least latest day
    if (!agg.labels.length && ac.state.list.length) {
      const last = ac.state.list[ac.state.list.length - 1];
      const d = last.created_at ? new Date(last.created_at) : new Date();
      agg.labels = [d.toLocaleDateString('tr-TR')];
      agg.incomes = [0];
      agg.expenses = [0];
      agg.profits = [0];
    }

    financeChart.data.labels = agg.labels;
    // dataset 0: profit, 1: income, 2: expense (match initChart order)
    financeChart.data.datasets[0].data = agg.profits;
    financeChart.data.datasets[1].data = agg.incomes;
    financeChart.data.datasets[2].data = agg.expenses;
    financeChart.options.plugins.tooltip.enabled = true;
    financeChart.update();
  };

  // toggle visibility of particular dataset (optional helper)
  ac.toggleChartData = function(key, btnEl) {
    if (!financeChart) return;
    // keys: 'profit','income','expense'
    const map = { profit: 0, income: 1, expense: 2 };
    const idx = map[key];
    if (typeof idx === 'undefined') return;
    const meta = financeChart.getDatasetMeta(idx);
    meta.hidden = meta.hidden === null ? !financeChart.data.datasets[idx].hidden : !meta.hidden;
    financeChart.update();
    // toggle active class on btn
    if (btnEl) btnEl.classList.toggle('active');
  };

  // hook to update chart after transactions loaded
  // Make sure accounting.loadTransactions calls ac.updateChart() after loading (or we'll attach here)
  // If accounting.loadTransactions exists, wrap it so chart updates automatically after load
  if (ac.loadTransactions && !ac._chart._wrappedLoadTransactions) {
    const origLoad = ac.loadTransactions.bind(ac);
    ac.loadTransactions = async function() {
      const res = await origLoad();
      // wait small tick to ensure state updated
      setTimeout(()=> {
        try { ac.updateChart(); } catch(e){console.warn('updateChart error', e); }
      }, 50);
      return res;
    };
    ac._chart._wrappedLoadTransactions = true;
  }

  // Also wrap refreshDashboard to update chart (safe)
  if (ac.refreshDashboard && !ac._chart._wrappedRefresh) {
    const origRef = ac.refreshDashboard.bind(ac);
    ac.refreshDashboard = function() {
      origRef();
      try { ac.updateChart(); } catch(e){/*ignore*/ }
    };
    ac._chart._wrappedRefresh = true;
  }

  // expose for debugging
  ac.initChart && (ac._chart.init = ac.initChart);
  ac.updateChart && (ac._chart.update = ac.updateChart);

  // if accounting was already initialized and state loaded, init chart now
  // call initChart immediately if DOM ready & canvas present
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // small delay to ensure Chart lib loaded
    setTimeout(()=> {
      try { ac.initChart(); ac.updateChart(); } catch(e){ /* ignore */ }
    }, 200);
  } else {
    window.addEventListener('DOMContentLoaded', ()=> {
      setTimeout(()=> { try { ac.initChart(); ac.updateChart(); } catch(e){} }, 200);
    });
  }

})();
