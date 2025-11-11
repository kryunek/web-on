
/* THEME ENGINE - inserted automatically (Minimal Gris & Coral) */
const THEMES = {
  "MinimalCoral": {
    "--bg":"#F7F7F8","--surface":"#FFFFFF","--text":"#111827","--muted":"#6B7280",
    "--primary":"#EF4444","--accent":"#F97316","--error":"#B91C1C"
  }
};

function updateJSColorsFromTheme(){
  const cs = getComputedStyle(document.documentElement);
  const primary = cs.getPropertyValue('--primary').trim() || '#EF4444';
  const accent = cs.getPropertyValue('--accent').trim() || '#F97316';
  // update global ACCENT var if exists
  try { if (typeof ACCENT !== 'undefined') ACCENT = primary; } catch(e){}
  // update charts if created
  try {
    if (window.chart && window.chart.data && window.chart.data.datasets) {
      window.chart.data.datasets.forEach((d,i)=>{
        d.backgroundColor = i===0 ? primary : accent;
        d.borderColor = primary;
      });
      window.chart.update();
    }
    if (window.salesChart && window.salesChart.data && window.salesChart.data.datasets) {
      window.salesChart.data.datasets.forEach((d,i)=>{
        d.backgroundColor = primary;
        d.borderColor = primary;
      });
      window.salesChart.update();
    }
    if (window.netProfitChart && window.netProfitChart.data && window.netProfitChart.data.datasets) {
      window.netProfitChart.data.datasets.forEach((d,i)=>{
        d.backgroundColor = primary;
        d.borderColor = primary;
      });
      window.netProfitChart.update();
    }
    if (window.chart && window.chart.update) window.chart.update();
  } catch(e){}
  // update buttons
  document.querySelectorAll('.btn-gold').forEach(el=>{
    el.style.background = primary;
    el.style.color = '#fff';
    el.style.border = 'none';
  });
  // accents
  document.querySelectorAll('.text-accent').forEach(el=> el.style.color = primary);
  document.querySelectorAll('.highlight-cell').forEach(el=> el.style.color = primary);
}

function applyTheme(name){
  const t = THEMES[name] || THEMES["MinimalCoral"];
  Object.keys(t).forEach(k=>{
    document.documentElement.style.setProperty(k, t[k]);
  });
  updateJSColorsFromTheme();
  localStorage.setItem('selectedTheme', name);
}

document.addEventListener('DOMContentLoaded', ()=> {
  const saved = localStorage.getItem('selectedTheme') || 'MinimalCoral';
  applyTheme(saved);
  // update ACCENT variable used across app.js (some charts reference ACCENT)
  try { ACCENT = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || ACCENT; } catch(e){}
});


// app.js
// --- Persistencia local ---
function saveData() {
  localStorage.setItem('dishes', JSON.stringify(dishes));
  localStorage.setItem('sales', JSON.stringify(sales));
  localStorage.setItem('expenses', JSON.stringify(expenses));
  localStorage.setItem('escandallos', JSON.stringify(escandallos));
  localStorage.setItem('employees', JSON.stringify(employees));
  localStorage.setItem('tasks', JSON.stringify(tasks));
  localStorage.setItem('providers', JSON.stringify(providers));
  localStorage.setItem('orders', JSON.stringify(orders));
  localStorage.setItem('stock', JSON.stringify(stock));
  localStorage.setItem('settings', JSON.stringify(settings));
}

function loadData() {
  dishes = JSON.parse(localStorage.getItem('dishes') || "[]");
  sales = JSON.parse(localStorage.getItem('sales') || "[]");
  expenses = JSON.parse(localStorage.getItem('expenses') || "[]");
  escandallos = JSON.parse(localStorage.getItem('escandallos') || "{}");
  employees = JSON.parse(localStorage.getItem('employees') || "[]");
  tasks = JSON.parse(localStorage.getItem('tasks') || "[]");
  providers = JSON.parse(localStorage.getItem('providers') || "[]");
  orders = JSON.parse(localStorage.getItem('orders') || "[]");
  stock = JSON.parse(localStorage.getItem('stock') || "{}");
  settings = JSON.parse(localStorage.getItem('settings') || "{}");
}

// --- Datos iniciales ---
let dishes = [];
let sales = [];
let expenses = [];
let escandallos = {}; // { plato: [ingredientes] }
let employees = [];
let tasks = [];
let providers = [];
let orders = [];
let stock = {};
let settings = {}; // settings.defaultMargin (fraction) e.g. 0.4

loadData();
// DEFAULTS
if (settings.defaultMargin == null) settings.defaultMargin = 0.40;
if (settings.stockAlertThreshold == null) settings.stockAlertThreshold = 1; // 40% por defecto

let ACCENT = '#EF4444';
// --- Utilidades ---
function calcProfit(cost, price) {
  const profit = price - cost;
  const margin = price === 0 ? 0 : ((profit / price) * 100);
  return { profit, margin };
}
function unitCategory(u) {
  if (!u) return null;
  if (['kg','g'].includes(u)) return 'weight';
  if (['l','ml'].includes(u)) return 'volume';
  if (['ud'].includes(u)) return 'count';
  return null;
}

function convertQuantity(q, from, to) {
  // convierte cantidad numeric q desde 'from' a 'to'
  q = Number(q) || 0;
  if (!from || !to || from === to) return q;
  const cf = unitCategory(from), ct = unitCategory(to);
  if (!cf || !ct || cf !== ct) {
    // categorías incompatibles -> no convertir
    return NaN;
  }
  // peso
  if (from === 'kg' && to === 'g') return q * 1000;
  if (from === 'g' && to === 'kg') return q / 1000;
  // volumen
  if (from === 'l' && to === 'ml') return q * 1000;
  if (from === 'ml' && to === 'l') return q / 1000;
  // unidades contadas
  if (from === 'ud' && to === 'ud') return q;
  // fallback
  return q;
}

function convertPricePerUnit(price, from, to) {
  // price = precio por unidad 'from' -> devolver precio por unidad 'to'
  price = Number(price) || 0;
  if (!from || !to || from === to) return price;
  const cf = unitCategory(from), ct = unitCategory(to);
  if (!cf || !ct || cf !== ct) return NaN;
  // €/kg -> €/g
  if (from === 'kg' && to === 'g') return price / 1000;
  if (from === 'g' && to === 'kg') return price * 1000;
  // €/l <-> €/ml
  if (from === 'l' && to === 'ml') return price / 1000;
  if (from === 'ml' && to === 'l') return price * 1000;
  // ud
  if (from === 'ud' && to === 'ud') return price;
  return price;
}
function formatDate(dt) { return dt.split("-").reverse().join("/"); }
function uid(prefix='id') { return prefix + '_' + Math.random().toString(36).slice(2,9); }

