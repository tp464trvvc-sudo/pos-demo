import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getDatabase, ref, onValue, set, update, push, onDisconnect } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-database.js";

// ========== FIREBASE YAPILANDIRMASI ==========
const firebaseConfig = {
    apiKey: "AIzaSyD7AMoc_82_XGLFEFCXuzg23O6inLVIPic",
    authDomain: "fir-pos-f8221.firebaseapp.com",
    projectId: "fir-pos-f8221",
    storageBucket: "fir-pos-f8221.firebasestorage.app",
    messagingSenderId: "588722101736",
    appId: "1:588722101736:web:bb691e415e697cd835985d",
    databaseURL: "https://fir-pos-f8221-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ========== GLOBAL DEĞİŞKENLER ==========
let products = [];
let tablesData = [];
let orders = {};
let users = [];
let revenueData = { total: 0, orders: [] };
let currentUser = null;
let selectedTableId = null;
let actionMode = null;
let selectedTablesForAction = [];
let transferTargetTable = null;
let currentScreen = "menu"; // menu, pos, admin

// ========== FIREBASE REALTIME LISTENERS ==========
function initFirebaseListeners() {
    // Ürünleri dinle
    const productsRef = ref(database, 'products');
    onValue(productsRef, (snapshot) => {
        if (snapshot.exists()) {
            products = snapshot.val();
        } else {
            // Varsayılan ürünler
            products = [
                { id: 1, name: "Kola", price: 25, category: "İçecek" },
                { id: 2, name: "Ayran", price: 20, category: "İçecek" },
                { id: 3, name: "Su", price: 10, category: "İçecek" },
                { id: 4, name: "Izgara Köfte", price: 180, category: "Yemek" },
                { id: 5, name: "Tavuk Şiş", price: 160, category: "Yemek" },
                { id: 6, name: "Mevsim Salata", price: 65, category: "Salata" }
            ];
            set(productsRef, products);
        }
        refreshUI();
    });
    
    // Masaları dinle
    const tablesRef = ref(database, 'tables');
    onValue(tablesRef, (snapshot) => {
        if (snapshot.exists()) {
            tablesData = snapshot.val();
        } else {
            tablesData = [
                { id: 1, name: "Masa 1", total: 0 },
                { id: 2, name: "Masa 2", total: 0 },
                { id: 3, name: "Masa 3", total: 0 },
                { id: 4, name: "Masa 4", total: 0 }
            ];
            set(tablesRef, tablesData);
        }
        refreshUI();
    });
    
    // Siparişleri dinle
    const ordersRef = ref(database, 'orders');
    onValue(ordersRef, (snapshot) => {
        if (snapshot.exists()) {
            orders = snapshot.val();
        } else {
            orders = {};
            set(ordersRef, orders);
        }
        refreshUI();
    });
    
    // Kullanıcıları dinle
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
            users = snapshot.val();
        } else {
            users = [
                { username: "garson", password: "1234", role: "waiter" },
                { username: "kasiyer", password: "1234", role: "cashier" },
                { username: "admin", password: "1234", role: "admin" }
            ];
            set(usersRef, users);
        }
    });
    
    // Ciro verilerini dinle
    const revenueRef = ref(database, 'revenue');
    onValue(revenueRef, (snapshot) => {
        if (snapshot.exists()) {
            revenueData = snapshot.val();
        } else {
            revenueData = { total: 0, orders: [] };
            set(revenueRef, revenueData);
        }
        refreshUI();
    });
}

// ========== FIREBASE SAVE FUNCTIONS ==========
function saveProducts() {
    set(ref(database, 'products'), products);
}

function saveTables() {
    set(ref(database, 'tables'), tablesData);
}

function saveOrders() {
    set(ref(database, 'orders'), orders);
}

function saveUsers() {
    set(ref(database, 'users'), users);
}

function saveRevenue() {
    set(ref(database, 'revenue'), revenueData);
}

// ========== YETKİLER ==========
function canEditProducts() {
    return currentUser && (currentUser.role === "waiter" || currentUser.role === "cashier" || currentUser.role === "admin");
}

function canManageTables() {
    return currentUser && (currentUser.role === "cashier" || currentUser.role === "admin");
}

function canMakePayment() {
    return currentUser && (currentUser.role === "cashier" || currentUser.role === "admin");
}

function canAccessAdminPanel() {
    return currentUser && currentUser.role === "admin";
}

function canManageUsers() {
    return currentUser && currentUser.role === "admin";
}

