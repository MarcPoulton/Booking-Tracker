const STORAGE_KEY = 'holidayHomeBookings';

const bookingForm = document.getElementById('booking-form');
const clearFormButton = document.getElementById('clear-form');
const bookingListBody = document.getElementById('booking-list');
const editModalEl = document.getElementById('edit-modal');
const editBookingForm = document.getElementById('edit-booking-form');
const closeEditModalButton = document.getElementById('close-edit-modal');
const cancelEditModalButton = document.getElementById('cancel-edit-modal');
const deleteModalEl = document.getElementById('delete-modal');
const closeDeleteModalButton = document.getElementById('close-delete-modal');
const cancelDeleteModalButton = document.getElementById('cancel-delete-button');
const confirmDeleteButton = document.getElementById('confirm-delete-button');
const deleteModalMessageEl = document.getElementById('delete-modal-message');
const showAllBookingsButton = document.getElementById('show-all-bookings-button');
const allBookingsModalEl = document.getElementById('all-bookings-modal');
const closeAllBookingsModalButton = document.getElementById('close-all-bookings-modal');
const allBookingsContentEl = document.getElementById('all-bookings-content');
const totalBookingsEl = document.getElementById('totalBookings');
const totalNightsEl = document.getElementById('totalNights');
const totalEarningsEl = document.getElementById('totalEarnings');
const currentOccupancyEl = document.getElementById('currentOccupancy');
const calendarEl = document.getElementById('calendar');
const calendarMonthEl = document.getElementById('calendarMonth');
const prevMonthButton = document.getElementById('prevMonth');
const nextMonthButton = document.getElementById('nextMonth');
const exportBookingsButton = document.getElementById('export-bookings-button');
const importBookingsButton = document.getElementById('import-bookings-button');

let bookings = [];
let selectedBookingId = null;
let editingBookingId = null;
let pendingDeleteBookingId = null;
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
  const date = value instanceof Date ? new Date(value) : new Date(value + 'T00:00:00');
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(value) {
  return value.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'GBP',
  }).format(value);
}