// --- DASHBOARD ---
let chart, salesChart, netProfitChart;
function renderProfitChart() {
  const ctx = document.getElementById('profitChart').getContext('2d');
  const data = {
    labels: dishes.map(d => d.name),
    datasets: [{
      label: "% Margen",
      data: dishes.map(d => {
        const { margin } = calcProfit(d.cost, d.price);
        return parseFloat(margin.toFixed(1));
      }),
      backgroundColor: 'var(--primary)'
    }]
  };
  if (chart) chart.destroy();
  chart = new Chart(ctx, { type: 'bar', data, options: { responsive: true, plugins: { legend: { display: false } } } });
}
function refreshDashboard() {
  const { avgMargin, nonProfitable, stars } = getStats();
  document.getElementById('avgMargin').innerText = avgMargin + "%";
  document.getElementById('nonProfitable').innerText = nonProfitable;
  document.getElementById('stars').innerText = stars;
  const totalLabour = calculateTotalLabourCost();
  document.getElementById('staffCost').innerText = totalLabour.toFixed(2) + ' €';
  renderProfitChart();
  renderStockAlerts();
}
function getStats() {
  if (dishes.length === 0) return { avgMargin: 0, nonProfitable: 0, stars: 0 };
  let totalMargin = 0, nonProfitable = 0, stars = 0;
  dishes.forEach(({ cost, price }) => {
    const { profit, margin } = calcProfit(cost, price);
    totalMargin += margin;
    if (profit < 1) nonProfitable++;
    if (margin > 60) stars++;
  });
  return { avgMargin: (totalMargin / dishes.length).toFixed(1), nonProfitable, stars };
}

// --- VENTAS ---
function updateSalesFormPlates() {
  const sel = document.querySelector("#salesForm select[name=dish]"); if(!sel) return;
  sel.innerHTML = "";
  dishes.forEach(d => { sel.innerHTML += `<option value="${d.name}">${d.name}</option>`; });
  sel.disabled = dishes.length === 0;
  const submitBtn = document.querySelector("#salesForm button[type=submit]");
  if (submitBtn) submitBtn.disabled = dishes.length === 0;
}

function getMonthsWithSales() {
  const monthsSet = new Set(sales.map(s => s.date.slice(0,7)));
  expenses.forEach(e => monthsSet.add(e.month));
  return Array.from(monthsSet).sort().reverse();
}

function renderSalesTable(month) {
  const tbody = document.getElementById('salesBody'); tbody.innerHTML = "";
  const filtered = sales.filter(s => s.date.startsWith(month));
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:28px 0">No hay ventas este mes</td></tr>`;
    document.getElementById("totalUnits").innerText = "0";
    document.getElementById("totalRevenue").innerText = "0.00";
    return;
  }
  let totalUnits = 0; let totalRevenue = 0;
  filtered.sort((a,b)=> b.date.localeCompare(a.date));
  filtered.forEach(s => {
    tbody.innerHTML += `<tr><td>${formatDate(s.date)}</td><td>${s.dish}</td><td>${s.units}</td><td>${s.revenue.toFixed(2)}</td></tr>`;
    totalUnits += s.units; totalRevenue += s.revenue;
  });
  document.getElementById("totalUnits").innerText = totalUnits;
  document.getElementById("totalRevenue").innerText = totalRevenue.toFixed(2);
}

function renderMonthSelect() {
  const select = document.getElementById('month-select');
  const months = getMonthsWithSales(); select.innerHTML = "";
  months.forEach(m => {
    const [y, mo] = m.split("-");
    select.innerHTML += `<option value="${m}">${mo}/${y}</option>`;
  });
}