// ========== DİJİTAL MENÜ ==========
function renderMenu() {
    const categories = [...new Set(products.map(p => p.category))];
    let productsHtml = "";
    categories.forEach(cat => {
        productsHtml += `<div class="category"><div class="category-title">${cat}</div><div class="product-list">`;
        products.filter(p => p.category === cat).forEach(p => {
            productsHtml += `<div class="product-card"><span class="product-name">${p.name}</span><span class="product-price">${p.price} TL</span></div>`;
        });
        productsHtml += `</div></div>`;
    });
    
    document.getElementById("app").innerHTML = `
        <div class="header">
            <div class="logo"><h1>🍽️ RestoranPOS</h1><p>Dijital Menü</p></div>
            <button class="login-btn" onclick="window.showLoginModal()">🔐 Giriş Yap</button>
        </div>
        <div class="menu-container">${productsHtml}</div>
        <div class="footer">RestoranPOS ©️ 2024 | Gerçek Zamanlı Sistem</div>
    `;
}

// ========== GİRİŞ MODAL ==========
window.showLoginModal = function() {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <h3 class="modal-title">🏪 Personel Girişi</h3>
            <input type="text" id="loginUsername" class="login-input" placeholder="Kullanıcı Adı">
            <input type="password" id="loginPassword" class="login-input" placeholder="Şifre">
            <button id="doLoginBtn" class="modal-login-btn">Giriş Yap</button>
            <button class="modal-close" onclick="this.closest('.modal').remove()">İptal</button>
            <div id="loginError" class="error-msg"></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById("doLoginBtn").onclick = () => {
        const username = document.getElementById("loginUsername").value;
        const password = document.getElementById("loginPassword").value;
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            currentUser = user;
            modal.remove();
            renderPOS();
        } else {
            document.getElementById("loginError").textContent = "Hatalı kullanıcı adı veya şifre!";
        }
    };
};

// ========== POS SİSTEMİ ==========
function getTableStatus(tableId) {
    const cart = orders[tableId];
    if (cart && cart.length > 0) return "occupied";
    return "available";
}

