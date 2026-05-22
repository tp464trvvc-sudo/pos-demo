// app.js - Restoran POS with Firebase Multi-Device

// ========== FIREBASE YAPILANDIRMASI ==========
const firebaseConfig = {
  apiKey: "AIzaSyAyVlC42OSjAQMJLc6F-atg9gB_vCr1Byk",
  authDomain: "fir-pos-cf459.firebaseapp.com",
  projectId: "fir-pos-cf459",
  storageBucket: "fir-pos-cf459.firebasestorage.app",
  messagingSenderId: "819997321495",
  appId: "1:819997321495:web:b177377fa2eba4d1bbaf52",
  databaseURL: "https://fir-pos-cf459-default-rtdb.europe-west1.firebasedatabase.app"
};

let database = null;
let fbReady = false;

// ========== VERİ YAPILARI ==========
const DEFAULT_PRODUCTS = [
  { id: 1, name: "Bira", category: "icecek", variants: [{ id: "v1", size: "33cl", price: 35, stock: 20 }, { id: "v2", size: "50cl", price: 50, stock: 15 }] },
  { id: 2, name: "Viski", category: "icecek", variants: [{ id: "v3", size: "35cl", price: 400, stock: 10 }, { id: "v4", size: "70cl", price: 750, stock: 5 }] },
  { id: 3, name: "Coca Cola", category: "icecek", variants: [{ id: "v5", size: "33cl", price: 15, stock: 50 }] },
  { id: 4, name: "Su", category: "icecek", variants: [{ id: "v6", size: "50cl", price: 5, stock: 100 }] },
  { id: 5, name: "Cips", category: "atistirmalik", variants: [{ id: "v7", size: "Büyük", price: 12, stock: 40 }] },
  { id: 6, name: "Çikolata", category: "tatli", variants: [{ id: "v8", size: "Standart", price: 10, stock: 30 }] },
  { id: 7, name: "Pizza", category: "yemek", variants: [{ id: "v9", size: "Orta", price: 85, stock: 999 }, { id: "v10", size: "Büyük", price: 110, stock: 999 }] },
  { id: 8, name: "Hamburger", category: "yemek", variants: [{ id: "v11", size: "Standart", price: 65, stock: 999 }] },
  { id: 9, name: "Makarna", category: "yemek", variants: [{ id: "v12", size: "Porsiyon", price: 55, stock: 999 }] },
  { id: 10, name: "Salata", category: "yemek", variants: [{ id: "v13", size: "Porsiyon", price: 45, stock: 999 }] }
];

const DEFAULT_CATEGORIES = [
  { name: "yemek", icon: "🍽️" }, 
  { name: "icecek", icon: "🥤" }, 
  { name: "atistirmalik", icon: "🍿" },
  { name: "tatli", icon: "🍰" }
];

const DEFAULT_USERS = [
  { username: "admin", password: "1234", role: "admin" },
  { username: "kasiyer", password: "1234", role: "user" },
  { username: "garson", password: "1234", role: "waiter" }
];

const DEFAULT_TABLES = [
  { id: 1, name: "Masa 1" },
  { id: 2, name: "Masa 2" },
  { id: 3, name: "Masa 3" },
  { id: 4, name: "Masa 4" },
  { id: 5, name: "Masa 5" },
  { id: 6, name: "Masa 6" },
  { id: 7, name: "Bahçe 1" },
  { id: 8, name: "Bahçe 2" }
];

// ========== GLOBAL DEĞİŞKENLER ==========
let currentUser = null;
let products = [], categories = [], logs = [];
let kasa = 0, toplamCiro = 0, toplamGider = 0, gunlukCiro = 0, gunlukGider = 0;
let tables = [], tableOrders = {};
let currentTableId = null;
let currentCategory = "yemek";
let editingProductId = null, editingVariantProductId = null, editingVariantId = null;
let pendingNewProduct = null, editingCategoryName = null;
let editingTableId = null;
let isTablePaymentInProgress = false;

// ========== FIREBASE BAĞLANTISI ==========
function initFirebase() {
  return new Promise((resolve) => {
    console.log('🔄 Firebase başlatılıyor...');
    
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      database = firebase.database();
      fbReady = true;
      console.log('✅ Firebase zaten hazır!');
      resolve(true);
      return;
    }
    
    const script1 = document.createElement('script');
    script1.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js';
    
    script1.onload = function() {
      const script2 = document.createElement('script');
      script2.src = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js';
      
      script2.onload = function() {
        try {
          firebase.initializeApp(firebaseConfig);
          database = firebase.database();
          fbReady = true;
          console.log('✅ Firebase ONLINE!');
          resolve(true);
        } catch(e) {
          console.warn('⚠️ Firebase başlatılamadı:', e.message);
          fbReady = false;
          resolve(false);
        }
      };
      
      script2.onerror = function() {
        console.warn('⚠️ Firebase Database script yüklenemedi');
        fbReady = false;
        resolve(false);
      };
      
      document.head.appendChild(script2);
    };
    
    script1.onerror = function() {
      console.warn('⚠️ Firebase App script yüklenemedi');
      fbReady = false;
      resolve(false);
    };
    
    document.head.appendChild(script1);
    
    setTimeout(() => {
      if (!fbReady) {
        console.warn('⏰ Firebase zaman aşımı, localStorage ile devam ediliyor');
        resolve(false);
      }
    }, 10000);
  });
}

// ========== VERİ KAYDETME ==========
function saveToFirebase(path, data) {
  if (fbReady && database) {
    database.ref(path).set(data).catch(e => console.warn('Firebase kaydetme hatası:', e));
  }
  // Offline yedek
  if (!fbReady || !database) {
    localStorage.setItem("restoran_pos_" + path, JSON.stringify(data));
  }
}

function loadFromLocal(key, defaultValue) {
  if (fbReady && database) {
    return defaultValue;
  }
  const data = localStorage.getItem("restoran_pos_" + key);
  return data ? JSON.parse(data) : defaultValue;
}

// ========== VERİ YÜKLEME ==========
function loadProducts() {
  products = loadFromLocal("products", JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)));
}

function saveProducts() {
  saveToFirebase("products", products);
}

function loadCategories() {
  categories = loadFromLocal("categories", JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)));
}

function saveCategories() {
  saveToFirebase("categories", categories);
}

function loadKasa() {
  const d = loadFromLocal("kasa", { balance: 0, total_income: 0, total_expense: 0, daily_income: 0, daily_expense: 0 });
  kasa = d.balance || 0;
  toplamCiro = d.total_income || 0;
  toplamGider = d.total_expense || 0;
  gunlukCiro = d.daily_income || 0;
  gunlukGider = d.daily_expense || 0;
}

function saveKasa() {
  saveToFirebase("kasa", { balance: kasa, total_income: toplamCiro, total_expense: toplamGider, daily_income: gunlukCiro, daily_expense: gunlukGider });
}

function loadLogs() {
  logs = loadFromLocal("logs", []);
}

