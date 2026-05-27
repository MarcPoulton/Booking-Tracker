const STORAGE_KEY = 'holidayHomeBookings';

const bookingForm = document.getElementById('booking-form');
const clearFormButton = document.getElementById('clear-form');
const bookingListBody = document.getElementById('booking-list');
const totalBookingsEl = document.getElementById('totalBookings');
const totalNightsEl = document.getElementById('totalNights');
const currentOccupancyEl = document.getElementById('currentOccupancy');
const calendarEl = document.getElementById('calendar');
const calendarMonthEl = document.getElementById('calendarMonth');
const prevMonthButton = document.getElementById('prevMonth');
const nextMonthButton = document.getElementById('nextMonth');

let bookings = [];
let selectedBookingId = null;
let currentMonth = new Date();

function loadBookings() {
  const stored = localStorage.getItem(STORAGE_KEY);
  bookings = stored ? JSON.parse(stored) : [];
}

function saveBookings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function getDaysBetween(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end - start) / msPerDay);
}

function parseDate(value) {
  return new Date(value + 'T00:00:00');
}

function formatDate(value) {
  return value.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getBookingNights(booking) {
  const checkIn = parseDate(booking.checkIn);
  const checkOut = parseDate(booking.checkOut);
  return Math.max(0, getDaysBetween(checkIn, checkOut));
}

function bookingRangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function findConflict(checkIn, checkOut, excludeId = null) {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  return bookings.find((booking) => {
    if (booking.id === excludeId) {
      return false;
    }
    const existingStart = parseDate(booking.checkIn);
    const existingEnd = parseDate(booking.checkOut);
    return bookingRangesOverlap(start, end, existingStart, existingEnd);
  });
}

function clearForm() {
  bookingForm.reset();
  selectedBookingId = null;
  bookingForm.querySelector('button[type="submit"]').textContent = 'Save Booking';
}

function fillForm(booking) {
  bookingForm.guestName.value = booking.guestName;
  bookingForm.checkIn.value = booking.checkIn;
  bookingForm.checkOut.value = booking.checkOut;
  bookingForm.notes.value = booking.notes || '';
  selectedBookingId = booking.id;
  bookingForm.querySelector('button[type="submit"]').textContent = 'Update Booking';
}

function updateSummary() {
  const totalNights = bookings.reduce((sum, booking) => sum + getBookingNights(booking), 0);
  totalBookingsEl.textContent = bookings.length;
  totalNightsEl.textContent = totalNights;
  currentOccupancyEl.textContent = `${Math.round(calculateCurrentMonthOccupancy())}%`;
}

function calculateCurrentMonthOccupancy() {
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();

  const bookedDays = new Set();

  bookings.forEach((booking) => {
    let date = parseDate(booking.checkIn);
    const end = parseDate(booking.checkOut);

    while (date < end) {
      if (date >= monthStart && date <= monthEnd) {
        bookedDays.add(date.toISOString().slice(0, 10));
      }
      date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    }
  });

  return daysInMonth === 0 ? 0 : (bookedDays.size / daysInMonth) * 100;
}

function renderBookings() {
  bookingListBody.innerHTML = '';

  bookings.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  bookings.forEach((booking) => {
    const nights = getBookingNights(booking);
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${booking.guestName}</td>
      <td>${formatDate(parseDate(booking.checkIn))}</td>
      <td>${formatDate(parseDate(booking.checkOut))}</td>
      <td>${nights}</td>
      <td>${booking.notes ? booking.notes : ''}</td>
      <td>
        <button class="action-button" data-action="edit" data-id="${booking.id}">Edit</button>
        <button class="action-button danger" data-action="delete" data-id="${booking.id}">Delete</button>
      </td>
    `;

    bookingListBody.appendChild(row);
  });
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekDay = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const days = [];

  for (let i = 0; i < startWeekDay; i += 1) {
    days.push(null);
  }

  for (let date = 1; date <= daysInMonth; date += 1) {
    days.push(new Date(year, month, date));
  }

  return days;
}

function bookingCoversDate(booking, date) {
  const checkIn = parseDate(booking.checkIn);
  const checkOut = parseDate(booking.checkOut);
  return date >= checkIn && date < checkOut;
}

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = getCalendarDays(year, month);
  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  calendarEl.innerHTML = '';

  weekdayLabels.forEach((label) => {
    const headerCell = document.createElement('div');
    headerCell.className = 'calendar-day-header';
    headerCell.textContent = label;
    calendarEl.appendChild(headerCell);
  });

  days.forEach((date) => {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';

    if (date === null) {
      cell.innerHTML = '&nbsp;';
      calendarEl.appendChild(cell);
      return;
    }

    const dateString = date.getDate();
    cell.innerHTML = `<span>${dateString}</span>`;

    const booked = bookings.some((booking) => bookingCoversDate(booking, date));
    if (booked) {
      cell.classList.add('booked');
      const dot = document.createElement('div');
      dot.className = 'booking-dot';
      cell.appendChild(dot);
    }

    calendarEl.appendChild(cell);
  });

  calendarMonthEl.textContent = currentMonth.toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function addOrUpdateBooking(data) {
  if (selectedBookingId) {
    bookings = bookings.map((booking) => (booking.id === selectedBookingId ? { ...booking, ...data, id: selectedBookingId } : booking));
  } else {
    bookings.push({ id: Date.now().toString(), ...data });
  }
}

function deleteBooking(id) {
  bookings = bookings.filter((booking) => booking.id !== id);
}

function handleFormSubmit(event) {
  event.preventDefault();

  const guestName = bookingForm.guestName.value.trim();
  const checkIn = bookingForm.checkIn.value;
  const checkOut = bookingForm.checkOut.value;
  const notes = bookingForm.notes.value.trim();

  if (!guestName || !checkIn || !checkOut) {
    alert('Please fill in the guest name, check-in date, and check-out date.');
    return;
  }

  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);

  if (checkOutDate <= checkInDate) {
    alert('Check-out date must be after check-in date.');
    return;
  }

  const conflict = findConflict(checkIn, checkOut, selectedBookingId);
  if (conflict) {
    alert(
      `Booking conflict with existing reservation for ${conflict.guestName} from ${formatDate(
        parseDate(conflict.checkIn)
      )} to ${formatDate(parseDate(conflict.checkOut))}. Please choose different dates.`
    );
    return;
  }

  addOrUpdateBooking({ guestName, checkIn, checkOut, notes });
  saveBookings();
  renderApp();
  clearForm();
}

function handleTableClick(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === 'edit') {
    const booking = bookings.find((item) => item.id === id);
    if (booking) {
      fillForm(booking);
    }
  }

  if (action === 'delete') {
    if (confirm('Delete this booking?')) {
      deleteBooking(id);
      saveBookings();
      renderApp();
      if (selectedBookingId === id) {
        clearForm();
      }
    }
  }
}

function renderApp() {
  updateSummary();
  renderBookings();
  renderCalendar();
}

function changeMonth(amount) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1);
  renderApp();
}

bookingForm.addEventListener('submit', handleFormSubmit);
clearFormButton.addEventListener('click', clearForm);
bookingListBody.addEventListener('click', handleTableClick);
prevMonthButton.addEventListener('click', () => changeMonth(-1));
nextMonthButton.addEventListener('click', () => changeMonth(1));

loadBookings();
renderApp();