function renderPOS() {
    const roleText = currentUser.role === "admin" ? "Admin" : (currentUser.role === "cashier" ? "Kasiyer" : "Garson");
    
    let html = `
        <div class="pos-container">
            <div class="pos-header">
                <div class="logo"><h1>🍽️ RestoranPOS</h1><p>Personel Paneli</p></div>
                <div class="user-info">
                    <span>👤 ${currentUser.username} (${roleText})</span>
                    <button class="logout-btn" onclick="window.logout()">🚪 Çıkış Yap</button>
                </div>
            </div>
            <div id="adminSwitchBtn"></div>
            <div id="posScreen">
                <div class="pos-container-inner">
                    <div id="tablesView">
                        <h2 class="masa-baslik">🏠 Masa Seçin</h2>
                        <div class="table-actions">
                            <button id="mergeModeBtn" class="action-btn primary">🔗 Masa Birleştir</button>
                            <button id="transferModeBtn" class="action-btn warning">📦 Masa Aktar</button>
                            <button id="cancelActionBtn" class="action-btn danger hidden">❌ İptal</button>
                        </div>
                        <div id="tables" class="tables"></div>
                    </div>
                    <div id="orderView" class="order-view hidden">
                        <div class="order-header">
                            <h2 id="selectedTableTitle">Masa - Sipariş</h2>
                            <button id="backToTablesBtn" class="back-btn">◀️ Geri</button>
                        </div>
                        <div class="order-grid">
                            <div>
                                <h3>📋 Ürünler</h3>
                                <div id="products" class="product-list-pos"></div>
                            </div>
                            <div class="cart-view">
                                <h3>🛒 Sepet</h3>
                                <div id="cart"></div>
                                <div id="total" style="font-weight: bold; margin-top: 10px;">Toplam: 0 TL</div>
                                <div class="payment-buttons">
                                    <button id="payBtn" class="pay-btn">💰 Normal Ödeme</button>
                                    <button id="detailedPayBtn" class="pay-btn detailed">🔍 Detaylı Ödeme</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="adminScreen" class="hidden">
                <div class="admin-panel">
                    <div class="revenue-card">
                        <h3>💰 Toplam Ciro</h3>
                        <div class="total" id="totalRevenue">0 TL</div>
                    </div>
                    <div class="revenue-stats">
                        <div class="stat-box"><div class="label">Bugünkü Ciro</div><div class="value" id="todayRevenue">0 TL</div></div>
                        <div class="stat-box"><div class="label">Toplam Sipariş</div><div class="value" id="totalOrders">0</div></div>
                    </div>
                    <button id="resetStatsBtn" class="admin-btn danger">🗑 İstatistikleri Sıfırla</button>
                    <h3>📋 Sipariş Geçmişi</h3>
                    <div id="orderHistory" class="order-history"></div>
                    <h2 class="section-title">📦 Ürün Yönetimi</h2>
                    <button id="addProductBtn" class="admin-btn success">+ Yeni Ürün Ekle</button>
                    <table class="admin-table"><thead><tr><th>ID</th><th>Ürün Adı</th><th>Fiyat</th><th>Kategori</th><th>İşlemler</th></tr></thead><tbody id="adminProductList"></tbody></table>
                    <h2 class="section-title">🪑 Masa Yönetimi</h2>
                    <button id="addTableBtn" class="admin-btn success">+ Yeni Masa Ekle</button>
                    <table class="admin-table"><thead><tr><th>ID</th><th>Masa Adı</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody id="adminTableList"></tbody></table>
                    <h2 class="section-title">👥 Kullanıcı Yönetimi</h2>
                    <button id="addUserBtn" class="admin-btn success">+ Yeni Kullanıcı Ekle</button>
                    <table class="admin-table"><thead><tr><th>Kullanıcı Adı</th><th>Rol</th><th>İşlemler</th></tr></thead><tbody id="adminUserList"></tbody></table>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById("app").innerHTML = html;
    
    if (canAccessAdminPanel()) {
        const switchBtn = document.createElement("button");
        switchBtn.id = "switchBtn";
        switchBtn.className = "switch-btn";
        switchBtn.textContent = "🔧 Admin Paneli";
        document.getElementById("adminSwitchBtn").appendChild(switchBtn);
        switchBtn.onclick = switchScreen;
    }
    
    renderTablesPOS();
    renderProductsPOS();
    updateButtonPermissions();
    
    document.getElementById("payBtn").onclick = payOrder;
    document.getElementById("detailedPayBtn").onclick = showDetailedPayment;
    document.getElementById("backToTablesBtn").onclick = backToTables;
    document.getElementById("mergeModeBtn").onclick = startMergeMode;
    document.getElementById("transferModeBtn").onclick = startTransferMode;
    document.getElementById("cancelActionBtn").onclick = cancelAction;
    
    function updateButtonPermissions() {
        const payBtn = document.getElementById("payBtn");
        const detailedPayBtn = document.getElementById("detailedPayBtn");
        if (payBtn) {
            if (!canMakePayment()) {
                payBtn.classList.add("disabled");
                detailedPayBtn.classList.add("disabled");
            } else {
                payBtn.classList.remove("disabled");
                detailedPayBtn.classList.remove("disabled");
            }
        }
        const mergeBtn = document.getElementById("mergeModeBtn");
        const transferBtn = document.getElementById("transferModeBtn");
        if (mergeBtn) {
            if (!canManageTables()) {
                mergeBtn.classList.add("disabled");
                transferBtn.classList.add("disabled");
            } else {
                mergeBtn.classList.remove("disabled");
                transferBtn.classList.remove("disabled");
            }
        }
    }
}

function renderTablesPOS() {
    const tablesDiv = document.getElementById("tables");
    if (!tablesDiv) return;
    tablesDiv.innerHTML = "";
    
    tablesData.forEach(table => {
        const btn = document.createElement("button");
        const status = getTableStatus(table.id);
        
        if (actionMode) {
            const isSelected = selectedTablesForAction.includes(table.id);
            const isTarget = (actionMode === "transfer" && transferTargetTable === table.id);
            
            btn.textContent = table.name;
            if (isSelected) {
                btn.className = "table-btn available selected-for-merge";
                if (actionMode === "transfer" && selectedTablesForAction[0] === table.id) {
                    btn.innerHTML = `${table.name}<br><span style="font-size:12px;">📦 KAYNAK</span>`;
                } else {
                    btn.innerHTML = `${table.name}<br><span style="font-size:12px;">✓ SEÇİLDİ</span>`;
                }
            } else if (isTarget) {
                btn.className = "table-btn available selected-for-merge";
                btn.innerHTML = `${table.name}<br><span style="font-size:12px;">🎯 HEDEF</span>`;
            } else {
                btn.className = status === "available" ? "table-btn available" : "table-btn occupied";
                btn.textContent = table.name;
                if (table.total > 0 && status === "occupied") {
                    btn.style.display = "flex";
                    btn.style.flexDirection = "column";
                    btn.innerHTML = `${table.name}<span style="font-size:12px;">${table.total} TL</span>`;
                }
            }
            btn.onclick = () => handleTableSelectionForAction(table.id);
        } else {
            btn.className = status === "available" ? "table-btn available" : "table-btn occupied";
            btn.textContent = table.name;
            if (table.total > 0 && status === "occupied") {
                btn.style.display = "flex";
                btn.style.flexDirection = "column";
                btn.innerHTML = `${table.name}<span style="font-size:12px;">${table.total} TL</span>`;
            }
            btn.onclick = () => selectTable(table.id);
        }
        tablesDiv.appendChild(btn);
    });
}

function selectTable(tableId) {
    if (actionMode) return;
    selectedTableId = tableId;
    if (!orders[tableId]) orders[tableId] = [];
    document.getElementById("tablesView").classList.add("hidden");
    document.getElementById("orderView").classList.remove("hidden");
    const table = tablesData.find(t => t.id === tableId);
    document.getElementById("selectedTableTitle").innerHTML = `${table.name} - Sipariş`;
    renderProductsPOS();
    renderCart();
}

function backToTables() {
    selectedTableId = null;
    document.getElementById("orderView").classList.add("hidden");
    document.getElementById("tablesView").classList.remove("hidden");
    renderTablesPOS();
}

function renderProductsPOS() {
    const productsDiv = document.getElementById("products");
    if (!productsDiv) return;
    productsDiv.innerHTML = "";
    const categories = [...new Set(products.map(p => p.category))];
    categories.forEach(cat => {
        const catTitle = document.createElement("h4");
        catTitle.textContent = cat;
        productsDiv.appendChild(catTitle);
        products.filter(p => p.category === cat).forEach(product => {
            const btn = document.createElement("button");
            btn.textContent = `${product.name} - ${product.price} TL`;
            btn.className = "product-btn";
            if (!canEditProducts()) btn.classList.add("disabled");
            btn.onclick = () => { if (canEditProducts()) addToCart(product); else alert("Ürün ekleme yetkiniz yok!"); };
            productsDiv.appendChild(btn);
        });
    });
}

function addToCart(product) {
    if (!selectedTableId) { alert("Lütfen önce bir masa seçin"); return; }
    const cart = orders[selectedTableId];
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) existingItem.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    renderCart();
    saveOrders();
}

function renderCart() {
    if (!selectedTableId) {
        document.getElementById("cart").innerHTML = "<p>Sepet boş</p>";
        document.getElementById("total").innerHTML = "Toplam: 0 TL";
        return;
    }
    const cartItems = orders[selectedTableId] || [];
    if (cartItems.length === 0) {
        document.getElementById("cart").innerHTML = "<p>Sepet boş</p>";
        document.getElementById("total").innerHTML = "Toplam: 0 TL";
        const table = tablesData.find(t => t.id === selectedTableId);
        if (table) table.total = 0;
        saveTables();
        return;
    }
    let total = 0;
    let cartHtml = "";
    cartItems.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        cartHtml += `<div class="cart-item"><div><strong>${item.name}</strong> x ${item.quantity}<div class="cart-item-detail">${item.price} TL/adet</div></div><div>${itemTotal} TL <button onclick="window.removeFromCart(${index})" style="background:#ef4444; border:none; border-radius:8px; padding:4px 8px; color:white;">✖</button></div></div>`;
    });
    document.getElementById("cart").innerHTML = cartHtml;
    document.getElementById("total").innerHTML = `Toplam: ${total} TL`;
    if (selectedTableId) {
        const table = tablesData.find(t => t.id === selectedTableId);
        if (table) table.total = total;
        saveTables();
    }
}

window.removeFromCart = function(index) {
    if (!canEditProducts()) { alert("Ürün çıkarma yetkiniz yok!"); return; }
    if (!selectedTableId) return;
    orders[selectedTableId].splice(index, 1);
    renderCart();
    saveOrders();
};

function payOrder() {
    if (!canMakePayment()) { alert("Tahsilat yetkiniz yok!"); return; }
    if (!selectedTableId) { alert("Masa seçin"); return; }
    const cart = orders[selectedTableId];
    if (!cart || cart.length === 0) { alert("Sepet boş"); return; }
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (confirm(`Toplam ${total} TL. Ödemeyi onaylıyor musunuz?`)) {
        const orderRecord = { id: Date.now(), date: new Date().toISOString(), tableId: selectedTableId, tableName: tablesData.find(t => t.id === selectedTableId)?.name, total: total, items: [...cart] };
        revenueData.orders.unshift(orderRecord);
        revenueData.total += total;
        orders[selectedTableId] = [];
        const table = tablesData.find(t => t.id === selectedTableId);
        if (table) table.total = 0;
        saveRevenue();
        saveOrders();
        saveTables();
        alert("Ödeme başarılı! Masa boşaltıldı.");
        backToTables();
    }
}

function showDetailedPayment() {
    if (!canMakePayment()) { alert("Tahsilat yetkiniz yok!"); return; }
    if (!selectedTableId) { alert("Masa seçin"); return; }
    const cartItems = orders[selectedTableId];
    if (!cartItems || cartItems.length === 0) { alert("Sepet boş"); return; }
    
    let paymentQuantities = cartItems.map(() => 0);
    const modal = document.createElement("div");
    modal.className = "modal-payment";
    
    function renderPaymentItems() {
        const container = document.getElementById("paymentItems");
        if (!container) return;
        container.innerHTML = "";
        cartItems.forEach((item, idx) => {
            const div = document.createElement("div");
            div.className = "payment-item";
            div.onclick = () => {
                if (paymentQuantities[idx] < item.quantity) {
                    paymentQuantities[idx]++;
                    document.getElementById(`qty_${idx}`).textContent = paymentQuantities[idx];
                    updateTotal();
                }
            };
            div.innerHTML = `<div class="payment-item-info"><strong>${item.name}</strong><br><small>${item.price} TL/adet (Sepette: ${item.quantity})</small></div><div class="payment-item-controls"><span style="font-size:20px;font-weight:bold;background:#3b82f6;color:white;padding:4px 12px;border-radius:8px;" id="qty_${idx}">${paymentQuantities[idx]}</span><span style="margin-left:8px;">adet</span></div>`;
            container.appendChild(div);
        });
    }
    
    function updateTotal() {
        let total = 0;
        cartItems.forEach((item, idx) => total += item.price * paymentQuantities[idx]);
        document.getElementById("selectedTotal").textContent = total;
        return total;
    }
    
    modal.innerHTML = `
        <div class="modal-payment-content">
            <div class="modal-header">
                <h3>🔍 Detaylı Ödeme - Ödenecek Ürünlere Tıkla</h3>
                <button class="close-modal" onclick="this.closest('.modal-payment').remove()">✖ Kapat</button>
            </div>
            <p style="font-size:14px;color:#6b7280;">👇 Ödemek istediğiniz ürüne her tıklamada 1 adet eklenir</p>
            <div id="paymentItems"></div>
            <div class="payment-total"><strong>Ödenecek Toplam: <span id="selectedTotal">0</span> TL</strong></div>
            <button id="modalPayBtn" class="modal-pay-btn">💰 Seçilenleri Öde</button>
        </div>
    `;
    document.body.appendChild(modal);
    renderPaymentItems();
    updateTotal();
    
    document.getElementById("modalPayBtn").onclick = () => {
        const selectedTotal = updateTotal();
        if (selectedTotal === 0) { alert("Lütfen ödenecek ürünlere tıklayın!"); return; }
        const selectedItems = [];
        const remainingItems = [];
        cartItems.forEach((item, idx) => {
            if (paymentQuantities[idx] > 0) selectedItems.push({ ...item, quantity: paymentQuantities[idx] });
            if (item.quantity - paymentQuantities[idx] > 0) remainingItems.push({ ...item, quantity: item.quantity - paymentQuantities[idx] });
        });
        if (confirm(`Seçilen ürünlerin toplamı ${selectedTotal} TL. Ödemeyi onaylıyor musunuz?`)) {
            orders[selectedTableId] = remainingItems;
            const orderRecord = { id: Date.now(), date: new Date().toISOString(), tableId: selectedTableId, tableName: tablesData.find(t => t.id === selectedTableId)?.name, total: selectedTotal, items: selectedItems };
            revenueData.orders.unshift(orderRecord);
            revenueData.total += selectedTotal;
            saveRevenue();
            saveOrders();
            renderCart();
            modal.remove();
            if (remainingItems.length === 0) backToTables();
            else alert(`Kalan ${remainingItems.reduce((s, i) => s + i.price * i.quantity, 0)} TL için sipariş devam ediyor.`);
        }
    };
}

// ========== MASA BİRLEŞTİRME/AKTARMA ==========
function mergeTables() {
    if (!canManageTables()) { alert("Bu işlem için yetkiniz yok!"); return; }
    if (selectedTablesForAction.length < 2) { alert("En az 2 masa seçmelisiniz!"); return; }
    const targetId = selectedTablesForAction[0];
    const sourceIds = selectedTablesForAction.slice(1);
    sourceIds.forEach(srcId => {
        const sourceItems = orders[srcId] || [];
        sourceItems.forEach(item => {
            const existing = orders[targetId].find(i => i.id === item.id);
            if (existing) existing.quantity += item.quantity;
            else orders[targetId].push({ ...item });
        });
        orders[srcId] = [];
        const srcTable = tablesData.find(t => t.id === srcId);
        if (srcTable) srcTable.total = 0;
    });
    const targetTotal = orders[targetId].reduce((s, i) => s + i.price * i.quantity, 0);
    const targetTable = tablesData.find(t => t.id === targetId);
    if (targetTable) targetTable.total = targetTotal;
    saveOrders();
    saveTables();
    renderTablesPOS();
    cancelAction();
    alert(`${selectedTablesForAction.length} masa başarıyla birleştirildi!`);
}

function transferOrders() {
    if (!canManageTables()) { alert("Bu işlem için yetkiniz yok!"); return; }
    if (selectedTablesForAction.length !== 1) { alert("Aktarılacak bir masa seçin!"); return; }
    if (!transferTargetTable) { alert("Hedef masa seçin!"); return; }
    const sourceId = selectedTablesForAction[0];
    const targetId = transferTargetTable;
    if (sourceId === targetId) { alert("Aynı masaya aktarma yapamazsınız!"); return; }
    const sourceItems = orders[sourceId] || [];
    if (sourceItems.length === 0) { alert("Kaynak masada sipariş yok!"); return; }
    sourceItems.forEach(item => {
        const existing = orders[targetId].find(i => i.id === item.id);
        if (existing) existing.quantity += item.quantity;
        else orders[targetId].push({ ...item });
    });
    orders[sourceId] = [];
    const targetTotal = orders[targetId].reduce((s, i) => s + i.price * i.quantity, 0);
    const targetTable = tablesData.find(t => t.id === targetId);
    if (targetTable) targetTable.total = targetTotal;
    const sourceTable = tablesData.find(t => t.id === sourceId);
    if (sourceTable) sourceTable.total = 0;
    saveOrders();
    saveTables();
    renderTablesPOS();
    cancelAction();
    alert("Siparişler başarıyla aktarıldı!");
}

function cancelAction() {
    actionMode = null;
    selectedTablesForAction = [];
    transferTargetTable = null;
    document.getElementById("mergeModeBtn").classList.remove("hidden");
    document.getElementById("transferModeBtn").classList.remove("hidden");
    document.getElementById("cancelActionBtn").classList.add("hidden");
    renderTablesPOS();
}

function startMergeMode() {
    if (!canManageTables()) { alert("Bu işlem için yetkiniz yok!"); return; }
    actionMode = "merge";
    selectedTablesForAction = [];
    document.getElementById("mergeModeBtn").classList.add("hidden");
    document.getElementById("transferModeBtn").classList.add("hidden");
    document.getElementById("cancelActionBtn").classList.remove("hidden");
    renderTablesPOS();
    alert("Birleştirmek istediğiniz masaları seçin. İlk seçtiğiniz masa ana masa olacak.");
}

function startTransferMode() {
    if (!canManageTables()) { alert("Bu işlem için yetkiniz yok!"); return; }
    actionMode = "transfer";
    selectedTablesForAction = [];
    transferTargetTable = null;
    document.getElementById("mergeModeBtn").classList.add("hidden");
    document.getElementById("transferModeBtn").classList.add("hidden");
    document.getElementById("cancelActionBtn").classList.remove("hidden");
    renderTablesPOS();
    alert("Önce kaynak masayı seçin, sonra hedef masayı seçin.");
}

function handleTableSelectionForAction(tableId) {
    if (actionMode === "merge") {
        if (selectedTablesForAction.includes(tableId)) selectedTablesForAction = selectedTablesForAction.filter(id => id !== tableId);
        else selectedTablesForAction.push(tableId);
        renderTablesPOS();
        if (selectedTablesForAction.length >= 2 && confirm(`${selectedTablesForAction.length} masa birleştirilsin mi?`)) mergeTables();
    } else if (actionMode === "transfer") {
        if (selectedTablesForAction.length === 0) {
            selectedTablesForAction = [tableId];
            renderTablesPOS();
            alert("Hedef masayı seçin.");
        } else {
            transferTargetTable = tableId;
            renderTablesPOS();
            if (confirm(`${tablesData.find(t => t.id === selectedTablesForAction[0])?.name} siparişlerini ${tablesData.find(t => t.id === transferTargetTable)?.name}'a aktarmak istiyor musunuz?`)) transferOrders();
            else cancelAction();
        }
    }
}