function saveLog(message, type = 'info') {
  const timestamp = new Date().toLocaleString();
  logs.unshift(`[${timestamp}] [${type}] ${message}`);
  if (logs.length > 500) logs.pop();
  saveToFirebase("logs", logs);
}

function loadUsers() {
  return JSON.parse(JSON.stringify(DEFAULT_USERS));
}

function saveUsers(users) {
  saveToFirebase("users", users);
}

function loadTables() {
  tables = loadFromLocal("tables", JSON.parse(JSON.stringify(DEFAULT_TABLES)));
}

function saveTables() {
  saveToFirebase("tables", tables);
}

function loadTableOrders() {
  tableOrders = loadFromLocal("tableOrders", {});
  
  Object.keys(tableOrders).forEach(tableId => {
    if (tableOrders[tableId].status === 'paid') {
      tableOrders[tableId] = { items: [], status: 'empty', savedAt: null };
    }
  });
  saveTableOrders();
}

function saveTableOrders() {
  saveToFirebase("tableOrders", tableOrders);
}

async function loadNotifications(username) {
  const data = localStorage.getItem("restoran_notifications_" + username);
  return data ? JSON.parse(data) : [];
}

async function saveNotification(username, message, type = 'info') {
  let notifications = await loadNotifications(username);
  notifications.unshift({ id: Date.now(), message, type, createdAt: new Date().toISOString(), read: false });
  localStorage.setItem("restoran_notifications_" + username, JSON.stringify(notifications));
}

async function loadAllData() {
  loadProducts();
  loadCategories();
  loadKasa();
  loadLogs();
  loadTables();
  loadTableOrders();
}

// Firebase'den veri dinleme
function listenToFirebase() {
  if (!database) return;
  
  database.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      products = data;
      updateCategoryMenu();
      updateProductSelects();
      updateProductListDisplay();
      if (currentTableId) {
        renderTableProducts();
        renderTableCart();
      }
    }
  });
  
  database.ref('categories').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      categories = data;
      updateCategoryMenu();
      updateCategorySelects();
      displayCategoryList();
      if (currentTableId) renderTableProducts();
    }
  });
  
  database.ref('kasa').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      kasa = data.balance || 0;
      toplamCiro = data.total_income || 0;
      toplamGider = data.total_expense || 0;
      gunlukCiro = data.daily_income || 0;
      gunlukGider = data.daily_expense || 0;
      updateAdminStats();
    }
  });
  
  database.ref('tables').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      tables = data;
      renderTables();
      updateTablesListInAdmin();
    }
  });
  
  database.ref('tableOrders').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      tableOrders = data;
      renderTables();
      if (currentTableId) {
        renderTableCart();
        renderTableProducts();
      }
    }
  });
  
  database.ref('logs').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      logs = data;
    }
  });
  
  database.ref('users').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      updateUserList();
    }
  });
}

// ========== YARDIMCI FONKSİYONLAR ==========
function showModal(id) { 
  document.getElementById(id).style.display = "block"; 
  document.getElementById("modal-overlay").style.display = "block"; 
}

function closeModal(id) { 
  document.getElementById(id).style.display = "none"; 
  document.getElementById("modal-overlay").style.display = "none"; 
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  document.getElementById("modal-overlay").style.display = "none";
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  const colors = { success: "#27ae60", error: "#e74c3c", warning: "#f39c12", info: "#667eea" };
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "🔔" };
  toast.style.cssText = `position:fixed; bottom:20px; right:20px; background:${colors[type]}; color:white; padding:12px 20px; border-radius:10px; z-index:10001; animation:slideIn 0.3s ease; max-width:350px;`;
  toast.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><span>${icons[type]}</span><span>${message}</span></div>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.animation = "slideOut 0.3s ease"; setTimeout(() => toast.remove(), 300); }, 4000);
}

// ========== KULLANICI İŞLEMLERİ ==========
async function login() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  
  let users;
  if (fbReady && database) {
    try {
      const snapshot = await database.ref('users').once('value');
      users = snapshot.val() || JSON.parse(JSON.stringify(DEFAULT_USERS));
    } catch(e) {
      users = loadUsers();
    }
  } else {
    users = loadUsers();
  }
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) { 
    document.getElementById("login-error").textContent = "Hatalı kullanıcı adı veya şifre!"; 
    return; 
  }
  
  currentUser = user;
  await loadAllData();
  
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("pos-screen").style.display = "block";
  document.getElementById("user-name-display").textContent = ` ${currentUser.username}`;
  
  const roleBadge = document.getElementById("user-role-badge");
  if (currentUser.role === "admin") roleBadge.textContent = "👑 Admin";
  else if (currentUser.role === "waiter") roleBadge.textContent = "👨‍🍳 Garson";
  else roleBadge.textContent = "👤 Kasiyer";
  
  document.getElementById("adminPanelBtn").style.display = currentUser.role === "admin" ? "inline-block" : "none";
  
  renderTables();
  showNotificationPanel();
  
  showToast(`Hoş geldin ${currentUser.username}! ${fbReady ? '🌐 Çevrimiçi' : '📱 Çevrimdışı'}`, "success");
}

function logout() {
  currentUser = null;
  currentTableId = null;
  document.getElementById("pos-screen").style.display = "none";
  document.getElementById("admin-screen").style.display = "none";
  document.getElementById("table-detail-screen").style.display = "none";
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("login-username").value = "";
  document.getElementById("login-password").value = "";
  document.getElementById("login-error").textContent = "";
  closeAllModals();
}

// ========== BİLDİRİM İŞLEMLERİ ==========
async function showNotificationPanel() {
  if (!currentUser) return;
  const notifications = await loadNotifications(currentUser.username);
  const unreadCount = notifications.filter(n => !n.read).length;
  const container = document.getElementById("notification-container");
  if (!container) return;

  container.innerHTML = `
    <div class="notification-bell" id="notificationBell">${unreadCount > 0 ? '🔔' : '🔕'} ${unreadCount > 0 ? `<span class="notification-badge">${unreadCount}</span>` : ''}</div>
    <div id="notificationList" class="notification-list" style="display:none;">
      <div class="notification-header"><strong>Bildirimler</strong><button id="markAllReadBtn" style="font-size:0.7rem; padding:4px 8px;">Okundu</button></div>
      ${notifications.length === 0 ? '<div style="padding:12px;">Bildirim yok</div>' : notifications.map(n => `
        <div class="notification-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
          <div class="notification-message">${n.message}</div>
          <div class="notification-time">${new Date(n.createdAt).toLocaleString()}</div>
        </div>
      `).join('')}
    </div>
  `;
  
  document.getElementById("notificationBell").onclick = () => {
    const list = document.getElementById("notificationList");
    list.style.display = list.style.display === "none" ? "block" : "none";
  };
  
  document.querySelectorAll(".notification-item").forEach(el => {
    el.onclick = async () => {
      let notifs = await loadNotifications(currentUser.username);
      notifs = notifs.map(n => n.id == el.dataset.id ? {...n, read: true} : n);
      localStorage.setItem("restoran_notifications_" + currentUser.username, JSON.stringify(notifs));
      showNotificationPanel();
    };
  });
  
  const markAllBtn = document.getElementById("markAllReadBtn");
  if (markAllBtn) {
    markAllBtn.onclick = async () => {
      let notifs = await loadNotifications(currentUser.username);
      notifs = notifs.map(n => ({...n, read: true}));
      localStorage.setItem("restoran_notifications_" + currentUser.username, JSON.stringify(notifs));
      showNotificationPanel();
    };
  }
}

