document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }

    initAdminStats();
    loadDashboardRecent();
    loadAllBookings();
    loadAdminDestinations();
    loadAdminHotels();
    loadAllUsers();

    const urlParams = new URLSearchParams(window.location.search);
    const editType = urlParams.get('editType');
    const editId = urlParams.get('editId');
    if (editType && editId) {
        if (editType === 'destination') {
            showView('destinations');
            openEditDestModal(editId);
        } else if (editType === 'hotel') {
            showView('hotels');
            openEditHotelModal(editId);
        }
    }
    document.getElementById('bookingSearch')?.addEventListener('input', (e) => {
        filterBookings(e.target.value);
    });

    document.getElementById('destForm')?.addEventListener('submit', handleDestSubmit);


    window.addEventListener('storage', (e) => {
        if (!e.key) return;


        if (e.key === 'bookings') {
            initAdminStats();
            loadDashboardRecent();
            loadAllBookings();
        } else if (e.key === 'contactMessages') {
            initAdminStats();
            loadAdminMessages();
        } else if (e.key === 'destinations') {
            loadAdminDestinations();
        } else if (e.key === 'hotels') {
            loadAdminHotels();
        } else if (e.key === 'users') {
            loadAllUsers();
        }
    });
});

function showView(viewName) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.add('d-none'));
    document.getElementById(viewName + 'View').classList.remove('d-none');
    document.querySelectorAll('.nav-link').forEach(l => {
        if (l.innerText.toLowerCase().includes(viewName)) l.classList.add('active');
        else l.classList.remove('active');
    });

    const titles = {
        'dashboard': 'Executive Dashboard',
        'bookings': 'Booking Management',
        'destinations': 'Package & Destination Management',
        'hotels': 'Hotel & Property Management',
        'users': 'Registered Accounts',
        'messages': 'Contact Form Submissions'
    };
    document.getElementById('viewTitle').innerText = titles[viewName] || 'Admin Panel';

    if (viewName === 'messages') {
        localStorage.setItem('lastMessagesViewed', Date.now());
        loadAdminMessages();
        initAdminStats();
    }
}

function initAdminStats() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const destinations = JSON.parse(localStorage.getItem('destinations') || '[]');

    document.getElementById('totalBookings').innerText = bookings.length;
    document.getElementById('totalUsersStat').innerText = users.length;

    const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    const lastViewed = parseInt(localStorage.getItem('lastMessagesViewed') || '0');


    const unreadMessages = messages.filter(m => {
        const msgTime = new Date(m.timestamp).getTime();
        return msgTime > lastViewed;
    });

    const msgBadge = document.getElementById('msgBadge');
    const newMsgCount = document.getElementById('newMsgCount');

    if (msgBadge) {
        msgBadge.innerText = unreadMessages.length;
        msgBadge.classList.toggle('d-none', unreadMessages.length === 0);
    }
    if (newMsgCount) {
        newMsgCount.innerText = unreadMessages.length;
    }

    const revenue = bookings.reduce((sum, b) => sum + (parseFloat(b.totalAmount) || 0), 0);
    document.getElementById('totalRevenue').innerText = '₹' + Math.round(revenue).toLocaleString('en-IN');

    const intl = bookings.filter(b => b.category === 'Travel' && b.type === 'international').length;
    const dom = bookings.filter(b => b.category === 'Travel' && b.type === 'domestic').length;
    const hotel = bookings.filter(b => b.category === 'Hotel').length;

    document.getElementById('intlCount').innerText = intl;
    document.getElementById('domCount').innerText = dom;
    document.getElementById('hotelCount').innerText = hotel;
    document.getElementById('activeTrips').innerText = bookings.length;
}

function loadDashboardRecent() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const table = document.getElementById('recentBookingsTable');
    if (!table) return;
    const recent = bookings.slice(-5).reverse();
    table.innerHTML = recent.map(b => `
        <tr>
            <td>
                <div class="fw-bold">${b.userName || 'Guest'}</div>
                <div class="small text-muted">${b.email}</div>
            </td>
            <td>${b.destination}</td>
            <td>${new Date(b.date).toLocaleDateString('en-IN')}</td>
            <td class="fw-bold">₹${Math.round(b.totalAmount).toLocaleString()}</td>
            <td><span class="status-badge bg-success-subtle text-success">Confirmed</span></td>
        </tr>
    `).join('');
}

function loadAllBookings() {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    renderBookingTable(bookings);
}