// ========== ADMIN PANELİ ==========
function switchScreen() {
    if (!canAccessAdminPanel()) { alert("Admin paneline erişim yetkiniz yok!"); return; }
    const posScreen = document.getElementById("posScreen");
    const adminScreen = document.getElementById("adminScreen");
    const switchBtn = document.getElementById("switchBtn");
    if (posScreen.classList.contains("hidden")) {
        posScreen.classList.remove("hidden");
        adminScreen.classList.add("hidden");
        switchBtn.textContent = "🔧 Admin Paneli";
        backToTables();
    } else {
        posScreen.classList.add("hidden");
        adminScreen.classList.remove("hidden");
        switchBtn.textContent = "💰 POS Ekranı";
        renderRevenueStats();
        renderAdminProducts();
        renderAdminTables();
        renderAdminUsers();
    }
}

function renderRevenueStats() {
    document.getElementById("totalRevenue").textContent = `${revenueData.total} TL`;
    document.getElementById("totalOrders").textContent = revenueData.orders.length;
    const today = new Date().toDateString();
    const todayTotal = revenueData.orders.filter(o => new Date(o.date).toDateString() === today).reduce((s, o) => s + o.total, 0);
    document.getElementById("todayRevenue").textContent = `${todayTotal} TL`;
    const historyDiv = document.getElementById("orderHistory");
    if (revenueData.orders.length === 0) historyDiv.innerHTML = "<p style='text-align:center;color:#6b7280;'>Henüz sipariş yok</p>";
    else historyDiv.innerHTML = revenueData.orders.map(o => `<div class="order-item"><div><strong>${o.tableName}</strong><br><span class="order-date">${new Date(o.date).toLocaleString('tr-TR')}</span></div><div><strong>${o.total} TL</strong><br><span style="font-size:12px;">${o.items.length} ürün</span></div></div>`).join('');
}