// ========== MASA İŞLEMLERİ ==========
function renderTables() {
  const grid = document.getElementById("tables-grid");
  if (!grid) return;
  
  grid.innerHTML = tables.map(table => {
    const order = tableOrders[table.id] || { items: [], status: 'empty' };
    const total = order.items ? order.items.reduce((s, i) => s + i.price * i.qty, 0) : 0;
    let statusClass = 'empty';
    let statusText = 'Boş';
    let icon = '🟢';
    
    if (order.status === 'active') {
      statusClass = 'active';
      statusText = 'Aktif';
      icon = '🟠';
    }
    
    return `
      <div class="table-card ${statusClass}" onclick="openTableDetail(${table.id})">
        <div class="table-icon">🪑</div>
        <div class="table-name">${table.name}</div>
        <div class="table-status">${icon} ${statusText}</div>
        ${total > 0 ? `<div class="table-total">${total.toFixed(2)} ₺</div>` : ''}
      </div>
    `;
  }).join('');
}

function openTableDetail(tableId) {
  currentTableId = tableId;
  const table = tables.find(t => t.id === tableId);
  if (!table) return;
  
  if (!tableOrders[tableId]) {
    tableOrders[tableId] = { items: [], status: 'empty', savedAt: null };
    saveTableOrders();
  }
  
  const order = tableOrders[tableId];
  
  if (order.status === 'paid') {
    tableOrders[tableId] = { items: [], status: 'empty', savedAt: null };
    saveTableOrders();
  }
  
  document.getElementById("pos-screen").style.display = "none";
  document.getElementById("table-detail-screen").style.display = "block";
  document.getElementById("table-detail-name").textContent = table.name;
  
  const currentOrder = tableOrders[tableId];
  const statusBadge = document.getElementById("table-status-badge");
  if (currentOrder.status === 'empty') statusBadge.textContent = '🟢 Boş';
  else if (currentOrder.status === 'active') statusBadge.textContent = '🟠 Aktif';
  
  const cancelBtn = document.getElementById("cancelTableBtn");
  cancelBtn.style.display = currentUser.role === 'admin' ? 'inline-block' : 'none';
  
  const paymentBtn = document.getElementById("tablePaymentBtn");
  const detailedPaymentBtn = document.getElementById("detailedPaymentBtn");
  const saveBtn = document.getElementById("saveTableOrderBtn");
  
  if (currentUser.role === 'waiter') {
    paymentBtn.style.display = 'none';
    detailedPaymentBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
  } else {
    paymentBtn.style.display = 'inline-block';
    detailedPaymentBtn.style.display = 'inline-block';
    saveBtn.style.display = 'inline-block';
  }
  
  updateCategoryMenu();
  renderTableProducts();
  renderTableCart();
}

function updateCategoryMenu() {
  const m = document.getElementById("category-menu");
  if (m) m.innerHTML = categories.map(c => `<button data-cat="${c.name}">${c.icon || '📦'} ${c.name}</button>`).join('');
  document.querySelectorAll("#category-menu button").forEach(btn => { 
    btn.onclick = () => { 
      currentCategory = btn.dataset.cat; 
      renderTableProducts(); 
    };
  });
}

function renderTableProducts() {
  const list = document.getElementById("table-product-list");
  if (!list) return;
  
  const filtered = products.filter(p => p.category === currentCategory);
  if (!filtered.length) { list.innerHTML = "<p>Bu kategoride ürün yok</p>"; return; }
  
  list.innerHTML = filtered.flatMap(p => p.variants.map((v, i) => `
    <div class="product">
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-details">${v.size}</div>
        <div class="product-stock ${v.stock <= 5 && v.stock !== 999 ? 'stock-low' : ''}">${v.stock === 999 ? '∞ Stok' : `Stok: ${v.stock}`}</div>
      </div>
      <div>
        <div class="product-price">${v.price} ₺</div>
        <button class="add-to-table" data-pid="${p.id}" data-vidx="${i}" ${v.stock <= 0 && v.stock !== 999 ? 'disabled' : ''}>Ekle</button>
      </div>
    </div>
  `).join(''));
  
  document.querySelectorAll(".add-to-table").forEach(btn => { 
    btn.onclick = () => addToTable(parseInt(btn.dataset.pid), parseInt(btn.dataset.vidx)); 
  });
}

function addToTable(pid, vidx) {
  if (!currentTableId) return;
  
  const order = tableOrders[currentTableId];
  const p = products.find(p => p.id === pid);
  const v = p.variants[vidx];
  
  if (v.stock !== 999 && v.stock <= 0) { 
    showToast("Stok yok!", "error"); 
    return; 
  }
  
  const existing = order.items.find(i => i.productId === pid && i.variantIndex === vidx);
  if (existing) {
    existing.qty++;
  } else {
    order.items.push({ 
      productId: pid, 
      variantIndex: vidx, 
      name: p.name, 
      size: v.size, 
      price: v.price, 
      qty: 1 
    });
  }
  order.status = 'active';
  
  if (v.stock !== 999) v.stock--;
  
  saveProducts();
  saveTableOrders();
  renderTableCart();
  renderTableProducts();
  saveLog(`Masa ${currentTableId}: ${p.name}(${v.size}) eklendi - ${currentUser.username}`, 'table');
}

function renderTableCart() {
  const list = document.getElementById("table-cart-list");
  if (!list || !currentTableId) return;
  
  const order = tableOrders[currentTableId] || { items: [] };
  let total = 0;
  
  list.innerHTML = order.items.map((item, idx) => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    
    let actions = '';
    if (currentUser.role === 'admin') {
      actions = `
        <div class="admin-actions">
          <input type="number" value="${item.price}" style="width:70px; padding:4px;" onchange="changeItemPrice(${idx}, this.value)" title="Fiyat değiştir">
          <button onclick="removeTableItem(${idx})" class="btn-danger" style="font-size:0.7rem;">🗑️</button>
        </div>
      `;
    } else {
      actions = `<button onclick="removeTableItem(${idx})" class="btn-danger" style="font-size:0.7rem;">🗑️</button>`;
    }
    
    return `
      <div class="table-order-item">
        <div>
          <strong>${item.name}</strong> (${item.size})<br>
          ${item.price}₺ x ${item.qty} = ${subtotal.toFixed(2)}₺
        </div>
        ${actions}
      </div>
    `;
  }).join('');
  
  document.getElementById("table-total").textContent = total.toFixed(2);
}

