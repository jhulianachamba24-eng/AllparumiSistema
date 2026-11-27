
/**
 * INTEGRA SUITE v74.0 - ORVEN INTEGRATION & SYSTEM STABILITY
 * Autor: Senior Dev Assistant
 * Funcionalidades: IA Orven, Pestañas, Alertas, Fix IVA, Stock Avanzado, Permisos.
 */

(function() {
    'use strict';

    // --- 1. CONFIGURACIÓN Y ESTABILIDAD DE DATOS ---
    const DB_KEY = 'integra_v74_master';
    
    // Sobrescribir DB.save para asegurar persistencia robusta
    const originalSave = DB.save;
    DB.save = function() {
        try {
            // Guardado principal
            localStorage.setItem(DB_KEY, JSON.stringify(this.data));
            // Backup de seguridad automático
            localStorage.setItem(DB_KEY + '_backup', JSON.stringify(this.data));
            console.log('💾 Datos guardados correctamente en v74.0');
        } catch (e) {
            console.error('Error crítico al guardar:', e);
            UI.toast('Error al guardar datos', 'error');
        }
        // Ejecutar guardado original si existe otra lógica
        if(originalSave) originalSave.call(this);
    };

    // --- 2. MOTOR DE ALERTAS (Cumpleaños y Seguimientos) ---
    setInterval(() => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // A. Alertas de Cumpleaños
        if (DB.data.clients) {
            DB.data.clients.forEach(c => {
                if (c.birthdate) {
                    const bDay = c.birthdate.substring(5); // MM-DD
                    const todayMD = now.toISOString().substring(5, 10);
                    const tomorrowMD = tomorrow.toISOString().substring(5, 10);

                    if (bDay === todayMD && !c.birthday_notified_today) {
                        UI.toast(`🎂 ¡HOY es el cumpleaños de ${c.name}!`, 'success');
                        c.birthday_notified_today = true; // Flag temporal
                    } else if (bDay === tomorrowMD && !c.birthday_notified_tomorrow) {
                        UI.toast(`🎁 MAÑANA es el cumpleaños de ${c.name}`, 'info');
                        c.birthday_notified_tomorrow = true;
                    }
                }
            });
        }

        // B. Alertas de Seguimiento (15 min antes)
        if (DB.data.tracking) {
            DB.data.tracking.forEach(t => {
                if (t.date && t.time && !t.notified) {
                    const eventTime = new Date(`${t.date}T${t.time}`);
                    const diff = eventTime - now;
                    if (diff > 0 && diff <= 15 * 60 * 1000) { // 15 min
                        UI.toast(`⏰ RECORDATORIO: ${t.description} con ${t.client_name} en 15 min`, 'warning');
                        t.notified = true;
                        DB.save();
                    }
                }
            });
        }
    }, 60000); // Revisar cada minuto

    // --- 3. CORRECCIÓN DE IVA Y DESCUENTOS ---
    // Sobrescribimos la lógica de cálculo en Cotizaciones
    if (window.Modules && Modules.Quotes) {
        const originalCalc = Modules.Quotes.calculateTotals;
        Modules.Quotes.calculateTotals = function() {
            let subtotal = 0;
            let totalIva = 0;
            let totalDesc = 0;

            this.tempItems.forEach(item => {
                const price = parseFloat(item.price) || 0;
                const qty = parseFloat(item.qty) || 0;
                const discPct = parseFloat(item.discount) || 0;
                const ivaPct = parseFloat(item.iva) || 0;

                const lineTotal = price * qty;
                const lineDesc = lineTotal * (discPct / 100);
                const baseImponible = lineTotal - lineDesc;
                const lineIva = baseImponible * (ivaPct / 100);

                subtotal += baseImponible;
                totalIva += lineIva;
                totalDesc += lineDesc;
                
                item.subtotal = baseImponible; // Subtotal sin IVA
            });

            const total = subtotal + totalIva;

            // Actualizar DOM
            const elSub = document.getElementById('quote-subtotal');
            const elIva = document.getElementById('quote-iva');
            const elTotal = document.getElementById('quote-total');
            const elDesc = document.getElementById('quote-discount');

            if (elSub) elSub.textContent = Utils.formatMoney(subtotal);
            if (elIva) elIva.textContent = Utils.formatMoney(totalIva);
            if (elTotal) elTotal.textContent = Utils.formatMoney(total);
            if (elDesc) elDesc.textContent = Utils.formatMoney(totalDesc);
            
            this.currentTotals = { subtotal, totalIva, total, totalDesc };
        };
    }

    // --- 4. GESTIÓN DE STOCK AVANZADA ---
    if (window.Modules && Modules.Inventory) {
        // Agregar botón en el render
        const originalRender = Modules.Inventory.render;
        Modules.Inventory.render = function() {
            originalRender.call(this);
            // Inyectar botón en la tabla después de renderizar
            setTimeout(() => {
                const tbody = document.getElementById('inv-tbody');
                if (tbody) {
                    const rows = tbody.querySelectorAll('tr');
                    rows.forEach((row, idx) => {
                        if (!row.querySelector('.btn-add-stock')) {
                            const cell = row.querySelector('td:last-child') || row.insertCell();
                            const btn = document.createElement('button');
                            btn.className = 'btn btn-sm btn-success btn-add-stock';
                            btn.innerHTML = '📥 Stock';
                            btn.onclick = () => openStockModal(idx);
                            cell.appendChild(btn);
                        }
                    });
                }
            }, 100);
        };

        window.openStockModal = function(idx) {
            const products = DB.getAll('products');
            const p = products[idx];
            if (!p) return;

            const html = `
                <div class="grid-2">
                    <div class="input-group"><label>Motivo</label><input id="stock-reason" class="input" placeholder="Ej: Compra proveedor"></div>
                    <div class="input-group"><label>Cantidad</label><input id="stock-qty" type="number" class="input" value="1"></div>
                    <div class="input-group"><label>Fecha/Hora</label><input id="stock-date" type="datetime-local" class="input" value="${new Date().toISOString().slice(0,16)}"></div>
                </div>
            `;
            
            UI.modal('Agregar Stock: ' + p.name, html, () => {
                const qty = parseFloat(document.getElementById('stock-qty').value);
                const reason = document.getElementById('stock-reason').value;
                const date = document.getElementById('stock-date').value;
                
                if (qty && reason) {
                    p.stock = (p.stock || 0) + qty;
                    DB.update('products', p.id, { stock: p.stock });
                    
                    // Registrar en Kardex
                    DB.insert('kardex', {
                        date: date,
                        product: p.name,
                        type: 'ENTRADA MANUAL',
                        qty: qty,
                        reason: reason,
                        balance: p.stock
                    });
                    
                    UI.toast('Stock actualizado correctamente', 'success');
                    Modules.Inventory.render();
                }
            });
        };
    }

    // --- 5. SISTEMA DE PESTAÑAS (CHROME STYLE) ---
    const TabManager = {
        tabs: [],
        activeTab: null,
        init: function() {
            const header = document.querySelector('.header');
            if (!document.getElementById('chrome-tabs')) {
                const tabBar = document.createElement('div');
                tabBar.id = 'chrome-tabs';
                tabBar.style.cssText = 'display:flex; gap:5px; padding:5px 10px; background:#f1f5f9; border-bottom:1px solid #cbd5e1; overflow-x:auto; height:40px; align-items:center;';
                header.after(tabBar);
            }
        },
        add: function(id, title) {
            if (this.tabs.find(t => t.id === id)) {
                this.activate(id);
                return;
            }
            const tab = { id, title };
            this.tabs.push(tab);
            this.render();
            this.activate(id);
        },
        activate: function(id) {
            this.activeTab = id;
            // Ocultar todas las vistas
            document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
            const target = document.getElementById('view-' + id);
            if (target) target.style.display = 'block';
            this.render();
        },
        close: function(id, e) {
            e.stopPropagation();
            this.tabs = this.tabs.filter(t => t.id !== id);
            if (this.activeTab === id) {
                const last = this.tabs[this.tabs.length - 1];
                this.activeTab = last ? last.id : 'dashboard';
                this.activate(this.activeTab);
            } else {
                this.render();
            }
        },
        render: function() {
            const bar = document.getElementById('chrome-tabs');
            if (!bar) return;
            bar.innerHTML = this.tabs.map(t => `
                <div onclick="TabManager.activate('${t.id}')" style="padding:5px 15px; background:${this.activeTab === t.id ? '#fff' : '#e2e8f0'}; border-radius:5px 5px 0 0; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:12px; border:1px solid #cbd5e1; border-bottom:none;">
                    <span>${t.title}</span>
                    <span onclick="TabManager.close('${t.id}', event)" style="font-weight:bold; color:#64748b;">✕</span>
                </div>
            `).join('');
        }
    };

    // Hook en App.navigate para usar pestañas
    const oldNavigate = App.navigate;
    App.navigate = function(view) {
        oldNavigate.call(this, view);
        const titles = {
            'crm': 'Clientes', 'quotes': 'Cotizaciones', 'orders': 'Pedidos', 
            'invoices': 'Facturas', 'inventory': 'Inventario', 'dashboard': 'Dashboard'
        };
        if (titles[view]) TabManager.add(view, titles[view]);
    };
    window.addEventListener('DOMContentLoaded', () => TabManager.init());

    // --- 6. IA ORVEN (FLOTANTE) ---
    const ORVEN_AI = window.ORVEN_AI = {
        init: function() {
            if (document.getElementById('orven-ai-btn')) return;
            
            // Botón Flotante
            const btn = document.createElement('div');
            btn.id = 'orven-ai-btn';
            btn.innerHTML = '🟢'; // Símbolo ORVEN simplificado
            btn.style.cssText = 'position:fixed; bottom:30px; right:30px; width:60px; height:60px; background:#2F4B3E; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.3); z-index:9999; font-size:24px; transition:transform 0.3s;';
            btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
            btn.onmouseleave = () => btn.style.transform = 'scale(1)';
            btn.onclick = () => this.toggle();
            document.body.appendChild(btn);

            // Ventana de Chat
            const chat = document.createElement('div');
            chat.id = 'orven-ai-chat';
            chat.style.cssText = 'position:fixed; bottom:100px; right:30px; width:350px; height:500px; background:#F4F2ED; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.2); display:none; flex-direction:column; z-index:9998; border:1px solid #2F4B3E; font-family:"Instrument Sans", sans-serif;';
            chat.innerHTML = `
                <div style="background:#2F4B3E; color:#F4F2ED; padding:15px; border-radius:12px 12px 0 0; font-weight:bold; display:flex; justify-content:space-between;">
                    <span>ORVEN IA · MARCH.01</span>
                    <span style="cursor:pointer" onclick="ORVEN_AI.toggle()">_</span>
                </div>
                <div id="orven-messages" style="flex:1; padding:15px; overflow-y:auto; font-size:14px; color:#17191B;"></div>
                <div style="padding:10px; border-top:1px solid #cbd5e1; display:flex; gap:5px;">
                    <input id="orven-input" type="text" placeholder="Pregunta a ORVEN..." style="flex:1; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
                    <button onclick="ORVEN_AI.send()" style="background:#BE8A60; color:white; border:none; padding:0 15px; border-radius:4px; cursor:pointer;">➤</button>
                </div>
            `;
            document.body.appendChild(chat);
            this.addMessage("ORVEN", "Hola. Soy MARCH.01, la inteligencia artificial de Integra Suite Corporate. ¿Qué deseas analizar hoy?");
        },
        toggle: function() {
            const chat = document.getElementById('orven-ai-chat');
            chat.style.display = chat.style.display === 'none' ? 'flex' : 'none';
        },
        addMessage: function(sender, text) {
            const box = document.getElementById('orven-messages');
            const div = document.createElement('div');
            div.style.marginBottom = '10px';
            div.innerHTML = `<strong style="color:${sender === 'ORVEN' ? '#2F4B3E' : '#BE8A60'}">${sender}:</strong> ${text}`;
            box.appendChild(div);
            box.scrollTop = box.scrollHeight;
        },
        send: function() {
            const input = document.getElementById('orven-input');
            const text = input.value.trim();
            if (!text) return;
            
            this.addMessage('Tú', text);
            input.value = '';
            
            // Lógica de IA simulada basada en datos reales
            setTimeout(() => {
                let response = "Estoy procesando tu solicitud con criterio...";
                const lowerText = text.toLowerCase();
                
                if (lowerText.includes('venta') || lowerText.includes('estadistica')) {
                    const total = DB.getAll('invoices').reduce((sum, i) => sum + (i.total || 0), 0);
                    response = `He analizado las facturas. El volumen de venta total registrado es de ${Utils.formatMoney(total)}. El criterio sugiere revisar los productos de menor rotación.`;
                } else if (lowerText.includes('stock') || lowerText.includes('inventario')) {
                    const lowStock = DB.getAll('products').filter(p => p.stock < 5).length;
                    response = `Hay ${lowStock} productos con stock crítico. Recomiendo realizar un pedido de reposición inmediato para mantener el orden operativo.`;
                } else if (lowerText.includes('cliente') || lowerText.includes('cumple')) {
                    const clients = DB.getAll('clients').length;
                    response = `Actualmente gestionamos ${clients} clientes activos. La orientación sugiere contactar a aquellos sin actividad reciente.`;
                } else {
                    response = "Entendido. Para darte una respuesta precisa, necesito que especifiques si buscas datos de ventas, inventario o clientes. Mi función es reducir la incertidumbre.";
                }
                this.addMessage('ORVEN', response);
            }, 800);
        }
    };
    window.addEventListener('load', () => ORVEN_AI.init());

    // --- 7. PERMISOS GRANULARES ---
    // Se asume que el usuario tiene un campo 'permissions' array
    const originalRenderModules = App.renderModules || function(){};
    App.checkPermissions = function() {
        const user = Auth.currentUser;
        if (!user || !user.permissions) return; // Admin o sin restricciones
        
        const modulesMap = {
            'crm': 'ver_clientes',
            'inventory': 'ver_productos',
            'invoices': 'ver_facturas',
            'settings': 'ver_config'
        };

        Object.keys(modulesMap).forEach(mod => {
            const perm = modulesMap[mod];
            const navItem = document.querySelector(`.nav-item[data-view="${mod}"]`);
            if (navItem && !user.permissions.includes(perm)) {
                navItem.style.display = 'none';
            }
        });
    };
    // Ejecutar tras login
    const oldLogin = Auth.login;
    Auth.login = function() {
        oldLogin.call(this);
        setTimeout(() => App.checkPermissions(), 500);
    };

    // --- 8. GRÁFICO PRODUCTOS MÁS VENDIDOS (COLORES) ---
    // Se asume que ya existe un canvas 'chart-best-sellers'
    const originalRenderCharts = App.renderCharts || function(){};
    App.renderCharts = function() {
        originalRenderCharts.call(this);
        
        const ctx = document.getElementById('chart-best-sellers');
        if (ctx && window.Chart) {
            // Destruir anterior si existe
            if (this.bestSellerChart) this.bestSellerChart.destroy();

            // Calcular datos
            const sales = {};
            DB.getAll('invoices').forEach(inv => {
                const items = JSON.parse(inv.items || '[]');
                items.forEach(item => {
                    sales[item.name] = (sales[item.name] || 0) + item.qty;
                });
            });

            const labels = Object.keys(sales).slice(0, 5);
            const data = labels.map(l => sales[l]);
            // Paleta ORVEN: Verde, Cobre, Salvia, Grafito, Piedra
            const colors = ['#2F4B3E', '#BE8A60', '#A8C3B4', '#17191B', '#5F6763'];

            this.bestSellerChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Unidades Vendidas',
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0' } }, x: { grid: { display: false } } }
                }
            });
        }
    };

    console.log("✅ Integra Suite v74.0 cargado: ORVEN IA, Pestañas, Alertas y Fixes aplicados.");
})();