function renderBookingTable(bookings) {
    const table = document.getElementById('allBookingsTable');
    if (!table) return;

    table.innerHTML = bookings.map(b => {

        const travelerSummary = b.travelers ? b.travelers.map(t =>
            `<div class="small"><i class="fas fa-user-tag me-1 text-primary"></i>${t.name} (${t.idNumber || t.idCard || t.passport || 'Verified'})</div>`
        ).join('') : '<div class="small text-muted">No details found</div>';

        return `
        <tr>
            <td class="font-monospace small">#${b.bookingId.substring(0, 8)}</td>
            <td>
                <div class="fw-bold">${b.name || b.userName || 'Guest'}</div>
                <div class="small text-muted">${b.email}</div>
            </td>
            <td>
                <div class="fw-bold">${b.destination}</div>
                <div class="small text-muted mb-1">${b.category} &bull; ${b.persons} Pax</div>
                <div class="traveler-preview p-2 bg-light rounded border-start border-3 border-primary" style="max-height: 80px; overflow-y: auto;">
                    ${travelerSummary}
                </div>
            </td>
            <td>${new Date(b.date).toLocaleDateString('en-IN')}</td>
            <td class="fw-bold">₹${Math.round(b.totalAmount).toLocaleString()}</td>
            <td><span class="status-badge bg-success-subtle text-success">Confirmed</span></td>
            <td>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="viewBookingDocs('${b.bookingId}')" title="View Documentation">
                        <i class="fas fa-file-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="cancelBookingAdmin('${b.bookingId}')" title="Cancel Booking">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

function filterBookings(query) {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const filtered = bookings.filter(b =>
        b.bookingId.toLowerCase().includes(query.toLowerCase()) ||
        b.email.toLowerCase().includes(query.toLowerCase()) ||
        b.destination.toLowerCase().includes(query.toLowerCase())
    );
    renderBookingTable(filtered);
}

function viewBookingDocs(id) {
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const b = bookings.find(x => x.bookingId === id);
    if (!b) return;

    let docList = '<div class="text-center p-4">No traveler documentation available for this booking.</div>';
    if (b.travelers && b.travelers.length > 0) {
        docList = `<div class="row g-3">` + b.travelers.map(t => {
            const idVal = t.idNumber || t.idCard || t.passport || 'N/A';
            const docName = t.fileName || t.documentName || 'ID_Document.jpg';

            return `
            <div class="col-md-6">
                <div class="border rounded p-3 bg-white h-100 shadow-sm text-center">
                    <div class="fw-bold mb-2 text-primary border-bottom pb-1">${t.name}</div>
                    ${t.document ? `
                        <div class="mb-2 d-flex justify-content-center">
                           <img src="${t.document}" class="img-fluid rounded border shadow-sm"
                                style="max-height: 180px; width: 100%; cursor: pointer; object-fit: contain; background: #f8f9fa;"
                                onclick="window.open('${t.document}')"
                                onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\'text-danger small\'>Image Failed to Load</div>'"
                                title="Click to view full size">
                        </div>
                    ` : `
                        <div class="d-flex flex-column align-items-center justify-content-center p-4 bg-light rounded mb-2 border-dashed" style="height: 120px; border: 2px dashed #dee2e6;">
                            <i class="fas fa-id-card fa-3x text-muted mb-2"></i>
                            <div class="text-danger small fw-bold">Image Missing</div>
                        </div>
                    `}
                    <div class="d-flex justify-content-between align-items-center mt-2 px-1">
                        <span class="small text-muted text-truncate" style="max-width: 120px;">
                            <i class="fas fa-file-image me-1"></i>Document
                        </span>
                        <span class="badge bg-primary rounded-pill">ID: ${idVal}</span>
                    </div>
                </div>
            </div>
            `;
        }).join('') + `</div>`;
    }

    if (typeof showCustomAlert === 'function') {
        showCustomAlert(docList, 'info', `Traveler Documents: ${b.destination} (#${id})`);
    } else {

        const summary = b.travelers?.map(t => `${t.name}: ${t.idNumber || t.idCard || t.passport}`).join('\n');
        alert(`Traveler Documentation for ${b.destination}:\n\n${summary || 'No data'}`);
    }
}

function cancelBookingAdmin(id) {
    showDeleteConfirm('Booking', () => {
        let bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
        bookings = bookings.filter(x => x.bookingId !== id);
        localStorage.setItem('bookings', JSON.stringify(bookings));

        showAdminToast('Booking cancelled by administrator.', 'success');
        loadAllBookings();
        initAdminStats();
    });
}

function loadAdminDestinations() {
    const dests = JSON.parse(localStorage.getItem('destinations') || '[]');
    const table = document.getElementById('adminDestinationsTable');
    if (!table) return;

    table.innerHTML = dests.map(d => `
        <tr>
            <td><img src="${d.image}" class="rounded" width="50" height="35" style="object-fit: cover" onerror="this.src='https://via.placeholder.com/50x35?text=NA'"></td>
            <td class="fw-bold">${d.name}</td>
            <td><span class="badge bg-light text-dark border">${d.category}</span></td>
            <td class="fw-bold">₹${d.price.toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-info rounded-pill me-1" onclick="openEditDestModal(${d.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteDestAdmin(${d.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function openAddDestinationModal() {
    document.getElementById('destForm').reset();
    document.getElementById('destId').value = '';
    document.getElementById('destModalTitle').innerText = 'Add New Package';
    new bootstrap.Modal(document.getElementById('destModal')).show();
}

function openEditDestModal(idOrName) {
    const dests = JSON.parse(localStorage.getItem('destinations') || '[]');
    let d = dests.find(x => x.id === parseInt(idOrName));

    if (!d) {
        d = dests.find(x => x.name.toLowerCase() === String(idOrName).toLowerCase());
    }

    if (!d) {
        console.error('Destination not found:', idOrName);
        return;
    }

    document.getElementById('destId').value = d.id;
    document.getElementById('destName').value = d.name;
    document.getElementById('destPrice').value = d.price;
    document.getElementById('destDuration').value = d.duration;
    document.getElementById('destCategory').value = d.category;
    document.getElementById('destType').value = d.type || 'international';
    document.getElementById('destImage').value = d.image;
    document.getElementById('destDescription').value = d.description;

    document.getElementById('destModalTitle').innerText = 'Edit Package: ' + d.name;
    new bootstrap.Modal(document.getElementById('destModal')).show();
}

function handleDestSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('destId').value;
    const dests = JSON.parse(localStorage.getItem('destinations') || '[]');

    const destObj = {
        id: id ? parseInt(id) : Date.now(),
        name: document.getElementById('destName').value,
        price: parseInt(document.getElementById('destPrice').value),
        duration: parseInt(document.getElementById('destDuration').value),
        category: document.getElementById('destCategory').value,
        type: document.getElementById('destType').value,
        image: document.getElementById('destImage').value,
        description: document.getElementById('destDescription').value,
        rating: 4.5,
        month: 'summer'
    };

    if (id) {
        const idx = dests.findIndex(x => x.id === parseInt(id));
        if (idx !== -1) dests[idx] = destObj;
    } else {
        dests.push(destObj);
    }

    localStorage.setItem('destinations', JSON.stringify(dests));
    bootstrap.Modal.getInstance(document.getElementById('destModal')).hide();

    showAdminToast(id ? 'Package updated successfully!' : 'New package added!', 'success');
    loadAdminDestinations();
}

function deleteDestAdmin(id) {
    showDeleteConfirm('Package', () => {
        let dests = JSON.parse(localStorage.getItem('destinations') || '[]');
        dests = dests.filter(x => x.id !== id);
        localStorage.setItem('destinations', JSON.stringify(dests));
        showAdminToast('Package deleted.', 'warning');
        loadAdminDestinations();
    });
}

function loadAdminHotels() {
    const hotels = JSON.parse(localStorage.getItem('hotels') || '[]');
    const table = document.getElementById('adminHotelsTable');
    if (!table) return;

    if (hotels.length === 0) {
        table.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hotels managed in database.</td></tr>';
        return;
    }

    table.innerHTML = hotels.map(h => `
        <tr>
            <td><img src="${h.image}" class="rounded" width="50" height="35" style="object-fit: cover" onerror="this.src='https://via.placeholder.com/50x35?text=NA'"></td>
            <td class="fw-bold">${h.name}</td>
            <td>${h.location}</td>
            <td class="fw-bold">₹${parseInt(h.price).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-info rounded-pill me-1" onclick="openEditHotelModal('${h.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteHotelAdmin('${h.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function openAddHotelModal() {
    document.getElementById('hotelForm').reset();
    document.getElementById('hotelId').value = '';
    document.getElementById('hotelModalTitle').innerText = 'Add New Hotel';
    new bootstrap.Modal(document.getElementById('hotelModal')).show();
}

function openEditHotelModal(id) {
    const hotels = JSON.parse(localStorage.getItem('hotels') || '[]');
    const h = hotels.find(x => x.id === id);
    if (!h) return;

    document.getElementById('hotelId').value = h.id;
    document.getElementById('hotelName').value = h.name;
    document.getElementById('hotelLocation').value = h.location;
    document.getElementById('hotelPrice').value = h.price;
    document.getElementById('hotelImage').value = h.image;
    document.getElementById('hotelDescription').value = h.description;

    document.getElementById('hotelModalTitle').innerText = 'Edit Hotel: ' + h.name;
    new bootstrap.Modal(document.getElementById('hotelModal')).show();
}

function handleHotelSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('hotelId').value;
    const hotels = JSON.parse(localStorage.getItem('hotels') || '[]');

    const hotelObj = {
        id: id || ('HOT-' + Math.floor(1000 + Math.random() * 9000)),
        name: document.getElementById('hotelName').value,
        location: document.getElementById('hotelLocation').value,
        price: parseInt(document.getElementById('hotelPrice').value),
        image: document.getElementById('hotelImage').value,
        description: document.getElementById('hotelDescription').value,
        rating: 4.8
    };

    if (id) {
        const idx = hotels.findIndex(x => x.id === id);
        if (idx !== -1) hotels[idx] = hotelObj;
    } else {
        hotels.push(hotelObj);
    }

    localStorage.setItem('hotels', JSON.stringify(hotels));
    bootstrap.Modal.getInstance(document.getElementById('hotelModal')).hide();

    showAdminToast(id ? 'Hotel updated successfully!' : 'New hotel added!', 'success');
    loadAdminHotels();
    if (typeof renderHotels === 'function') renderHotels();
}

function deleteHotelAdmin(id) {
    showDeleteConfirm('Hotel', () => {
        let hotels = JSON.parse(localStorage.getItem('hotels') || '[]');
        hotels = hotels.filter(x => x.id !== id);
        localStorage.setItem('hotels', JSON.stringify(hotels));
        showAdminToast('Hotel deleted.', 'warning');
        loadAdminHotels();
    });
}

function showDeleteConfirm(itemType, onConfirm) {
    document.getElementById('deleteConfirmText').innerText = `This ${itemType} will be permanently removed from the website. This action cannot be undone.`;
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = () => {
        onConfirm();
        bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
    };
    new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
}

window.deleteItemAdmin = function (type, id) {
    if (type === 'hotel') {
        deleteHotelAdmin(id);
    } else {
        deleteDestAdmin(parseInt(id));
    }
}

function loadAllUsers() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const table = document.getElementById('allUsersTable');
    if (!table) return;

    table.innerHTML = users.map(u => `
        <tr>
            <td class="fw-bold">${u.name}</td>
            <td>${u.email}</td>
            <td>${u.phone}</td>
            <td class="small text-muted">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
            <td><span class="badge ${u.email === 'admin@tripzy.com' ? 'bg-danger' : 'bg-primary'}">${u.email === 'admin@tripzy.com' ? 'Admin' : 'User'}</span></td>
        </tr>
    `).join('');
}

function showAdminToast(msg, type = 'success') {
    const toastEl = document.getElementById('adminToast');
    const msgEl = document.getElementById('adminToastMessage');
    if (toastEl && msgEl) {
        msgEl.textContent = msg;
        toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
    } else {
        alert(msg);
    }
}
function loadAdminMessages() {
    const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    const table = document.getElementById('adminMessagesTable');
    if (!table) return;

    if (messages.length === 0) {
        table.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No messages found.</td></tr>';
        return;
    }

    table.innerHTML = messages.map((m, index) => `
        <tr>
            <td class="small text-muted">${m.timestamp}</td>
            <td class="fw-bold">${m.name}</td>
            <td>${m.email}</td>
            <td><div class="small text-wrap" style="max-width: 300px;">${m.message}</div></td>
            <td>
                <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteMessageAdmin(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function deleteMessageAdmin(index) {
    showDeleteConfirm('Message', () => {
        let messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
        messages.splice(index, 1);
        localStorage.setItem('contactMessages', JSON.stringify(messages));
        showAdminToast('Message deleted.', 'warning');
        loadAdminMessages();
        initAdminStats();
    });
}