function renderSalesChart() {
  const canvas = document.getElementById('salesChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const months = getMonthsWithSales().reverse();
  if (!months || months.length === 0) {
    if (salesChart) { salesChart.destroy(); salesChart = null; }
    // limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const labels = months.map(m => { const [y, mo] = m.split("-"); return mo + "/" + y; });
  const revenues = months.map(m => sales.filter(s => s.date.startsWith(m)).reduce((acc, cur) => acc + cur.revenue, 0));
  if (salesChart) salesChart.destroy();
  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: "Ingresos (€)",
        data: revenues,
        backgroundColor: ACCENT
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function refreshSales() {
  renderMonthSelect();
  const month = document.getElementById('month-select').value || getMonthsWithSales()[0];
  if (month) renderSalesTable(month);
  renderSalesChart();
  updateSalesFormPlates();
}

document.getElementById('salesForm').onsubmit = function(e) {
  e.preventDefault(); const form = e.target;
  const date = form.date.value; const dish = form.dish.value; const units = parseInt(form.units.value);
  if (!date || !dish || !units || units <= 0) return;
  const esc = escandallos[dish] || [];
  const insufficient = checkStockForSale(esc, units);
  if (insufficient.length) {
    if (!confirm(`Stock insuficiente para: ${insufficient.join(', ')}. Deseas registrar la venta igualmente?`)) return;
  }
  consumeStockForSale(esc, units);
  const plato = dishes.find(d => d.name === dish);
  const revenue = plato ? plato.price * units : 0;
  sales.push({ date, dish, units, revenue }); saveData(); form.reset(); refreshSales(); renderEscandalloTable(); renderStockAlerts();
};

// check & consume stock
function checkStockForSale(ingredients, units) {
  // ingredients: [{ name, quantity, unit, ... }, ...], units = nº raciones (int)
  const insufficient = [];
  ingredients.forEach(ing => {
    // cantidad total necesaria para la venta (en la unidad del ingrediente en el escandallo)
    const needInIngUnit = (Number(ing.quantity) || 0) * Number(units || 0);

    const st = stock[ing.name]; // stock puede existir en otra unidad (base)
    if (!st) {
      insufficient.push(ing.name);
      return;
    }
    const stockQty = Number(st.quantity || 0);
    const stockUnit = st.unit || '';

    // convertimos "need" (que está en ing.unit) a la unidad en la que está el stock
    const convertedNeed = convertQuantity(needInIngUnit, ing.unit || stockUnit, stockUnit);
    // si conversión devuelve NaN -> unidades incompatibles => marcar insuficiente
    if (isNaN(convertedNeed)) {
      insufficient.push(ing.name);
      return;
    }
    // comparar (se usa un pequeño epsilon para evitar flotantes negativos)
    if ((stockQty - convertedNeed) < 0.000001) insufficient.push(ing.name);
  });
  return insufficient;
}
function consumeStockForSale(ingredients, units) {
  ingredients.forEach(ing => {
    const needInIngUnit = (Number(ing.quantity) || 0) * Number(units || 0);

    if (!stock[ing.name]) {
      // si no existe stock lo creamos con unidad del ingrediente convertida a sí misma
      stock[ing.name] = { quantity: 0, unit: ing.unit || '' };
    }
    const st = stock[ing.name];
    const baseUnit = st.unit || ing.unit || '';
    // convertimos necesidad a la unidad base del stock
    const convertedNeed = convertQuantity(needInIngUnit, ing.unit || baseUnit, baseUnit);
    if (isNaN(convertedNeed)) {
      // unidades incompatibles: no restamos (pero esto no debería ocurrir si checkStockForSale ha pasado)
      return;
    }
    st.quantity = Math.max(0, (parseFloat(st.quantity) || 0) - convertedNeed);
  });
  saveData();
}

// --- GASTOS FIJOS ---
function getMonthsWithExpenses() {
  const monthsSet = new Set(expenses.map(e => e.month));
  sales.forEach(s => monthsSet.add(s.date.slice(0,7)));
  return Array.from(monthsSet).sort().reverse();
}
function renderExpenseMonthSelect() {
  const sel = document.querySelector("#expenseForm select[name=month]");
  if (!sel) return;
  sel.innerHTML = "";
  const meses = Array.from(new Set([...getMonthsWithSales(), ...getMonthsWithExpenses()])).sort().reverse();
  if (meses.length === 0) {
    const today = new Date();
    const mes = (today.getMonth() + 1).toString().padStart(2,'0');
    const year = today.getFullYear();
    const defaultMonth = `${year}-${mes}`;
    sel.innerHTML = `<option value="${defaultMonth}">${mes}/${year}</option>`;
  } else {
    meses.forEach(m => { const [y, mo] = m.split("-"); sel.innerHTML += `<option value="${m}">${mo}/${y}</option>`; });
  }
}
function deleteExpense(idx) {
  if (confirm("¿Seguro que quieres borrar este gasto?")) {
    expenses.splice(idx, 1); saveData(); renderExpensesTable(); renderNetProfitChart(); renderExpenseMonthSelect();
  }
}
window.deleteExpense = deleteExpense;
document.getElementById('expenseForm').onsubmit = function(e) {
  e.preventDefault(); const form = e.target; const month = form.month.value; const type = form.type.value.trim(); const amount = parseFloat(form.amount.value);
  if (!month || !type || isNaN(amount) || amount <= 0) return;
  expenses.push({ month, type, amount }); saveData(); form.reset(); renderExpensesTable(); renderNetProfitChart(); renderExpenseMonthSelect();
};


function renderNetProfitChart() {
  const canvas = document.getElementById('netProfitChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const months = Array.from(new Set([...getMonthsWithSales(), ...getMonthsWithExpenses()])).sort();
  if (!months || months.length === 0) {
    if (netProfitChart) { netProfitChart.destroy(); netProfitChart = null; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const labels = months.map(m => { const [y, mo] = m.split("-"); return mo + "/" + y; });
  const beneficios = months.map(m => sales.filter(s => s.date.startsWith(m)).reduce((acc, cur) => {
    const plato = dishes.find(d => d.name === cur.dish);
    const beneficioPorVenta = plato ? (plato.price - plato.cost) * cur.units : 0;
    return acc + beneficioPorVenta;
  }, 0));
  const gastos = months.map(m => expenses.filter(e => e.month === m).reduce((acc, cur) => acc + parseFloat(cur.amount), 0));
  const netos = beneficios.map((ben, idx) => ben - gastos[idx]);
  if (netProfitChart) netProfitChart.destroy();
  netProfitChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: "Beneficio Neto (€)", data: netos, backgroundColor: ACCENT }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}
function renderExpensesTable() {
  const tbody = document.getElementById('expensesBody'); tbody.innerHTML = "";
  if (expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:28px 0">No hay gastos fijos añadidos.</td></tr>`; return;
  }
  expenses.forEach((e, idx) => {
    const [y, mo] = e.month.split("-");
    tbody.innerHTML += `<tr><td>${mo}/${y}</td><td>${e.type}</td><td>${parseFloat(e.amount).toFixed(2)}</td><td><button onclick="deleteExpense(${idx})" title="Borrar" class="text-red-600" style="border:none;background:transparent;cursor:pointer;">Borrar</button></td></tr>`;
  });
  const resumenes = Array.from(new Set([...getMonthsWithSales(), ...getMonthsWithExpenses()])).sort();
  if (resumenes.length) {
    tbody.innerHTML += `<tr style="background:var(--line)"><td colspan="4" style="font-weight:600;color:var(--muted)">Resumen mensual</td></tr>`;
    resumenes.forEach(m => {
      const [y, mo] = m.split("-"); const totalGasto = expenses.filter(e => e.month === m).reduce((a,b) => a + parseFloat(b.amount), 0);
      const totalBeneficio = sales.filter(s => s.date.startsWith(m)).reduce((acc, cur) => {
        const plato = dishes.find(d => d.name === cur.dish);
        const beneficioPorVenta = plato ? (plato.price - plato.cost) * cur.units : 0;
        return acc + beneficioPorVenta;
      }, 0);
      const neto = totalBeneficio - totalGasto;
      tbody.innerHTML += `<tr><td style="font-weight:bold">${mo}/${y}</td><td style="color:var(--primary)">Bruto: ${totalBeneficio.toFixed(2)}€</td><td style="color:var(--primary)">Gastos: ${totalGasto.toFixed(2)}€</td><td style="color:${neto >= 0 ? 'var(--accent)' : 'var(--primary)'};font-weight:600">Neto: ${neto.toFixed(2)}€</td></tr>`;
    });
  }
}

// --- ESCANDALLO (ahora origen y creador de platos) ---
function renderEscandalloDishSelect() {
  const sel = document.getElementById("escandallo-dish-select"); sel.innerHTML = "";
  // preferir platos existentes en `dishes`, si no, claves en escandallos
  const names = new Set();
  dishes.forEach(d => names.add(d.name));
  Object.keys(escandallos).forEach(k => names.add(k));
  Array.from(names).forEach(n => sel.innerHTML += `<option value="${n}">${n}</option>`);
  if (!sel.value && sel.options.length) sel.value = sel.options[0].value;
}

function renderEscandalloTable() {
  const dishName = document.getElementById("escandallo-dish-select")?.value;
  const tbody = document.getElementById("escandalloBody"); if(!tbody) return;
  tbody.innerHTML = "";
  if (!dishName) { document.getElementById("escandallo-summary").innerText = "Selecciona un plato para ver su escandallo."; return; }
  const ingredientes = escandallos[dishName] || [];
  let totalCost = 0;
  ingredientes.forEach((ing, idx) => {
    const coste = (parseFloat(ing.quantity)||0) * (parseFloat(ing.unitCost)||0);
    totalCost += coste;
    tbody.innerHTML += `<tr>
      <td>${ing.name}</td>
      <td>${ing.quantity}</td>
      <td>${ing.unit}</td>
      <td>${parseFloat(ing.unitCost).toFixed(3)}</td>
      <td>${coste.toFixed(3)}</td>
      <td><button onclick="deleteIngredient('${dishName}',${idx})" style="border:none;background:transparent;cursor:pointer;color:var(--error);">Borrar</button></td>
    </tr>`;
  });
  if (!ingredientes.length) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);">Sin ingredientes.</td></tr>`; }
  // buscar plato en dishes
  let plato = dishes.find(d => d.name === dishName);
  // si no existe, no hay price, pero mostramos cost
  let summary = `Coste total: <b>${totalCost.toFixed(3)} €</b>`;
  if (plato) {
    const beneficio = plato.price - totalCost;
    const margen = plato.price ? (beneficio / plato.price) * 100 : 0;
    summary += `<br>Precio venta: <b>${plato.price.toFixed(2)} €</b> | Margen: <b>${margen.toFixed(1)}%</b> | Beneficio: <b>${beneficio.toFixed(2)} €</b>`;
  } else {
    summary += `<br><small>Este plato aún no tiene precio calculado. Añade ingredientes para generarlo.</small>`;
  }
  // stock por ingrediente
  if (ingredientes.length) {
    summary += `<br><small>Stock:</small><ul>`;
    ingredientes.forEach(ing => {
      const st = stock[ing.name];
      summary += `<li>${ing.name}: ${st ? (parseFloat(st.quantity).toFixed(3) + ' ' + (st.unit || ing.unit)) : '0 ' + ing.unit}</li>`;
    });
    summary += `</ul>`;
  }

  // añadimos botón borrar plato al resumen
  summary += `<div style="margin-top:8px;"><button onclick="deleteDish('${dishName}')" style="padding:6px 10px;border-radius:6px;border:1px solid #d33;background:transparent;cursor:pointer;color:#d33">Borrar plato</button></div>`;

  document.getElementById("escandallo-summary").innerHTML = summary;
}

function deleteDish(name) {
  if (!name) return;
  if (!confirm(`Borrar plato "${name}" y su escandallo de forma permanente?`)) return;

  // eliminar escandallo y dish
  if (escandallos[name]) delete escandallos[name];
  dishes = dishes.filter(d => d.name !== name);

  // opcional: no borramos ventas históricas para no perder datos; si quieres eliminarlas
  // sales = (sales || []).filter(s => s.dish !== name);

  saveData();
  renderEscandalloDishSelect();
  renderEscandalloTable();
  updateSalesFormPlates();
  refreshDashboard();
}
window.deleteDish = deleteDish;

window.deleteIngredient = function(dish, idx) {
  if (!escandallos[dish]) return;
  escandallos[dish].splice(idx,1);
  // recalcular coste y actualizar dish (o eliminar si sin ingredientes)
  const ingredientes = escandallos[dish] || [];
  let total = ingredientes.reduce((s,i)=> s + ((parseFloat(i.quantity)||0)*(parseFloat(i.unitCost)||0)), 0);
  const di = dishes.findIndex(d => d.name === dish);
  if (di !== -1) {
    if (ingredientes.length === 0) {
      dishes.splice(di,1); // eliminar plato si no tiene ingredientes
    } else {
      const marginPercent = (parseFloat(document.getElementById('escandallo-margin')?.value)|| (settings.defaultMargin*100) ) / 100;
      dishes[di].cost = parseFloat(total.toFixed(3));
      dishes[di].price = parseFloat((total * (1 + marginPercent)).toFixed(2));
    }
  }
  saveData(); renderEscandalloTable(); renderEscandalloDishSelect(); updateSalesFormPlates(); refreshDashboard();
};

document.getElementById('escandallo-dish-select').onchange = function() { renderEscandalloTable(); };

// actualizar _ingredient-product-select_ con productos de proveedores
function updateIngredientProductSelect() {
  const select = document.getElementById("ingredient-product-select");
  if (!select) return;
  select.innerHTML = "";
  providers.forEach(provider => {
    (provider.products || []).forEach(prod => {
      const opt = document.createElement("option");
      // value include provider to avoid name collisions
      opt.value = `${prod.name}__${provider.name}`;
      opt.textContent = `${prod.name} (${provider.name})`;
      opt.dataset.unit = prod.unit || "";
      opt.dataset.price = prod.price != null ? String(prod.price) : "";
      select.appendChild(opt);
    });
  });
  const unitInput = document.getElementById('ingredient-unit');
  const unitCostInput = document.getElementById('ingredient-unitCost');
  if (select.options.length > 0) {
    unitInput.value = select.options[0].dataset.unit || '';
    unitCostInput.value = select.options[0].dataset.price || '';
  } else {
    if (unitInput) unitInput.value = '';
    if (unitCostInput) unitCostInput.value = '';
  }
}
const selIng = document.getElementById('ingredient-product-select'); if (selIng) selIng.onchange = function(){ const s = this.options[this.selectedIndex]; if(!s) return; document.getElementById('ingredient-unit').value = s.dataset.unit||''; document.getElementById('ingredient-unitCost').value = s.dataset.price||''; };

// Crear nuevo plato (desde Escandallo)
const createDishBtn = document.getElementById('create-dish-btn');
if (createDishBtn) {
  createDishBtn.onclick = function(e){
    e.preventDefault();
    const name = document.getElementById('new-dish-name').value.trim();
    if (!name) return alert('Introduce un nombre para el plato');
    if (!dishes.find(d => d.name === name)) {
      dishes.push({ name, cost: 0, price: 0 });
    }
    if (!escandallos[name]) escandallos[name] = [];
    saveData();
    document.getElementById('new-dish-name').value = '';
    renderEscandalloDishSelect();
    renderEscandalloTable();
    updateSalesFormPlates();
  };
}

// Al enviar ingrediente: lo añadimos al escandallo y recalculamos coste y precio (con margen configurable)
const ingForm = document.getElementById('ingredientForm');
if (ingForm) {
  ingForm.onsubmit = function(e) {
    e.preventDefault();
    const dishName = document.getElementById('escandallo-dish-select')?.value;
    if (!dishName) return alert('Selecciona un plato');
    const sel = document.getElementById('ingredient-product-select');
    if (!sel || sel.options.length === 0) return alert('No hay productos');
    const opt = sel.options[sel.selectedIndex];
    const qty = parseFloat(this.quantity.value);
    if (isNaN(qty) || qty <= 0) return alert('Cantidad inválida');
    const [prodName, provName] = opt.value.split('__');
    const ing = {
      name: prodName,
      provider: provName,
      quantity: qty,
      unit: opt.dataset.unit || this.unit.value || '',
      unitCost: parseFloat(opt.dataset.price || this.unitCost.value || 0)
    };
    escandallos[dishName] = escandallos[dishName] || [];
    escandallos[dishName].push(ing);
    // recalcular coste total
    const total = (escandallos[dishName] || []).reduce((s,i)=> s + (parseFloat(i.quantity)||0)*(parseFloat(i.unitCost)||0), 0);
    // margen desde input (en %), si no existe usar settings.defaultMargin
    const marginInput = parseFloat(document.getElementById('escandallo-margin')?.value);
    const marginPercent = (!isNaN(marginInput) ? marginInput/100 : settings.defaultMargin);
    // crear o actualizar dish
    const di = dishes.findIndex(d => d.name === dishName);
    if (di === -1) {
      dishes.push({ name: dishName, cost: parseFloat(total.toFixed(3)), price: parseFloat((total * (1 + marginPercent)).toFixed(2)) });
    } else {
      dishes[di].cost = parseFloat(total.toFixed(3));
      dishes[di].price = parseFloat((total * (1 + marginPercent)).toFixed(2));
    }
    saveData();
    this.reset();
    updateIngredientProductSelect();
    renderEscandalloTable();
    renderEscandalloDishSelect();
    updateSalesFormPlates();
    refreshDashboard();
  };
}

// --- PROVEEDORES / PRODUCTOS ---

function deleteProvider(idx) {
  const prov = providers[idx];
  if (!prov) return;
  if (!confirm(`Borrar proveedor "${prov.name}" y todos sus productos? Esto eliminará productos y limpiará stock/escandallos relacionados.`)) return;

  // 1) recopilar nombres de productos del proveedor
  const prodNames = (prov.products || []).map(p => p.name);

  // 2) borrar proveedor
  providers.splice(idx, 1);

  // 3) limpiar stock y escandallos por cada producto del proveedor eliminado
  prodNames.forEach(prodName => {
    if (stock && stock[prodName]) delete stock[prodName];

    // quitar ingredientes de escandallos
    Object.keys(escandallos).forEach(dish => {
      escandallos[dish] = (escandallos[dish] || []).filter(i => i.name !== prodName);
      // si quedó vacío, también eliminar plato de dishes
      if ((escandallos[dish] || []).length === 0) {
        delete escandallos[dish];
        dishes = dishes.filter(dd => dd.name !== dish);
      }
    });

    // quitar pedidos que referencien el producto
    orders = (orders || []).filter(o => o.product !== prodName);
  });

  saveData();
  renderProvidersTable();
  updateProviderSelectOptions();
  updateProductSelectByProvider();
  updateIngredientProductSelect();
  renderProducts();
  renderEscandalloDishSelect();
  renderEscandalloTable();
  renderOrdersTable();
  refreshDashboard();
}
window.deleteProvider = deleteProvider;

function renderProvidersTable() {
  const tbody = document.getElementById('providersBody'); if(!tbody) return; tbody.innerHTML = "";
  if (providers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:28px 0">No hay proveedores.</td></tr>`; renderProvidersSelects(); return;
  }
  providers.forEach((p, idx) => {
    tbody.innerHTML += `<tr><td>${p.name}</td><td>${p.type}</td><td>${p.contact}</td><td>${p.days||''}</td><td>${getProviderTotalSpend(p.name).toFixed(2)} €</td><td><button onclick="editProvider(${idx})" class="btn-small">Editar</button> <button onclick="deleteProvider(${idx})" class="btn-small danger">Borrar</button></td></tr>`;
  });
  renderProvidersSelects(); saveData();
}
document.getElementById('providerForm').onsubmit = function(e){
  e.preventDefault();
  const f = e.target;
  const p = { id: uid('prov'), name: f.name.value.trim(), type: f.type.value, contact: f.contact.value, days: f.days.value, products: [] };
  providers.push(p); saveData(); f.reset(); renderProvidersTable(); updateProviderSelectOptions(); updateIngredientProductSelect();
};

function renderProducts() {
  const tbody = document.getElementById("productsBody"); if(!tbody) return; tbody.innerHTML = "";
  providers.forEach((provider, pIndex) => {
    (provider.products||[]).forEach((prod, prodIndex) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${provider.name}</td><td>${prod.name}</td><td>${prod.unit}</td><td>${prod.price.toFixed(2)} €</td><td><button class="btn-edit">Editar</button> <button class="btn-delete" onclick="deleteProduct(${pIndex}, ${prodIndex})">Borrar</button></td>`;
      tbody.appendChild(tr);
    });
  });
}

function deleteProduct(providerIndex, productIndex) {
  const prov = providers[providerIndex];
  if (!prov) return;
  const prod = prov.products[productIndex];
  if (!prod) return;

  const prodName = prod.name;

  if (!confirm(`Borrar producto "${prodName}" del proveedor ${prov.name}? Esto removerá referencias en stock/escandallos/pedidos.`)) return;

  // 1) eliminar producto del proveedor
  prov.products.splice(productIndex, 1);

  // 2) eliminar entradas en stock relacionadas
  if (stock && stock[prodName]) {
    delete stock[prodName];
  }

  // 3) eliminar ingredientes en escandallos que usan este producto (y recalcular platos)
  Object.keys(escandallos).forEach(dish => {
    const beforeLen = (escandallos[dish] || []).length;
    escandallos[dish] = (escandallos[dish] || []).filter(i => i.name !== prodName);
    const afterLen = escandallos[dish].length;
    if (beforeLen !== afterLen) {
      // recalcular coste y actualizar dishes
      const ingredientes = escandallos[dish] || [];
      let total = ingredientes.reduce((s,i)=> s + ((parseFloat(i.quantity)||0)*(parseFloat(i.unitCost)||0)), 0);
      const di = dishes.findIndex(d => d.name === dish);
      if (di !== -1) {
        if (ingredientes.length === 0) {
          dishes.splice(di,1);
        } else {
          const marginPercent = (parseFloat(document.getElementById('escandallo-margin')?.value)|| (settings.defaultMargin*100) ) / 100;
          dishes[di].cost = parseFloat(total.toFixed(3));
          dishes[di].price = parseFloat((total * (1 + marginPercent)).toFixed(2));
        }
      }
    }
  });

  // 4) eliminar pedidos/ordenes que referencian este producto
  orders = (orders || []).filter(o => o.product !== prodName);

  // 5) opcional: eliminar ventas que usen este plato? (no tocamos sales directamente para no perder histórico)
  // Si quieres eliminar ventas que usen ese producto como plato, añade lógica aquí.

  saveData();
  renderProducts();
  updateProductSelectByProvider();
  updateIngredientProductSelect();
  renderEscandalloTable();
  renderEscandalloDishSelect();
  renderOrdersTable();
  refreshDashboard();
}
window.deleteProduct = deleteProduct;

const productForm = document.getElementById('productForm');
if (productForm) {
  productForm.onsubmit = function(e){
    e.preventDefault();
    const f = this;
    const providerName = f.provider.value;
    const prov = providers.find(p => p.name === providerName);
    if (!prov) return alert('Proveedor no encontrado');
    prov.products = prov.products || [];
    prov.products.push({ name: f.name.value.trim(), unit: f.unit.value.trim(), price: parseFloat(f.price.value) });
    saveData(); f.reset(); renderProducts(); updateProductSelectByProvider(); updateIngredientProductSelect();
  };
}

function updateProviderSelectOptions() {
  const selects = [document.getElementById("product-provider-select"), document.getElementById("order-provider-select")];
  selects.forEach(select => {
    if (!select) return;
    select.innerHTML = "";
    providers.forEach((p) => { const opt = document.createElement('option'); opt.value = p.name; opt.textContent = p.name; select.appendChild(opt); });
  });
  updateProductSelectByProvider();
}

function updateProductSelectByProvider() {
  const providerName = document.getElementById("order-provider-select")?.value;
  const productSelect = document.getElementById("order-product-select");
  const unitField = document.getElementById("order-unit");
  const priceField = document.getElementById("order-price");
  if (!productSelect) return;
  productSelect.innerHTML = "";
  if (!providerName) return;
  const prov = providers.find(p => p.name === providerName);
  const list = prov ? (prov.products||[]) : [];
  list.forEach(prod => { productSelect.innerHTML += `<option value="${prod.name}">${prod.name}</option>`; });
  if (list.length > 0) { unitField.value = list[0].unit || ''; priceField.value = list[0].price || ''; } else { unitField.value=''; priceField.value=''; }
}
const orderProvSelect = document.getElementById('order-provider-select'); if(orderProvSelect) orderProvSelect.onchange = updateProductSelectByProvider;

function renderProvidersSelects() {
  const sel = document.querySelector("#orderForm select[name=provider]");
  if (sel) { sel.innerHTML = ""; providers.forEach(p => sel.innerHTML += `<option value="${p.name}">${p.name}</option>`); }
  updateTaskEmployeeSelect();
}

// --- PEDIDOS / COMPRAS ---
function renderOrdersTable() {
  const tbody = document.getElementById('ordersBody'); if(!tbody) return; tbody.innerHTML = "";
  if (orders.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:28px 0">No hay pedidos registrados.</td></tr>`; renderOrdersSummary(); return; }
  orders.forEach((o, idx) => {
    tbody.innerHTML += `<tr><td>${formatDate(o.date)}</td><td>${o.provider}</td><td>${o.product}</td><td>${parseFloat(o.quantity).toFixed(3)} ${o.unit}</td><td>${parseFloat(o.price).toFixed(2)}</td><td><button onclick="deleteOrder(${idx})" class="btn-small danger">Borrar</button></td></tr>`;
  });
  renderOrdersSummary();
}
function deleteOrder(idx) { if (!confirm('Borrar pedido?')) return; orders.splice(idx,1); saveData(); renderOrdersTable(); }
window.deleteOrder = deleteOrder;

document.getElementById('orderForm').onsubmit = function(e){
  e.preventDefault();
  const f = e.target;
  const date = f.date.value;
  const providerName = f.provider.value;
  const productName = f.product.value.trim();
  const quantityEntered = parseFloat(f.quantity.value);
  const unitEntered = f.unit.value.trim();
  const pricePerUnitEntered = parseFloat(f.price.value);

  if (!date || !providerName || !productName || isNaN(quantityEntered) || isNaN(pricePerUnitEntered)) return alert('Completa correctamente el formulario de pedido.');

  // buscar producto dentro del proveedor seleccionado
  const prov = providers.find(p => p.name === providerName);
  if (!prov) return alert('Proveedor no encontrado.');
  const prod = (prov.products || []).find(p => p.name === productName);
  if (!prod) return alert('Producto no encontrado en ese proveedor.');

  // unidad base del producto (la que se usa para stock)
  const baseUnit = (prod.unit || '').trim();
  if (!baseUnit) return alert('El producto no tiene unidad base definida.');

  // comprobar compatibilidad de unidades
  const catEntered = unitCategory(unitEntered);
  const catBase = unitCategory(baseUnit);
  if (!catEntered || !catBase || catEntered !== catBase) return alert('Unidad incompatible. Selecciona una unidad compatible con el producto.');

  // convertir cantidad a unidad base y convertir precio por unidad a unidad base
  const qtyInBase = convertQuantity(quantityEntered, unitEntered, baseUnit);
  const pricePerBaseUnit = convertPricePerUnit(pricePerUnitEntered, unitEntered, baseUnit);

  if (isNaN(qtyInBase) || isNaN(pricePerBaseUnit)) return alert('Error al convertir unidades.');

  // calcular total (en €) -> precio por unidad base * cantidad en base
  const totalPrice = qtyInBase * pricePerBaseUnit;

  // construir order: mantenemos quantity + unit como el usuario lo introdujo, pero
  // guardamos price como total para compatibilidad con la tabla actual
  const o = {
    id: uid('order'),
    date,
    provider: providerName,
    product: productName,
    quantity: Number(quantityEntered.toFixed(3)), // cantidad tal como la introdujo usuario
    unit: unitEntered,
    price: Number(totalPrice.toFixed(2)), // total €
    pricePerUnitEntered: Number(pricePerUnitEntered), // opcional: precio por unidad introducida
    baseUnit: baseUnit,
    qtyInBase: Number(qtyInBase.toFixed(6)) // cantidad convertida a unidad base (para stock)
  };

  // push order y actualizar stock en unidad base
  orders.push(o);

  if (!stock[productName]) stock[productName] = { quantity: 0, unit: baseUnit };
  // sumar la cantidad ya convertida a la unidad base
  stock[productName].quantity = (parseFloat(stock[productName].quantity) || 0) + qtyInBase;
  stock[productName].unit = baseUnit;

  orders.sort((a,b)=> b.date.localeCompare(a.date));
  saveData();
  f.reset();
  renderOrdersTable();
  renderEscandalloTable();
  renderStockAlerts();
  renderProvidersTable();
};
function renderOrdersSummary() {
  const container = document.getElementById('ordersSummary'); container.innerHTML = "";
  const byProv = {};
  orders.forEach(o => { byProv[o.provider] = (byProv[o.provider]||0) + (parseFloat(o.price)||0); });
  for (const p in byProv) { container.innerHTML += `<div>${p}: ${byProv[p].toFixed(2)} €</div>`; }
}
function getProviderTotalSpend(name) { return orders.filter(o => o.provider === name).reduce((a,b)=> a + parseFloat(b.price || 0), 0); }

// --- STOCK Alerts ---
function renderStockAlerts() {
  const alertsDiv = document.getElementById('stockAlerts'); if(!alertsDiv) return;
  alertsDiv.innerHTML = "";

  const low = [];
  for (const ing in stock) {
    const st = stock[ing];
    const qty = Number(st.quantity || 0);
    const unit = st.unit || '';

    // threshold: prioridad a stock[ing].alertThreshold si existe, si no settings.stockAlertThreshold
    const thresh = (st.alertThreshold != null) ? Number(st.alertThreshold) : Number(settings.stockAlertThreshold || 1);

    if (isNaN(thresh)) continue;

    if (qty <= thresh) {
      // calcular equivalencia legible: si unit es 'kg' y qty < 1 mostramos en g también
      let readable = `${qty.toFixed(3)} ${unit}`;
      if (unit === 'kg' && qty < 1) {
        const inG = convertQuantity(qty, 'kg', 'g');
        readable += ` (${inG.toFixed(0)} g)`;
      } else if (unit === 'l' && qty < 1) {
        const inMl = convertQuantity(qty, 'l', 'ml');
        readable += ` (${inMl.toFixed(0)} ml)`;
      }
      low.push({ name: ing, readable, qty, unit, threshold: thresh });
    }
  }

  if (low.length === 0) {
    alertsDiv.innerText = "Sin alertas.";
    return;
  }

  // ordenar por prioridad (menos stock primero)
  low.sort((a,b) => a.qty - b.qty);

  alertsDiv.innerHTML = `<ul>${low.map(i => `<li><strong>${i.name}</strong>: ${i.readable} — umbral: ${i.threshold} ${i.unit}</li>`).join('')}</ul>`;
}

// --- STAFF/TASKS (sin cambios importantes) ---
function renderEmployeesTable() {
  const tbody = document.getElementById('employeesBody'); if(!tbody) return; tbody.innerHTML = "";
  if (employees.length === 0) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:28px 0">No hay empleados.</td></tr>`; updateTaskEmployeeSelect(); return; }
  employees.forEach((emp, idx) => {
    const salary = (parseFloat(emp.hourly) || 0) * (parseFloat(emp.hoursMonth) || 0);
    const ss = salary * (settings.ssRate || 0);
    const total = salary + ss;
    tbody.innerHTML += `<tr><td>${emp.name}</td><td>${emp.position}</td><td>${emp.shift || ''}</td><td>${parseFloat(emp.hourly).toFixed(2)}</td><td>${parseFloat(emp.hoursMonth).toFixed(1)}</td><td>${total.toFixed(2)} €</td><td><button onclick="openTasksFor('${emp.name}')" class="btn-small">Ver</button></td><td><button onclick="editEmployee(${idx})" class="btn-small">Editar</button> <button onclick="deleteEmployee(${idx})" class="btn-small danger">Borrar</button></td></tr>`;
  });
  updateTaskEmployeeSelect(); renderStaffIndicators(); saveData();
}
document.getElementById('employeeForm').onsubmit = function(e){
  e.preventDefault(); const f = e.target;
  const emp = { name: f.name.value.trim(), role: f.role.value, position: f.position.value, shift: f.shift.value, hourly: parseFloat(f.hourly.value), hoursMonth: parseFloat(f.hoursMonth.value) };
  if (!emp.name) return;
  employees.push(emp); saveData(); f.reset(); renderEmployeesTable(); refreshDashboard();
};
function editEmployee(idx) { const emp = employees[idx]; if (!emp) return; const name = prompt("Nombre:", emp.name); if (!name) return; const hourly = parseFloat(prompt("€/hora:", emp.hourly)); if (isNaN(hourly)) return; const hoursMonth = parseFloat(prompt("Horas mes:", emp.hoursMonth)); if (isNaN(hoursMonth)) return; emp.name = name; emp.hourly = hourly; emp.hoursMonth = hoursMonth; saveData(); renderEmployeesTable(); refreshDashboard(); }
function deleteEmployee(idx) { if (!confirm("¿Borrar empleado?")) return; const name = employees[idx].name; employees.splice(idx,1); tasks = tasks.filter(t => t.employee !== name); saveData(); renderEmployeesTable(); renderTasksBoard(); refreshDashboard(); }
window.deleteEmployee = deleteEmployee;
function openTasksFor(name) { showTab("tasks-section","tab-tasks"); setTimeout(()=>{ document.getElementById('task-employee-select').value = name; }, 200); }
function updateTaskEmployeeSelect() { const sel = document.getElementById('task-employee-select'); if(!sel) return; sel.innerHTML = ""; employees.forEach(e => sel.innerHTML += `<option value="${e.name}">${e.name}</option>`); }
function assignTask() { const empSel = document.getElementById('task-employee-select'); if (!empSel) return alert('No hay empleados. Añade empleados primero.'); const employee = empSel.value; const title = document.getElementById('task-title').value.trim(); const date = document.getElementById('task-date').value; const time = document.getElementById('task-time').value; if (!employee || !title) return; const t = { id: uid('task'), employee, title, date, time, done: false }; tasks.push(t); saveData(); document.getElementById('task-title').value = ''; renderTasksBoard(); }
document.getElementById('assignTaskBtn').onclick = function(e){ e.preventDefault(); assignTask(); };
function renderTasksBoard() { const board = document.getElementById('tasks-board'); if(!board) return; board.innerHTML = ""; if (employees.length === 0) { board.innerHTML = `<p>No hay empleados. Añade empleados en Personal.</p>`; return; } employees.forEach(emp => { const col = document.createElement('div'); col.className = 'tasks-column'; const header = document.createElement('div'); header.className = 'tasks-column-header'; header.innerHTML = `<strong>${emp.name}</strong><div class="pos">${emp.position}</div>`; col.appendChild(header); const list = document.createElement('div'); list.className = 'tasks-list'; const empTasks = tasks.filter(t => t.employee === emp.name).sort((a,b)=> (a.date||'').localeCompare(b.date||'') || (a.time||'').localeCompare(b.time||'')); empTasks.forEach(t => { const card = document.createElement('div'); card.className = 'task-card'; if (t.done) card.classList.add('done'); card.innerHTML = `<div class="task-title">${t.title}</div><div class="task-meta">${t.date ? formatDate(t.date) : ''} ${t.time ? t.time : ''}</div><div class="task-actions"><button onclick="toggleTaskDone('${t.id}')">${t.done ? 'Reabrir' : 'Marcar'}</button><button onclick="deleteTask('${t.id}')" class="danger">Borrar</button></div>`; list.appendChild(card); }); col.appendChild(list); board.appendChild(col); }); }
function toggleTaskDone(id) { const t = tasks.find(x => x.id === id); if (!t) return; t.done = !t.done; saveData(); renderTasksBoard(); }
function deleteTask(id) { if (!confirm("Borrar tarea?")) return; tasks = tasks.filter(t => t.id !== id); saveData(); renderTasksBoard(); }

// --- Indicadores personal ---
function calculateTotalLabourCost() { let total = 0; employees.forEach(e => { const salary = (parseFloat(e.hourly)||0) * (parseFloat(e.hoursMonth)||0); total += salary + salary * (settings.ssRate||0); }); return total; }
function renderStaffIndicators() { const totalHours = employees.reduce((acc,e)=> acc + (parseFloat(e.hoursMonth)||0), 0); document.getElementById('totalHours').innerText = totalHours.toFixed(1); document.getElementById('totalLabourCost').innerText = calculateTotalLabourCost().toFixed(2) + ' €'; document.getElementById('ssRate').value = Math.round((settings.ssRate||0)*100); }
document.getElementById('ssRate').onchange = function(){ settings.ssRate = (parseFloat(this.value)||0)/100; saveData(); renderStaffIndicators(); refreshDashboard(); };

// --- TABS / UI helpers ---
function showTab(sectionId, tabId) {
  ["dashboard-section","sales-section","expenses-section","escandallo-section","staff-section","tasks-section","providers-section","orders-section","products-section"]
  .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = "none"; });
  document.getElementById(sectionId).style.display = "";
  ["tab-dashboard","tab-sales","tab-expenses","tab-escandallo","tab-staff","tab-tasks","tab-providers","tab-orders","tab-products"]
  .forEach(id => { const el = document.getElementById(id); if (el && el.classList) el.classList.remove("active"); });
  if (tabId) { const t = document.getElementById(tabId); if (t) t.classList.add("active"); }
}
document.getElementById("tab-dashboard").onclick = () => showTab("dashboard-section", "tab-dashboard");
document.getElementById("tab-sales").onclick = () => showTab("sales-section", "tab-sales");
document.getElementById("tab-expenses").onclick = () => showTab("expenses-section", "tab-expenses");
document.getElementById("tab-escandallo").onclick = () => { showTab("escandallo-section", "tab-escandallo"); renderEscandalloDishSelect(); renderEscandalloTable(); };
document.getElementById("tab-staff").onclick = () => showTab("staff-section", "tab-staff");
document.getElementById("tab-tasks").onclick = () => showTab("tasks-section", "tab-tasks");
document.getElementById("tab-providers").onclick = () => showTab("providers-section", "tab-providers");
document.getElementById("tab-products").onclick = () => showTab("products-section", "tab-products");
document.getElementById("tab-orders").onclick = () => showTab("orders-section", "tab-orders");

document.getElementById("month-select").onchange = function(){ renderSalesTable(this.value); };

// --- Login / session ---
const DEFAULT_USER = "admin"; const DEFAULT_PASS = "admin";
if (!localStorage.getItem("user_credentials")) localStorage.setItem("user_credentials", JSON.stringify({ user: DEFAULT_USER, pass: DEFAULT_PASS }));
function isLogged() { return !!localStorage.getItem("session_active"); }
function doLogin(user, pass) {
  const creds = JSON.parse(localStorage.getItem("user_credentials"));
  if (!creds) return false;
  if (user === creds.user && pass === creds.pass) { localStorage.setItem("session_active", "true"); localStorage.setItem("session_user", user); return true; }
  return false;
}
function doLogout() { localStorage.removeItem("session_active"); localStorage.removeItem("session_user"); location.reload(); }
function showApp() { document.getElementById("login-screen").style.display = "none"; document.getElementById("app-root").style.display = ""; }
function showLogin() { document.getElementById("app-root").style.display = "none"; document.getElementById("login-screen").style.display = ""; }
function fadeOutLoader() { const loader = document.getElementById("loader"); if(!loader) return; loader.style.opacity = "0"; setTimeout(()=>{ loader.style.display = "none"; },700); }

document.getElementById("login-form").onsubmit = function(e){
  e.preventDefault(); const form = e.target; const user = form.user.value.trim(); const pass = form.pass.value.trim(); const errDiv = document.getElementById("login-error");
  if (doLogin(user, pass)) { errDiv.innerText = ""; showApp(); setTimeout(fadeOutLoader,350); setTimeout(appInit,100); } else { errDiv.innerText = "Usuario o contraseña incorrectos"; }
};
document.getElementById("logout-btn").onclick = function(){ doLogout(); };

// --- Inicialización ---
function appInit() {
  renderProvidersTable();
  renderProducts();
  updateProviderSelectOptions();
  updateIngredientProductSelect();
  renderOrdersTable();
  renderEscandalloDishSelect();
  renderEscandalloTable();
  renderEmployeesTable();
  renderTasksBoard();
  renderOrdersTable();
  refreshDashboard();
  refreshSales();
  renderExpenseMonthSelect();
  renderExpensesTable();
  renderNetProfitChart();
}
window.onload = function() {
  setTimeout(()=>{ if (isLogged()) { showApp(); fadeOutLoader(); setTimeout(appInit,350); } else { showLogin(); fadeOutLoader(); } }, 350);
};

// inicial render (por si)
renderProvidersTable();
renderProducts();
updateIngredientProductSelect();
renderStockAlerts();


// Quick action buttons for escandallo panel
document.getElementById('apply-margin-btn')?.addEventListener('click', function(){
  const dish = document.getElementById('escandallo-dish-select')?.value; if (!dish) return alert('Select a dish first');
  const marginInput = parseFloat(document.getElementById('escandallo-margin')?.value) || (settings.defaultMargin*100);
  const marginPercent = marginInput/100;
  const ingredientes = escandallos[dish] || [];
  const total = ingredientes.reduce((s,i)=> s + (parseFloat(i.quantity)||0)*(parseFloat(i.unitCost)||0), 0);
  const di = dishes.findIndex(d => d.name === dish);
  if (di === -1) dishes.push({ name: dish, cost: total, price: parseFloat((total*(1+marginPercent)).toFixed(2)) });
  else { dishes[di].cost = parseFloat(total.toFixed(3)); dishes[di].price = parseFloat((total*(1+marginPercent)).toFixed(2)); }
  saveData(); renderEscandalloTable(); updateSalesFormPlates(); refreshDashboard();
});

document.getElementById('recalculate-cost-btn')?.addEventListener('click', function(){
  const dish = document.getElementById('escandallo-dish-select')?.value; if (!dish) return alert('Select a dish first');
  const ingredientes = escandallos[dish] || [];
  const total = ingredientes.reduce((s,i)=> s + (parseFloat(i.quantity)||0)*(parseFloat(i.unitCost)||0), 0);
  document.getElementById('escandallo-summary').innerHTML = `Coste total: <b>${total.toFixed(3)} €</b>`;
});

document.getElementById('export-escandallo-btn')?.addEventListener('click', function(){
  const dish = document.getElementById('escandallo-dish-select')?.value; if (!dish) return alert('Select a dish first');
  const data = { dish, ingredients: escandallos[dish] || [], dishObj: dishes.find(d=>d.name===dish) || null };
  const blob = new Blob([JSON.stringify(data,null,2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${dish.replace(/\s+/g,'_')}_escandallo.json`; a.click(); URL.revokeObjectURL(url);
});