function removeTableItem(idx) {
  if (!currentTableId) return;
  const order = tableOrders[currentTableId];
  if (!order || order.status === 'paid') return;
  
  const item = order.items[idx];
  const p = products.find(p => p.id === item.productId);
  if (p) {
    const v = p.variants[item.variantIndex];
    if (v && v.stock !== 999) v.stock += item.qty;
  }
  
  order.items.splice(idx, 1);
  if (order.items.length === 0) {
    order.status = 'empty';
  }
  
  saveProducts();
  saveTableOrders();
  renderTableCart();
  renderTableProducts();
}

function changeItemPrice(idx, newPrice) {
  if (currentUser.role !== 'admin') return;
  if (!currentTableId) return;
  
  const price = parseFloat(newPrice);
  if (isNaN(price) || price < 0) return;
  
  const order = tableOrders[currentTableId];
  if (order && order.items[idx]) {
    const oldPrice = order.items[idx].price;
    order.items[idx].price = price;
    saveTableOrders();
    renderTableCart();
    saveLog(`Masa ${currentTableId}: ${order.items[idx].name} fiyatı ${oldPrice}₺ → ${price}₺ (Admin)`, 'admin');
  }
}

function saveTableOrder() {
  if (!currentTableId) return;
  const order = tableOrders[currentTableId];
  if (!order || order.items.length === 0) {
    showToast("Sipariş boş!", "warning");
    return;
  }
  
  order.status = 'active';
  order.savedAt = new Date().toISOString();
  order.savedBy = currentUser.username;
  saveTableOrders();
  
  const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  saveLog(`Masa ${currentTableId}: Sipariş kaydedildi - ${total.toFixed(2)}₺ - ${currentUser.username}`, 'table');
  showToast("Sipariş kaydedildi!", "success");
}

// ========== ÖDEME İŞLEMLERİ ==========
function openTablePayment() {
  if (!currentTableId) return;
  if (currentUser.role === 'waiter') {
    showToast("Garson ödeme alamaz!", "error");
    return;
  }
  
  const order = tableOrders[currentTableId];
  if (!order || order.items.length === 0) {
    showToast("Sipariş yok!", "warning");
    return;
  }
  
  const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById("modal-total").textContent = total.toFixed(2);
  document.getElementById("payment-amount").value = total.toFixed(2);
  document.getElementById("payment-note").value = `Masa ${currentTableId} ödemesi`;
  
  isTablePaymentInProgress = true;
  showModal("payment-modal");
}

function processPayment() {
  const total = parseFloat(document.getElementById("modal-total").textContent);
  const paid = parseFloat(document.getElementById("payment-amount").value);
  const note = document.getElementById("payment-note").value.trim();
  
  if (!note) { showToast("Açıklama girin!", "warning"); return; }
  if (isNaN(paid) || paid < total) { showToast("Geçersiz tutar!", "error"); return; }
  
  if (isTablePaymentInProgress && currentTableId) {
    processTablePayment(total, paid, note);
  } else {
    closeModal("payment-modal");
    showToast("Ödeme alındı!", "success");
  }
}

function processTablePayment(total, paid, note) {
  const order = tableOrders[currentTableId];
  if (!order || order.items.length === 0) return;
  
  const change = paid - total;
  kasa += total;
  toplamCiro += total;
  gunlukCiro += total;
  
  const itemsSummary = order.items.map(i => `${i.name}(${i.size})x${i.qty}`).join(', ');
  saveLog(`Masa ${currentTableId} ödemesi: ${itemsSummary} - ${total.toFixed(2)}₺ - ${note}`, 'income');
  
  saveKasa();
  
  tableOrders[currentTableId] = { items: [], status: 'empty', savedAt: null };
  saveTableOrders();
  
  closeModal("payment-modal");
  isTablePaymentInProgress = false;
  
  updateAdminStats();
  
  const table = tables.find(t => t.id === currentTableId);
  showToast(`${table ? table.name : 'Masa'} ödemesi alındı! Paraüstü: ${change.toFixed(2)}₺`, "success");
  
  setTimeout(() => {
    document.getElementById("table-detail-screen").style.display = "none";
    document.getElementById("pos-screen").style.display = "block";
    currentTableId = null;
    renderTables();
  }, 1500);
}

// ========== DETAYLI ÖDEME ==========
function openDetailedPayment() {
  if (!currentTableId) return;
  if (currentUser.role === 'waiter') {
    showToast("Garson ödeme alamaz!", "error");
    return;
  }
  
  const order = tableOrders[currentTableId];
  if (!order || order.items.length === 0) {
    showToast("Sipariş yok!", "warning");
    return;
  }
  
  const table = tables.find(t => t.id === currentTableId);
  document.getElementById("detailed-table-name").textContent = table ? table.name : currentTableId;
  
  renderDetailedItems();
  updateDetailedTotals();
  showModal("detailed-payment-modal");
}

function renderDetailedItems() {
  const list = document.getElementById("detailed-items-list");
  const order = tableOrders[currentTableId];
  if (!order || !list) return;
  
  list.innerHTML = order.items.map((item, idx) => {
    const isPaid = item.detailedPaid || false;
    const isSelected = item.detailedSelected || false;
    
    return `
      <div class="detailed-item ${isPaid ? 'paid' : ''} ${isSelected && !isPaid ? 'selected' : ''}" 
           data-idx="${idx}" 
           onclick="${isPaid ? '' : `toggleDetailedItem(${idx})`}">
        <div>
          <strong>${item.name}</strong> (${item.size})<br>
          ${item.price}₺ x ${item.qty} = ${(item.price * item.qty).toFixed(2)}₺
        </div>
        <div>
          ${isPaid ? '✅ Ödendi' : isSelected ? '☑️ Seçili' : '⬜ Seç'}
        </div>
      </div>
    `;
  }).join('');
}

function toggleDetailedItem(idx) {
  const order = tableOrders[currentTableId];
  if (!order) return;
  
  order.items[idx].detailedSelected = !order.items[idx].detailedSelected;
  
  renderDetailedItems();
  updateDetailedTotals();
}

function updateDetailedTotals() {
  const order = tableOrders[currentTableId];
  if (!order) return;
  
  const fullTotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const selectedTotal = order.items
    .filter(i => i.detailedSelected && !i.detailedPaid)
    .reduce((s, i) => s + i.price * i.qty, 0);
  
  document.getElementById("detailed-full-total").textContent = fullTotal.toFixed(2);
  document.getElementById("detailed-pay-amount").textContent = selectedTotal.toFixed(2);
  document.getElementById("detailed-total").textContent = selectedTotal.toFixed(2);
}