function getBookingAmountPaid(booking) {
  const parsedValue = Number(booking.amountPaid || 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function calculateTotalAmountPaid(bookingsList) {
  return bookingsList.reduce((sum, booking) => sum + getBookingAmountPaid(booking), 0);
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
  bookingForm.amountPaid.value = '';
  selectedBookingId = null;
  bookingForm.querySelector('button[type="submit"]').textContent = 'Save Booking';
}

function closeEditModal() {
  editModalEl.classList.add('hidden');
  editModalEl.setAttribute('aria-hidden', 'true');
  editingBookingId = null;
}

function openEditModal(booking) {
  editBookingForm.guestName.value = booking.guestName;
  editBookingForm.checkIn.value = booking.checkIn;
  editBookingForm.checkOut.value = booking.checkOut;
  editBookingForm.notes.value = booking.notes || '';
  editBookingForm.amountPaid.value = booking.amountPaid ?? '';
  editingBookingId = booking.id;
  editModalEl.classList.remove('hidden');
  editModalEl.setAttribute('aria-hidden', 'false');
  editBookingForm.guestName.focus();
}

function closeDeleteModal() {
  deleteModalEl.classList.add('hidden');
  deleteModalEl.setAttribute('aria-hidden', 'true');
  pendingDeleteBookingId = null;
}

function openDeleteModal(booking) {
  deleteModalMessageEl.textContent = `Are you sure you want to delete the booking for ${booking.guestName}?`;
  pendingDeleteBookingId = booking.id;
  deleteModalEl.classList.remove('hidden');
  deleteModalEl.setAttribute('aria-hidden', 'false');
  confirmDeleteButton.focus();
}

function closeAllBookingsModal() {
  allBookingsModalEl.classList.add('hidden');
  allBookingsModalEl.setAttribute('aria-hidden', 'true');
}

function openAllBookingsModal() {
  renderAllBookingsModal();
  allBookingsModalEl.classList.remove('hidden');
  allBookingsModalEl.setAttribute('aria-hidden', 'false');
}

function renderAllBookingsModal() {
  if (!allBookingsContentEl) {
    return;
  }

  const sortedBookings = [...bookings].sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

  if (sortedBookings.length === 0) {
    allBookingsContentEl.innerHTML = '<p>No bookings yet.</p>';
    return;
  }

  allBookingsContentEl.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Guest</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Nights</th>
            <th>Paid</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${sortedBookings.map((booking) => `
            <tr>
              <td>${booking.guestName}</td>
              <td>${formatDate(parseDate(booking.checkIn))}</td>
              <td>${formatDate(parseDate(booking.checkOut))}</td>
              <td>${getBookingNights(booking)}</td>
              <td>${formatCurrency(getBookingAmountPaid(booking))}</td>
              <td>${booking.notes ? booking.notes : ''}</td>
              <td>
                <button class="action-button" data-action="edit" data-id="${booking.id}">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function updateSummary() {
  const totalNights = bookings.reduce((sum, booking) => sum + getBookingNights(booking), 0);
  const totalEarnings = calculateTotalAmountPaid(bookings);

  if (totalBookingsEl) {
    totalBookingsEl.textContent = bookings.length;
  }
  if (totalNightsEl) {
    totalNightsEl.textContent = totalNights;
  }
  if (totalEarningsEl) {
    totalEarningsEl.textContent = formatCurrency(totalEarnings);
  }
  if (currentOccupancyEl) {
    currentOccupancyEl.textContent = `${Math.round(calculateCurrentMonthOccupancy())}%`;
  }
}

function getDateKey(value) {
  const date = parseDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
        bookedDays.add(getDateKey(date));
      }
      date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    }
  });

  return daysInMonth === 0 ? 0 : (bookedDays.size / daysInMonth) * 100;
}

function renderBookings() {
  if (!bookingListBody) {
    return;
  }

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
      <td>${formatCurrency(getBookingAmountPaid(booking))}</td>
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
  const targetDate = parseDate(date);
  return targetDate >= checkIn && targetDate < checkOut;
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

function addOrUpdateBooking(data, id = null) {
  if (id) {
    bookings = bookings.map((booking) => (booking.id === id ? { ...booking, ...data, id } : booking));
  } else {
    bookings.push({ id: Date.now().toString(), ...data });
  }
}

function deleteBooking(id) {
  bookings = bookings.filter((booking) => booking.id !== id);
}

function handleDeleteConfirm() {
  if (!pendingDeleteBookingId) {
    return;
  }

  deleteBooking(pendingDeleteBookingId);
  saveBookings();
  renderApp();
  if (selectedBookingId === pendingDeleteBookingId) {
    clearForm();
  }
  closeDeleteModal();
}

function handleFormSubmit(event) {
  event.preventDefault();

  const guestName = bookingForm.guestName.value.trim();
  const checkIn = bookingForm.checkIn.value;
  const checkOut = bookingForm.checkOut.value;
  const notes = bookingForm.notes.value.trim();
  const amountPaidInput = bookingForm.amountPaid.value.trim();

  if (!guestName || !checkIn || !checkOut) {
    alert('Please fill in the guest name, check-in date, and check-out date.');
    return;
  }

  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);
  const amountPaid = amountPaidInput === '' ? 0 : Number(amountPaidInput);

  if (checkOutDate <= checkInDate) {
    alert('Check-out date must be after check-in date.');
    return;
  }

  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    alert('Please enter a valid amount paid of 0 or more.');
    return;
  }

  const conflict = findConflict(checkIn, checkOut);
  if (conflict) {
    alert(
      `Booking conflict with existing reservation for ${conflict.guestName} from ${formatDate(
        parseDate(conflict.checkIn)
      )} to ${formatDate(parseDate(conflict.checkOut))}. Please choose different dates.`
    );
    return;
  }

  addOrUpdateBooking({ guestName, checkIn, checkOut, notes, amountPaid });
  saveBookings();
  renderApp();
  clearForm();
}

function handleEditFormSubmit(event) {
  event.preventDefault();

  if (!editingBookingId) {
    return;
  }

  const guestName = editBookingForm.guestName.value.trim();
  const checkIn = editBookingForm.checkIn.value;
  const checkOut = editBookingForm.checkOut.value;
  const notes = editBookingForm.notes.value.trim();
  const amountPaidInput = editBookingForm.amountPaid.value.trim();

  if (!guestName || !checkIn || !checkOut) {
    alert('Please fill in the guest name, check-in date, and check-out date.');
    return;
  }

  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);
  const amountPaid = amountPaidInput === '' ? 0 : Number(amountPaidInput);

  if (checkOutDate <= checkInDate) {
    alert('Check-out date must be after check-in date.');
    return;
  }

  if (!Number.isFinite(amountPaid) || amountPaid < 0) {
    alert('Please enter a valid amount paid of 0 or more.');
    return;
  }

  const conflict = findConflict(checkIn, checkOut, editingBookingId);
  if (conflict) {
    alert(
      `Booking conflict with existing reservation for ${conflict.guestName} from ${formatDate(
        parseDate(conflict.checkIn)
      )} to ${formatDate(parseDate(conflict.checkOut))}. Please choose different dates.`
    );
    return;
  }

  addOrUpdateBooking({ guestName, checkIn, checkOut, notes, amountPaid }, editingBookingId);
  saveBookings();
  renderApp();
  closeEditModal();
}

function handleBookingAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  const booking = bookings.find((item) => item.id === id);
  if (!booking) return;

  if (action === 'edit') {
    openEditModal(booking);
  }

  if (action === 'delete') {
    openDeleteModal(booking);
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

function buildExportData() {
  return {
    exportedAt: new Date().toISOString(),
    totalBookings: bookings.length,
    totalNights: bookings.reduce((sum, booking) => sum + getBookingNights(booking), 0),
    totalEarnings: calculateTotalAmountPaid(bookings),
    bookings: bookings.map((booking) => ({
      id: booking.id,
      guestName: booking.guestName,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      amountPaid: booking.amountPaid ?? 0,
      notes: booking.notes || '',
      nights: getBookingNights(booking),
    })),
  };
}

async function exportBookings() {
  const exportData = buildExportData();
  const fileContent = JSON.stringify(exportData, null, 2);
  const fileName = `bookings-export-${new Date().toISOString().slice(0, 10)}.json`;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'JSON Files',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(fileContent);
      await writable.close();
      return;
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
    }
  }

  const blob = new Blob([fileContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importBookingsFromData(importData) {
  if (!importData || !Array.isArray(importData.bookings)) {
    throw new Error('Invalid booking export data.');
  }

  bookings = importData.bookings.map((booking) => ({
    id: booking.id || Date.now().toString() + Math.random().toString(16).slice(2),
    guestName: booking.guestName || '',
    checkIn: booking.checkIn || '',
    checkOut: booking.checkOut || '',
    amountPaid: booking.amountPaid ?? 0,
    notes: booking.notes || '',
  }));

  saveBookings();
  renderApp();
}

async function importBookings() {
  if (!window.showOpenFilePicker) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', async () => {
      const [file] = input.files || [];
      if (!file) {
        return;
      }

      const text = await file.text();
      const parsed = JSON.parse(text);
      importBookingsFromData(parsed);
    });
    input.click();
    return;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'JSON Files',
          accept: {
            'application/json': ['.json'],
          },
        },
      ],
      multiple: false,
    });
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    importBookingsFromData(parsed);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      throw error;
    }
  }
}

bookingForm.addEventListener('submit', handleFormSubmit);
editBookingForm.addEventListener('submit', handleEditFormSubmit);
clearFormButton.addEventListener('click', clearForm);
closeEditModalButton.addEventListener('click', closeEditModal);
cancelEditModalButton.addEventListener('click', closeEditModal);
closeDeleteModalButton.addEventListener('click', closeDeleteModal);
cancelDeleteModalButton.addEventListener('click', closeDeleteModal);
confirmDeleteButton.addEventListener('click', handleDeleteConfirm);
showAllBookingsButton.addEventListener('click', openAllBookingsModal);
closeAllBookingsModalButton.addEventListener('click', closeAllBookingsModal);
editModalEl.addEventListener('click', (event) => {
  if (event.target === editModalEl || event.target.dataset.closeModal === 'true') {
    closeEditModal();
  }
});
deleteModalEl.addEventListener('click', (event) => {
  if (event.target === deleteModalEl || event.target.dataset.closeModal === 'true') {
    closeDeleteModal();
  }
});
allBookingsModalEl.addEventListener('click', (event) => {
  if (event.target === allBookingsModalEl || event.target.dataset.closeModal === 'true') {
    closeAllBookingsModal();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!editModalEl.classList.contains('hidden')) {
      closeEditModal();
    } else if (!deleteModalEl.classList.contains('hidden')) {
      closeDeleteModal();
    } else if (!allBookingsModalEl.classList.contains('hidden')) {
      closeAllBookingsModal();
    }
  }
});
if (bookingListBody) {
  bookingListBody.addEventListener('click', handleBookingAction);
}
if (allBookingsContentEl) {
  allBookingsContentEl.addEventListener('click', handleBookingAction);
}
prevMonthButton.addEventListener('click', () => changeMonth(-1));
nextMonthButton.addEventListener('click', () => changeMonth(1));
if (exportBookingsButton) {
  exportBookingsButton.addEventListener('click', () => {
    exportBookings().catch(() => {
      alert('Export failed. Please try again.');
    });
  });
}
if (importBookingsButton) {
  importBookingsButton.addEventListener('click', () => {
    importBookings().catch(() => {
      alert('Import failed. Please choose a valid exported bookings file.');
    });
  });
}
window.addEventListener('beforeunload', saveBookings);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveBookings();
  }
});

loadBookings();
renderApp();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateTotalAmountPaid,
    formatCurrency,
  };
}