function resetStats() {
    if (confirm("Tüm ciro verileri ve sipariş geçmişi silinecek. Emin misiniz?")) {
        revenueData = { total: 0, orders: [], lastReset: new Date().toISOString() };
        saveRevenue();
        renderRevenueStats();
        alert("İstatistikler sıfırlandı");
    }
}

function renderAdminProducts() {
    const tbody = document.getElementById("adminProductList");
    if (!tbody) return;
    tbody.innerHTML = "";
    products.forEach(p => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = p.id;
        const nameCell = row.insertCell(1);
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = p.name;
        nameInput.className = "admin-input";
        nameCell.appendChild(nameInput);
        const priceCell = row.insertCell(2);
        const priceInput = document.createElement("input");
        priceInput.type = "number";
        priceInput.value = p.price;
        priceInput.className = "admin-input";
        priceCell.appendChild(priceInput);
        const catCell = row.insertCell(3);
        const catInput = document.createElement("input");
        catInput.type = "text";
        catInput.value = p.category;
        catInput.className = "admin-input";
        catCell.appendChild(catInput);
        const actionCell = row.insertCell(4);
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "💾 Kaydet";
        saveBtn.className = "admin-btn";
        saveBtn.onclick = () => { p.name = nameInput.value; p.price = parseInt(priceInput.value); p.category = catInput.value; saveProducts(); renderAdminProducts(); if (document.getElementById("orderView") && !document.getElementById("orderView").classList.contains("hidden")) renderProductsPOS(); };
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑 Sil";
        deleteBtn.className = "admin-btn danger";
        deleteBtn.onclick = () => { if (confirm("Silinsin mi?")) { Object.keys(orders).forEach(tid => { orders[tid] = orders[tid].filter(i => i.id !== p.id); }); products = products.filter(x => x.id !== p.id); saveProducts(); saveOrders(); renderAdminProducts(); if (document.getElementById("orderView") && !document.getElementById("orderView").classList.contains("hidden")) renderProductsPOS(); } };
        actionCell.appendChild(saveBtn);
        actionCell.appendChild(deleteBtn);
    });
}

