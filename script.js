// script.js

// -- Tab Navigation --
const tabButtons = document.querySelectorAll('nav .tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Remove active from all buttons and contents
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    // Activate clicked tab
    button.classList.add('active');
    const tab = button.getAttribute('data-tab');
    document.getElementById(tab).classList.add('active');
  });
});

// ---- Financial Movements Logic ----
const financialForm = document.getElementById('financial-form');
const financialTableBody = document.querySelector('#financial-table tbody');
const filterTypeSelect = document.getElementById('filter-type');

let financialMovements = JSON.parse(localStorage.getItem('financialMovements')) || [];

function renderFinancialMovements(filter = 'todos') {
  financialTableBody.innerHTML = '';
  const filtered = financialMovements.filter(fm => filter === 'todos' ? true : fm.type === filter);
  filtered.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.type === 'entrada' ? 'Entrada' : 'Saída'}</td>
      <td>${item.date}</td>
      <td>${item.description}</td>
      <td>${item.category.charAt(0).toUpperCase() + item.category.slice(1)}</td>
      <td>${item.value}</td>
    `;
    financialTableBody.appendChild(tr);
  });
}

financialForm.addEventListener('submit', e => {
  e.preventDefault();
  const type = document.getElementById('type').value;
  const date = document.getElementById('date').value;
  const description = document.getElementById('description').value.trim();
  const category = document.getElementById('category').value;
  const value = document.getElementById('value').value.trim();

  if (!type || !date || !description || !category|| !value) return;

  financialMovements.push({ type, date, description, category, value });
  localStorage.setItem('financialMovements', JSON.stringify(financialMovements));
  financialForm.reset();
  renderFinancialMovements(filterTypeSelect.value);
});

filterTypeSelect.addEventListener('change', () => {
  renderFinancialMovements(filterTypeSelect.value);
});

// Render initially
renderFinancialMovements();

// ---- Grain Management Logic ----
const grainForm = document.getElementById('grain-form');
const grainTableBody = document.querySelector('#grain-table tbody');

let grainItems = JSON.parse(localStorage.getItem('grainItems')) || [];

function renderGrainTable() {
  grainTableBody.innerHTML = '';
  if (grainItems.length === 0) {
    grainTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--gray-medium)">Nenhum insumo cadastrado.</td></tr>`;
    return;
  }
  grainItems.forEach((item, index) => {
    const statusOk = item.quantity >= item.threshold;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${item.threshold}</td>
      <td class="${statusOk ? 'status-ok' : 'status-alert'}">${statusOk ? 'OK' : 'ALERTA'}</td>
      <td class="actions">
        <button title="Remover" data-index="${index}">&times;</button>
      </td>
    `;
    grainTableBody.appendChild(tr);
  });
}

grainForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('grain-name').value.trim();
  const quantity = parseInt(document.getElementById('grain-quantity').value, 10);
  const threshold = parseInt(document.getElementById('grain-threshold').value, 10);

  if (!name || quantity < 0 || threshold < 0) return;

  // Check if insumo exists, update if yes
  const existingIndex = grainItems.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
  if (existingIndex > -1) {
    grainItems[existingIndex].quantity = quantity;
    grainItems[existingIndex].threshold = threshold;
  } else {
    grainItems.push({ name, quantity, threshold });
  }

  localStorage.setItem('grainItems', JSON.stringify(grainItems));
  grainForm.reset();
  renderGrainTable();
});

grainTableBody.addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON') {
    const idx = parseInt(e.target.getAttribute('data-index'), 10);
    if (idx > -1) {
      grainItems.splice(idx, 1);
      localStorage.setItem('grainItems', JSON.stringify(grainItems));
      renderGrainTable();
    }
  }
});

renderGrainTable();

// ---- Crop Planning Calendar Logic ----

const calendarMonthYear = document.getElementById('calendar-month-year');
const calendarBody = document.querySelector('#calendar tbody');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');

const eventFormContainer = document.getElementById('event-form-container');
const eventForm = document.getElementById('event-form');
const eventsListUl = document.getElementById('events-ul');
const cancelEventBtn = document.getElementById('cancel-event');

let currentDate = new Date();
let selectedDate = null;

let cropEvents = JSON.parse(localStorage.getItem('cropEvents')) || [];

// Helpers
function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

function renderCalendar() {
  calendarBody.innerHTML = '';
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  calendarMonthYear.textContent = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month days to fill start of week
  let prevMonthDaysCount = startDayOfWeek;
  let prevMonth = new Date(year, month, 0);
  let prevMonthDays = prevMonth.getDate();

  // Create days rows, 6 rows max
  let dayCount = 1;
  for (let row = 0; row < 6; row++) {
    const tr = document.createElement('tr');
    for (let col = 0; col < 7; col++) {
      const td = document.createElement('td');
      // Fill with previous month days if startDayOfWeek > col in first row
      if (row === 0 && col < startDayOfWeek) {
        td.classList.add('inactive');
        td.textContent = prevMonthDays - prevMonthDaysCount + 1;
        prevMonthDaysCount--;
      } else if (dayCount > daysInMonth) {
        td.classList.add('inactive');
        td.textContent = dayCount - daysInMonth;
        dayCount++;
      } else {
        td.textContent = dayCount;

        const thisDateISO = `${year}-${String(month + 1).padStart(2,'0')}-${String(dayCount).padStart(2,'0')}`;
        
        // Mark today
        const today = new Date();
        if (thisDateISO === formatDateISO(today)) {
          td.classList.add('today');
        }
        // Mark if there's at least one event on this date
        if (cropEvents.some(ev => ev.date === thisDateISO)) {
          td.classList.add('has-event');
        }

        td.addEventListener('click', () => {
          selectedDate = thisDateISO;
          openEventForm(selectedDate);
        });

        dayCount++;
      }
      tr.appendChild(td);
    }
    calendarBody.appendChild(tr);
  }
}

function openEventForm(date) {
  eventFormContainer.classList.remove('hidden');
  eventForm.reset();
  document.getElementById('event-date').value = date;
}

function closeEventForm() {
  eventFormContainer.classList.add('hidden');
  selectedDate = null;
}

eventForm.addEventListener('submit', e => {
  e.preventDefault();
  const date = document.getElementById('event-date').value;
  const title = document.getElementById('event-title').value.trim();
  const type = document.getElementById('event-type').value;

  if (!date || !title || !type) return;

  cropEvents.push({ date, title, type });
  localStorage.setItem('cropEvents', JSON.stringify(cropEvents));
  renderCalendar();
  renderEventsList();
  closeEventForm();
});

cancelEventBtn.addEventListener('click', () => {
  closeEventForm();
});

prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

function renderEventsList() {
  eventsListUl.innerHTML = '';
  if (cropEvents.length === 0) {
    eventsListUl.innerHTML = '<li style="color: var(--gray-medium);">Nenhum evento cadastrado.</li>';
    return;
  }
  // Sort events by date asc
  const sorted = [...cropEvents].sort((a,b) => a.date.localeCompare(b.date));
  sorted.forEach((ev, idx) => {
    const li = document.createElement('li');
    li.classList.add(ev.type);
    li.textContent = `${ev.date} - ${ev.title} (${ev.type.charAt(0).toUpperCase() + ev.type.slice(1)})`;
    // Optionally add delete button for events here in future
    eventsListUl.appendChild(li);
  });
}

renderCalendar();
renderEventsList();

// ---- Weather Monitoring Logic -----

const weatherForm = document.getElementById('weather-form');
const cityInput = document.getElementById('city-input');
const weatherResult = document.getElementById('weather-result');
const weatherCity = document.getElementById('weather-city');
const weatherDesc = document.getElementById('weather-desc');
const temperature = document.getElementById('temperature');
const humidity = document.getElementById('humidity');
const wind = document.getElementById('wind');
const weatherAlert = document.getElementById('weather-alert');
const weatherError = document.getElementById('weather-error');

// Replace with your own OpenWeatherMap API key
const OPENWEATHER_API_KEY = 'your_openweather_api_key_here';

weatherForm.addEventListener('submit', async e => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  weatherError.classList.add('hidden');
  weatherResult.classList.add('hidden');
  weatherAlert.classList.add('hidden');
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pt_br`
    );
    if (!response.ok) {
      throw new Error('Cidade não encontrada');
    }
    const data = await response.json();

    weatherCity.textContent = `${data.name}, ${data.sys.country}`;
    weatherDesc.textContent = data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1);
    temperature.textContent = data.main.temp.toFixed(1);
    humidity.textContent = data.main.humidity;
    wind.textContent = data.wind.speed.toFixed(1);

    // Show alert if weather indicates potential issues
    const weatherMain = data.weather[0].main.toLowerCase();
    const alertTriggers = ['storm', 'thunderstorm', 'extreme', 'tornado', 'hurricane', 'snow'];
    if (alertTriggers.some(trigger => weatherMain.includes(trigger))) {
      weatherAlert.textContent = 'Alerta climático: condições meteorológicas adversas detectadas!';
      weatherAlert.classList.remove('hidden');
    } else {
      weatherAlert.classList.add('hidden');
    }
    weatherResult.classList.remove('hidden');
  } catch (error) {
    weatherError.textContent = error.message;
    weatherError.classList.remove('hidden');
  }
});
