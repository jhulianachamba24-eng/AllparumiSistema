
const DB = {

    data: {
        companies: [],
        branches: [],
        users: [],
        clients: [],
        products: [],
        kardex: [],
        quotes: [],
        orders: [],
        invoices: [],
        reservations: [],
        purchases: [],
        warehouses: [],
        settings: {},
        audit: [],
        counters: {},
        credit_notes: [],
        sales_notes: [],
        excel_rows: [],
        tracking: [],
        logistics: [],
        roles: []
    },

    init: async function () {

        try {

            const s = localStorage.getItem('integra_suite_v76');

            if (s) {

                const p = JSON.parse(s);

                Object.keys(this.data).forEach(k => {

                    this.data[k] =
                        Array.isArray(this.data[k])
                            ? (
                                Array.isArray(p[k])
                                    ? p[k]
                                    : []
                            )
                            : (
                                p[k] || {}
                            );
                });

                /*
                 * Migración automática de usuarios antiguos.
                 */
                this.migrateUsers();

                /*
                 * Asegurar que exista administrador
                 * del sistema.
                 */
                this.ensureSystemAdmin();

                this.save();

            } else {

                this.seedData();

                this.save();
            }

            return true;

        } catch (e) {

            console.error('DB INIT ERROR', e);

            this.seedData();

            this.save();

            return true;
        }
    },

    /*
     * ============================================================
     * DATOS INICIALES
     * ============================================================
     */

    seedData: function () {

        this.data.companies = [

            {
                id: 'comp1',
                name: 'ALLPARUMI',
                ruc: '1104985682001',
                iva: 15,
                address: 'Loja, Santa Marianita de Jesús 08-16 10 de Agosto',
                logo: '',
                phone: '0992796300',
                hideLogoPrint: false,
                conditions:
                    'Método de pago: Transferencia|Garantía del fabricante'
            }

        ];

        this.data.branches = [

            {
                id: 'br1',
                company_id: 'comp1',
                name: 'Matriz Central',
                location: 'Loja, Santa Marianita de Jesús 08-16 10 de Agosto'
            }

        ];

        /*
         * ========================================================
         * USUARIOS INICIALES
         * ========================================================
         *
         * Usuario principal del sistema.
         *
         * Usuario:
         * adminsys
         *
         * Contraseña:
         * adminsys123
         *
         * IMPORTANTE:
         * Después del primer ingreso debes cambiarla.
         */

        this.data.users = [

            {
                id: 'sys_admin_001',

                company_id: '',

                username: 'adminsys',

                password: 'adminsys123',

                role: 'Administrador del Sistema',

                status: 'Activo',

                name: 'Administrador',

                lastname: 'Sistema',

                email: '',

                force_change: true,

                first_login: true,

                system_admin: true,

                created_at: new Date().toISOString()
            },

            {
                id: 'u1',

                company_id: 'comp1',

                username: 'admin',

                password: 'admin',

                role: 'Administrador de Empresa',

                status: 'Activo',

                name: 'Administrador',

                lastname: 'Empresa',

                email: '',

                force_change: true,

                first_login: true,

                system_admin: false,

                created_at: new Date().toISOString()
            }

        ];

        /*
         * ========================================================
         * ROLES
         * ========================================================
         */

        this.data.roles = [

            {
                id: 'role_system',

                name: 'Administrador del Sistema',

                desc:
                    'Acceso total al sistema.',

                system: true,

                perms: {

                    dashboard: true,
                    clients: true,
                    quotes: true,
                    orders: true,
                    invoices: true,
                    inventory: true,
                    purchases: true,
                    logistics: true,
                    finance: true,
                    users: true,
                    config: true,
                    companies: true,
                    roles: true,
                    audit: true
                }
            },

            {
                id: 'role_company_admin',

                name: 'Administrador de Empresa',

                desc:
                    'Administrador completo de una empresa.',

                system: false,

                perms: {

                    dashboard: true,
                    clients: true,
                    quotes: true,
                    orders: true,
                    invoices: true,
                    inventory: true,
                    purchases: true,
                    logistics: true,
                    finance: true,
                    users: true,
                    config: true,
                    companies: false,
                    roles: false,
                    audit: false
                }
            },

            {
                id: 'role_advisor',

                name: 'Asesor',

                desc:
                    'Antes denominado Vendedor.',

                system: false,

                perms: {

                    dashboard: true,
                    clients: true,
                    quotes: true,
                    orders: true,
                    invoices: false,
                    inventory: false,
                    purchases: false,
                    logistics: true,
                    finance: false,
                    users: false,
                    config: false,
                    companies: false,
                    roles: false,
                    audit: false
                }
            },

            {
                id: 'role_billing',

                name: 'Facturadora',

                desc:
                    'Usuario encargado de facturación.',

                system: false,

                perms: {

                    dashboard: true,
                    clients: true,
                    quotes: true,
                    orders: true,
                    invoices: true,
                    inventory: true,
                    purchases: true,
                    logistics: true,
                    finance: true,
                    users: false,
                    config: false,
                    companies: false,
                    roles: false,
                    audit: false
                }
            }

        ];

        this.data.warehouses = [

            {
                id: 'wh1',
                company_id: 'comp1',
                code: 'BOD01',
                name: 'Bodega Principal',
                type: 'Stock Normal',
                location: 'Loja',
                manager: 'Admin'
            }

        ];

        this.data.counters = {

            COT: 0,
            PED: 0,
            FAC: 0,
            RES: 0,
            NC: 0,
            NV: 0,
            COM: 0

        };

        this.data.settings = {

            masterPass: '',

            pinDelete: '0000',

            pinFact: '1234',

            pinConfig: '0000',

            brevoKey: '',

            emailFrom: '',

            geminiKey: '',

            orvenKey: ''

        };
    },

    /*
     * ============================================================
     * MIGRACIÓN DE USUARIOS ANTIGUOS
     * ============================================================
     */

    migrateUsers: function () {

        if (!Array.isArray(this.data.users)) {

            this.data.users = [];

        }

        this.data.users.forEach(u => {

            /*
             * Vendedor pasa a ser Asesor.
             */
            if (u.role === 'Vendedor') {

                u.role = 'Asesor';
            }

            /*
             * Administrador antiguo pasa a
             * Administrador de Empresa.
             */
            if (
                u.role === 'Administrador' &&
                !u.system_admin
            ) {

                u.role = 'Administrador de Empresa';
            }

            /*
             * Compatibilidad.
             */
            if (u.force_change === undefined) {

                u.force_change = false;
            }

            if (u.first_login === undefined) {

                u.first_login = false;
            }

        });
    },

    /*
     * ============================================================
     * ASEGURAR ADMINISTRADOR DEL SISTEMA
     * ============================================================
     */

    ensureSystemAdmin: function () {

        let admin = this.data.users.find(
            u =>
                u.system_admin === true ||
                u.role === 'Administrador del Sistema'
        );

        if (!admin) {

            admin = {

                id: 'sys_admin_001',

                company_id: '',

                username: 'adminsys',

                password: 'adminsys123',

                role: 'Administrador del Sistema',

                status: 'Activo',

                name: 'Administrador',

                lastname: 'Sistema',

                email: '',

                force_change: true,

                first_login: true,

                system_admin: true,

                created_at: new Date().toISOString()

            };

            this.data.users.push(admin);

        } else {

            admin.role = 'Administrador del Sistema';

            admin.system_admin = true;

            admin.company_id = '';

        }
    },

    /*
     * ============================================================
     * GUARDAR
     * ============================================================
     */

    save: function () {

        try {

            localStorage.setItem(
                'integra_suite_v76',
                JSON.stringify(this.data)
            );

        } catch (e) {

            console.error(
                'Storage full',
                e
            );
        }
    },

    /*
     * ============================================================
     * OBTENER
     * ============================================================
     */

    getAll: function (t, c) {

        let l = this.data[t] || [];

        if (!Array.isArray(l)) {

            l = [];
        }

        /*
         * Administradores del sistema pueden
         * ver datos globales.
         */

        if (
            c &&
            ![
                'companies',
                'branches',
                'users',
                'warehouses',
                'counters',
                'settings',
                'excel_rows',
                'roles',
                'audit'
            ].includes(t)
        ) {

            l = l.filter(
                i =>
                    i.company_id === c
            );
        }

        return l;
    },

    getOne: function (t, id) {

        return (
            this.data[t] || []
        ).find(
            i =>
                i.id === id
        );
    },

    /*
     * ============================================================
     * INSERTAR
     * ============================================================
     */

    insert: function (t, item) {

        item.id =
            item.id ||
            t.substring(0, 3) +
            '_' +
            Date.now();

        this.data[t].push(item);

        this.save();

        return item;
    },

    /*
     * ============================================================
     * ACTUALIZAR
     * ============================================================
     */

    update: function (
        t,
        id,
        item
    ) {

        const i =
            this.data[t].findIndex(
                x =>
                    x.id === id
            );

        if (i !== -1) {

            this.data[t][i] = {

                ...this.data[t][i],

                ...item

            };

            this.save();

            return this.data[t][i];
        }

        return null;
    },

    /*
     * ============================================================
     * ELIMINAR
     * ============================================================
     */

    delete: function (
        t,
        id
    ) {

        this.data[t] =
            this.data[t].filter(
                i =>
                    i.id !== id
            );

        this.save();
    },

    /*
     * ============================================================
     * NÚMEROS
     * ============================================================
     */

    getNextNumber: function(type) {

        let v =
            this.data.counters[type] ||
            0;

        // Las cotizaciones continúan desde COT-000017.
        if(type==='COT' && v<16){
            v=16;
        }

        v++;

        this.data.counters[type] = v;

        this.save();

        return (
            type +
            '-' +
            String(v).padStart(
                6,
                '0'
            )
        );
    },

    /*
     * ============================================================
     * BACKUP
     * ============================================================
     */

    downloadDB: function () {

        const a =
            document.createElement('a');

        a.href =
            'data:text/json;charset=utf-8,' +
            encodeURIComponent(
                JSON.stringify(this.data)
            );

        a.download =
            'backup_integra_suite.json';

        a.click();

        UI.toast(
            'Backup descargado'
        );
    },

    restoreDB: function(input) {

        const f =
            input.files[0];

        if (!f)return;

        const r =
            new FileReader();

        r.onload = e => {

            try {

                const p =
                    JSON.parse(
                        e.target.result
                    );

                Object.keys(
                    DB.data
                ).forEach(k => {

                    DB.data[k] =
                        Array.isArray(
                            DB.data[k]
                        )
                            ? (
                                Array.isArray(
                                    p[k]
                                )
                                    ? p[k]
                                    : []
                            )
                            : (
                                p[k] || {}
                            );
                });

                this.migrateUsers();

                this.ensureSystemAdmin();

                DB.save();

                UI.toast(
                    'Restaurado'
                );

                setTimeout(
                    () =>
                        location.reload(),
                    1000
                );

            } catch(err) {

                UI.toast(
                    'Archivo inválido',
                    'error'
                );
            }
        };

        r.readAsText(f);
    },

    reset: function() {

        if(
            confirm(
                '¿BORRAR TODO?'
            )
        ){

            localStorage.removeItem(
                'integra_suite_v76'
            );

            location.reload();
        }
    }
};


const Utils = {

    formatMoney: a =>
        new Intl.NumberFormat(
            'en-US',
            {
                style: 'currency',
                currency: 'USD'
            }
        ).format(a),

    formatDate: i => {
        if(!i)return '';
        const text=String(i);
        const match=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const date=match
            ?new Date(
                Number(match[1]),
                Number(match[2])-1,
                Number(match[3]),
                12
            )
            :new Date(i);
        return isNaN(date.getTime())
            ?''
            :date.toLocaleDateString('es-EC');
    },

    formatDateTime: i =>
        new Date(i)
            .toLocaleString(
                'es-EC'
            ),

    todayInputDate: () => {
        const d=new Date();
        const y=d.getFullYear();
        const m=String(d.getMonth()+1).padStart(2,'0');
        const day=String(d.getDate()).padStart(2,'0');
        return `${y}-${m}-${day}`;
    },

    dateInputValue: value => {
        if(!value)return '';
        const s=String(value);
        const match=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if(match)return `${match[1]}-${match[2]}-${match[3]}`;
        const d=new Date(value);
        if(isNaN(d.getTime()))return '';
        const y=d.getFullYear();
        const m=String(d.getMonth()+1).padStart(2,'0');
        const day=String(d.getDate()).padStart(2,'0');
        return `${y}-${m}-${day}`;
    },

    escape: s =>
        s
            ? String(s).replace(
                /[&<>"']/g,
                m =>
                    ({
                        '&':'&amp;',
                        '<':'&lt;',
                        '>':'&gt;',
                        '"':'&quot;',
                        "'":'&#39;'
                    }[m])
            )
            : '',

    fileToBase64: f =>
        new Promise(
            (res,rej) => {

                const r =
                    new FileReader();

                r.readAsDataURL(f);

                r.onload =
                    () =>
                        res(r.result);

                r.onerror = rej;
            }
        ),

    addDays: (d,n) => {

        const r =
            new Date(d);

        r.setDate(
            r.getDate()+n
        );

        return r;
    }
};


const UI = {

    openModal: id => {

        const el =
            document.getElementById(id);

        if(el)
            el.classList.add('open');
    },

    closeModal: id => {

        const el =
            document.getElementById(id);

        if(el)
            el.classList.remove('open');
    },

    toast: (
        m,
        t='success'
    ) => {

        const d =
            document.createElement('div');

        d.className =
            'toast';

        d.style.borderLeftColor =
            t === 'error'
                ? 'var(--danger)'
                : 'var(--success)';

        d.innerHTML =
            `<strong>${
                t === 'error'
                    ? '✕'
                    : '✓'
            }</strong> ${m}`;

        const c =
            document.getElementById(
                'toast-container'
            );

        if(c)
            c.appendChild(d);

        setTimeout(
            () => {

                d.style.opacity='0';

                setTimeout(
                    () =>
                        d.remove(),
                    300
                );

            },
            3000
        );
    },

    confirm: m =>
        confirm(m)
};


const Auth = {

    currentCompany:null,

    currentBranch:null,

    currentUser:null,

    pendingAction:null,

    pendingDeleteId:null,

    pendingDeleteTable:null,

    recoveryCode:null,

    recoveryUser:null,

    /*
     * ============================================================
     * INICIALIZAR
     * ============================================================
     */

    init: async function () {

        const success =
            await DB.init();

        if(!success)return;

        /*
         * Primero localStorage.
         */
        let session =
            localStorage.getItem(
                'integra_session_active'
            );

        /*
         * Después sessionStorage.
         */
        if(!session){

            session =
                sessionStorage.getItem(
                    'integra_session_active'
                );
        }

        if(session){

            try {

                const d =
                    JSON.parse(
                        session
                    );

                this.currentUser =
                    d.user;

                this.currentCompany =
                    d.company;

                this.currentBranch =
                    d.branch;

                if(!this.currentUser){

                    throw new Error(
                        'Session corrupta'
                    );
                }

                /*
                 * Administrador del sistema
                 * puede entrar sin empresa.
                 */

                if(
                    !this.isSystemAdmin() &&
                    !this.currentCompany
                ){

                    throw new Error(
                        'Empresa no encontrada'
                    );
                }

                document.getElementById(
                    'splash'
                ).style.display='none';

                document.getElementById(
                    'login-view'
                ).style.display='none';

                document.getElementById(
                    'app'
                ).style.display='flex';

                App.start();

            } catch(e){

                localStorage.removeItem(
                    'integra_session_active'
                );

                sessionStorage.removeItem(
                    'integra_session_active'
                );

                this.showLogin();
            }

        } else {

            this.showLogin();
        }
    },

    /*
     * ============================================================
     * ADMINISTRADOR DEL SISTEMA
     * ============================================================
     */

    isSystemAdmin: function(user) {

        const u =
            user ||
            this.currentUser;

        if(!u)return false;

        return (
            u.system_admin === true ||
            u.role ===
                'Administrador del Sistema'
        );
    },

    /*
     * ============================================================
     * ADMINISTRADOR DE EMPRESA
     * ============================================================
     */

    isCompanyAdmin:function(user){

        const u =
            user ||
            this.currentUser;

        if(!u)return false;

        return (
            u.role ===
                'Administrador de Empresa'
        );
    },

    /*
     * ============================================================
     * ASESOR
     * ============================================================
     */

    isAdvisor:function(user){

        const u =
            user ||
            this.currentUser;

        if(!u)return false;

        return u.role === 'Asesor';
    },

    /*
     * ============================================================
     * FACTURADORA
     * ============================================================
     */

    isBilling:function(user){

        const u =
            user ||
            this.currentUser;

        if(!u)return false;

        return u.role === 'Facturadora';
    },

    /*
     * ============================================================
     * PERMISOS
     * ============================================================
     */

    hasPermission:function(permission){

        const u =
            this.currentUser;

        if(!u)return false;

        /*
         * Sistema = TODO.
         */

        if(
            this.isSystemAdmin(u)
        ){

            return true;
        }

        /*
         * Buscar rol.
         */

        const role =
            DB.data.roles.find(
                r =>
                    r.name === u.role
            );

        if(
            role &&
            role.perms
        ){

            return !!role.perms[
                permission
            ];
        }

        /*
         * Compatibilidad.
         */

        const fallback = {

            'Administrador de Empresa':[
                'dashboard',
                'clients',
                'quotes',
                'orders',
                'invoices',
                'inventory',
                'purchases',
                'logistics',
                'finance',
                'users',
                'config'
            ],

            'Asesor':[
                'dashboard',
                'clients',
                'quotes',
                'orders',
                'logistics'
            ],

            'Facturadora':[
                'dashboard',
                'clients',
                'quotes',
                'orders',
                'invoices',
                'inventory',
                'purchases',
                'logistics',
                'finance'
            ]

        };

        return (
            fallback[u.role] || []
        ).includes(permission);
    },

    /*
     * ============================================================
     * MOSTRAR LOGIN
     * ============================================================
     */

    showLogin:function(){

        document.getElementById(
            'splash'
        ).style.display='none';

        document.getElementById(
            'login-view'
        ).style.display='flex';

        document.getElementById(
            'app'
        ).style.display='none';

        this.updateLoginSelects();
    },

    /*
     * ============================================================
     * RECUPERACIÓN
     * ============================================================
     */

    showForgot:function(){

        const fp =
            document.getElementById(
                'forgot-panel'
            );

        if(fp)
            fp.classList.toggle(
                'hidden'
            );
    },

    sendRecoveryCode:function(){

        const email =
            document.getElementById(
                'forgot-email'
            ).value.trim();

        if(!email)
            return UI.toast(
                'Ingrese correo',
                'error'
            );

        const user =
            DB.getAll('users')
                .find(
                    u =>
                        u.email === email
                );

        if(!user)
            return UI.toast(
                'Correo no registrado',
                'error'
            );

        this.recoveryCode =
            Math.floor(
                100000 +
                Math.random()*900000
            ).toString();

        this.recoveryUser =
            user;

        EmailService.send(
            email,
            'Código de Recuperación Integra Suite',
            `Su código es: ${this.recoveryCode}`
        );

        UI.toast(
            'Código enviado. Código: ' +
            this.recoveryCode,
            'info'
        );

        const fs =
            document.getElementById(
                'forgot-step2'
            );

        if(fs)
            fs.classList.remove(
                'hidden'
            );
    },

    resetPassword:function(){

        const code =
            document.getElementById(
                'forgot-code'
            ).value;

        const pass =
            document.getElementById(
                'forgot-newpass'
            ).value;

        if(
            code !==
            this.recoveryCode
        ){

            return UI.toast(
                'Código incorrecto',
                'error'
            );
        }

        if(pass.length < 6){

            return UI.toast(
                'Contraseña muy corta',
                'error'
            );
        }

        DB.update(
            'users',
            this.recoveryUser.id,
            {
                password:pass,
                force_change:false,
                first_login:false
            }
        );

        UI.toast(
            'Contraseña actualizada'
        );

        this.showForgot();

        const fp =
            document.getElementById(
                'forgot-panel'
            );

        if(fp)
            fp.classList.add(
                'hidden'
            );
    },

    /*
     * ============================================================
     * EMPRESAS LOGIN
     * ============================================================
     */

    updateLoginSelects:function(){

        const comps =
            DB.getAll(
                'companies'
            );

        const sel =
            document.getElementById(
                'login-company'
            );

        /*
         * El administrador del sistema
         * no necesita empresa.
         */

        if(sel){

            if(comps.length){

                sel.innerHTML =
                    comps.map(
                        c =>
                            `<option value="${c.id}">
                                ${Utils.escape(c.name)}
                            </option>`
                    ).join('');

                this.updateBranches(
                    comps[0].id
                );

            }else{

                sel.innerHTML =
                    '<option value="">Sin empresas</option>';
            }
        }

        const sb =
            document.getElementById(
                'login-branch'
            );

        if(sb){

            sb.onchange =
                e =>
                    this.updateBranches(
                        e.target.value
                    );
        }
    },

    updateBranches:function(cid){

        const brs =
            DB.getAll(
                'branches'
            ).filter(
                b =>
                    b.company_id === cid
            );

        const sel =
            document.getElementById(
                'login-branch'
            );

        if(sel){

            sel.innerHTML =
                brs.length
                    ? brs.map(
                        b =>
                            `<option value="${b.id}">
                                ${Utils.escape(b.name)}
                            </option>`
                    ).join('')
                    :
                    '<option value="">Sin sucursales</option>';
        }
    },

    /*
     * ============================================================
     * LOGIN
     * ============================================================
     */

    login:function(){

        const u =
            document.getElementById(
                'login-user'
            ).value.trim();

        const p =
            document.getElementById(
                'login-pass'
            ).value;

        const cid =
            document.getElementById(
                'login-company'
            )?.value || '';

        const bid =
            document.getElementById(
                'login-branch'
            )?.value || '';

        if(!u || !p){

            return UI.toast(
                'Ingrese usuario y contraseña',
                'error'
            );
        }

        /*
         * Primero buscamos por usuario y contraseña.
         */

        const user =
            DB.getAll('users')
                .find(
                    x =>
                        x.username === u &&
                        x.password === p
                );

        if(!user){

            return UI.toast(
                'Credenciales inválidas',
                'error'
            );
        }

        if(
            user.status &&
            user.status !== 'Activo'
        ){

            return UI.toast(
                'Usuario inactivo',
                'error'
            );
        }

        /*
         * ========================================================
         * ADMINISTRADOR DEL SISTEMA
         * ========================================================
         *
         * NO necesita empresa.
         */

        if(
            this.isSystemAdmin(user)
        ){

            this.currentUser =
                user;

            this.currentCompany =
                cid
                    ? DB.getOne(
                        'companies',
                        cid
                    )
                    : null;

            this.currentBranch =
                bid
                    ? DB.getOne(
                        'branches',
                        bid
                    )
                    : null;

        }

        /*
         * ========================================================
         * USUARIOS NORMALES
         * ========================================================
         */

        else{

            if(!cid){

                return UI.toast(
                    'Seleccione una empresa',
                    'error'
                );
            }

            if(
                user.company_id !== cid
            ){

                return UI.toast(
                    'El usuario no pertenece a esta empresa',
                    'error'
                );
            }

            this.currentUser =
                user;

            this.currentCompany =
                DB.getOne(
                    'companies',
                    cid
                );

            this.currentBranch =
                DB.getOne(
                    'branches',
                    bid
                );
        }

        /*
         * ========================================================
         * SESIÓN
         * ========================================================
         */

        const sd = {

            user:
                this.currentUser,

            company:
                this.currentCompany,

            branch:
                this.currentBranch
        };

        const rem =
            document.getElementById(
                'login-remember'
            );

        if(
            rem &&
            rem.checked
        ){

            localStorage.setItem(
                'integra_session_active',
                JSON.stringify(sd)
            );

        }else{

            sessionStorage.setItem(
                'integra_session_active',
                JSON.stringify(sd)
            );
        }

        /*
         * Mostrar aplicación.
         */

        document.getElementById(
            'login-view'
        ).style.display='none';

        document.getElementById(
            'app'
        ).style.display='flex';

        const ud =
            document.getElementById(
                'user-display'
            );

        if(ud){

            ud.textContent =
                user.name ||
                user.username;
        }

        const cc =
            document.getElementById(
                'current-company'
            );

        if(cc){

            cc.textContent =
                this.currentCompany
                    ? this.currentCompany.name
                    : 'Administrador del Sistema';
        }

        const cb =
            document.getElementById(
                'current-branch'
            );

        if(cb){

            cb.textContent =
                this.currentBranch
                    ? this.currentBranch.name
                    : '';
        }

        App.start();

        UI.toast(
            'Bienvenido, ' +
            (
                user.name ||
                user.username
            )
        );

        /*
         * No forzar el cambio de contraseña al iniciar sesión.
         * La contraseña y la validación normal del acceso no se alteran.
         */
    },

    /*
     * ============================================================
     * CAMBIO OBLIGATORIO DE CONTRASEÑA
     * ============================================================
     */

    forcePasswordChange:function(){

        const current =
            this.currentUser;

        if(!current)return;

        const old =
            prompt(
                'Primer inicio de sesión.\n\n' +
                'Ingrese su contraseña actual:'
            );

        if(
            old !==
            current.password
        ){

            UI.toast(
                'Contraseña actual incorrecta',
                'error'
            );

            return this.forcePasswordChange();
        }

        const newPass =
            prompt(
                'Ingrese su nueva contraseña:'
            );

        if(
            !newPass ||
            newPass.length < 6
        ){

            UI.toast(
                'La nueva contraseña debe tener mínimo 6 caracteres',
                'error'
            );

            return;
        }

        const confirmPass =
            prompt(
                'Confirme su nueva contraseña:'
            );

        if(
            newPass !==
            confirmPass
        ){

            UI.toast(
                'Las contraseñas no coinciden',
                'error'
            );

            return;
        }

        DB.update(
            'users',
            current.id,
            {

                password:newPass,

                force_change:false,

                first_login:false,

                password_changed_at:
                    new Date().toISOString()
            }
        );

        this.currentUser =
            DB.getOne(
                'users',
                current.id
            );

        const sd={

            user:this.currentUser,

            company:this.currentCompany,

            branch:this.currentBranch
        };

        localStorage.setItem(
            'integra_session_active',
            JSON.stringify(sd)
        );

        UI.toast(
            'Contraseña cambiada correctamente',
            'success'
        );
    },

    /*
     * ============================================================
     * CERRAR SESIÓN
     * ============================================================
     */

    logout:function(){

        if(
            UI.confirm(
                '¿Cerrar sesión?'
            )
        ){

            localStorage.removeItem(
                'integra_session_active'
            );

            sessionStorage.removeItem(
                'integra_session_active'
            );

            location.reload();
        }
    },

    /*
     * ============================================================
     * CONFIGURACIÓN
     * ============================================================
     */

    checkConfigAccess:function(){

        if(
            this.isSystemAdmin() ||
            this.isCompanyAdmin()
        ){

            App.navigate(
                'settings'
            );

            return;
        }

        UI.toast(
            'No tiene permiso para Configuración',
            'error'
        );
    },

    /*
     * ============================================================
     * FACTURACIÓN
     * ============================================================
     */

    checkInvoiceAccess:function(){

        if(
            this.isSystemAdmin() ||
            this.isBilling()
        ){

            App.navigate(
                'invoices'
            );

            return;
        }

        UI.toast(
            'Solo Facturadora o Administrador del Sistema puede facturar',
            'error'
        );
    },

    /*
     * ============================================================
     * NAVEGACIÓN
     * ============================================================
     */

    navigateTo:function(view){

        /*
         * Seguridad de navegación.
         */

        const permissions = {

            dashboard:'dashboard',

            clients:'clients',

            quotes:'quotes',

            orders:'orders',

            invoices:'invoices',

            inventory:'inventory',

            purchases:'purchases',

            logistics:'logistics',

            finance:'finance',

            users:'users',

            settings:'config',

            companies:'companies',

            roles:'roles',

            audit:'audit'
        };

        const permission =
            permissions[view];

        if(
            permission &&
            !this.hasPermission(
                permission
            )
        ){

            UI.toast(
                'No tiene permiso para acceder a este módulo',
                'error'
            );

            return;
        }

        /*
         * Cambiar navegación.
         */

        document
            .querySelectorAll(
                '.nav-item'
            )
            .forEach(
                n =>
                    n.classList.remove(
                        'active'
                    )
            );

        const ni =
            document.querySelector(
                `.nav-item[data-view="${view}"]`
            );

        if(ni)
            ni.classList.add(
                'active'
            );

        document
            .querySelectorAll(
                '.view-section'
            )
            .forEach(
                v =>
                    v.classList.add(
                        'hidden'
                    )
            );

        const ve =
            document.getElementById(
                'view-' +
                view
            );

        if(ve)
            ve.classList.remove(
                'hidden'
            );

        /*
         * Renderizadores.
         */

        if(
            view === 'invoices' &&
            Modules.Invoices
        )
            Modules.Invoices.render();

        if(
            view === 'companies' &&
            Modules.Companies
        )
            Modules.Companies.render();

        if(
            view === 'roles' &&
            Modules.Roles
        )
            Modules.Roles.render();

        if(
            view === 'users' &&
            Modules.Users
        )
            Modules.Users.render();

        if(
            view === 'audit' &&
            Modules.Audit
        )
            Modules.Audit.render();
    },

    /*
     * ============================================================
     * PIN
     * ============================================================
     */

    requestPin:function(
        action,
        table,
        id
    ){

        /*
         * Administrador del sistema
         * no necesita PIN.
         */

        if(
            this.isSystemAdmin()
        ){

            if(
                action === 'invoice'
            ){

                return Modules.Invoices
                    .createFromOrder();
            }

            if(
                action === 'delete'
            ){

                return this.executeDelete(
                    table,
                    id
                );
            }
        }

        if(
            action === 'delete' &&
            this.isCompanyAdmin()
        ){
            return this.executeDelete(
                table,
                id
            );
        }

        /*
         * El PIN no sustituye el permiso de rol.
         */
        if(
            action === 'delete'
        ){
            return UI.toast(
                'Solo los administradores autorizados pueden eliminar',
                'error'
            );
        }

        /*
         * Facturación.
         */

        if(
            action === 'invoice' &&
            this.isBilling()
        ){

            return Modules.Invoices
                .createFromOrder();
        }

        /*
         * Asesor no puede facturar.
         */

        if(
            action === 'invoice' &&
            this.isAdvisor()
        ){

            return UI.toast(
                'El Asesor no puede facturar',
                'error'
            );
        }

        this.pendingAction =
            action;

        this.pendingDeleteTable =
            table;

        this.pendingDeleteId =
            id;

        const ap =
            document.getElementById(
                'auth-pin'
            );

        if(ap)
            ap.value='';

        const pm =
            document.getElementById(
                'pin-msg'
            );

        if(pm)
            pm.textContent =
                action === 'invoice'
                    ? 'PIN de Facturación'
                    : 'PIN de Eliminación';

        UI.openModal(
            'modal-pin'
        );
    },

    /*
     * ============================================================
     * VERIFICAR PIN
     * ============================================================
     */

    verifyPin:function(){

        const ap =
            document.getElementById(
                'auth-pin'
            );

        const pin =
            ap
                ? ap.value
                : '';

        let correct =
            DB.data.settings
                ? DB.data.settings.pinFact
                : '1234';

        if(
            this.pendingAction ===
            'delete'
        ){

            correct =
                DB.data.settings
                    ? DB.data.settings.pinDelete
                    : '0000';
        }

        if(
            this.pendingAction ===
            'config'
        ){

            correct =
                DB.data.settings
                    ? DB.data.settings.pinConfig
                    : '0000';
        }

        if(
            pin === correct
        ){

            UI.closeModal(
                'modal-pin'
            );

            if(
                this.pendingAction ===
                'invoice'
            ){

                Modules.Invoices
                    .createFromOrder();
            }

            if(
                this.pendingAction ===
                'delete'
            ){

                this.executeDelete(
                    this.pendingDeleteTable,
                    this.pendingDeleteId
                );
            }

            if(
                this.pendingAction ===
                'config'
            ){

                App.navigate(
                    'settings'
                );
            }

            if(
                this.pendingAction ===
                'invoice_access'
            ){

                this.navigateTo(
                    'invoices'
                );
            }

        }else{

            UI.toast(
                'PIN Incorrecto',
                'error'
            );
        }
    },

    /*
     * ============================================================
     * ELIMINAR
     * ============================================================
     */

    executeDelete:function(
        t,
        id
    ){

        if(!t || !id)return;

        const item =
            DB.getOne(
                t,
                id
            );

        /*
         * El Administrador de Empresa solo puede eliminar
         * registros de su empresa; los demás roles no pueden.
         */
        if(!this.isSystemAdmin()){
            const companyId=this.currentCompany?.id;
            if(
                !this.isCompanyAdmin()||
                !companyId||
                !item||
                item.company_id!==companyId
            ){
                return UI.toast(
                    'No tiene permiso para eliminar este registro',
                    'error'
                );
            }
        }

        /*
         * AUDITORÍA
         */

        if(
            !this.isSystemAdmin()
        ){

            DB.insert(
                'audit',
                {

                    company_id:
                        item?.company_id ||
                        this.currentCompany?.id ||
                        '',

                    action:
                        'DELETE',

                    module:
                        t,

                    record_id:
                        id,

                    user_id:
                        this.currentUser?.id ||
                        '',

                    user_name:
                        this.currentUser?.name ||
                        this.currentUser?.username ||
                        'Usuario',

                    timestamp:
                        new Date().toISOString(),

                    before:
                        item
                            ? JSON.parse(
                                JSON.stringify(item)
                            )
                            : null,

                    after:null,

                    description:
                        'Registro eliminado'
                }
            );
        }

        /*
         * Administrador del sistema
         * puede eliminar sin generar
         * auditoría propia.
         */

        DB.delete(
            t,
            id
        );

        UI.toast(
            'Eliminado'
        );

        /*
         * Refrescar módulos.
         */

        if(
            t === 'clients' &&
            Modules.CRM
        )
            Modules.CRM.render();

        if(
            t === 'products' &&
            Modules.Inventory
        )
            Modules.Inventory.render();

        if(
            t === 'quotes' &&
            Modules.Quotes
        )
            Modules.Quotes.render();

        if(
            t === 'orders' &&
            Modules.Orders
        )
            Modules.Orders.render();

        if(
            t === 'invoices' &&
            Modules.Invoices
        )
            Modules.Invoices.render();

        if(
            t === 'reservations' &&
            Modules.Reservations
        )
            Modules.Reservations.render();
    },

    /*
     * ============================================================
     * VENDEDORES / ASESORES
     * ============================================================
     */

    loadVendors:function(sid){

        const cid =
            this.currentCompany?.id;

        if(!cid)return;

        const us =
            DB.getAll(
                'users',
                cid
            ).filter(
                u =>
                    (
                        u.role === 'Asesor' ||
                        u.role ===
                            'Administrador de Empresa' ||
                        u.role === 'Facturadora'
                    ) &&
                    u.status === 'Activo'
            );

        const s =
            document.getElementById(
                sid
            );

        if(s){

            s.innerHTML =
                us.map(
                    u =>
                        `<option value="${u.id}">
                            ${Utils.escape(
                                u.name ||
                                u.username
                            )}
                        </option>`
                ).join('');
        }
    }
};


const EmailService = {

    send:function(
        to,
        subject,
        body
    ){

        const key =
            DB.data.settings
                .brevoKey;

        const from =
            DB.data.settings
                .emailFrom ||
            'allparumi.ec@hotmail.com';

        if(!key){

            UI.toast(
                'Configure API Key Brevo en Configuración',
                'warning'
            );

            return;
        }

        fetch(
            'https://api.brevo.com/v3/smtp/email',
            {

                method:'POST',

                headers:{
                    'api-key':key,
                    'Content-Type':
                        'application/json'
                },

                body:JSON.stringify({

                    sender:{
                        name:'Integra Suite',
                        email:from
                    },

                    to:[
                        {
                            email:to
                        }
                    ],

                    subject:subject,

                    htmlContent:body
                })
            }
        )
        .then(
            r => {

                if(r.ok)

                    UI.toast(
                        'Correo enviado',
                        'success'
                    );

                else

                    UI.toast(
                        'Error al enviar',
                        'error'
                    );
            }
        )
        .catch(
            e =>
                UI.toast(
                    'Error conexión',
                    'error'
                )
        );
    }
}
const AI={
Gemini:{
send:async function(){const input=document.getElementById('gemini-input');const msg=input.value.trim();if(!msg)return;const chat=document.getElementById('gemini-chat');chat.innerHTML+=`<div class="chat-msg chat-user">${msg}</div>`;input.value='';const key=DB.data.settings.geminiKey;if(!key){chat.innerHTML+=`<div class="chat-msg chat-ai">Configure la API Key de Gemini en Configuración.</div>`;return}try{const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:msg}]}]})});const data=await response.json();const reply=data.candidates?.[0]?.content?.parts?.[0]?.text||'Sin respuesta';chat.innerHTML+=`<div class="chat-msg chat-ai">${reply}</div>`;chat.scrollTop=chat.scrollHeight}catch(e){chat.innerHTML+=`<div class="chat-msg chat-ai">Error: ${e.message}</div>`}}
},
Orven:{
send:async function(){const input=document.getElementById('orven-input');const msg=input.value.trim();if(!msg)return;const chat=document.getElementById('orven-chat');chat.innerHTML+=`<div class="chat-msg chat-user">${msg}</div>`;input.value='';const key=DB.data.settings.orvenKey;if(!key){chat.innerHTML+=`<div class="chat-msg chat-orven">Configure la API Key de ORVEN en Configuración.</div>`;return}try{const response=await fetch('https://api.orven.ai/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'orven-v1',messages:[{role:'user',content:msg}]})});const data=await response.json();const reply=data.choices?.[0]?.message?.content||'Sin respuesta';chat.innerHTML+=`<div class="chat-msg chat-orven">${reply}</div>`;chat.scrollTop=chat.scrollHeight}catch(e){chat.innerHTML+=`<div class="chat-msg chat-orven">Error: ${e.message}</div>`}},
call:function(){UI.toast('Iniciando llamada con ORVEN IA...','info');setTimeout(()=>{UI.toast('ORVEN IA: ¿En qué puedo ayudarte hoy?','info')},1000)}
}
};
const Modules={
CRM:{

    tempImage:null,

    /* ============================================================
       UTILIDADES
    ============================================================ */

    getCurrentUser:function(){

        const a=Auth||{};

        const u=
            a.currentUser ||
            a.user ||
            a.current_user ||
            a.currentEmployee ||
            a.current_employee ||
            null;

        if(!u){
            return {
                id:'',
                name:'Usuario actual'
            };
        }

        const name=
            u.name ||
            u.full_name ||
            u.fullName ||
            u.username ||
            u.email ||
            'Usuario actual';

        return {
            id:u.id||u.user_id||u.employee_id||'',
            name:String(name)
        };
    },

    getActorName:function(){
        return this.getCurrentUser().name;
    },

    getActorId:function(){
        return this.getCurrentUser().id;
    },

    now:function(){
        return new Date().toISOString();
    },

    safe:function(value){

        return Utils.escape(
            value===undefined ||
            value===null
                ?''
                :String(value)
        );
    },

    /* ============================================================
       ASESORES
    ============================================================ */

    getAdvisors:function(){

        const cid=Auth.currentCompany?.id;

        if(!cid)return [];

        const tables=[
            'users',
            'employees',
            'advisors',
            'asesores',
            'salespeople',
            'sales_users'
        ];

        let result=[];

        for(const table of tables){

            try{

                const rows=DB.getAll(table,cid);

                if(Array.isArray(rows) && rows.length){

                    result=rows;

                    if(result.length)break;
                }

            }catch(e){}
        }

        return result.map(u=>{

            const name=
                u.name ||
                u.full_name ||
                u.fullName ||
                (
                    String(u.first_name||'')+
                    ' '+
                    String(u.last_name||'')
                ).trim() ||
                u.username ||
                u.email ||
                'Usuario';

            return {
                id:u.id||u.user_id||u.employee_id||'',
                name:String(name)
            };

        }).filter(u=>u.id||u.name);
    },

    getAdvisorName:function(id,fallback){

        if(!id){
            return fallback||'Sin asignar';
        }

        const advisors=this.getAdvisors();

        const advisor=advisors.find(a=>
            String(a.id)===String(id)
        );

        if(advisor)return advisor.name;

        return fallback||'Asesor asignado';
    },

    prepareAdvisorField:function(selectedId){

        let select=document.getElementById(
            'crm-advisor'
        );

        if(!select){

            const form=document.querySelector(
                '#modal-crm form'
            );

            if(!form)return;

            const group=document.createElement('div');

            group.className='form-group';

            group.id='crm-advisor-group';

            group.innerHTML=`
                <label for="crm-advisor">
                    👨‍💼 Asesor asignado
                </label>

                <select
                    id="crm-advisor"
                    class="form-control">

                    <option value="">
                        Sin asesor asignado
                    </option>

                </select>
            `;

            form.appendChild(group);

            select=document.getElementById(
                'crm-advisor'
            );
        }

        if(!select)return;

        const advisors=this.getAdvisors();

        select.innerHTML=`
            <option value="">
                Sin asesor asignado
            </option>
        `;

        advisors.forEach(a=>{

            const option=document.createElement(
                'option'
            );

            option.value=a.id;

            option.textContent=a.name;

            if(
                selectedId &&
                String(selectedId)===String(a.id)
            ){
                option.selected=true;
            }

            select.appendChild(option);
        });

        if(
            selectedId &&
            !Array.from(select.options)
                .some(o=>
                    String(o.value)===
                    String(selectedId)
                )
        ){

            const option=document.createElement(
                'option'
            );

            option.value=selectedId;

            option.textContent='Asesor asignado';

            option.selected=true;

            select.appendChild(option);
        }
    },

    /* ============================================================
       FILTROS
    ============================================================ */

    prepareFilters:function(){

        const text=document.getElementById(
            'filter-crm-text'
        );

        if(!text)return;

        let container=
            text.closest('.filters') ||
            text.closest('.filter-bar') ||
            text.parentElement?.parentElement ||
            text.parentElement;

        if(!container)return;

        let creator=document.getElementById(
            'filter-crm-creator'
        );

        if(!creator){

            const wrap=document.createElement('div');

            wrap.style.display='inline-block';
            wrap.style.marginLeft='8px';

            wrap.innerHTML=`
                <select
                    id="filter-crm-creator"
                    class="form-control"
                    style="min-width:180px">

                    <option value="">
                        Todos los creadores
                    </option>

                </select>
            `;

            container.appendChild(wrap);

            creator=document.getElementById(
                'filter-crm-creator'
            );
        }

        let advisor=document.getElementById(
            'filter-crm-advisor'
        );

        if(!advisor){

            const wrap=document.createElement('div');

            wrap.style.display='inline-block';
            wrap.style.marginLeft='8px';

            wrap.innerHTML=`
                <select
                    id="filter-crm-advisor"
                    class="form-control"
                    style="min-width:180px">

                    <option value="">
                        Todos los asesores
                    </option>

                </select>
            `;

            container.appendChild(wrap);

            advisor=document.getElementById(
                'filter-crm-advisor'
            );
        }

        const cid=Auth.currentCompany?.id;

        if(!cid)return;

        const clients=DB.getAll(
            'clients',
            cid
        );

        const creators={};

        clients.forEach(c=>{

            const id=
                c.created_by||
                c.created_by_id||
                '';

            const name=
                c.created_by_name||
                c.created_by_user||
                '';

            if(id||name){

                const key=id||name;

                creators[key]={
                    id:id,
                    name:name||id
                };
            }
        });

        if(creator){

            const current=creator.value;

            creator.innerHTML=`
                <option value="">
                    Todos los creadores
                </option>
            `;

            Object.values(creators)
                .sort((a,b)=>
                    a.name.localeCompare(b.name)
                )
                .forEach(c=>{

                    const option=
                        document.createElement('option');

                    option.value=
                        c.id||c.name;

                    option.textContent=
                        c.name;

                    if(
                        current &&
                        String(current)===
                        String(option.value)
                    ){
                        option.selected=true;
                    }

                    creator.appendChild(option);
                });
        }

        if(advisor){

            const current=advisor.value;

            advisor.innerHTML=`
                <option value="">
                    Todos los asesores
                </option>
            `;

            this.getAdvisors()
                .sort((a,b)=>
                    a.name.localeCompare(b.name)
                )
                .forEach(a=>{

                    const option=
                        document.createElement('option');

                    option.value=a.id;

                    option.textContent=a.name;

                    if(
                        current &&
                        String(current)===
                        String(a.id)
                    ){
                        option.selected=true;
                    }

                    advisor.appendChild(option);
                });
        }

        if(!creator.dataset.crmBound){

            creator.addEventListener(
                'change',
                ()=>this.render()
            );

            creator.dataset.crmBound='1';
        }

        if(!advisor.dataset.crmBound){

            advisor.addEventListener(
                'change',
                ()=>this.render()
            );

            advisor.dataset.crmBound='1';
        }
    },

    /* ============================================================
       TABLA
    ============================================================ */

    prepareTable:function(){

        const tbody=document.getElementById(
            'crm-tbody'
        );

        if(!tbody)return;

        const table=tbody.closest('table');

        if(!table)return;

        const thead=table.querySelector('thead');

        if(!thead)return;

        thead.innerHTML=`
            <tr>

                <th></th>

                <th>Cliente</th>

                <th>Tipo</th>

                <th>Documento</th>

                <th>Teléfono</th>

                <th>WhatsApp</th>

                <th>Asesor asignado</th>

                <th>Creado por</th>

                <th>Creado</th>

                <th>Modificado por</th>

                <th>Modificado</th>

                <th>Estado</th>

                <th class="text-right">
                    Acciones
                </th>

            </tr>
        `;
    },

    formatDateTime:function(value){

        if(!value)return '-';

        try{

            const d=new Date(value);

            if(isNaN(d.getTime()))return '-';

            return d.toLocaleString(
                'es-ES',
                {
                    year:'numeric',
                    month:'2-digit',
                    day:'2-digit',
                    hour:'2-digit',
                    minute:'2-digit'
                }
            );

        }catch(e){

            return '-';
        }
    },

    /* ============================================================
       RENDER
    ============================================================ */

    render:function(){

        const cid=Auth.currentCompany?.id;

        if(!cid)return;

        this.prepareFilters();

        this.prepareTable();

        let data=DB.getAll(
            'clients',
            cid
        );

        data.sort((a,b)=>
            new Date(
                b.created_at||
                b.created||
                0
            )-
            new Date(
                a.created_at||
                a.created||
                0
            )
        );

        const txt=(
            document.getElementById(
                'filter-crm-text'
            )?.value||''
        ).toLowerCase();

        const type=
            document.getElementById(
                'filter-crm-type'
            )?.value||'';

        const creatorFilter=
            document.getElementById(
                'filter-crm-creator'
            )?.value||'';

        const advisorFilter=
            document.getElementById(
                'filter-crm-advisor'
            )?.value||'';

        data=data.filter(c=>{

            const text=(
                String(c.name||'')+
                String(c.lastname||'')+
                String(c.doc||'')+
                String(c.phone||'')+
                String(c.company_name||'')
            ).toLowerCase();

            const matchTxt=
                text.includes(txt);

            const matchType=
                type
                    ?c.type_person===type
                    :true;

            const createdBy=
                c.created_by||
                c.created_by_id||
                '';

            const matchCreator=
                creatorFilter
                    ?(
                        String(createdBy)===
                        String(creatorFilter)
                    )
                    :true;

            const advisorId=
                c.advisor_id||
                c.assigned_advisor_id||
                c.advisor||
                '';

            const matchAdvisor=
                advisorFilter
                    ?(
                        String(advisorId)===
                        String(advisorFilter)
                    )
                    :true;

            return(
                matchTxt &&
                matchType &&
                matchCreator &&
                matchAdvisor
            );
        });

        const tbody=document.getElementById(
            'crm-tbody'
        );

        if(!tbody)return;

        tbody.innerHTML=data.map(c=>{

            const advisorName=
                c.advisor_name||
                this.getAdvisorName(
                    c.advisor_id||
                    c.assigned_advisor_id||
                    c.advisor,
                    'Sin asignar'
                );

            const createdBy=
                c.created_by_name||
                c.created_by_user||
                'Registro antiguo';

            const updatedBy=
                c.updated_by_name||
                c.updated_by_user||
                '-';

            const createdAt=
                this.formatDateTime(
                    c.created_at||
                    c.created
                );

            const updatedAt=
                this.formatDateTime(
                    c.updated_at||
                    c.updated
                );

            return`

                <tr>

                    <td>
                        ${
                            c.photo
                            ?`
                                <img
                                    src="${c.photo}"
                                    class="prod-thumb"
                                    alt="Foto">
                            `
                            :''
                        }
                    </td>

                    <td>

                        <strong>
                            ${this.safe(c.name)}
                            ${this.safe(c.lastname)}
                        </strong>

                        ${
                            c.company_name
                            ?`
                                <br>
                                <small>
                                    ${this.safe(
                                        c.company_name
                                    )}
                                </small>
                            `
                            :''
                        }

                    </td>

                    <td>
                        ${this.safe(
                            c.type_person||
                            'Natural'
                        )}
                    </td>

                    <td>
                        ${this.safe(c.doc)}
                    </td>

                    <td>
                        ${this.safe(c.phone)}
                    </td>

                    <td>

                        ${
                            c.whatsapp
                            ?`
                                <span class="badge badge-success">
                                    SI
                                </span>
                            `
                            :`
                                <span class="badge badge-secondary">
                                    NO
                                </span>
                            `
                        }

                    </td>

                    <td>

                        ${
                            advisorName!=='Sin asignar'
                            ?`
                                <span class="badge badge-info">
                                    👨‍💼
                                    ${this.safe(advisorName)}
                                </span>
                            `
                            :`
                                <span class="badge badge-secondary">
                                    Sin asignar
                                </span>
                            `
                        }

                    </td>

                    <td>
                        ${this.safe(createdBy)}
                    </td>

                    <td>
                        <small>
                            ${this.safe(createdAt)}
                        </small>
                    </td>

                    <td>
                        ${this.safe(updatedBy)}
                    </td>

                    <td>
                        <small>
                            ${this.safe(updatedAt)}
                        </small>
                    </td>

                    <td>

                        <span class="badge badge-success">
                            Activo
                        </span>

                    </td>

                    <td class="text-right">

                        <button
                            class="btn btn-outline btn-sm"
                            onclick="
                                Modules.CRM.edit('${c.id}')
                            "
                            title="Editar">
                            ✏️
                        </button>

                        <button
                            class="btn btn-outline btn-sm"
                            onclick="
                                Modules.CRM.showHistory('${c.id}')
                            "
                            title="Historial de versiones">
                            📚
                        </button>

                        <button
                            class="btn btn-outline btn-sm"
                            style="color:var(--danger)"
                            onclick="
                                Modules.CRM.deleteWithAudit('${c.id}')
                            "
                            title="Eliminar">
                            🗑️
                        </button>

                    </td>

                </tr>

            `;

        }).join('')||

        `
            <tr>
                <td
                    colspan="13"
                    class="text-center p-4">
                    Sin registros
                </td>
            </tr>
        `;
    },

    /* ============================================================
       IMAGEN
    ============================================================ */

    handleImage:function(i){

        if(
            i &&
            i.files &&
            i.files[0]
        ){

            Utils.fileToBase64(
                i.files[0]
            ).then(b=>{

                this.tempImage=b;

                const prev=document.getElementById(
                    'crm-photo-preview'
                );

                if(prev){

                    prev.src=b;

                    prev.classList.remove(
                        'hidden'
                    );
                }

                const ph=document.getElementById(
                    'crm-photo-placeholder'
                );

                if(ph){

                    ph.classList.add(
                        'hidden'
                    );
                }
            });
        }
    },

    /* ============================================================
       REFERIDOR
    ============================================================ */

    toggleReferrer:function(){

        const el=document.getElementById(
            'crm-is-referrer'
        );

        const isRef=
            el
            ?el.value
            :'NO';

        const docGroup=document.getElementById(
            'referrer-doc-group'
        );

        if(docGroup){

            docGroup.style.display=
                isRef==='SI'
                    ?'block'
                    :'none';
        }
    },

    /* ============================================================
       ABRIR MODAL
    ============================================================ */

    openModal:function(id){

        const form=document.querySelector(
            '#modal-crm form'
        );

        if(form)form.reset();

        const ci=document.getElementById(
            'crm-id'
        );

        if(ci)ci.value='';

        this.tempImage=null;

        const prev=document.getElementById(
            'crm-photo-preview'
        );

        if(prev){

            prev.classList.add('hidden');

            prev.removeAttribute('src');
        }

        const ph=document.getElementById(
            'crm-photo-placeholder'
        );

        if(ph){
            ph.classList.remove('hidden');
        }

        if(!id){

            const mt=document.getElementById(
                'crm-modal-title'
            );

            if(mt){
                mt.textContent='Nuevo Cliente';
            }

            const actor=
                this.getCurrentUser();

            this.prepareAdvisorField(
                actor.id||''
            );

            const refGroup=
                document.getElementById(
                    'referrer-doc-group'
                );

            if(refGroup){
                refGroup.style.display='none';
            }

        }else{

            const c=DB.getOne(
                'clients',
                id
            );

            if(!c){

                return UI.toast(
                    'Cliente no encontrado',
                    'error'
                );
            }

            const mt=document.getElementById(
                'crm-modal-title'
            );

            if(mt){
                mt.textContent='Editar Cliente';
            }

            if(ci){
                ci.value=c.id;
            }

            const setVal=(iid,val)=>{

                const el=document.getElementById(
                    iid
                );

                if(el){

                    el.value=
                        val===undefined||
                        val===null
                            ?''
                            :val;
                }
            };

            setVal('crm-type-person',c.type_person);
            setVal('crm-giro',c.giro);
            setVal('crm-type',c.type);
            setVal('crm-doc',c.doc);
            setVal('crm-name',c.name);
            setVal('crm-lastname',c.lastname);
            setVal('crm-company',c.company_name);
            setVal('crm-phone',c.phone);
            setVal('crm-email',c.email);
            setVal('crm-whatsapp',c.whatsapp);
            setVal('crm-address',c.address);
            setVal('crm-dob',c.dob);
            setVal(
                'crm-is-referrer',
                c.is_referrer||'NO'
            );
            setVal(
                'crm-referrer-doc',
                c.referrer_doc||''
            );

            const refGroup=
                document.getElementById(
                    'referrer-doc-group'
                );

            if(refGroup){

                refGroup.style.display=
                    c.is_referrer==='SI'
                        ?'block'
                        :'none';
            }

            if(c.photo){

                this.tempImage=c.photo;

                if(prev){

                    prev.src=c.photo;

                    prev.classList.remove(
                        'hidden'
                    );
                }

                if(ph){
                    ph.classList.add('hidden');
                }
            }

            this.prepareAdvisorField(
                c.advisor_id||
                c.assigned_advisor_id||
                c.advisor||
                ''
            );
        }

        this.toggleReferrer();

        UI.openModal(
            'modal-crm'
        );
    },

    edit:function(id){
        this.openModal(id);
    },

    /* ============================================================
       CREAR SNAPSHOT
       Guarda exactamente cómo estaba el cliente
    ============================================================ */

    makeSnapshot:function(c){

        if(!c)return {};

        return {
            type_person:c.type_person||'',
            giro:c.giro||'',
            type:c.type||'',
            doc:c.doc||'',
            name:c.name||'',
            lastname:c.lastname||'',
            company_name:c.company_name||'',
            phone:c.phone||'',
            email:c.email||'',
            whatsapp:c.whatsapp||'',
            address:c.address||'',
            dob:c.dob||'',
            is_referrer:c.is_referrer||'',
            referrer_doc:c.referrer_doc||'',
            photo:c.photo||'',

            advisor_id:c.advisor_id||'',
            advisor_name:c.advisor_name||'',

            company_id:c.company_id||''
        };
    },

    /* ============================================================
       COMPARAR ANTES / DESPUÉS
    ============================================================ */

    compareSnapshots:function(before,after){

        const labels={
            type_person:'Tipo de persona',
            giro:'Giro',
            type:'Tipo',
            doc:'Documento',
            name:'Nombre',
            lastname:'Apellido',
            company_name:'Empresa',
            phone:'Teléfono',
            email:'Correo',
            whatsapp:'WhatsApp',
            address:'Dirección',
            dob:'Fecha de nacimiento',
            is_referrer:'Es referidor',
            referrer_doc:'Documento del referidor',
            advisor_name:'Asesor',
            photo:'Fotografía'
        };

        const fields=Object.keys(labels);

        return fields.filter(field=>{

            const a=before?.[field]??'';
            const b=after?.[field]??'';

            return String(a)!==String(b);

        }).map(field=>{

            return {
                field:field,
                label:labels[field],
                before:before?.[field]??'',
                after:after?.[field]??''
            };

        });
    },

    /* ============================================================
       GUARDAR HISTORIAL
    ============================================================ */

    saveHistory:function(client,oldData,newData,action){

        try{

            const actor=
                this.getCurrentUser();

            const cid=
                Auth.currentCompany?.id;

            if(!cid || !client)return;

            let history=[];

            /*
             * Si el cliente ya tiene historial,
             * lo conservamos.
             */
            if(Array.isArray(client.history)){
                history=[...client.history];
            }

            const before=
                this.makeSnapshot(oldData);

            const after=
                this.makeSnapshot(newData);

            const changes=
                this.compareSnapshots(
                    before,
                    after
                );

            /*
             * No crear versión si realmente
             * no cambió nada.
             */
            if(
                action==='update' &&
                changes.length===0
            ){
                return;
            }

            const version=
                history.length+1;

            history.push({

                id:
                    'CRM-H-'+
                    Date.now()+
                    '-'+
                    Math.random()
                        .toString(36)
                        .slice(2),

                version:version,

                client_id:client.id,

                company_id:cid,

                action:
                    action||'update',

                user_id:
                    actor.id||'',

                user_name:
                    actor.name||'Usuario',

                date:
                    this.now(),

                before:before,

                after:after,

                changes:changes
            });

            /*
             * Guardamos todo el historial
             * dentro del cliente.
             */
            DB.update(
                'clients',
                client.id,
                {
                    history:history
                }
            );

        }catch(e){

            console.error(
                'Error guardando historial CRM:',
                e
            );
        }
    },

    /* ============================================================
       GUARDAR CLIENTE
    ============================================================ */

    save:function(){

        const ci=document.getElementById(
            'crm-id'
        );

        const id=ci
            ?ci.value
            :'';

        const getVal=(iid)=>{

            const el=document.getElementById(
                iid
            );

            return el
                ?el.value
                :'';
        };

        const d={

            type_person:getVal(
                'crm-type-person'
            ),

            giro:getVal(
                'crm-giro'
            ),

            type:getVal(
                'crm-type'
            ),

            doc:getVal(
                'crm-doc'
            ),

            name:getVal(
                'crm-name'
            ),

            lastname:getVal(
                'crm-lastname'
            ),

            company_name:getVal(
                'crm-company'
            ),

            phone:getVal(
                'crm-phone'
            ),

            email:getVal(
                'crm-email'
            ),

            whatsapp:getVal(
                'crm-whatsapp'
            ),

            address:getVal(
                'crm-address'
            ),

            dob:getVal(
                'crm-dob'
            ),

            is_referrer:getVal(
                'crm-is-referrer'
            ),

            referrer_doc:getVal(
                'crm-referrer-doc'
            ),

            photo:this.tempImage,

            company_id:
                Auth.currentCompany.id
        };

        if(
            !d.doc||
            !d.name||
            !d.phone
        ){

            return UI.toast(
                'Complete campos obligatorios',
                'error'
            );
        }

        /* ========================================================
           ASESOR
        ======================================================== */

        const advisorId=
            getVal('crm-advisor');

        d.advisor_id=
            advisorId||'';

        d.advisor_name=
            advisorId
                ?this.getAdvisorName(
                    advisorId,
                    ''
                )
                :'';

        /* ========================================================
           USUARIO ACTUAL
        ======================================================== */

        const actor=
            this.getCurrentUser();

        const now=
            this.now();

        /* ========================================================
           NUEVO CLIENTE
        ======================================================== */

        if(!id){

            d.created_by=
                actor.id||actor.name;

            d.created_by_name=
                actor.name;

            d.created_by_user=
                actor.name;

            d.created_at=
                now;

            d.updated_by=
                actor.id||actor.name;

            d.updated_by_name=
                actor.name;

            d.updated_by_user=
                actor.name;

            d.updated_at=
                now;

            d.deleted_by='';
            d.deleted_by_name='';
            d.deleted_at='';

            /*
             * Primera versión.
             */
            d.history=[{

                id:
                    'CRM-H-'+
                    Date.now()+
                    '-'+
                    Math.random()
                        .toString(36)
                        .slice(2),

                version:1,

                client_id:'',

                company_id:
                    Auth.currentCompany.id,

                action:'create',

                user_id:
                    actor.id||'',

                user_name:
                    actor.name,

                date:now,

                before:{},

                after:
                    this.makeSnapshot(d),

                changes:[]
            }];

            DB.insert(
                'clients',
                d
            );

            UI.closeModal(
                'modal-crm'
            );

            UI.toast(
                'Cliente creado correctamente',
                'success'
            );

        }

        /* ========================================================
           ACTUALIZAR CLIENTE
        ======================================================== */

        else{

            const old=
                DB.getOne(
                    'clients',
                    id
                );

            if(!old){

                return UI.toast(
                    'Cliente no encontrado',
                    'error'
                );
            }

            /*
             * Conservar información original.
             */
            d.created_by=
                old.created_by||
                old.created_by_id||
                '';

            d.created_by_name=
                old.created_by_name||
                old.created_by_user||
                '';

            d.created_at=
                old.created_at||
                old.created||
                now;

            /*
             * Auditoría de modificación.
             */
            d.updated_by=
                actor.id||
                actor.name;

            d.updated_by_name=
                actor.name;

            d.updated_by_user=
                actor.name;

            d.updated_at=
                now;

            /*
             * Conservar eliminación.
             */
            d.deleted_by=
                old.deleted_by||
                '';

            d.deleted_by_name=
                old.deleted_by_name||
                '';

            d.deleted_at=
                old.deleted_at||
                '';

            /*
             * Generar historial ANTES de actualizar.
             */
            const before=
                this.makeSnapshot(old);

            const after=
                this.makeSnapshot(d);

            const changes=
                this.compareSnapshots(
                    before,
                    after
                );

            if(changes.length===0){

                return UI.toast(
                    'No se detectaron cambios',
                    'warning'
                );
            }

            /*
             * Recuperar historial existente.
             */
            const history=
                Array.isArray(old.history)
                    ?[...old.history]
                    :[];

            const version=
                history.length+1;

            history.push({

                id:
                    'CRM-H-'+
                    Date.now()+
                    '-'+
                    Math.random()
                        .toString(36)
                        .slice(2),

                version:version,

                client_id:id,

                company_id:
                    Auth.currentCompany.id,

                action:'update',

                user_id:
                    actor.id||'',

                user_name:
                    actor.name,

                date:now,

                before:before,

                after:after,

                changes:changes
            });

            d.history=history;

            DB.update(
                'clients',
                id,
                d
            );

            UI.closeModal(
                'modal-crm'
            );

            UI.toast(
                `Cliente actualizado. Versión ${version}`,
                'success'
            );
        }

        this.render();
    },

    /* ============================================================
       HISTORIAL
    ============================================================ */

    showHistory:function(id){

        const c=DB.getOne(
            'clients',
            id
        );

        if(!c){

            return UI.toast(
                'Cliente no encontrado',
                'error'
            );
        }

        const history=
            Array.isArray(c.history)
                ?[...c.history].reverse()
                :[];

        const advisor=
            c.advisor_name||
            this.getAdvisorName(
                c.advisor_id||
                c.assigned_advisor_id||
                '',
                'Sin asignar'
            );

        let html=`

            <div style="padding:20px">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:15px;
                    margin-bottom:20px;
                ">

                    <div>

                        <h2 style="margin:0">
                            📚 Historial del cliente
                        </h2>

                        <div style="
                            margin-top:5px;
                            color:var(--muted,#777);
                        ">
                            ${this.safe(
                                c.name+' '+
                                (c.lastname||'')
                            )}
                        </div>

                    </div>

                    <span class="badge badge-info">
                        ${history.length}
                        versiones
                    </span>

                </div>

                <div style="
                    display:grid;
                    grid-template-columns:
                    repeat(auto-fit,minmax(200px,1fr));
                    gap:10px;
                    margin-bottom:25px;
                ">

                    <div class="card p-3">
                        <strong>Creado por</strong>
                        <br>
                        ${this.safe(
                            c.created_by_name||
                            c.created_by||
                            '-'
                        )}
                        <br>
                        <small>
                            ${this.safe(
                                this.formatDateTime(
                                    c.created_at
                                )
                            )}
                        </small>
                    </div>

                    <div class="card p-3">
                        <strong>Última modificación</strong>
                        <br>
                        ${this.safe(
                            c.updated_by_name||
                            c.updated_by||
                            '-'
                        )}
                        <br>
                        <small>
                            ${this.safe(
                                this.formatDateTime(
                                    c.updated_at
                                )
                            )}
                        </small>
                    </div>

                    <div class="card p-3">
                        <strong>Asesor actual</strong>
                        <br>
                        👨‍💼
                        ${this.safe(advisor)}
                    </div>

                    <div class="card p-3">
                        <strong>Eliminado por</strong>
                        <br>
                        ${this.safe(
                            c.deleted_by_name||
                            c.deleted_by||
                            'No eliminado'
                        )}
                        ${
                            c.deleted_at
                            ?`
                                <br>
                                <small>
                                    ${this.safe(
                                        this.formatDateTime(
                                            c.deleted_at
                                        )
                                    )}
                                </small>
                            `
                            :''
                        }
                    </div>

                </div>

        `;

        if(!history.length){

            html+=`

                <div style="
                    padding:30px;
                    text-align:center;
                    background:#f5f5f5;
                    border-radius:10px;
                ">
                    📭 No existe historial
                    de modificaciones.
                </div>

            `;

        }else{

            html+=`

                <div style="
                    display:flex;
                    flex-direction:column;
                    gap:15px;
                ">

            `;

            history.forEach(h=>{

                const action=
                    h.action==='create'
                        ?'Creación'
                        :h.action==='delete'
                            ?'Eliminación'
                            :'Modificación';

                const color=
                    h.action==='create'
                        ?'#198754'
                        :h.action==='delete'
                            ?'#dc3545'
                            :'#0d6efd';

                html+=`

                    <div style="
                        border:1px solid #ddd;
                        border-left:5px solid ${color};
                        border-radius:8px;
                        overflow:hidden;
                        background:#fff;
                    ">

                        <div style="
                            padding:15px;
                            background:#f8f9fa;
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            flex-wrap:wrap;
                            gap:10px;
                        ">

                            <div>

                                <strong>
                                    Versión ${this.safe(
                                        h.version
                                    )}
                                </strong>

                                <span
                                    class="badge"
                                    style="
                                        background:${color};
                                        color:#fff;
                                        margin-left:8px;
                                    ">
                                    ${action}
                                </span>

                            </div>

                            <div style="
                                font-size:13px;
                            ">

                                👤
                                <strong>
                                    ${this.safe(
                                        h.user_name||
                                        'Usuario'
                                    )}
                                </strong>

                                &nbsp;·&nbsp;

                                🕐
                                ${this.safe(
                                    this.formatDateTime(
                                        h.date
                                    )
                                )}

                            </div>

                        </div>

                        <div style="
                            padding:15px;
                        ">

                `;

                if(
                    h.action==='create'
                ){

                    html+=`

                        <div class="badge badge-success">
                            Cliente creado.
                        </div>

                    `;

                }else if(
                    h.action==='delete'
                ){

                    html+=`

                        <div class="badge badge-danger">
                            Cliente eliminado.
                        </div>

                    `;

                }else{

                    const changes=
                        Array.isArray(h.changes)
                            ?h.changes
                            :[];

                    if(!changes.length){

                        html+=`
                            <div>
                                Sin cambios registrados.
                            </div>
                        `;

                    }else{

                        html+=`

                            <div style="
                                overflow-x:auto;
                            ">

                                <table style="
                                    width:100%;
                                    border-collapse:collapse;
                                ">

                                    <thead>

                                        <tr>

                                            <th style="
                                                text-align:left;
                                                padding:8px;
                                                border-bottom:1px solid #ddd;
                                            ">
                                                Campo
                                            </th>

                                            <th style="
                                                text-align:left;
                                                padding:8px;
                                                border-bottom:1px solid #ddd;
                                                color:#b02a37;
                                            ">
                                                Antes
                                            </th>

                                            <th style="
                                                text-align:left;
                                                padding:8px;
                                                border-bottom:1px solid #ddd;
                                                color:#198754;
                                            ">
                                                Después
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody>

                        `;

                        changes.forEach(ch=>{

                            let before=
                                ch.before;

                            let after=
                                ch.after;

                            /*
                             * Para fotos no mostramos
                             * el Base64 completo.
                             */
                            if(
                                ch.field==='photo'
                            ){

                                before=
                                    before
                                    ?'📷 Fotografía anterior'
                                    :'Sin fotografía';

                                after=
                                    after
                                    ?'📷 Fotografía nueva'
                                    :'Sin fotografía';
                            }

                            html+=`

                                <tr>

                                    <td style="
                                        padding:8px;
                                        border-bottom:1px solid #eee;
                                        font-weight:bold;
                                    ">
                                        ${this.safe(
                                            ch.label
                                        )}
                                    </td>

                                    <td style="
                                        padding:8px;
                                        border-bottom:1px solid #eee;
                                        color:#b02a37;
                                    ">
                                        ${this.safe(
                                            before||'—'
                                        )}
                                    </td>

                                    <td style="
                                        padding:8px;
                                        border-bottom:1px solid #eee;
                                        color:#198754;
                                    ">
                                        ${this.safe(
                                            after||'—'
                                        )}
                                    </td>

                                </tr>

                            `;
                        });

                        html+=`

                                    </tbody>

                                </table>

                            </div>

                        `;
                    }
                }

                html+=`

                        </div>

                    </div>

                `;

            });

            html+=`

                </div>

            `;
        }

        html+=`

            </div>
        `;

        /*
         * Modal existente.
         */
        let modal=document.getElementById(
            'modal-crm-history'
        );

        /*
         * Crear modal automáticamente.
         */
        if(!modal){

            modal=document.createElement(
                'div'
            );

            modal.id=
                'modal-crm-history';

            modal.className=
                'modal';

            modal.innerHTML=`

                <div
                    class="modal-content"
                    style="
                        max-width:1100px;
                        width:95%;
                        max-height:90vh;
                        overflow:auto;
                    ">

                    <div class="modal-header">

                        <h3>
                            📚 Historial CRM
                        </h3>

                        <button
                            type="button"
                            class="btn btn-outline btn-sm"
                            onclick="
                                document
                                .getElementById(
                                    'modal-crm-history'
                                )
                                ?.remove();
                            ">
                            ✕
                        </button>

                    </div>

                    <div
                        class="modal-body">
                    </div>

                </div>
            `;

            document.body.appendChild(
                modal
            );
        }

        const body=
            modal.querySelector(
                '.modal-body'
            );

        if(body){
            body.innerHTML=html;
        }

        UI.openModal(
            'modal-crm-history'
        );
    },

    /* ============================================================
       ELIMINACIÓN CON AUDITORÍA
    ============================================================ */

    deleteWithAudit:function(id){

        const c=DB.getOne(
            'clients',
            id
        );

        if(!c){

            return UI.toast(
                'Cliente no encontrado',
                'error'
            );
        }

        const actor=
            this.getCurrentUser();

        const now=
            this.now();

        /*
         * IMPORTANTE:
         *
         * No marcamos deleted_by todavía.
         *
         * El PIN debe aprobarse primero.
         *
         * Dejamos preparada una función global
         * para que Auth pueda llamarla cuando
         * el PIN sea correcto.
         */

        window.__crmPendingDelete={
            id:id,
            actor:actor,
            date:now
        };

        /*
         * Usamos el sistema existente.
         */
        Auth.requestPin(
            'delete',
            'clients',
            id
        );

        /*
         * Intentamos detectar si el sistema
         * eliminó inmediatamente.
         */
        setTimeout(()=>{

            try{

                const after=
                    DB.getOne(
                        'clients',
                        id
                    );

                /*
                 * Si todavía existe y el sistema
                 * permite marcarlo después,
                 * no hacemos nada aquí.
                 *
                 * Esto evita registrar falsos
                 * eliminados.
                 */

                if(after){

                    this.render();
                }

            }catch(e){}

        },300);
    },

    /* ============================================================
       REGISTRAR ELIMINACIÓN
       Puede ser llamado desde Auth después del PIN.
    ============================================================ */

    registerDeleteAudit:function(id){

        try{

            const c=
                DB.getOne(
                    'clients',
                    id
                );

            const pending=
                window.__crmPendingDelete;

            const actor=
                pending?.actor||
                this.getCurrentUser();

            const now=
                this.now();

            if(c){

                const history=
                    Array.isArray(c.history)
                        ?[...c.history]
                        :[];

                history.push({

                    id:
                        'CRM-H-'+
                        Date.now(),

                    version:
                        history.length+1,

                    client_id:id,

                    company_id:
                        Auth.currentCompany?.id,

                    action:'delete',

                    user_id:
                        actor.id||'',

                    user_name:
                        actor.name||'Usuario',

                    date:now,

                    before:
                        this.makeSnapshot(c),

                    after:{},

                    changes:[]
                });

                DB.update(
                    'clients',
                    id,
                    {
                        deleted_by:
                            actor.id||
                            actor.name,

                        deleted_by_name:
                            actor.name,

                        deleted_at:
                            now,

                        history:history
                    }
                );
            }

            window.__crmPendingDelete=null;

            this.render();

        }catch(e){

            console.error(
                'Error registrando eliminación CRM:',
                e
            );
        }
    },

    /* ============================================================
       AUDITORÍA GENERAL
    ============================================================ */

    showAudit:function(id){

        this.showHistory(id);
    }
},

Tracking:{render:function(){const cid=Auth.currentCompany?.id;if(!cid)return;let data=DB.getAll('tracking',cid).sort((a,b)=>new Date(b.date)-new Date(a.date));const s=(document.getElementById('filter-track-search')?.value||'').toLowerCase();const st=document.getElementById('filter-track-status')?.value||'';const us=document.getElementById('filter-track-user')?.value||'';data=data.filter(t=>{const c=DB.getOne('clients',t.client_id);const txt=`${c?.name||''} ${c?.lastname||''} ${c?.doc||''} ${c?.phone||''}`.toLowerCase();return(!s||txt.includes(s))&&(!st||t.status===st)&&(!us||t.user_id===us)});const tbody=document.getElementById('tracking-tbody');if(tbody)tbody.innerHTML=data.map(t=>{const c=DB.getOne('clients',t.client_id);const bc=t.status==='Completado'?'badge-success':t.status==='Pendiente'?'badge-warning':'badge-info';return `<tr><td>${Utils.formatDateTime(t.date)}</td><td><strong>${c?c.name+' '+c.lastname:'N/A'}</strong></td><td>${c?c.phone:''}</td><td><span class="badge badge-bp">${t.type}</span></td><td>${Utils.escape(t.description)}</td><td>${t.user_name||'Sistema'}</td><td><span class="badge ${bc}">${t.status}</span></td><td class="text-right"><button class="btn btn-outline btn-sm" onclick="Modules.Tracking.edit('${t.id}')">✏️</button> <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="Auth.requestPin('delete','tracking','${t.id}')">🗑️</button></td></tr>`}).join('')||'<tr><td colspan="8" class="text-center p-4">Sin actividades</td></tr>';const sel=document.getElementById('filter-track-user');if(sel&&sel.options.length<=1){DB.getAll('users',cid).forEach(u=>{const o=document.createElement('option');o.value=u.id;o.textContent=u.name||u.username;sel.appendChild(o)})}},
openModal:function(id){const form=document.querySelector('#modal-tracking form');if(form)form.reset();const ti=document.getElementById('track-id');if(ti)ti.value='';const sc=document.getElementById('track-selected-client');if(sc)sc.textContent='';const tci=document.getElementById('track-client-id');if(tci)tci.value='';const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());const td=document.getElementById('track-date');if(td)td.value=now.toISOString().slice(0,16);Auth.loadVendors('track-user');if(id){const t=DB.getOne('tracking',id);const c=DB.getOne('clients',t.client_id);const mt=document.getElementById('track-modal-title');if(mt)mt.textContent='Editar Actividad';if(ti)ti.value=t.id;if(tci)tci.value=t.client_id;if(sc)sc.textContent=c?`${c.name} ${c.lastname} (${c.doc})`:'';const tt=document.getElementById('track-type');if(tt)tt.value=t.type;if(td)td.value=t.date.slice(0,16);const tds=document.getElementById('track-desc');if(tds)tds.value=t.description;const tu=document.getElementById('track-user');if(tu)tu.value=t.user_id;const ts=document.getElementById('track-status');if(ts)ts.value=t.status}else{const mt=document.getElementById('track-modal-title');if(mt)mt.textContent='Nueva Actividad'}UI.openModal('modal-tracking')},
edit:function(id){this.openModal(id)},
searchClient:function(){const term=(document.getElementById('track-client-search')?.value||'').toLowerCase();if(term.length<2)return UI.toast('Escriba al menos 2 caracteres','error');const cid=Auth.currentCompany?.id;const found=DB.getAll('clients',cid).find(c=>((c.name||'')+(c.lastname||'')).toLowerCase().includes(term)||(c.doc||'').includes(term)||(c.phone||'').includes(term));if(found){const tci=document.getElementById('track-client-id');if(tci)tci.value=found.id;const sc=document.getElementById('track-selected-client');if(sc)sc.textContent=`${found.name} ${found.lastname} | ${found.doc} | ${found.phone}`;UI.toast('Cliente seleccionado')}else UI.toast('Cliente no encontrado','error')},
save:function(){const tci=document.getElementById('track-client-id');const clientId=tci?tci.value:'';if(!clientId)return UI.toast('Seleccione un cliente','error');const tds=document.getElementById('track-desc');const desc=tds?tds.value:'';if(!desc)return UI.toast('Descripción obligatoria','error');const ti=document.getElementById('track-id');const id=ti?ti.value:'';const tu=document.getElementById('track-user');const userId=tu?tu.value:'';const userObj=DB.getOne('users',userId);const d={company_id:Auth.currentCompany.id,client_id:clientId,type:(document.getElementById('track-type')?.value||''),date:(document.getElementById('track-date')?.value||''),description:desc,user_id:userId,user_name:userObj?(userObj.name||userObj.username):'Desconocido',status:(document.getElementById('track-status')?.value||'')};if(id)DB.update('tracking',id,d);else DB.insert('tracking',d);UI.closeModal('modal-tracking');UI.toast('Actividad guardada');this.render()}},
StockCheck:{
    render:function(){
        const cid=Auth.currentCompany?.id;
        if(!cid)return;

        const term=(document.getElementById('stock-check-search')?.value||'').toLowerCase();
        let d=DB.getAll('products',cid);

        if(term)d=d.filter(p=>
            ((p.name||'')+(p.code||'')+(p.category||'')).toLowerCase().includes(term)
        );

        const whs=DB.getAll('warehouses',cid);
        let okCount=0,lowCount=0,zeroCount=0;

        d.forEach(p=>{
            // BP no se considera sin stock
            if(p.type==='BP'){
                okCount++;
                return;
            }

            const av=(Number(p.stock)||0)-(p.reserved||0);

            if(av<=0)zeroCount++;
            else if(av<(p.min_stock||5))lowCount++;
            else okCount++;
        });

        const scs=document.getElementById('stock-check-summary');

        if(scs)scs.innerHTML=`
            <div class="stock-card stock-ok">
                <h2 style="font-size:2rem;color:var(--success)">${okCount}</h2>
                <p>Stock OK</p>
            </div>
            <div class="stock-card stock-low">
                <h2 style="font-size:2rem;color:var(--danger)">${lowCount}</h2>
                <p>Stock Bajo</p>
            </div>
            <div class="stock-card stock-zero">
                <h2 style="font-size:2rem;color:var(--text-muted)">${zeroCount}</h2>
                <p>Sin Stock</p>
            </div>
        `;

        const sct=document.getElementById('stock-check-tbody');

        if(sct)sct.innerHTML=d.map(p=>{

            const isBP=p.type==='BP';

            const av=isBP
                ? 'BP'
                : (Number(p.stock)||0)-(p.reserved||0);

            const wh=whs.find(w=>w.id===p.warehouse_id);

            let badge='<span class="badge badge-success">Disponible</span>';

            if(isBP){
                badge='<span class="badge badge-bp">BP</span>';
            }else if(av<=0){
                badge='<span class="badge badge-danger">Sin Stock</span>';
            }else if(av<(p.min_stock||5)){
                badge='<span class="badge badge-warning">Stock Bajo</span>';
            }

            return `
                <tr>
                    <td>${p.image?`<img src="${p.image}" class="prod-thumb">`:''}</td>
                    <td>${Utils.escape(p.code)}</td>
                    <td><strong>${Utils.escape(p.name)}</strong></td>
                    <td>${Utils.escape(p.category||'')}</td>
                    <td>${wh?wh.name:'General'}</td>
                    <td>${isBP?'BP':p.stock}</td>
                    <td>${isBP?'—':(p.reserved||0)}</td>
                    <td class="font-bold">${av}</td>
                    <td>${badge}</td>
                </tr>
            `;
        }).join('')||'<tr><td colspan="9" class="text-center p-4">Sin productos</td></tr>';
    }
},

Inventory:{
    tempImage:null,

    render:function(){
        const cid=Auth.currentCompany?.id;
        if(!cid)return;

        let data=DB.getAll('products',cid);

        const txt=(document.getElementById('filter-inv-prod-text')?.value||'').toLowerCase();
        const sf=document.getElementById('filter-inv-prod-stock')?.value||'';

        data=data.filter(p=>{

            const matchTxt=(p.name+p.code+p.category).toLowerCase().includes(txt);

            let matchStock=true;

            // BP se considera disponible
            if(sf==='low'){
                matchStock=p.type==='BP'
                    ?false
                    :(Number(p.stock)||0)-(p.reserved||0)<(p.min_stock||5);
            }

            if(sf==='ok'){
                matchStock=p.type==='BP'
                    ?true
                    :(Number(p.stock)||0)-(p.reserved||0)>=(p.min_stock||5);
            }

            return matchTxt&&matchStock;
        });

        const tbody=document.getElementById('inv-tbody');

        if(tbody)tbody.innerHTML=data.map(p=>{

            const isBP=p.type==='BP';

            const avail=isBP
                ?'BP'
                :(Number(p.stock)||0)-(p.reserved||0);

            const badge=isBP
                ?'<span class="badge badge-bp">BP</span>'
                :'<span class="badge badge-success">Normal</span>';

            return `
                <tr>
                    <td>${p.image?`<img src="${p.image}" class="prod-thumb">`:''}</td>
                    <td>${Utils.escape(p.code)}</td>
                    <td><strong>${Utils.escape(p.name)}</strong></td>
                    <td>${badge}</td>
                    <td>${isBP?'BP':p.stock}</td>
                    <td>
                        <span class="${!isBP&&avail<(p.min_stock||5)?'text-danger font-bold':''}">
                            ${avail}
                        </span>
                    </td>
                    <td>${Utils.formatMoney(p.price1)}</td>
                    <td class="text-right">
                        <button class="btn btn-outline btn-sm" onclick="Modules.Inventory.edit('${p.id}')">✏️</button>
                        <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="Auth.requestPin('delete','products','${p.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('')||'<tr><td colspan="8" class="text-center p-4">Sin productos</td></tr>';
    },

    handleImage:function(i){
        if(i.files[0])Utils.fileToBase64(i.files[0]).then(b=>{
            this.tempImage=b;

            const prev=document.getElementById('inv-image-preview');

            if(prev){
                prev.src=b;
                prev.classList.remove('hidden');
            }

            const ph=document.getElementById('inv-image-placeholder');

            if(ph)ph.classList.add('hidden');
        });
    },

    openModal:function(id){

        const form=document.querySelector('#modal-inv form');

        if(form)form.reset();

        const ii=document.getElementById('inv-id');

        if(ii)ii.value='';

        this.tempImage=null;

        const prev=document.getElementById('inv-image-preview');

        if(prev)prev.classList.add('hidden');

        const ph=document.getElementById('inv-image-placeholder');

        if(ph)ph.classList.remove('hidden');

        const whs=DB.getAll('warehouses');

        const ws=document.getElementById('inv-warehouse');

        if(ws)ws.innerHTML=whs.map(w=>
            `<option value="${w.id}">${w.name}</option>`
        ).join('');

        if(id){

            const p=DB.getOne('products',id);

            const mt=document.getElementById('inv-modal-title');

            if(mt)mt.textContent='Editar Producto';

            if(ii)ii.value=p.id;

            const setVal=(iid,val)=>{
                const el=document.getElementById(iid);
                if(el)el.value=val;
            };

            setVal('inv-code',p.code);
            setVal('inv-name',p.name);
            setVal('inv-cat',p.category);
            setVal('inv-brand',p.brand);
            setVal('inv-model',p.model);
            setVal('inv-unit',p.unit);
            setVal('inv-type',p.type);
            setVal('inv-cost',p.cost);
            setVal('inv-price1',p.price1);
            setVal('inv-price2',p.price2);

            // Si es BP, mostrar BP directamente
            setVal('inv-stock',p.type==='BP'?'BP':p.stock);

            setVal('inv-min',p.min_stock);
            setVal('inv-warehouse',p.warehouse_id);
            setVal('inv-provider',p.provider);
            setVal('inv-warranty',p.warranty);
            setVal('inv-desc',p.description);

            // IVA: conservar el IVA del producto
            setVal('inv-iva',(p.iva===undefined||p.iva===null)?15:p.iva);

            if(p.image){
                this.tempImage=p.image;

                if(prev){
                    prev.src=p.image;
                    prev.classList.remove('hidden');
                }

                if(ph)ph.classList.add('hidden');
            }

        }else{

            const mt=document.getElementById('inv-modal-title');

            if(mt)mt.textContent='Nuevo Producto';

            // Valor inicial de IVA
            setValSafe('inv-iva',15);
        }

        UI.openModal('modal-inv');

        // Función auxiliar local para establecer valores
        function setValSafe(id,val){
            const el=document.getElementById(id);
            if(el)el.value=val;
        }
    },

    edit:function(id){
        this.openModal(id);
    },

    save:function(){

        const ii=document.getElementById('inv-id');

        const id=ii?ii.value:'';

        const getVal=(iid)=>{
            const el=document.getElementById(iid);
            return el?el.value:'';
        };

        const type=getVal('inv-type');

        /*
         * ==========================================
         * STOCK
         * ==========================================
         *
         * Si el tipo es BP:
         *   stock = "BP"
         *
         * Si es normal:
         *   stock = número
         */
        let stockVal;

        if(type==='BP'){
            stockVal='BP';
        }else{
            stockVal=parseInt(getVal('inv-stock'))||0;
        }

        /*
         * ==========================================
         * IVA POR PRODUCTO
         * ==========================================
         * Se acepta cualquier porcentaje entre 0 y 100.
         * Ejemplos: 0, 1, 3, 5, 12, 15, 20, 30, 100.
         */
        let iva=parseFloat(getVal('inv-iva'));
        if(!Number.isFinite(iva))iva=15;
        iva=Math.min(100,Math.max(0,iva));

        const cost=parseFloat(getVal('inv-cost'))||0;
        const price1=parseFloat(getVal('inv-price1'))||0;
        const price2=parseFloat(getVal('inv-price2'))||0;

        const ivaRate=iva/100;
        const price1Iva=price1+(price1*ivaRate);
        const price2Iva=price2+(price2*ivaRate);

        const d={
            code:getVal('inv-code'),
            name:getVal('inv-name'),
            category:getVal('inv-cat'),
            brand:getVal('inv-brand'),
            model:getVal('inv-model'),
            unit:getVal('inv-unit'),
            type:type,

            cost:cost,

            price1:price1,
            price2:price2,

            // Valores informativos con el IVA específico del producto
            price1_iva:price1Iva,
            price2_iva:price2Iva,

            stock:stockVal,
            reserved:0,

            min_stock:type==='BP'
                ?0
                :(parseInt(getVal('inv-min'))||5),

            warehouse_id:getVal('inv-warehouse'),
            provider:getVal('inv-provider'),
            warranty:getVal('inv-warranty'),
            description:getVal('inv-desc'),

            iva:iva,

            image:this.tempImage,

            company_id:Auth.currentCompany.id
        };

        if(!d.code||!d.name){
            return UI.toast('Complete campos','error');
        }

        /*
         * ==========================================
         * EDITAR PRODUCTO
         * ==========================================
         */
        if(id){

            const old=DB.getOne('products',id);

            d.reserved=old.reserved||0;

            /*
             * Si es BP, no hacer movimientos de kardex
             * porque BP no representa una cantidad física.
             */
            if(type!=='BP' && old.type!=='BP'){

                const oldStock=Number(old.stock)||0;
                const newStock=Number(stockVal)||0;

                if(oldStock!==newStock){

                    const diff=newStock-oldStock;

                    DB.insert('kardex',{
                        company_id:Auth.currentCompany.id,
                        date:new Date().toISOString(),
                        doc:'AJUSTE',
                        product_id:id,
                        product_name:d.name,
                        type:diff>0?'ENTRADA':'SALIDA',
                        qty:Math.abs(diff),
                        balance:newStock
                    });
                }

            }else if(old.type==='BP' && type!=='BP'){

                // Si pasa de BP a normal y se coloca stock
                const newStock=Number(stockVal)||0;

                if(newStock>0){
                    DB.insert('kardex',{
                        company_id:Auth.currentCompany.id,
                        date:new Date().toISOString(),
                        doc:'STOCK-INICIAL',
                        product_id:id,
                        product_name:d.name,
                        type:'ENTRADA',
                        qty:newStock,
                        balance:newStock
                    });
                }

            }

            DB.update('products',id,d);

        }else{

            const newId=DB.insert('products',d);

            /*
             * BP no genera STOCK-INICIAL.
             */
            if(type!=='BP' && Number(stockVal)>0){

                DB.insert('kardex',{
                    company_id:Auth.currentCompany.id,
                    date:new Date().toISOString(),
                    doc:'STOCK-INICIAL',
                    product_id:newId||d.id,
                    product_name:d.name,
                    type:'ENTRADA',
                    qty:Number(stockVal),
                    balance:Number(stockVal)
                });
            }
        }

        UI.closeModal('modal-inv');

        UI.toast('Guardado');

        this.render();
    }
},
Warehouses:{render:function(){const cid=Auth.currentCompany?.id;if(!cid)return;const data=DB.getAll('warehouses',cid);const tbody=document.getElementById('wh-tbody');if(tbody)tbody.innerHTML=data.map(w=>`<tr><td>${w.code}</td><td>${w.name}</td><td>${w.type}</td><td>${w.location||''}</td><td>${w.manager||''}</td><td class="text-right"><button class="btn btn-outline btn-sm" onclick="Modules.Warehouses.edit('${w.id}')">✏️</button></td></tr>`).join('')||'<tr><td colspan="6" class="text-center p-4">Sin bodegas</td></tr>'},
openModal:function(id){const form=document.querySelector('#modal-wh form');if(form)form.reset();const wi=document.getElementById('wh-id');if(wi)wi.value='';if(id){const w=DB.getOne('warehouses',id);const mt=document.getElementById('wh-modal-title');if(mt)mt.textContent='Editar Bodega';if(wi)wi.value=w.id;const setVal=(iid,val)=>{const el=document.getElementById(iid);if(el)el.value=val};setVal('wh-code',w.code);setVal('wh-name',w.name);setVal('wh-type',w.type);setVal('wh-location',w.location);setVal('wh-manager',w.manager)}else{const mt=document.getElementById('wh-modal-title');if(mt)mt.textContent='Nueva Bodega'}UI.openModal('modal-wh')},
edit:function(id){this.openModal(id)},
save:function(){const wi=document.getElementById('wh-id');const id=wi?wi.value:'';const getVal=(iid)=>{const el=document.getElementById(iid);return el?el.value:''};const d={code:getVal('wh-code'),name:getVal('wh-name'),type:getVal('wh-type'),location:getVal('wh-location'),manager:getVal('wh-manager'),company_id:Auth.currentCompany.id};if(!d.code||!d.name)return UI.toast('Complete campos','error');if(id)DB.update('warehouses',id,d);else DB.insert('warehouses',d);UI.closeModal('modal-wh');UI.toast('Guardado');this.render()}},
Kardex:{render:function(){const cid=Auth.currentCompany?.id;if(!cid)return;let data=DB.getAll('kardex',cid).sort((a,b)=>new Date(b.date)-new Date(a.date));const txt=(document.getElementById('filter-kardex-text')?.value||'').toLowerCase();const type=document.getElementById('filter-kardex-type')?.value||'';data=data.filter(k=>{const matchTxt=k.product_name.toLowerCase().includes(txt);const matchType=type?k.type===type:true;return matchTxt&&matchType});const tbody=document.getElementById('kardex-tbody');if(tbody)tbody.innerHTML=data.map(k=>`<tr><td>${Utils.formatDateTime(k.date)}</td><td><span class="badge badge-info">${k.doc}</span></td><td>${Utils.escape(k.product_name)}</td><td><span class="badge ${k.type==='ENTRADA'?'badge-success':'badge-danger'}">${k.type}</span></td><td>${k.type==='ENTRADA'?k.qty:'-'}</td><td>${k.type==='SALIDA'?k.qty:'-'}</td><td class="font-bold">${k.balance}</td></tr>`).join('')||'<tr><td colspan="7" class="text-center p-4">Sin movimientos</td></tr>'}},
Quotes:{tempItems:[],selectedFranquicia:null,
getCurrentUser:function(){
    const u=Auth.currentUser||Auth.user||Auth.currentUserData||{};
    const id=u.id||u.user_id||u.uid||u.email||'';
    const name=u.name||u.full_name||u.fullName||u.username||u.email||u.nombre||u.usuario||'Usuario';
    return {id:id,name:name};
},
getUserName:function(q,type){
    if(type==='created'){
        return q.created_by_name||q.created_by?.name||q.createdByName||q.created_by_user||q.createdBy||'N/M';
    }
    if(type==='modified'){
        return q.modified_by_name||q.modified_by?.name||q.modifiedByName||q.modified_by_user||q.modifiedBy||'N/M';
    }
    return 'N/M';
},
ensureQuoteFilters:function(data){
    let container=document.getElementById('quotes-filters-professional');
    const tbody=document.getElementById('quotes-tbody');

    if(!tbody)return;

    if(!container){
        container=document.createElement('div');
        container.id='quotes-filters-professional';
        container.style.cssText='display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:15px;padding:15px;background:var(--card-bg,#fff);border:1px solid var(--border,#ddd);border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.05);';

        const parent=tbody.closest('table')?.parentElement||tbody.parentElement;
        if(parent)parent.parentElement.insertBefore(container,parent);
    }

    const users={};
    data.forEach(q=>{
        const cn=this.getUserName(q,'created');
        const mn=this.getUserName(q,'modified');
        if(cn&&cn!=='N/M')users[cn]=cn;
        if(mn&&mn!=='N/M')users[mn]=mn;
    });

    let userSelect=document.getElementById('filter-quotes-user');
    let activitySelect=document.getElementById('filter-quotes-activity');

    if(!userSelect){
        userSelect=document.createElement('select');
        userSelect.id='filter-quotes-user';
        userSelect.className='input';
        userSelect.style.cssText='min-width:190px;';
        userSelect.onchange=()=>this.render();

        const wrap=document.createElement('div');
        wrap.innerHTML='<label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Asesor</label>';
        wrap.appendChild(userSelect);
        container.appendChild(wrap);
    }

    userSelect.innerHTML='<option value="">Todos los asesores</option>'+
        Object.keys(users).sort().map(u=>`<option value="${Utils.escape(u)}">${Utils.escape(u)}</option>`).join('');

    if(!activitySelect){
        activitySelect=document.createElement('select');
        activitySelect.id='filter-quotes-activity';
        activitySelect.className='input';
        activitySelect.style.cssText='min-width:190px;';
        activitySelect.onchange=()=>this.render();

        const wrap=document.createElement('div');
        wrap.innerHTML='<label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;">Actividad</label>';
        wrap.appendChild(activitySelect);
        container.appendChild(wrap);
    }

    const currentActivity=activitySelect.value||'';
    activitySelect.innerHTML=`
        <option value="">Todas</option>
        <option value="creadas">Creadas</option>
        <option value="modificadas">Modificadas</option>
        <option value="no_modificadas">No modificadas</option>
        <option value="descargadas">Descargadas</option>
        <option value="no_descargadas">No descargadas</option>
    `;
    activitySelect.value=currentActivity;

    let reset=document.getElementById('filter-quotes-reset');
    if(!reset){
        reset=document.createElement('button');
        reset.id='filter-quotes-reset';
        reset.className='btn btn-outline btn-sm';
        reset.type='button';
        reset.textContent='↺ Limpiar filtros';
        reset.onclick=()=>{
            const ids=['filter-quotes-text','filter-quotes-status','filter-quotes-date-start','filter-quotes-date-end','filter-quotes-user','filter-quotes-activity'];
            ids.forEach(id=>{
                const el=document.getElementById(id);
                if(el)el.value='';
            });
            this.render();
        };
        container.appendChild(reset);
    }
},
render:function(){
    const cid=Auth.currentCompany?.id;
    if(!cid)return;

    let data=DB.getAll('quotes',cid).sort((a,b)=>new Date(b.date)-new Date(a.date));

    this.ensureQuoteFilters(data);

    const txt=(document.getElementById('filter-quotes-text')?.value||'').toLowerCase();
    const status=document.getElementById('filter-quotes-status')?.value||'';
    const dateStart=document.getElementById('filter-quotes-date-start')?.value||'';
    const dateEnd=document.getElementById('filter-quotes-date-end')?.value||'';
    const userFilter=document.getElementById('filter-quotes-user')?.value||'';
    const activity=document.getElementById('filter-quotes-activity')?.value||'';

    data=data.filter(q=>{
        const createdBy=this.getUserName(q,'created');
        const modifiedBy=this.getUserName(q,'modified');

        const downloaded=!!(
            q.downloaded||
            q.downloaded_at||
            q.download_date||
            q.pdf_downloaded||
            q.downloaded_by
        );

        const modified=!!(
            q.modified||
            q.modified_at||
            q.modified_date||
            q.modified_by||
            q.modified_by_name
        );

        const matchTxt=(String(q.number||'')+String(q.client_name||'')+String(createdBy||'')+String(modifiedBy||'')).toLowerCase().includes(txt);

        let matchStatus=true;
        if(status){
            if(status==='Vencida'){
                const vu=Utils.addDays(new Date(q.date),parseInt(q.validity)||0);
                matchStatus=vu<new Date()&&q.status!=='Convertida';
            }else{
                matchStatus=q.status===status;
            }
        }

        let matchDate=true;
        if(dateStart)matchDate=matchDate&&new Date(q.date)>=new Date(dateStart);
        if(dateEnd)matchDate=matchDate&&new Date(q.date)<=new Date(dateEnd);

        let matchUser=true;
        if(userFilter){
            matchUser=createdBy===userFilter||modifiedBy===userFilter;
        }

        let matchActivity=true;
        switch(activity){
            case 'creadas':
                matchActivity=createdBy===userFilter||!userFilter;
                break;
            case 'modificadas':
                matchActivity=modified;
                if(userFilter)matchActivity=matchActivity&&modifiedBy===userFilter;
                break;
            case 'no_modificadas':
                matchActivity=!modified;
                break;
            case 'descargadas':
                matchActivity=downloaded;
                break;
            case 'no_descargadas':
                matchActivity=!downloaded;
                break;
        }

        if(activity==='creadas'&&userFilter){
            matchActivity=createdBy===userFilter;
        }

        return matchTxt&&matchStatus&&matchDate&&matchUser&&matchActivity;
    });

    const tbody=document.getElementById('quotes-tbody');

    if(tbody){
        tbody.innerHTML=data.map(q=>{
            const vu=Utils.addDays(new Date(q.date),parseInt(q.validity)||0);
            const exp=vu<new Date();
            const warn=Utils.addDays(new Date(),1)>=vu&&!exp;

            let sb='<span class="badge badge-success"></span>';
            if(q.status==='Convertida')sb='<span class="badge badge-info">Convertida</span>';
            else if(exp)sb='<span class="badge badge-danger">Vencida</span>';
            else if(warn)sb='<span class="badge badge-warning">Por Vencer</span>';

            const createdBy=this.getUserName(q,'created');
            const modifiedBy=this.getUserName(q,'modified');

            const downloaded=!!(
                q.downloaded||
                q.downloaded_at||
                q.download_date||
                q.pdf_downloaded||
                q.downloaded_by
            );

            const modified=!!(
                q.modified||
                q.modified_at||
                q.modified_date||
                q.modified_by||
                q.modified_by_name
            );

            const downloadDate=q.downloaded_at||q.download_date||'';
            const downloadBadge=downloaded
                ?`<span class="badge badge-success" title="${downloadDate?'Descargada el '+downloadDate:''}">📥 Descargada</span>`
                :'<span class="badge badge-secondary">📥 Sin descargar</span>';

            const modifiedBadge=modified
                ?'<span class="badge badge-warning">✏️ Modificada</span>'
                :'<span class="badge badge-secondary">N/M</span>';

            return `
                <tr>
                    <td><strong>${Utils.escape(q.number)}</strong></td>
                    <td>${Utils.formatDate(q.date)}</td>
                    <td>${Utils.escape(q.client_name)}</td>
                    <td class="font-bold">${Utils.formatMoney(q.total)}</td>
                    <td>${Utils.formatDate(vu)}</td>
                    <td>${sb}</td>

                    <td>
                        <div style="font-size:12px;line-height:1.5;">
                            <strong>Creada por:</strong><br>
                            <span>${Utils.escape(createdBy)}</span>
                        </div>
                    </td>

                    <td>
                        <div style="font-size:12px;line-height:1.5;">
                            <strong>Modificada por:</strong><br>
                            <span>${Utils.escape(modifiedBy)}</span><br>
                            ${modifiedBadge}
                        </div>
                    </td>

                    <td>
                        <div style="display:flex;flex-direction:column;gap:4px;">
                            ${downloadBadge}
                        </div>
                    </td>

                    <td class="text-right">
                        <button class="btn btn-outline btn-sm" onclick="Modules.Quotes.download('${q.id}')" title="Descargar PDF">📥</button>

                        <button class="btn btn-outline btn-sm" onclick="Modules.Quotes.edit('${q.id}')" title="Editar cotización">✏️</button>

                        ${q.status!=='Convertida'
                            ?`<button class="btn btn-primary btn-sm" onclick="Modules.Orders.openFromQuote('${q.id}')" title="Crear pedido">→ Pedido</button>`
                            :''
                        }

                        <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="Auth.requestPin('delete','quotes','${q.id}')" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('')||`
            <tr>
                <td colspan="10" class="text-center p-4">
                    Sin cotizaciones que coincidan con los filtros
                </td>
            </tr>
        `;

        const table=tbody.closest('table');

        if(table){
            const thead=table.querySelector('thead');

            if(thead&&!thead.dataset.quotesProfessional){
                thead.dataset.quotesProfessional='1';

                const tr=thead.querySelector('tr');

                if(tr){
                    const headers=tr.querySelectorAll('th');

                    if(headers.length>=7){
                        const actionHeader=headers[headers.length-1];

                        const createdTh=document.createElement('th');
                        createdTh.textContent='Creada por';
                        tr.insertBefore(createdTh,actionHeader);

                        const modifiedTh=document.createElement('th');
                        modifiedTh.textContent='Modificada por';
                        tr.insertBefore(modifiedTh,actionHeader);

                        const activityTh=document.createElement('th');
                        activityTh.textContent='Actividad';
                        tr.insertBefore(activityTh,actionHeader);
                    }
                }
            }
        }
    }
},
print:function(id){
    const q=DB.getOne('quotes',id);
    if(!q)return UI.toast('Cotización no encontrada','error');

    try{
        const result=App.printDocument('quote',id);

        const now=new Date().toISOString();
        const user=this.getCurrentUser();

        const updated={
            ...q,
            printed:true,
            printed_at:now,
            printed_by:user.id,
            printed_by_name:user.name,
            print_count:(parseInt(q.print_count)||0)+1,
            last_activity:'printed',
            last_activity_at:now
        };

        DB.update('quotes',id,updated);

        setTimeout(()=>{
            UI.toast('Cotización imprimida correctamente','success');
            this.render();
        },300);

        return result;
    }catch(e){
        console.error('Error al imprimir cotización:',e);
        UI.toast('No se pudo registrar la impresión','error');
    }
},
download:function(id){
    const q=DB.getOne('quotes',id);
    if(!q)return UI.toast('Cotización no encontrada','error');

    try{
        const result=App.downloadPDF('quote',id);

        const now=new Date().toISOString();
        const user=this.getCurrentUser();

        const updated={
            ...q,
            downloaded:true,
            downloaded_at:now,
            downloaded_by:user.id,
            downloaded_by_name:user.name,
            download_count:(parseInt(q.download_count)||0)+1,
            last_activity:'downloaded',
            last_activity_at:now
        };

        DB.update('quotes',id,updated);

        setTimeout(()=>{
            UI.toast('Cotización descargada correctamente','success');
            this.render();
        },300);

        return result;
    }catch(e){
        console.error('Error al descargar cotización:',e);
        UI.toast('No se pudo registrar la descarga','error');
    }
},
openModal:function(id){
    this.tempItems=[];
    this.selectedFranquicia=null;

    const qit=document.getElementById('quote-items-tbody');
    if(qit)qit.innerHTML='';

    const qd=document.getElementById('quote-date');
    if(qd)qd.value=Utils.todayInputDate();

    const qdg=document.getElementById('quote-disc-global');
    if(qdg)qdg.value=0;

    this.calculateTotals();

    const cid=Auth.currentCompany?.id;
    const cls=DB.getAll('clients',cid);

    const qc=document.getElementById('quote-client');

    if(qc){
        qc.innerHTML='<option value="final">Consumidor Final</option>'+
            cls.map(c=>`<option value="${c.id}">${Utils.escape(c.name||'')} ${Utils.escape(c.lastname||'')}</option>`).join('');
    }

    Auth.loadVendors('quote-vendor');

    const banks=[
        'Banco Pichincha',
        'Banco Guayaquil',
        'Produbanco',
        'Banco del Pacífico',
        'Banco Bolivariano',
        'Banco Internacional',
        'Diners Club',
        'Otro'
    ];

    const qcb=document.getElementById('quote-cc-bank');

    if(qcb)qcb.innerHTML=banks.map(b=>`<option>${b}</option>`).join('');

    if(id){
        const q=DB.getOne('quotes',id);

        if(!q)return;

        const mt=document.getElementById('quote-modal-title');
        if(mt)mt.textContent='Editar Cotización';

        const qi=document.getElementById('quote-id');
        if(qi)qi.value=q.id;

        if(qc)qc.value=q.client_id;

        if(qd)qd.value=Utils.dateInputValue(q.date)||Utils.todayInputDate();

        const qv=document.getElementById('quote-validity');
        if(qv)qv.value=q.validity;

        const qve=document.getElementById('quote-vendor');
        if(qve)qve.value=q.vendor;

        const qo=document.getElementById('quote-obs');
        if(qo)qo.value=q.observations;

        if(qdg)qdg.value=q.discount||0;

        const qpm=document.getElementById('quote-payment-method');
        if(qpm)qpm.value=q.payment_method||'';

        this.togglePaymentFields();

        try{
            this.tempItems=typeof q.items==='string'
                ?JSON.parse(q.items||'[]')
                :(q.items||[]);
        }catch(e){
            this.tempItems=[];
        }

        this.renderItems();
    }else{
        const mt=document.getElementById('quote-modal-title');
        if(mt)mt.textContent='Nueva Cotización';

        const qi=document.getElementById('quote-id');
        if(qi)qi.value='';
    }

    UI.openModal('modal-quote');
},
edit:function(id){
    this.openModal(id);
},
openClientSearch:function(){
    this.filterClients();
    UI.openModal('modal-client-search');
},
filterClients:function(){
    const t=(document.getElementById('client-search-input')?.value||'').toLowerCase();
    const cid=Auth.currentCompany?.id;
    const cs=DB.getAll('clients',cid);

    const tbody=document.getElementById('client-search-tbody');

    if(tbody){
        tbody.innerHTML=cs
            .filter(c=>(String(c.name||'')+String(c.doc||'')).toLowerCase().includes(t))
            .map(c=>`
                <tr>
                    <td>${c.photo?`<img src="${c.photo}" class="prod-thumb">`:''}</td>
                    <td>${Utils.escape(c.name||'')} ${Utils.escape(c.lastname||'')}</td>
                    <td>${Utils.escape(c.doc||'')}</td>
                    <td>${Utils.escape(c.phone||'')}</td>
                    <td>${Utils.formatMoney(c.credit_limit||0)}</td>
                    <td><button class="btn btn-primary btn-sm" onclick="Modules.Quotes.selectClient('${c.id}')">+</button></td>
                </tr>
            `).join('');
    }
},
selectClient:function(id){
    const qc=document.getElementById('quote-client');
    if(qc)qc.value=id;

    UI.closeModal('modal-client-search');
},
openProductSearch:function(){
    this.filterProducts();
    UI.openModal('modal-prod-search');
},
filterProducts:function(){
    const t=(document.getElementById('prod-search-input')?.value||'').toLowerCase();
    const cid=Auth.currentCompany?.id;
    const ps=DB.getAll('products',cid);

    const tbody=document.getElementById('prod-search-tbody');

    if(tbody){
        tbody.innerHTML=ps
            .filter(p=>(String(p.name||'')+String(p.code||'')).toLowerCase().includes(t))
            .map(p=>`
                <tr>
                    <td>${Utils.escape(p.code||'')}</td>
                    <td>${Utils.escape(p.name||'')} ${p.type==='BP'?'<span class="badge badge-bp">BP</span>':''}</td>
                    <td>${(p.stock||0)-(p.reserved||0)}</td>
                    <td>${Utils.formatMoney(p.price1||0)}<div class="text-muted" style="font-size:10px">IVA ${Number(p.iva)||0}%</div></td>
                    <td><button class="btn btn-primary btn-sm" onclick="Modules.Quotes.selectProduct('${p.id}')">+</button></td>
                </tr>
            `).join('');
    }
},
selectProduct:function(id){
    const p=DB.getOne('products',id);
    if(!p)return;

    // console.log('Producto seleccionado:',p); // quita las // si quieres ver los campos del producto en la consola (F12)

    if(p.type==='BP'){
        UI.toast('Producto BP. Gestión pronta.','warning');
    }else{
        const av=(p.stock||0)-(p.reserved||0);
        if(av<=0)return UI.toast('Sin stock','error');
    }

    this.tempItems.push({
        prodId:p.id,
        prodName:p.name,
        prodCode:p.code||p.product_code||p.productCode||p.sku||p.codigo||p.barcode||p.ref||'',
        prodImg:p.image,
        unit:p.unit||'UND',
        qty:1,
        price:Number(p.price1)||0,
        iva:Number.isFinite(Number(p.iva))?Number(p.iva):0,
        subtotal:Number(p.price1)||0
    });

    this.renderItems();
    UI.closeModal('modal-prod-search');
},
renderItems:function(){
    const tbody=document.getElementById('quote-items-tbody');

    if(tbody){
        tbody.innerHTML=this.tempItems.map((it,i)=>{
            const rate=Number.isFinite(Number(it.iva))?Number(it.iva):0;

            // Si el ítem no tiene código guardado, lo busca en el producto
            let code=it.prodCode;
            if(!code&&it.prodId){
                const p=DB.getOne('products',it.prodId);
                if(p){
                    code=p.code||p.sku||p.codigo||p.barcode||p.ref||'';
                    it.prodCode=code;
                }
            }

            return `
            <tr>
                <td>${it.prodImg?`<img src="${it.prodImg}" class="prod-thumb">`:''}</td>
                <td>${code?`<strong>[${Utils.escape(code)}]</strong> `:''}${Utils.escape(it.prodName||'')}<div class="quote-iva-label">IVA del producto: ${rate}%</div></td>
                <td>
                    <input
                        type="number"
                        class="input"
                        style="width:60px"
                        value="${it.qty}"
                        onchange="Modules.Quotes.updateQty(${i},this.value)"
                    >
                </td>
                <td>${Utils.formatMoney(it.price||0)}</td>
                <td class="font-bold">${Utils.formatMoney(it.subtotal||0)}</td>
                <td>
                    <button onclick="Modules.Quotes.removeItem(${i})" style="color:red;background:none;border:none">✕</button>
                </td>
            </tr>`;
        }).join('');
    }

    this.calculateTotals();
},
updateQty:function(i,v){
    this.tempItems[i].qty=parseFloat(v)||0;
    this.tempItems[i].subtotal=this.tempItems[i].qty*this.tempItems[i].price;
    this.renderItems();
},
removeItem:function(i){
    this.tempItems.splice(i,1);
    this.renderItems();
},
calculateTotals:function(){
    const ir=(Auth.currentCompany?Auth.currentCompany.iva:15)/100;

    const qdg=document.getElementById('quote-disc-global');
    const dr=qdg?parseFloat(qdg.value)||0:0;

    const sr=this.tempItems.reduce(
        (s,it)=>s+(parseFloat(it.subtotal)||0),
        0
    );

    const da=sr*(dr/100);
    const st=sr-da;
    const iv=st*ir;
    const tot=st+iv;

    const qs=document.getElementById('quote-subtotal');
    if(qs)qs.textContent=Utils.formatMoney(sr);

    const qd=document.getElementById('quote-discount');
    if(qd)qd.textContent='-'+Utils.formatMoney(da);

    const qi=document.getElementById('quote-iva');
    if(qi)qi.textContent=Utils.formatMoney(iv);

    const qt=document.getElementById('quote-total');
    if(qt)qt.textContent=Utils.formatMoney(tot);

    this.calcInstallments();
},
togglePaymentFields:function(){
    const qpm=document.getElementById('quote-payment-method');
    const m=qpm?qpm.value:'';

    const qccp=document.getElementById('quote-credit-card-panel');
    if(qccp)qccp.style.display=m==='Tarjeta de Crédito'?'block':'none';

    const qbg=document.getElementById('quote-bank-group');
    if(qbg){
        qbg.style.display=
            (m==='Transferencia'||
             m==='Tarjeta de Crédito'||
             m==='Tarjeta de Débito')
            ?'block'
            :'none';
    }

    const qvg=document.getElementById('quote-voucher-group');

    if(qvg){
        qvg.style.display=
            (m!=='Efectivo'&&m!=='')
            ?'block'
            :'none';
    }

},
selectFranquicia:function(el,name){
    document.querySelectorAll('.franquicia-btn')
        .forEach(b=>b.classList.remove('selected'));

    el.classList.add('selected');

    this.selectedFranquicia=name;

    const qcf=document.getElementById('quote-cc-franquicia');
    if(qcf)qcf.value=name;
},
toggleInstallments:function(){
    const qcpt=document.getElementById('quote-cc-paytype');
    const pt=qcpt?qcpt.value:'';

    const isDif=pt==='Diferido';

    const qig=document.getElementById('quote-installments-group');
    if(qig)qig.style.display=isDif?'block':'none';

    const qmg=document.getElementById('quote-modality-group');
    if(qmg)qmg.style.display=isDif?'block':'none';

    this.calcInstallments();
},
calcInstallments:function(){
    const qt=document.getElementById('quote-total');

    const total=qt
        ?parseFloat(qt.textContent.replace(/[^0-9.-]+/g,''))||0
        :0;

    const qcpt=document.getElementById('quote-cc-paytype');
    const pt=qcpt?qcpt.value:'';

    const qcm=document.getElementById('quote-cc-months');
    const months=qcm?parseInt(qcm.value)||1:1;

    const qcmo=document.getElementById('quote-cc-modality');
    const modality=qcmo?qcmo.value:'';

    const rate=16.30;

    let interest=0;

    if(pt==='Diferido'&&modality==='Con intereses'){
        interest=total*(rate/100)*(months/12);
    }

    const fee=0;
    const totalFinal=total+interest+fee;
    const monthly=pt==='Diferido'?totalFinal/months:totalFinal;

    const ccs=document.getElementById('cc-subtotal');
    if(ccs)ccs.textContent=Utils.formatMoney(total);

    const cci=document.getElementById('cc-interest');
    if(cci)cci.textContent=Utils.formatMoney(interest);

    const cct=document.getElementById('cc-total');
    if(cct)cct.textContent=Utils.formatMoney(totalFinal);

    const tbody=document.getElementById('quote-installments-tbody');

    if(tbody&&pt==='Diferido'){
        let html='';

        for(let i=1;i<=months;i++){
            const f=new Date();
            f.setMonth(f.getMonth()+i);

            html+=`
                <tr>
                    <td>${i}</td>
                    <td>${Utils.formatDate(f)}</td>
                    <td>${Utils.formatMoney(total/months)}</td>
                    <td>${Utils.formatMoney(interest/months)}</td>
                    <td>${Utils.formatMoney(monthly)}</td>
                </tr>
            `;
        }

        tbody.innerHTML=html;
    }
},
toggleViewer:function(){
    const qiv=document.getElementById('quote-installments-viewer');
    if(qiv)qiv.classList.toggle('open');
},
save:function(){
    const qi=document.getElementById('quote-id');
    const id=qi?qi.value:'';

    const qpm=document.getElementById('quote-payment-method');
    const pm=qpm?qpm.value:'';

    if(!pm){
        return UI.toast('La forma de pago es obligatoria','error');
    }

    const qc=document.getElementById('quote-client');
    const cid=qc?qc.value:'';

    const cn=cid==='final'
        ?'Consumidor Final'
        :(qc&&qc.options[qc.selectedIndex]
            ?qc.options[qc.selectedIndex].text
            :'Consumidor Final');

    const qt=document.getElementById('quote-total');

    const tv=qt
        ?parseFloat(qt.textContent.replace(/[^0-9.-]+/g,""))
        :0;

    if(this.tempItems.length===0){
        return UI.toast('Agregue productos','error');
    }

    const existing=id?DB.getOne('quotes',id):null;
    const currentUser=this.getCurrentUser();
    const now=new Date().toISOString();

    const dn=existing
        ?existing.number
        :DB.getNextNumber('COT');

    const isEdit=!!id;

    const q={
        ...(existing||{}),

        company_id:Auth.currentCompany.id,
        number:dn,
        date:(document.getElementById('quote-date')?.value||''),
        validity:(document.getElementById('quote-validity')?.value||30),
        vendor:(document.getElementById('quote-vendor')?.value||''),
        client_id:cid,
        client_name:cn,
        items:JSON.stringify(this.tempItems),

        subtotal:parseFloat(
            (document.getElementById('quote-subtotal')?.textContent||'0')
            .replace(/[^0-9.-]+/g,"")
        ),

        iva:parseFloat(
            (document.getElementById('quote-iva')?.textContent||'0')
            .replace(/[^0-9.-]+/g,"")
        ),

        total:tv,

        status:existing
            ?existing.status
            :'Pendiente',

        observations:(document.getElementById('quote-obs')?.value||''),

        discount:parseFloat(
            (document.getElementById('quote-disc-global')?.value||'0')
        )||0,

        payment_method:pm,

        payment_data:{
            bank:(document.getElementById('quote-payment-bank')?.value||''),
            voucher:(document.getElementById('quote-payment-voucher')?.value||''),
            franquicia:(document.getElementById('quote-cc-franquicia')?.value||''),
            cc_bank:(document.getElementById('quote-cc-bank')?.value||''),
            cc_type:(document.getElementById('quote-cc-type')?.value||''),
            cc_paytype:(document.getElementById('quote-cc-paytype')?.value||''),
            cc_months:(document.getElementById('quote-cc-months')?.value||''),
            cc_modality:(document.getElementById('quote-cc-modality')?.value||'')
        }
    };

    if(isEdit){
        q.modified=true;
        q.modified_at=now;
        q.modified_by=currentUser.id;
        q.modified_by_name=currentUser.name;

        /*
         * IMPORTANTE:
         * No se borran los datos anteriores de descarga/impresión.
         * La cotización conserva todo su historial.
         */
        q.downloaded=existing.downloaded||false;
        q.downloaded_at=existing.downloaded_at||null;
        q.downloaded_by=existing.downloaded_by||null;
        q.downloaded_by_name=existing.downloaded_by_name||null;
        q.download_count=existing.download_count||0;

        q.printed=existing.printed||false;
        q.printed_at=existing.printed_at||null;
        q.printed_by=existing.printed_by||null;
        q.printed_by_name=existing.printed_by_name||null;
        q.print_count=existing.print_count||0;

        q.created_by=existing.created_by||currentUser.id;
        q.created_by_name=existing.created_by_name||currentUser.name;

        q.last_activity='modified';
        q.last_activity_at=now;
    }else{
        q.created_by=currentUser.id;
        q.created_by_name=currentUser.name;
        q.created_at=now;

        q.modified=false;
        q.modified_at=null;
        q.modified_by=null;
        q.modified_by_name=null;

        q.downloaded=false;
        q.downloaded_at=null;
        q.downloaded_by=null;
        q.downloaded_by_name=null;
        q.download_count=0;

        q.printed=false;
        q.printed_at=null;
        q.printed_by=null;
        q.printed_by_name=null;
        q.print_count=0;

        q.last_activity='created';
        q.last_activity_at=now;
    }

    if(id){
        DB.update('quotes',id,q);
    }else{
        DB.insert('quotes',q);
    }

    UI.closeModal('modal-quote');

    UI.toast(
        isEdit
            ?'Cotización modificada correctamente'
            :'Cotización creada correctamente',
        'success'
    );

    this.render();
}},
alesNotes:{tempItems:[],render:function(){const cid=Auth.currentCompany?.id;if(!cid)return;let d=DB.getAll('sales_notes',cid).sort((a,b)=>new Date(b.date)-new Date(a.date));const txt=(document.getElementById('filter-sn-text')?.value||'').toLowerCase();const dateStart=document.getElementById('filter-sn-date-start')?.value||'';const dateEnd=document.getElementById('filter-sn-date-end')?.value||'';d=d.filter(n=>{const matchTxt=(n.number+n.client_name).toLowerCase().includes(txt);let matchDate=true;if(dateStart)matchDate=matchDate&&new Date(n.date)>=new Date(dateStart);if(dateEnd)matchDate=matchDate&&new Date(n.date)<=new Date(dateEnd);return matchTxt&&matchDate});const tbody=document.getElementById('sn-tbody');if(tbody)tbody.innerHTML=d.map(n=>`<tr><td><strong>${n.number}</strong></td><td>${Utils.formatDate(n.date)}</td><td>${Utils.escape(n.client_name)}</td><td class="font-bold">${Utils.formatMoney(n.total)}</td><td><span class="badge badge-info">Emitida</span></td><td class="text-right"><button class="btn btn-outline btn-sm" onclick="App.printDocument('sales_note','${n.id}')">🖨️</button> <button class="btn btn-outline btn-sm" onclick="App.downloadPDF('sales_note','${n.id}')">📥</button> <button class="btn btn-primary btn-sm" onclick="Modules.SalesNotes.toInvoice('${n.id}')">→ Factura</button> <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="Auth.requestPin('delete','sales_notes','${n.id}')">🗑️</button></td></tr>`).join('')||'<tr><td colspan="6" class="text-center p-4">Sin notas</td></tr>'},
openModal:function(){this.tempItems=[];const sit=document.getElementById('sn-items-tbody');if(sit)sit.innerHTML='';const sd=document.getElementById('sn-date');if(sd)sd.value=Utils.todayInputDate();this.calculateTotals();const cid=Auth.currentCompany?.id;const cs=DB.getAll('clients',cid);const sc=document.getElementById('sn-client');if(sc)sc.innerHTML='<option value="final">Consumidor Final</option>'+cs.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');const si=document.getElementById('sn-id');if(si)si.value='';Auth.loadVendors('sn-vendor');UI.openModal('modal-sn')},
openProductSearch:function(){window.currentSearchContext='sn';Modules.Quotes.filterProducts();UI.openModal('modal-prod-search')},
openClientSearch:function(){window.currentSearchContext='sn';Modules.Quotes.filterClients();UI.openModal('modal-client-search')},
renderItems:function(){const tbody=document.getElementById('sn-items-tbody');if(tbody)tbody.innerHTML=this.tempItems.map((it,i)=>`<tr><td>${it.prodName}</td><td><input type="number" class="input" style="width:60px" value="${it.qty}" onchange="Modules.SalesNotes.updateQty(${i},this.value)"></td><td>${Utils.formatMoney(it.price)}</td><td class="font-bold">${Utils.formatMoney(it.subtotal)}</td><td><button onclick="Modules.SalesNotes.removeItem(${i})" style="color:red;background:none;border:none">✕</button></td></tr>`).join('');this.calculateTotals()},
updateQty:function(i,v){this.tempItems[i].qty=parseFloat(v)||0;this.tempItems[i].subtotal=this.tempItems[i].qty*this.tempItems[i].price;this.renderItems()},
removeItem:function(i){this.tempItems.splice(i,1);this.renderItems()},
calculateTotals:function(){const t=this.tempItems.reduce((s,it)=>s+it.subtotal,0);const st=document.getElementById('sn-total');if(st)st.textContent=Utils.formatMoney(t)},
save:function(){const sc=document.getElementById('sn-client');const cid=sc?sc.value:'';const cn=cid==='final'?'Consumidor Final':(sc&&sc.options[sc.selectedIndex]?sc.options[sc.selectedIndex].text:'Consumidor Final');const st=document.getElementById('sn-total');const tv=st?parseFloat(st.textContent.replace(/[^0-9.-]+/g,"")):0;if(this.tempItems.length===0)return UI.toast('Agregue productos','error');const dn=DB.getNextNumber('NV');const n={company_id:Auth.currentCompany.id,number:dn,date:(document.getElementById('sn-date')?.value||''),vendor:(document.getElementById('sn-vendor')?.value||''),client_id:cid,client_name:cn,items:JSON.stringify(this.tempItems),total:tv};DB.insert('sales_notes',n);const self=this;this.tempItems.forEach(function(it){Modules.Inventory.updateStock(it.prodId,-it.qty,'SALIDA',dn)});UI.closeModal('modal-sn');UI.toast('Guardado');this.render()},
toInvoice:function(id){UI.toast('Conversión a factura en desarrollo','info')}},

CreditNotes: {

/* =========================================================
   ESTADO INTERNO
========================================================= */

products: [],
changeProductIndex: null,
editingId: null,

/* =========================================================
   USUARIO ACTUAL
========================================================= */

currentUserName: function () {

    const u = Auth.currentUser || {};

    return (
        u.name ||
        u.full_name ||
        u.username ||
        u.email ||
        u.id ||
        'Usuario'
    );
},


currentUserId: function () {

    const u = Auth.currentUser || {};

    return (
        u.id ||
        u.email ||
        u.username ||
        'Usuario'
    );
},


/* =========================================================
   UTILIDADES INTERNAS
========================================================= */

toNumber: function (value, fallback = 0) {

    const n = parseFloat(value);

    return Number.isFinite(n)
        ? n
        : fallback;
},


clone: function (value) {

    try {

        return JSON.parse(
            JSON.stringify(value)
        );

    } catch (e) {

        return value;
    }
},


escapeAttr: function (value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
},


getCompanyId: function () {

    return Auth.currentCompany?.id || null;
},


getInvoiceProducts: function (invoice) {

    if (!invoice)
        return [];

    let products =
        invoice.items ||
        invoice.products ||
        invoice.details ||
        [];

    if (typeof products === 'string') {

        try {

            products =
                JSON.parse(products);

        } catch (e) {

            products = [];
        }
    }

    return Array.isArray(products)
        ? products
        : [];
},


normalizeProduct: function (p, defaults = {}) {

    p = p || {};

    return {

        id:
            p.product_id ||
            p.productId ||
            p.prodId ||
            p.id ||
            '',

        code:
            p.code ||
            p.product_code ||
            p.productCode ||
            '',

        name:
            p.name ||
            p.product_name ||
            p.productName ||
            '',

        description:
            p.description ||
            p.product_description ||
            p.product_name ||
            p.name ||
            '',

        quantity:
            this.toNumber(
                p.quantity ??
                p.qty ??
                defaults.quantity ??
                1,
                1
            ),

        price:
            this.toNumber(
                p.price ??
                p.unit_price ??
                p.unitPrice ??
                p.sale_price ??
                p.salePrice ??
                defaults.price ??
                0
            ),

        discount:
            Math.max(
                0,
                this.toNumber(
                    p.discount_amount ??
                    p.discount ??
                    defaults.discount ??
                    0
                )
            )
    };
},


getLineSubtotal: function (product) {

    const qty =
        Math.max(
            0,
            this.toNumber(
                product?.quantity
            )
        );

    const price =
        Math.max(
            0,
            this.toNumber(
                product?.price
            )
        );

    const gross =
        qty * price;

    const discount =
        Math.min(
            gross,
            Math.max(
                0,
                this.toNumber(
                    product?.discount
                )
            )
        );

    return Math.max(
        0,
        gross - discount
    );
},


getTotals: function () {

    let subtotal = 0;
    let productDiscount = 0;

    this.products.forEach(p => {

        const qty =
            Math.max(
                0,
                this.toNumber(
                    p.quantity
                )
            );

        const price =
            Math.max(
                0,
                this.toNumber(
                    p.price
                )
            );

        const gross =
            qty * price;

        const discount =
            Math.min(
                gross,
                Math.max(
                    0,
                    this.toNumber(
                        p.discount
                    )
                )
            );

        subtotal += gross;
        productDiscount += discount;
    });


    const globalDiscount =
        Math.max(
            0,
            this.toNumber(
                document
                    .getElementById(
                        'cn-discount'
                    )
                    ?.value
            )
        );


    const discount =
        Math.min(
            subtotal,
            productDiscount +
            globalDiscount
        );


    const taxable =
        Math.max(
            0,
            subtotal - discount
        );


    const iva =
        Math.max(
            0,
            this.toNumber(
                document
                    .getElementById(
                        'cn-iva'
                    )
                    ?.value
            )
        );


    const total =
        Math.max(
            0,
            taxable + iva
        );


    return {

        subtotal:
            subtotal,

        productDiscount:
            productDiscount,

        globalDiscount:
            globalDiscount,

        discount:
            discount,

        taxable:
            taxable,

        iva:
            iva,

        total:
            total
    };
},


getCalculatedTotal: function () {

    return this.getTotals().total;
},


/* =========================================================
   LISTADO
========================================================= */

render: function () {

    const cid =
        this.getCompanyId();

    if (!cid)
        return;


    let d =
        DB.getAll(
            'credit_notes',
            cid
        ) || [];


    d.sort(
        (a, b) =>
            new Date(
                b.date ||
                b.created_at ||
                0
            ) -
            new Date(
                a.date ||
                a.created_at ||
                0
            )
    );


    const txt =
        (
            document.getElementById(
                'filter-cn-text'
            )?.value || ''
        )
        .trim()
        .toLowerCase();


    if (txt) {

        d =
            d.filter(n => {

                const productText =
                    (n.products || [])
                        .map(p =>
                            [
                                p.code,
                                p.name,
                                p.description,
                                p.product_name
                            ]
                            .filter(Boolean)
                            .join(' ')
                        )
                        .join(' ');


                const searchText = [

                    n.number,
                    n.client_name,
                    n.invoice_num,
                    n.reason,
                    n.description,

                    n.created_by_name,
                    n.created_by,

                    n.approved_by_name,
                    n.approved_by,

                    n.rejected_by_name,
                    n.rejected_by,

                    n.edited_by_name,
                    n.edited_by,

                    n.rejection_reason,

                    productText

                ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();


                return searchText.includes(
                    txt
                );
            });
    }


    const tbody =
        document.getElementById(
            'cn-tbody'
        );


    if (!tbody)
        return;


    tbody.innerHTML =
        d.map(n => {

            let statusBadge = '';


            if (
                n.status ===
                'Pendiente'
            ) {

                statusBadge = `
                    <span class="badge badge-warning">
                        Pendiente
                    </span>
                `;

            } else if (
                n.status ===
                'Aprobada'
            ) {

                statusBadge = `
                    <span class="badge badge-success">
                        Aprobada
                    </span>
                `;

            } else if (
                n.status ===
                'Rechazada'
            ) {

                statusBadge = `
                    <span class="badge badge-danger">
                        Rechazada
                    </span>
                `;

            } else if (
                n.status ===
                'Autorizada'
            ) {

                statusBadge = `
                    <span class="badge badge-success">
                        Autorizada SRI
                    </span>
                `;

            } else {

                statusBadge = `
                    <span class="badge">
                        ${Utils.escape(
                            n.status ||
                            'Pendiente'
                        )}
                    </span>
                `;
            }


            const safeId =
                this.escapeAttr(
                    n.id
                );


            let actions = `

                <button
                    class="btn btn-outline btn-sm"
                    title="Imprimir"
                    onclick="App.printDocument(
                        'credit_note',
                        '${safeId}'
                    )">
                    🖨️
                </button>

                <button
                    class="btn btn-outline btn-sm"
                    title="PDF"
                    onclick="App.downloadPDF(
                        'credit_note',
                        '${safeId}'
                    )">
                    📥
                </button>

                <button
                    class="btn btn-outline btn-sm"
                    title="Ver"
                    onclick="Modules.CreditNotes.view(
                        '${safeId}'
                    )">
                    👁️
                </button>
            `;


            /* =================================================
               PENDIENTE
            ================================================= */

            if (
                n.status ===
                'Pendiente'
            ) {

                actions += `

                    <button
                        class="btn btn-success btn-sm"
                        title="Aprobar"
                        onclick="Modules.CreditNotes.approve(
                            '${safeId}'
                        )">
                        ✓ Aprobar
                    </button>

                    <button
                        class="btn btn-danger btn-sm"
                        title="Rechazar"
                        onclick="Modules.CreditNotes.reject(
                            '${safeId}'
                        )">
                        ✕ Rechazar
                    </button>
                `;
            }


            /* =================================================
               APROBADA
            ================================================= */

            if (
                n.status ===
                'Aprobada'
            ) {

                actions += `

                    <button
                        class="btn btn-primary btn-sm"
                        title="Editar nota aprobada"
                        onclick="Modules.CreditNotes.edit(
                            '${safeId}'
                        )">
                        ✏️ Editar
                    </button>

                    <button
                        class="btn btn-outline btn-sm"
                        title="Descargar XML"
                        onclick="Modules.CreditNotes.downloadXML(
                            '${safeId}'
                        )">
                        XML
                    </button>
                `;
            }


            /* =================================================
               AUTORIZADA SRI
            ================================================= */

            if (
                n.status ===
                'Autorizada'
            ) {

                actions += `

                    <button
                        class="btn btn-outline btn-sm"
                        title="Descargar XML"
                        onclick="Modules.CreditNotes.downloadXML(
                            '${safeId}'
                        )">
                        XML
                    </button>
                `;
            }


            return `

                <tr>

                    <td>
                        <strong>
                            ${Utils.escape(
                                n.number || ''
                            )}
                        </strong>
                    </td>

                    <td>
                        ${Utils.formatDate(
                            n.date
                        )}
                    </td>

                    <td>
                        ${Utils.escape(
                            n.invoice_num || ''
                        )}
                    </td>

                    <td>
                        ${Utils.escape(
                            n.client_name || ''
                        )}
                    </td>

                    <td>
                        ${Utils.escape(
                            n.reason || ''
                        )}
                    </td>

                    <td>
                        ${statusBadge}
                    </td>

                    <td
                        class="font-bold"
                        style="color:var(--danger)">
                        -${Utils.formatMoney(
                            this.toNumber(
                                n.total
                            )
                        )}
                    </td>

                    <td>
                        <small>
                            ${Utils.escape(
                                n.created_by_name ||
                                n.created_by ||
                                ''
                            )}
                        </small>
                    </td>

                    <td>
                        <small>
                            ${Utils.escape(
                                n.approved_by_name ||
                                n.approved_by ||
                                '-'
                            )}
                        </small>
                    </td>

                    <td class="text-right">
                        ${actions}
                    </td>

                </tr>
            `;

        }).join('') ||

        `
            <tr>
                <td
                    colspan="10"
                    class="text-center p-4">
                    Sin notas
                </td>
            </tr>
        `;
},


/* =========================================================
   NUEVA NOTA
========================================================= */

openModal: function () {

    this.editingId = null;
    this.changeProductIndex = null;
    this.products = [];


    const title =
        document.querySelector(
            '#modal-cn .modal-header h3'
        );


    if (title)
        title.textContent =
            'Nueva Nota de Crédito';


    const invoice =
        document.getElementById(
            'cn-invoice'
        );


    if (invoice)
        invoice.disabled = false;


    const saveButton =
        document.querySelector(
            '#modal-cn .modal-footer .btn-danger'
        );


    if (saveButton) {

        saveButton.textContent =
            'Enviar para aprobación';

        saveButton.onclick =
            () =>
                Modules.CreditNotes.save();
    }


    const cd =
        document.getElementById(
            'cn-date'
        );


    if (cd)
        cd.value =
            Utils.todayInputDate();


    const cs =
        document.getElementById(
            'cn-subtotal'
        );


    if (cs)
        cs.value =
            '0.00';


    const cdsc =
        document.getElementById(
            'cn-discount'
        );


    if (cdsc)
        cdsc.value =
            '0.00';


    const ci =
        document.getElementById(
            'cn-iva'
        );


    if (ci)
        ci.value =
            '0.00';


    const ct =
        document.getElementById(
            'cn-total'
        );


    if (ct)
        ct.textContent =
            '$0.00';


    const reason =
        document.getElementById(
            'cn-reason'
        );


    if (reason)
        reason.value =
            'Devolución';


    const desc =
        document.getElementById(
            'cn-desc'
        );


    if (desc)
        desc.value =
            '';


    const ci2 =
        document.getElementById(
            'cn-invoice'
        );


    const cid =
        this.getCompanyId();


    if (ci2) {

        const invs =
            cid
                ? (
                    DB.getAll(
                        'invoices',
                        cid
                    ) || []
                )
                : [];


        const validInvoices =
            invs.filter(
                i =>
                    i.status !==
                    'Anulada'
            );


        ci2.innerHTML =
            `<option value="">
                Seleccione factura
            </option>` +

            validInvoices
                .map(i => {

                    const safeId =
                        this.escapeAttr(
                            i.id
                        );

                    return `
                        <option value="${safeId}">
                            ${Utils.escape(
                                i.number || ''
                            )}
                            -
                            ${Utils.escape(
                                i.client_name || ''
                            )}
                        </option>
                    `;
                })
                .join('');


        ci2.onchange =
            () =>
                this.loadInvoice(
                    ci2.value
                );
    }


    const ci3 =
        document.getElementById(
            'cn-id'
        );


    if (ci3)
        ci3.value = '';


    this.renderProducts();
    this.calc();


    UI.openModal(
        'modal-cn'
    );
},


/* =========================================================
   CARGAR FACTURA
========================================================= */

loadInvoice: function (
    invoiceId
) {

    if (!invoiceId) {

        this.products = [];

        this.renderProducts();

        this.calc();

        return;
    }


    const inv =
        DB.getOne(
            'invoices',
            invoiceId
        );


    if (!inv) {

        UI.toast(
            'Factura no encontrada',
            'error'
        );

        this.products = [];

        this.renderProducts();

        this.calc();

        return;
    }


    const products =
        this.getInvoiceProducts(
            inv
        );


    this.products =
        products.map(
            p =>
                this.normalizeProduct(
                    p
                )
        );


    this.renderProducts();

    this.calc();
},


/* =========================================================
   PRODUCTOS
========================================================= */

renderProducts: function () {

    const tbody =
        document.getElementById(
            'cn-products-tbody'
        );


    if (!tbody)
        return;


    if (!this.products.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="text-center p-4">

                    No hay productos seleccionados

                </td>

            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        this.products.map(
            (p, index) => {

                const qty =
                    Math.max(
                        0,
                        this.toNumber(
                            p.quantity
                        )
                    );


                const price =
                    Math.max(
                        0,
                        this.toNumber(
                            p.price
                        )
                    );


                const gross =
                    qty * price;


                const discount =
                    Math.min(
                        gross,
                        Math.max(
                            0,
                            this.toNumber(
                                p.discount
                            )
                        )
                    );


                const subtotal =
                    Math.max(
                        0,
                        gross -
                        discount
                    );


                return `

                    <tr>

                        <td>
                            ${Utils.escape(
                                p.code || ''
                            )}
                        </td>

                        <td>
                            ${Utils.escape(
                                p.description ||
                                p.name ||
                                ''
                            )}
                        </td>

                        <td>

                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value="${qty}"
                                class="form-control"
                                onchange="
                                    Modules.CreditNotes.changeQty(
                                        ${index},
                                        this.value
                                    )
                                "
                            >

                        </td>

                        <td>
                            $${Utils.formatMoney(
                                price
                            )}
                        </td>

                        <td>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                max="${gross.toFixed(2)}"
                                value="${discount.toFixed(2)}"
                                class="form-control"
                                onchange="
                                    Modules.CreditNotes.changeDiscount(
                                        ${index},
                                        this.value
                                    )
                                "
                            >

                        </td>

                        <td>
                            $${Utils.formatMoney(
                                subtotal
                            )}
                        </td>

                        <td class="text-right">

                            <button
                                type="button"
                                class="btn btn-outline btn-sm"
                                onclick="
                                    Modules.CreditNotes.changeProduct(
                                        ${index}
                                    )
                                ">
                                Cambiar
                            </button>

                            <button
                                type="button"
                                class="btn btn-danger btn-sm"
                                onclick="
                                    Modules.CreditNotes.removeProduct(
                                        ${index}
                                    )
                                ">
                                Eliminar
                            </button>

                        </td>

                    </tr>
                `;
            }
        ).join('');
},


/* =========================================================
   AGREGAR PRODUCTO
========================================================= */

addProduct: function () {

    this.changeProductIndex =
        null;

    this.openProductSearch(
        'Agregar producto'
    );
},


/* =========================================================
   BUSCADOR PRODUCTOS
========================================================= */

openProductSearch: function (
    title
) {

    const cid =
        this.getCompanyId();


    if (!cid) {

        UI.toast(
            'No hay una empresa seleccionada',
            'error'
        );

        return;
    }


    const products =
        DB.getAll(
            'products',
            cid
        ) || [];


    if (!products.length) {

        UI.toast(
            'No existen productos',
            'error'
        );

        return;
    }


    const html = `

        <div class="modal-content">

            <div class="modal-header">

                <h3>
                    ${Utils.escape(
                        title
                    )}
                </h3>

                <button
                    type="button"
                    class="btn btn-icon"
                    onclick="
                        Modules.CreditNotes.closeProductSearchModal()
                    ">
                    ✕
                </button>

            </div>


            <div class="modal-body">

                <input
                    type="text"
                    id="cn-product-search"
                    class="form-control"
                    placeholder="Buscar por código, nombre o descripción..."
                    autocomplete="off"
                    oninput="
                        Modules.CreditNotes.searchProducts()
                    "
                >


                <div
                    id="cn-product-results"
                    class="mt-3">
                </div>

            </div>

        </div>
    `;


    this.showProductSearchModal(
        html
    );


    this.searchProducts();


    setTimeout(
        () => {

            document
                .getElementById(
                    'cn-product-search'
                )
                ?.focus();

        },
        50
    );
},


searchProducts: function () {

    const cid =
        this.getCompanyId();


    if (!cid)
        return;


    const products =
        DB.getAll(
            'products',
            cid
        ) || [];


    const txt =
        (
            document.getElementById(
                'cn-product-search'
            )?.value || ''
        )
        .trim()
        .toLowerCase();


    const results =
        products.filter(
            p => {

                const code =
                    String(
                        p.code || ''
                    )
                    .toLowerCase();


                const name =
                    String(
                        p.name ||
                        p.product_name ||
                        ''
                    )
                    .toLowerCase();


                const description =
                    String(
                        p.description ||
                        ''
                    )
                    .toLowerCase();


                return (
                    !txt ||
                    code.includes(txt) ||
                    name.includes(txt) ||
                    description.includes(txt)
                );
            }
        );


    const container =
        document.getElementById(
            'cn-product-results'
        );


    if (!container)
        return;


    container.innerHTML =
        results
            .map(p => {

                const safeId =
                    this.escapeAttr(
                        p.id
                    );


                return `

                    <div
                        class="p-3 border-bottom"
                        style="
                            cursor:pointer;
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            gap:10px;
                        "
                        onclick="
                            Modules.CreditNotes.selectProduct(
                                '${safeId}'
                            )
                        ">

                        <div>

                            <strong>
                                ${Utils.escape(
                                    p.code || ''
                                )}
                            </strong>

                            <div>
                                ${Utils.escape(
                                    p.name ||
                                    p.description ||
                                    ''
                                )}
                            </div>

                            ${
                                p.name &&
                                p.description
                                    ? `
                                        <small>
                                            ${Utils.escape(
                                                p.description
                                            )}
                                        </small>
                                    `
                                    : ''
                            }

                        </div>

                        <span
                            class="btn btn-outline btn-sm">
                            Seleccionar
                        </span>

                    </div>
                `;
            })
            .join('') ||

        `
            <div class="p-3">
                No se encontraron productos
            </div>
        `;
},


/* =========================================================
   SELECCIONAR PRODUCTO
========================================================= */

selectProduct: function (
    productId
) {

    const p =
        DB.getOne(
            'products',
            productId
        );


    if (!p) {

        UI.toast(
            'Producto no encontrado',
            'error'
        );

        return;
    }


    const product =
        this.normalizeProduct(
            p,
            {
                quantity: 1,
                discount: 0
            }
        );


    /*
     * CAMBIAR PRODUCTO
     */

    if (
        this.changeProductIndex !== null &&
        this.changeProductIndex !== undefined
    ) {

        const index =
            this.changeProductIndex;


        const old =
            this.products[index];


        if (!old) {

            this.changeProductIndex =
                null;

            this.closeProductSearchModal();

            return;
        }


        product.quantity =
            Math.max(
                0,
                this.toNumber(
                    old.quantity,
                    1
                )
            );


        product.discount =
            Math.max(
                0,
                this.toNumber(
                    old.discount
                )
            );


        this.products[index] =
            product;


        this.changeProductIndex =
            null;

    } else {

        /*
         * AGREGAR PRODUCTO
         */

        this.products.push(
            product
        );
    }


    this.closeProductSearchModal();

    this.renderProducts();

    this.calc();
},


/* =========================================================
   CAMBIAR PRODUCTO
========================================================= */

changeProduct: function (
    index
) {

    if (!this.products[index])
        return;


    this.changeProductIndex =
        index;


    this.openProductSearch(
        'Cambiar producto'
    );
},


/* =========================================================
   ELIMINAR
========================================================= */

removeProduct: function (
    index
) {

    if (
        !this.products[index]
    )
        return;


    this.products.splice(
        index,
        1
    );


    this.renderProducts();

    this.calc();
},


/* =========================================================
   CANTIDAD
========================================================= */

changeQty: function (
    index,
    value
) {

    const product =
        this.products[index];


    if (!product)
        return;


    let qty =
        this.toNumber(
            value
        );


    if (qty <= 0) {

        qty = 0;

    }


    product.quantity =
        qty;


    /*
     * Ajustar descuento si el
     * nuevo subtotal es menor.
     */

    const gross =
        qty *
        Math.max(
            0,
            this.toNumber(
                product.price
            )
        );


    product.discount =
        Math.min(
            gross,
            Math.max(
                0,
                this.toNumber(
                    product.discount
                )
            )
        );


    this.renderProducts();

    this.calc();
},


/* =========================================================
   DESCUENTO POR PRODUCTO
========================================================= */

changeDiscount: function (
    index,
    value
) {

    const product =
        this.products[index];


    if (!product)
        return;


    const gross =
        Math.max(
            0,
            this.toNumber(
                product.quantity
            )
        ) *
        Math.max(
            0,
            this.toNumber(
                product.price
            )
        );


    const discount =
        Math.max(
            0,
            this.toNumber(
                value
            )
        );


    product.discount =
        Math.min(
            gross,
            discount
        );


    this.renderProducts();

    this.calc();
},


/* =========================================================
   CÁLCULO
========================================================= */

calc: function () {

    const totals =
        this.getTotals();


    const cs =
        document.getElementById(
            'cn-subtotal'
        );


    if (cs)
        cs.value =
            totals.subtotal.toFixed(2);


    /*
     * IMPORTANTE:
     *
     * El campo cn-discount se usa
     * como descuento GLOBAL.
     *
     * Los descuentos de productos
     * están dentro de products[].discount.
     *
     * Por eso aquí no sobrescribimos
     * el descuento global con el total
     * de descuentos de productos.
     */


    const discountInput =
        document.getElementById(
            'cn-discount'
        );


    if (discountInput) {

        const currentGlobalDiscount =
            Math.max(
                0,
                this.toNumber(
                    discountInput.value
                )
            );


        const maximumGlobalDiscount =
            Math.max(
                0,
                totals.subtotal -
                totals.productDiscount
            );


        const normalizedGlobalDiscount =
            Math.min(
                currentGlobalDiscount,
                maximumGlobalDiscount
            );


        discountInput.value =
            normalizedGlobalDiscount
                .toFixed(2);
    }


    const ct =
        document.getElementById(
            'cn-total'
        );


    if (ct) {

        const globalDiscount =
            Math.max(
                0,
                this.toNumber(
                    discountInput?.value
                )
            );


        const total =
            Math.max(
                0,
                totals.subtotal -
                totals.productDiscount -
                globalDiscount +
                totals.iva
            );


        ct.textContent =
            '$' +
            Utils.formatMoney(
                total
            );
    }
},


/* =========================================================
   GUARDAR NUEVA NOTA
========================================================= */

save: function () {

    const cid =
        this.getCompanyId();


    if (!cid)
        return UI.toast(
            'No hay una empresa seleccionada',
            'error'
        );


    if (this.editingId)
        return this.saveEdit();


    const ci =
        document.getElementById(
            'cn-invoice'
        );


    const iid =
        ci?.value || '';


    if (!iid)
        return UI.toast(
            'Seleccione una factura',
            'error'
        );


    const inv =
        DB.getOne(
            'invoices',
            iid
        );


    if (!inv)
        return UI.toast(
            'Factura no encontrada',
            'error'
        );


    if (
        inv.status ===
        'Anulada'
    )
        return UI.toast(
            'No se puede generar una nota sobre una factura anulada',
            'error'
        );


    const reason =
        (
            document.getElementById(
                'cn-reason'
            )?.value || ''
        )
        .trim();


    if (!reason)
        return UI.toast(
            'Debe indicar el motivo',
            'error'
        );


    if (!this.products.length)
        return UI.toast(
            'Agregue al menos un producto',
            'error'
        );


    const hasValidQuantity =
        this.products.some(
            p =>
                this.toNumber(
                    p.quantity
                ) > 0
        );


    if (!hasValidQuantity)
        return UI.toast(
            'Debe existir al menos un producto con cantidad mayor a cero',
            'error'
        );


    /*
     * Validar productos
     */

    for (
        const p of this.products
    ) {

        const qty =
            this.toNumber(
                p.quantity
            );

        const price =
            this.toNumber(
                p.price
            );

        const discount =
            this.toNumber(
                p.discount
            );


        if (
            qty < 0
        )
            return UI.toast(
                'La cantidad no puede ser negativa',
                'error'
            );


        if (
            price < 0
        )
            return UI.toast(
                'El precio no puede ser negativo',
                'error'
            );


        if (
            discount >
            qty * price
        )
            return UI.toast(
                'Un descuento de producto no puede superar su subtotal',
                'error'
            );
    }


    const totals =
        this.getTotals();


    const date =
        document.getElementById(
            'cn-date'
        )?.value ||
        new Date()
            .toISOString()
            .split('T')[0];


    const globalDiscount =
        Math.max(
            0,
            this.toNumber(
                document.getElementById(
                    'cn-discount'
                )?.value
            )
        );


    const finalDiscount =
        Math.min(
            totals.subtotal,
            totals.productDiscount +
            globalDiscount
        );


    const taxable =
        Math.max(
            0,
            totals.subtotal -
            finalDiscount
        );


    const iva =
        Math.max(
            0,
            this.toNumber(
                document.getElementById(
                    'cn-iva'
                )?.value
            )
        );


    const total =
        Math.max(
            0,
            taxable + iva
        );


    if (
        total <= 0
    )
        return UI.toast(
            'El total de la nota debe ser mayor que cero',
            'error'
        );


    const dn =
        DB.getNextNumber(
            'NC'
        );


    const now =
        new Date()
            .toISOString();


    const userId =
        this.currentUserId();


    const userName =
        this.currentUserName();


    const n = {

        company_id:
            cid,

        number:
            dn,

        date:
            date,

        invoice_id:
            iid,

        invoice_num:
            inv.number || '',

        client_id:
            inv.client_id || '',

        client_name:
            inv.client_name || '',

        reason:
            reason,

        description:
            document.getElementById(
                'cn-desc'
            )?.value || '',

        products:
            this.clone(
                this.products
            ),

        subtotal:
            totals.subtotal,

        discount:
            finalDiscount,

        iva:
            iva,

        total:
            total,

        status:
            'Pendiente',


        /* =================================================
           AUDITORÍA
        ================================================= */

        created_at:
            now,

        created_by:
            userId,

        created_by_name:
            userName,

        approved_at:
            null,

        approved_by:
            null,

        approved_by_name:
            null,

        rejected_at:
            null,

        rejected_by:
            null,

        rejected_by_name:
            null,

        rejection_reason:
            null,

        edited_at:
            null,

        edited_by:
            null,

        edited_by_name:
            null,

        edit_history:
            []
    };


    DB.insert(
        'credit_notes',
        n
    );


    this.resetForm();


    UI.closeModal(
        'modal-cn'
    );


    UI.toast(
        'Nota de crédito enviada para aprobación'
    );


    this.render();
},


/* =========================================================
   REINICIAR FORMULARIO
========================================================= */

resetForm: function () {

    this.products = [];
    this.changeProductIndex = null;
    this.editingId = null;


    const invoice =
        document.getElementById(
            'cn-invoice'
        );


    if (invoice) {

        invoice.disabled =
            false;

        invoice.value =
            '';
    }


    const idInput =
        document.getElementById(
            'cn-id'
        );


    if (idInput)
        idInput.value =
            '';


    const saveButton =
        document.querySelector(
            '#modal-cn .modal-footer .btn-danger'
        );


    if (saveButton) {

        saveButton.textContent =
            'Enviar para aprobación';

        saveButton.onclick =
            () =>
                Modules.CreditNotes.save();
    }
},


/* =========================================================
   APROBAR
========================================================= */

approve: function (
    id
) {

    const n =
        DB.getOne(
            'credit_notes',
            id
        );


    if (!n)
        return UI.toast(
            'Nota no encontrada',
            'error'
        );


    if (
        n.status !==
        'Pendiente'
    )
        return UI.toast(
            'Esta nota ya fue procesada',
            'error'
        );


    if (
        !UI.confirm(
            '¿Desea aprobar esta nota de crédito?'
        )
    )
        return;


    const now =
        new Date()
            .toISOString();


    const userId =
        this.currentUserId();


    const userName =
        this.currentUserName();


    DB.update(
        'credit_notes',
        id,
        {

            status:
                'Aprobada',

            approved_at:
                now,

            approved_by:
                userId,

            approved_by_name:
                userName,

            rejected_at:
                null,

            rejected_by:
                null,

            rejected_by_name:
                null,

            rejection_reason:
                null
        }
    );


    UI.toast(
        'Nota de crédito aprobada'
    );


    this.render();
},


/* =========================================================
   RECHAZAR
========================================================= */

reject: function (
    id
) {

    const n =
        DB.getOne(
            'credit_notes',
            id
        );


    if (!n)
        return UI.toast(
            'Nota no encontrada',
            'error'
        );


    if (
        n.status !==
        'Pendiente'
    )
        return UI.toast(
            'Esta nota ya fue procesada',
            'error'
        );


    const reason =
        prompt(
            'Indique el motivo del rechazo:'
        );


    if (
        reason === null
    )
        return;


    const cleanReason =
        reason.trim();


    if (!cleanReason)
        return UI.toast(
            'Debe indicar el motivo del rechazo',
            'error'
        );


    const now =
        new Date()
            .toISOString();


    const userId =
        this.currentUserId();


    const userName =
        this.currentUserName();


    DB.update(
        'credit_notes',
        id,
        {

            status:
                'Rechazada',

            rejected_at:
                now,

            rejected_by:
                userId,

            rejected_by_name:
                userName,

            rejection_reason:
                cleanReason,

            approved_at:
                null,

            approved_by:
                null,

            approved_by_name:
                null
        }
    );


    UI.toast(
        'Nota de crédito rechazada'
    );


    this.render();
},


/* =========================================================
   EDITAR NOTA APROBADA
========================================================= */

edit: function (
    id
) {

    const n =
        DB.getOne(
            'credit_notes',
            id
        );


    if (!n)
        return UI.toast(
            'Nota no encontrada',
            'error'
        );


    if (
        n.status !==
        'Aprobada'
    )
        return UI.toast(
            'Solo se pueden editar notas aprobadas',
            'error'
        );


    this.editingId =
        id;


    this.changeProductIndex =
        null;


    const title =
        document.querySelector(
            '#modal-cn .modal-header h3'
        );


    if (title)
        title.textContent =
            `Editar Nota de Crédito ${n.number || ''}`;


    const idInput =
        document.getElementById(
            'cn-id'
        );


    if (idInput)
        idInput.value =
            n.id || '';


    const date =
        document.getElementById(
            'cn-date'
        );


    if (date)
        date.value =
            n.date || '';


    const reason =
        document.getElementById(
            'cn-reason'
        );


    if (reason)
        reason.value =
            n.reason || '';


    const desc =
        document.getElementById(
            'cn-desc'
        );


    if (desc)
        desc.value =
            n.description || '';


    const iva =
        document.getElementById(
            'cn-iva'
        );


    if (iva)
        iva.value =
            this.toNumber(
                n.iva
            ).toFixed(2);


    /*
     * El descuento guardado es el descuento
     * total de la nota.
     *
     * Como los descuentos de producto ya
     * están guardados en products[].discount,
     * calculamos cuánto corresponde al
     * descuento global.
     */

    const productDiscount =
        (n.products || [])
            .reduce(
                (sum, p) => {

                    const qty =
                        this.toNumber(
                            p.quantity
                        );

                    const price =
                        this.toNumber(
                            p.price
                        );

                    const gross =
                        qty * price;

                    const d =
                        Math.min(
                            gross,
                            Math.max(
                                0,
                                this.toNumber(
                                    p.discount
                                )
                            )
                        );

                    return sum + d;
                },
                0
            );


    const globalDiscount =
        Math.max(
            0,
            this.toNumber(
                n.discount
            ) -
            productDiscount
        );


    const discount =
        document.getElementById(
            'cn-discount'
        );


    if (discount)
        discount.value =
            globalDiscount.toFixed(2);


    const cid =
        this.getCompanyId();


    const invs =
        cid
            ? (
                DB.getAll(
                    'invoices',
                    cid
                ) || []
            )
            : [];


    const invoice =
        document.getElementById(
            'cn-invoice'
        );


    if (invoice) {

        invoice.innerHTML =
            `<option value="">
                Seleccione factura
            </option>` +

            invs.map(i => {

                const safeId =
                    this.escapeAttr(
                        i.id
                    );

                return `
                    <option value="${safeId}">
                        ${Utils.escape(
                            i.number || ''
                        )}
                        -
                        ${Utils.escape(
                            i.client_name || ''
                        )}
                    </option>
                `;
            }).join('');


        invoice.value =
            n.invoice_id || '';


        invoice.disabled =
            true;
    }


    this.products =
        this.clone(
            n.products || []
        )
        .map(
            p =>
                this.normalizeProduct(
                    p
                )
        );


    this.renderProducts();

    this.calc();


    const saveButton =
        document.querySelector(
            '#modal-cn .modal-footer .btn-danger'
        );


    if (saveButton) {

        saveButton.textContent =
            'Guardar cambios';

        saveButton.onclick =
            () =>
                Modules.CreditNotes.saveEdit();
    }


    UI.openModal(
        'modal-cn'
    );
},


/* =========================================================
   GUARDAR EDICIÓN
========================================================= */

saveEdit: function () {

    if (!this.editingId)
        return;


    const n =
        DB.getOne(
            'credit_notes',
            this.editingId
        );


    if (!n)
        return UI.toast(
            'Nota no encontrada',
            'error'
        );


    if (
        n.status !==
        'Aprobada'
    )
        return UI.toast(
            'La nota ya no está disponible para edición',
            'error'
        );


    const reason =
        (
            document.getElementById(
                'cn-reason'
            )?.value || ''
        )
        .trim();


    if (!reason)
        return UI.toast(
            'Debe indicar el motivo',
            'error'
        );


    if (!this.products.length)
        return UI.toast(
            'Debe existir al menos un producto',
            'error'
        );


    for (
        const p of this.products
    ) {

        const qty =
            this.toNumber(
                p.quantity
            );

        const price =
            this.toNumber(
                p.price
            );

        const discount =
            this.toNumber(
                p.discount
            );


        if (
            qty <= 0
        )
            return UI.toast(
                'Todos los productos deben tener una cantidad mayor a cero',
                'error'
            );


        if (
            price < 0
        )
            return UI.toast(
                'El precio no puede ser negativo',
                'error'
            );


        if (
            discount >
            qty * price
        )
            return UI.toast(
                'Un descuento no puede superar el subtotal del producto',
                'error'
            );
    }


    if (
        !UI.confirm(
            '¿Guardar los cambios realizados en esta nota?'
        )
    )
        return;


    const oldData = {

        date:
            n.date,

        reason:
            n.reason,

        description:
            n.description,

        products:
            this.clone(
                n.products || []
            ),

        subtotal:
            n.subtotal,

        discount:
            n.discount,

        iva:
            n.iva,

        total:
            n.total
    };


    const totals =
        this.getTotals();


    const globalDiscount =
        Math.max(
            0,
            this.toNumber(
                document.getElementById(
                    'cn-discount'
                )?.value
            )
        );


    const finalDiscount =
        Math.min(
            totals.subtotal,
            totals.productDiscount +
            globalDiscount
        );


    const iva =
        Math.max(
            0,
            this.toNumber(
                document.getElementById(
                    'cn-iva'
                )?.value
            )
        );


    const total =
        Math.max(
            0,
            totals.subtotal -
            finalDiscount +
            iva
        );


    if (
        total <= 0
    )
        return UI.toast(
            'El total debe ser mayor que cero',
            'error'
        );


    const now =
        new Date()
            .toISOString();


    const userId =
        this.currentUserId();


    const userName =
        this.currentUserName();


    const history =
        Array.isArray(
            n.edit_history
        )
            ? this.clone(
                n.edit_history
            )
            : [];


    history.push({

        edited_at:
            now,

        edited_by:
            userId,

        edited_by_name:
            userName,

        previous:
            oldData
    });


    DB.update(
        'credit_notes',
        this.editingId,
        {

            /*
             * La fecha puede editarse.
             */

            date:
                document.getElementById(
                    'cn-date'
                )?.value ||
                n.date ||
                '',

            reason:
                reason,

            description:
                document.getElementById(
                    'cn-desc'
                )?.value ||
                '',

            products:
                this.clone(
                    this.products
                ),

            subtotal:
                totals.subtotal,

            discount:
                finalDiscount,

            iva:
                iva,

            total:
                total,

            edited_at:
                now,

            edited_by:
                userId,

            edited_by_name:
                userName,

            edit_history:
                history
        }
    );


    this.editingId =
        null;


    this.changeProductIndex =
        null;


    const invoice =
        document.getElementById(
            'cn-invoice'
        );


    if (invoice)
        invoice.disabled =
            false;


    UI.closeModal(
        'modal-cn'
    );


    UI.toast(
        'Cambios guardados correctamente'
    );


    this.render();
},


/* =========================================================
   VER DETALLE + AUDITORÍA
========================================================= */

view: function (
    id
) {

    const n =
        DB.getOne(
            'credit_notes',
            id
        );


    if (!n)
        return UI.toast(
            'Nota no encontrada',
            'error'
        );


    const products =
        Array.isArray(
            n.products
        )
            ? n.products
            : [];


    const html = `

        <div>

            <h3>
                Nota de crédito
                ${Utils.escape(
                    n.number || ''
                )}
            </h3>


            <p>
                <strong>
                    Fecha:
                </strong>

                ${Utils.escape(
                    n.date || '-'
                )}
            </p>


            <p>
                <strong>
                    Factura:
                </strong>

                ${Utils.escape(
                    n.invoice_num || ''
                )}
            </p>


            <p>
                <strong>
                    Cliente:
                </strong>

                ${Utils.escape(
                    n.client_name || ''
                )}
            </p>


            <p>
                <strong>
                    Motivo:
                </strong>

                ${Utils.escape(
                    n.reason || ''
                )}
            </p>


            ${
                n.description
                    ? `
                        <p>
                            <strong>
                                Descripción:
                            </strong>

                            ${Utils.escape(
                                n.description
                            )}
                        </p>
                    `
                    : ''
            }


            <p>
                <strong>
                    Estado:
                </strong>

                ${Utils.escape(
                    n.status || ''
                )}
            </p>


            ${
                n.rejection_reason
                    ? `
                        <p
                            style="color:var(--danger)">

                            <strong>
                                Motivo del rechazo:
                            </strong>

                            ${Utils.escape(
                                n.rejection_reason
                            )}

                        </p>
                    `
                    : ''
            }


            <hr>


            <h4>
                Auditoría
            </h4>


            <div class="grid-2">

                <div>

                    <strong>
                        Creado por
                    </strong>

                    <div>
                        ${Utils.escape(
                            n.created_by_name ||
                            n.created_by ||
                            '-'
                        )}
                    </div>

                    <small>
                        ${this.formatAuditDate(
                            n.created_at
                        )}
                    </small>

                </div>


                <div>

                    <strong>
                        Aprobado por
                    </strong>

                    <div>
                        ${Utils.escape(
                            n.approved_by_name ||
                            n.approved_by ||
                            '-'
                        )}
                    </div>

                    <small>
                        ${this.formatAuditDate(
                            n.approved_at
                        )}
                    </small>

                </div>


                <div>

                    <strong>
                        Rechazado por
                    </strong>

                    <div>
                        ${Utils.escape(
                            n.rejected_by_name ||
                            n.rejected_by ||
                            '-'
                        )}
                    </div>

                    <small>
                        ${this.formatAuditDate(
                            n.rejected_at
                        )}
                    </small>

                </div>


                <div>

                    <strong>
                        Última edición
                    </strong>

                    <div>
                        ${Utils.escape(
                            n.edited_by_name ||
                            n.edited_by ||
                            '-'
                        )}
                    </div>

                    <small>
                        ${this.formatAuditDate(
                            n.edited_at
                        )}
                    </small>

                </div>

            </div>


            <hr>


            <h4>
                Productos
            </h4>


            <table class="table">

                <thead>

                    <tr>

                        <th>
                            Código
                        </th>

                        <th>
                            Producto
                        </th>

                        <th>
                            Cantidad
                        </th>

                        <th>
                            Precio
                        </th>

                        <th>
                            Descuento
                        </th>

                        <th>
                            Total
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${
                        products.length
                            ? products
                                .map(
                                    p => {

                                        const qty =
                                            Math.max(
                                                0,
                                                this.toNumber(
                                                    p.quantity
                                                )
                                            );


                                        const price =
                                            Math.max(
                                                0,
                                                this.toNumber(
                                                    p.price
                                                )
                                            );


                                        const gross =
                                            qty *
                                            price;


                                        const discount =
                                            Math.min(
                                                gross,
                                                Math.max(
                                                    0,
                                                    this.toNumber(
                                                        p.discount
                                                    )
                                                )
                                            );


                                        const total =
                                            Math.max(
                                                0,
                                                gross -
                                                discount
                                            );


                                        return `

                                            <tr>

                                                <td>
                                                    ${Utils.escape(
                                                        p.code || ''
                                                    )}
                                                </td>

                                                <td>
                                                    ${Utils.escape(
                                                        p.description ||
                                                        p.name ||
                                                        ''
                                                    )}
                                                </td>

                                                <td>
                                                    ${qty}
                                                </td>

                                                <td>
                                                    $${Utils.formatMoney(
                                                        price
                                                    )}
                                                </td>

                                                <td>
                                                    $${Utils.formatMoney(
                                                        discount
                                                    )}
                                                </td>

                                                <td>
                                                    $${Utils.formatMoney(
                                                        total
                                                    )}
                                                </td>

                                            </tr>
                                        `;
                                    }
                                )
                                .join('')
                            : `
                                <tr>
                                    <td
                                        colspan="6"
                                        class="text-center">
                                        Sin productos
                                    </td>
                                </tr>
                            `
                    }

                </tbody>

            </table>


            <div
                class="text-right mt-4">

                <p>
                    Subtotal:

                    <strong>
                        $${Utils.formatMoney(
                            this.toNumber(
                                n.subtotal
                            )
                        )}
                    </strong>
                </p>


                <p>
                    Descuento:

                    <strong>
                        $${Utils.formatMoney(
                            this.toNumber(
                                n.discount
                            )
                        )}
                    </strong>
                </p>


                <p>
                    IVA:

                    <strong>
                        $${Utils.formatMoney(
                            this.toNumber(
                                n.iva
                            )
                        )}
                    </strong>
                </p>


                <h3>
                    Total:

                    $${Utils.formatMoney(
                        this.toNumber(
                            n.total
                        )
                    )}
                </h3>

            </div>


            ${
                Array.isArray(
                    n.edit_history
                ) &&
                n.edit_history.length
                    ? `

                        <hr>

                        <h4>
                            Historial de ediciones
                        </h4>

                        ${
                            n.edit_history
                                .map(
                                    h => {

                                        const previous =
                                            h.previous ||
                                            {};


                                        return `

                                            <div
                                                class="p-2 border-bottom">

                                                <strong>
                                                    ${Utils.escape(
                                                        h.edited_by_name ||
                                                        h.edited_by ||
                                                        'Usuario'
                                                    )}
                                                </strong>

                                                <br>

                                                <small>
                                                    ${this.formatAuditDate(
                                                        h.edited_at
                                                    )}
                                                </small>

                                                ${
                                                    previous.total !== undefined
                                                        ? `
                                                            <div>
                                                                Total anterior:
                                                                $${Utils.formatMoney(
                                                                    this.toNumber(
                                                                        previous.total
                                                                    )
                                                                )}
                                                            </div>
                                                        `
                                                        : ''
                                                }

                                            </div>
                                        `;
                                    }
                                )
                                .join('')
                        }
                    `
                    : ''
            }

        </div>
    `;


    this.showDetailModal(
        html
    );
},


/* =========================================================
   FECHA AUDITORÍA
========================================================= */

formatAuditDate: function (
    date
) {

    if (!date)
        return '-';


    try {

        const d =
            new Date(
                date
            );


        if (
            Number.isNaN(
                d.getTime()
            )
        )
            return String(
                date
            );


        return d.toLocaleString();

    } catch (e) {

        return String(
            date
        );
    }
},


/* =========================================================
   XML
========================================================= */

downloadXML: function (
    id
) {

    const n =
        DB.getOne(
            'credit_notes',
            id
        );


    if (!n)
        return UI.toast(
            'Nota no encontrada',
            'error'
        );


    if (
        n.status !==
        'Aprobada' &&
        n.status !==
        'Autorizada'
    ) {

        return UI.toast(
            'La nota debe estar aprobada antes de generar el XML',
            'error'
        );
    }


    const products =
        Array.isArray(
            n.products
        )
            ? n.products
            : [];


    const xml =

`<?xml version="1.0" encoding="UTF-8"?>
<notaCredito>

<numero>${this.xmlEscape(
    n.number
)}</numero>

<fechaEmision>${this.xmlEscape(
    n.date
)}</fechaEmision>

<factura>${this.xmlEscape(
    n.invoice_num || ''
)}</factura>

<cliente>${this.xmlEscape(
    n.client_name || ''
)}</cliente>

<motivo>${this.xmlEscape(
    n.reason || ''
)}</motivo>

<descripcion>${this.xmlEscape(
    n.description || ''
)}</descripcion>

<subtotal>${(
    this.toNumber(
        n.subtotal
    )
).toFixed(2)}</subtotal>

<descuento>${(
    this.toNumber(
        n.discount
    )
).toFixed(2)}</descuento>

<iva>${(
    this.toNumber(
        n.iva
    )
).toFixed(2)}</iva>

<total>${(
    this.toNumber(
        n.total
    )
).toFixed(2)}</total>

<detalles>

${
products
.map(
p => {

            const qty =
                Math.max(
                    0,
                    this.toNumber(
                        p.quantity
                    )
                );


            const price =
                Math.max(
                    0,
                    this.toNumber(
                        p.price
                    )
                );


            const gross =
                qty * price;


            const discount =
                Math.min(
                    gross,
                    Math.max(
                        0,
                        this.toNumber(
                            p.discount
                        )
                    )
                );


            return `
    <detalle>

        <codigo>${this.xmlEscape(
            p.code || ''
        )}</codigo>

        <descripcion>${this.xmlEscape(
            p.description ||
            p.name ||
            ''
        )}</descripcion>

        <cantidad>${qty.toFixed(
            2
        )}</cantidad>

        <precioUnitario>${price.toFixed(
            2
        )}</precioUnitario>

        <descuento>${discount.toFixed(
            2
        )}</descuento>

        <subtotal>${Math.max(
            0,
            gross - discount
        ).toFixed(2)}</subtotal>

    </detalle>`;
        }
    )
    .join('')

}

</detalles>

</notaCredito>`;

    const blob =
        new Blob(
            [xml],
            {
                type:
                    'application/xml;charset=utf-8'
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const a =
        document.createElement(
            'a'
        );


    a.href =
        url;


    a.download =
        `${n.number || 'nota-credito'}.xml`;


    document.body.appendChild(
        a
    );


    a.click();


    document.body.removeChild(
        a
    );


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        100
    );
},


/* =========================================================
   XML ESCAPE
========================================================= */

xmlEscape: function (
    value
) {

    return String(
        value ?? ''
    )
    .replace(
        /&/g,
        '&amp;'
    )
    .replace(
        /</g,
        '&lt;'
    )
    .replace(
        />/g,
        '&gt;'
    )
    .replace(
        /"/g,
        '&quot;'
    )
    .replace(
        /'/g,
        '&apos;'
    );
},


/* =========================================================
   MODAL BUSCADOR PRODUCTOS
========================================================= */

showProductSearchModal: function (
    html
) {

    let modal =
        document.getElementById(
            'cn-product-search-modal'
        );


    if (!modal) {

        modal =
            document.createElement(
                'div'
            );


        modal.id =
            'cn-product-search-modal';


        modal.className =
            'modal';


        document.body.appendChild(
            modal
        );
    }


    modal.innerHTML =
        html;


    modal.style.display =
        'block';


    modal.setAttribute(
        'aria-hidden',
        'false'
    );
},


closeProductSearchModal: function () {

    const modal =
        document.getElementById(
            'cn-product-search-modal'
        );


    if (modal) {

        modal.style.display =
            'none';

        modal.setAttribute(
            'aria-hidden',
            'true'
        );
    }


    this.changeProductIndex =
        null;
},


/* =========================================================
   MODAL DETALLE
========================================================= */

showDetailModal: function (
    html
) {

    let modal =
        document.getElementById(
            'cn-detail-modal'
        );


    if (!modal) {

        modal =
            document.createElement(
                'div'
            );


        modal.id =
            'cn-detail-modal';


        modal.className =
            'modal';


        document.body.appendChild(
            modal
        );
    }


    modal.innerHTML = `

        <div class="modal-content">

            <div class="modal-header">

                <h3>
                    Detalle de nota de crédito
                </h3>

                <button
                    type="button"
                    class="btn btn-icon"
                    onclick="
                        Modules.CreditNotes.closeDetailModal()
                    ">
                    ✕
                </button>

            </div>

            <div class="modal-body">

                ${html}

            </div>

        </div>
    `;


    modal.style.display =
        'block';


    modal.setAttribute(
        'aria-hidden',
        'false'
    );
},


closeDetailModal: function () {

    const modal =
        document.getElementById(
            'cn-detail-modal'
        );


    if (modal) {

        modal.style.display =
            'none';

        modal.setAttribute(
            'aria-hidden',
            'true'
        );
    }
}

},
Orders:{
    /*
     * ============================================================
     * ORDERS - PEDIDOS
     * ============================================================
     * Incluye:
     * - Conversión de cotización a pedido
     * - Abono inicial
     * - Abonos adicionales acumulativos
     * - Métodos de pago
     * - Porcentaje pagado automático
     * - Saldo automático
     * - Fecha de vencimiento
     * - Bloqueo de factura hasta 100%
     * - Cargo logístico
     * ============================================================
     */

    getCurrentUser:function(){
        const u=Auth.currentUser||Auth.user||Auth.currentUserData||{};

        return {
            id:u.id||u.user_id||u.uid||u.email||'',
            name:u.name||u.full_name||u.fullName||u.username||u.email||u.nombre||u.usuario||'Usuario'
        };
    },

    moneyToNumber:function(value){
        if(value===null||value===undefined)return 0;

        if(typeof value==='number'){
            return isFinite(value)?value:0;
        }

        let s=String(value).trim();

        if(!s)return 0;

        /*
         * Maneja formatos:
         * 300
         * 300.50
         * $300.50
         * $ 300,50
         */
        s=s.replace(/[^\d,.-]/g,'');

        if(s.includes(',')&&s.includes('.')){
            /*
             * Si la coma aparece después del punto,
             * asumimos formato 1.234,56
             */
            if(s.lastIndexOf(',')>s.lastIndexOf('.')){
                s=s.replace(/\./g,'').replace(',','.');
            }else{
                s=s.replace(/,/g,'');
            }
        }else if(s.includes(',')){
            s=s.replace(',','.');
        }

        const n=parseFloat(s);

        return isFinite(n)?n:0;
    },

    getOrderPaymentData:function(o){
        const total=this.moneyToNumber(o.total);

        /*
         * Compatibilidad con pedidos antiguos.
         */
        let paid=this.moneyToNumber(
            o.paid_amount!==undefined
                ?o.paid_amount
                :o.total_paid
        );

        /*
         * Si existen abonos históricos, recalcular
         * a partir de ellos.
         */
        if(Array.isArray(o.payments)){
            const historical=o.payments.reduce(
                (sum,p)=>{
                    return sum+
                        this.moneyToNumber(
                            p.amount!==undefined
                                ?p.amount
                                :p.paid_amount
                        );
                },
                0
            );

            if(historical>0){
                paid=historical;
            }
        }

        paid=Math.max(0,Math.min(total,paid));

        const percentage=total>0
            ?Math.min(100,(paid/total)*100)
            :0;

        const balance=Math.max(0,total-paid);

        let status='Pendiente';

        if(percentage>=99.9999){
            status='Pagado';
        }else if(percentage>0){
            status='Abono parcial';
        }

        return {
            total:total,
            paid:paid,
            percentage:percentage,
            balance:balance,
            status:status
        };
    },

    getPaymentStatusHTML:function(payment){
        if(payment.percentage>=99.9999){
            return '<span class="badge badge-success">Pagado 100%</span>';
        }

        if(payment.percentage>0){
            return `
                <span class="badge badge-warning">
                    Abono ${payment.percentage.toFixed(2)}%
                </span>
            `;
        }

        return '<span class="badge badge-secondary">Sin abono</span>';
    },

    /*
     * ============================================================
     * CREAR MODAL DE ABONO
     * ============================================================
     */

    ensurePaymentModal:function(){

        if(document.getElementById('modal-order-payment')){
            return;
        }

        const modal=document.createElement('div');

        modal.id='modal-order-payment';

        modal.innerHTML=`
            <div
                class="modal-backdrop"
                onclick="Modules.Orders.closePaymentModal()"
                style="
                    position:fixed;
                    inset:0;
                    background:rgba(0,0,0,.55);
                    z-index:9998;
                ">
            </div>

            <div
                class="modal-dialog"
                style="
                    position:fixed;
                    top:50%;
                    left:50%;
                    transform:translate(-50%,-50%);
                    width:min(520px,94vw);
                    max-height:90vh;
                    overflow:auto;
                    background:var(--card-bg,#fff);
                    border-radius:14px;
                    box-shadow:0 20px 60px rgba(0,0,0,.25);
                    z-index:9999;
                    padding:0;
                ">

                <div style="
                    padding:18px 20px;
                    border-bottom:1px solid var(--border,#ddd);
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                ">
                    <div>
                        <div style="
                            font-size:18px;
                            font-weight:700;
                        ">
                            💰 Registrar abono
                        </div>

                        <div
                            id="order-payment-modal-subtitle"
                            style="
                                font-size:12px;
                                color:#777;
                                margin-top:3px;
                            ">
                        </div>
                    </div>

                    <button
                        type="button"
                        onclick="Modules.Orders.closePaymentModal()"
                        style="
                            border:0;
                            background:none;
                            font-size:24px;
                            cursor:pointer;
                        ">
                        ×
                    </button>
                </div>

                <div style="padding:20px;">

                    <input
                        type="hidden"
                        id="order-payment-id">

                    <div style="
                        display:grid;
                        grid-template-columns:repeat(3,1fr);
                        gap:10px;
                        margin-bottom:18px;
                    ">

                        <div style="
                            padding:12px;
                            background:#f7f7f7;
                            border-radius:10px;
                        ">
                            <div style="font-size:11px;color:#777;">
                                Total
                            </div>

                            <strong id="order-payment-modal-total">
                                $0.00
                            </strong>
                        </div>

                        <div style="
                            padding:12px;
                            background:#f7f7f7;
                            border-radius:10px;
                        ">
                            <div style="font-size:11px;color:#777;">
                                Abonado
                            </div>

                            <strong
                                id="order-payment-modal-paid">
                                $0.00
                            </strong>
                        </div>

                        <div style="
                            padding:12px;
                            background:#fff7ed;
                            border-radius:10px;
                        ">
                            <div style="font-size:11px;color:#777;">
                                Saldo
                            </div>

                            <strong
                                id="order-payment-modal-balance">
                                $0.00
                            </strong>
                        </div>

                    </div>

                    <div style="
                        margin-bottom:16px;
                        padding:14px;
                        background:#f4f8ff;
                        border-radius:10px;
                        text-align:center;
                    ">
                        <div style="
                            font-size:12px;
                            color:#666;
                        ">
                            Porcentaje abonado
                        </div>

                        <div
                            id="order-payment-modal-percentage"
                            style="
                                font-size:28px;
                                font-weight:800;
                                color:#2563eb;
                            ">
                            0.00%
                        </div>
                    </div>

                    <div style="margin-bottom:15px;">
                        <label style="
                            display:block;
                            font-weight:600;
                            margin-bottom:6px;
                        ">
                            Nuevo abono *
                        </label>

                        <input
                            id="order-payment-amount"
                            type="number"
                            min="0"
                            step="0.01"
                            class="input"
                            placeholder="0.00"
                            style="
                                width:100%;
                                font-size:20px;
                                font-weight:700;
                            "
                            oninput="Modules.Orders.previewPayment()">
                    </div>

                    <div style="margin-bottom:15px;">
                        <label style="
                            display:block;
                            font-weight:600;
                            margin-bottom:6px;
                        ">
                            Método de pago *
                        </label>

                        <select
                            id="order-payment-method"
                            class="input"
                            style="width:100%;">

                            <option value="">
                                Seleccione método de pago
                            </option>

                            <option value="Efectivo">
                                Efectivo
                            </option>

                            <option value="Transferencia">
                                Transferencia
                            </option>

                            <option value="Tarjeta de Débito">
                                Tarjeta de Débito
                            </option>

                            <option value="Tarjeta de Crédito">
                                Tarjeta de Crédito
                            </option>

                            <option value="Cheque">
                                Cheque
                            </option>

                            <option value="Otro">
                                Otro
                            </option>
                        </select>
                    </div>

                    <div style="margin-bottom:15px;">
                        <label style="
                            display:block;
                            font-weight:600;
                            margin-bottom:6px;
                        ">
                            Referencia / comprobante
                        </label>

                        <input
                            id="order-payment-reference"
                            type="text"
                            class="input"
                            placeholder="N° de transferencia, comprobante, etc."
                            style="width:100%;">
                    </div>

                    <div style="margin-bottom:18px;">
                        <label style="
                            display:block;
                            font-weight:600;
                            margin-bottom:6px;
                        ">
                            Observación
                        </label>

                        <textarea
                            id="order-payment-note"
                            class="input"
                            rows="3"
                            placeholder="Observación del abono..."
                            style="width:100%;resize:vertical;">
                        </textarea>
                    </div>

                    <div style="
                        display:flex;
                        justify-content:flex-end;
                        gap:10px;
                    ">

                        <button
                            type="button"
                            class="btn btn-outline"
                            onclick="Modules.Orders.closePaymentModal()">
                            Cancelar
                        </button>

                        <button
                            type="button"
                            class="btn btn-primary"
                            onclick="Modules.Orders.savePayment()">
                            💾 Guardar abono
                        </button>

                    </div>

                </div>
            </div>
        `;

        modal.style.display='none';

        document.body.appendChild(modal);
    },

    openPayment:function(orderId){

        this.ensurePaymentModal();

        const o=DB.getOne('orders',orderId);

        if(!o){
            return UI.toast(
                'Pedido no encontrado',
                'error'
            );
        }

        const p=this.getOrderPaymentData(o);

        if(p.percentage>=99.9999){
            return UI.toast(
                'Este pedido ya está pagado al 100%',
                'success'
            );
        }

        document.getElementById(
            'order-payment-id'
        ).value=orderId;

        document.getElementById(
            'order-payment-modal-subtitle'
        ).textContent=
            `${o.number||''} · ${o.client_name||''}`;

        document.getElementById(
            'order-payment-modal-total'
        ).textContent=
            Utils.formatMoney(p.total);

        document.getElementById(
            'order-payment-modal-paid'
        ).textContent=
            Utils.formatMoney(p.paid);

        document.getElementById(
            'order-payment-modal-balance'
        ).textContent=
            Utils.formatMoney(p.balance);

        document.getElementById(
            'order-payment-modal-percentage'
        ).textContent=
            p.percentage.toFixed(2)+'%';

        const amount=document.getElementById(
            'order-payment-amount'
        );

        if(amount){
            amount.value='';
            amount.max=p.balance;
        }

        const method=document.getElementById(
            'order-payment-method'
        );

        if(method)method.value='';

        const reference=document.getElementById(
            'order-payment-reference'
        );

        if(reference)reference.value='';

        const note=document.getElementById(
            'order-payment-note'
        );

        if(note)note.value='';

        const modal=document.getElementById(
            'modal-order-payment'
        );

        if(modal){
            modal.style.display='block';
        }

        setTimeout(()=>{
            amount?.focus();
        },100);
    },

    closePaymentModal:function(){

        const modal=document.getElementById(
            'modal-order-payment'
        );

        if(modal){
            modal.style.display='none';
        }
    },

    previewPayment:function(){

        const id=document.getElementById(
            'order-payment-id'
        )?.value;

        if(!id)return;

        const o=DB.getOne('orders',id);

        if(!o)return;

        const p=this.getOrderPaymentData(o);

        const input=document.getElementById(
            'order-payment-amount'
        );

        let newAmount=this.moneyToNumber(
            input?.value
        );

        if(newAmount>p.balance){
            newAmount=p.balance;

            if(input){
                input.value=p.balance.toFixed(2);
            }
        }

        const newPaid=p.paid+newAmount;

        const newPercentage=p.total>0
            ?Math.min(100,(newPaid/p.total)*100)
            :0;

        const newBalance=Math.max(
            0,
            p.total-newPaid
        );

        const pe=document.getElementById(
            'order-payment-modal-percentage'
        );

        if(pe){
            pe.textContent=
                newPercentage.toFixed(2)+'%';
        }

        const be=document.getElementById(
            'order-payment-modal-balance'
        );

        if(be){
            be.textContent=
                Utils.formatMoney(newBalance);
        }

        const paidEl=document.getElementById(
            'order-payment-modal-paid'
        );

        if(paidEl){
            paidEl.textContent=
                Utils.formatMoney(newPaid);
        }
    },

    savePayment:function(){

        const id=document.getElementById(
            'order-payment-id'
        )?.value;

        if(!id){
            return UI.toast(
                'Pedido no seleccionado',
                'error'
            );
        }

        const o=DB.getOne('orders',id);

        if(!o){
            return UI.toast(
                'Pedido no encontrado',
                'error'
            );
        }

        const p=this.getOrderPaymentData(o);

        let amount=this.moneyToNumber(
            document.getElementById(
                'order-payment-amount'
            )?.value
        );

        if(amount<=0){
            return UI.toast(
                'Ingrese un monto de abono válido',
                'error'
            );
        }

        if(amount>p.balance+0.01){
            return UI.toast(
                'El abono no puede ser mayor al saldo pendiente',
                'error'
            );
        }

        const method=document.getElementById(
            'order-payment-method'
        )?.value||'';

        if(!method){
            return UI.toast(
                'Seleccione el método de pago',
                'error'
            );
        }

        const reference=document.getElementById(
            'order-payment-reference'
        )?.value||'';

        const note=document.getElementById(
            'order-payment-note'
        )?.value||'';

        const now=new Date().toISOString();

        const user=this.getCurrentUser();

        const payment={
            id:'PAY-'+Date.now()+'-'+Math.random()
                .toString(36)
                .substring(2,8),

            order_id:o.id,

            order_number:o.number,

            amount:amount,

            method:method,

            reference:reference,

            note:note,

            date:now,

            created_at:now,

            created_by:user.id,

            created_by_name:user.name
        };

        const payments=Array.isArray(o.payments)
            ?[...o.payments]
            :[];

        payments.push(payment);

        const newPaid=Math.min(
            p.total,
            p.paid+amount
        );

        const newPercentage=p.total>0
            ?Math.min(100,(newPaid/p.total)*100)
            :0;

        const newBalance=Math.max(
            0,
            p.total-newPaid
        );

        let paymentStatus='Pendiente';

        if(newPercentage>=99.9999){
            paymentStatus='Pagado';
        }else if(newPercentage>0){
            paymentStatus='Abono parcial';
        }

        const updated={
            ...o,

            payments:payments,

            paid_amount:newPaid,

            paid_percentage:newPercentage,

            balance_due:newBalance,

            payment_status:paymentStatus,

            last_payment_amount:amount,

            last_payment_method:method,

            last_payment_date:now,

            last_payment_reference:reference,

            last_payment_note:note,

            last_activity:'payment',

            last_activity_at:now
        };

        DB.update(
            'orders',
            id,
            updated
        );

        this.closePaymentModal();

        UI.toast(
            newPercentage>=99.9999
                ?'Pedido pagado al 100%'
                :`Abono registrado: ${Utils.formatMoney(amount)} · ${newPercentage.toFixed(2)}%`,
            'success'
        );

        this.render();
    },

    /*
     * ============================================================
     * FECHA DE VENCIMIENTO
     * ============================================================
     */

    getTodayDate:function(){

        const d=new Date();

        const y=d.getFullYear();

        const m=String(d.getMonth()+1)
            .padStart(2,'0');

        const day=String(d.getDate())
            .padStart(2,'0');

        return `${y}-${m}-${day}`;
    },

    isExpired:function(o){

        const p=this.getOrderPaymentData(o);

        if(p.percentage>=99.9999){
            return false;
        }

        if(!o.expiration_date){
            return false;
        }

        const today=this.getTodayDate();

        return String(o.expiration_date)<today;
    },

    getEffectiveStatus:function(o){

        if(o.status==='Facturado'){
            return 'Facturado';
        }

        if(o.status==='Logistica'||
           o.status==='En logística'||
           o.status==='En Logística'){
            return 'En logística';
        }

        if(this.isExpired(o)){
            return 'Pérdida / Sin despacho';
        }

        return o.status||'Pendiente';
    },

    /*
     * ============================================================
     * CARGO LOGÍSTICO
     * ============================================================
     */

    ensureLogisticsModal:function(){

        if(document.getElementById('modal-order-logistics')){
            return;
        }

        const modal=document.createElement('div');

        modal.id='modal-order-logistics';

        modal.innerHTML=`
            <div
                onclick="Modules.Orders.closeLogisticsModal()"
                style="
                    position:fixed;
                    inset:0;
                    background:rgba(0,0,0,.55);
                    z-index:9998;
                ">
            </div>

            <div
                style="
                    position:fixed;
                    top:50%;
                    left:50%;
                    transform:translate(-50%,-50%);
                    width:min(680px,95vw);
                    max-height:92vh;
                    overflow:auto;
                    background:var(--card-bg,#fff);
                    border-radius:14px;
                    box-shadow:0 20px 60px rgba(0,0,0,.3);
                    z-index:9999;
                ">

                <div style="
                    padding:18px 20px;
                    border-bottom:1px solid var(--border,#ddd);
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                ">

                    <div>
                        <div style="
                            font-size:19px;
                            font-weight:700;
                        ">
                            🚚 Enviar a cargo logístico
                        </div>

                        <div
                            id="order-logistics-subtitle"
                            style="
                                color:#777;
                                font-size:12px;
                                margin-top:3px;
                            ">
                        </div>
                    </div>

                    <button
                        type="button"
                        onclick="Modules.Orders.closeLogisticsModal()"
                        style="
                            border:0;
                            background:none;
                            font-size:24px;
                            cursor:pointer;
                        ">
                        ×
                    </button>
                </div>

                <div style="padding:20px;">

                    <input
                        type="hidden"
                        id="order-logistics-id">

                    <div style="
                        display:grid;
                        grid-template-columns:1fr 1fr;
                        gap:15px;
                    ">

                        <div>
                            <label style="
                                display:block;
                                font-weight:600;
                                margin-bottom:6px;
                            ">
                                N° Guía *
                            </label>

                            <input
                                id="order-logistics-guide"
                                type="text"
                                class="input"
                                placeholder="Número de guía"
                                style="width:100%;">
                        </div>

                        <div>
                            <label style="
                                display:block;
                                font-weight:600;
                                margin-bottom:6px;
                            ">
                                Fecha *
                            </label>

                            <input
                                id="order-logistics-date"
                                type="date"
                                class="input"
                                style="width:100%;">
                        </div>

                        <div>
                            <label style="
                                display:block;
                                font-weight:600;
                                margin-bottom:6px;
                            ">
                                Transportista *
                            </label>

                            <input
                                id="order-logistics-carrier"
                                type="text"
                                class="input"
                                placeholder="Transportista"
                                style="width:100%;">
                        </div>

                        <div>
                            <label style="
                                display:block;
                                font-weight:600;
                                margin-bottom:6px;
                            ">
                                Cliente / Pedido
                            </label>

                            <input
                                id="order-logistics-client"
                                type="text"
                                class="input"
                                readonly
                                style="
                                    width:100%;
                                    background:#f5f5f5;
                                ">
                        </div>

                        <div>
                            <label style="
                                display:block;
                                font-weight:600;
                                margin-bottom:6px;
                            ">
                                Peso (Kg)
                            </label>

                            <input
                                id="order-logistics-weight"
                                type="number"
                                min="0"
                                step="0.01"
                                class="input"
                                placeholder="0.00"
                                style="width:100%;">
                        </div>

                        <div>
                            <label style="
                                display:block;
                                font-weight:600;
                                margin-bottom:6px;
                            ">
                                Volumen (m3)
                            </label>

                            <input
                                id="order-logistics-volume"
                                type="number"
                                min="0"
                                step="0.001"
                                class="input"
                                placeholder="0.000"
                                style="width:100%;">
                        </div>

                        <div>
                            <label style="
                                display:block;
                                font-weight:600;
                                margin-bottom:6px;
                            ">
                                Costo Flete
                            </label>

                            <input
                                id="order-logistics-freight"
                                type="number"
                                min="0"
                                step="0.01"
                                class="input"
                                placeholder="0.00"
                                style="width:100%;">
                        </div>

                        <div>
                            <label style="
                                display:block;
                                font-weight:600;
                                margin-bottom:6px;
                            ">
                                Estado
                            </label>

                            <select
                                id="order-logistics-status"
                                class="input"
                                style="width:100%;">

                                <option value="Pendiente">
                                    Pendiente
                                </option>

                                <option value="Despachado">
                                    Despachado
                                </option>

                                <option value="En tránsito">
                                    En tránsito
                                </option>

                                <option value="Entregado">
                                    Entregado
                                </option>

                            </select>
                        </div>

                        <div style="grid-column:1/-1;">

                            <label style="
                                display:block;
                                font-weight:600;
                                margin-bottom:6px;
                            ">
                                Dirección *
                            </label>

                            <textarea
                                id="order-logistics-address"
                                class="input"
                                rows="3"
                                placeholder="Dirección de entrega"
                                style="
                                    width:100%;
                                    resize:vertical;
                                "></textarea>

                        </div>

                    </div>

                    <div style="
                        margin-top:20px;
                        padding:12px;
                        background:#ecfdf5;
                        border-radius:10px;
                        font-size:13px;
                    ">
                        <strong>✓ Pedido pagado al 100%</strong>
                        <br>
                        Este pedido quedará vinculado al módulo de
                        Cargo Logístico.
                    </div>

                    <div style="
                        display:flex;
                        justify-content:flex-end;
                        gap:10px;
                        margin-top:20px;
                    ">

                        <button
                            type="button"
                            class="btn btn-outline"
                            onclick="Modules.Orders.closeLogisticsModal()">
                            Cancelar
                        </button>

                        <button
                            type="button"
                            class="btn btn-primary"
                            onclick="Modules.Orders.saveLogistics()">
                            🚚 Enviar a cargo logístico
                        </button>

                    </div>

                </div>
            </div>
        `;

        modal.style.display='none';

        document.body.appendChild(modal);
    },

    openLogistics:function(orderId){

        this.ensureLogisticsModal();

        const o=DB.getOne(
            'orders',
            orderId
        );

        if(!o){
            return UI.toast(
                'Pedido no encontrado',
                'error'
            );
        }

        const p=this.getOrderPaymentData(o);

        if(p.percentage<99.9999){
            return UI.toast(
                'El pedido debe estar pagado al 100% para enviarlo a logística',
                'error'
            );
        }

        /*
         * Si ya está enviado, evitar duplicados.
         */
        if(o.logistics_id||o.sent_to_logistics){
            return UI.toast(
                'Este pedido ya fue enviado a Cargo Logístico',
                'warning'
            );
        }

        document.getElementById(
            'order-logistics-id'
        ).value=orderId;

        document.getElementById(
            'order-logistics-subtitle'
        ).textContent=
            `${o.number||''} · ${o.client_name||''}`;

        document.getElementById(
            'order-logistics-client'
        ).value=
            `${o.client_name||''} / ${o.number||''}`;

        document.getElementById(
            'order-logistics-guide'
        ).value='';

        document.getElementById(
            'order-logistics-date'
        ).value=this.getTodayDate();

        document.getElementById(
            'order-logistics-carrier'
        ).value=o.carrier||'';

        document.getElementById(
            'order-logistics-weight'
        ).value='';

        document.getElementById(
            'order-logistics-volume'
        ).value='';

        document.getElementById(
            'order-logistics-freight'
        ).value='';

        document.getElementById(
            'order-logistics-status'
        ).value='Despachado';

        /*
         * Intentar tomar dirección de distintos campos
         * existentes en el pedido/cliente.
         */
        let address=
            o.address||
            o.delivery_address||
            o.shipping_address||
            '';

        if(!address&&o.client_id){
            const c=DB.getOne(
                'clients',
                o.client_id
            );

            if(c){
                address=
                    c.address||
                    c.address1||
                    c.direccion||
                    '';
            }
        }

        document.getElementById(
            'order-logistics-address'
        ).value=address;

        const modal=document.getElementById(
            'modal-order-logistics'
        );

        if(modal){
            modal.style.display='block';
        }
    },

    closeLogisticsModal:function(){

        const modal=document.getElementById(
            'modal-order-logistics'
        );

        if(modal){
            modal.style.display='none';
        }
    },

    saveLogistics:function(){

        const orderId=document.getElementById(
            'order-logistics-id'
        )?.value;

        const o=DB.getOne(
            'orders',
            orderId
        );

        if(!o){
            return UI.toast(
                'Pedido no encontrado',
                'error'
            );
        }

        const p=this.getOrderPaymentData(o);

        if(p.percentage<99.9999){
            return UI.toast(
                'El pedido no está pagado al 100%',
                'error'
            );
        }

        const guide=document.getElementById(
            'order-logistics-guide'
        )?.value.trim()||'';

        const date=document.getElementById(
            'order-logistics-date'
        )?.value||'';

        const carrier=document.getElementById(
            'order-logistics-carrier'
        )?.value.trim()||'';

        const weight=this.moneyToNumber(
            document.getElementById(
                'order-logistics-weight'
            )?.value
        );

        const volume=this.moneyToNumber(
            document.getElementById(
                'order-logistics-volume'
            )?.value
        );

        const freight=this.moneyToNumber(
            document.getElementById(
                'order-logistics-freight'
            )?.value
        );

        const address=document.getElementById(
            'order-logistics-address'
        )?.value.trim()||'';

        const status=document.getElementById(
            'order-logistics-status'
        )?.value||'Despachado';

        if(!guide){
            return UI.toast(
                'El N° de Guía es obligatorio',
                'error'
            );
        }

        if(!date){
            return UI.toast(
                'La fecha es obligatoria',
                'error'
            );
        }

        if(!carrier){
            return UI.toast(
                'El transportista es obligatorio',
                'error'
            );
        }

        if(!address){
            return UI.toast(
                'La dirección es obligatoria',
                'error'
            );
        }

        /*
         * Evitar guía duplicada dentro de la compañía.
         */
        const cid=Auth.currentCompany?.id;

        const existingLogistics=DB.getAll(
            'logistics',
            cid
        );

        const duplicate=existingLogistics.find(
            x=>String(x.guide_number||x.guide||x.numero_guia||'')
                .trim()
                .toLowerCase()===guide.toLowerCase()
        );

        if(duplicate){
            return UI.toast(
                'Ese N° de Guía ya existe',
                'error'
            );
        }

        const user=this.getCurrentUser();

        const now=new Date().toISOString();

        const logisticsId=
            'LOG-'+Date.now()+'-'+Math.random()
                .toString(36)
                .substring(2,8);

        const logistics={
            id:logisticsId,

            company_id:cid,

            guide_number:guide,

            guide:guide,

            date:date,

            transportista:carrier,

            carrier:carrier,

            client_id:o.client_id||'',

            client_name:o.client_name||'',

            order_id:o.id,

            order_number:o.number,

            peso:weight,

            weight:weight,

            volumen:volume,

            volume:volume,

            costo_flete:freight,

            freight_cost:freight,

            direccion:address,

            address:address,

            estado:status,

            status:status,

            created_at:now,

            created_by:user.id,

            created_by_name:user.name
        };

        DB.insert(
            'logistics',
            logistics
        );

        /*
         * Actualizar pedido.
         */
        const updatedOrder={
            ...o,

            logistics_id:logisticsId,

            sent_to_logistics:true,

            sent_to_logistics_at:now,

            sent_to_logistics_by:user.id,

            sent_to_logistics_by_name:user.name,

            logistics_status:status,

            status:'En logística',

            last_activity:'sent_to_logistics',

            last_activity_at:now
        };

        DB.update(
            'orders',
            o.id,
            updatedOrder
        );

        this.closeLogisticsModal();

        UI.toast(
            'Pedido enviado a Cargo Logístico correctamente',
            'success'
        );

        this.render();

        /*
         * Si existe módulo Logistics/Cargo Logístico,
         * intentar actualizarlo.
         */
        try{
            if(
                Modules.Logistics &&
                typeof Modules.Logistics.render==='function'
            ){
                Modules.Logistics.render();
            }
        }catch(e){
            console.warn(
                'No se pudo actualizar visualmente Logistics:',
                e
            );
        }
    },

    /*
     * ============================================================
     * RENDER
     * ============================================================
     */

    render:function(){

        const cid=Auth.currentCompany?.id;

        if(!cid)return;

        let d=DB.getAll(
            'orders',
            cid
        ).sort(
            (a,b)=>new Date(b.date)-new Date(a.date)
        );

        /*
         * Actualizar estados vencidos visualmente.
         */
        d=d.map(o=>{

            if(
                this.isExpired(o) &&
                o.status!=='Facturado' &&
                !o.sent_to_logistics
            ){
                return {
                    ...o,
                    payment_status:
                        o.payment_status||'Pendiente'
                };
            }

            return o;
        });

        const txt=(
            document.getElementById(
                'filter-orders-text'
            )?.value||''
        ).toLowerCase();

        const status=(
            document.getElementById(
                'filter-orders-status'
            )?.value||''
        );

        d=d.filter(o=>{

            const matchTxt=(
                String(o.number||'')+
                String(o.client_name||'')
            )
            .toLowerCase()
            .includes(txt);

            let effectiveStatus=
                this.getEffectiveStatus(o);

            const matchStatus=status
                ?(
                    o.status===status||
                    effectiveStatus===status
                )
                :true;

            return matchTxt&&matchStatus;
        });

        const tbody=document.getElementById(
            'orders-tbody'
        );

        if(!tbody)return;

        tbody.innerHTML=d.map(o=>{

            const p=this.getOrderPaymentData(o);

            const expired=this.isExpired(o);

            const effectiveStatus=
                this.getEffectiveStatus(o);

            const canInvoice=
                p.percentage>=99.9999 &&
                o.status!=='Facturado' &&
                !expired;

            const canLogistics=
                p.percentage>=99.9999 &&
                o.status!=='Facturado' &&
                !expired &&
                !o.sent_to_logistics &&
                !o.logistics_id;

            let paymentBadge=
                this.getPaymentStatusHTML(p);

            let expirationHTML='';

            if(o.expiration_date){

                if(expired){

                    expirationHTML=`
                        <span
                            class="badge badge-danger"
                            title="La fecha de vencimiento ya pasó">
                            ⚠️ Vencido
                        </span>
                    `;

                }else{

                    expirationHTML=`
                        <span
                            class="badge badge-secondary">
                            Vence ${Utils.formatDate(
                                o.expiration_date
                            )}
                        </span>
                    `;
                }
            }

            let statusBadge='';

            if(effectiveStatus==='Pérdida / Sin despacho'){

                statusBadge=`
                    <span class="badge badge-danger">
                        Pérdida / Sin despacho
                    </span>
                `;

            }else if(effectiveStatus==='En logística'){

                statusBadge=`
                    <span class="badge badge-info">
                        🚚 En logística
                    </span>
                `;

            }else if(effectiveStatus==='Facturado'){

                statusBadge=`
                    <span class="badge badge-success">
                        Facturado
                    </span>
                `;

            }else{

                statusBadge=`
                    <span class="badge badge-info">
                        ${Utils.escape(
                            effectiveStatus
                        )}
                    </span>
                `;
            }

            let invoiceButton='';

            if(o.status!=='Facturado'){

                if(canInvoice){

                    invoiceButton=`
                        <button
                            class="btn btn-primary btn-sm"
                            onclick="Modules.Invoices.openFromOrder('${o.id}')"
                            title="Facturar pedido">
                            → Factura
                        </button>
                    `;

                }else{

                    let title=
                        'El pedido debe estar pagado al 100%';

                    if(expired){
                        title=
                            'Pedido vencido: no se puede facturar';
                    }

                    invoiceButton=`
                        <button
                            class="btn btn-outline btn-sm"
                            disabled
                            title="${title}">
                            🔒 Factura
                        </button>
                    `;
                }
            }

            let logisticsButton='';

            if(canLogistics){

                logisticsButton=`
                    <button
                        class="btn btn-success btn-sm"
                        onclick="Modules.Orders.openLogistics('${o.id}')"
                        title="Enviar a Cargo Logístico">
                        🚚 Logística
                    </button>
                `;

            }else if(
                o.sent_to_logistics||
                o.logistics_id
            ){

                logisticsButton=`
                    <span
                        class="badge badge-info"
                        title="Ya enviado a Cargo Logístico">
                        🚚 En logística
                    </span>
                `;
            }

            let paymentButton='';

            if(
                p.percentage<99.9999 &&
                !expired &&
                o.status!=='Facturado'
            ){

                paymentButton=`
                    <button
                        class="btn btn-warning btn-sm"
                        onclick="Modules.Orders.openPayment('${o.id}')"
                        title="Agregar abono">
                        💰 Abonar
                    </button>
                `;

            }else if(p.percentage>=99.9999){

                paymentButton=`
                    <span
                        class="badge badge-success"
                        title="No existen saldos pendientes">
                        ✓ Pagado
                    </span>
                `;
            }

            /*
             * Mostrar método del último abono.
             */
            const lastMethod=
                o.last_payment_method||
                (
                    Array.isArray(o.payments)&&
                    o.payments.length
                    ?o.payments[
                        o.payments.length-1
                    ]?.method
                    :''
                );

            const paymentMethodHTML=lastMethod
                ?`
                    <br>
                    <strong>Método:</strong>
                    ${Utils.escape(lastMethod)}
                `
                :'';

            return `
                <tr>

                    <td>
                        <strong>
                            ${Utils.escape(
                                o.number||''
                            )}
                        </strong>
                    </td>

                    <td>
                        ${
                            o.delivery_date
                            ?Utils.formatDate(
                                o.delivery_date
                            )
                            :'-'
                        }
                    </td>

                    <td>
                        ${Utils.escape(
                            o.client_name||''
                        )}
                    </td>

                    <td class="font-bold">
                        ${Utils.formatMoney(
                            p.total
                        )}
                    </td>

                    <td>
                        ${statusBadge}

                        ${
                            expirationHTML
                            ?`<div style="
                                margin-top:4px;
                            ">
                                ${expirationHTML}
                            </div>`
                            :''
                        }
                    </td>

                    <td>

                        <div style="
                            font-size:12px;
                            line-height:1.6;
                            min-width:150px;
                        ">

                            <strong>
                                Abonado:
                            </strong>
                            ${Utils.formatMoney(
                                p.paid
                            )}

                            <br>

                            <strong>
                                Porcentaje:
                            </strong>
                            ${p.percentage.toFixed(2)}%

                            <br>

                            <strong>
                                Saldo:
                            </strong>
                            ${Utils.formatMoney(
                                p.balance
                            )}

                            ${paymentMethodHTML}

                            <div style="
                                margin-top:5px;
                            ">
                                ${paymentBadge}
                            </div>

                        </div>

                    </td>

                    <td class="text-right">

                        <div style="
                            display:flex;
                            gap:5px;
                            justify-content:flex-end;
                            flex-wrap:wrap;
                        ">

                            <button
                                class="btn btn-outline btn-sm"
                                onclick="App.printDocument('order','${o.id}')"
                                title="Imprimir pedido">
                                🖨️
                            </button>

                            <button
                                class="btn btn-outline btn-sm"
                                onclick="App.downloadPDF('order','${o.id}')"
                                title="Descargar pedido">
                                📥
                            </button>

                            ${paymentButton}

                            ${logisticsButton}

                            ${invoiceButton}

                            <button
                                class="btn btn-outline btn-sm"
                                onclick="Modules.Orders.edit('${o.id}')"
                                title="Editar pedido">
                                ✏️
                            </button>

                            <button
                                class="btn btn-outline btn-sm"
                                style="color:var(--danger)"
                                onclick="Auth.requestPin('delete','orders','${o.id}')"
                                title="Eliminar">
                                🗑️
                            </button>

                        </div>

                    </td>

                </tr>
            `;
        }).join('')||
        `
            <tr>
                <td
                    colspan="7"
                    class="text-center p-4">
                    Sin pedidos
                </td>
            </tr>
        `;
    },

    /*
     * ============================================================
     * CONVERTIR COTIZACIÓN A PEDIDO
     * ============================================================
     */

    openFromQuote:function(qid){

        const q=DB.getOne(
            'quotes',
            qid
        );

        if(!q){
            return UI.toast(
                'Cotización no encontrada',
                'error'
            );
        }

        const toqi=document.getElementById(
            'to-order-quote-id'
        );

        if(toqi){
            toqi.value=qid;
        }

        const odd=document.getElementById(
            'order-delivery-date'
        );

        if(odd){
            odd.value=
                this.getTodayDate();
        }

        /*
         * Fecha de vencimiento.
         * Si el HTML tiene el campo,
         * se carga automáticamente.
         */
        const expiration=document.getElementById(
            'order-expiration-date'
        );

        if(expiration){

            const base=new Date();

            base.setDate(
                base.getDate()+30
            );

            expiration.value=
                base.toISOString()
                    .split('T')[0];
        }

        /*
         * Abono inicial.
         */
        const paidInput=document.getElementById(
            'order-paid-amount'
        );

        if(paidInput){

            paidInput.value='0';

            paidInput.max=
                this.moneyToNumber(q.total);

            paidInput.oninput=()=>{
                this.calculatePayment();
            };
        }

        const totalEl=document.getElementById(
            'order-payment-total'
        );

        if(totalEl){
            totalEl.textContent=
                Utils.formatMoney(
                    this.moneyToNumber(
                        q.total
                    )
                );
        }

        /*
         * Método de pago inicial.
         */
        const method=document.getElementById(
            'order-payment-method'
        );

        if(method){
            method.value=
                q.payment_method||'';
        }

        this.calculatePayment();

        const cid=Auth.currentCompany?.id;

        const whs=DB.getAll(
            'warehouses',
            cid
        );

        const ows=document.getElementById(
            'order-warehouse-select'
        );

        if(ows){

            ows.innerHTML=
                '<option value="">Seleccione bodega</option>'+
                whs.map(
                    w=>`
                        <option value="${w.id}">
                            ${Utils.escape(
                                w.name||''
                            )}
                        </option>
                    `
                ).join('');
        }

        UI.openModal(
            'modal-to-order'
        );
    },

    calculatePayment:function(){

        const paidInput=
            document.getElementById(
                'order-paid-amount'
            );

        const totalEl=
            document.getElementById(
                'order-payment-total'
            );

        const percentageEl=
            document.getElementById(
                'order-paid-percentage'
            );

        const balanceEl=
            document.getElementById(
                'order-payment-balance'
            );

        const statusEl=
            document.getElementById(
                'order-payment-status'
            );

        const total=this.moneyToNumber(
            totalEl?.textContent
        );

        let paid=this.moneyToNumber(
            paidInput?.value
        );

        if(paid<0){
            paid=0;

            if(paidInput){
                paidInput.value='0';
            }
        }

        if(paid>total){

            paid=total;

            if(paidInput){
                paidInput.value=
                    total.toFixed(2);
            }
        }

        const percentage=total>0
            ?Math.min(
                100,
                (paid/total)*100
            )
            :0;

        const balance=Math.max(
            0,
            total-paid
        );

        let status='Pendiente';

        if(percentage>=99.9999){
            status='Pagado';
        }else if(percentage>0){
            status='Abono parcial';
        }

        if(percentageEl){
            percentageEl.textContent=
                percentage.toFixed(2)+'%';
        }

        if(balanceEl){
            balanceEl.textContent=
                Utils.formatMoney(balance);
        }

        if(statusEl){

            statusEl.textContent=
                status;

            statusEl.className=
                'badge '+
                (
                    percentage>=99.9999
                    ?'badge-success'
                    :percentage>0
                    ?'badge-warning'
                    :'badge-secondary'
                );
        }

        return {
            total,
            paid,
            percentage,
            balance,
            status
        };
    },

    /*
     * ============================================================
     * CREAR PEDIDO DESDE COTIZACIÓN
     * ============================================================
     */

    createFromQuote:function(){

        const qid=document.getElementById(
            'to-order-quote-id'
        )?.value||'';

        const q=DB.getOne(
            'quotes',
            qid
        );

        if(!q){
            return UI.toast(
                'Cotización no encontrada',
                'error'
            );
        }

        const total=this.moneyToNumber(
            q.total
        );

        /*
         * El campo puede no existir en versiones anteriores.
         * En ese caso se interpreta como 0.
         */
        const paidInput=document.getElementById(
            'order-paid-amount'
        );

        let paid=paidInput
            ?this.moneyToNumber(
                paidInput.value
            )
            :0;

        if(paid<0){
            return UI.toast(
                'El abono no puede ser negativo',
                'error'
            );
        }

        if(paid>total){
            return UI.toast(
                'El abono no puede ser mayor al total',
                'error'
            );
        }

        /*
         * Método de pago.
         */
        const paymentMethod=document.getElementById(
            'order-payment-method'
        )?.value||'';

        /*
         * Si existe campo de método,
         * exigirlo cuando haya abono.
         */
        if(paid>0&&!paymentMethod){

            return UI.toast(
                'Seleccione el método de pago del abono',
                'error'
            );
        }

        const percentage=total>0
            ?Math.min(
                100,
                (paid/total)*100
            )
            :0;

        const balance=Math.max(
            0,
            total-paid
        );

        let paymentStatus='Pendiente';

        if(percentage>=99.9999){
            paymentStatus='Pagado';
        }else if(percentage>0){
            paymentStatus='Abono parcial';
        }

        const on=DB.getNextNumber(
            'PED'
        );

        const dr=this.moneyToNumber(q.discount);
        const sr=this.moneyToNumber(q.subtotal);
        const da=sr*(dr/100);
        const st=Math.max(0,sr-da);

        // El IVA ya fue calculado línea por línea en la cotización.
        const iv=this.moneyToNumber(q.iva);
        const finalTotal=this.moneyToNumber(q.total)||(st+iv);

        /*
         * Fecha de vencimiento.
         */
        let expirationDate=
            document.getElementById(
                'order-expiration-date'
            )?.value||'';

        if(!expirationDate){

            const orderDate=document.getElementById('order-date')?.value||this.getTodayDate();
            const validity=parseInt(document.getElementById('order-validity')?.value||'30')||30;
            const base=new Date(`${orderDate}T12:00:00`);

            base.setDate(
                base.getDate()+validity
            );

            expirationDate=
                `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(base.getDate()).padStart(2,'0')}`;
        }

        const now=
            new Date().toISOString();

        const user=
            this.getCurrentUser();

        /*
         * Historial del primer abono.
         */
        const payments=[];

        if(paid>0){

            payments.push({
                id:
                    'PAY-'+
                    Date.now()+
                    '-'+
                    Math.random()
                        .toString(36)
                        .substring(2,8),

                order_number:on,

                amount:paid,

                method:paymentMethod,

                reference:
                    document.getElementById(
                        'order-payment-reference'
                    )?.value||'',

                note:
                    document.getElementById(
                        'order-payment-note'
                    )?.value||'',

                date:now,

                created_at:now,

                created_by:user.id,

                created_by_name:user.name
            });
        }

        const o={

            company_id:
                Auth.currentCompany.id,

            number:on,

            date:
                document.getElementById('order-date')?.value||this.getTodayDate(),

            validity:
                parseInt(document.getElementById('order-validity')?.value||'30')||30,

            delivery_date:
                document.getElementById(
                    'order-delivery-date'
                )?.value||'',

            delivery_time:
                document.getElementById(
                    'order-delivery-time'
                )?.value||'',

            expiration_date:
                expirationDate,

            priority:
                document.getElementById(
                    'order-priority'
                )?.value||'Normal',

            warehouse_id:
                document.getElementById(
                    'order-warehouse-select'
                )?.value||'',

            carrier:
                document.getElementById(
                    'order-carrier'
                )?.value||'',

            notes:
                document.getElementById(
                    'order-notes'
                )?.value||'',

            observations:
                document.getElementById(
                    'order-notes'
                )?.value||'',

            client_id:
                q.client_id,

            client_name:
                q.client_name,

            items:
                q.items,

            subtotal:
                st,

            iva:
                iv,

            tax_breakdown:
                q.tax_breakdown||null,

            total:
                finalTotal,

            discount:
                dr,

            /*
             * PAGOS
             */
            paid_amount:
                paid,

            paid_percentage:
                percentage,

            balance_due:
                balance,

            payment_status:
                paymentStatus,

            payments:
                payments,

            last_payment_amount:
                paid,

            last_payment_method:
                paymentMethod,

            last_payment_date:
                paid>0?now:null,

            status:
                'Pendiente',

            source_quote:
                q.number,

            source_quote_id:
                q.id,

            created_at:
                now,

            created_by:
                user.id,

            created_by_name:
                user.name
        };

        DB.insert(
            'orders',
            o
        );

        DB.update(
            'quotes',
            qid,
            {
                status:'Convertida',
                converted_order_id:o.id||null,
                converted_order_number:on,
                converted_at:now
            }
        );

        UI.closeModal(
            'modal-to-order'
        );

        UI.toast(
            percentage>=99.9999
                ?'Pedido creado y pagado al 100%'
                :paid>0
                    ?`Pedido creado. Abono: ${Utils.formatMoney(paid)} (${percentage.toFixed(2)}%)`
                    :'Pedido creado sin abono',
            'success'
        );

        Modules.Quotes.render();

        this.render();
    }
},

Invoices:{
    showTrash:false,

    render:function(){
        const cid=Auth.currentCompany?.id;
        if(!cid)return;

        let d=DB.getAll('invoices',cid);

        if(!this.showTrash)
            d=d.filter(i=>i.status!=='Anulada');
        else
            d=d.filter(i=>i.status==='Anulada');

        d.sort((a,b)=>new Date(b.date)-new Date(a.date));

        const txt=(document.getElementById('filter-inv-text')?.value||'').toLowerCase();
        const status=document.getElementById('filter-inv-status')?.value||'';
        const dateStart=document.getElementById('filter-inv-date-start')?.value||'';
        const dateEnd=document.getElementById('filter-inv-date-end')?.value||'';

        d=d.filter(inv=>{
            const matchTxt=((inv.number||'')+(inv.client_name||''))
                .toLowerCase()
                .includes(txt);

            const matchStatus=status
                ? inv.status===status
                : true;

            let matchDate=true;

            if(dateStart)
                matchDate=matchDate&&new Date(inv.date)>=new Date(dateStart);

            if(dateEnd)
                matchDate=matchDate&&new Date(inv.date)<=new Date(dateEnd);

            return matchTxt&&matchStatus&&matchDate;
        });

        const tbody=document.getElementById('invoices-tbody');

        if(tbody)tbody.innerHTML=d.map(inv=>{

            let act=`
                <button class="btn btn-outline btn-sm"
                    onclick="App.printDocument('invoice','${inv.id}')">
                    🖨️
                </button>

                <button class="btn btn-outline btn-sm"
                    onclick="App.downloadPDF('invoice','${inv.id}')">
                    📥
                </button>

                <button class="btn btn-outline btn-sm"
                    onclick="Modules.Invoices.downloadXML('${inv.id}')">
                    📄 XML
                </button>
            `;

            if(inv.status!=='Anulada'){
                act+=`
                    <button class="btn btn-danger btn-sm"
                        onclick="Modules.Invoices.voidInvoice('${inv.id}')">
                        Anular
                    </button>
                `;
            }else{
                act+=`
                    <button class="btn btn-success btn-sm"
                        onclick="Modules.Invoices.restoreInvoice('${inv.id}')">
                        Restaurar
                    </button>
                `;
            }

            act+=`
                <button class="btn btn-outline btn-sm"
                    style="color:var(--danger)"
                    onclick="Auth.requestPin('delete','invoices','${inv.id}')">
                    🗑️
                </button>
            `;

            return `
                <tr>
                    <td><strong>${Utils.escape(inv.number||'')}</strong></td>
                    <td>${Utils.formatDate(inv.date)}</td>
                    <td>${Utils.escape(inv.client_name||'')}</td>
                    <td class="font-bold">${Utils.formatMoney(inv.total||0)}</td>
                    <td>
                        <span class="badge ${
                            inv.status==='Anulada'
                            ?'badge-danger'
                            :'badge-success'
                        }">
                            ${Utils.escape(inv.status||'')}
                        </span>
                    </td>
                    <td class="text-right">${act}</td>
                </tr>
            `;
        }).join('')||`
            <tr>
                <td colspan="6" class="text-center p-4">
                    Sin facturas
                </td>
            </tr>
        `;
    },

    toggleTrash:function(){
        this.showTrash=!this.showTrash;
        this.render();

        UI.toast(
            this.showTrash?'Anuladas':'Activas',
            'info'
        );
    },

    voidInvoice:function(id){

        /*
         * La anulación también requiere confirmación.
         * Si quieres que además pida PIN, se puede conectar
         * directamente con Auth.requestPin.
         */
        if(!UI.confirm('¿Anular? Se devuelve stock.'))
            return;

        const inv=DB.getOne('invoices',id);

        if(!inv)return;

        try{
            JSON.parse(inv.items).forEach(it=>{
                Modules.Inventory.updateStock(
                    it.prodId,
                    it.qty,
                    'ENTRADA',
                    'ANUL-'+inv.number
                );
            });
        }catch(e){
            console.error('Error devolviendo stock:',e);
        }

        DB.update('invoices',id,{
            status:'Anulada'
        });

        UI.toast('Factura anulada');

        this.render();
    },

    restoreInvoice:function(id){

        DB.update('invoices',id,{
            status:'Pagada'
        });

        UI.toast('Restaurada');

        this.render();
    },

    openFromOrder:function(oid){

        const tioi=document.getElementById('to-invoice-order-id');

        if(tioi)
            tioi.value=oid;

        const invDate=document.getElementById('inv-date');
        if(invDate)invDate.value=Utils.todayInputDate();

        UI.openModal('modal-to-invoice');
    },

    requestPin:function(){
        Auth.requestPin('invoice');
    },

    createFromOrder:function(){

        const tioi=document.getElementById('to-invoice-order-id');

        const oid=tioi?tioi.value:'';

        const o=DB.getOne('orders',oid);

        if(!o)return;

        const invNum=DB.getNextNumber('FAC');

        const inv={
            company_id:Auth.currentCompany.id,
            number:invNum,
            date:document.getElementById('inv-date')?.value||Utils.todayInputDate(),

            payment_method:
                document.getElementById('inv-payment-method')?.value||'',

            bank:
                document.getElementById('inv-bank')?.value||'',

            voucher:
                document.getElementById('inv-voucher')?.value||'',

            due_date:
                document.getElementById('inv-due-date')?.value||'',

            notes:
                document.getElementById('inv-notes')?.value||'',

            client_id:o.client_id,
            client_name:o.client_name,

            items:o.items,

            subtotal:Number(o.subtotal)||0,
            iva:Number(o.iva)||0,
            tax_breakdown:o.tax_breakdown||null,
            total:Number(o.total)||0,
            discount:Number(o.discount)||0,

            status:'Pagada',

            source_order:o.number
        };

        const invoiceId=DB.insert('invoices',inv);

        try{

            JSON.parse(o.items).forEach(it=>{

                Modules.Inventory.updateStock(
                    it.prodId,
                    -it.qty,
                    'SALIDA',
                    invNum
                );

            });

        }catch(e){

            console.error('Error actualizando stock:',e);

        }

        DB.update('orders',oid,{
            status:'Facturado'
        });

        UI.closeModal('modal-to-invoice');

        UI.toast('Factura generada');

        Modules.Orders.render();

        this.render();
    },

    /*
     * ==========================================================
     * GENERAR Y DESCARGAR XML SRI
     * ==========================================================
     */

    downloadXML:function(id){

        const inv=DB.getOne('invoices',id);

        if(!inv){
            UI.toast('Factura no encontrada','error');
            return;
        }

        const cid=Auth.currentCompany?.id;

        if(!cid){
            UI.toast('Empresa no encontrada','error');
            return;
        }

        const company=DB.getOne('companies',cid)||Auth.currentCompany;

        /*
         * Buscar cliente.
         */
        let client=null;

        if(inv.client_id){
            client=DB.getOne('clients',inv.client_id);
        }

        /*
         * Seguridad: no utilizar HTML sin escapar.
         */
        const xmlEscape=(value)=>{

            return String(value??'')
                .replace(/&/g,'&amp;')
                .replace(/</g,'&lt;')
                .replace(/>/g,'&gt;')
                .replace(/"/g,'&quot;')
                .replace(/'/g,'&apos;');

        };

        const money=(value)=>{

            const n=Number(value)||0;

            return n.toFixed(2);

        };

        /*
         * Fecha de emisión.
         */
        const date=new Date(inv.date);

        const fechaEmision=
            String(date.getDate()).padStart(2,'0')+'/'+
            String(date.getMonth()+1).padStart(2,'0')+'/'+
            date.getFullYear();

        /*
         * Número de factura.
         *
         * Si viene como 001-001-000000001
         * lo separamos.
         */
        let numero=String(inv.number||'');

        let partes=numero.split('-');

        let estab='001';
        let ptoEmi='001';
        let secuencial='000000001';

        if(partes.length===3){

            estab=String(partes[0]).padStart(3,'0');

            ptoEmi=String(partes[1]).padStart(3,'0');

            secuencial=String(partes[2]).padStart(9,'0');

        }else{

            secuencial=numero.replace(/\D/g,'').padStart(9,'0');

        }

        /*
         * Datos de empresa.
         *
         * Se utilizan diferentes nombres posibles
         * para adaptarse a tu DB.
         */
        const razonSocial=
            company.razonSocial||
            company.razon_social||
            company.business_name||
            company.name||
            '';

        const nombreComercial=
            company.nombreComercial||
            company.nombre_comercial||
            company.commercial_name||
            company.name||
            razonSocial;

        const ruc=
            company.ruc||
            company.RUC||
            company.tax_id||
            '1104985682001';

        const dirMatriz=
            company.dirMatriz||
            company.direccion||
            company.address||
            'CUENCA - ECUADOR';

        /*
         * Ambiente:
         *
         * 1 = pruebas
         * 2 = producción
         */
        const ambiente=
            company.ambiente||
            company.environment||
            '1';

        const tipoEmision='1';

        /*
         * ======================================================
         * DATOS DEL CLIENTE
         * ======================================================
         */

        const clientName=
            client?.name||
            client?.razonSocial||
            client?.razon_social||
            inv.client_name||
            'CONSUMIDOR FINAL';

        const clientId=
            client?.identification||
            client?.identificacion||
            client?.ruc||
            client?.cedula||
            inv.client_identification||
            '9999999999999';

        const clientAddress=
            client?.address||
            client?.direccion||
            inv.client_address||
            '';

        const clientEmail=
            client?.email||
            inv.client_email||
            '';

        /*
         * Tipo de identificación:
         *
         * 04 = RUC
         * 05 = Cédula
         * 06 = Pasaporte
         * 07 = Consumidor final
         */
        let tipoIdentificacion='07';

        if(clientId && clientId!=='9999999999999'){

            const cleanId=String(clientId).replace(/\D/g,'');

            if(cleanId.length===13)
                tipoIdentificacion='04';
            else if(cleanId.length===10)
                tipoIdentificacion='05';
            else
                tipoIdentificacion='06';
        }

        /*
         * ======================================================
         * DETALLES
         * ======================================================
         */

        let items=[];

        try{

            items=typeof inv.items==='string'
                ?JSON.parse(inv.items)
                :(inv.items||[]);

        }catch(e){

            items=[];

        }

        /*
         * IVA total.
         *
         * Se calcula desde los productos cuando existe
         * información de IVA individual.
         */
        let subtotalCalculado=0;

        /*
         * CORRECCIÓN: acumulador genérico por tarifa.
         * Antes solo se sumaban 15% y 5% en el total de
         * la factura; cualquier otra tarifa (0%, 8%, 12%,
         * etc.) se calculaba por línea pero se perdía en
         * el total y en el XML de impuestos.
         */
        const ivaPorTarifa={};

        const detalles=items.map((it,index)=>{

            const cantidad=Number(
                it.qty||
                it.quantity||
                1
            );

            const precio=Number(
                it.price||
                it.price1||
                it.unitPrice||
                it.precio||
                0
            );

            const descuento=Number(
                it.discount||
                it.descuento||
                0
            );

            const base=Math.max(
                0,
                (cantidad*precio)-descuento
            );

            /*
             * IVA del producto.
             */
            let tarifa=Number(
                it.iva!==undefined&&it.iva!==null
                    ?it.iva
                    :(it.tax!==undefined&&it.tax!==null
                        ?it.tax
                        :(it.taxRate!==undefined&&it.taxRate!==null?it.taxRate:15))
            );

            /*
             * Si el item trae prodId,
             * intentar obtener el producto original
             * SOLO como respaldo, cuando el item no
             * trae ya su propio IVA guardado.
             *
             * CORRECCIÓN: antes se usaba el IVA ACTUAL
             * del producto en Inventario, incluso si el
             * item ya traía su IVA correcto guardado desde
             * la cotización/pedido. Esto provocaba que la
             * factura descargada mostrara un IVA distinto
             * al que tenía el producto al momento de cotizar
             * (ej. producto con IVA 15% pero factura con 5%).
             * Ahora el IVA del item (tarifa, ya resuelto arriba
             * desde it.iva/it.tax/it.taxRate) tiene prioridad,
             * y el producto solo se usa si el item no trajo
             * ningún IVA propio.
             */
            let product=null;

            if(it.prodId){

                product=DB.getOne(
                    'products',
                    it.prodId
                );
            }

            if(product&&(it.iva===undefined||it.iva===null)){

                tarifa=Number(
                    product.iva!==undefined&&product.iva!==null
                        ?product.iva
                        :tarifa
                );
            }

            /*
             * Cálculo IVA.
             */
            let ivaValor=0;

            if(tarifa===15){

                ivaValor=base*0.15;

            }else if(tarifa===5){

                ivaValor=base*0.05;

            }else{

                /*
                 * Para otros porcentajes:
                 * calcular según tarifa.
                 */
                ivaValor=base*(tarifa/100);

            }

            /*
             * Acumular SIEMPRE por tarifa (incluye 15, 5
             * y cualquier otro porcentaje), para que el
             * total de la factura y el XML de impuestos
             * reflejen exactamente lo calculado por línea.
             */
            const claveTarifa=String(tarifa);
            if(!ivaPorTarifa[claveTarifa]){
                ivaPorTarifa[claveTarifa]={tarifa,base:0,valor:0};
            }
            ivaPorTarifa[claveTarifa].base+=base;
            ivaPorTarifa[claveTarifa].valor+=ivaValor;

            subtotalCalculado+=base;

            /*
             * Código SRI del porcentaje.
             *
             * IMPORTANTE:
             * Los códigos dependen de la tabla vigente
             * del SRI y deben validarse antes de producción.
             */
            let codigoPorcentaje='4';

            if(tarifa===0)
                codigoPorcentaje='0';
            else if(tarifa===5)
                codigoPorcentaje='5';
            else if(tarifa===15)
                codigoPorcentaje='4';

            return `
        <detalle>
            <codigoPrincipal>${xmlEscape(
                it.code||
                it.codigo||
                product?.code||
                String(index+1).padStart(3,'0')
            )}</codigoPrincipal>

            <descripcion>${xmlEscape(
                it.name||
                it.description||
                product?.name||
                'PRODUCTO'
            )}</descripcion>

            <cantidad>${cantidad.toFixed(2)}</cantidad>

            <precioUnitario>${money(precio)}</precioUnitario>

            <descuento>${money(descuento)}</descuento>

            <precioTotalSinImpuesto>${money(base)}</precioTotalSinImpuesto>

            <impuestos>
                <impuesto>

                    <codigo>2</codigo>

                    <codigoPorcentaje>${codigoPorcentaje}</codigoPorcentaje>

                    <tarifa>${tarifa.toFixed(2)}</tarifa>

                    <baseImponible>${money(base)}</baseImponible>

                    <valor>${money(ivaValor)}</valor>

                </impuesto>
            </impuestos>
        </detalle>`;
        }).join('');

        /*
         * ======================================================
         * TOTALES
         * ======================================================
         */

        const subtotal=
            Number(inv.subtotal)||subtotalCalculado;

        const descuento=
            Number(inv.discount)||0;

        /*
         * CORRECCIÓN: el total de IVA de la factura ahora se
         * calcula SIEMPRE a partir de la suma real por línea
         * (ivaPorTarifa), que ya respeta el IVA propio de cada
         * item/producto. Antes se prefería el valor guardado en
         * inv.iva (que podía no coincidir con el desglose real
         * por producto, o venir de un cálculo global antiguo),
         * lo que producía el desfase reportado (ej. producto con
         * IVA 15% mostrando 5% en la factura descargada).
         * Solo se usa inv.iva como respaldo si la factura no
         * tiene items para recalcular.
         */
        const ivaTotal=
            items.length
            ?Object.values(ivaPorTarifa).reduce((s,x)=>s+x.valor,0)
            :(Number.isFinite(Number(inv.iva))?Number(inv.iva):0);

        const total=
            Number(inv.total)||
            (subtotal-descuento+ivaTotal);

        /*
         * ======================================================
         * TOTAL CON IMPUESTOS
         * ======================================================
         *
         * CORRECCIÓN: se recorren TODAS las tarifas presentes en
         * la factura (no solo 15% y 5%), usando el mismo cálculo
         * por línea de arriba (ivaPorTarifa), así el XML de
         * impuestos siempre coincide con el desglose real.
         */

        let totalImpuestos='';

        Object.values(ivaPorTarifa)
            .sort((a,b)=>a.tarifa-b.tarifa)
            .forEach(({tarifa,base,valor})=>{

                if(valor<=0&&base<=0)return;

                let codigoPorcentaje='4';

                if(tarifa===0)
                    codigoPorcentaje='0';
                else if(tarifa===5)
                    codigoPorcentaje='5';
                else if(tarifa===15)
                    codigoPorcentaje='4';

                totalImpuestos+=`
            <totalImpuesto>
                <codigo>2</codigo>
                <codigoPorcentaje>${codigoPorcentaje}</codigoPorcentaje>
                <baseImponible>${money(base)}</baseImponible>
                <valor>${money(valor)}</valor>
            </totalImpuesto>`;
            });

        /*
         * ======================================================
         * FORMA DE PAGO
         * ======================================================
         *
         * 01 = Sin utilización del sistema financiero
         * Si tu sistema guarda otra forma de pago,
         * aquí podemos mapearla.
         */
        const formaPago=
            inv.forma_pago||
            inv.payment_method_code||
            '01';

        /*
         * ======================================================
         * CLAVE DE ACCESO
         * ======================================================
         *
         * La clave de acceso real del SRI requiere el algoritmo
         * correspondiente y dígito verificador.
         *
         * NO ponemos "..." porque eso produciría un XML
         * incompleto para envío.
         *
         * Si ya tienes claveAcceso guardada, se utiliza.
         */
        const claveAcceso=
            inv.claveAcceso||
            inv.clave_acceso||
            '';

        /*
         * ======================================================
         * XML
         * ======================================================
         */

        const xml=`<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">

    <infoTributaria>

        <ambiente>${xmlEscape(ambiente)}</ambiente>

        <tipoEmision>${tipoEmision}</tipoEmision>

        <razonSocial>${xmlEscape(razonSocial)}</razonSocial>

        <nombreComercial>${xmlEscape(nombreComercial)}</nombreComercial>

        <ruc>${xmlEscape(ruc)}</ruc>

        ${claveAcceso
            ?`<claveAcceso>${xmlEscape(claveAcceso)}</claveAcceso>`
            :''
        }

        <codDoc>01</codDoc>

        <estab>${xmlEscape(estab)}</estab>

        <ptoEmi>${xmlEscape(ptoEmi)}</ptoEmi>

        <secuencial>${xmlEscape(secuencial)}</secuencial>

        <dirMatriz>${xmlEscape(dirMatriz)}</dirMatriz>

    </infoTributaria>

    <infoFactura>

        <fechaEmision>${fechaEmision}</fechaEmision>

        <dirEstablecimiento>${xmlEscape(
            company.dirEstablecimiento||
            company.direccion||
            dirMatriz
        )}</dirEstablecimiento>

        <obligadoContabilidad>${xmlEscape(
            company.obligadoContabilidad||
            company.obligado_contabilidad||
            'NO'
        )}</obligadoContabilidad>

        <tipoIdentificacionComprador>${tipoIdentificacion}</tipoIdentificacion>

        <razonSocialComprador>${xmlEscape(clientName)}</razonSocialComprador>

        <identificacionComprador>${xmlEscape(clientId)}</identificacionComprador>

        ${clientAddress
            ?`<direccionComprador>${xmlEscape(clientAddress)}</direccionComprador>`
            :''
        }

        <totalSinImpuestos>${money(subtotal)}</totalSinImpuestos>

        <totalDescuento>${money(descuento)}</totalDescuento>

        <totalConImpuestos>
            ${totalImpuestos}
        </totalConImpuestos>

        <propina>0.00</propina>

        <importeTotal>${money(total)}</importeTotal>

        <moneda>DOLAR</moneda>

        <pagos>

            <pago>

                <formaPago>${xmlEscape(formaPago)}</formaPago>

                <total>${money(total)}</total>

                <plazo>0</plazo>

                <unidadTiempo>DIAS</unidadTiempo>

            </pago>

        </pagos>

    </infoFactura>

    <detalles>
        ${detalles}
    </detalles>

    ${
        clientEmail
        ?`
    <infoAdicional>

        <campoAdicional nombre="Email">${xmlEscape(
            clientEmail
        )}</campoAdicional>

    </infoAdicional>
        `
        :''
    }

</factura>`;

        /*
         * ======================================================
         * DESCARGAR
         * ======================================================
         */

        const blob=new Blob(
            [xml],
            {
                type:'application/xml;charset=utf-8'
            }
        );

        const url=URL.createObjectURL(blob);

        const a=document.createElement('a');

        a.href=url;

        a.download=
            `factura-${numero.replace(/\s/g,'')}.xml`;

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);

        setTimeout(()=>{
            URL.revokeObjectURL(url);
        },1000);

        UI.toast('XML descargado correctamente','success');
    }
},
Reservations:{tempItems:[],render:function(){const cid=Auth.currentCompany?.id;if(!cid)return;let d=DB.getAll('reservations',cid).sort((a,b)=>new Date(b.date)-new Date(a.date));const txt=(document.getElementById('filter-res-text')?.value||'').toLowerCase();const status=document.getElementById('filter-res-status')?.value||'';d=d.filter(r=>{const matchTxt=(r.number+r.client_name).toLowerCase().includes(txt);const matchStatus=status?r.status===status:true;return matchTxt&&matchStatus});const tbody=document.getElementById('res-tbody');if(tbody)tbody.innerHTML=d.map(r=>`<tr><td><strong>${r.number}</strong></td><td>${Utils.formatDate(r.date)}</td><td>${Utils.escape(r.client_name)}</td><td>${JSON.parse(r.items).length} items</td><td><span class="badge ${r.status==='Activa'?'badge-warning':'badge-success'}">${r.status}</span></td><td class="text-right"><button class="btn btn-outline btn-sm" onclick="App.printDocument('reservation','${r.id}')">🖨️</button> <button class="btn btn-outline btn-sm" onclick="App.downloadPDF('reservation','${r.id}')">📥</button> ${r.status==='Activa'?`<button class="btn btn-danger btn-sm" onclick="Modules.Reservations.cancel('${r.id}')">Cancelar</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6" class="text-center p-4">Sin reservas</td></tr>'},
openModal:function(){this.tempItems=[];const rit=document.getElementById('res-items-tbody');if(rit)rit.innerHTML='';const rd=document.getElementById('res-date');if(rd)rd.value=Utils.todayInputDate();const cid=Auth.currentCompany?.id;const cs=DB.getAll('clients',cid);const rc=document.getElementById('res-client');if(rc)rc.innerHTML=cs.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');const ps=DB.getAll('products',cid);const rp=document.getElementById('res-prod');if(rp)rp.innerHTML=ps.map(p=>`<option value="${p.id}" data-stock="${p.stock-(p.reserved||0)}">${p.name} (Disp: ${p.stock-(p.reserved||0)})</option>`).join('');const ri=document.getElementById('res-id');if(ri)ri.value='';UI.openModal('modal-res')},
addItem:function(){const rp=document.getElementById('res-prod');const s=rp;const pid=s?s.value:'';const pn=s&&s.options[s.selectedIndex]?s.options[s.selectedIndex].text.split(' (Disp')[0]:'';const av=s&&s.options[s.selectedIndex]?parseFloat(s.options[s.selectedIndex].dataset.stock):0;const rq=document.getElementById('res-qty');const q=rq?parseFloat(rq.value)||0:0;if(q>av)return UI.toast('Stock insuficiente','error');this.tempItems.push({prodId:pid,prodName:pn,qty:q,available:av});this.renderItems()},
renderItems:function(){const tbody=document.getElementById('res-items-tbody');if(tbody)tbody.innerHTML=this.tempItems.map((it,i)=>`<tr><td>${it.prodName}</td><td>${it.qty}</td><td>${it.available}</td><td><button onclick="Modules.Reservations.removeItem(${i})" style="color:red;background:none;border:none">✕</button></td></tr>`).join('')},
removeItem:function(i){this.tempItems.splice(i,1);this.renderItems()},
save:function(){const ri=document.getElementById('res-id');const id=ri?ri.value:'';if(this.tempItems.length===0)return UI.toast('Agregue productos','error');const num=id?DB.getOne('reservations',id).number:DB.getNextNumber('RES');const rc=document.getElementById('res-client');const cn=rc&&rc.options[rc.selectedIndex]?rc.options[rc.selectedIndex].text:'';const r={company_id:Auth.currentCompany.id,number:num,date:(document.getElementById('res-date')?.value||''),client_id:rc?rc.value:'',client_name:cn,items:JSON.stringify(this.tempItems),status:id?DB.getOne('reservations',id).status:'Activa'};if(id)DB.update('reservations',id,r);else{DB.insert('reservations',r);const self=this;this.tempItems.forEach(function(it){Modules.Inventory.updateReserved(it.prodId,it.qty)})}UI.closeModal('modal-res');UI.toast('Guardado');this.render()},
cancel:function(id){if(!UI.confirm('¿Cancelar y liberar stock?'))return;const r=DB.getOne('reservations',id);try{JSON.parse(r.items).forEach(it=>Modules.Inventory.updateReserved(it.prodId,-it.qty))}catch(e){}DB.update('reservations',id,{status:'Cancelada'});UI.toast('Cancelada');this.render()}},
Purchases:{tempItems:[],render:function(){const cid=Auth.currentCompany?.id;if(!cid)return;let d=DB.getAll('purchases',cid).sort((a,b)=>new Date(b.date)-new Date(a.date));const txt=(document.getElementById('filter-purch-text')?.value||'').toLowerCase();const status=document.getElementById('filter-purch-status')?.value||'';d=d.filter(p=>{const matchTxt=(p.number+p.provider).toLowerCase().includes(txt);const matchStatus=status?p.status===status:true;return matchTxt&&matchStatus});const tbody=document.getElementById('purch-tbody');if(tbody)tbody.innerHTML=d.map(p=>`<tr><td><strong>${p.number}</strong></td><td>${Utils.formatDate(p.date)}</td><td>${Utils.escape(p.provider)}</td><td class="font-bold">${JSON.parse(p.items).length} items</td><td><span class="badge ${p.status==='Recibido'?'badge-success':p.status==='Retrasado'?'badge-danger':'badge-info'}">${p.status}</span></td><td>${p.delay_reason?Utils.escape(p.delay_reason):'-'}</td><td class="text-right"><button class="btn btn-outline btn-sm" onclick="Modules.Purchases.edit('${p.id}')">✏️</button> <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="Auth.requestPin('delete','purchases','${p.id}')">🗑️</button></td></tr>`).join('')||'<tr><td colspan="7" class="text-center p-4">Sin compras</td></tr>'},
openModal:function(){this.tempItems=[];const pit=document.getElementById('purch-items-tbody');if(pit)pit.innerHTML='';const pd=document.getElementById('purch-date');if(pd)pd.value=Utils.todayInputDate();const cid=Auth.currentCompany?.id;const ps=DB.getAll('products',cid);const pp=document.getElementById('purch-prod');if(pp)pp.innerHTML=ps.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');const pi=document.getElementById('purch-id');if(pi)pi.value='';UI.openModal('modal-purch')},
edit:function(id){this.openModal(id)},
toggleDelayReason:function(){const ps=document.getElementById('purch-status');const st=ps?ps.value:'';const pdg=document.getElementById('purch-delay-group');if(pdg)pdg.style.display=st==='Retrasado'?'block':'none'},
addItem:function(){const pp=document.getElementById('purch-prod');const s=pp;const pid=s?s.value:'';const pn=s&&s.options[s.selectedIndex]?s.options[s.selectedIndex].text:'';const pq=document.getElementById('purch-qty');const q=pq?parseFloat(pq.value)||0:0;if(q<=0)return UI.toast('Cantidad inválida','error');this.tempItems.push({prodId:pid,prodName:pn,qty:q});const tbody=document.getElementById('purch-items-tbody');if(tbody)tbody.innerHTML=this.tempItems.map((it,i)=>`<tr><td>${it.prodName}</td><td>${it.qty}</td><td><button onclick="Modules.Purchases.removeItem(${i})" style="color:red;background:none;border:none">✕</button></td></tr>`).join('')},
removeItem:function(i){this.tempItems.splice(i,1);const tbody=document.getElementById('purch-items-tbody');if(tbody)tbody.innerHTML=this.tempItems.map((it,i)=>`<tr><td>${it.prodName}</td><td>${it.qty}</td><td><button onclick="Modules.Purchases.removeItem(${i})" style="color:red;background:none;border:none">✕</button></td></tr>`).join('')},
save:function(){if(this.tempItems.length===0)return UI.toast('Agregue productos','error');const ps=document.getElementById('purch-status');const status=ps?ps.value:'';if(status==='Retrasado'){const pdr=document.getElementById('purch-delay-reason');if(!pdr||!pdr.value)return UI.toast('Indique motivo','error')}const pi=document.getElementById('purch-id');const id=pi?pi.value:'';const prov=document.getElementById('purch-prov');const num=DB.getNextNumber('COM');const p={company_id:Auth.currentCompany.id,number:num,date:(document.getElementById('purch-date')?.value||''),provider:prov?prov.value:'',items:JSON.stringify(this.tempItems),status:status,delay_reason:(document.getElementById('purch-delay-reason')?.value||'')};if(id)DB.update('purchases',id,p);else DB.insert('purchases',p);if(status==='Recibido'){const self=this;this.tempItems.forEach(function(it){Modules.Inventory.updateStock(it.prodId,it.qty,'ENTRADA',num)})}UI.closeModal('modal-purch');UI.toast('Guardado');this.render()}},
Logistics:{render:function(){const cid=Auth.currentCompany?.id;if(!cid)return;let d=DB.getAll('logistics',cid).sort((a,b)=>new Date(b.date)-new Date(a.date));const txt=(document.getElementById('filter-log-text')?.value||'').toLowerCase();const st=document.getElementById('filter-log-status')?.value||'';d=d.filter(l=>{const matchTxt=(l.guide+l.client_name+l.carrier).toLowerCase().includes(txt);const matchSt=!st||l.status===st;return matchTxt&&matchSt});const tbody=document.getElementById('logistics-tbody');if(tbody)tbody.innerHTML=d.map(l=>`<tr><td><strong>${l.guide}</strong></td><td>${Utils.formatDate(l.date)}</td><td>${Utils.escape(l.client_name||'')}</td><td>${Utils.escape(l.carrier||'')}</td><td><span class="badge ${l.status==='Entregado'?'badge-success':'badge-info'}">${l.status}</span></td><td class="text-right"><button class="btn btn-outline btn-sm" onclick="App.printDocument('logistics','${l.id}')">🖨️</button> <button class="btn btn-outline btn-sm" onclick="App.downloadPDF('logistics','${l.id}')">📥</button></td></tr>`).join('')||'<tr><td colspan="6" class="text-center p-4">Sin despachos</td></tr>'},
openModal:function(){const form=document.querySelector('#modal-logistics form');if(form)form.reset();const li=document.getElementById('log-id');if(li)li.value='';const ld=document.getElementById('log-date');if(ld)ld.value=Utils.todayInputDate();const cid=Auth.currentCompany?.id;const lo=document.getElementById('log-order');if(lo)lo.innerHTML='<option value="">-- Seleccione --</option>'+DB.getAll('orders',cid).filter(o=>o.status!=='Facturado').map(o=>`<option value="${o.id}">${o.number} - ${o.client_name}</option>`).join('');UI.openModal('modal-logistics')},
save:function(){const lg=document.getElementById('log-guide');const guide=lg?lg.value:'';if(!guide)return UI.toast('Guía obligatoria','error');const lo=document.getElementById('log-order');const orderId=lo?lo.value:'';const opt=lo&&lo.selectedOptions[0]?lo.selectedOptions[0]:null;const clientName=orderId?(opt?opt.dataset.client:''):'Directo';const li=document.getElementById('log-id');const id=li?li.value:'';const d={company_id:Auth.currentCompany.id,guide:guide,date:(document.getElementById('log-date')?.value||''),carrier:(document.getElementById('log-carrier')?.value||''),order_id:orderId,client_name:clientName,weight:parseFloat((document.getElementById('log-weight')?.value||'0')),volume:parseFloat((document.getElementById('log-volume')?.value||'0')),cost:parseFloat((document.getElementById('log-cost')?.value||'0')),address:(document.getElementById('log-address')?.value||''),status:(document.getElementById('log-status')?.value||'')};if(id)DB.update('logistics',id,d);else DB.insert('logistics',d);UI.closeModal('modal-logistics');UI.toast('Guardado');this.render()}},
/* ================================================================
 * CONTROL CENTRAL DE ACCESO / ROLES
 * ================================================================ */

Access:{

    /*
     * ============================================================
     * ROLES OFICIALES
     * ============================================================
     */

    ROLES:{
        SYSTEM:'Administrador del Sistema',
        COMPANY:'Administrador de Empresa',
        ADVISOR:'Asesor',
        INVOICER:'Facturadora'
    },

    /*
     * ============================================================
     * OBTENER USUARIO ACTUAL
     * ============================================================
     */

    getUser:function(){

        return (
            Auth.currentUser ||
            Auth.user ||
            Auth.current_user ||
            {}
        );
    },

    /*
     * ============================================================
     * OBTENER ROL ACTUAL
     * ============================================================
     */

    getRole:function(){

        const u=this.getUser();

        return String(
            u.role ||
            u.rol ||
            ''
        ).trim();
    },

    /*
     * ============================================================
     * NORMALIZAR ROL
     * ============================================================
     *
     * Esto permite que usuarios antiguos que todavía tengan
     * "Vendedor" pasen automáticamente a comportarse como
     * "Asesor".
     */

    normalizeRole:function(role){

        const r=String(role||'')
            .trim()
            .toLowerCase();

        if(
            r==='vendedor' ||
            r==='asesor'
        ){
            return this.ROLES.ADVISOR;
        }

        if(
            r==='administrador del sistema' ||
            r==='admin sistema' ||
            r==='superadmin' ||
            r==='system'
        ){
            return this.ROLES.SYSTEM;
        }

        if(
            r==='administrador de empresa' ||
            r==='administrador empresa' ||
            r==='admin empresa'
        ){
            return this.ROLES.COMPANY;
        }

        if(
            r==='facturadora' ||
            r==='facturador'
        ){
            return this.ROLES.INVOICER;
        }

        return String(role||'');
    },

    /*
     * ============================================================
     * ROL ACTUAL NORMALIZADO
     * ============================================================
     */

    currentRole:function(){

        return this.normalizeRole(
            this.getRole()
        );
    },

    /*
     * ============================================================
     * COMPROBACIONES
     * ============================================================
     */

    isSystemAdmin:function(){

        return this.currentRole()===
            this.ROLES.SYSTEM;
    },

    isCompanyAdmin:function(){

        return this.currentRole()===
            this.ROLES.COMPANY;
    },

    isAdvisor:function(){

        return this.currentRole()===
            this.ROLES.ADVISOR;
    },

    isInvoicer:function(){

        return this.currentRole()===
            this.ROLES.INVOICER;
    },

    /*
     * Administrador de Empresa + Sistema
     */

    isAdmin:function(){

        return(
            this.isSystemAdmin() ||
            this.isCompanyAdmin()
        );
    },

    /*
     * ============================================================
     * PERMISOS DE MÓDULOS
     * ============================================================
     */

    can:function(permission){

        const role=this.currentRole();

        /*
         * ADMINISTRADOR DEL SISTEMA
         * TODO
         */

        if(role===this.ROLES.SYSTEM){

            return true;
        }

        /*
         * ADMINISTRADOR DE EMPRESA
         */

        if(role===this.ROLES.COMPANY){

            const allowed=[
                'dashboard',
                'clients',
                'quotes',
                'orders',
                'logistics',
                'invoices',
                'inventory',
                'purchases',
                'finance',
                'users',
                'config',
                'products',
                'delete',
                'audit'
            ];

            return allowed.includes(permission);
        }

        /*
         * FACTURADORA
         */

        if(role===this.ROLES.INVOICER){

            const allowed=[
                'dashboard',
                'clients',
                'quotes',
                'orders',
                'logistics',
                'invoices',
                'finance'
            ];

            return allowed.includes(permission);
        }

        /*
         * ASESOR
         */

        if(role===this.ROLES.ADVISOR){

            const allowed=[
                'dashboard',
                'clients',
                'quotes',
                'orders',
                'logistics',
                'users',
            ];

            return allowed.includes(permission);
        }

        return false;
    },

    /*
     * ============================================================
     * PERMISOS ESPECIALES
     * ============================================================
     */

    canCreateProducts:function(){

        /*
         * ÚNICAMENTE:
         *
         * Administrador del Sistema
         * Administrador de Empresa
         */

        return(
            this.isSystemAdmin() ||
            this.isCompanyAdmin()
        );
    },

    canInvoice:function(){

        /*
         * Facturadora y administradores.
         */

        return(
            this.isSystemAdmin() ||
            this.isCompanyAdmin() ||
            this.isInvoicer()
        );
    },

    canConvertOrderToInvoice:function(){

        return this.canInvoice();
    },

    canManageUsers:function(){

        /*
         * Solo Sistema y Administrador de Empresa.
         *
         * Pero ninguno puede crear un Administrador del Sistema
         * excepto el Administrador del Sistema.
         */

        return(
            this.isSystemAdmin() ||
            this.isCompanyAdmin()
        );
    },

    canCreateSystemAdmin:function(){

        return this.isSystemAdmin();
    },

    canSeeCompanies:function(){

        return this.isSystemAdmin();
    },

    canManageCompanies:function(){

        return this.isSystemAdmin();
    },

    canSeeAudit:function(){

        /*
         * La auditoría completa es exclusiva del
         * Administrador del Sistema.
         */

        return this.isSystemAdmin();
    },

    canDelete:function(){

        /*
         * El Administrador del Sistema puede eliminar todo.
         *
         * El Administrador de Empresa puede eliminar aquello
         * permitido dentro de su empresa y debe pasar por
         * auditoría/PIN.
         */

        return(
            this.isSystemAdmin() ||
            this.isCompanyAdmin()
        );
    },

    /*
     * ============================================================
     * VALIDAR Y MOSTRAR MENSAJE
     * ============================================================
     */

    require:function(permission,message){

        if(this.can(permission)){

            return true;
        }

        UI.toast(
            message ||
            'No tiene permisos para realizar esta acción',
            'error'
        );

        return false;
    },

    requireSystem:function(message){

        if(this.isSystemAdmin()){

            return true;
        }

        UI.toast(
            message ||
            'Solo el Administrador del Sistema puede realizar esta acción',
            'error'
        );

        return false;
    },

    requireAdmin:function(message){

        if(this.isAdmin()){

            return true;
        }

        UI.toast(
            message ||
            'No tiene permisos de administrador',
            'error'
        );

        return false;
    },

    /*
     * ============================================================
     * NORMALIZAR ROLES EXISTENTES
     * ============================================================
     *
     * Convierte "Vendedor" en "Asesor".
     *
     * No elimina usuarios.
     */

    migrateOldRoles:function(){

        try{

            const users=DB.getAll('users');

            users.forEach(u=>{

                if(
                    String(u.role||'')
                        .trim()
                        .toLowerCase()==='vendedor'
                ){

                    DB.update(
                        'users',
                        u.id,
                        {
                            role:this.ROLES.ADVISOR
                        }
                    );
                }

            });

        }catch(e){

            console.error(
                'Error migrando roles:',
                e
            );
        }
    },

    /*
     * ============================================================
     * BLOQUEAR MENÚS
     * ============================================================
     *
     * Si tu sistema tiene elementos con data-module,
     * también podemos ocultarlos.
     */

    applyMenu:function(){

        try{

            const rules={

                companies:this.canSeeCompanies(),

                roles:this.isSystemAdmin() ||
                      this.isCompanyAdmin(),

                users:this.canManageUsers(),

                config:this.can('config'),

                audit:this.canSeeAudit(),

                inventory:this.can('inventory'),

                purchases:this.can('purchases'),

                finance:this.can('finance'),

                invoices:this.can('invoices'),

                logistics:this.can('logistics'),

                orders:this.can('orders'),

                quotes:this.can('quotes'),

                clients:this.can('clients')

            };

            Object.keys(rules).forEach(module=>{

                const allowed=rules[module];

                document
                    .querySelectorAll(
                        `[data-module="${module}"],`+
                        `[data-section="${module}"],`+
                        `[data-permission="${module}"]`
                    )
                    .forEach(el=>{

                        el.style.display=
                            allowed
                                ?''
                                :'none';
                    });

            });

        }catch(e){

            console.error(
                'Error aplicando menú:',
                e
            );
        }
    }
},


/* ================================================================
 * EMPRESAS
 * ================================================================ */

Companies:{

    render:function(){

        /*
         * EMPRESAS = SOLO ADMINISTRADOR DEL SISTEMA
         */

        if(
            !Modules.Access.requireSystem(
                'Las empresas solo pueden ser administradas por el Administrador del Sistema'
            )
        ){

            return;
        }

        const comps=
            DB.getAll('companies');

        const branches=
            DB.getAll('branches');

        const clt=
            document.getElementById(
                'comp-list-tbody'
            );

        if(clt){

            clt.innerHTML=

                comps.map(c=>`

                    <tr>

                        <td>
                            <strong>
                                ${Utils.escape(c.name||'')}
                            </strong>
                        </td>

                        <td>
                            ${Utils.escape(c.ruc||'')}
                        </td>

                    </tr>

                `).join('')

                ||

                `
                    <tr>
                        <td
                            colspan="2"
                            class="text-center p-4">
                            Sin empresas
                        </td>
                    </tr>
                `;
        }

        const blt=
            document.getElementById(
                'branch-list-tbody'
            );

        if(blt){

            blt.innerHTML=

                branches.map(b=>{

                    const comp=
                        comps.find(c=>
                            c.id===b.company_id
                        );

                    return`

                        <tr>

                            <td>
                                ${Utils.escape(
                                    comp
                                        ?comp.name
                                        :'N/A'
                                )}
                            </td>

                            <td>
                                <strong>
                                    ${Utils.escape(
                                        b.name||''
                                    )}
                                </strong>
                            </td>

                        </tr>

                    `;

                }).join('')

                ||

                `
                    <tr>
                        <td
                            colspan="2"
                            class="text-center p-4">
                            Sin sucursales
                        </td>
                    </tr>
                `;
        }
    },

    openCompanyModal:function(){

        if(
            !Modules.Access.requireSystem()
        ){

            return;
        }

        UI.openModal(
            'modal-company-mgmt'
        );
    },

    openBranchModal:function(){

        if(
            !Modules.Access.requireSystem()
        ){

            return;
        }

        const mbc=
            document.getElementById(
                'mgmt-branch-comp'
            );

        if(mbc){

            mbc.innerHTML=

                DB.getAll('companies')
                    .map(c=>`

                        <option value="${c.id}">
                            ${Utils.escape(c.name)}
                        </option>

                    `)
                    .join('');
        }

        UI.openModal(
            'modal-branch-mgmt'
        );
    },

    saveCompany:function(){

        if(
            !Modules.Access.requireSystem()
        ){

            return;
        }

        const mcn=
            document.getElementById(
                'mgmt-comp-name'
            );

        const mcr=
            document.getElementById(
                'mgmt-comp-ruc'
            );

        const name=
            mcn?mcn.value:'';

        const ruc=
            mcr?mcr.value:'';

        if(!name||!ruc){

            return UI.toast(
                'Complete nombre y RUC',
                'error'
            );
        }

        DB.insert(
            'companies',
            {
                name:name,
                ruc:ruc,
                address:'',
                phone:'',
                iva:15,
                currency:'USD'
            }
        );

        UI.closeModal(
            'modal-company-mgmt'
        );

        UI.toast(
            'Empresa creada correctamente',
            'success'
        );

        this.render();
    },

    saveBranch:function(){

        if(
            !Modules.Access.requireSystem()
        ){

            return;
        }

        const mbc=
            document.getElementById(
                'mgmt-branch-comp'
            );

        const mbn=
            document.getElementById(
                'mgmt-branch-name'
            );

        const compId=
            mbc?mbc.value:'';

        const name=
            mbn?mbn.value:'';

        if(!compId){

            return UI.toast(
                'Seleccione una empresa',
                'error'
            );
        }

        if(!name){

            return UI.toast(
                'Nombre obligatorio',
                'error'
            );
        }

        DB.insert(
            'branches',
            {
                company_id:compId,
                name:name,
                location:''
            }
        );

        UI.closeModal(
            'modal-branch-mgmt'
        );

        UI.toast(
            'Sucursal creada correctamente',
            'success'
        );

        this.render();
    }
},


/* ================================================================
 * ROLES
 * ================================================================ */

Roles:{

    /*
     * ============================================================
     * ROLES PREDEFINIDOS
     * ============================================================
     */

    getDefaultRoles:function(){

        return [

            {
                name:'Administrador del Sistema',

                desc:
                    'Acceso total al sistema, empresas, usuarios y auditoría.',

                perms:{
                    dashboard:true,
                    clients:true,
                    quotes:true,
                    orders:true,
                    invoices:true,
                    inventory:true,
                    purchases:true,
                    logistics:true,
                    finance:true,
                    users:true,
                    config:true,
                    products:true,
                    audit:true,
                    companies:true
                }
            },

            {
                name:'Administrador de Empresa',

                desc:
                    'Administrador completo de la empresa.',

                perms:{
                    dashboard:true,
                    clients:true,
                    quotes:true,
                    orders:true,
                    invoices:true,
                    inventory:true,
                    purchases:true,
                    logistics:true,
                    finance:true,
                    users:true,
                    config:true,
                    products:true,
                    audit:false,
                    companies:false
                }
            },

            {
                name:'Asesor',

                desc:
                    'Gestiona clientes, cotizaciones, pedidos y cargo logístico. No puede facturar.',

                perms:{
                    dashboard:true,
                    clients:true,
                    quotes:true,
                    orders:true,
                    invoices:false,
                    inventory:false,
                    purchases:false,
                    logistics:true,
                    finance:false,
                    users:true,
                    config:false,
                    products:false,
                    audit:false,
                    companies:false
                }
            },

            {
                name:'Facturadora',

                desc:
                    'Puede gestionar el proceso comercial y realizar facturación.',

                perms:{
                    dashboard:true,
                    clients:true,
                    quotes:true,
                    orders:true,
                    invoices:true,
                    inventory:false,
                    purchases:false,
                    logistics:true,
                    finance:true,
                    users:false,
                    config:false,
                    products:false,
                    audit:false,
                    companies:false
                }
            }

        ];
    },

    /*
     * ============================================================
     * CREAR ROLES BASE
     * ============================================================
     */

    ensureDefaultRoles:function(){

        const existing=
            DB.getAll('roles');

        const defaults=
            this.getDefaultRoles();

        defaults.forEach(def=>{

            /*
             * Buscar por nombre actual.
             */

            let found=
                existing.find(r=>
                    String(r.name||'')
                        .toLowerCase()===
                    def.name.toLowerCase()
                );

            /*
             * Migrar Vendedor -> Asesor
             */

            if(
                def.name==='Asesor' &&
                !found
            ){

                found=
                    existing.find(r=>
                        String(r.name||'')
                            .toLowerCase()==='vendedor'
                    );

                if(found){

                    DB.update(
                        'roles',
                        found.id,
                        {
                            name:'Asesor',
                            desc:def.desc,
                            perms:def.perms
                        }
                    );

                    found=true;
                }
            }

            if(!found){

                DB.insert(
                    'roles',
                    def
                );
            }

        });
    },

    render:function(){

        /*
         * Solo administradores pueden gestionar roles.
         *
         * Administrador de Empresa puede gestionar roles de
         * empresa, pero NO puede crear Administrador del Sistema.
         */

        if(
            !Modules.Access.isSystemAdmin() &&
            !Modules.Access.isCompanyAdmin()
        ){

            return UI.toast(
                'No tiene permisos para administrar roles',
                'error'
            );
        }

        this.ensureDefaultRoles();

        const roles=
            DB.getAll('roles');

        const users=
            DB.getAll('users');

        const tbody=
            document.getElementById(
                'roles-tbody'
            );

        if(!tbody)return;

        const currentRole=
            Modules.Access.currentRole();

        /*
         * El Administrador de Empresa NO ve el rol
         * Administrador del Sistema.
         */

        const visibleRoles=
            roles.filter(r=>{

                if(
                    currentRole===
                    Modules.Access.ROLES.SYSTEM
                ){

                    return true;
                }

                return(
                    Modules.Access.normalizeRole(
                        r.name
                    )!==
                    Modules.Access.ROLES.SYSTEM
                );
            });

        tbody.innerHTML=

            visibleRoles.map(r=>{

                const perms=
                    Object.keys(
                        r.perms||{}
                    ).filter(k=>
                        r.perms[k]
                    ).length;

                const userCount=
                    users.filter(u=>
                        Modules.Access.normalizeRole(
                            u.role
                        )===
                        Modules.Access.normalizeRole(
                            r.name
                        )
                    ).length;

                return`

                    <tr>

                        <td>
                            <strong>
                                ${Utils.escape(
                                    Modules.Access.normalizeRole(
                                        r.name
                                    )
                                )}
                            </strong>
                        </td>

                        <td>
                            ${Utils.escape(
                                r.desc||''
                            )}
                        </td>

                        <td>
                            <span class="badge badge-info">
                                ${perms} permisos
                            </span>
                        </td>

                        <td>
                            ${userCount}
                        </td>

                        <td class="text-right">

                            <button
                                class="btn btn-outline btn-sm"
                                onclick="
                                    Modules.Roles.edit('${r.id}')
                                ">
                                ✏️
                            </button>

                            ${
                                Modules.Access.isSystemAdmin()
                                ?`
                                    <button
                                        class="btn btn-outline btn-sm"
                                        style="color:var(--danger)"
                                        onclick="
                                            Auth.requestPin(
                                                'delete',
                                                'roles',
                                                '${r.id}'
                                            )
                                        ">
                                        🗑️
                                    </button>
                                `
                                :''
                            }

                        </td>

                    </tr>

                `;

            }).join('')

            ||

            `
                <tr>
                    <td
                        colspan="5"
                        class="text-center p-4">
                        Sin roles
                    </td>
                </tr>
            `;
    },

    openModal:function(id){

        if(
            !Modules.Access.isSystemAdmin() &&
            !Modules.Access.isCompanyAdmin()
        ){

            return UI.toast(
                'No tiene permisos para administrar roles',
                'error'
            );
        }

        const ri=
            document.getElementById(
                'role-id'
            );

        if(ri)ri.value='';

        const rn=
            document.getElementById(
                'role-name'
            );

        if(rn)rn.value='';

        const rd=
            document.getElementById(
                'role-desc'
            );

        if(rd)rd.value='';

        document
            .querySelectorAll(
                '[id^="perm-"]'
            )
            .forEach(c=>
                c.checked=false
            );

        if(id){

            const r=
                DB.getOne(
                    'roles',
                    id
                );

            if(!r){

                return UI.toast(
                    'Rol no encontrado',
                    'error'
                );
            }

            /*
             * Administrador de Empresa jamás puede editar
             * el Administrador del Sistema.
             */

            if(
                !Modules.Access.isSystemAdmin() &&
                Modules.Access.normalizeRole(
                    r.name
                )===
                Modules.Access.ROLES.SYSTEM
            ){

                return UI.toast(
                    'No puede modificar el Administrador del Sistema',
                    'error'
                );
            }

            const mt=
                document.getElementById(
                    'role-modal-title'
                );

            if(mt){

                mt.textContent=
                    'Editar Rol';
            }

            if(ri)ri.value=r.id;

            if(rn)rn.value=
                Modules.Access.normalizeRole(
                    r.name
                );

            if(rd)rd.value=
                r.desc||'';

            const perms=
                r.perms||{};

            const setCheck=(iid,val)=>{

                const el=
                    document.getElementById(
                        iid
                    );

                if(el)el.checked=!!val;
            };

            setCheck(
                'perm-dashboard',
                perms.dashboard
            );

            setCheck(
                'perm-clients',
                perms.clients
            );

            setCheck(
                'perm-quotes',
                perms.quotes
            );

            setCheck(
                'perm-orders',
                perms.orders
            );

            setCheck(
                'perm-invoices',
                perms.invoices
            );

            setCheck(
                'perm-inventory',
                perms.inventory
            );

            setCheck(
                'perm-purchases',
                perms.purchases
            );

            setCheck(
                'perm-logistics',
                perms.logistics
            );

            setCheck(
                'perm-finance',
                perms.finance
            );

            setCheck(
                'perm-users',
                perms.users
            );

            setCheck(
                'perm-config',
                perms.config
            );

        }else{

            const mt=
                document.getElementById(
                    'role-modal-title'
                );

            if(mt){

                mt.textContent=
                    'Nuevo Rol';
            }

        }

        UI.openModal(
            'modal-role'
        );
    },

    edit:function(id){

        this.openModal(id);
    },

    save:function(){

        if(
            !Modules.Access.isSystemAdmin() &&
            !Modules.Access.isCompanyAdmin()
        ){

            return UI.toast(
                'No tiene permisos para administrar roles',
                'error'
            );
        }

        const ri=
            document.getElementById(
                'role-id'
            );

        const id=
            ri?ri.value:'';

        const rn=
            document.getElementById(
                'role-name'
            );

        let name=
            rn?rn.value:'';

        name=
            Modules.Access.normalizeRole(
                name
            );

        if(!name){

            return UI.toast(
                'Nombre del rol obligatorio',
                'error'
            );
        }

        /*
         * Administrador de Empresa NO puede crear
         * Administrador del Sistema.
         */

        if(
            !Modules.Access.isSystemAdmin() &&
            name===
            Modules.Access.ROLES.SYSTEM
        ){

            return UI.toast(
                'Solo el Administrador del Sistema puede crear ese rol',
                'error'
            );
        }

        /*
         * Si edita un rol existente.
         */

        if(id){

            const old=
                DB.getOne(
                    'roles',
                    id
                );

            if(
                old &&
                !Modules.Access.isSystemAdmin() &&
                Modules.Access.normalizeRole(
                    old.name
                )===
                Modules.Access.ROLES.SYSTEM
            ){

                return UI.toast(
                    'No puede modificar ese rol',
                    'error'
                );
            }
        }

        /*
         * IMPORTANTE:
         * Forzamos permisos de seguridad para los roles
         * principales.
         */

        let perms={

            dashboard:
                document.getElementById(
                    'perm-dashboard'
                )?.checked||false,

            clients:
                document.getElementById(
                    'perm-clients'
                )?.checked||false,

            quotes:
                document.getElementById(
                    'perm-quotes'
                )?.checked||false,

            orders:
                document.getElementById(
                    'perm-orders'
                )?.checked||false,

            invoices:
                document.getElementById(
                    'perm-invoices'
                )?.checked||false,

            inventory:
                document.getElementById(
                    'perm-inventory'
                )?.checked||false,

            purchases:
                document.getElementById(
                    'perm-purchases'
                )?.checked||false,

            logistics:
                document.getElementById(
                    'perm-logistics'
                )?.checked||false,

            finance:
                document.getElementById(
                    'perm-finance'
                )?.checked||false,

            users:
                document.getElementById(
                    'perm-users'
                )?.checked||false,

            config:
                document.getElementById(
                    'perm-config'
                )?.checked||false
        };

        /*
         * ASESOR
         *
         * JAMÁS puede facturar.
         */

        if(
            name===
            Modules.Access.ROLES.ADVISOR
        ){

            perms.invoices=false;

            perms.inventory=false;

            perms.purchases=false;

            perms.finance=false;

            perms.users=true;

            perms.config=false;
        }

        /*
         * FACTURADORA
         */

        if(
            name===
            Modules.Access.ROLES.INVOICER
        ){

            perms.invoices=true;

            perms.quotes=true;

            perms.orders=true;

            perms.logistics=true;

            perms.clients=true;

            perms.dashboard=true;

            perms.users=false;

            perms.config=false;

            perms.inventory=false;

            perms.purchases=false;
        }

        /*
         * ADMINISTRADOR DE EMPRESA
         */

        if(
            name===
            Modules.Access.ROLES.COMPANY
        ){

            perms.invoices=true;

            perms.inventory=true;

            perms.purchases=true;

            perms.finance=true;

            perms.users=true;

            perms.config=true;

            perms.clients=true;

            perms.quotes=true;

            perms.orders=true;

            perms.logistics=true;

            /*
             * Empresas siempre bloqueado.
             */
            perms.companies=false;
        }

        /*
         * ADMINISTRADOR DEL SISTEMA
         */

        if(
            name===
            Modules.Access.ROLES.SYSTEM
        ){

            perms={
                dashboard:true,
                clients:true,
                quotes:true,
                orders:true,
                invoices:true,
                inventory:true,
                purchases:true,
                logistics:true,
                finance:true,
                users:true,
                config:true,
                products:true,
                audit:true,
                companies:true
            };
        }

        const d={

            name:name,

            desc:
                document.getElementById(
                    'role-desc'
                )?.value||'',

            perms:perms
        };

        if(id){

            DB.update(
                'roles',
                id,
                d
            );

        }else{

            DB.insert(
                'roles',
                d
            );
        }

        UI.closeModal(
            'modal-role'
        );

        UI.toast(
            'Rol guardado correctamente',
            'success'
        );

        this.render();
    }
},


/* ================================================================
 * CONFIGURACIÓN
 * ================================================================ */

Settings:{

    tempLogo:null,

    load:function(){

        /*
         * Configuración:
         * Sistema y Administrador de Empresa.
         */

        if(
            !Modules.Access.isSystemAdmin() &&
            !Modules.Access.isCompanyAdmin()
        ){

            return UI.toast(
                'No tiene permisos para acceder a Configuración',
                'error'
            );
        }

        if(
            Auth.currentCompany
        ){

            const setVal=(iid,val)=>{

                const el=
                    document.getElementById(
                        iid
                    );

                if(el)el.value=
                    val===undefined||
                    val===null
                        ?''
                        :val;
            };

            setVal(
                'set-company',
                Auth.currentCompany.name
            );

            setVal(
                'set-ruc',
                Auth.currentCompany.ruc||
                '1104985682001'
            );

            setVal(
                'set-address',
                Auth.currentCompany.address||''
            );

            setVal(
                'set-phone',
                Auth.currentCompany.phone||''
            );

            setVal(
                'set-iva',
                Auth.currentCompany.iva
            );

            setVal(
                'set-conditions',
                Auth.currentCompany.conditions||''
            );

            const shl=
                document.getElementById(
                    'set-hide-logo-print'
                );

            if(shl){

                shl.checked=
                    Auth.currentCompany.hideLogoPrint||
                    false;
            }

            if(
                Auth.currentCompany.logo
            ){

                this.tempLogo=
                    Auth.currentCompany.logo;

                const slp=
                    document.getElementById(
                        'set-logo-preview'
                    );

                if(slp){

                    slp.src=
                        Auth.currentCompany.logo;

                    slp.classList.remove(
                        'hidden'
                    );
                }

                const slph=
                    document.getElementById(
                        'set-logo-placeholder'
                    );

                if(slph){

                    slph.classList.add(
                        'hidden'
                    );
                }
            }
        }

        const setVal2=(iid,val)=>{

            const el=
                document.getElementById(
                    iid
                );

            if(el)el.value=
                val===undefined||
                val===null
                    ?''
                    :val;
        };

        /*
         * Claves de seguridad:
         * SOLO Administrador del Sistema.
         */

        if(
            Modules.Access.isSystemAdmin()
        ){

            setVal2(
                'set-brevo-key',
                DB.data.settings.brevoKey||''
            );

            setVal2(
                'set-email-from',
                DB.data.settings.emailFrom||''
            );

            setVal2(
                'set-gemini-key',
                DB.data.settings.geminiKey||''
            );

            setVal2(
                'set-orven-key',
                DB.data.settings.orvenKey||''
            );

            setVal2(
                'set-pin-delete',
                DB.data.settings.pinDelete||''
            );

            setVal2(
                'set-pin-fact',
                DB.data.settings.pinFact||''
            );

            setVal2(
                'set-pin-config',
                DB.data.settings.pinConfig||''
            );
        }
    },

    handleLogo:function(i){

        if(
            !Modules.Access.isAdmin()
        ){

            return UI.toast(
                'No tiene permisos',
                'error'
            );
        }

        if(
            i &&
            i.files &&
            i.files[0]
        ){

            if(
                i.files[0].size>
                2*1024*1024
            ){

                UI.toast(
                    'Imagen grande detectada. Comprimiendo...',
                    'info'
                );
            }

            Utils.fileToBase64(
                i.files[0]
            ).then(b=>{

                this.tempLogo=b;

                const slp=
                    document.getElementById(
                        'set-logo-preview'
                    );

                if(slp){

                    slp.src=b;

                    slp.classList.remove(
                        'hidden'
                    );
                }

                const slph=
                    document.getElementById(
                        'set-logo-placeholder'
                    );

                if(slph){

                    slph.classList.add(
                        'hidden'
                    );
                }

                UI.toast(
                    'Imagen optimizada correctamente',
                    'success'
                );

            });
        }
    },

    save:function(){

        if(
            !Modules.Access.isAdmin()
        ){

            return UI.toast(
                'No tiene permisos para modificar la configuración',
                'error'
            );
        }

        if(!Auth.currentCompany){

            return;
        }

        try{

            const getVal=(iid)=>{

                const el=
                    document.getElementById(
                        iid
                    );

                return el
                    ?el.value
                    :'';
            };

            const d={

                name:
                    getVal(
                        'set-company'
                    ),

                ruc:
                    getVal(
                        'set-ruc'
                    ),

                address:
                    getVal(
                        'set-address'
                    ),

                phone:
                    getVal(
                        'set-phone'
                    ),

                iva:
                    parseFloat(
                        getVal(
                            'set-iva'
                        )
                    )||15,

                logo:
                    this.tempLogo,

                conditions:
                    getVal(
                        'set-conditions'
                    ),

                hideLogoPrint:
                    document.getElementById(
                        'set-hide-logo-print'
                    )?.checked||false
            };

            DB.update(
                'companies',
                Auth.currentCompany.id,
                d
            );

            Auth.currentCompany=
                Object.assign(
                    {},
                    Auth.currentCompany,
                    d
                );

            try{

                localStorage.setItem(
                    'integra_session_active',
                    JSON.stringify({
                        user:Auth.currentUser,
                        company:Auth.currentCompany,
                        branch:Auth.currentBranch
                    })
                );

            }catch(quotaError){

                UI.toast(
                    'Advertencia: Logo muy grande. Se guardó en DB pero la sesión podría fallar.',
                    'warning'
                );
            }

            const cc=
                document.getElementById(
                    'current-company'
                );

            if(cc){

                cc.textContent=
                    d.name;
            }

            UI.toast(
                'Configuración guardada',
                'success'
            );

        }catch(e){

            UI.toast(
                'Error al guardar: '+e.message,
                'error'
            );
        }
    },

    saveSecurity:function(){

        /*
         * SEGURIDAD = SOLO ADMINISTRADOR DEL SISTEMA
         */

        if(
            !Modules.Access.requireSystem(
                'Solo el Administrador del Sistema puede modificar la seguridad'
            )
        ){

            return;
        }

        const getVal=(iid)=>{

            const el=
                document.getElementById(
                    iid
                );

            return el
                ?el.value
                :'';
        };

        DB.data.settings.brevoKey=
            getVal(
                'set-brevo-key'
            );

        DB.data.settings.emailFrom=
            getVal(
                'set-email-from'
            );

        DB.data.settings.geminiKey=
            getVal(
                'set-gemini-key'
            );

        DB.data.settings.orvenKey=
            getVal(
                'set-orven-key'
            );

        DB.data.settings.pinDelete=
            getVal(
                'set-pin-delete'
            );

        DB.data.settings.pinFact=
            getVal(
                'set-pin-fact'
            );

        DB.data.settings.pinConfig=
            getVal(
                'set-pin-config'
            );

        DB.save();

        UI.toast(
            'Seguridad actualizada',
            'success'
        );
    }
},


/* ================================================================
 * USUARIOS
 * ================================================================ */

Users:{

    tempImage:null,

    render:function(){

        if(
            !Modules.Access.canManageUsers()
        ){

            return UI.toast(
                'No tiene permisos para administrar usuarios',
                'error'
            );
        }

        const cid=
            Auth.currentCompany?.id;

        if(!cid)return;

        const currentRole=
            Modules.Access.currentRole();

        let d=
            DB.getAll(
                'users',
                cid
            );

        /*
         * Un Administrador de Empresa NO puede ver
         * Administradores del Sistema.
         */

        if(
            !Modules.Access.isSystemAdmin()
        ){

            d=d.filter(u=>
                Modules.Access.normalizeRole(
                    u.role
                )!==
                Modules.Access.ROLES.SYSTEM
            );
        }

        const tbody=
            document.getElementById(
                'users-tbody'
            );

        if(!tbody)return;

        tbody.innerHTML=

            d.map(u=>{

                const normalizedRole=
                    Modules.Access.normalizeRole(
                        u.role
                    );

                return`

                    <tr>

                        <td>

                            ${
                                u.photo
                                ?`
                                    <img
                                        src="${u.photo}"
                                        class="prod-thumb">
                                `
                                :''
                            }

                        </td>

                        <td>

                            ${Utils.escape(
                                u.name||
                                u.username||
                                ''
                            )}

                        </td>

                        <td>

                            ${Utils.escape(
                                u.username||
                                ''
                            )}

                        </td>

                        <td>

                            <span class="badge badge-info">

                                ${Utils.escape(
                                    normalizedRole
                                )}

                            </span>

                        </td>

                        <td>

                            <span
                                class="badge ${
                                    u.status==='Activo'
                                        ?'badge-success'
                                        :'badge-danger'
                                }">

                                ${Utils.escape(
                                    u.status||
                                    ''
                                )}

                            </span>

                        </td>

                        <td class="text-right">

                            <button
                                class="btn btn-outline btn-sm"
                                onclick="
                                    Modules.Users.edit('${u.id}')
                                ">
                                ✏️
                            </button>

                            ${
                                Modules.Access.canDelete()
                                ?`
                                    <button
                                        class="btn btn-outline btn-sm"
                                        style="color:var(--danger)"
                                        onclick="
                                            Auth.requestPin(
                                                'delete',
                                                'users',
                                                '${u.id}'
                                            )
                                        ">
                                        🗑️
                                    </button>
                                `
                                :''
                            }

                        </td>

                    </tr>

                `;

            }).join('')

            ||

            `
                <tr>
                    <td
                        colspan="6"
                        class="text-center p-4">
                        Sin usuarios
                    </td>
                </tr>
            `;
    },

    handleImage:function(i){

        if(
            !Modules.Access.canManageUsers()
        ){

            return UI.toast(
                'No tiene permisos',
                'error'
            );
        }

        if(
            i &&
            i.files &&
            i.files[0]
        ){

            Utils.fileToBase64(
                i.files[0]
            ).then(b=>{

                this.tempImage=b;

                const upp=
                    document.getElementById(
                        'user-photo-preview'
                    );

                if(upp){

                    upp.src=b;

                    upp.classList.remove(
                        'hidden'
                    );
                }

                const upph=
                    document.getElementById(
                        'user-photo-placeholder'
                    );

                if(upph){

                    upph.classList.add(
                        'hidden'
                    );
                }

            });
        }
    },

    openModal:function(id){

        if(
            !Modules.Access.canManageUsers()
        ){

            return UI.toast(
                'No tiene permisos para administrar usuarios',
                'error'
            );
        }

        const form=
            document.querySelector(
                '#modal-user form'
            );

        if(form){

            form.reset();
        }

        const ui=
            document.getElementById(
                'user-id'
            );

        if(ui)ui.value='';

        this.tempImage=null;

        const upp=
            document.getElementById(
                'user-photo-preview'
            );

        if(upp){

            upp.classList.add(
                'hidden'
            );
        }

        const upph=
            document.getElementById(
                'user-photo-placeholder'
            );

        if(upph){

            upph.classList.remove(
                'hidden'
            );
        }

        /*
         * Cargar roles permitidos.
         */

        this.prepareRoleSelect();

        if(id){

            const u=
                DB.getOne(
                    'users',
                    id
                );

            if(!u){

                return UI.toast(
                    'Usuario no encontrado',
                    'error'
                );
            }

            /*
             * Admin de empresa NO puede editar
             * Administrador del Sistema.
             */

            if(
                !Modules.Access.isSystemAdmin() &&
                Modules.Access.normalizeRole(
                    u.role
                )===
                Modules.Access.ROLES.SYSTEM
            ){

                return UI.toast(
                    'No puede modificar un Administrador del Sistema',
                    'error'
                );
            }

            const mt=
                document.getElementById(
                    'user-modal-title'
                );

            if(mt){

                mt.textContent=
                    'Editar Usuario';
            }

            if(ui){

                ui.value=u.id;
            }

            const setVal=(iid,val)=>{

                const el=
                    document.getElementById(
                        iid
                    );

                if(el){

                    el.value=
                        val===undefined||
                        val===null
                            ?''
                            :val;
                }
            };

            setVal(
                'user-name',
                u.name||''
            );

            setVal(
                'user-lastname',
                u.lastname||''
            );

            setVal(
                'user-dni',
                u.dni||''
            );

            setVal(
                'user-dob',
                u.dob||''
            );

            setVal(
                'user-email',
                u.email||''
            );

            setVal(
                'user-phone',
                u.phone||''
            );

            setVal(
                'user-city',
                u.city||''
            );

            setVal(
                'user-job',
                u.job||''
            );

            setVal(
                'user-dept',
                u.dept||''
            );

            setVal(
                'user-hire',
                u.hire||''
            );

            setVal(
                'user-username',
                u.username
            );

            setVal(
                'user-pass',
                u.password
            );

            setVal(
                'user-role',
                Modules.Access.normalizeRole(
                    u.role
                )
            );

            setVal(
                'user-status',
                u.status||
                'Activo'
            );

            setVal(
                'user-force-change',
                u.force_change
                    ?'Sí'
                    :'No'
            );

            if(u.photo){

                this.tempImage=
                    u.photo;

                if(upp){

                    upp.src=
                        u.photo;

                    upp.classList.remove(
                        'hidden'
                    );
                }

                if(upph){

                    upph.classList.add(
                        'hidden'
                    );
                }
            }

        }else{

            const mt=
                document.getElementById(
                    'user-modal-title'
                );

            if(mt){

                mt.textContent=
                    'Nuevo Usuario';
            }
        }

        UI.openModal(
            'modal-user'
        );
    },

    /*
     * ============================================================
     * PREPARAR ROLES DISPONIBLES
     * ============================================================
     */

    prepareRoleSelect:function(){

        const select=
            document.getElementById(
                'user-role'
            );

        if(!select)return;

        const currentValue=
            select.value;

        let roles=
            DB.getAll('roles');

        /*
         * Si no existen, crearlos.
         */

        Modules.Roles.ensureDefaultRoles();

        roles=
            DB.getAll('roles');

        /*
         * Administrador de Empresa no puede ver
         * Administrador del Sistema.
         */

        if(
            !Modules.Access.isSystemAdmin()
        ){

            roles=
                roles.filter(r=>
                    Modules.Access.normalizeRole(
                        r.name
                    )!==
                    Modules.Access.ROLES.SYSTEM
                );
        }

        /*
         * Si el usuario actual no es Sistema/Admin Empresa,
         * no debería estar aquí, pero reforzamos.
         */

        if(
            !Modules.Access.canManageUsers()
        ){

            roles=[];
        }

        select.innerHTML=
            roles.map(r=>`

                <option
                    value="${Utils.escape(
                        Modules.Access.normalizeRole(
                            r.name
                        )
                    )}">

                    ${Utils.escape(
                        Modules.Access.normalizeRole(
                            r.name
                        )
                    )}

                </option>

            `).join('');

        /*
         * Restaurar selección.
         */

        if(currentValue){

            select.value=
                Modules.Access.normalizeRole(
                    currentValue
                );
        }
    },

    edit:function(id){

        this.openModal(id);
    },

    save:function(){

        if(
            !Modules.Access.canManageUsers()
        ){

            return UI.toast(
                'No tiene permisos para administrar usuarios',
                'error'
            );
        }

        const ui=
            document.getElementById(
                'user-id'
            );

        const id=
            ui?ui.value:'';

        const getVal=(iid)=>{

            const el=
                document.getElementById(
                    iid
                );

            return el
                ?el.value
                :'';
        };

        let role=
            Modules.Access.normalizeRole(
                getVal(
                    'user-role'
                )
            );

        /*
         * VALIDACIÓN CRÍTICA
         *
         * Solo Sistema puede crear Administrador
         * del Sistema.
         */

        if(
            role===
            Modules.Access.ROLES.SYSTEM &&
            !Modules.Access.isSystemAdmin()
        ){

            return UI.toast(
                'Solo el Administrador del Sistema puede crear o asignar ese rol',
                'error'
            );
        }

        /*
         * Si está editando un usuario que ya es
         * Administrador del Sistema, solo Sistema puede tocarlo.
         */

        if(id){

            const old=
                DB.getOne(
                    'users',
                    id
                );

            if(!old){

                return UI.toast(
                    'Usuario no encontrado',
                    'error'
                );
            }

            const oldRole=
                Modules.Access.normalizeRole(
                    old.role
                );

            if(
                oldRole===
                Modules.Access.ROLES.SYSTEM &&
                !Modules.Access.isSystemAdmin()
            ){

                return UI.toast(
                    'No puede modificar un Administrador del Sistema',
                    'error'
                );
            }
        }

        /*
         * Un asesor NO puede ser facturador por permisos
         * aunque alguien intente modificar manualmente
         * los checkboxes.
         *
         * El rol es la fuente principal de permisos.
         */

        const d={

            name:
                getVal(
                    'user-name'
                ),

            lastname:
                getVal(
                    'user-lastname'
                ),

            dni:
                getVal(
                    'user-dni'
                ),

            dob:
                getVal(
                    'user-dob'
                ),

            email:
                getVal(
                    'user-email'
                ),

            phone:
                getVal(
                    'user-phone'
                ),

            city:
                getVal(
                    'user-city'
                ),

            job:
                getVal(
                    'user-job'
                ),

            dept:
                getVal(
                    'user-dept'
                ),

            hire:
                getVal(
                    'user-hire'
                ),

            username:
                getVal(
                    'user-username'
                ),

            password:
                getVal(
                    'user-pass'
                ),

            role:role,

            status:
                getVal(
                    'user-status'
                ),

            force_change:
                getVal(
                    'user-force-change'
                )==='Sí',

            photo:
                this.tempImage,

            company_id:
                Auth.currentCompany.id,

            first_login:
                id
                    ?DB.getOne(
                        'users',
                        id
                    )?.first_login
                    :true
        };

        if(
            !d.username ||
            !d.password
        ){

            return UI.toast(
                'Usuario y contraseña obligatorios',
                'error'
            );
        }

        /*
         * ========================================================
         * AUDITORÍA DEL USUARIO
         * ========================================================
         */

        const actor=
            Modules.Access.getUser();

        const now=
            new Date().toISOString();

        if(id){

            const old=
                DB.getOne(
                    'users',
                    id
                );

            d.created_at=
                old?.created_at||
                now;

            d.created_by=
                old?.created_by||
                actor.id||
                '';

            d.created_by_name=
                old?.created_by_name||
                actor.name||
                actor.username||
                '';

            d.updated_at=
                now;

            d.updated_by=
                actor.id||
                actor.username||
                '';

            d.updated_by_name=
                actor.name||
                actor.username||
                '';

            DB.update(
                'users',
                id,
                d
            );

        }else{

            d.created_at=
                now;

            d.created_by=
                actor.id||
                actor.username||
                '';

            d.created_by_name=
                actor.name||
                actor.username||
                '';

            d.updated_at=
                now;

            d.updated_by=
                actor.id||
                actor.username||
                '';

            d.updated_by_name=
                actor.name||
                actor.username||
                '';

            DB.insert(
                'users',
                d
            );
        }

        UI.closeModal(
            'modal-user'
        );

        UI.toast(
            id
                ?'Usuario actualizado correctamente'
                :'Usuario creado correctamente',
            'success'
        );

        this.render();
    }
},
Excel:{render:function(){const rows=DB.data.excel_rows||[];const tbody=document.getElementById('excel-tbody');if(tbody)tbody.innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td contenteditable="true" onblur="Modules.Excel.updateCell(${i},'task',this.innerText)">${r.task||''}</td><td contenteditable="true" onblur="Modules.Excel.updateCell(${i},'resp',this.innerText)">${r.resp||''}</td><td contenteditable="true" onblur="Modules.Excel.updateCell(${i},'date',this.innerText)">${r.date||''}</td><td contenteditable="true" onblur="Modules.Excel.updateCell(${i},'status',this.innerText)">${r.status||'Pendiente'}</td><td><button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="Modules.Excel.deleteRow(${i})">🗑️</button></td></tr>`).join('')||'<tr><td colspan="6" class="text-center p-4">Sin actividades</td></tr>'},
addRow:function(){if(!DB.data.excel_rows)DB.data.excel_rows=[];DB.data.excel_rows.push({task:'',resp:'',date:new Date().toISOString().split('T')[0],status:'Pendiente'});DB.save();this.render()},
updateCell:function(index,field,value){if(DB.data.excel_rows[index]){DB.data.excel_rows[index][field]=value;DB.save()}},
deleteRow:function(index){DB.data.excel_rows.splice(index,1);DB.save();this.render()}},
Audit:{render:function(){const d=DB.getAll('audit').sort((a,b)=>new Date(b.date)-new Date(a.date));const tbody=document.getElementById('audit-tbody');if(tbody)tbody.innerHTML=d.map(a=>`<tr><td>${Utils.formatDateTime(a.date)}</td><td>${a.user}</td><td>${a.action}</td><td>${a.module}</td></tr>`).join('')}}
};
const App={start:function(){this.setupNav();Modules.Settings.load();this.refreshAll();setInterval(()=>{const cd=document.getElementById('clock-display');if(cd)cd.textContent=new Date().toLocaleTimeString()},1000);if(localStorage.getItem('integra_theme')==='dark')document.body.classList.add('dark-mode');if(Auth.currentUser&&Auth.currentUser.role==='Facturadora'){document.querySelectorAll('.nav-item').forEach(el=>{const v=el.dataset.view;if(!['reservations','orders','invoices','dashboard','settings'].includes(v))el.style.display='none'})}},
setupNav:function(){const s=this;document.querySelectorAll('.nav-item').forEach(function(i){i.addEventListener('click',function(){const v=i.dataset.view;document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));i.classList.add('active');document.querySelectorAll('.view-section').forEach(v=>v.classList.add('hidden'));const ve=document.getElementById('view-'+v);if(ve)ve.classList.remove('hidden');if(v==='crm')Modules.CRM.render();if(v==='crm-tracking')Modules.Tracking.render();if(v==='inventory')Modules.Inventory.render();if(v==='stock-check')Modules.StockCheck.render();if(v==='kardex')Modules.Kardex.render();if(v==='quotes')Modules.Quotes.render();if(v==='orders')Modules.Orders.render();if(v==='invoices')Modules.Invoices.render();if(v==='reservations')Modules.Reservations.render();if(v==='purchases')Modules.Purchases.render();if(v==='logistics-cargo')Modules.Logistics.render();if(v==='dashboard')s.refreshDashboard();if(v==='finance')s.refreshFinance();if(v==='settings')Modules.Settings.load();if(v==='users')Modules.Users.render();if(v==='audit')Modules.Audit.render();if(v==='warehouses')Modules.Warehouses.render();if(v==='sales-notes')Modules.SalesNotes.render();if(v==='credit-notes')Modules.CreditNotes.render();if(v==='alerts')s.renderAlerts();if(v==='excel')Modules.Excel.render();if(v==='active-users')s.refreshActiveUsers();if(v==='companies')Modules.Companies.render();if(v==='roles')Modules.Roles.render();if(v==='ai-gemini'){}if(v==='ai-orven'){}if(window.innerWidth<=768)document.getElementById('sidebar').classList.remove('open')})})},
refreshAll:function(){this.refreshDashboard();Modules.CRM.render();Modules.Inventory.render();Modules.Kardex.render();Modules.Quotes.render();Modules.Orders.render();Modules.Invoices.render();Modules.Reservations.render();Modules.Purchases.render();this.refreshFinance()},
refreshDashboard:function(){const cid=Auth.currentCompany?.id;if(!cid)return;const cs=DB.getAll('clients',cid);const ps=DB.getAll('products',cid);const qs=DB.getAll('quotes',cid);const os=DB.getAll('orders',cid);const invs=DB.getAll('invoices',cid).filter(i=>i.status!=='Anulada');const rs=DB.getAll('reservations',cid);const kx=DB.getAll('kardex',cid).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);const ts=invs.reduce((s,i)=>s+i.total,0);const ic=invs.length;const qc=qs.length;const ls=ps.filter(p=>(p.stock-(p.reserved||0))<(p.min_stock||5)).length;const ar=rs.filter(r=>r.status==='Activa').length;const ks=document.getElementById('kpi-sales');if(ks)ks.textContent=Utils.formatMoney(ts);const ki=document.getElementById('kpi-invoices');if(ki)ki.textContent=ic;const kq=document.getElementById('kpi-quotes');if(kq)kq.textContent=qc;const ko=document.getElementById('kpi-orders');if(ko)ko.textContent=os.length;const kr=document.getElementById('kpi-reservations');if(kr)kr.textContent=ar;const kl=document.getElementById('kpi-lowstock');if(kl)kl.textContent=ls;const dkt=document.getElementById('dash-kardex-tbody');if(dkt)dkt.innerHTML=kx.map(k=>`<tr><td>${Utils.formatDate(k.date)}</td><td>${k.product_name}</td><td><span class="badge ${k.type==='ENTRADA'?'badge-success':'badge-danger'}">${k.type}</span></td><td>${k.qty}</td></tr>`).join('')||'<tr><td colspan="4" class="text-center p-2">Sin movimientos</td></tr>';this.renderAlerts();this.updateCharts()},
renderAlerts:function(){const cid=Auth.currentCompany?.id;if(!cid)return;const ps=DB.getAll('products',cid);const qs=DB.getAll('quotes',cid);const rs=DB.getAll('reservations',cid);let h='';const ls=ps.filter(p=>(p.stock-(p.reserved||0))<(p.min_stock||5));if(ls.length>0)h+=`<div class="mb-2 p-2" style="background:#fee2e2;color:#991b1b;border-radius:4px">⚠️ ${ls.length} productos stock bajo.</div>`;const ar=rs.filter(r=>r.status==='Activa');if(ar.length>0)h+=`<div class="mb-2 p-2" style="background:#fef9c3;color:#854d0e;border-radius:4px">🔒 ${ar.length} reservas activas.</div>`;const today=new Date();const tom=Utils.addDays(today,1);qs.forEach(q=>{if(q.status==='Convertida')return;const vu=Utils.addDays(new Date(q.date),parseInt(q.validity));if(vu<today)h+=`<div class="mb-2 p-2" style="background:#fee2e2;color:#991b1b;border-radius:4px">🔴 Cotización <strong>${q.number}</strong> VENCIDA.</div>`;else if(vu<=tom)h+=`<div class="mb-2 p-2" style="background:#fef9c3;color:#854d0e;border-radius:4px">🟠 Cotización <strong>${q.number}</strong> vence mañana.</div>`});const c=document.getElementById('dash-alerts');const f=document.getElementById('alerts-list');const content=h||'<div class="p-4 text-center" style="color:var(--success)">✓ Todo en orden.</div>';if(c)c.innerHTML=content;if(f)f.innerHTML=content},
refreshFinance:function(){const cid=Auth.currentCompany?.id;if(!cid)return;const invs=DB.getAll('invoices',cid).filter(i=>i.status!=='Anulada');const rev=invs.reduce((s,i)=>s+i.total,0);const fc=document.getElementById('fin-cash');if(fc)fc.textContent=Utils.formatMoney(rev*0.3);const fb=document.getElementById('fin-bank');if(fb)fb.textContent=Utils.formatMoney(rev*0.7);const fp=document.getElementById('fin-profit');if(fp)fp.textContent=Utils.formatMoney(rev)},
refreshActiveUsers:function(){const tbody=document.getElementById('active-users-tbody');if(!tbody)return;const users=[{user:Auth.currentUser.username,role:Auth.currentUser.role,device:navigator.platform,last:new Date().toLocaleTimeString(),status:'En Línea'}];tbody.innerHTML=users.map(u=>`<tr><td>${u.user}</td><td>${u.role}</td><td>${u.device}</td><td>${u.last}</td><td><span class="badge badge-success">${u.status}</span></td></tr>`).join('')},
notify:function(m,t){UI.toast(m,t)},
toggleTheme:function(){document.body.classList.toggle('dark-mode');localStorage.setItem('integra_theme',document.body.classList.contains('dark-mode')?'dark':'light')},
globalSearch:function(t){if(!t)return;const term=t.toLowerCase().trim();const cid=Auth.currentCompany?.id;const clients=DB.getAll('clients',cid).filter(c=>((c.name||'')+' '+(c.lastname||'')+' '+(c.doc||'')+' '+(c.phone||'')).toLowerCase().includes(term));const prods=DB.getAll('products',cid).filter(p=>((p.name||'')+' '+(p.code||'')).toLowerCase().includes(term));if(clients.length>0){this.navigate('crm');const fct=document.getElementById('filter-crm-text');if(fct){fct.value=term;Modules.CRM.render()}UI.toast(`${clients.length} cliente(s) encontrado(s)`,'info')}else if(prods.length>0){this.navigate('inventory');const fipt=document.getElementById('filter-inv-prod-text');if(fipt){fipt.value=term;Modules.Inventory.render()}UI.toast(`${prods.length} producto(s) encontrado(s)`,'info')}else UI.toast('Sin resultados para: '+term,'error')},
clearFilters:function(module){if(module==='crm'){const fct=document.getElementById('filter-crm-text');if(fct)fct.value='';const fcty=document.getElementById('filter-crm-type');if(fcty)fcty.value='';Modules.CRM.render()}else if(module==='quotes'){const fqt=document.getElementById('filter-quotes-text');if(fqt)fqt.value='';const fqs=document.getElementById('filter-quotes-status');if(fqs)fqs.value='';const fqds=document.getElementById('filter-quotes-date-start');if(fqds)fqds.value='';const fqde=document.getElementById('filter-quotes-date-end');if(fqde)fqde.value='';Modules.Quotes.render()}else if(module==='sn'){const fst=document.getElementById('filter-sn-text');if(fst)fst.value='';const fsds=document.getElementById('filter-sn-date-start');if(fsds)fsds.value='';const fsde=document.getElementById('filter-sn-date-end');if(fsde)fsde.value='';Modules.SalesNotes.render()}else if(module==='cn'){const fcnt=document.getElementById('filter-cn-text');if(fcnt)fcnt.value='';Modules.CreditNotes.render()}else if(module==='res'){const frt=document.getElementById('filter-res-text');if(frt)frt.value='';const frs=document.getElementById('filter-res-status');if(frs)frs.value='';Modules.Reservations.render()}else if(module==='orders'){const fot=document.getElementById('filter-orders-text');if(fot)fot.value='';const fos=document.getElementById('filter-orders-status');if(fos)fos.value='';Modules.Orders.render()}else if(module==='inv'){const fit=document.getElementById('filter-inv-text');if(fit)fit.value='';const fis=document.getElementById('filter-inv-status');if(fis)fis.value='';const fids=document.getElementById('filter-inv-date-start');if(fids)fids.value='';const fide=document.getElementById('filter-inv-date-end');if(fide)fide.value='';Modules.Invoices.render()}else if(module==='inv-prod'){const fipt=document.getElementById('filter-inv-prod-text');if(fipt)fipt.value='';const fips=document.getElementById('filter-inv-prod-stock');if(fips)fips.value='';Modules.Inventory.render()}else if(module==='kardex'){const fkt=document.getElementById('filter-kardex-text');if(fkt)fkt.value='';const fktty=document.getElementById('filter-kardex-type');if(fktty)fktty.value='';Modules.Kardex.render()}else if(module==='purch'){const fpt=document.getElementById('filter-purch-text');if(fpt)fpt.value='';const fps=document.getElementById('filter-purch-status');if(fps)fps.value='';Modules.Purchases.render()}},
updateCharts:function(){const cid=Auth.currentCompany?.id;if(!cid)return;const invs=DB.getAll('invoices',cid).filter(i=>i.status!=='Anulada');const monthlySales=new Array(12).fill(0);invs.forEach(inv=>{const d=new Date(inv.date);if(d.getFullYear()===new Date().getFullYear()){monthlySales[d.getMonth()]+=inv.total}});const ctx1=document.getElementById('salesChart');if(ctx1){if(this.salesChart)this.salesChart.destroy();this.salesChart=new Chart(ctx1,{type:'line',data:{labels:['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],datasets:[{label:'Ventas',data:monthlySales,borderColor:'#3b82f6',fill:true}]},options:{responsive:true,maintainAspectRatio:false}})}const ps=DB.getAll('products',cid).sort((a,b)=>(b.sales||0)-(a.sales||0)).slice(0,5);const ctx2=document.getElementById('topProductsChart');if(ctx2){if(this.topChart)this.topChart.destroy();this.topChart=new Chart(ctx2,{type:'bar',data:{labels:ps.map(p=>p.name),datasets:[{label:'Vendidos',data:ps.map(p=>p.sales||0),backgroundColor:'#d4a373'}]},options:{responsive:true,maintainAspectRatio:false}})}},
printDocument:function(type,id){

    let doc=null;
    let title='';
    let items=[];
    let showImages=true;

    if(type==='quote'){

        doc=DB.getOne('quotes',id);
        title='COTIZACIÓN';
        items=JSON.parse(doc?.items||'[]');
        showImages=true;

    }else if(type==='order'){

        doc=DB.getOne('orders',id);
        title='PEDIDO DE VENTA';
        items=JSON.parse(doc?.items||'[]');
        showImages=false;

    }else if(type==='invoice'){

        doc=DB.getOne('invoices',id);
        title='FACTURA';
        items=JSON.parse(doc?.items||'[]');
        showImages=true;

    }else if(type==='reservation'){

        doc=DB.getOne('reservations',id);
        title='RESERVA DE STOCK';
        items=JSON.parse(doc?.items||'[]');
        showImages=false;

    }else if(type==='sales_note'){

        doc=DB.getOne('sales_notes',id);
        title='NOTA DE VENTA';
        items=JSON.parse(doc?.items||'[]');
        showImages=false;

    }else if(type==='credit_note'){

        doc=DB.getOne('credit_notes',id);
        title='NOTA DE CRÉDITO';
        items=[];
        showImages=false;

    }else if(type==='logistics'){

        doc=DB.getOne('logistics',id);
        title='GUÍA DE DESPACHO';
        items=[];
        showImages=false;
    }

    if(!doc)return;

    const comp=Auth.currentCompany||{};
    const client=DB.getOne('clients',doc.client_id);

    /* Totales reales para impresión: sin IVA empresarial inventado. */
    const finNum=(value)=>{const n=Number(value);return Number.isFinite(n)?n:0;};
    const finClamp=(value,min,max)=>Math.min(max,Math.max(min,value));
    const itemFinancials=items.map((it)=>{
        const qty=Math.max(0,finNum(it.qty ?? it.quantity ?? 0));
        const price=Math.max(0,finNum(it.price ?? it.unitPrice ?? it.precio ?? 0));
        const gross=qty*price;
        const explicitDiscount=finNum(it.discount_amount ?? it.discountAmount);
        const itemDiscountPercent=it.disc_pct ?? it.discount_pct ?? it.discountPct;
        const hasItemDiscountPercent=itemDiscountPercent!==undefined&&itemDiscountPercent!==null&&itemDiscountPercent!=='';
        const rawDiscount=Math.max(0,finNum(hasItemDiscountPercent?itemDiscountPercent:(it.discount ?? it.descuento)));
        const isAmount=!hasItemDiscountPercent&&(it.discount_type==='amount'||it.discountType==='amount'||it.discount_is_amount===true);
        const lineDiscount=explicitDiscount>0?Math.min(gross,explicitDiscount):(rawDiscount>0?(isAmount?Math.min(gross,rawDiscount):(rawDiscount<=100?gross*(rawDiscount/100):Math.min(gross,rawDiscount))):0);
        const afterItemDiscount=Math.max(0,gross-lineDiscount);
        const product=it.prodId?DB.getOne('products',it.prodId):null;
        const hasItemVat=it.iva!==undefined&&it.iva!==null&&it.iva!=='';
        const hasProductVat=product?.iva!==undefined&&product?.iva!==null&&product?.iva!=='';
        const vatRate=finClamp(finNum(hasItemVat?it.iva:(hasProductVat?product.iva:0)),0,100);
        return {qty,price,gross,lineDiscount,afterItemDiscount,vatRate};
    });
    const grossSubtotal=itemFinancials.length?itemFinancials.reduce((s,x)=>s+x.gross,0):Math.max(0,finNum(doc.subtotal));
    const itemDiscountTotal=itemFinancials.reduce((s,x)=>s+x.lineDiscount,0);
    const subtotalAfterItemDiscount=itemFinancials.reduce((s,x)=>s+x.afterItemDiscount,0);
    const discountRate=finClamp(finNum(doc.discount),0,100);
    const calculatedGlobalDiscount=subtotalAfterItemDiscount*(discountRate/100);
    const storedDiscountAmount=Math.max(0,finNum(doc.discount_amount ?? doc.discountAmount));
    const discountAmount=storedDiscountAmount>0?storedDiscountAmount:(itemDiscountTotal+calculatedGlobalDiscount);
    const subtotalAfterDiscount=Math.max(0,grossSubtotal-discountAmount);
    let taxBreakdown={};
    if(doc.tax_breakdown&&typeof doc.tax_breakdown==='object')Object.values(doc.tax_breakdown).forEach((row)=>{const rate=finClamp(finNum(row?.rate),0,100),tax=Math.max(0,finNum(row?.tax ?? row?.iva ?? row?.amount)),base=Math.max(0,finNum(row?.base));if(tax>0||base>0)taxBreakdown[String(rate)]={rate,base,tax};});
    const hasStoredIva=doc.iva!==undefined&&doc.iva!==null&&doc.iva!==''&&Number.isFinite(Number(doc.iva));
    let ivaAmount=hasStoredIva?Math.max(0,finNum(doc.iva)):0;
    if(!hasStoredIva&&Object.keys(taxBreakdown).length)ivaAmount=Object.values(taxBreakdown).reduce((s,x)=>s+finNum(x.tax),0);
    if(!hasStoredIva&&!Object.keys(taxBreakdown).length&&itemFinancials.length){const globalFactor=subtotalAfterItemDiscount>0?Math.max(0,(subtotalAfterItemDiscount-calculatedGlobalDiscount)/subtotalAfterItemDiscount):1;itemFinancials.forEach((x)=>{const base=x.afterItemDiscount*globalFactor,tax=base*(x.vatRate/100);ivaAmount+=tax;if(x.vatRate>0){const key=String(x.vatRate);taxBreakdown[key]=taxBreakdown[key]||{rate:x.vatRate,base:0,tax:0};taxBreakdown[key].base+=base;taxBreakdown[key].tax+=tax;}});}
    const storedTotal=finNum(doc.total);
    const finalTotal=storedTotal>0?storedTotal:(subtotalAfterDiscount+ivaAmount);
    const formatQuoteNumber=value=>Utils.formatMoney(value).replace(/[^\d,.-]/g,'');
    const formatSummaryMoney=value=>type==='quote'?formatQuoteNumber(value):Utils.formatMoney(value);
    const subtotalFormatted=formatSummaryMoney(grossSubtotal),discountFormatted=formatSummaryMoney(discountAmount),ivaFormatted=formatSummaryMoney(ivaAmount),totalFormatted=Utils.formatMoney(finalTotal);
    const ivaRowsHtml=ivaAmount>0?`<div class="total-row"><span>IVA:</span><span>${ivaFormatted}</span></div>`:'';

    /* ============================================================
       CONFIGURACIÓN
    ============================================================ */

    const GOLD='#b08a57';
    const DARK='#111111';

    const LOGO_SIZE_CM=7;

    const QUOTATION_RIGHT='0mm';
    const COMMERCIAL_RIGHT='-400mm';

    const QUOTATION_WIDTH='62mm';
    const COMMERCIAL_WIDTH='61mm';

    const QUOTATION_TOP='2mm';
    const COMMERCIAL_TOP='0mm';

    const SIGNATURES_WIDTH='100mm';

    /* ============================================================
       FUNCIONES AUXILIARES
    ============================================================ */

    const esc=(value)=>{

        if(value===null||value===undefined)return '';

        return String(value)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#039;');
    };

    const firstValue=(...values)=>{

        for(const value of values){

            if(
                value!==null &&
                value!==undefined &&
                String(value).trim()!==''
            ){
                return value;
            }
        }

        return '';
    };

    /* ============================================================
       CLIENTE
    ============================================================ */

    const clientName=client
        ? `${client.name||''} ${client.lastname||''}`.trim()
        : 'Consumidor Final';

    const clientIdentification=firstValue(

        client?.doc,
        client?.document,
        client?.document_number,
        client?.identification,
        client?.identification_number,
        client?.cedula,
        client?.cedula_ruc,
        client?.ruc,
        client?.tax_id,
        client?.passport,
        client?.pasaporte,
        client?.id_number,
        client?.dni

    ) || '';

    const clientTypeRaw=String(firstValue(

        client?.doc_type,
        client?.document_type,
        client?.identification_type,
        client?.tipo_documento,
        client?.tipo_identificacion,
        client?.type_document,
        client?.id_type

    )).toLowerCase().trim();

    const normalizedClientId=String(
        clientIdentification||''
    )
        .replace(/\s+/g,'')
        .replace(/[-.]/g,'');

    const isConsumerFinal=

        /consumidor\s*final/i.test(clientName) ||

        client?.is_consumer_final===true ||

        client?.consumer_final===true ||

        client?.isConsumerFinal===true ||

        /^9+$/.test(normalizedClientId);

    let clientDocLabel='CF';

    if(!isConsumerFinal){

        if(
            clientTypeRaw.includes('cedula') ||
            clientTypeRaw.includes('cédula') ||
            clientTypeRaw==='cc' ||
            clientTypeRaw==='ci' ||
            /^\d{10}$/.test(normalizedClientId)
        ){

            clientDocLabel='CC';

        }else if(
            clientTypeRaw.includes('ruc') ||
            /^\d{13}$/.test(normalizedClientId)
        ){

            clientDocLabel='RUC';

        }else if(
            clientTypeRaw.includes('pasaporte') ||
            clientTypeRaw.includes('passport') ||
            clientTypeRaw==='pa'
        ){

            clientDocLabel='PA';

        }else if(normalizedClientId){

            clientDocLabel='PA';
        }
    }

    const finalClientIdentification=isConsumerFinal
        ? '999999999'
        : (clientIdentification||'---');

    /* ============================================================
       ASESOR COMERCIAL
    ============================================================ */

    const possibleAdvisorObjects=[

        doc.vendor,
        doc.asesor,
        doc.salesperson,
        doc.vendor_data,
        doc.asesor_data,
        doc.salesperson_data,
        doc.vendor_user,
        doc.asesor_user,
        doc.salesperson_user,
        doc.created_by_user,
        doc.user

    ].filter(v=>v&&typeof v==='object');

    const advisorIds=[

        doc.vendor,
        doc.vendor_id,
        doc.vendorId,

        doc.asesor_id,
        doc.asesorId,

        doc.salesperson_id,
        doc.salespersonId,

        doc.advisor_id,
        doc.advisorId,

        doc.created_by,
        doc.created_by_id,

        doc.user_id,
        doc.userId

    ].filter(v=>{

        return (
            v!==null &&
            v!==undefined &&
            String(v).trim()!==''
        );

    });

    let advisorRecord=null;

    /* ============================================================
       1. OBJETO DIRECTO
    ============================================================ */

    if(possibleAdvisorObjects.length){

        advisorRecord=
            possibleAdvisorObjects.find(obj=>{

                return firstValue(

                    obj.id,

                    obj.user_id,
                    obj.vendor_id,

                    obj.name,
                    obj.full_name,
                    obj.fullName,
                    obj.nombre,

                    obj.display_name,
                    obj.displayName,

                    obj.username,

                    obj.email,
                    obj.correo,

                    obj.phone,
                    obj.telefono,
                    obj.mobile,
                    obj.celular

                );

            })||null;
    }

    /* ============================================================
       2. BUSCAR POR ID
    ============================================================ */

    if(!advisorRecord&&advisorIds.length){

        const advisorTables=[

            'users',
            'vendors',
            'employees',
            'salespeople',
            'sellers',
            'asesores',
            'staff'

        ];

        for(const advisorId of advisorIds){

            for(const table of advisorTables){

                try{

                    const found=DB.getOne(
                        table,
                        advisorId
                    );

                    if(found){

                        const hasUsefulData=firstValue(

                            found.id,

                            found.name,
                            found.full_name,
                            found.fullName,
                            found.nombre,

                            found.display_name,
                            found.displayName,

                            found.username,

                            found.email,
                            found.correo,

                            found.phone,
                            found.telefono,
                            found.mobile,
                            found.celular

                        );

                        if(hasUsefulData){

                            advisorRecord=found;

                            break;
                        }
                    }

                }catch(error){}

            }

            if(advisorRecord)break;
        }
    }

    /* ============================================================
       3. BUSCAR DENTRO DE LOS REGISTROS
    ============================================================ */

    if(!advisorRecord&&advisorIds.length){

        const advisorTables=[

            'users',
            'vendors',
            'employees',
            'salespeople',
            'sellers',
            'asesores',
            'staff'

        ];

        for(const advisorId of advisorIds){

            for(const table of advisorTables){

                try{

                    const records=DB.getAll(
                        table,
                        comp.id
                    )||[];

                    const found=records.find(record=>{

                        if(!record)return false;

                        const ids=[

                            record.id,
                            record._id,

                            record.user_id,
                            record.userId,

                            record.vendor_id,
                            record.vendorId,

                            record.employee_id,
                            record.employeeId,

                            record.salesperson_id,
                            record.salespersonId

                        ]
                        .filter(v=>
                            v!==null &&
                            v!==undefined
                        )
                        .map(v=>String(v));

                        return ids.includes(
                            String(advisorId)
                        );

                    });

                    if(found){

                        advisorRecord=found;
                        break;
                    }

                }catch(error){}

            }

            if(advisorRecord)break;
        }
    }

    /* ============================================================
       4. BUSCAR POR TEXTO
    ============================================================ */

    if(!advisorRecord){

        const possibleVendorText=firstValue(

            typeof doc.vendor==='string'
                ? doc.vendor
                : '',

            typeof doc.asesor==='string'
                ? doc.asesor
                : '',

            typeof doc.salesperson==='string'
                ? doc.salesperson
                : '',

            doc.vendor_name,
            doc.vendorName,

            doc.asesor_name,
            doc.asesorName,

            doc.salesperson_name,
            doc.salespersonName,

            doc.advisor_name,
            doc.advisorName

        );

        if(possibleVendorText){

            const advisorTables=[

                'users',
                'vendors',
                'employees',
                'salespeople',
                'sellers',
                'asesores',
                'staff'

            ];

            const searchText=
                String(possibleVendorText)
                    .toLowerCase()
                    .trim();

            for(const table of advisorTables){

                try{

                    const records=DB.getAll(
                        table,
                        comp.id
                    )||[];

                    const found=records.find(record=>{

                        if(!record)return false;

                        const values=[

                            record.id,

                            record.name,
                            record.full_name,
                            record.fullName,
                            record.nombre,

                            record.display_name,
                            record.displayName,

                            record.username,

                            record.email,
                            record.correo

                        ]
                        .filter(v=>
                            v!==null &&
                            v!==undefined
                        )
                        .map(v=>
                            String(v)
                                .toLowerCase()
                                .trim()
                        );

                        return values.includes(
                            searchText
                        );

                    });

                    if(found){

                        advisorRecord=found;
                        break;
                    }

                }catch(error){}
            }
        }
    }

    /* ============================================================
       NOMBRE DEL ASESOR
    ============================================================ */

    const advisorName=firstValue(

        advisorRecord?.full_name,
        advisorRecord?.fullName,

        advisorRecord?.name,
        advisorRecord?.nombre,

        advisorRecord?.display_name,
        advisorRecord?.displayName,

        advisorRecord?.username,

        doc.vendor_name,
        doc.vendorName,

        doc.asesor_name,
        doc.asesorName,

        doc.salesperson_name,
        doc.salespersonName,

        doc.advisor_name,
        doc.advisorName,

        doc.commercial_advisor,
        doc.commercialAdvisor,

        typeof doc.vendor==='string'
            ? doc.vendor
            : '',

        typeof doc.asesor==='string'
            ? doc.asesor
            : '',

        typeof doc.salesperson==='string'
            ? doc.salesperson
            : '',

        Auth.currentUser?.full_name,
        Auth.currentUser?.fullName,
        Auth.currentUser?.name,
        Auth.currentUser?.nombre,
        Auth.currentUser?.display_name,
        Auth.currentUser?.displayName,

        '---'

    );

    /* ============================================================
       TELÉFONO / EMAIL DEL ASESOR
    ============================================================ */

    const advisorPhone=firstValue(

        advisorRecord?.phone,
        advisorRecord?.telefono,

        advisorRecord?.mobile,
        advisorRecord?.cellphone,
        advisorRecord?.celular,

        advisorRecord?.phone_number,
        advisorRecord?.mobile_phone,

        advisorRecord?.telephone,

        doc.vendor_phone,
        doc.vendorPhone,

        doc.asesor_phone,
        doc.asesorPhone,

        doc.salesperson_phone,
        doc.salespersonPhone,

        doc.advisor_phone,
        doc.advisorPhone,

        doc.commercial_advisor_phone,
        doc.commercialAdvisorPhone,

        Auth.currentUser?.phone,
        Auth.currentUser?.telefono,
        Auth.currentUser?.mobile,
        Auth.currentUser?.celular,

        '9999999999'

    );

    const advisorEmail=firstValue(

        advisorRecord?.email,
        advisorRecord?.correo,
        advisorRecord?.mail,

        doc.vendor_email,
        doc.vendorEmail,

        doc.asesor_email,
        doc.asesorEmail,

        doc.salesperson_email,
        doc.salespersonEmail,

        doc.advisor_email,
        doc.advisorEmail,

        doc.commercial_advisor_email,
        doc.commercialAdvisorEmail,

        Auth.currentUser?.email,
        Auth.currentUser?.correo,

        'allparumi.ec@hotmail.com'

    );

    /* ============================================================
       PRODUCTOS
    ============================================================ */

    let itemsHtml='';

    if(type==='credit_note'){

        itemsHtml=`

            <tr>

                <td colspan="4" class="credit-note-cell">

                    <div>
                        Ajuste a factura:
                        ${esc(doc.invoice_num)}
                    </div>

                    <div>
                        Motivo:
                        ${esc(doc.reason)}
                    </div>

                    <div>
                        Descripción:
                        ${esc(doc.description)}
                    </div>

                </td>

            </tr>

        `;

    }else{

        itemsHtml=items.map((it,index)=>{

            const lineFinancial=itemFinancials[index];
            const lineTotal=type==='quote'
                ?(lineFinancial?.afterItemDiscount??((Number(it.qty)||0)*(Number(it.price)||0)))
                :(Number(it.disc_pct)>0?(Number(it.qty)||0)*(Number(it.price)||0):it.subtotal);
            const unitPriceDisplay=type==='quote'
                ?formatQuoteNumber(Number(it.price)||0)
                :Utils.formatMoney(it.price);
            const lineTotalDisplay=type==='quote'
                ?formatQuoteNumber(lineTotal)
                :Utils.formatMoney(lineTotal);

            const prod=DB.getOne(
                'products',
                it.prodId
            );

            const prodCode=
                it.prodCode||
                it.product_code||
                it.productCode||
                it.code||
                it.sku||
                prod?.code||
                prod?.product_code||
                prod?.productCode||
                prod?.sku||
                prod?.codigo||
                prod?.barcode||
                prod?.ref||
                '';
            const desc=type==='quote'
                ? (
                    it.prodName||
                    prod?.name||
                    prod?.description||
                    ''
                )
                : prod
                ? (
                    prod.description ||
                    it.prodName ||
                    prod.name ||
                    ''
                )
                : (
                    it.prodName ||
                    ''
                );

            let imgCell='';

            if(showImages){

                const productImage=

                    it.prodImg ||
                    it.image ||
                    it.img ||



                    (
                        prod &&
                        (
                            prod.image ||
                            prod.img ||
                            prod.photo ||
                            prod.photo_url ||
                            prod.image_url
                        )
                    ) ||

                    '';

                if(productImage){

                    imgCell=`

                        <div class="product-image-wrapper">

                            <img
                                src="${esc(productImage)}"
                                alt="${esc(desc)}"
                                class="product-image"
                            >

                        </div>

                    `;

                }else{

                    imgCell=`

                        <div class="product-image-placeholder"></div>

                    `;
                }
            }

            const photoCol=showImages
                ? `

                    <td class="photo-cell">
                        ${imgCell}
                    </td>

                  `
                : '';

            const codeCol=type==='quote'
                ? `
                    <td class="code-cell" style="font-size:8px;word-break:break-word">
                        ${prodCode?esc(prodCode):'—'}
                    </td>
                  `
                : '';

            return `

                <tr>

                    ${photoCol}
                    ${codeCol}

                    <td class="description-cell">
                        ${esc(desc)}
                    </td>

                    <td class="quantity-cell">
                        ${esc(it.qty)}
                    </td>

                    <td class="price-cell">
                        ${unitPriceDisplay}
                    </td>

                    <td class="total-cell">
                        ${lineTotalDisplay}
                    </td>

                </tr>

            `;

        }).join('');
    }

    /* ============================================================
       LOGO
    ============================================================ */

    const logoUrl=comp.logo||window.ALLPARUMI_LOGO||'';

    const logoHtml=(
        !comp.hideLogoPrint &&
        logoUrl
    )

        ? `

            <div class="logo-container">

                <img
                    src="${esc(logoUrl)}"
                    alt="ALLPARUMI"
                    class="company-logo"
                >

            </div>

          `

        : `

            <div class="logo-container empty-logo"></div>

          `;

    /* ============================================================
       CONDICIONES COMERCIALES
    ============================================================ */

    const defaultConditions=[

        {
            icon:'calendar',
            label:'Disponibilidad:',
            text:'Los precios y disponibilidad de los productos están sujetos a cambios sin previo aviso.'
        },

        {
            icon:'check',
            label:'Reserva de materiales:',
            text:'Para congelar los precios y garantizar la disponibilidad, se requiere un anticipo del 60% del valor total.'
        },

        {
            icon:'truck',
            label:'Tiempo de entrega:',
            text:'3 a 5 días hábiles, contados a partir de la confirmación del pedido y disponibilidad de los productos.'
        },

        {
            icon:'box',
            label:'Entrega:',
            text:'Se realizará en la ciudad de Loja. No incluye instalación ni trabajos adicionales.'
        },

        {
            icon:'rotate',
            label:'Cambios y devoluciones:',
            text:'No se aceptan cambios ni devoluciones en productos despachados o instalados.'
        },

        {
            icon: 'card',
            label: 'Forma de pago:',
            text: 'Contado o transferencia bancaria.\nBanco Pichincha | Cuenta de ahorros N.º 2216357877 | Titular: Luis Patricio Chamba Gaona.'
        },

        {
            icon:'document',
            label:'Propiedad de la oferta:',
            text:'Esta cotización es confidencial y de uso exclusivo del cliente. Queda prohibida su reproducción total o parcial.'
        }

    ];

    const iconSvg=(type)=>{

        const common=
            'viewBox="0 0 24 24" '+
            'fill="none" '+
            'stroke="#b08a57" '+
            'stroke-width="1.6" '+
            'stroke-linecap="round" '+
            'stroke-linejoin="round"';

        if(type==='calendar'){

            return `

                <svg ${common}>

                    <rect
                        x="3"
                        y="4"
                        width="18"
                        height="17"
                        rx="1"
                    />

                    <path d="M7 2v4M17 2v4M3 9h18"/>

                    <path d="M7 13h2M11 13h2M15 13h2M7 17h2"/>

                </svg>

            `;
        }

        if(type==='check'){

            return `

                <svg ${common}>

                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                    />

                    <path d="m8 12 2.5 2.5L16.5 9"/>

                </svg>

            `;
        }

        if(type==='truck'){

            return `

                <svg ${common}>

                    <path d="M3 6h11v10H3z"/>

                    <path d="M14 10h4l3 3v3h-7z"/>

                    <circle cx="7" cy="18" r="2"/>

                    <circle cx="18" cy="18" r="2"/>

                </svg>

            `;
        }

        if(type==='box'){

            return `

                <svg ${common}>

                    <path d="m4 7 8-4 8 4-8 4-8-4Z"/>

                    <path d="M4 7v10l8 4 8-4V7M12 11v10"/>

                </svg>

            `;
        }

        if(type==='rotate'){

            return `

                <svg ${common}>

                    <path d="M20 11a8 8 0 0 0-14-5L4 8"/>

                    <path d="M4 4v4h4"/>

                    <path d="M4 13a8 8 0 0 0 14 5l2-2"/>

                    <path d="M20 20v-4h-4"/>

                </svg>

            `;
        }

        if(type==='card'){

            return `

                <svg ${common}>

                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                    />

                    <path d="M3 9h18M7 14h4"/>

                </svg>

            `;
        }

        return `

            <svg ${common}>

                <path d="M6 3h9l4 4v14H6z"/>

                <path d="M15 3v5h5M9 12h6M9 16h6"/>

            </svg>

        `;
    };

    let conditionsData=[];

    if(Array.isArray(comp.conditions)){

        conditionsData=comp.conditions.map(c=>{

            if(typeof c==='object'){

                return {

                    icon:c.icon||'document',
                    label:c.label||'',
                    text:c.text||c.description||''

                };

            }

            return {

                icon:'document',
                label:'',
                text:String(c)

            };

        });

    }else{

        const savedConditions=String(
            comp.conditions||''
        )
        .split('|')
        .map(c=>c.trim())
        .filter(Boolean);

        if(savedConditions.length){

            conditionsData=savedConditions.map(c=>({

                icon:'document',
                label:'',
                text:c

            }));
        }
    }

    if(!conditionsData.length){

        conditionsData=defaultConditions;
    }

    conditionsData=conditionsData.filter(c=>{

        const completeText=
            `${c.label||''} ${c.text||''}`;

        return !/validez\s+de\s+la\s+oferta/i.test(
            completeText
        );

    });

    if(
        conditionsData.length<
        defaultConditions.length
    ){

        defaultConditions.forEach(def=>{

            const exists=conditionsData.some(existing=>{

                const a=
                    `${existing.label||''} ${existing.text||''}`
                    .toLowerCase();

                const b=
                    `${def.label||''} ${def.text||''}`
                    .toLowerCase();

                return (

                    (
                        def.label &&
                        a.includes(
                            def.label
                                .toLowerCase()
                                .replace(':','')
                        )
                    )

                    ||

                    a===b

                );

            });

            if(!exists){

                conditionsData.push(def);

            }

        });
    }

    const conditionsHtml=
        conditionsData.map(c=>`

            <div class="condition-item">

                <div class="condition-icon">
                    ${iconSvg(c.icon||'document')}
                </div>

                <div class="condition-text">

                    ${
                        c.label
                        ? `
                            <strong>
                                ${esc(c.label)}
                            </strong>
                          `
                        : ''
                    }

                    ${esc(c.text||'')}

                </div>

            </div>

        `).join('');

    /* ============================================================
       ESTILOS
    ============================================================ */

    const printStyles=`

<style>

@import url(
    'https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;500;600;700&display=swap'
);

/* ============================================================
   CONFIGURACIÓN DE PÁGINA
============================================================ */

@page{

    size:A4 portrait;

    margin:0;
}

*,
*::before,
*::after{

    box-sizing:border-box;

    font-family:
        'Roboto Condensed',
        'Arial Narrow',
        Arial,
        Helvetica,
        sans-serif !important;
}

html,
body{

    margin:0 !important;
    padding:0 !important;

    width:100% !important;

    background:#ffffff !important;

    color:#111111 !important;
}

body{

    -webkit-print-color-adjust:exact !important;
    print-color-adjust:exact !important;
}

#print-area{

    width:100% !important;

    margin:0 !important;

    padding:0 !important;

    background:#ffffff !important;
}

/* ============================================================
   DOCUMENTO A4
============================================================ */

.quotation-print{

    width:100% !important;

    height:297mm !important;

    min-height:297mm !important;

    max-height:297mm !important;

    margin:0 !important;

    padding:
        6mm
        8mm
        4mm
        8mm;

    background:#ffffff !important;

    color:#111111 !important;

    font-size:13px;

    font-weight:400;

    display:flex;

    flex-direction:column;

    position:relative;

    overflow:hidden !important;

    -webkit-print-color-adjust:exact !important;

    print-color-adjust:exact !important;
}

/* ============================================================
   ENCABEZADO
============================================================ */

.quotation-header{

    width:100%;

    height:57mm;

    min-height:57mm;

    position:relative;

    margin:0 0 4mm 0;

    padding:0;

    border-bottom:1.2px solid ${GOLD};

    flex-shrink:0;
}

/* ============================================================
   EMPRESA
============================================================ */

.company-info{

    position:absolute;

    left:0;

    top:3mm;

    width:50mm;

    text-align:left;

    font-size:11.5px;

    line-height:1.35;

    font-weight:400;

    color:#111111;
}

.company-name{

    font-size:21px;

    line-height:1.05;

    font-weight:700;

    color:#111111;

    margin:0;

    padding:0;
}

.company-subtitle{

    font-size:11.5px;

    line-height:1.1;

    font-weight:500;

    color:${GOLD};

    margin:1.5mm 0 3mm 0;
}

/* ============================================================
   LOGO
   MISMA POSICIÓN / TAMAÑO VISUAL
   SIN DEFORMAR LA PROPORCIÓN ORIGINAL
============================================================ */

.logo-container{

    position:absolute;

    width:227px;

    height:227px;

    left:50%;

    top:0;

    transform:translateX(-50%);

    display:flex;

    align-items:center;

    justify-content:center;

    background:transparent !important;

    z-index:50 !important;

    overflow:visible !important;

}


.company-logo{

    width:auto !important;

    height:auto !important;

    min-width:0 !important;

    min-height:0 !important;

    max-width:227px !important;

    max-height:227px !important;

    object-fit:contain !important;

    object-position:center center !important;

    display:block !important;

    margin:0 !important;

    padding:0 !important;

    border:0 !important;

    border-radius:0 !important;

    background:transparent !important;

    position:relative !important;

    z-index:51 !important;

    overflow:visible !important;

    clip-path:none !important;
}


.empty-logo{

    visibility:hidden;
}

/* ============================================================
   TÍTULO DEL DOCUMENTO
============================================================ */

.quotation-info{

    position:absolute;

    right:${QUOTATION_RIGHT};

    top:${QUOTATION_TOP};

    width:${QUOTATION_WIDTH};

    text-align:right;

    z-index:5;
}

.quotation-title{

    font-size:34px !important;

    line-height:.95;

    font-weight:700;

    color:#111111;

    margin:0 0 3mm 0;

    padding:0;

    white-space:nowrap;

    text-align:right;

    letter-spacing:-.5px;
}

.quotation-title.document-title-logistics{

    font-size:20px !important;

    letter-spacing:-.2px;

    line-height:1.05;
}

.quotation-number,
.quotation-date{

    font-size:12.5px;

    line-height:1.5;

    font-weight:400;

    color:#222222;

    text-align:right;

    margin:0;
}

.quotation-number strong,
.quotation-date strong{

    font-weight:700;
}

/* ============================================================
   CLIENTE / INFORMACIÓN COMERCIAL
============================================================ */

.customer-commercial{
    width:100%;
    min-height:30mm;
    display:flex;
    flex-direction:row;
    justify-content:space-between;
    align-items:flex-start;
    gap:7mm;
    margin:0 0 4mm 0;
    padding:0;
    flex-shrink:0;
}

.customer-box{
    flex:1 1 auto;
    min-width:0;
    max-width:108mm;
    font-size:11.5px;
    line-height:1.4;
    color:#222222;
}

.commercial-box{
    flex:0 0 66mm;
    width:66mm;
    min-width:0;
    padding-left:4mm;
    border-left:1px solid #d6d0c8;
    font-size:11.5px;
    line-height:1.4;
    color:#222222;
}

/* ============================================================
   TABLA
============================================================ */

.products-table{

    width:100%;

    border-collapse:collapse;

    border-spacing:0;

    table-layout:fixed;

    margin:0 0 3mm 0;

    border:1px solid #d6d0c8;

    background:#ffffff;

    flex-shrink:0;
}

.products-table thead{

    display:table-header-group;
}

.products-table thead th{

    height:8mm;

    background:${GOLD} !important;

    color:#ffffff !important;

    font-size:12px;

    font-weight:700;

    padding:4px 4px;

    border:1px solid #9a7650;

    text-transform:uppercase;

    vertical-align:middle;
}

.products-table tbody tr{

    page-break-inside:avoid;

    break-inside:avoid;

    background:#ffffff;
}

.products-table tbody tr:nth-child(even){

    background:#f7f5f2;
}

.products-table tbody td{

    font-size:12px;

    font-weight:400;

    color:#222222;

    padding:4px 5px;

    border-left:1px solid #d6d0c8;

    border-right:1px solid #d6d0c8;

    border-top:1px solid #d6d0c8;

    vertical-align:middle;

    line-height:1.2;
}

.products-table tbody tr:last-child td{

    border-bottom:1px solid #d6d0c8 !important;
}

/* ============================================================
   COLUMNAS
============================================================ */

.photo-column{

    width:19mm;

    text-align:center;
}

.description-column{

    text-align:left;
}

.quantity-column{

    width:14mm;

    text-align:center;
}

.price-column{

    width:25mm;

    text-align:right;
}

.total-column{

    width:29mm;

    text-align:right;
}

.photo-cell{

    width:19mm;

    height:18mm;

    text-align:center;

    vertical-align:middle;

    padding:2px !important;
}

.description-cell{

    text-align:left;

    vertical-align:middle;

    word-wrap:break-word;

    overflow-wrap:break-word;
}

.quantity-cell{

    text-align:center;

    vertical-align:middle;
}

.price-cell{

    text-align:right;

    vertical-align:middle;

    white-space:nowrap;
}

.total-cell{

    text-align:right;

    vertical-align:middle;

    white-space:nowrap;

    font-weight:700;
}

/* ============================================================
   IMÁGENES
============================================================ */

.product-image-wrapper{

    width:16mm;

    height:16mm;

    margin:0 auto;

    display:flex;

    justify-content:center;

    align-items:center;

    overflow:hidden;

    background:#ffffff;
}

.product-image{

    width:15mm !important;

    height:15mm !important;

    display:block !important;

    margin:0 auto !important;

    object-fit:contain !important;

    object-position:center center !important;

    border:0 !important;

    border-radius:0 !important;

    background:#ffffff !important;
}

.product-image-placeholder{

    width:15mm;

    height:15mm;

    margin:0 auto;

    background:#f2f2f2;

    border:1px solid #dddddd;
}

.credit-note-cell{

    text-align:center;

    padding:20px !important;

    font-size:12px;

    font-style:italic;
}

/* ============================================================
   OBSERVACIONES / TOTALES
============================================================ */

.observations-totals{

    width:100%;

    display:grid;

    grid-template-columns:1fr 40%;

    column-gap:15px;

    align-items:start;

    margin:2mm 0 0 0;

    flex-shrink:0;
}

.observations{

    width:100%;

    padding:0;
}

.observations-title{

    font-size:12px;

    font-weight:700;

    color:${GOLD};

    margin:0 0 1.5mm 0;

    text-transform:uppercase;
}

.observations-text{

    font-size:11.5px;

    font-weight:400;

    color:#444444;

    line-height:1.3;
}

/* ============================================================
   TOTALES
============================================================ */

.totals-box{

    width:100%;

    border:1px solid #9a7650;

    padding:3mm 4mm;

    background:#ffffff;
}

.total-row{

    display:flex;

    justify-content:space-between;

    align-items:center;

    padding:1mm 0;

    font-size:11.5px;

    font-weight:400;

    color:#222222;
}

.discount-row{

    color:#9a742d;

    font-weight:600;
}

.final-total{

    display:flex;

    justify-content:space-between;

    align-items:center;

    margin-top:1mm;

    padding-top:1.5mm;

    border-top:1px solid #9a7650;

    font-size:13px;

    font-weight:700;

    color:#111111;
}

/* ============================================================
   BLOQUE INFERIOR
============================================================ */

.bottom-section{

    width:100%;

    display:flex;

    flex-direction:column;

    align-items:stretch;

    margin-top:5mm;

    flex-shrink:0;

    page-break-inside:avoid;

    break-inside:avoid;
}

/* ============================================================
   CONDICIONES COMERCIALES
============================================================ */

.conditions{

    width:100%;

    border:0 !important;

    padding:0;

    margin:0;

    page-break-inside:avoid;

    break-inside:avoid;
}

.conditions-title{

    font-size:12px;

    font-weight:700;

    color:${GOLD};

    text-transform:uppercase;

    margin:0 0 1.5mm 0;

    padding:0;

    line-height:1;
}

.conditions-list{

    width:100%;

    display:flex;

    flex-direction:column;

    gap:1mm;
}

.condition-item{

    width:100%;

    display:grid;

    grid-template-columns:4mm 1fr;

    column-gap:1.5mm;

    align-items:start;

    font-size:9.5px !important;

    font-weight:400;

    color:#444444 !important;

    line-height:1.12;

    margin:0 !important;

    padding:0 !important;

    break-inside:avoid;
}

.condition-icon{

    width:4mm;

    height:4mm;

    display:flex;

    justify-content:center;

    align-items:center;
}

.condition-icon svg{

    width:3.3mm;

    height:3.3mm;

    display:block;
}

.condition-text{

    padding-top:0;
}

.condition-text strong{

    font-weight:700;

    color:#333333;
}

/* ============================================================
   AGRADECIMIENTO + FIRMAS
============================================================ */

.final-bottom-row{

    width:100%;

    display:grid;

    grid-template-columns:minmax(0,1fr) ${SIGNATURES_WIDTH};

    column-gap:8mm;

    align-items:end;

    margin-top:6mm;

    padding:0;

    page-break-inside:avoid;

    break-inside:avoid;
}

.thanks-message{

    width:100%;

    margin:0;

    padding:0;

    text-align:left;

    font-size:11px;

    font-weight:500;

    color:#444444;

    line-height:1.2;

    align-self:end;

    page-break-inside:avoid;

    break-inside:avoid;
}

.thanks-message strong{

    font-weight:700;

    color:${GOLD};
}

/* ============================================================
   FIRMAS
============================================================ */

.signatures{

    width:${SIGNATURES_WIDTH};

    display:grid;

    grid-template-columns:1fr 1fr;

    column-gap:8mm;

    margin:150;

    padding:0;

    align-self:end;

    page-break-inside:avoid;

    break-inside:avoid;

    flex-shrink:0;
}

.signature{

    width:100%;

    text-align:center;

    min-width:0;
}

.signature-line{

    width:82%;

    height:13mm;

    border-bottom:1px solid #333333;

    border-top:0;

    margin:0 auto 1.5mm auto;
}

.signature-name{

    font-size:9.5px;

    font-weight:700;

    text-transform:uppercase;

    color:#111111;

    line-height:1.1;

    min-height:3mm;

    white-space:normal;
}

.signature-label{

    font-size:8.8px;

    font-weight:400;

    color:#555555;

    margin-top:.7mm;

    line-height:1.1;
}

.signature-contact{

    display:none !important;
}

/* ============================================================
   ESPACIO
============================================================ */

.bottom-space{

    flex:1 1 auto;

    min-height:2mm;
}

/* ============================================================
   PIE
============================================================ */

.document-footer{

    width:100%;

    flex-shrink:0;

    border-top:1px solid ${GOLD};

    padding:2mm 0 0 0;

    margin:1mm 0 0 0;

    text-align:center;

    page-break-inside:avoid;

    break-inside:avoid;
}

.footer-company{

    font-size:11px;

    font-weight:700;

    color:${GOLD};

    line-height:1.2;
}

.footer-company span{

    font-weight:500;
}

.footer-contact{

    font-size:10px;

    font-weight:400;

    color:#444444;

    margin-top:1mm;

    line-height:1.2;
}

/* ============================================================
   IMPRESIÓN
============================================================ */

@media print{

    html,
    body{

        width:100% !important;

        margin:0 !important;

        padding:0 !important;

        background:#ffffff !important;
    }

    #print-area{

        display:block !important;

        width:100% !important;

        margin:0 !important;

        padding:0 !important;

        background:#ffffff !important;
    }

    .quotation-print{

        width:100% !important;

        height:297mm !important;

        min-height:297mm !important;

        max-height:297mm !important;

        margin:0 !important;

        padding:
            6mm
            8mm
            4mm
            8mm !important;

        position:relative !important;

        display:flex !important;

        flex-direction:column !important;

        overflow:hidden !important;

        page-break-after:avoid !important;

        break-after:avoid-page !important;

        -webkit-print-color-adjust:exact !important;

        print-color-adjust:exact !important;
    }

    /*
       IMPORTANTE:
       No forzar width/height iguales al logo.
       Se conserva su relación de aspecto original.
    */

    .logo-container{

        width:227px !important;

        height:227px !important;

        left:50% !important;

        top:0 !important;

        transform:translateX(-50%) !important;

        display:flex !important;

        align-items:center !important;

        justify-content:center !important;

        overflow:visible !important;
    }

    .company-logo{

        width:auto !important;

        height:auto !important;

        min-width:0 !important;

        min-height:0 !important;

        max-width:227px !important;

        max-height:227px !important;

        object-fit:contain !important;

        object-position:center center !important;

        display:block !important;

        margin:0 !important;

        padding:0 !important;

        border:0 !important;

        border-radius:0 !important;

        clip-path:none !important;

        transform:none !important;

    }

    .products-table tr{

        page-break-inside:avoid !important;

        break-inside:avoid !important;
    }

    .quotation-header,
    .customer-commercial,
    .observations-totals,
    .bottom-section,
    .conditions,
    .final-bottom-row,
    .signatures,
    .thanks-message,
    .document-footer{

        page-break-inside:avoid !important;

        break-inside:avoid !important;
    }
}

</style>
`;

    /* ============================================================
       CONTENIDO
    ============================================================ */

    const printContent=`

        ${printStyles}

        <div class="quotation-print">

            <!-- =================================================
                 ENCABEZADO
            ================================================= -->

            <div class="quotation-header">

                <div class="company-info">

                    <div class="company-name">

                        ${esc(
                            comp.name ||
                            'ALLPARUMI'
                        )}

                    </div>

                    <div class="company-subtitle">

                        ${esc(
                            comp.subtitle ||
                            'todo para tus proyectos'
                        )}

                    </div>

                    <div>

                        <strong>RUC:</strong>

                        ${esc(
                            comp.ruc ||
                            '1104985682001'
                        )}

                    </div>

                    <div>

                        <strong>Dir:</strong>

                        ${esc(
                            comp.address ||
                            'Loja, Ecuador'
                        )}

                    </div>

                    <div>

                        <strong>Contacto:</strong>

                        ${esc(
                            window.ALLPARUMI_PHONE
                        )}

                    </div>

                    <div>

                        <strong>Correo:</strong>

                        ${esc(
                            comp.email ||
                            'allparumi.ec@hotmail.com'
                        )}

                    </div>

                </div>

                ${logoHtml}

                <div class="quotation-info">

                    <div class="
                        quotation-title
                        ${
                            type==='logistics'
                            ? 'document-title-logistics'
                            : ''
                        }
                    ">

                        ${esc(title)}

                    </div>

                    <div class="quotation-number">

                        <strong>N.º:</strong>

                        ${esc(
                            doc.number ||
                            '17'
                        )}

                    </div>

                    <div class="quotation-date">

                        <strong>FECHA:</strong>

                        ${esc(
                            doc.date
                                ? Utils.formatDate(doc.date)
                                : '---'
                        )}

                    </div>

                </div>

            </div>

            <!-- =================================================
                 CLIENTE / INFORMACIÓN COMERCIAL
            ================================================= -->

            <div class="customer-commercial">

                <div class="customer-box">

                    <div class="section-title">
                        CLIENTE
                    </div>

                    <div>

                        <strong>Nombre:</strong>

                        ${esc(clientName)}

                    </div>

                    <div>

                        <strong>${clientDocLabel}:</strong>

                        ${esc(finalClientIdentification)}

                    </div>

                    <div>

                        <strong>Dirección:</strong>

                        ${esc(
                            client?.address ||
                            '999999999'
                        )}

                    </div>

                    <div>

                        <strong>Contacto:</strong>

                        ${esc(
                            client?.phone ||
                            '999999999'
                        )}

                    </div>

                    <div>

                        <strong>Correo:</strong>

                        ${esc(
                            client?.email ||
                            '999999999'
                        )}

                    </div>

                </div>

                <div class="commercial-box">

                    <div class="section-title">
                        INFORMACIÓN COMERCIAL
                    </div>

                    <div>

                        <strong>Validez:</strong>

                        ${
                            doc.validity
                            ? `${esc(doc.validity)} días`
                            : '8 días'
                        }

                    </div>

                    <div>

                        <strong>Entrega:</strong>

                        ${
                            doc.delivery_date
                            ? Utils.formatDate(
                                doc.delivery_date
                            )
                            : 'A coordinar'
                        }

                    </div>

                    <div>

                        <strong>Asesor:</strong>

                        ${esc(advisorName)}

                    </div>

                    <div>

                        <strong>Teléfono:</strong>

                        ${esc(advisorPhone)}

                    </div>

                    <div>

                        <strong>Email:</strong>

                        ${esc(advisorEmail)}

                    </div>

                </div>

            </div>

            <!-- =================================================
                 TABLA DE PRODUCTOS
            ================================================= -->

            <table class="products-table">

                <colgroup>

                    ${
                        showImages
                        ? `
                            <col style="width:19mm">
                          `
                        : ''
                    }

                    ${
                        type==='quote'
                        ? `
                            <col style="width:20mm">
                          `
                        : ''
                    }

                    <col>

                    <col style="width:14mm">

                    <col style="width:25mm">

                    <col style="width:29mm">

                </colgroup>

                <thead>

                    <tr>

                        ${
                            showImages
                            ? `
                                <th class="photo-column">
                                    FOTO
                                </th>
                              `
                            : ''
                        }

                        ${
                            type==='quote'
                            ? `
                                <th class="code-column">
                                    CÓDIGO
                                </th>
                              `
                            : ''
                        }

                        <th class="description-column">
                            ${type==='quote'?'PRODUCTO':'DESCRIPCIÓN'}
                        </th>

                        <th class="quantity-column">
                            CANT.
                        </th>

                        <th class="price-column">
                            P. UNIT.
                        </th>

                        <th class="total-column">
                            ${type==='quote'?'TOTAL ÍTEM SIN IVA':'TOTAL SIN IVA'}
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${itemsHtml}

                </tbody>

            </table>

            <!-- =================================================
                 OBSERVACIONES / TOTALES
            ================================================= -->

            <div class="observations-totals">

                <div class="observations">

                    <div class="observations-title">
                        OBSERVACIONES
                        <div class="observations-text">

                            ${esc(
                                doc.observations ||
                                doc.notes ||
                                doc.note ||
                                ''
                            )}

                        </div>

                </div>

                <div class="totals-box">

                    <div class="total-row">
                        <span>SUBTOTAL:</span>
                        <span>${subtotalFormatted}</span>
                    </div>

                    ${discountAmount>0 ? `
                        <div class="total-row discount-row">
                            <span>DESCUENTO:</span>
                            <span>-${discountFormatted}</span>
                        </div>
                    ` : ''}

                    ${ivaRowsHtml || (ivaAmount>0 ? `
                        <div class="total-row">
                            <span>IVA:</span>
                            <span>${ivaFormatted}</span>
                        </div>
                    ` : '')}

                    <div class="final-total">

                        <span>
                            TOTAL A CANCELAR:
                        </span>

                        <span>
                            ${totalFormatted}
                        </span>

                    </div>

                </div>

            </div>

            <!-- =================================================
                 CONDICIONES
            ================================================= -->

            <div class="bottom-section">

                <div class="conditions">

                    <div class="conditions-title">
                        CONDICIONES COMERCIALES
                    </div>

                    <div class="conditions-list">

                        ${conditionsHtml}

                    </div>

                </div>

                <!-- =============================================
                     AGRADECIMIENTO + FIRMAS
                ============================================== -->

                <div class="final-bottom-row">

                    <div class="thanks-message">

                        Agradecemos su confianza en

                        <strong>
                            ALLPARUMI
                        </strong>

                    </div>

                    <div class="signatures">

                        <!-- CLIENTE -->

                        <div class="signature">

                            <div class="signature-line"></div>

                            <div class="signature-name">

                                ${esc(clientName)}

                            </div>

                            <div class="signature-label">

                                FIRMA DEL CLIENTE

                            </div>

                        </div>

                        <!-- ASESOR -->

                        <div class="signature">

                            <div class="signature-line"></div>

                            <div class="signature-name">

                                ${esc(([advisorRecord?.name,advisorRecord?.lastname].filter(Boolean).join(' ')||advisorName))}

                            </div>

                            <div class="signature-label">

                                ASESOR COMERCIAL

                            </div>

                        </div>

                    </div>

                </div>

            </div>

            <!-- =================================================
                 ESPACIO FINAL
            ================================================= -->

            <div class="bottom-space"></div>

            <!-- =================================================
                 PIE
            ================================================= -->

            <div class="document-footer">

                <div class="footer-company">

                    ALLPARUMI

                    <span>
                        | todo para tus proyectos
                    </span>

                </div>

                <div class="footer-contact">

                    ${esc(
                        comp.address ||
                        'Loja, Santa Marianita de Jesús 08-16 10 de Agosto'
                    )}

                    &nbsp; | &nbsp;

                    ${esc(
                        window.ALLPARUMI_PHONE
                    )}

                    &nbsp; | &nbsp;

                    ${esc(
                        comp.email ||
                        'allparumi.ec@hotmail.com'
                    )}

                </div>

            </div>

        </div>

    `;

    /* ============================================================
       IMPRIMIR
    ============================================================ */

    const pa=document.getElementById(
        'print-area'
    );

    if(!pa)return;

    pa.innerHTML='';

    pa.innerHTML=printContent;

    pa.classList.remove('hidden');

    const images=Array.from(
        pa.querySelectorAll('img')
    );

    const waitForImages=images.map(img=>{

        if(img.complete){

            return Promise.resolve();

        }

        return new Promise(resolve=>{

            img.onload=resolve;

            img.onerror=resolve;

        });

    });

    Promise.all(waitForImages).then(
        async()=>{

            if(
                document.fonts &&
                document.fonts.ready
            ){

                try{

                    await document.fonts.ready;

                    await document.fonts.load(
                        '400 13px "Roboto Condensed"'
                    );

                    await document.fonts.load(
                        '700 13px "Roboto Condensed"'
                    );

                }catch(error){

                    console.warn(
                        'No se pudo verificar la carga de la fuente:',
                        error
                    );
                }
            }

            setTimeout(()=>{

                window.print();

                setTimeout(()=>{

                    pa.classList.add('hidden');

                    pa.innerHTML='';

                },1200);

            },300);

        }
    );
},


downloadPDF:async function(type,id,outputMode='download',printWindow=null){

    let doc=null;
    let title='';
    let items=[];
    let showImages=true;

    /* =========================================================
       CARGAR DOCUMENTO
    ========================================================= */

    if(type==='quote'){

        doc=DB.getOne('quotes',id);
        title='COTIZACIÓN';
        items=JSON.parse(doc?.items||'[]');
        showImages=true;

    }else if(type==='order'){

        doc=DB.getOne('orders',id);
        title='PEDIDO DE VENTA';
        items=JSON.parse(doc?.items||'[]');
        showImages=false;

    }else if(type==='invoice'){

        doc=DB.getOne('invoices',id);
        title='FACTURA';
        items=JSON.parse(doc?.items||'[]');
        showImages=true;

    }else if(type==='reservation'){

        doc=DB.getOne('reservations',id);
        title='RESERVA DE STOCK';
        items=JSON.parse(doc?.items||'[]');
        showImages=false;

    }else if(type==='sales_note'){

        doc=DB.getOne('sales_notes',id);
        title='NOTA DE VENTA';
        items=JSON.parse(doc?.items||'[]');
        showImages=false;

    }else if(type==='credit_note'){

        doc=DB.getOne('credit_notes',id);
        title='NOTA DE CRÉDITO';
        items=[];
        showImages=false;

    }else if(type==='logistics'){

        doc=DB.getOne('logistics',id);
        title='GUÍA DE DESPACHO';
        items=[];
        showImages=false;
    }

    if(!doc){

        UI.toast('No se encontró el documento');

        return;
    }

    const comp=Auth.currentCompany||{};
    const client=DB.getOne('clients',doc.client_id);

    /* =========================================================
       CONFIGURACIÓN VISUAL
    ========================================================= */

    const GOLD='#b08a57';
    const DARK='#111111';

    /*
       LOGO
       Se mantiene 225 x 225.
       No se deforma.
       No se recorta.
    */
    const LOGO_SIZE=225;
    const LOGO_WIDTH=225;

    /* =========================================================
       ESCAPE HTML
    ========================================================= */

    const esc=(value)=>{

        if(value===null||value===undefined)return '';

        return String(value)
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#039;');
    };

    /* =========================================================
       CLIENTE
    ========================================================= */

    const clientName=client
        ? `${client.name||''} ${client.lastname||''}`.trim()
        : 'Consumidor Final';

    const clientIdentification=
        client?.doc||
        client?.document||
        client?.document_number||
        client?.identification||
        client?.identification_number||
        client?.cedula||
        client?.cedula_ruc||
        client?.ruc||
        client?.tax_id||
        client?.passport||
        client?.pasaporte||
        client?.id_number||
        client?.dni||
        '';

    const clientTypeRaw=String(
        client?.doc_type||
        client?.document_type||
        client?.identification_type||
        client?.tipo_documento||
        client?.tipo_identificacion||
        client?.type_document||
        client?.id_type||
        ''
    ).toLowerCase().trim();

    const normalizedClientId=String(
        clientIdentification||''
    )
        .replace(/\s+/g,'')
        .replace(/[-.]/g,'');

    const isConsumerFinal=

        /consumidor\s*final/i.test(clientName)||

        client?.is_consumer_final===true||

        client?.consumer_final===true||

        client?.isConsumerFinal===true||

        /^9+$/.test(normalizedClientId);

    let clientDocLabel='CF';

    if(!isConsumerFinal){

        if(
            clientTypeRaw.includes('cedula')||
            clientTypeRaw.includes('cédula')||
            clientTypeRaw==='cc'||
            clientTypeRaw==='ci'||
            /^\d{10}$/.test(normalizedClientId)
        ){

            clientDocLabel='CC';

        }else if(
            clientTypeRaw.includes('ruc')||
            /^\d{13}$/.test(normalizedClientId)
        ){

            clientDocLabel='RUC';

        }else if(
            clientTypeRaw.includes('pasaporte')||
            clientTypeRaw.includes('passport')||
            clientTypeRaw==='pa'
        ){

            clientDocLabel='PA';

        }else if(normalizedClientId){

            clientDocLabel='PA';
        }
    }

    const finalClientIdentification=isConsumerFinal
        ? '999999999'
        : (clientIdentification||'---');

    /* =========================================================
       ASESOR COMERCIAL
    ========================================================= */

    const possibleAdvisorObjects=[

        doc.vendor,
        doc.asesor,
        doc.salesperson,
        doc.vendor_data,
        doc.asesor_data,
        doc.salesperson_data,
        doc.vendor_user,
        doc.asesor_user,
        doc.salesperson_user,
        doc.created_by_user,
        doc.user

    ].filter(v=>v&&typeof v==='object');

    const advisorIds=[

        doc.vendor,
        doc.vendor_id,
        doc.vendorId,

        doc.asesor_id,
        doc.asesorId,

        doc.salesperson_id,
        doc.salespersonId,

        doc.advisor_id,
        doc.advisorId,

        doc.created_by,
        doc.created_by_id,

        doc.user_id,
        doc.userId

    ].filter(v=>{

        return (
            v!==null &&
            v!==undefined &&
            String(v).trim()!==''
        );

    });

    let advisorRecord=null;

    /* =========================================================
       1. OBJETO DIRECTO
    ========================================================= */

    if(possibleAdvisorObjects.length){

        advisorRecord=
            possibleAdvisorObjects.find(obj=>{

                return (

                    obj.id||

                    obj.user_id||
                    obj.vendor_id||

                    obj.name||
                    obj.full_name||
                    obj.fullName||
                    obj.nombre||

                    obj.display_name||
                    obj.displayName||

                    obj.username||

                    obj.email||
                    obj.correo||

                    obj.phone||
                    obj.telefono||
                    obj.mobile||
                    obj.celular

                );

            })||null;
    }

    /* =========================================================
       2. BUSCAR POR ID
    ========================================================= */

    if(!advisorRecord&&advisorIds.length){

        const advisorTables=[

            'users',
            'vendors',
            'employees',
            'salespeople',
            'sellers',
            'asesores',
            'staff'

        ];

        for(const advisorId of advisorIds){

            for(const table of advisorTables){

                try{

                    const found=DB.getOne(
                        table,
                        advisorId
                    );

                    if(found){

                        const hasUsefulData=(

                            found.id||

                            found.name||
                            found.full_name||
                            found.fullName||
                            found.nombre||

                            found.display_name||
                            found.displayName||

                            found.username||

                            found.email||
                            found.correo||

                            found.phone||
                            found.telefono||
                            found.mobile||
                            found.celular

                        );

                        if(hasUsefulData){

                            advisorRecord=found;

                            break;
                        }
                    }

                }catch(error){}

            }

            if(advisorRecord)break;
        }
    }

    /* =========================================================
       3. BUSCAR DENTRO DE REGISTROS
    ========================================================= */

    if(!advisorRecord&&advisorIds.length){

        const advisorTables=[

            'users',
            'vendors',
            'employees',
            'salespeople',
            'sellers',
            'asesores',
            'staff'

        ];

        for(const advisorId of advisorIds){

            for(const table of advisorTables){

                try{

                    const records=DB.getAll(
                        table,
                        comp.id
                    )||[];

                    const found=records.find(record=>{

                        if(!record)return false;

                        const ids=[

                            record.id,
                            record._id,

                            record.user_id,
                            record.userId,

                            record.vendor_id,
                            record.vendorId,

                            record.employee_id,
                            record.employeeId,

                            record.salesperson_id,
                            record.salespersonId

                        ]
                        .filter(v=>
                            v!==null&&
                            v!==undefined
                        )
                        .map(v=>String(v));

                        return ids.includes(
                            String(advisorId)
                        );

                    });

                    if(found){

                        advisorRecord=found;

                        break;
                    }

                }catch(error){}

            }

            if(advisorRecord)break;
        }
    }

    /* =========================================================
       4. BUSCAR POR TEXTO
    ========================================================= */

    if(!advisorRecord){

        const possibleVendorText=

            typeof doc.vendor==='string'
                ? doc.vendor
                : (

                    typeof doc.asesor==='string'
                        ? doc.asesor
                        : (

                            typeof doc.salesperson==='string'
                                ? doc.salesperson
                                : (

                                    doc.vendor_name||
                                    doc.vendorName||
                                    doc.asesor_name||
                                    doc.asesorName||
                                    doc.salesperson_name||
                                    doc.salespersonName||
                                    doc.advisor_name||
                                    doc.advisorName||
                                    ''

                                )

                        )

                );

        if(possibleVendorText){

            const advisorTables=[

                'users',
                'vendors',
                'employees',
                'salespeople',
                'sellers',
                'asesores',
                'staff'

            ];

            const searchText=
                String(possibleVendorText)
                    .toLowerCase()
                    .trim();

            for(const table of advisorTables){

                try{

                    const records=DB.getAll(
                        table,
                        comp.id
                    )||[];

                    const found=records.find(record=>{

                        if(!record)return false;

                        const values=[

                            record.id,

                            record.name,
                            record.full_name,
                            record.fullName,
                            record.nombre,

                            record.display_name,
                            record.displayName,

                            record.username,

                            record.email,
                            record.correo

                        ]
                        .filter(v=>
                            v!==null&&
                            v!==undefined
                        )
                        .map(v=>
                            String(v)
                                .toLowerCase()
                                .trim()
                        );

                        return values.includes(
                            searchText
                        );

                    });

                    if(found){

                        advisorRecord=found;

                        break;
                    }

                }catch(error){}
            }
        }
    }

    /* =========================================================
       NOMBRE ASESOR
    ========================================================= */

    const advisorName=

        advisorRecord?.full_name||
        advisorRecord?.fullName||

        advisorRecord?.name||
        advisorRecord?.nombre||

        advisorRecord?.display_name||
        advisorRecord?.displayName||

        advisorRecord?.username||

        doc.vendor_name||
        doc.vendorName||

        doc.asesor_name||
        doc.asesorName||

        doc.salesperson_name||
        doc.salespersonName||

        doc.advisor_name||
        doc.advisorName||

        doc.commercial_advisor||
        doc.commercialAdvisor||

        typeof doc.vendor==='string'
            ? doc.vendor
            : (

                typeof doc.asesor==='string'
                    ? doc.asesor
                    : (

                        typeof doc.salesperson==='string'
                            ? doc.salesperson
                            : '---'

                    )

            );

    /* =========================================================
       TELÉFONO / EMAIL ASESOR
    ========================================================= */

    const advisorPhone=

        advisorRecord?.phone||
        advisorRecord?.telefono||

        advisorRecord?.mobile||
        advisorRecord?.cellphone||
        advisorRecord?.celular||

        advisorRecord?.phone_number||
        advisorRecord?.mobile_phone||

        advisorRecord?.telephone||

        doc.vendor_phone||
        doc.vendorPhone||

        doc.asesor_phone||
        doc.asesorPhone||

        doc.salesperson_phone||
        doc.salespersonPhone||

        doc.advisor_phone||
        doc.advisorPhone||

        doc.commercial_advisor_phone||
        doc.commercialAdvisorPhone||

        Auth.currentUser?.phone||
        Auth.currentUser?.telefono||
        Auth.currentUser?.mobile||
        Auth.currentUser?.celular||

        '9999999999';

    const advisorEmail=

        advisorRecord?.email||
        advisorRecord?.correo||
        advisorRecord?.mail||

        doc.vendor_email||
        doc.vendorEmail||

        doc.asesor_email||
        doc.asesorEmail||

        doc.salesperson_email||
        doc.salespersonEmail||

        doc.advisor_email||
        doc.advisorEmail||

        doc.commercial_advisor_email||
        doc.commercialAdvisorEmail||

        Auth.currentUser?.email||
        Auth.currentUser?.correo||

        'allparumi.ec@hotmail.com';

    /* =========================================================
       CÁLCULO DE TOTALES — LECTURA REAL DEL DOCUMENTO
       Nunca se usa el IVA general de la empresa como fallback.
    ========================================================= */

    const finNum=(value)=>{
        const n=Number(value);
        return Number.isFinite(n)?n:0;
    };

    const finClamp=(value,min,max)=>Math.min(max,Math.max(min,value));

    const itemFinancials=items.map((it)=>{
        const qty=Math.max(0,finNum(it.qty ?? it.quantity ?? 0));
        const price=Math.max(0,finNum(it.price ?? it.unitPrice ?? it.precio ?? 0));
        const gross=qty*price;

        let lineDiscount=0;
        const explicitDiscount=finNum(it.discount_amount ?? it.discountAmount);
        const itemDiscountPercent=it.disc_pct ?? it.discount_pct ?? it.discountPct;
        const hasItemDiscountPercent=itemDiscountPercent!==undefined&&itemDiscountPercent!==null&&itemDiscountPercent!=='';
        const rawDiscount=Math.max(0,finNum(hasItemDiscountPercent?itemDiscountPercent:(it.discount ?? it.descuento)));

        if(explicitDiscount>0){
            lineDiscount=Math.min(gross,explicitDiscount);
        }else if(rawDiscount>0){
            const isAmount=!hasItemDiscountPercent&&(it.discount_type==='amount'||it.discountType==='amount'||it.discount_is_amount===true);
            lineDiscount=isAmount
                ?Math.min(gross,rawDiscount)
                :(rawDiscount<=100?gross*(rawDiscount/100):Math.min(gross,rawDiscount));
        }

        const afterItemDiscount=Math.max(0,gross-lineDiscount);
        const product=it.prodId?DB.getOne('products',it.prodId):null;
        const hasItemVat=it.iva!==undefined&&it.iva!==null&&it.iva!=='';
        const hasProductVat=product?.iva!==undefined&&product?.iva!==null&&product?.iva!=='';
        const vatRate=finClamp(finNum(hasItemVat?it.iva:(hasProductVat?product.iva:0)),0,100);

        return {it,qty,price,gross,lineDiscount,afterItemDiscount,vatRate};
    });

    const grossSubtotal=itemFinancials.length
        ?itemFinancials.reduce((s,x)=>s+x.gross,0)
        :Math.max(0,finNum(doc.subtotal));

    const itemDiscountTotal=itemFinancials.reduce((s,x)=>s+x.lineDiscount,0);
    const subtotalAfterItemDiscount=itemFinancials.reduce((s,x)=>s+x.afterItemDiscount,0);
    const discountRate=finClamp(finNum(doc.discount),0,100);
    const calculatedGlobalDiscount=subtotalAfterItemDiscount*(discountRate/100);
    const calculatedDiscountAmount=itemDiscountTotal+calculatedGlobalDiscount;
    const storedDiscountAmount=Math.max(0,finNum(doc.discount_amount ?? doc.discountAmount));
    const discountAmount=storedDiscountAmount>0?storedDiscountAmount:calculatedDiscountAmount;
    const subtotalAfterDiscount=Math.max(0,grossSubtotal-discountAmount);

    let taxBreakdown={};
    if(doc.tax_breakdown&&typeof doc.tax_breakdown==='object'){
        Object.values(doc.tax_breakdown).forEach((row)=>{
            const rate=finClamp(finNum(row?.rate),0,100);
            const tax=Math.max(0,finNum(row?.tax ?? row?.iva ?? row?.amount));
            const base=Math.max(0,finNum(row?.base));
            if(tax>0||base>0)taxBreakdown[String(rate)]={rate,base,tax};
        });
    }

    const hasStoredIva=doc.iva!==undefined&&doc.iva!==null&&doc.iva!==''&&Number.isFinite(Number(doc.iva));
    let ivaAmount=hasStoredIva?Math.max(0,finNum(doc.iva)):0;

    if(!hasStoredIva && Object.keys(taxBreakdown).length){
        ivaAmount=Object.values(taxBreakdown).reduce((s,x)=>s+finNum(x.tax),0);
    }

    if(!hasStoredIva && !Object.keys(taxBreakdown).length && itemFinancials.length){
        const globalFactor=subtotalAfterItemDiscount>0
            ?Math.max(0,(subtotalAfterItemDiscount-calculatedGlobalDiscount)/subtotalAfterItemDiscount)
            :1;
        itemFinancials.forEach((x)=>{
            const base=x.afterItemDiscount*globalFactor;
            const tax=base*(x.vatRate/100);
            ivaAmount+=tax;
            if(x.vatRate>0){
                const key=String(x.vatRate);
                taxBreakdown[key]=taxBreakdown[key]||{rate:x.vatRate,base:0,tax:0};
                taxBreakdown[key].base+=base;
                taxBreakdown[key].tax+=tax;
            }
        });
    }

    const storedTotal=finNum(doc.total);
    const calculatedTotal=subtotalAfterDiscount+ivaAmount;
    const finalTotal=storedTotal>0?storedTotal:calculatedTotal;

    const formatQuoteNumber=value=>Utils.formatMoney(value).replace(/[^\d,.-]/g,'');
    const formatSummaryMoney=value=>type==='quote'?formatQuoteNumber(value):Utils.formatMoney(value);
    const subtotalFormatted=formatSummaryMoney(grossSubtotal);
    const discountFormatted=formatSummaryMoney(discountAmount);
    const ivaFormatted=formatSummaryMoney(ivaAmount);
    const totalFormatted=Utils.formatMoney(finalTotal);

    const ivaRowsHtml=ivaAmount>0
        ?`<div class="total-row"><span>IVA:</span><span>${ivaFormatted}</span></div>`
        :'';

    /* =========================================================
       PRODUCTOS
    ========================================================= */

    let itemsHtml='';

    if(type==='credit_note'){

        itemsHtml=`

            <tr>

                <td
                    colspan="4"
                    class="credit-note-cell"
                >

                    <div>
                        Ajuste a factura:
                        ${esc(doc.invoice_num)}
                    </div>

                    <div>
                        Motivo:
                        ${esc(doc.reason)}
                    </div>

                    <div>
                        Descripción:
                        ${esc(doc.description)}
                    </div>

                </td>

            </tr>

        `;

    }else{

        itemsHtml=items.map((it,index)=>{

            const lineFinancial=itemFinancials[index];
            const lineTotal=type==='quote'
                ?(lineFinancial?.afterItemDiscount??((Number(it.qty)||0)*(Number(it.price)||0)))
                :(Number(it.disc_pct)>0?(Number(it.qty)||0)*(Number(it.price)||0):it.subtotal);
            const unitPriceDisplay=type==='quote'
                ?formatQuoteNumber(Number(it.price)||0)
                :Utils.formatMoney(it.price);
            const lineTotalDisplay=type==='quote'
                ?formatQuoteNumber(lineTotal)
                :Utils.formatMoney(lineTotal);

            const prod=DB.getOne(
                'products',
                it.prodId
            );

            const productCode=type==='quote'
                ? (
                    it.prodCode||
                    it.product_code||
                    it.productCode||
                    it.code||
                    it.sku||
                    prod?.code||
                    prod?.product_code||
                    prod?.productCode||
                    prod?.sku||
                    prod?.codigo||
                    prod?.barcode||
                    prod?.ref||
                    ''
                )
                : '';

            const desc=type==='quote'
                ? (
                    it.prodName||
                    prod?.name||
                    prod?.description||
                    ''
                )
                : prod
                ? (
                    prod.description||
                    it.prodName||
                    prod.name||
                    ''
                )
                : (
                    it.prodName||
                    ''
                );

            let imgCell='';

            if(showImages){

                const productImage=

                    it.prodImg||
                    it.image||
                    it.img||

                    (
                        prod&&(
                            prod.image||
                            prod.img||
                            prod.photo||
                            prod.photo_url||
                            prod.image_url
                        )
                    )||

                    '';

                if(productImage){

                    imgCell=`

                        <div class="product-image-wrapper">

                            <img
                                src="${esc(productImage)}"
                                alt="${esc(desc)}"
                                class="product-image"
                                crossorigin="anonymous"
                            >

                        </div>

                    `;

                }else{

                    imgCell=`

                        <div class="product-image-placeholder"></div>

                    `;
                }
            }

            const photoCol=showImages
                ? `

                    <td class="photo-cell">

                        ${imgCell}

                    </td>

                  `
                : '';

            return `

                <tr>

                    ${photoCol}
                    ${type==='quote'?`<td class="code-cell" style="font-size:8px;word-break:break-word">${productCode?esc(productCode):'—'}</td>`:''}

                    <td class="description-cell">

                        ${esc(desc)}

                    </td>

                    <td class="quantity-cell">

                        ${esc(it.qty)}

                    </td>

                    <td class="price-cell">

                        ${unitPriceDisplay}

                    </td>

                    <td class="total-cell">

                        ${lineTotalDisplay}

                    </td>

                </tr>

            `;

        }).join('');
    }

    /* =========================================================
       LOGO
       CORREGIDO
    ========================================================= */

    const logoUrl=comp.logo||window.ALLPARUMI_LOGO||'';

    const logoHtml=
        (!comp.hideLogoPrint&&logoUrl)

        ? `

            <div class="logo-container">

                <img
                    src="${esc(logoUrl)}"
                    alt="ALLPARUMI"
                    class="company-logo"
                    crossorigin="anonymous"
                >

            </div>

          `

        : `

            <div class="logo-container empty-logo"></div>

          `;

    /* =========================================================
       CONDICIONES COMERCIALES
    ========================================================= */

    const defaultConditions=[

        {
            icon:'calendar',
            label:'Disponibilidad:',
            text:'Los precios y disponibilidad de los productos están sujetos a cambios sin previo aviso.'
        },

        {
            icon:'check',
            label:'Reserva de materiales:',
            text:'Para congelar los precios y garantizar la disponibilidad, se requiere un anticipo del 60% del valor total.'
        },

        {
            icon:'truck',
            label:'Tiempo de entrega:',
            text:'3 a 5 días hábiles, contados a partir de la confirmación del pedido y disponibilidad de los productos.'
        },

        {
            icon:'box',
            label:'Entrega:',
            text:'Se realizará en la ciudad de Loja. No incluye instalación ni trabajos adicionales.'
        },

        {
            icon:'rotate',
            label:'Cambios y devoluciones:',
            text:'No se aceptan cambios ni devoluciones en productos despachados o instalados.'
        },

        {
            icon:'card',
            label:'Forma de pago:',
            text:'Contado o transferencia bancaria.\nBanco Pichincha | Cuenta de ahorros N.º 2216357877 | Titular: Luis Patricio Chamba Gaona.'
        },

        {
            icon:'document',
            label:'Propiedad de la oferta:',
            text:'Esta cotización es confidencial y de uso exclusivo del cliente. Queda prohibida su reproducción total o parcial.'
        }

    ];

    const iconSvg=(type)=>{

        const common=
            'viewBox="0 0 24 24" '+
            'fill="none" '+
            'stroke="#b08a57" '+
            'stroke-width="1.6" '+
            'stroke-linecap="round" '+
            'stroke-linejoin="round"';

        if(type==='calendar'){

            return `

                <svg ${common}>

                    <rect
                        x="3"
                        y="4"
                        width="18"
                        height="17"
                        rx="1"
                    />

                    <path d="M7 2v4M17 2v4M3 9h18"/>

                    <path d="M7 13h2M11 13h2M15 13h2M7 17h2"/>

                </svg>

            `;
        }

        if(type==='check'){

            return `

                <svg ${common}>

                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                    />

                    <path d="m8 12 2.5 2.5L16.5 9"/>

                </svg>

            `;
        }

        if(type==='truck'){

            return `

                <svg ${common}>

                    <path d="M3 6h11v10H3z"/>

                    <path d="M14 10h4l3 3v3h-7z"/>

                    <circle cx="7" cy="18" r="2"/>

                    <circle cx="18" cy="18" r="2"/>

                </svg>

            `;
        }

        if(type==='box'){

            return `

                <svg ${common}>

                    <path d="m4 7 8-4 8 4-8 4-8-4Z"/>

                    <path d="M4 7v10l8 4 8-4V7M12 11v10"/>

                </svg>

            `;
        }

        if(type==='rotate'){

            return `

                <svg ${common}>

                    <path d="M20 11a8 8 0 0 0-14-5L4 8"/>

                    <path d="M4 4v4h4"/>

                    <path d="M4 13a8 8 0 0 0 14 5l2-2"/>

                    <path d="M20 20v-4h-4"/>

                </svg>

            `;
        }

        if(type==='card'){

            return `

                <svg ${common}>

                    <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                    />

                    <path d="M3 9h18M7 14h4"/>

                </svg>

            `;
        }

        return `

            <svg ${common}>

                <path d="M6 3h9l4 4v14H6z"/>

                <path d="M15 3v5h5M9 12h6M9 16h6"/>

            </svg>

        `;
    };

    let conditionsData=[];

    if(Array.isArray(comp.conditions)){

        conditionsData=comp.conditions.map(c=>{

            if(typeof c==='object'){

                return {

                    icon:c.icon||'document',

                    label:c.label||'',

                    text:c.text||c.description||''

                };

            }

            return {

                icon:'document',

                label:'',

                text:String(c)

            };

        });

    }else{

        const savedConditions=String(
            comp.conditions||''
        )
        .split('|')
        .map(c=>c.trim())
        .filter(Boolean);

        if(savedConditions.length){

            conditionsData=savedConditions.map(c=>({

                icon:'document',

                label:'',

                text:c

            }));
        }
    }

    if(!conditionsData.length){

        conditionsData=defaultConditions;
    }

    conditionsData=conditionsData.filter(c=>{

        const completeText=
            `${c.label||''} ${c.text||''}`;

        return !/validez\s+de\s+la\s+oferta/i.test(
            completeText
        );

    });

    if(
        conditionsData.length<
        defaultConditions.length
    ){

        defaultConditions.forEach(def=>{

            const exists=conditionsData.some(existing=>{

                const a=
                    `${existing.label||''} ${existing.text||''}`
                    .toLowerCase();

                return (

                    def.label&&
                    a.includes(
                        def.label
                            .toLowerCase()
                            .replace(':','')
                    )

                    ||

                    a===(
                        `${def.label||''} ${def.text||''}`
                        .toLowerCase()
                    )

                );

            });

            if(!exists){

                conditionsData.push(def);

            }

        });
    }

    const conditionsHtml=
        conditionsData.map(c=>`

            <div class="condition-item">

                <div class="condition-icon">

                    ${iconSvg(
                        c.icon||'document'
                    )}

                </div>

                <div class="condition-text">

                    ${
                        c.label
                        ? `
                            <strong>
                                ${esc(c.label)}
                            </strong>
                          `
                        : ''
                    }

                    ${esc(c.text||'')}

                </div>

            </div>

        `).join('');

    /* =========================================================
       ESTILOS PDF
    ========================================================= */

    const pdfStyles=`

<style>

@import url(
    'https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;500;600;700&display=swap'
);

*,
*::before,
*::after{

    box-sizing:border-box;

    font-family:
        'Roboto Condensed',
        'Arial Narrow',
        Arial,
        Helvetica,
        sans-serif !important;
}

html,
body{

    margin:0 !important;

    padding:0 !important;

    width:100% !important;

    background:#ffffff !important;

    color:#111111 !important;
}

body{

    -webkit-print-color-adjust:exact !important;

    print-color-adjust:exact !important;
}

#pdf-area{

    width:794px !important;

    height:1123px !important;

    margin:0 !important;

    padding:0 !important;

    background:#ffffff !important;

    overflow:hidden !important;
}

/* ============================================================
   A4
============================================================ */

.quotation-print{

    width:794px !important;

    height:1123px !important;

    min-height:1123px !important;

    max-height:1123px !important;

    margin:0 !important;

    padding:
        23px
        30px
        15px
        30px;

    background:#ffffff !important;

    color:#111111 !important;

    font-size:13px;

    font-weight:400;

    display:flex;

    flex-direction:column;

    position:relative;

    overflow:hidden !important;

    -webkit-print-color-adjust:exact !important;

    print-color-adjust:exact !important;
}

/* ============================================================
   ENCABEZADO
============================================================ */

.quotation-header{

    width:100%;

    height:227px;

    min-height:227px;

    position:relative;

    margin:0 0 15px 0;

    padding:0;

    border-bottom:2px solid ${GOLD};

    flex-shrink:0;

    /*
       MUY IMPORTANTE:
       permitimos que el logo sobresalga.
    */
    overflow:visible !important;
}

/* ============================================================
   EMPRESA
============================================================ */

.company-info{

    position:absolute;

    left:0;

    top:2px;

    width:300px;

    text-align:left;

    font-size:11.5px;

    line-height:1.38;

    font-weight:400;

    color:#111111;

    z-index:5;
}

.company-name{

    font-size:21px;

    line-height:1.05;

    font-weight:700;

    color:#111111;

    margin:0;

    padding:0;
}

.company-subtitle{

    font-size:11.5px;

    line-height:1.1;

    font-weight:500;

    color:${GOLD};

    margin:5px 0 11px 0;
}

/* ============================================================
   LOGO
============================================================ */

.logo-container{

    position:absolute;

    width:225px !important;

    height:225px !important;

    left:50%;

    top:0;

    transform:translateX(-50%);

    display:flex;

    align-items:center;

    justify-content:center;

    background:transparent !important;

    z-index:50;

    /*
       Nunca recortar el logo.
    */
    overflow:visible !important;

    margin:0;

    padding:0;

    border:0;
}

/*
   Línea dorada que atraviesa TODO el encabezado,
   incluyendo visualmente el logo.
*/

.quotation-header::after{

    content:"";

    position:absolute;

    left:0;

    right:0;

    bottom:0;

    height:2px;

    background:${GOLD};

    z-index:100;

    pointer-events:none;
}

/*
   El logo queda por debajo de la línea,
   por eso la línea se ve atravesándolo.
*/

.company-logo{

    width:225px !important;

    height:225px !important;

    min-width:225px !important;

    min-height:225px !important;

    max-width:225px !important;

    max-height:225px !important;

    object-fit:contain !important;

    object-position:center center !important;

    display:block !important;

    margin:0 !important;

    padding:0 !important;

    border:0 !important;

    border-radius:0 !important;

    background:transparent !important;

    position:relative !important;

    z-index:50 !important;

    /*
       Nada de clip-path.
       Nada de deformación.
    */
    clip-path:none !important;

    overflow:visible !important;

    transform:none !important;
}

.empty-logo{

    visibility:hidden;
}

/* ============================================================
   INFORMACIÓN DEL DOCUMENTO
============================================================ */

.quotation-info{

    position:absolute;

    right:0;

    top:2px;

    width:max-content;

    height:auto;

    text-align:left;

    z-index:6;
}

.quotation-title{

    display:block;

    width:max-content;

    margin:0 0 11px 0;

    padding:0;

    font-size:34px !important;

    line-height:.95;

    font-weight:700;

    color:#111111;

    white-space:nowrap;

    text-align:left;

    letter-spacing:-.5px;
}

.quotation-title.document-title-logistics{

    font-size:20px !important;

    letter-spacing:-.2px;

    line-height:1.05;
}

.quotation-number,
.quotation-date{

    width:100%;

    margin:0;

    font-size:12.5px;

    line-height:1.5;

    font-weight:400;

    color:#222222;

    text-align:left;
}

.quotation-number strong,
.quotation-date strong{

    font-weight:700;
}

/* ============================================================
   CLIENTE / COMERCIAL
============================================================ */

.customer-commercial{
    width:100%;
    min-height:113px;
    display:flex;
    flex-direction:row;
    justify-content:space-between;
    align-items:flex-start;
    gap:28px;
    margin:0 0 11px 0;
    padding:0;
    flex-shrink:0;
}

.customer-box{
    flex:1 1 auto;
    min-width:0;
    max-width:410px;
    font-size:11.5px;
    line-height:1.42;
    color:#222222;
}

.commercial-box{
    flex:0 0 250px;
    width:250px;
    min-width:0;
    padding-left:16px;
    border-left:1px solid #d6d0c8;
    font-size:11.5px;
    line-height:1.42;
    color:#222222;
}

.section-title{

    width:100%;

    font-size:13px;

    font-weight:700;

    color:${GOLD};

    text-transform:uppercase;

    margin:0 0 6px 0;

    padding:0;

    border:0 !important;

    line-height:1.1;
}

/* ============================================================
   CAMPOS
   ETIQUETA + : + VALOR SIN ESPACIO EXTRA
============================================================ */

.customer-field,
.commercial-field{

    width:100%;

    display:grid;

    grid-template-columns:max-content minmax(0,1fr);
    column-gap:4px;

    align-items:baseline;

    margin:0;

    padding:0;
}

.customer-field strong,
.commercial-field strong{

    font-weight:700;

    color:#222222;

    white-space:nowrap;

    margin:0 !important;

    padding:0 !important;
}

.customer-field span,
.commercial-field span{
    margin:0 !important;
    padding:0 !important;
    overflow-wrap:anywhere;
}

/* ============================================================
   TABLA
============================================================ */

.products-table{

    width:100%;

    border-collapse:collapse;

    border-spacing:0;

    table-layout:fixed;

    margin:0 0 11px 0;

    border:1px solid #d6d0c8;

    background:#ffffff;

    flex-shrink:0;
}

.products-table thead{

    display:table-header-group;
}

.products-table thead th{

    height:30px;

    background:${GOLD} !important;

    color:#ffffff !important;

    font-size:12px;

    font-weight:700;

    padding:4px 4px;

    border:1px solid #9a7650;

    text-transform:uppercase;

    vertical-align:middle;
}

.products-table tbody tr{

    page-break-inside:avoid;

    break-inside:avoid;

    background:#ffffff;
}

.products-table tbody tr:nth-child(even){

    background:#f7f5f2;
}

.products-table tbody td{

    font-size:12px;

    font-weight:400;

    color:#222222;

    padding:5px;

    border-left:1px solid #d6d0c8;

    border-right:1px solid #d6d0c8;

    border-top:1px solid #d6d0c8;

    vertical-align:middle;

    line-height:1.2;
}

.products-table tbody tr:last-child td{

    border-bottom:1px solid #d6d0c8 !important;
}

/* ============================================================
   COLUMNAS
============================================================ */

.photo-column{

    width:72px;

    text-align:center;
}

.description-column{

    text-align:left;
}

.quantity-column{

    width:53px;

    text-align:center;
}

.price-column{

    width:94px;

    text-align:right;
}

.total-column{

    width:110px;

    text-align:right;
}

.photo-cell{

    width:72px;

    height:68px;

    text-align:center;

    vertical-align:middle;

    padding:2px !important;
}

.description-cell{

    text-align:left;

    vertical-align:middle;

    word-wrap:break-word;

    overflow-wrap:break-word;
}

.quantity-cell{

    text-align:center;

    vertical-align:middle;
}

.price-cell{

    text-align:right;

    vertical-align:middle;

    white-space:nowrap;
}

.total-cell{

    text-align:right;

    vertical-align:middle;

    white-space:nowrap;

    font-weight:700;
}

/* ============================================================
   IMÁGENES PRODUCTOS
============================================================ */

.product-image-wrapper{

    width:60px;

    height:60px;

    margin:0 auto;

    display:flex;

    justify-content:center;

    align-items:center;

    overflow:hidden;

    background:#ffffff;
}

.product-image{

    width:58px !important;

    height:58px !important;

    display:block !important;

    margin:0 auto !important;

    object-fit:contain !important;

    object-position:center center !important;

    border:0 !important;

    border-radius:0 !important;

    background:#ffffff !important;
}

.product-image-placeholder{

    width:58px;

    height:58px;

    margin:0 auto;

    background:#f2f2f2;

    border:1px solid #dddddd;
}

.credit-note-cell{

    text-align:center;

    padding:20px !important;

    font-size:12px;

    font-style:italic;
}

/* ============================================================
   OBSERVACIONES / TOTALES
============================================================ */

.observations-totals{

    width:100%;

    display:grid;

    grid-template-columns:minmax(0,1fr) 40%;

    column-gap:15px;

    align-items:start;

    margin:7px 0 0 0;

    flex-shrink:0;
}

.observations{

    width:100%;

    padding:0;
}

.observations-title{

    font-size:12px;

    font-weight:700;

    color:${GOLD};

    margin:0 0 6px 0;

    text-transform:uppercase;
}

.observations-text{

    font-size:11.5px;

    font-weight:400;

    color:#444444;

    line-height:1.3;
}

/* ============================================================
   TOTALES
============================================================ */

.totals-box{

    width:100%;

    border:1px solid #9a7650;

    padding:9px 11px;

    background:#ffffff;
}

.total-row{

    display:flex;

    justify-content:space-between;

    align-items:center;

    padding:3px 0;

    font-size:11.5px;

    font-weight:400;

    color:#222222;
}

.discount-row{

    color:#9a742d;

    font-weight:600;
}

.final-total{

    display:flex;

    justify-content:space-between;

    align-items:center;

    margin-top:4px;

    padding-top:6px;

    border-top:1px solid #9a7650;

    font-size:13px;

    font-weight:700;

    color:#111111;
}

/* ============================================================
   BLOQUE INFERIOR
============================================================ */

.bottom-section{

    width:100%;

    display:grid;

    grid-template-columns:
        minmax(0,1fr)
        330px;

    column-gap:22px;

    align-items:end;

    margin-top:14px;

    flex-shrink:0;

    page-break-inside:avoid;

    break-inside:avoid;
}

/* ============================================================
   CONDICIONES
============================================================ */

.conditions{

    width:100%;

    border:0 !important;

    padding:0;

    margin:0;

    page-break-inside:avoid;

    break-inside:avoid;
}

.conditions-title{

    font-size:11.5px;

    font-weight:700;

    color:${GOLD};

    text-transform:uppercase;

    margin:0 0 5px 0;

    padding:0;

    line-height:1;
}

.conditions-list{

    width:100%;

    display:flex;

    flex-direction:column;

    gap:3px;
}

.condition-item{

    width:100%;

    display:grid;

    grid-template-columns:14px minmax(0,1fr);

    column-gap:5px;

    align-items:start;

    font-size:8.8px !important;

    font-weight:400;

    color:#444444 !important;

    line-height:1.08;

    margin:0 !important;

    padding:0 !important;

    break-inside:avoid;
}

.condition-icon{

    width:14px;

    height:14px;

    display:flex;

    justify-content:center;

    align-items:center;
}

.condition-icon svg{

    width:11px;

    height:11px;

    display:block;
}

.condition-text{

    padding-top:0;
}

.condition-text strong{

    font-weight:700;

    color:#333333;
}

/* ============================================================
   AGRADECIMIENTO
============================================================ */

.thanks-message{

    width:100%;

    margin:7px 0 0 0;

    padding:0;

    text-align:left;

    font-size:10px;

    font-weight:500;

    color:#444444;

    line-height:1.2;

    page-break-inside:avoid;

    break-inside:avoid;
}

.thanks-message strong{

    font-weight:700;

    color:${GOLD};
}

/* ============================================================
   FIRMAS
============================================================ */

.signatures{

    width:330px;

    display:grid;

    grid-template-columns:1fr 1fr;

    column-gap:18px;

    margin:0;

    padding:0;

    align-self:end;

    page-break-inside:avoid;

    break-inside:avoid;

    flex-shrink:0;
}

.signature{

    width:100%;

    text-align:center;

    min-width:0;
}

.signature-line{

    width:72%;

    height:35px;

    border-bottom:1px solid #333333;

    border-top:0;

    margin:0 auto 5px auto;
}

.signature-name {
        text-transform: none !important;
    }
.signature-label{

    font-size:8px;

    font-weight:400;

    color:#555555;

    margin-top:2px;

    line-height:1.05;
}

/* ============================================================
   ESPACIO FINAL
============================================================ */

.bottom-space{

    flex:1 1 auto;

    min-height:2px;
}

/* ============================================================
   PIE
============================================================ */

.document-footer{

    width:100%;

    flex-shrink:0;

    border-top:1px solid ${GOLD};

    padding:7px 0 0 0;

    margin:4px 0 0 0;

    text-align:center;

    page-break-inside:avoid;

    break-inside:avoid;
}

.footer-company{

    font-size:11px;

    font-weight:700;

    color:${GOLD};

    line-height:1.2;
}

.footer-company span{

    font-weight:500;
}

.footer-contact{

    font-size:10px;

    font-weight:400;

    color:#444444;

    margin-top:4px;

    line-height:1.2;
}

</style>

`;

    /* =========================================================
       CONTENIDO PDF
    ========================================================= */

    const pdfContent=`

        ${pdfStyles}

        <div id="pdf-area">

            <div class="quotation-print">

                <!-- =================================================
                     ENCABEZADO
                ================================================= -->

                <div class="quotation-header">

                    <div class="company-info">

                        <div class="company-name">

                            ${esc(
                                comp.name||
                                'ALLPARUMI'
                            )}

                        </div>

                        <div class="company-subtitle">

                            ${esc(
                                comp.subtitle||
                                'todo para tus proyectos'
                            )}

                        </div>

                        <div>

                            <strong>RUC:</strong>

                            ${esc(
                                comp.ruc||
                                '1104985682001'
                            )}

                        </div>

                        <div>

                            <strong>Dir:</strong>

                            ${esc(
                                comp.address||
                                'Loja, Santa Marianita de Jesús 08-16 10 de Agosto'
                            )}

                        </div>

                        <div>

                            <strong>Contacto:</strong>

                            ${esc(
                                window.ALLPARUMI_PHONE
                            )}

                        </div>

                        <div>

                            <strong>Correo:</strong>

                            ${esc(
                                comp.email||
                                'allparumi.ec@hotmail.com'
                            )}

                        </div>

                    </div>


                    ${logoHtml}


                    <div class="quotation-info">

                        <div
                            class="
                                quotation-title
                                ${
                                    type==='logistics'
                                    ? 'document-title-logistics'
                                    : ''
                                }
                            "
                        >

                            ${esc(title)}

                        </div>

                        <div class="quotation-number">

                            <strong>N.º:</strong>

                            ${esc(
                                doc.number||
                                id||
                                '---'
                            )}

                        </div>

                        <div class="quotation-date">

                            <strong>FECHA:</strong>

                            ${esc(
                                doc.date
                                    ? Utils.formatDate(doc.date)
                                    : '---'
                            )}

                        </div>

                    </div>

                </div>


                <!-- =================================================
                     CLIENTE / INFORMACIÓN COMERCIAL
                ================================================= -->

                <div class="customer-commercial">

                    <div class="customer-box">

                        <div class="section-title">

                            CLIENTE

                        </div>

                        <div class="customer-field">

                            <strong>Nombre:</strong><span>
                                ${esc(clientName)}
                            </span>

                        </div>

                        <div class="customer-field">

                            <strong>${clientDocLabel}:</strong><span>
                                ${esc(
                                    finalClientIdentification
                                )}
                            </span>

                        </div>

                        <div class="customer-field">

                            <strong>Dirección:</strong><span>
                                ${esc(
                                    client?.address||
                                    '999999999'
                                )}
                            </span>

                        </div>

                        <div class="customer-field">

                            <strong>Contacto:</strong><span>
                                ${esc(
                                    client?.phone||
                                    '999999999'
                                )}
                            </span>

                        </div>

                        <div class="customer-field">

                            <strong>Correo:</strong><span>
                                ${esc(
                                    client?.email||
                                    '999999999'
                                )}
                            </span>

                        </div>

                    </div>


                    <div class="commercial-box">

                        <div class="section-title">

                            INFORMACIÓN COMERCIAL

                        </div>

                        <div class="commercial-field">

                            <strong>Validez:</strong><span>
                                ${
                                    doc.validity
                                    ? `${esc(doc.validity)} días`
                                    : '8 días'
                                }
                            </span>

                        </div>

                        <div class="commercial-field">

                            <strong>Entrega:</strong><span>
                                ${
                                    doc.delivery_date
                                    ? Utils.formatDate(
                                        doc.delivery_date
                                    )
                                    : 'A coordinar'
                                }
                            </span>

                        </div>

                        <div class="commercial-field">

                            <strong>Asesor:</strong><span>
                               ${esc(([advisorRecord?.name,advisorRecord?.lastname].filter(Boolean).join(' ')||advisorName))}
                            </span>

                        </div>

                        <div class="commercial-field">

                            <strong>Teléfono:</strong><span>
                                0992796300
                            </span>

                        </div>

                        <div class="commercial-field">

                            <strong>Correo:</strong><span>
                                allparumi.ec@hotmail.com
                            </span>

                        </div>

                    </div>

                </div>


                <!-- =================================================
                     TABLA PRODUCTOS
                ================================================= -->

                <table class="products-table">

                    <colgroup>

                        ${
                            showImages
                            ? `
                                <col style="width:72px">
                              `
                            : ''
                        }

                        ${
                            type==='quote'
                            ? `
                                <col style="width:68px">
                              `
                            : ''
                        }

                        <col>

                        <col style="width:53px">

                        <col style="width:94px">

                        <col style="width:110px">

                    </colgroup>

                    <thead>

                        <tr>

                            ${
                                showImages
                                ? `
                                    <th class="photo-column">
                                        FOTO
                                    </th>
                                  `
                                : ''
                            }

                            ${
                                type==='quote'
                                ? `
                                    <th class="code-column">
                                        CÓDIGO
                                    </th>
                                  `
                                : ''
                            }

                            <th class="description-column">

                                ${type==='quote'?'PRODUCTO':'DESCRIPCIÓN'}

                            </th>

                            <th class="quantity-column">

                                CANT.

                            </th>

                            <th class="price-column">

                                P. UNIT.

                            </th>

                            <th class="total-column">

                                ${type==='quote'?'TOTAL ÍTEM SIN IVA':'TOTAL SIN IVA'}

                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${itemsHtml}

                    </tbody>

                </table>


                <!-- =================================================
                     OBSERVACIONES / TOTALES
                ================================================= -->

                <div class="observations-totals">

                    <div class="observations">

                        <div class="observations-title">

                            OBSERVACIONES

                        </div>

                        <div class="observations-text">

                            ${esc(
                                doc.observations ||
                                doc.notes ||
                                doc.note ||
                                ''
                            )}

                        </div>

                    </div>


                    <div class="totals-box">

                        <div class="total-row">

                            <span>
                                SUBTOTAL:
                            </span>

                            <span>
                                ${subtotalFormatted}
                            </span>

                        </div>


                        ${
                            discountAmount>0
                            ? `
                                <div class="total-row discount-row">
                                    <span>DESCUENTO:</span>
                                    <span>-${discountFormatted}</span>
                                </div>
                              `
                            : ''
                        }

                        ${ivaRowsHtml || (ivaAmount>0 ? `
                            <div class="total-row">
                                <span>IVA:</span>
                                <span>${ivaFormatted}</span>
                            </div>
                        ` : '')}

                        <div class="final-total">

                            <span>
                                TOTAL A CANCELAR:
                            </span>

                            <span>
                                ${totalFormatted}
                            </span>

                        </div>

                    </div>

                </div>


                <!-- =================================================
                     CONDICIONES + FIRMAS
                ================================================= -->

                <div class="bottom-section">

                    <div class="conditions">

                        <div class="conditions-title">

                            CONDICIONES COMERCIALES

                        </div>

                        <div class="conditions-list">

                            ${conditionsHtml}

                        </div>

                        <div class="thanks-message">

                            Agradecemos su confianza en

                            <strong>
                                ALLPARUMI
                            </strong>

                        </div>

                    </div>


                    <div class="signatures">

                        <div class="signature">

                            <div class="signature-line"></div>

                            <div class="signature-name">

                                ${esc(clientName)}

                            </div>

                            <div class="signature-label">

                                FIRMA DEL CLIENTE

                            </div>

                         </div>

                        <!-- ASESOR -->

                        <div class="signature">

                            <div class="signature-line"></div>

                            <div class="signature-name">

                               ${esc(([advisorRecord?.name,advisorRecord?.lastname].filter(Boolean).join(' ')||advisorName))}

                            </div>

                            <div class="signature-label">

                                ASESOR COMERCIAL

                            </div>

                        </div>

                    </div>

                </div>

            </div>


                <!-- =================================================
                     ESPACIO
                ================================================= -->

                <div class="bottom-space"></div>


                <!-- =================================================
                     PIE
                ================================================= -->

                <div class="document-footer">

                    <div class="footer-company">

                        ALLPARUMI

                        <span>
                            | todo para tus proyectos
                        </span>

                    </div>

                    <div class="footer-contact">

                        ${esc(
                            comp.address||
                            'Loja, Santa Marianita de Jesús 08-16 10 de Agosto'
                        )}

                        &nbsp; | &nbsp;

                        ${esc(
                            window.ALLPARUMI_PHONE
                        )}

                        &nbsp; | &nbsp;

                        ${esc(
                            comp.email||
                            'allparumi.ec@hotmail.com'
                        )}

                    </div>

                </div>

            </div>

        </div>

    `;

    /* =========================================================
       PREPARAR ÁREA PDF
    ========================================================= */

    const pa=document.getElementById(
        'print-area'
    );

    if(!pa){

        UI.toast(
            'No se encontró el área para generar el PDF'
        );

        return;
    }

    pa.innerHTML='';

    pa.innerHTML=pdfContent;

    pa.classList.remove('hidden');


    /* =========================================================
       ESPERAR IMÁGENES
    ========================================================= */

    const images=Array.from(
        pa.querySelectorAll('img')
    );

    const waitForImages=images.map(img=>{

        if(img.complete){

            return Promise.resolve();

        }

        return new Promise(resolve=>{

            img.onload=resolve;

            img.onerror=resolve;

        });

    });


    try{

        await Promise.all(
            waitForImages
        );

        if(
            document.fonts&&
            document.fonts.ready
        ){

            await document.fonts.ready;

            await document.fonts.load(
                '400 13px "Roboto Condensed"'
            );

            await document.fonts.load(
                '700 13px "Roboto Condensed"'
            );
        }

    }catch(error){

        console.warn(
            'No se pudieron cargar completamente imágenes/fuentes:',
            error
        );
    }


    /* =========================================================
       ESPERA DE RENDERIZADO
    ========================================================= */

    await new Promise(resolve=>{

        setTimeout(
            resolve,
            300
        );

    });


    /* Cliente (izquierda) / Información comercial (derecha) lo resuelve el CSS (flex). */
    /* =========================================================
       SEGUNDA ESPERA
    ========================================================= */

    await new Promise(resolve=>{

        setTimeout(
            resolve,
            80
        );

    });


    /* =========================================================
       GENERAR CANVAS
    ========================================================= */

    let canvas;

    try{

        canvas=await html2canvas(

            pa.querySelector(
                '#pdf-area'
            ),

            {

                scale:2.5,

                useCORS:true,

                allowTaint:false,

                backgroundColor:'#ffffff',

                logging:false,

                imageTimeout:15000,

                width:794,

                height:1123,

                windowWidth:794,

                windowHeight:1123,

                scrollX:0,

                scrollY:0

            }

        );

    }catch(error){

        console.error(
            'Error generando canvas:',
            error
        );

        pa.classList.add('hidden');

        pa.innerHTML='';

        UI.toast(
            'No se pudo preparar el PDF'
        );

        return;
    }


    /* =========================================================
       CONVERTIR CANVAS
    ========================================================= */

    let imgData;

    try{

        imgData=canvas.toDataURL(
            'image/png',
            1.0
        );

    }catch(error){

        console.error(
            'Error convirtiendo canvas:',
            error
        );

        pa.classList.add('hidden');

        pa.innerHTML='';

        UI.toast(
            'No se pudo convertir el documento a PDF'
        );

        return;
    }


    /* =========================================================
       CREAR PDF
    ========================================================= */

    try{

        const pdf=new jspdf.jsPDF(
            'p',
            'mm',
            'a4'
        );

        const pageWidth=
            pdf.internal.pageSize.getWidth();

        const pageHeight=
            pdf.internal.pageSize.getHeight();

        const imgWidth=
            pageWidth;

        const imgHeight=
            (
                canvas.height*
                imgWidth
            )/
            canvas.width;

        const finalHeight=
            Math.min(
                imgHeight,
                pageHeight
            );

        pdf.addImage(

            imgData,

            'PNG',

            0,

            0,

            imgWidth,

            finalHeight,

            undefined,

            'FAST'

        );


        /* =====================================================
           NOMBRE DEL ARCHIVO
        ===================================================== */

        const safeClientName=
            String(
                clientName||
                'Consumidor_Final'
            )
            .normalize('NFD')
            .replace(
                /[\u0300-\u036f]/g,
                ''
            )
            .replace(
                /[^a-zA-Z0-9\s_-]/g,
                ''
            )
            .trim()
            .replace(
                /\s+/g,
                '_'
            );

        const safeNumber=
            String(
                doc.number||
                id||
                'documento'
            )
            .replace(
                /[^a-zA-Z0-9_-]/g,
                '_'
            );

        const fileName=
            `${safeClientName}_${safeNumber}.pdf`;


        /* =====================================================
           GUARDAR
        ===================================================== */

        await DocumentCenter.savePdf(pdf,fileName,type);


        /* =====================================================
           LIMPIEZA
        ===================================================== */

        pa.classList.add('hidden');

        pa.innerHTML='';

        UI.toast('PDF descargado correctamente');

    }catch(error){

        console.error(
            'Error generando el PDF:',
            error
        );

        pa.classList.add('hidden');

        pa.innerHTML='';

        UI.toast(
            'Error al generar el PDF'
        );
    }
}
}

window.addEventListener('DOMContentLoaded',()=>{Auth.init()});