function addNewProduct() {
    const newId = Math.max(...products.map(p => p.id), 0) + 1;
    products.push({ id: newId, name: "Yeni Ürün", price: 0, category: "Diğer" });
    saveProducts();
    renderAdminProducts();
    if (document.getElementById("orderView") && !document.getElementById("orderView").classList.contains("hidden")) renderProductsPOS();
}

function renderAdminTables() {
    const tbody = document.getElementById("adminTableList");
    if (!tbody) return;
    tbody.innerHTML = "";
    tablesData.forEach(t => {
        const row = tbody.insertRow();
        row.insertCell(0).textContent = t.id;
        const nameCell = row.insertCell(1);
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = t.name;
        nameInput.className = "admin-input";
        nameCell.appendChild(nameInput);
        const statusCell = row.insertCell(2);
        const status = getTableStatus(t.id);
        statusCell.textContent = status === "available" ? "Boş" : "Dolu";
        statusCell.style.color = status === "available" ? "#10b981" : "#ef4444";
        const actionCell = row.insertCell(3);
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "💾 Kaydet";
        saveBtn.className = "admin-btn";
        saveBtn.onclick = () => { t.name = nameInput.value; saveTables(); renderAdminTables(); if (!document.getElementById("posScreen").classList.contains("hidden")) renderTablesPOS(); if (selectedTableId === t.id) document.getElementById("selectedTableTitle").innerHTML = `${t.name} - Sipariş`; };
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑 Sil";
        deleteBtn.className = "admin-btn danger";
        deleteBtn.onclick = () => { if (tablesData.length === 1) { alert("En az bir masa olmalı!"); return; } if (confirm(`${t.name} silinsin mi?`)) { delete orders[t.id]; tablesData = tablesData.filter(x => x.id !== t.id); if (selectedTableId === t.id) backToTables(); saveTables(); saveOrders(); renderAdminTables(); if (!document.getElementById("posScreen").classList.contains("hidden")) renderTablesPOS(); } };
        actionCell.appendChild(saveBtn);
        actionCell.appendChild(deleteBtn);
    });
}