function processDetailedPayment() {
  const order = tableOrders[currentTableId];
  if (!order) return;
  
  const selectedItems = order.items.filter(i => i.detailedSelected && !i.detailedPaid);
  if (selectedItems.length === 0) {
    showToast("Ödenecek ürün seçin!", "warning");
    return;
  }
  
  const total = selectedItems.reduce((s, i) => s + i.price * i.qty, 0);
  
  order.items.forEach(item => {
    if (item.detailedSelected && !item.detailedPaid) {
      item.detailedPaid = true;
      item.detailedSelected = false;
    }
  });
  
  kasa += total;
  toplamCiro += total;
  gunlukCiro += total;
  
  const allPaid = order.items.every(i => i.detailedPaid);
  
  const itemsSummary = selectedItems.map(i => `${i.name}(${i.size})x${i.qty}`).join(', ');
  saveLog(`Masa ${currentTableId} detaylı ödeme: ${itemsSummary} - ${total.toFixed(2)}₺`, 'income');
  
  if (allPaid) {
    tableOrders[currentTableId] = { items: [], status: 'empty', savedAt: null };
    saveTableOrders();
    
    const table = tables.find(t => t.id === currentTableId);
    showToast(`${table ? table.name : 'Masa'} tamamen ödendi!`, "success");
  } else {
    saveTableOrders();
    showToast(`Detaylı ödeme alındı: ${total.toFixed(2)}₺`, "success");
  }
  
  saveKasa();
  updateAdminStats();
  
  if (allPaid) {
    setTimeout(() => {
      closeModal("detailed-payment-modal");
      document.getElementById("table-detail-screen").style.display = "none";
      document.getElementById("pos-screen").style.display = "block";
      currentTableId = null;
      renderTables();
    }, 1000);
  } else {
    renderDetailedItems();
    updateDetailedTotals();
  }
}

// ========== MASA İPTAL ==========
function cancelTable() {
  if (currentUser.role !== 'admin') return;
  if (!currentTableId) return;
  
  if (!confirm("Masayı iptal etmek istediğinize emin misiniz? Tüm ürünler stoğa geri dönecek.")) return;
  
  const order = tableOrders[currentTableId];
  if (order && order.items) {
    order.items.forEach(item => {
      const p = products.find(p => p.id === item.productId);
      if (p) {
        const v = p.variants[item.variantIndex];
        if (v && v.stock !== 999) v.stock += item.qty;
      }
    });
  }
  
  tableOrders[currentTableId] = { items: [], status: 'empty', savedAt: null };
  
  saveProducts();
  saveTableOrders();
  saveLog(`Masa ${currentTableId}: Admin tarafından iptal edildi`, 'admin');
  
  renderTableCart();
  renderTableProducts();
  showToast("Masa iptal edildi!", "success");
}

function backToTables() {
  document.getElementById("table-detail-screen").style.display = "none";
  document.getElementById("pos-screen").style.display = "block";
  currentTableId = null;
  renderTables();
}

// ========== KATEGORİ İŞLEMLERİ ==========
function updateCategorySelects() {
  ["new-product-category", "edit-product-category"].forEach(id => {
    const s = document.getElementById(id);
    if (s) s.innerHTML = categories.map(c => `<option value="${c.name}">${c.icon || '📦'} ${c.name}</option>`).join('');
  });
}

function displayCategoryList() {
  if (currentUser?.role !== "admin") return;
  const c = document.getElementById("category-list-container");
  if (!c) return;
  c.innerHTML = "<h4>📋 Kategoriler</h4>" + categories.map(cat => `
    <div class="category-card">
      <div><span>${cat.icon || '📦'}</span> <strong>${cat.name}</strong></div>
      <div>
        <button class="btn-warning" data-edit="${cat.name}">✏️</button> 
        <button class="btn-danger" data-del="${cat.name}">🗑️</button>
      </div>
    </div>
  `).join('');
  document.querySelectorAll("[data-edit]").forEach(btn => { btn.onclick = () => openEditCategoryModal(btn.dataset.edit); });
  document.querySelectorAll("[data-del]").forEach(btn => { btn.onclick = () => deleteCategory(btn.dataset.del); });
}

function addCategory() {
  if (currentUser?.role !== "admin") { showToast("Admin yetkisi gerekli!", "error"); return; }
  const name = document.getElementById("new-category-name").value.trim().toLowerCase();
  const icon = document.getElementById("new-category-icon").value.trim();
  if (!name) { showToast("Kategori adı girin!", "warning"); return; }
  if (categories.find(c => c.name === name)) { showToast("Bu kategori zaten var!", "warning"); return; }
  categories.push({ name, icon: icon || "📦" });
  saveCategories();
  updateCategoryMenu();
  updateCategorySelects();
  displayCategoryList();
  showToast(`"${name}" kategorisi eklendi!`, "success");
}

function openEditCategoryModal(name) {
  const cat = categories.find(c => c.name === name);
  if (!cat) return;
  editingCategoryName = name;
  document.getElementById("edit-category-name").value = cat.name;
  document.getElementById("edit-category-icon").value = cat.icon || '';
  showModal("edit-category-modal");
}

function saveCategoryEdit() {
  const newName = document.getElementById("edit-category-name").value.trim().toLowerCase();
  const newIcon = document.getElementById("edit-category-icon").value.trim();
  if (!newName) { showToast("Kategori adı gerekli!", "warning"); return; }
  
  const cat = categories.find(c => c.name === editingCategoryName);
  const oldName = editingCategoryName;
  cat.name = newName; 
  cat.icon = newIcon || '📦';
  
  products.forEach(p => { if (p.category === oldName) p.category = newName; });
  if (currentCategory === oldName) currentCategory = newName;
  
  saveCategories();
  saveProducts();
  updateCategoryMenu();
  updateCategorySelects();
  displayCategoryList();
  closeModal("edit-category-modal");
  showToast("Kategori güncellendi!", "success");
}

function deleteCategory(name) {
  if (currentUser?.role !== "admin") return;
  if (!confirm(`"${name}" kategorisini silmek istediğinize emin misiniz?`)) return;
  
  products = products.filter(p => p.category !== name);
  categories = categories.filter(c => c.name !== name);
  if (currentCategory === name && categories.length) currentCategory = categories[0].name;
  
  saveCategories();
  saveProducts();
  updateCategoryMenu();
  updateCategorySelects();
  displayCategoryList();
  updateProductListDisplay();
  showToast("Kategori silindi!", "success");
}