function addNewTable() {
    const newId = Math.max(...tablesData.map(t => t.id), 0) + 1;
    tablesData.push({ id: newId, name: `Masa ${newId}`, total: 0 });
    orders[newId] = [];
    saveTables();
    saveOrders();
    renderAdminTables();
    if (!document.getElementById("posScreen").classList.contains("hidden")) renderTablesPOS();
}

function renderAdminUsers() {
    const tbody = document.getElementById("adminUserList");
    if (!tbody) return;
    tbody.innerHTML = "";
    users.forEach((u, idx) => {
        const row = tbody.insertRow();
        const nameCell = row.insertCell(0);
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = u.username;
        nameInput.className = "admin-input";
        nameCell.appendChild(nameInput);
        const roleCell = row.insertCell(1);
        const roleSelect = document.createElement("select");
        roleSelect.className = "admin-input";
        roleSelect.innerHTML = `<option value="waiter" ${u.role === "waiter" ? "selected" : ""}>Garson</option><option value="cashier" ${u.role === "cashier" ? "selected" : ""}>Kasiyer</option><option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>`;
        roleCell.appendChild(roleSelect);
        const actionCell = row.insertCell(2);
        const saveBtn = document.createElement("button");
        saveBtn.textContent = "💾 Kaydet";
        saveBtn.className = "admin-btn";
        saveBtn.onclick = () => { u.username = nameInput.value; u.role = roleSelect.value; saveUsers(); renderAdminUsers(); };
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑 Sil";
        deleteBtn.className = "admin-btn danger";
        deleteBtn.onclick = () => { if (users.length === 1) { alert("En az bir kullanıcı olmalı!"); return; } if (u.username === currentUser.username) { alert("Kendi hesabınızı silemezsiniz!"); return; } users.splice(idx, 1); saveUsers(); renderAdminUsers(); };
        actionCell.appendChild(saveBtn);
        actionCell.appendChild(deleteBtn);
    });
}

function addNewUser() {
    const username = prompt("Yeni kullanıcı adı:");
    if (!username) return;
    if (users.find(u => u.username === username)) { alert("Bu kullanıcı adı zaten var!"); return; }
    const role = prompt("Rol (waiter/cashier/admin):", "waiter");
    if (!role || !["waiter", "cashier", "admin"].includes(role)) { alert("Geçersiz rol!"); return; }
    users.push({ username: username, password: "1234", role: role });
    saveUsers();
    renderAdminUsers();
    alert(`${username} kullanıcısı eklendi. Şifre: 1234`);
}

// ========== ÇIKIŞ ==========
window.logout = function() {
    currentUser = null;
    currentScreen = "menu";
    renderMenu();
};

// ========== REFRESH UI ==========
function refreshUI() {
    if (currentUser) {
        if (document.getElementById("posScreen")) {
            renderTablesPOS();
            renderProductsPOS();
            if (selectedTableId) renderCart();
        }
    } else {
        if (document.getElementById("menu-container") || document.querySelector(".menu-container")) {
            renderMenu();
        }
    }
}

// ========== BAŞLAT ==========
initFirebaseListeners();
renderMenu();

window.showLoginModal = showLoginModal;
window.logout = logout;
window.removeFromCart = removeFromCart;