// ========== ÜRÜN İŞLEMLERİ ==========
function updateProductListDisplay() {
  if (currentUser?.role !== "admin") return;
  const c = document.getElementById("product-list-container");
  if (!c) return;
  c.innerHTML = "<h4>📋 Ürünler</h4>" + products.map(p => `
    <div class="product-admin-card">
      <div><strong>${p.name}</strong> (${p.category})</div>
      <div>
        <button class="btn-warning" data-edit="${p.id}">✏️</button> 
        <button class="btn-danger" data-del="${p.id}">🗑️</button>
      </div>
      <div style="width:100%">
        ${p.variants.map(v => `
          <span class="variant-tag">
            ${v.size} - ${v.price}₺ (${v.stock === 999 ? '∞' : v.stock}) 
            <button class="btn-warning" data-var-edit="${p.id}|${v.id}">✏️</button> 
            <button class="btn-danger" data-var-del="${p.id}|${v.id}">🗑️</button>
          </span>
        `).join('')} 
        <button class="add-variant" data-pid="${p.id}">+ Varyant</button>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll("[data-edit]").forEach(btn => { btn.onclick = () => openEditProductModal(parseInt(btn.dataset.edit)); });
  document.querySelectorAll("[data-del]").forEach(btn => { btn.onclick = () => deleteProduct(parseInt(btn.dataset.del)); });
  document.querySelectorAll("[data-var-edit]").forEach(btn => { 
    const [pid, vid] = btn.dataset.varEdit.split("|"); 
    btn.onclick = () => editVariant(parseInt(pid), vid); 
  });
  document.querySelectorAll("[data-var-del]").forEach(btn => { 
    const [pid, vid] = btn.dataset.varDel.split("|"); 
    btn.onclick = () => deleteVariant(parseInt(pid), vid); 
  });
  document.querySelectorAll(".add-variant").forEach(btn => { btn.onclick = () => addVariantToProduct(parseInt(btn.dataset.pid)); });
}

function updateProductSelects() {
  const s = document.getElementById("stock-product");
  if (s) s.innerHTML = products.flatMap(p => p.variants.map((v, i) => 
    `<option value="${p.id}-${i}">${p.name} (${v.size}) - Stok: ${v.stock === 999 ? '∞' : v.stock}</option>`
  )).join('');
}

function openEditProductModal(id) {
  const p = products.find(p => p.id === id);
  if (!p) return;
  editingProductId = id;
  document.getElementById("edit-product-name").value = p.name;
  document.getElementById("edit-product-category").value = p.category;
  showModal("edit-product-modal");
}

function saveProductEdit() {
  const newName = document.getElementById("edit-product-name").value.trim();
  const newCat = document.getElementById("edit-product-category").value;
  const p = products.find(p => p.id === editingProductId);
  p.name = newName; 
  p.category = newCat;
  saveProducts();
  updateProductListDisplay();
  updateProductSelects();
  closeModal("edit-product-modal");
  showToast("Ürün güncellendi!", "success");
}

function deleteProduct(id) {
  if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
  products = products.filter(p => p.id !== id);
  saveProducts();
  updateProductListDisplay();
  updateProductSelects();
  showToast("Ürün silindi!", "success");
}

// ========== VARYANT İŞLEMLERİ ==========
function addVariantToProduct(id) {
  editingVariantProductId = id; 
  editingVariantId = null;
  document.getElementById("modal-title").textContent = `${products.find(p => p.id === id).name} - Yeni Varyant`;
  document.getElementById("variant-size").value = "";
  document.getElementById("variant-price").value = "";
  document.getElementById("variant-stock").value = "";
  showModal("variant-modal");
}

function editVariant(pid, vid) {
  editingVariantProductId = pid; 
  editingVariantId = vid;
  const p = products.find(p => p.id === pid);
  const v = p.variants.find(v => v.id === vid);
  document.getElementById("modal-title").textContent = `${p.name} - Varyant Düzenle`;
  document.getElementById("variant-size").value = v.size;
  document.getElementById("variant-price").value = v.price;
  document.getElementById("variant-stock").value = v.stock;
  showModal("variant-modal");
}

function deleteVariant(pid, vid) {
  if (!confirm("Bu varyantı silmek istediğinize emin misiniz?")) return;
  const p = products.find(p => p.id === pid);
  p.variants = p.variants.filter(v => v.id !== vid);
  if (!p.variants.length) products = products.filter(p => p.id !== pid);
  saveProducts();
  updateProductListDisplay();
  updateProductSelects();
  showToast("Varyant silindi!", "success");
}

function saveVariant() {
  const size = document.getElementById("variant-size").value.trim();
  const price = parseFloat(document.getElementById("variant-price").value);
  const stock = parseInt(document.getElementById("variant-stock").value);
  if (!size || isNaN(price) || isNaN(stock)) { showToast("Tüm alanları doldurun!", "warning"); return; }
  
  if (pendingNewProduct) {
    const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ 
      id: newId, 
      name: pendingNewProduct.name, 
      category: pendingNewProduct.category, 
      variants: [{ id: "v" + Date.now(), size, price, stock }] 
    });
    pendingNewProduct = null;
    document.getElementById("new-product-name").value = "";
    document.getElementById("new-product-category").value = "";
  } else if (editingVariantId) {
    const p = products.find(p => p.id === editingVariantProductId);
    const v = p.variants.find(v => v.id === editingVariantId);
    v.size = size; 
    v.price = price; 
    v.stock = stock;
  } else {
    const p = products.find(p => p.id === editingVariantProductId);
    p.variants.push({ id: "v" + Date.now(), size, price, stock });
  }
  
  saveProducts();
  closeModal("variant-modal");
  updateProductSelects();
  updateProductListDisplay();
  updateCategoryMenu();
  if (currentTableId) renderTableProducts();
  showToast("Varyant kaydedildi!", "success");
}

function showAddVariantModal() {
  const name = document.getElementById("new-product-name").value.trim();
  const cat = document.getElementById("new-product-category").value;
  if (!name || !cat) { showToast("Ürün adı ve kategori seçin!", "warning"); return; }
  pendingNewProduct = { name, category: cat };
  document.getElementById("modal-title").textContent = `${name} - İlk Varyant`;
  document.getElementById("variant-size").value = "";
  document.getElementById("variant-price").value = "";
  document.getElementById("variant-stock").value = "";
  showModal("variant-modal");
}

// ========== MASA YÖNETİMİ (ADMIN) ==========
function updateTablesListInAdmin() {
  if (currentUser?.role !== "admin") return;
  const container = document.getElementById("tables-list-container");
  if (!container) return;
  
  container.innerHTML = "<h4>🪑 Masalar</h4>" + tables.map(table => `
    <div class="table-admin-card">
      <div><strong>🪑 ${table.name}</strong></div>
      <div>
        <button class="btn-warning" data-edit-table="${table.id}">✏️</button>
        <button class="btn-danger" data-del-table="${table.id}">🗑️</button>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll("[data-edit-table]").forEach(btn => {
    btn.onclick = () => openEditTableModal(parseInt(btn.dataset.editTable));
  });
  
  document.querySelectorAll("[data-del-table]").forEach(btn => {
    btn.onclick = () => deleteTable(parseInt(btn.dataset.delTable));
  });
}

function addTable() {
  if (currentUser?.role !== "admin") return;
  const name = document.getElementById("new-table-name").value.trim();
  if (!name) { showToast("Masa adı girin!", "warning"); return; }
  
  const newId = tables.length ? Math.max(...tables.map(t => t.id)) + 1 : 1;
  tables.push({ id: newId, name });
  saveTables();
  updateTablesListInAdmin();
  renderTables();
  document.getElementById("new-table-name").value = "";
  showToast(`"${name}" eklendi!`, "success");
  saveLog(`Yeni masa eklendi: ${name}`, 'admin');
}

function openEditTableModal(tableId) {
  const table = tables.find(t => t.id === tableId);
  if (!table) return;
  editingTableId = tableId;
  document.getElementById("edit-table-name-input").value = table.name;
  showModal("edit-table-modal");
}

function saveTableEdit() {
  const newName = document.getElementById("edit-table-name-input").value.trim();
  if (!newName) { showToast("Masa adı girin!", "warning"); return; }
  
  const table = tables.find(t => t.id === editingTableId);
  if (table) {
    const oldName = table.name;
    table.name = newName;
    saveTables();
    updateTablesListInAdmin();
    renderTables();
    closeModal("edit-table-modal");
    showToast(`Masa güncellendi: ${newName}`, "success");
    saveLog(`Masa adı değiştirildi: ${oldName} → ${newName}`, 'admin');
  }
}

function deleteTable(tableId) {
  if (currentUser?.role !== "admin") return;
  const table = tables.find(t => t.id === tableId);
  if (!table) return;
  
  if (!confirm(`"${table.name}" silinsin mi?`)) return;
  
  tables = tables.filter(t => t.id !== tableId);
  delete tableOrders[tableId];
  
  saveTables();
  saveTableOrders();
  updateTablesListInAdmin();
  renderTables();
  showToast(`"${table.name}" silindi!`, "success");
  saveLog(`Masa silindi: ${table.name}`, 'admin');
}

// ========== FİNANS İŞLEMLERİ ==========
function openExpenseModal() {
  document.getElementById("expense-amount").value = "";
  document.getElementById("expense-note").value = "";
  showModal("expense-modal");
}

function processExpense() {
  const amount = parseFloat(document.getElementById("expense-amount").value);
  const note = document.getElementById("expense-note").value.trim();
  if (!note) { showToast("Açıklama girin!", "warning"); return; }
  if (isNaN(amount) || amount <= 0) { showToast("Geçerli tutar girin!", "error"); return; }
  
  kasa -= amount; 
  toplamGider += amount; 
  gunlukGider += amount;
  saveKasa();
  saveLog(`Gider: ${amount}₺ - ${note}`, 'expense');
  closeModal("expense-modal");
  
  updateAdminStats();
  
  showToast(`Gider kaydedildi: ${amount}₺`, "success");
}

function showDailyReport() {
  alert(`📊 GÜNLÜK RAPOR\n\nCiro: ${gunlukCiro.toFixed(2)}₺\nGider: ${gunlukGider.toFixed(2)}₺\nNet: ${(gunlukCiro - gunlukGider).toFixed(2)}₺\nKasa: ${kasa.toFixed(2)}₺`);
}

function resetKasa() {
  if (currentUser?.role !== "admin") return;
  if (prompt("Şifre:") !== "1234") { showToast("Hatalı şifre!", "error"); return; }
  saveLog(`Gün sonu yapıldı. Günlük ciro: ${gunlukCiro.toFixed(2)}₺, Günlük gider: ${gunlukGider.toFixed(2)}₺`, 'admin');
  kasa = 0; toplamCiro = 0; toplamGider = 0; gunlukCiro = 0; gunlukGider = 0;
  saveKasa();
  
  updateAdminStats();
  
  showToast("Gün sonu tamamlandı!", "success");
}

function showLogs() {
  document.getElementById("log-list").innerHTML = logs.slice(0, 100).map(log => `<li>${log}</li>`).join('');
}

function resetToDefault() {
  if (currentUser?.role !== "admin") return;
  if (prompt("Şifre:") !== "1234") { showToast("Hatalı şifre!", "error"); return; }
  
  products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
  categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  tables = JSON.parse(JSON.stringify(DEFAULT_TABLES));
  tableOrders = {};
  kasa = 0; toplamCiro = 0; toplamGider = 0; gunlukCiro = 0; gunlukGider = 0;
  currentCategory = "yemek";
  
  saveProducts();
  saveCategories();
  saveKasa();
  saveTables();
  saveTableOrders();
  
  updateCategoryMenu();
  updateCategorySelects();
  displayCategoryList();
  updateProductListDisplay();
  updateProductSelects();
  updateTablesListInAdmin();
  
  updateAdminStats();
  
  closeAdmin();
  showToast("Sistem sıfırlandı!", "success");
  saveLog("Sistem sıfırlandı (varsayılan ayarlar)", 'admin');
}

// ========== ADMIN PANELİ ==========
function openAdmin() {
  if (currentUser?.role !== "admin") return;
  document.getElementById("pos-screen").style.display = "none";
  document.getElementById("admin-screen").style.display = "block";
  updateCategorySelects();
  displayCategoryList();
  updateProductListDisplay();
  updateProductSelects();
  updateAdminStats();
  updateUserList();
  updateTablesListInAdmin();
}

function closeAdmin() {
  document.getElementById("admin-screen").style.display = "none";
  document.getElementById("pos-screen").style.display = "block";
  renderTables();
}

function updateAdminStats() {
  const adminKasa = document.getElementById("admin-kasa");
  const adminCiro = document.getElementById("admin-ciro");
  const adminGider = document.getElementById("admin-gider");
  
  if (adminKasa) adminKasa.textContent = kasa.toFixed(2);
  if (adminCiro) adminCiro.textContent = toplamCiro.toFixed(2);
  if (adminGider) adminGider.textContent = toplamGider.toFixed(2);
}

function updateUserList() {
  if (currentUser?.role !== "admin") return;
  let users = JSON.parse(JSON.stringify(DEFAULT_USERS));
  
  if (fbReady && database) {
    // Firebase'den güncel kullanıcıları almaya çalış
    database.ref('users').once('value').then(snapshot => {
      const data = snapshot.val();
      if (data) {
        renderUserListHTML(data);
      } else {
        renderUserListHTML(users);
      }
    }).catch(() => {
      renderUserListHTML(users);
    });
  } else {
    renderUserListHTML(users);
  }
}

function renderUserListHTML(users) {
  const container = document.getElementById("user-list-container");
  if (!container) return;
  
  container.innerHTML = users.map(user => `
    <div class="user-card">
      <div>
        <strong>${user.username}</strong> 
        <span class="user-role-${user.role}">${user.role === "admin" ? "👑 Admin" : user.role === "waiter" ? "👨‍🍳 Garson" : "👤 Kasiyer"}</span>
      </div>
      <div>
        <button class="btn-warning" data-change="${user.username}">🔑</button>
        ${user.username !== currentUser.username ? `<button class="btn-danger" data-del="${user.username}">🗑️</button>` : ''}
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll("[data-change]").forEach(btn => { btn.onclick = () => changeUserPassword(btn.dataset.change); });
  document.querySelectorAll("[data-del]").forEach(btn => { btn.onclick = () => deleteUser(btn.dataset.del); });
}

async function addUser() {
  const username = document.getElementById("new-username").value.trim();
  const password = document.getElementById("new-user-password").value;
  const role = document.getElementById("new-user-role").value;
  if (!username || !password) { showToast("Tüm alanları doldurun!", "warning"); return; }
  
  let users;
  if (fbReady && database) {
    const snapshot = await database.ref('users').once('value');
    users = snapshot.val() || JSON.parse(JSON.stringify(DEFAULT_USERS));
  } else {
    users = loadUsers();
  }
  
  if (users.find(u => u.username === username)) { showToast("Bu kullanıcı zaten var!", "warning"); return; }
  
  users.push({ username, password, role });
  saveUsers(users);
  updateUserList();
  document.getElementById("new-username").value = "";
  document.getElementById("new-user-password").value = "";
  showToast("Kullanıcı eklendi!", "success");
  saveLog(`Yeni kullanıcı: ${username} (${role})`, 'admin');
}

async function changeUserPassword(username) {
  const newPass = prompt("Yeni şifre:");
  if (!newPass) return;
  
  let users;
  if (fbReady && database) {
    const snapshot = await database.ref('users').once('value');
    users = snapshot.val() || JSON.parse(JSON.stringify(DEFAULT_USERS));
  } else {
    users = loadUsers();
  }
  
  const user = users.find(u => u.username === username);
  if (user) user.password = newPass;
  saveUsers(users);
  showToast("Şifre güncellendi!", "success");
  saveLog(`Kullanıcı şifresi değiştirildi: ${username}`, 'admin');
}

async function deleteUser(username) {
  if (username === currentUser.username) { showToast("Kendini silemezsin!", "error"); return; }
  
  let users;
  if (fbReady && database) {
    const snapshot = await database.ref('users').once('value');
    users = snapshot.val() || JSON.parse(JSON.stringify(DEFAULT_USERS));
  } else {
    users = loadUsers();
  }
  
  saveUsers(users.filter(u => u.username !== username));
  updateUserList();
  showToast("Kullanıcı silindi!", "success");
  saveLog(`Kullanıcı silindi: ${username}`, 'admin');
}

function secureAddStock() {
  if (currentUser?.role !== "admin") return;
  if (prompt("Şifre:") !== "1234") { showToast("Hatalı şifre!", "error"); return; }
  
  const val = document.getElementById("stock-product").value;
  const amount = parseInt(document.getElementById("stock-amount").value);
  if (!val || !amount) { showToast("Ürün ve miktar seçin!", "warning"); return; }
  
  const [id, idx] = val.split("-").map(Number);
  const p = products.find(p => p.id === id);
  const oldStock = p.variants[idx].stock;
  p.variants[idx].stock += amount;
  
  saveProducts();
  updateProductSelects();
  updateProductListDisplay();
  document.getElementById("stock-amount").value = "";
  showToast(`${p.name} (${p.variants[idx].size}): ${oldStock} → ${p.variants[idx].stock}`, "success");
  saveLog(`Stok eklendi: ${p.name} (${p.variants[idx].size}) +${amount}`, 'admin');
}

// ========== EVENT LISTENERLAR ==========
document.addEventListener("DOMContentLoaded", async () => {
  // ÖNCE event listenerları bağla
  document.getElementById("loginBtn").onclick = login;
  document.getElementById("login-username").addEventListener("keypress", (e) => { if (e.key === "Enter") document.getElementById("login-password").focus(); });
  document.getElementById("login-password").addEventListener("keypress", (e) => { if (e.key === "Enter") login(); });
  
  document.getElementById("logoutBtn").onclick = logout;
  document.getElementById("adminPanelBtn").onclick = openAdmin;
  document.getElementById("closeAdminBtn").onclick = closeAdmin;
  document.getElementById("resetDefaultBtn").onclick = resetToDefault;
  
  document.getElementById("backToTablesBtn").onclick = backToTables;
  document.getElementById("saveTableOrderBtn").onclick = saveTableOrder;
  document.getElementById("tablePaymentBtn").onclick = openTablePayment;
  document.getElementById("detailedPaymentBtn").onclick = openDetailedPayment;
  document.getElementById("processDetailedPaymentBtn").onclick = processDetailedPayment;
  document.getElementById("closeDetailedPaymentBtn").onclick = () => closeModal("detailed-payment-modal");
  document.getElementById("cancelTableBtn").onclick = cancelTable;
  
  document.getElementById("paymentConfirmBtn").onclick = processPayment;
  document.getElementById("paymentCloseBtn").onclick = () => { 
    closeModal("payment-modal"); 
    isTablePaymentInProgress = false; 
  };
  
  document.getElementById("expenseBtn").onclick = openExpenseModal;
  document.getElementById("expenseConfirmBtn").onclick = processExpense;
  document.getElementById("expenseCloseBtn").onclick = () => closeModal("expense-modal");
  
  document.getElementById("addUserBtn").onclick = addUser;
  document.getElementById("addTableBtn").onclick = addTable;
  document.getElementById("saveTableEditBtn").onclick = saveTableEdit;
  document.getElementById("cancelTableEditBtn").onclick = () => closeModal("edit-table-modal");
  
  document.getElementById("dailyReportBtn").onclick = showDailyReport;
  document.getElementById("resetKasaBtn").onclick = resetKasa;
  
  document.getElementById("addCategoryBtn").onclick = addCategory;
  document.getElementById("saveCategoryBtn").onclick = saveCategoryEdit;
  document.getElementById("cancelCategoryBtn").onclick = () => closeModal("edit-category-modal");
  
  document.getElementById("createProductBtn").onclick = showAddVariantModal;
  document.getElementById("saveProductBtn").onclick = saveProductEdit;
  document.getElementById("cancelProductBtn").onclick = () => closeModal("edit-product-modal");
  
  document.getElementById("saveVariantBtn").onclick = saveVariant;
  document.getElementById("cancelVariantBtn").onclick = () => closeModal("variant-modal");
  
  document.getElementById("addStockBtn").onclick = secureAddStock;
  document.getElementById("showLogsBtn").onclick = showLogs;
  
  document.getElementById("modal-overlay").onclick = closeAllModals;
  
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("pos-screen").style.display = "none";
  document.getElementById("admin-screen").style.display = "none";
  document.getElementById("table-detail-screen").style.display = "none";
  
  // İlk veri yükleme
  loadProducts();
  loadCategories();
  loadKasa();
  loadTables();
  loadTableOrders();
  
  // Firebase'i arka planda başlat
  initFirebase().then((ready) => {
    if (ready) {
      console.log('✅ Firebase hazır, dinleme başlatılıyor...');
      listenToFirebase();
    } else {
      console.warn('⚠️ Firebase başlatılamadı, localStorage ile devam ediliyor');
    }
  });
});
