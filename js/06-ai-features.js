
(function(){
'use strict';

const CLOUD_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/integra-api`;
const CLOUD_TOKEN_KEY = 'integra_cloud_session_v1';
const CLOUD_REVISION_KEY = 'integra_cloud_revision_v1';
const CLOUD_MODE_KEY = 'integra_cloud_mode_v1';

const CloudAPI = window.CloudAPI = {
    token: sessionStorage.getItem(CLOUD_TOKEN_KEY) || localStorage.getItem(CLOUD_TOKEN_KEY) || '',
    revision: Number(localStorage.getItem(CLOUD_REVISION_KEY)||0),
    online: false,
    saving: false,
    saveTimer: null,
    numberBlocks: {},

    setStatus(text, ok=false){
        let badge=document.getElementById('integra-cloud-status');
        if(!badge){
            badge=document.createElement('span');
            badge.id='integra-cloud-status';
            badge.className='badge';
            badge.style.cssText='margin-left:8px;white-space:nowrap;';
            const host=document.getElementById('current-company');
            if(host&&host.parentElement)host.parentElement.appendChild(badge);
        }
        if(badge){
            badge.textContent=text;
            badge.className=`badge ${ok?'badge-success':'badge-warning'}`;
        }
    },

    async request(action, payload={}, requireSession=true){
        const headers={
            'Content-Type':'application/json',
            'apikey':SUPABASE_PUBLISHABLE_KEY
        };
        if(requireSession&&this.token){
            headers['x-integra-session']=this.token;
        }
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),12000);
        try{
            const res=await fetch(CLOUD_FUNCTION_URL,{
                method:'POST',
                headers,
                body:JSON.stringify({action,...payload}),
                signal:controller.signal
            });
            const body=await res.json().catch(()=>({}));
            if(!res.ok){
                const err=new Error(body.error||body.message||`Cloud ${res.status}`);
                err.status=res.status;
                throw err;
            }
            return body;
        } finally {
            clearTimeout(timer);
        }
    },

    async bootstrap(){
        try{
            const r=await this.request('bootstrap',{},false);
            this.online=true;
            localStorage.setItem(CLOUD_MODE_KEY,'cloud');
            this.setStatus('☁️ Supabase conectado',true);
            return r;
        }catch(err){
            console.warn('Supabase bootstrap no disponible:',err);
            this.online=false;
            this.setStatus('💻 Modo local',false);
            return null;
        }
    },

    async login(username,password,company_id,branch_id){
        const r=await this.request('login',{username,password,company_id,branch_id},false);
        this.token=r.session_token||'';
        this.online=true;
        if(this.token){
            sessionStorage.setItem(CLOUD_TOKEN_KEY,this.token);
        }
        this.revision=Number(r.revision||0);
        localStorage.setItem(CLOUD_REVISION_KEY,String(this.revision));
        localStorage.setItem(CLOUD_MODE_KEY,'cloud');
        this.setStatus('☁️ Supabase conectado',true);
        return r;
    },

    async resume(){
        if(!this.token)return null;
        const r=await this.request('resume',{},true);
        this.online=true;
        this.revision=Number(r.revision||0);
        localStorage.setItem(CLOUD_REVISION_KEY,String(this.revision));
        this.setStatus('☁️ Sincronizado',true);
        return r;
    },

    async logout(){
        try{
            if(this.token)await this.request('logout',{},true);
        }catch(e){}
        this.token='';
        this.online=false;
        sessionStorage.removeItem(CLOUD_TOKEN_KEY);
        localStorage.removeItem(CLOUD_TOKEN_KEY);
        localStorage.removeItem(CLOUD_REVISION_KEY);
    },

    stateForCloud(){
        const clone=JSON.parse(JSON.stringify(DB.data||{}));
        // Los usuarios y sus contraseñas se administran en la tabla segura del backend.
        delete clone.users;
        // No mandar secretos que pertenecen al navegador/servidor.
        if(clone.settings){
            delete clone.settings.brevoKey;
            delete clone.settings.geminiKey;
            delete clone.settings.orvenKey;
            delete clone.settings.masterPass;
            delete clone.settings.pinDelete;
            delete clone.settings.pinFact;
            delete clone.settings.pinConfig;
        }
        clone._meta={
            ...(clone._meta||{}),
            initialized:true,
            saved_at:new Date().toISOString(),
            saved_by:UserIdentity.id(),
            saved_by_name:UserIdentity.name()
        };
        return clone;
    },

    applyBundle(bundle){
        if(!bundle)return;
        const state=bundle.state||bundle.payload||{};
        const currentSettings=DB.data.settings||{};
        const defaults={...DB.data};
        Object.keys(defaults).forEach(k=>{
            if(k==='users')return;
            if(k==='settings')return;
            if(Array.isArray(defaults[k])){
                DB.data[k]=Array.isArray(state[k])?state[k]:defaults[k];
            }else if(k!=='_meta'){
                DB.data[k]=(state[k]&&typeof state[k]==='object')?state[k]:defaults[k];
            }
        });
        DB.data.settings={...currentSettings,...(state.settings||{})};
        if(Array.isArray(bundle.users))DB.data.users=bundle.users;
        this.revision=Number(bundle.revision||this.revision||0);
        localStorage.setItem(CLOUD_REVISION_KEY,String(this.revision));
        try{
            localStorage.setItem('integra_suite_v76',JSON.stringify(DB.data));
        }catch(e){}
    },

    scheduleSave(){
        if(!this.online||!this.token)return;
        clearTimeout(this.saveTimer);
        this.saveTimer=setTimeout(()=>this.saveState(),700);
    },

    async saveState(){
        if(!this.online||!this.token||this.saving)return;
        this.saving=true;
        this.setStatus('☁️ Guardando…',false);
        try{
            const r=await this.request('save_state',{
                state:this.stateForCloud(),
                base_revision:this.revision
            },true);
            this.revision=Number(r.revision||this.revision);
            localStorage.setItem(CLOUD_REVISION_KEY,String(this.revision));
            this.setStatus('☁️ Sincronizado',true);
        }catch(err){
            console.error('Error sincronizando:',err);
            this.setStatus('⚠️ Sin sincronizar',false);
            if(err.status===409){
                UI.toast('Otro usuario actualizó los datos. Se recargarán los cambios compartidos.','error');
                try{
                    const latest=await this.resume();
                    this.applyBundle(latest);
                    if(window.App&&App.refreshAll)App.refreshAll();
                }catch(e){}
            }
        }finally{
            this.saving=false;
        }
    },

    async reserveNumberBlocks(){
        if(!this.online||!this.token)return;
        const types=['COT','PED','FAC','RES','NC','NV','COM'];
        for(const type of types){
            try{
                const r=await this.request('reserve_numbers',{type,count:50},true);
                this.numberBlocks[type]={next:Number(r.start),end:Number(r.end)};
            }catch(e){
                console.warn('No se pudo reservar numeración',type,e);
            }
        }
    },

    takeNumber(type){
        const b=this.numberBlocks[type];
        if(!b||b.next>b.end)return null;
        const v=b.next++;
        return `${type}-${String(v).padStart(6,'0')}`;
    },

    async upsertUser(user,password){
        const r=await this.request('upsert_user',{user,password:password||''},true);
        if(Array.isArray(r.users))DB.data.users=r.users;
        return r;
    },

    async deleteUser(id){
        const r=await this.request('delete_user',{id},true);
        if(Array.isArray(r.users))DB.data.users=r.users;
        return r;
    },

    startPolling(){
        if(this._poll)return;
        this._poll=setInterval(async()=>{
            if(!this.online||!this.token||this.saving)return;
            if(document.querySelector('.modal-overlay.open'))return;
            try{
                const r=await this.request('state_if_newer',{revision:this.revision},true);
                if(r&&r.changed){
                    this.applyBundle(r);
                    if(window.App&&App.refreshAll)App.refreshAll();
                    this.setStatus('☁️ Actualizado',true);
                }
            }catch(e){
                this.setStatus('⚠️ Sin conexión',false);
            }
        },30000);
    }
};

const UserIdentity = window.UserIdentity = {
    user(){ return Auth.currentUser||{}; },
    id(){
        const u=this.user();
        return u.id||u.user_id||u.uid||u.username||u.email||'';
    },
    name(){
        const u=this.user();
        const full=[u.name||u.nombre||'',u.lastname||u.apellidos||''].filter(Boolean).join(' ').trim();
        return full||u.full_name||u.fullName||u.display_name||u.username||u.email||'Usuario';
    },
    stampCreated(item){
        if(!item||typeof item!=='object')return item;
        const now=new Date().toISOString();
        if(!item.created_at)item.created_at=now;
        if(!item.created_by)item.created_by=this.id();
        if(!item.created_by_name)item.created_by_name=this.name();
        return item;
    },
    stampUpdated(item){
        if(!item||typeof item!=='object')return item;
        item.updated_at=new Date().toISOString();
        item.updated_by=this.id();
        item.updated_by_name=this.name();
        return item;
    }
};

// ---------- DB: nube + auditoría automática ----------
const _dbInitCloud=DB.init.bind(DB);
DB.init=async function(){
    const ok=await _dbInitCloud();
    const b=await CloudAPI.bootstrap();
    if(b){
        if(Array.isArray(b.companies)&&b.companies.length){
            DB.data.companies=b.companies.map(rc=>({
                ...(DB.data.companies.find(lc=>lc.id===rc.id)||{}),
                ...rc
            }));
        }
        if(Array.isArray(b.branches)&&b.branches.length){
            DB.data.branches=b.branches.map(rb=>({
                ...(DB.data.branches.find(lb=>lb.id===rb.id)||{}),
                ...rb
            }));
        }
    }
    return ok;
};

const _dbSaveCloud=DB.save.bind(DB);
DB.save=function(){
    _dbSaveCloud();
    CloudAPI.scheduleSave();
};

const _dbInsertCloud=DB.insert.bind(DB);
DB.insert=function(t,item){
    const tracked=['quotes','orders','invoices','reservations','sales_notes','credit_notes','logistics','purchases','clients','products','kardex','tracking','warehouses'];
    if(tracked.includes(t))UserIdentity.stampCreated(item);
    return _dbInsertCloud(t,item);
};

const _dbUpdateCloud=DB.update.bind(DB);
DB.update=function(t,id,item){
    const tracked=['quotes','orders','invoices','reservations','sales_notes','credit_notes','logistics','purchases','clients','products','kardex','tracking','warehouses'];
    if(tracked.includes(t))UserIdentity.stampUpdated(item);
    return _dbUpdateCloud(t,id,item);
};

const _dbDeleteCloud=DB.delete.bind(DB);
DB.delete=function(t,id){
    if(t==='users'&&CloudAPI.online&&CloudAPI.token){
        CloudAPI.deleteUser(id).then(()=>{
            if(Modules.Users&&Modules.Users.render)Modules.Users.render();
        }).catch(err=>UI.toast(err.message||'No se pudo eliminar el usuario en Supabase','error'));
    }
    return _dbDeleteCloud(t,id);
};

const _dbNextNumber=DB.getNextNumber.bind(DB);
DB.getNextNumber=function(type){
    const cloud=CloudAPI.takeNumber(type);
    if(cloud)return cloud;
    return _dbNextNumber(type);
};

// ---------- IVA dinámico ----------
function productVatForItem(item){
    if(Number.isFinite(Number(item?.iva)))return Number(item.iva);
    const p=item?.prodId?DB.getOne('products',item.prodId):null;
    return Number.isFinite(Number(p?.iva))?Number(p.iva):0;
}
if(Modules.Quotes){
    Modules.Quotes.getCurrentUser=function(){
        return {id:UserIdentity.id(),name:UserIdentity.name()};
    };

    Modules.Quotes.renderItems=function(){
        const tbody=document.getElementById('quote-items-tbody');

        if(tbody){
            tbody.innerHTML=(this.tempItems||[]).map((it,i)=>{
                const rate=productVatForItem(it);

                // Si el ítem no trae código, lo busca en el producto
                let code=it.prodCode||'';
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
                        <input type="number" class="input" style="width:60px" value="${it.qty}"
                            onchange="Modules.Quotes.updateQty(${i},this.value)">
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
    };

    const _quoteOpen=Modules.Quotes.openModal?.bind(Modules.Quotes);
    if(_quoteOpen){
        Modules.Quotes.openModal=function(id){
            const r=_quoteOpen(id);
            this.tempItems=(this.tempItems||[]).map(it=>({
                ...it,
                iva:productVatForItem(it)
            }));
            this.renderItems();
            return r;
        };
    }

    Modules.Quotes.calculateTotals=function(){
        const items=this.tempItems||[];
        const globalPct=Math.min(100,Math.max(0,parseFloat(document.getElementById('quote-disc-global')?.value)||0));
        let subtotal=0;
        let productDiscount=0;
        let ivaTotal=0;
        const breakdown={};

        items.forEach(item=>{
            const price=Math.max(0,parseFloat(item.price)||0);
            const qty=Math.max(0,parseFloat(item.qty)||0);
            const lineGross=price*qty;
            let itemDisc=0;
            const d=parseFloat(item.discount)||0;
            if(d>0){
                // Compatibilidad: si es <=100 se interpreta como porcentaje.
                itemDisc=d<=100?lineGross*(d/100):Math.min(lineGross,d);
            }
            const afterItem=Math.max(0,lineGross-itemDisc);
            const globalDisc=afterItem*(globalPct/100);
            const taxable=Math.max(0,afterItem-globalDisc);
            const rate=productVatForItem(item);
            const tax=taxable*(rate/100);

            item.iva=rate;
            item.discount_amount=itemDisc;
            item.subtotal=afterItem;
            item.taxable=taxable;
            item.iva_amount=tax;

            subtotal+=afterItem;
            productDiscount+=itemDisc;
            ivaTotal+=tax;
            const key=String(rate);
            breakdown[key]=breakdown[key]||{rate,base:0,tax:0};
            breakdown[key].base+=taxable;
            breakdown[key].tax+=tax;
        });

        const globalDiscount=subtotal*(globalPct/100);
        const discountTotal=productDiscount+globalDiscount;
        const taxableTotal=Object.values(breakdown).reduce((sum,entry)=>sum+entry.base,0);
        const total=Math.max(0,taxableTotal+ivaTotal);

        const sub=document.getElementById('quote-subtotal');
        const dis=document.getElementById('quote-discount');
        const iva=document.getElementById('quote-iva');
        const tot=document.getElementById('quote-total');
        if(sub)sub.textContent=Utils.formatMoney(subtotal);
        if(dis)dis.textContent='-'+Utils.formatMoney(discountTotal);
        if(iva)iva.textContent=Utils.formatMoney(ivaTotal);
        if(tot)tot.textContent=Utils.formatMoney(total);

        this.currentTotals={subtotal,productDiscount,globalDiscount,discountTotal,taxableTotal,totalIva:ivaTotal,total,breakdown};
        try{this.calcInstallments();}catch(e){}
    };
}
/* ============================================================
   ALERT CENTER
============================================================ */
const AlertCenter = window.AlertCenter = {
  list(){
    const cid=Auth.currentCompany?.id;
    return (DB.data.alerts||[]).filter(a=>!cid||!a.company_id||a.company_id===cid)
      .sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  },
  unread(){return this.list().filter(a=>!a.read).length;},
  exists(dedupe){return (DB.data.alerts||[]).some(a=>a.dedupe_key===dedupe);},
  add(alert){
    if(alert.dedupe_key&&this.exists(alert.dedupe_key))return null;
    const row={
      id:`ALT-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      company_id:Auth.currentCompany?.id||alert.company_id||'',
      created_at:new Date().toISOString(),read:false,
      severity:'info',...alert
    };
    DB.insert('alerts',row);
    this.updateBadges();
    this.render();
    UI.toast(row.title||row.message||'Nueva alerta',row.severity==='danger'?'error':row.severity==='warning'?'warning':'info');
    try{
      if('Notification' in window&&Notification.permission==='granted'){
        new Notification(row.title||'Integra Suite',{body:row.message||''});
      }
    }catch(e){}
    return row;
  },
  markRead(id){
    const a=DB.getOne('alerts',id);if(!a)return;
    DB.update('alerts',id,{...a,read:true,read_at:new Date().toISOString()});
    this.updateBadges();this.render();
  },
  markAll(){
    this.list().forEach(a=>{if(!a.read)DB.update('alerts',a.id,{...a,read:true,read_at:new Date().toISOString()});});
    this.updateBadges();this.render();
  },
  async enableBrowserNotifications(){
    if(!('Notification' in window))return UI.toast('Este navegador no admite notificaciones del sistema','warning');
    const p=await Notification.requestPermission();
    UI.toast(p==='granted'?'Notificaciones del navegador activadas':'Permiso de notificaciones no concedido',p==='granted'?'success':'warning');
  },
  open(){Pro.openView('alerts');this.render();},
  updateBadges(){
    const n=this.unread();
    const top=document.getElementById('top-alert-count');
    const dot=document.getElementById('sidebar-alert-dot');
    if(top){top.textContent=n>99?'99+':String(n);top.style.display=n?'inline-flex':'none';}
    if(dot){dot.style.display=n?'block':'none';}
  },
  action(id){
    const a=DB.getOne('alerts',id);if(!a)return;
    this.markRead(id);
    if(a.action==='whatsapp_birthday'){
      const c=DB.getOne('clients',a.client_id);if(!c)return UI.toast('Cliente no encontrado','error');
      const phone=Pro.phoneWhatsApp(c.phone);
      if(!phone)return UI.toast('El cliente no tiene un número válido','error');
      const name=`${c.name||''} ${c.lastname||''}`.trim()||'cliente';
      const msg=`Hola ${name}, queremos adelantarnos para desearte un feliz cumpleaños. 🎉 Gracias por confiar en ${Auth.currentCompany?.name||'nosotros'}.`;
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank','noopener');
    }else if(a.action==='tracking'){
      Pro.openView('crm-tracking');
      setTimeout(()=>{
        const f=document.getElementById('filter-track-search');if(f)f.value=a.tracking_code||'';
        Modules.Tracking?.render?.();
      },100);
    }else if(a.action==='inventory')Pro.openView('inventory');
  },
  render(){
    const box=document.getElementById('alerts-list');if(!box)return;
    const rows=this.list();
    const custom=rows.map(a=>{
      const btn=a.action==='whatsapp_birthday'?`<button class="btn btn-success btn-sm" onclick="AlertCenter.action('${a.id}')">💬 Enviar mensaje</button>`:
        a.action==='tracking'?`<button class="btn btn-primary btn-sm" onclick="AlertCenter.action('${a.id}')">Ver seguimiento</button>`:
        a.action?`<button class="btn btn-primary btn-sm" onclick="AlertCenter.action('${a.id}')">Ver</button>`:'';
      const bg=a.read?'var(--secondary)':a.severity==='danger'?'#fee2e2':a.severity==='warning'?'#fef9c3':'#e0f2fe';
      return `<div class="card p-4" style="margin-bottom:10px;background:${bg};${a.read?'opacity:.75;':''}">
        <div class="flex justify-between items-center gap-4">
          <div style="min-width:0">
            <div class="flex items-center gap-2"><strong>${Pro.esc(a.title||'Alerta')}</strong>${!a.read?'<span class="badge badge-danger">Nueva</span>':''}</div>
            <div class="text-sm" style="margin-top:5px">${Pro.esc(a.message||'')}</div>
            <div class="text-sm text-muted" style="margin-top:5px">${Pro.esc(Pro.formatDateTime(a.created_at))}</div>
          </div>
          <div class="flex gap-2">${btn}${!a.read?`<button class="btn btn-outline btn-sm" onclick="AlertCenter.markRead('${a.id}')">Marcar leída</button>`:''}</div>
        </div>
      </div>`;
    }).join('');
    const base=document.getElementById('alerts-system-base')?.innerHTML||'';
    box.innerHTML=`<div class="flex justify-between items-center mb-4"><div><h3>Centro de Alertas</h3><div class="text-sm text-muted">Cumpleaños, seguimientos, vencimientos y avisos internos.</div></div><button class="btn btn-outline btn-sm" onclick="AlertCenter.markAll()">Marcar todas como leídas</button></div>${custom||'<div class="p-4 text-center text-muted">No hay alertas nuevas.</div>'}<div id="alerts-system-base" style="margin-top:15px">${base}</div>`;
    this.updateBadges();
  }
};

/* Integra alertas automáticas originales con el centro profesional. */
if(App&&typeof App.renderAlerts==='function'){
  const _baseRenderAlerts=App.renderAlerts.bind(App);
  App.renderAlerts=function(){
    const f=document.getElementById('alerts-list');
    let systemHtml='';
    if(f){
      _baseRenderAlerts();
      systemHtml=f.innerHTML;
      f.innerHTML='<div id="alerts-system-base" class="hidden"></div>';
      const hidden=f.querySelector('#alerts-system-base');if(hidden)hidden.innerHTML=systemHtml;
    }else _baseRenderAlerts();
    AlertCenter.render();
  };
}

/* ============================================================
   CUMPLEAÑOS: 1 DÍA ANTES + WHATSAPP
============================================================ */
const BirthdayPro = window.BirthdayPro = {
  check(){
    const cid=Auth.currentCompany?.id;if(!cid)return;
    const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
    const mm=String(tomorrow.getMonth()+1).padStart(2,'0');
    const dd=String(tomorrow.getDate()).padStart(2,'0');
    const year=tomorrow.getFullYear();
    (DB.getAll('clients',cid)||[]).forEach(c=>{
      const dob=c.dob||c.birthdate||'';
      if(!dob||String(dob).slice(5,10)!==`${mm}-${dd}`)return;
      const name=`${c.name||''} ${c.lastname||''}`.trim()||c.company_name||'Cliente';
      AlertCenter.add({
        dedupe_key:`birthday:${c.id}:${year}`,
        type:'birthday',severity:'info',
        title:`🎂 Mañana cumple años ${name}`,
        message:c.phone?`Puede enviarle un mensaje directamente por WhatsApp al ${c.phone}.`:'El cliente no tiene teléfono registrado.',
        action:c.phone?'whatsapp_birthday':'',client_id:c.id
      });
    });
  }
};

/* ============================================================
   RECORDATORIOS DE SEGUIMIENTO
============================================================ */
const ReminderPro = window.ReminderPro = {
  check(){
    const cid=Auth.currentCompany?.id;if(!cid)return;
    const now=Date.now();
    (DB.getAll('tracking',cid)||[]).forEach(t=>{
      const due=t.next_contact||t.due_at||'';
      if(!due)return;
      const dueMs=new Date(due).getTime();if(Number.isNaN(dueMs))return;
      const minutes=Math.max(0,Number(t.reminder_minutes??15)||0);
      const notifyAt=dueMs-minutes*60000;
      if(now<notifyAt)return;
      const key=`tracking-reminder:${t.id}:${String(due)}`;
      if(AlertCenter.exists(key))return;
      const c=t.client_id?DB.getOne('clients',t.client_id):null;
      const clientName=c?`${c.name||''} ${c.lastname||''}`.trim():'';
      const relative=now<=dueMs?`en ${Math.max(0,Math.ceil((dueMs-now)/60000))} min`:'ya venció';
      AlertCenter.add({
        dedupe_key:key,type:'tracking',severity:now>dueMs?'danger':'warning',
        title:`⏰ Seguimiento ${relative}`,
        message:`${t.tracking_code||'Seguimiento'}${clientName?' · '+clientName:''}: ${t.description||t.type||''}`,
        action:'tracking',tracking_id:t.id,tracking_code:t.tracking_code||''
      });
    });
  }
};

/* ============================================================
   CENTRO DE DOCUMENTOS: SOLO DESCARGAR + SUBCARPETAS POR TIPO
============================================================ */
const DirectPDFDownload=App.downloadPDF.bind(App);

const DocumentCenter = window.DocumentCenter = {
  selected:null,
  dbPromise:null,
  folderNames:{
    quote:'Cotizaciones',
    order:'Pedidos',
    invoice:'Facturas',
    reservation:'Reservas',
    sales_note:'Notas de Venta',
    credit_note:'Notas de Crédito',
    logistics:'Logística'
  },
  async open(type,id){
    this.selected={type,id};
    return this.download();
  },
  label(type,id){
    const cfg={quote:['quotes','Cotización','number'],order:['orders','Pedido','number'],invoice:['invoices','Factura','number'],reservation:['reservations','Reserva','number'],sales_note:['sales_notes','Nota de venta','number'],credit_note:['credit_notes','Nota de crédito','number'],logistics:['logistics','Guía de despacho','guide']}[type];
    if(!cfg)return 'Documento';
    const d=DB.getOne(cfg[0],id);return `${cfg[1]} ${d?.[cfg[2]]||''}`.trim();
  },
  async fsdb(){
    if(this.dbPromise)return this.dbPromise;
    this.dbPromise=new Promise((resolve,reject)=>{
      const r=indexedDB.open('IntegraSuiteDocuments',1);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('settings'))r.result.createObjectStore('settings');};
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
    return this.dbPromise;
  },
  async storeHandle(handle){
    const db=await this.fsdb();
    await new Promise((resolve,reject)=>{const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(handle,'document-folder');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  },
  async getHandle(){
    try{
      const db=await this.fsdb();
      return await new Promise((resolve,reject)=>{const tx=db.transaction('settings','readonly');const r=tx.objectStore('settings').get('document-folder');r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});
    }catch(e){return null;}
  },
  async allowed(handle){
    try{
      if((await handle.queryPermission({mode:'readwrite'}))==='granted')return true;
      return (await handle.requestPermission({mode:'readwrite'}))==='granted';
    }catch(e){return false;}
  },
  async ensureDocumentFolders(handle){
    const result={};
    for(const [type,name] of Object.entries(this.folderNames)){
      result[type]=await handle.getDirectoryHandle(name,{create:true});
    }
    result.other=await handle.getDirectoryHandle('Otros Documentos',{create:true});
    return result;
  },
  async chooseFolder(){
    if(!window.showDirectoryPicker)return UI.toast('Para elegir una carpeta fija use Chrome o Edge actualizado. Si no, se usará Descargas.','warning');
    try{
      const handle=await showDirectoryPicker({mode:'readwrite'});
      if(!(await this.allowed(handle)))return UI.toast('Debe autorizar escritura en la carpeta seleccionada.','warning');
      await this.ensureDocumentFolders(handle);
      await this.storeHandle(handle);
      await this.updateFolderUI();
      UI.toast(`Carpeta principal configurada: ${handle.name}`,'success');
    }catch(e){if(e?.name!=='AbortError'){console.error(e);UI.toast('No se pudo configurar la carpeta','error');}}
  },
  async clearFolder(){
    try{
      const db=await this.fsdb();
      await new Promise((resolve,reject)=>{const tx=db.transaction('settings','readwrite');tx.objectStore('settings').delete('document-folder');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
      await this.updateFolderUI();UI.toast('Carpeta predeterminada eliminada','success');
    }catch(e){UI.toast('No se pudo quitar la carpeta','error');}
  },
  folderName(type){return this.folderNames[type]||'Otros Documentos';},
  async savePdf(pdf,fileName,type){
    const handle=await this.getHandle();
    if(handle&&await this.allowed(handle)){
      try{
        const folderName=this.folderName(type);
        const dir=await handle.getDirectoryHandle(folderName,{create:true});
        const fh=await dir.getFileHandle(fileName,{create:true});
        const wr=await fh.createWritable();
        await wr.write(pdf.output('blob'));
        await wr.close();
        UI.toast(`PDF guardado en ${handle.name}/${folderName}`,'success');
        return;
      }catch(e){
        console.warn(e);
        UI.toast('No se pudo escribir en la carpeta configurada. Se usará Descargas.','warning');
      }
    }
    pdf.save(fileName);
  },
  async updateFolderUI(){
    const el=document.getElementById('download-folder-status');if(!el)return;
    const h=await this.getHandle();
    if(h){
      const folders=Object.values(this.folderNames).concat(['Otros Documentos']);
      el.innerHTML=`<strong>${Pro.esc(h.name)}</strong><br><span class="text-muted">Cada documento se guarda automáticamente en su subcarpeta:</span><div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap">${folders.map(x=>`<span class="badge badge-info">📁 ${Pro.esc(x)}</span>`).join('')}</div>`;
    }else{
      el.innerHTML='<strong>Carpeta normal de Descargas</strong><br><span class="text-muted">Elija una carpeta principal para que el ERP cree y use subcarpetas por tipo de documento.</span>';
    }
  },
  async download(){
    if(!this.selected)return;
    const {type,id}=this.selected;
    try{
      await DirectPDFDownload(type,id,'download');
      this.after(type,id);
    }catch(e){console.error(e);UI.toast('No se pudo generar el PDF','error');}
    finally{this.selected=null;}
  },
  after(type,id){
    if(type!=='quote')return;
    const q=DB.getOne('quotes',id);if(!q)return;
    const actor=Pro.currentActor();const now=new Date().toISOString();
    DB.update('quotes',id,{...q,downloaded:true,downloaded_at:now,downloaded_by:actor.id,downloaded_by_name:actor.name,download_count:(parseInt(q.download_count)||0)+1,last_activity:'downloaded',last_activity_at:now});
    Modules.Quotes?.render?.();
  }
};

/* Todos los botones Descargar generan el PDF directamente. */
App.downloadPDF=function(type,id){return DocumentCenter.open(type,id);};
if(Modules.Quotes){Modules.Quotes.download=function(id){return DocumentCenter.open('quote',id);};}

/* ============================================================
   HISTORIAL 360 DEL CLIENTE
============================================================ */
const ClientHistory = window.ClientHistory = {
  events(client){
    const cid=client.company_id||Auth.currentCompany?.id;const id=client.id;const ev=[];
    (client.history||[]).forEach(h=>{
      const changes=(h.changes||[]).map(x=>`${x.label||x.field}: ${x.before??''} → ${x.after??''}`).join('\n');
      ev.push({date:h.date||h.created_at,type:'Datos del cliente',title:h.action==='create'?'Cliente creado':h.action==='delete'?'Cliente eliminado':'Cliente actualizado',detail:`Usuario: ${h.user_name||h.user||'Usuario'}${changes?'\n'+changes:''}`});
    });
    const addDocs=(table,label,number='number')=>{
      (DB.getAll(table,cid)||[]).filter(x=>x.client_id===id).forEach(x=>ev.push({date:x.date||x.created_at||x.updated_at,type:label,title:`${label} ${x[number]||''}`.trim(),detail:[x.status?`Estado: ${x.status}`:'',Number.isFinite(Number(x.total))?`Total: ${Utils.formatMoney(Number(x.total))}`:'',x.observations?`Observaciones: ${x.observations}`:x.notes?`Observaciones: ${x.notes}`:x.obs?`Observaciones: ${x.obs}`:''].filter(Boolean).join('\n')}));
    };
    addDocs('quotes','Cotización');addDocs('reservations','Reserva');addDocs('orders','Pedido');addDocs('invoices','Factura');addDocs('sales_notes','Nota de venta');
    (DB.getAll('tracking',cid)||[]).filter(t=>t.client_id===id).forEach(t=>ev.push({date:t.date||t.created_at,type:'Seguimiento',title:`${t.tracking_code||''} ${t.type||'Actividad'}`.trim(),detail:[t.area?`Sección: ${t.area}`:'',t.status?`Estado: ${t.status}`:'',t.description||'',t.user_name?`Responsable: ${t.user_name}`:''].filter(Boolean).join('\n')}));
    (DB.getAll('audit',cid)||[]).filter(a=>a.module==='clients'&&a.record_id===id).forEach(a=>ev.push({date:a.timestamp||a.date,type:'Auditoría',title:`${a.action||'Cambio'} del cliente`,detail:`Usuario: ${a.user_name||a.user||'Usuario'}${a.description?'\n'+a.description:''}`}));
    if(client.created_at&&!ev.some(e=>e.title==='Cliente creado'))ev.push({date:client.created_at,type:'Datos del cliente',title:'Cliente creado',detail:`Usuario: ${client.created_by_name||client.created_by||'Usuario'}`});
    return ev.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  },
  open(id){
    const c=DB.getOne('clients',id);if(!c)return UI.toast('Cliente no encontrado','error');
    const cid=c.company_id||Auth.currentCompany?.id;const name=`${c.name||''} ${c.lastname||''}`.trim()||c.company_name||'Cliente';
    document.getElementById('client-history-title-pro').textContent=name;
    document.getElementById('client-history-sub-pro').textContent=`${c.doc||'Sin identificación'} · ${c.phone||'Sin teléfono'} · ${c.email||'Sin correo'}`;
    const q=(DB.getAll('quotes',cid)||[]).filter(x=>x.client_id===id),o=(DB.getAll('orders',cid)||[]).filter(x=>x.client_id===id),i=(DB.getAll('invoices',cid)||[]).filter(x=>x.client_id===id),t=(DB.getAll('tracking',cid)||[]).filter(x=>x.client_id===id);
    const sales=i.filter(x=>x.status!=='Anulada').reduce((s,x)=>s+(Number(x.total)||0),0);
    document.getElementById('client-history-kpis-pro').innerHTML=`<div class="kpi-card"><div><div class="kpi-val">${q.length}</div><div class="kpi-label">Cotizaciones</div></div></div><div class="kpi-card"><div><div class="kpi-val">${o.length}</div><div class="kpi-label">Pedidos</div></div></div><div class="kpi-card sales"><div><div class="kpi-val">${i.length}</div><div class="kpi-label">Facturas</div></div></div><div class="kpi-card"><div><div class="kpi-val">${t.length}</div><div class="kpi-label">Seguimientos</div></div></div><div class="kpi-card sales"><div><div class="kpi-val">${Utils.formatMoney(sales)}</div><div class="kpi-label">Facturado</div></div></div>`;
    const events=this.events(c);document.getElementById('client-history-timeline-pro').innerHTML=events.length?events.map(e=>`<div class="pro-timeline-item"><div class="pro-timeline-date">${Pro.esc(Pro.formatDateTime(e.date))} · ${Pro.esc(e.type)}</div><div class="pro-timeline-title">${Pro.esc(e.title)}</div><div class="pro-timeline-detail">${Pro.esc(e.detail)}</div></div>`).join(''):'<div class="text-muted p-4">Sin movimientos registrados.</div>';
    UI.openModal('modal-client-history-pro');
  }
};
if(Modules.CRM)Modules.CRM.showHistory=function(id){ClientHistory.open(id);};

/* ============================================================
   TRACKING PROFESIONAL
============================================================ */
const TrackingPro = window.TrackingPro = {
  attachments:[],
  areas:['Procesos Operativos','Auditoría y Seguridad','Financiero y Comercial','Tareas y Workflow'],
  entityConfig:{
    'Cliente':{table:'clients',label:x=>`${x.name||''} ${x.lastname||''} · ${x.doc||''}`.trim(),code:x=>x.doc||x.id,client:x=>x.id},
    'Pedido':{table:'orders',label:x=>`${x.number||''} · ${x.client_name||''} · ${x.status||''}`,code:x=>x.number||x.id,client:x=>x.client_id},
    'Factura':{table:'invoices',label:x=>`${x.number||''} · ${x.client_name||''} · ${x.status||''}`,code:x=>x.number||x.id,client:x=>x.client_id},
    'Cotización':{table:'quotes',label:x=>`${x.number||''} · ${x.client_name||''} · ${x.status||''}`,code:x=>x.number||x.id,client:x=>x.client_id},
    'Orden de Compra':{table:'purchases',label:x=>`${x.number||''} · ${x.provider||''} · ${x.status||''}`,code:x=>x.number||x.id,client:x=>''},
    'Logística / Envío':{table:'logistics',label:x=>`${x.guide||''} · ${x.client_name||''} · ${x.status||''}`,code:x=>x.guide||x.id,client:x=>x.client_id}
  },
  code(){const d=new Date();return `SEG-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*10000)).padStart(4,'0')}`;},
  install(){
    const view=document.getElementById('view-crm-tracking');if(view)view.innerHTML=this.viewHTML();
    const modal=document.getElementById('modal-tracking');if(modal)modal.innerHTML=this.modalHTML();
    this.bindDropzone();
  },
  viewHTML(){return `<div class="flex justify-between items-center mb-4"><div><h2 class="font-bold">Seguimiento y Trazabilidad</h2><div class="text-sm text-muted">Control de procesos, auditoría, relación comercial y workflow.</div></div><button class="btn btn-primary btn-sm" onclick="Modules.Tracking.openModal()">+ Crear Seguimiento</button></div>
    <div class="pro-tracking-grid"><div class="pro-track-card" data-area="Procesos Operativos" onclick="TrackingPro.filterArea('Procesos Operativos')"><strong>1. Procesos Operativos</strong><span>Pedidos, producción, logística y entregas.</span><b id="cnt-op">0</b></div><div class="pro-track-card" data-area="Auditoría y Seguridad" onclick="TrackingPro.filterArea('Auditoría y Seguridad')"><strong>2. Auditoría y Seguridad</strong><span>Modificaciones, accesos y valores antes/después.</span><b id="cnt-au">0</b></div><div class="pro-track-card" data-area="Financiero y Comercial" onclick="TrackingPro.filterArea('Financiero y Comercial')"><strong>3. Financiero y Comercial</strong><span>Cotización → pedido → factura → cobro y CRM.</span><b id="cnt-fi">0</b></div><div class="pro-track-card" data-area="Tareas y Workflow" onclick="TrackingPro.filterArea('Tareas y Workflow')"><strong>4. Tareas y Workflow</strong><span>Responsables, alertas, aprobaciones y SLA.</span><b id="cnt-wf">0</b></div></div>
    <div class="filter-bar"><input class="filter-input" id="filter-track-search" placeholder="🔍 Cliente, código, cédula, celular..." onkeyup="Modules.Tracking.render()" style="min-width:260px"><select class="filter-input" id="filter-track-area" onchange="Modules.Tracking.render()"><option value="">Todas las secciones</option>${this.areas.map(a=>`<option>${a}</option>`).join('')}</select><select class="filter-input" id="filter-track-status" onchange="Modules.Tracking.render()"><option value="">Todos los estados</option><option>Pendiente</option><option>En Proceso</option><option>Pendiente de aprobación</option><option>Completado</option><option>Cancelado</option></select><select class="filter-input" id="filter-track-user" onchange="Modules.Tracking.render()"><option value="">Todos los responsables</option></select><button class="filter-btn" onclick="TrackingPro.clearFilters()">Limpiar</button></div>
    <div class="table-container"><table><thead><tr><th>ID</th><th>Fecha</th><th>Sección</th><th>Entidad</th><th>Cliente</th><th>Tipo</th><th>Descripción</th><th>Responsable</th><th>Próximo / Vence</th><th>Estado</th><th class="text-right">Acciones</th></tr></thead><tbody id="tracking-tbody"></tbody></table></div>
    <div id="tracking-audit-pro" class="card p-4" style="margin-top:16px;display:none"><div class="flex justify-between items-center mb-4"><div><h3>Audit Trail</h3><div class="text-sm text-muted">Quién creó, editó o eliminó datos, accesos y valores antes/después.</div></div></div><div class="table-container"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Registro</th><th>Detalle</th><th></th></tr></thead><tbody id="tracking-audit-tbody-pro"></tbody></table></div></div>`;},
  modalHTML(){return `<div class="modal" style="max-width:1050px"><div class="modal-header"><div><h3 id="track-modal-title">Crear Seguimiento</h3><div class="text-sm text-muted">Registro trazable de acciones y próximos pasos.</div></div><button class="btn btn-icon" onclick="UI.closeModal('modal-tracking')">✕</button></div><div class="modal-body"><form onsubmit="return false"><input type="hidden" id="track-parent-id"><input type="hidden" id="track-root-id"><input type="hidden" id="track-client-id">
    <div class="pro-track-section"><h4>1. Datos de Identificación · ¿A qué se le hace seguimiento?</h4><div class="grid-3"><div class="input-group"><label class="label">ID único</label><input class="input" id="track-code" readonly></div><div class="input-group"><label class="label">Sección *</label><select class="select" id="track-area">${this.areas.map(a=>`<option>${a}</option>`).join('')}</select></div><div class="input-group"><label class="label">Entidad vinculada *</label><select class="select" id="track-entity-type" onchange="TrackingPro.populateEntities()"><option>Cliente</option><option>Pedido</option><option>Factura</option><option>Cotización</option><option>Oportunidad de Venta</option><option>Orden de Compra</option><option>Producción</option><option>Logística / Envío</option></select></div></div><div class="grid-2"><div class="input-group"><label class="label">Elemento existente</label><select class="select" id="track-entity-id" onchange="TrackingPro.entitySelected()"></select></div><div class="input-group"><label class="label">ID / Código</label><input class="input" id="track-entity-code" placeholder="Código de referencia"></div></div><div class="grid-2"><div class="input-group"><label class="label">Buscar cliente por número de cédula</label><div class="flex gap-2"><input class="input" id="track-client-doc-search" inputmode="numeric" autocomplete="off" placeholder="Ej. 1101234567" onkeydown="if(event.key==='Enter'){event.preventDefault();TrackingPro.searchClientByDoc();}"><button type="button" class="btn btn-outline" onclick="TrackingPro.searchClientByDoc()">🔍 Buscar</button></div><small class="text-muted">Escriba manualmente la cédula completa del cliente.</small></div><div class="input-group"><label class="label">Cliente relacionado</label><div id="track-selected-client" class="pro-client-chip">Sin cliente relacionado</div></div></div></div>
    <div class="pro-track-section"><h4>2. Detalles del Evento o Acción · ¿Qué pasó o qué va a pasar?</h4><div class="grid-2"><div class="input-group"><label class="label">Tipo de seguimiento *</label><select class="select" id="track-type"><optgroup label="CRM"><option>Llamada</option><option>Correo enviado</option><option>WhatsApp</option><option>Reunión</option><option>Visita</option><option>Oportunidad de venta</option></optgroup><optgroup label="Operaciones"><option>Seguimiento de pedido</option><option>Control de producción</option><option>Retraso en producción</option><option>Envío despachado</option><option>Entrega confirmada</option><option>Incidencia logística</option></optgroup><optgroup label="Finanzas"><option>Seguimiento de facturación</option><option>Cobro pendiente</option><option>Pago recibido</option><option>Control de costes</option></optgroup><optgroup label="Workflow"><option>Tarea asignada</option><option>Aprobación requerida</option><option>Incidencia</option><option>Alerta interna</option></optgroup></select></div><div class="input-group"><label class="label">Estado actual *</label><select class="select" id="track-status"><option>Pendiente</option><option>En Proceso</option><option>Pendiente de aprobación</option><option>Completado</option><option>Cancelado</option></select></div></div><div class="input-group"><label class="label">Descripción / Notas *</label><textarea class="textarea" id="track-desc" rows="4" placeholder="Detalle lo ocurrido, acuerdos, novedad o siguiente paso..."></textarea></div></div>
    <div class="pro-track-section"><h4>3. Responsables y Fechas · ¿Quién y cuándo?</h4><div class="grid-3"><div class="input-group"><label class="label">Fecha y hora *</label><input type="datetime-local" class="input" id="track-date"></div><div class="input-group"><label class="label">Asignado a *</label><select class="select" id="track-user"></select></div><div class="input-group"><label class="label">Departamento</label><input class="input" id="track-department" placeholder="Ventas, Bodega, Logística..."></div></div><div class="grid-3"><div class="input-group"><label class="label">Próximo contacto / Vencimiento</label><input type="datetime-local" class="input" id="track-next-contact"></div><div class="input-group"><label class="label">Avisar cuántos minutos antes</label><input type="number" min="0" class="input" id="track-reminder-minutes" list="tracking-reminder-options" value="15"><datalist id="tracking-reminder-options"><option value="5"><option value="10"><option value="15"><option value="30"><option value="60"><option value="120"><option value="1440"></datalist></div><div class="input-group"><label class="label">SLA objetivo (horas)</label><input type="number" min="0" step="0.5" class="input" id="track-sla-hours"></div></div></div>
    <div class="pro-track-section"><h4>4. Automatizaciones y Adjuntos</h4><div class="pro-dropzone" id="track-dropzone-pro" onclick="document.getElementById('track-files-pro').click()"><strong>📎 Arrastre archivos aquí o haga clic</strong><div class="text-sm text-muted">Comprobantes, albaranes, capturas o documentos de respaldo.</div><input type="file" id="track-files-pro" multiple class="hidden" onchange="TrackingPro.addFiles(this.files)"></div><div id="track-files-list-pro" style="margin:8px 0"></div><div class="grid-2"><label class="flex items-center gap-2"><input type="checkbox" id="track-notify-client"> Enviar correo automático al cliente</label><label class="flex items-center gap-2"><input type="checkbox" id="track-internal-alert"> Crear alerta interna</label></div></div>
    </form></div><div class="modal-footer"><button class="btn btn-outline" onclick="UI.closeModal('modal-tracking')">Cancelar</button><button class="btn btn-primary" id="track-save-pro" onclick="Modules.Tracking.save()">Guardar Seguimiento</button></div></div>`;},
  bindDropzone(){const dz=document.getElementById('track-dropzone-pro');if(!dz)return;['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('dragover');}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('dragover');}));dz.addEventListener('drop',e=>this.addFiles(e.dataTransfer.files));},
  filterArea(area){const el=document.getElementById('filter-track-area');if(el)el.value=area;Modules.Tracking.render();},
  clearFilters(){['filter-track-search','filter-track-area','filter-track-status','filter-track-user'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});Modules.Tracking.render();},
  populateEntities(selectedId=''){
    const type=document.getElementById('track-entity-type')?.value||'Cliente';const sel=document.getElementById('track-entity-id');if(!sel)return;
    const cfg=this.entityConfig[type];sel.innerHTML='<option value="">-- Seleccione --</option>';
    if(!cfg){sel.disabled=true;document.getElementById('track-entity-code').readOnly=false;return;}
    sel.disabled=false;document.getElementById('track-entity-code').readOnly=true;
    (DB.getAll(cfg.table,Auth.currentCompany?.id)||[]).forEach(x=>{const o=document.createElement('option');o.value=x.id;o.textContent=cfg.label(x);sel.appendChild(o);});
    if(selectedId)sel.value=selectedId;this.entitySelected();
  },
  normalizeClientDoc(value){return String(value??'').replace(/[^0-9A-Za-z]/g,'').toUpperCase();},
  clientDocValue(c){return c?.doc||c?.document||c?.document_number||c?.identification||c?.identification_number||c?.cedula||c?.cedula_ruc||c?.ruc||c?.tax_id||c?.id_number||c?.dni||'';},
  searchClientByDoc(){
    const input=document.getElementById('track-client-doc-search');const raw=input?.value||'';const needle=this.normalizeClientDoc(raw);
    if(!needle)return UI.toast('Escriba el número de cédula del cliente','warning');
    const cid=Auth.currentCompany?.id;const clients=DB.getAll('clients',cid)||[];
    const found=clients.find(c=>this.normalizeClientDoc(this.clientDocValue(c))===needle);
    if(!found){document.getElementById('track-client-id').value='';document.getElementById('track-selected-client').textContent='Cliente no encontrado';return UI.toast('No existe un cliente con esa cédula','error');}
    document.getElementById('track-client-id').value=found.id;
    const displayDoc=this.clientDocValue(found);document.getElementById('track-selected-client').textContent=`${found.name||''} ${found.lastname||''} · ${displayDoc||''} · ${found.phone||''}`.trim();
    const type=document.getElementById('track-entity-type');
    if(type?.value==='Cliente'){
      const entity=document.getElementById('track-entity-id');if(entity){entity.value=found.id;}
      const code=document.getElementById('track-entity-code');if(code)code.value=displayDoc||found.id;
    }
    UI.toast('Cliente encontrado y vinculado al seguimiento','success');
  },
  entitySelected(){
    const type=document.getElementById('track-entity-type')?.value||'';const id=document.getElementById('track-entity-id')?.value||'';const cfg=this.entityConfig[type];
    if(!cfg||!id){if(!cfg){document.getElementById('track-client-id').value='';document.getElementById('track-selected-client').textContent='Sin cliente relacionado';}return;}
    const obj=DB.getOne(cfg.table,id);if(!obj)return;document.getElementById('track-entity-code').value=cfg.code(obj)||'';
    const clientId=cfg.client(obj)||'';document.getElementById('track-client-id').value=clientId;
    const c=clientId?DB.getOne('clients',clientId):null;document.getElementById('track-selected-client').textContent=c?`${c.name||''} ${c.lastname||''} · ${this.clientDocValue(c)||''} · ${c.phone||''}`:'Sin cliente relacionado';
    const docSearch=document.getElementById('track-client-doc-search');if(docSearch)docSearch.value=c?this.clientDocValue(c):'';
  },
  async addFiles(files){
    const arr=[...files||[]];if(!arr.length)return;const current=this.attachments.reduce((s,a)=>s+(a.size||0),0);const incoming=arr.reduce((s,f)=>s+f.size,0);
    if(current+incoming>4*1024*1024)return UI.toast('Los adjuntos del seguimiento no pueden superar 4 MB en total','warning');
    for(const f of arr.slice(0,8)){const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(f);});this.attachments.push({name:f.name,type:f.type,size:f.size,data});}
    this.renderFiles();
  },
  renderFiles(){const box=document.getElementById('track-files-list-pro');if(box)box.innerHTML=this.attachments.map((a,i)=>`<span class="pro-file-pill">📎 ${Pro.esc(a.name)} <button type="button" onclick="TrackingPro.removeFile(${i})">✕</button></span>`).join('');},
  removeFile(i){this.attachments.splice(i,1);this.renderFiles();},
  openNew(){
    this.attachments=[];document.querySelector('#modal-tracking form')?.reset();
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v??'';};set('track-parent-id','');set('track-root-id','');set('track-code',this.code());set('track-date',Pro.dateTimeInput());set('track-reminder-minutes','15');set('track-client-id','');set('track-client-doc-search','');
    document.getElementById('track-selected-client').textContent='Sin cliente relacionado';document.getElementById('track-modal-title').textContent='Crear Seguimiento';document.getElementById('track-save-pro').textContent='Guardar Seguimiento';
    Auth.loadVendors('track-user');const usr=document.getElementById('track-user');if(usr&&Auth.currentUser?.id)usr.value=Auth.currentUser.id;this.populateEntities();this.renderFiles();UI.openModal('modal-tracking');
  },
  openUpdate(id){
    const t=DB.getOne('tracking',id);if(!t)return UI.toast('Seguimiento no encontrado','error');this.attachments=[];document.querySelector('#modal-tracking form')?.reset();
    const set=(iid,v)=>{const el=document.getElementById(iid);if(el)el.value=v??'';};set('track-parent-id',t.id);set('track-root-id',t.history_root_id||t.parent_tracking_id||t.id);set('track-code',this.code());set('track-area',t.area||'Financiero y Comercial');set('track-entity-type',t.entity_type||'Cliente');set('track-entity-code',t.entity_code||'');set('track-client-id',t.client_id||'');set('track-type',t.type||'Llamada');set('track-status',t.status||'En Proceso');set('track-desc','');set('track-date',Pro.dateTimeInput());set('track-next-contact','');set('track-reminder-minutes',t.reminder_minutes??15);set('track-department',t.department||'');set('track-sla-hours',t.sla_hours||'');
    Auth.loadVendors('track-user');const usr=document.getElementById('track-user');if(usr)usr.value=t.user_id||Auth.currentUser?.id||'';this.populateEntities(t.entity_id||'');
    const c=t.client_id?DB.getOne('clients',t.client_id):null;document.getElementById('track-selected-client').textContent=c?`${c.name||''} ${c.lastname||''} · ${this.clientDocValue(c)||''} · ${c.phone||''}`:'Sin cliente relacionado';const docSearch=document.getElementById('track-client-doc-search');if(docSearch)docSearch.value=c?this.clientDocValue(c):'';
    document.getElementById('track-modal-title').textContent='Actualizar Seguimiento';document.getElementById('track-save-pro').textContent='Guardar Actualización';this.renderFiles();UI.openModal('modal-tracking');setTimeout(()=>document.getElementById('track-desc')?.focus(),100);
  },
  history(id){
    const t=DB.getOne('tracking',id);if(!t)return;const root=t.history_root_id||t.parent_tracking_id||t.id;const rows=(DB.getAll('tracking',Auth.currentCompany?.id)||[]).filter(x=>x.id===root||x.id===t.id||x.history_root_id===root||x.parent_tracking_id===root||x.parent_tracking_id===t.id).sort((a,b)=>new Date(a.date||0)-new Date(b.date||0));
    document.getElementById('tracking-history-pro').innerHTML=rows.map(x=>`<div class="pro-timeline-item"><div class="pro-timeline-date">${Pro.esc(Pro.formatDateTime(x.date))} · ${Pro.esc(x.tracking_code||'')}</div><div class="pro-timeline-title">${Pro.esc(x.type||'Seguimiento')} · ${Pro.esc(x.status||'')}</div><div class="pro-timeline-detail">${Pro.esc(x.description||'')}</div><div class="text-sm text-muted" style="margin-top:5px">Responsable: ${Pro.esc(x.user_name||'Usuario')}${x.next_contact?` · Próximo: ${Pro.esc(Pro.formatDateTime(x.next_contact))}`:''}</div>${(x.attachments||[]).map((a,i)=>`<button class="btn btn-outline btn-sm" style="margin-top:6px" onclick="TrackingPro.downloadFile('${x.id}',${i})">📎 ${Pro.esc(a.name)}</button>`).join(' ')}</div>`).join('')||'<div class="text-muted">Sin historial.</div>';UI.openModal('modal-tracking-history-pro');
  },
  downloadFile(id,i){const t=DB.getOne('tracking',id),a=t?.attachments?.[i];if(!a?.data)return;const l=document.createElement('a');l.href=a.data;l.download=a.name||'adjunto';l.click();},
  updateCounts(all){const map=[['Procesos Operativos','cnt-op'],['Auditoría y Seguridad','cnt-au'],['Financiero y Comercial','cnt-fi'],['Tareas y Workflow','cnt-wf']];map.forEach(([a,id])=>{const el=document.getElementById(id);if(el)el.textContent=all.filter(t=>(t.area||'Financiero y Comercial')===a).length;});const active=document.getElementById('filter-track-area')?.value||'';document.querySelectorAll('.pro-track-card').forEach(c=>c.classList.toggle('active',c.dataset.area===active));},
  renderAudit(){const panel=document.getElementById('tracking-audit-pro'),body=document.getElementById('tracking-audit-tbody-pro');if(!panel||!body)return;const visible=(document.getElementById('filter-track-area')?.value||'')==='Auditoría y Seguridad';panel.style.display=visible?'block':'none';if(!visible)return;const rows=(DB.getAll('audit',Auth.currentCompany?.id)||[]).sort((a,b)=>new Date(b.timestamp||b.date||0)-new Date(a.timestamp||a.date||0)).slice(0,250);body.innerHTML=rows.map(a=>`<tr><td>${Pro.esc(Pro.formatDateTime(a.timestamp||a.date))}</td><td>${Pro.esc(a.user_name||a.user||'Usuario')}</td><td><span class="badge badge-info">${Pro.esc(a.action||'EVENTO')}</span></td><td>${Pro.esc(a.module||'')}</td><td>${Pro.esc(a.record_id||'')}</td><td>${Pro.esc(a.description||'')}</td><td>${(a.before!==undefined&&a.before!==null)||(a.after!==undefined&&a.after!==null)?`<button class="btn btn-outline btn-sm" onclick="TrackingPro.showAudit('${a.id}')">Antes / Después</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7" class="p-4 text-muted">Sin eventos de auditoría.</td></tr>';},
  showAudit(id){const a=DB.getOne('audit',id);if(!a)return;document.getElementById('audit-before-pro').textContent=JSON.stringify(a.before??null,null,2);document.getElementById('audit-after-pro').textContent=JSON.stringify(a.after??null,null,2);document.getElementById('audit-title-pro').textContent=`${a.action||'Cambio'} · ${a.module||''} · ${a.user_name||a.user||'Usuario'} · ${Pro.formatDateTime(a.timestamp||a.date)}`;UI.openModal('modal-audit-pro');}
};

Modules.Tracking={
  render(){
    const cid=Auth.currentCompany?.id;if(!cid)return;let all=(DB.getAll('tracking',cid)||[]).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));TrackingPro.updateCounts(all);
    const s=(document.getElementById('filter-track-search')?.value||'').toLowerCase().trim(),area=document.getElementById('filter-track-area')?.value||'',status=document.getElementById('filter-track-status')?.value||'',user=document.getElementById('filter-track-user')?.value||'';
    const data=all.filter(t=>{const c=t.client_id?DB.getOne('clients',t.client_id):null;const txt=[t.tracking_code,t.entity_code,t.entity_type,t.type,t.description,c?.name,c?.lastname,c?.doc,c?.phone].join(' ').toLowerCase();return(!s||txt.includes(s))&&(!area||(t.area||'Financiero y Comercial')===area)&&(!status||t.status===status)&&(!user||t.user_id===user);});
    const tbody=document.getElementById('tracking-tbody');if(tbody)tbody.innerHTML=data.map(t=>{const c=t.client_id?DB.getOne('clients',t.client_id):null;const bc=t.status==='Completado'?'badge-success':t.status==='Cancelado'?'badge-danger':t.status==='Pendiente'?'badge-warning':'badge-info';return `<tr><td><strong>${Pro.esc(t.tracking_code||t.id)}</strong></td><td>${Pro.esc(Pro.formatDateTime(t.date))}</td><td>${Pro.esc(t.area||'Financiero y Comercial')}</td><td><strong>${Pro.esc(t.entity_type||'Cliente')}</strong><br><span class="text-muted">${Pro.esc(t.entity_code||'')}</span></td><td>${c?`<strong>${Pro.esc((c.name||'')+' '+(c.lastname||''))}</strong><br><span class="text-muted">${Pro.esc(c.phone||'')}</span>`:'—'}</td><td><span class="badge badge-bp">${Pro.esc(t.type||'')}</span></td><td>${t.parent_tracking_id?'<span class="badge badge-info">Actualización</span> ':''}${Pro.esc(t.description||'')}</td><td>${Pro.esc(t.user_name||'Usuario')}<br><span class="text-muted">${Pro.esc(t.department||'')}</span></td><td>${Pro.esc(Pro.formatDateTime(t.next_contact||''))}${t.reminder_minutes!==undefined&&t.next_contact?`<br><span class="text-muted">Aviso ${Pro.esc(t.reminder_minutes)} min antes</span>`:''}${t.sla_hours?`<br><span class="text-muted">SLA ${Pro.esc(t.sla_hours)} h</span>`:''}</td><td><span class="badge ${bc}">${Pro.esc(t.status||'')}</span></td><td class="text-right"><button class="btn btn-primary btn-sm" onclick="Modules.Tracking.updateActivity('${t.id}')">Actualizar</button> <button class="btn btn-outline btn-sm" onclick="Modules.Tracking.history('${t.id}')">Historial</button> <button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="Auth.requestPin('delete','tracking','${t.id}')">🗑️</button></td></tr>`;}).join('')||'<tr><td colspan="11" class="text-center p-4">Sin seguimientos</td></tr>';
    const sel=document.getElementById('filter-track-user');if(sel){const old=sel.value;sel.innerHTML='<option value="">Todos los responsables</option>';(DB.getAll('users',cid)||[]).filter(u=>u.status!=='Inactivo').forEach(u=>{const o=document.createElement('option');o.value=u.id;o.textContent=u.name||u.username;sel.appendChild(o);});sel.value=old;}
    TrackingPro.renderAudit();
  },
  openModal(id){id?TrackingPro.openUpdate(id):TrackingPro.openNew();},edit(id){TrackingPro.openUpdate(id);},updateActivity(id){TrackingPro.openUpdate(id);},history(id){TrackingPro.history(id);},
  save(){
    const val=id=>document.getElementById(id)?.value||'';const desc=val('track-desc').trim(),entityType=val('track-entity-type'),entityId=val('track-entity-id'),clientId=val('track-client-id'),userId=val('track-user');
    if(!desc)return UI.toast('La descripción es obligatoria','error');if(!userId)return UI.toast('Seleccione un responsable','error');if(entityType==='Cliente'&&!clientId)return UI.toast('Seleccione un cliente','error');
    const user=DB.getOne('users',userId);const d={company_id:Auth.currentCompany.id,tracking_code:val('track-code')||TrackingPro.code(),area:val('track-area')||'Financiero y Comercial',entity_type:entityType,entity_id:entityId,entity_code:val('track-entity-code'),client_id:clientId,type:val('track-type'),status:val('track-status'),description:desc,date:val('track-date')||Pro.dateTimeInput(),user_id:userId,user_name:user?(user.name||user.username):Pro.currentActor().name,department:val('track-department'),next_contact:val('track-next-contact'),reminder_minutes:Math.max(0,Number(val('track-reminder-minutes')||15)),sla_hours:val('track-sla-hours')?Number(val('track-sla-hours')):null,attachments:TrackingPro.attachments.map(a=>({...a})),notify_client:document.getElementById('track-notify-client')?.checked||false,internal_alert:document.getElementById('track-internal-alert')?.checked||false,parent_tracking_id:val('track-parent-id'),history_root_id:val('track-root-id')};
    const saved=DB.insert('tracking',d);const client=clientId?DB.getOne('clients',clientId):null;
    if(d.notify_client){if(client?.email&&window.EmailService?.send){EmailService.send(client.email,`Actualización ${d.tracking_code} - ${Auth.currentCompany?.name||'Integra Suite'}`,`<p>Hola ${Pro.esc(client.name||'cliente')},</p><p>Le informamos una actualización:</p><p><strong>${Pro.esc(d.status)}</strong></p><p>${Pro.esc(d.description)}</p>`);}else UI.toast('No se pudo enviar correo: el cliente no tiene correo o el servicio no está configurado.','warning');}
    if(d.internal_alert)AlertCenter.add({dedupe_key:`internal:${saved.id}`,type:'internal',severity:'warning',title:`Seguimiento ${d.tracking_code}`,message:`${d.status}: ${d.description}`,action:'tracking',tracking_id:saved.id,tracking_code:d.tracking_code});
    UI.closeModal('modal-tracking');UI.toast(d.parent_tracking_id?'Actualización registrada; el historial anterior se conserva.':'Seguimiento creado correctamente','success');this.render();ReminderPro.check();
  }
};

/* ============================================================
   UI INYECTADA
============================================================ */
function injectUI(){
  if(document.getElementById('integra-pro-ui'))return;
  const wrap=document.createElement('div');wrap.id='integra-pro-ui';wrap.innerHTML=`
  <div class="modal-overlay" id="modal-client-history-pro"><div class="modal" style="max-width:1000px"><div class="modal-header"><div><h3>Historial 360° del Cliente</h3><div class="font-bold" id="client-history-title-pro"></div><div class="text-sm text-muted" id="client-history-sub-pro"></div></div><button class="btn btn-icon" onclick="UI.closeModal('modal-client-history-pro')">✕</button></div><div class="modal-body"><div id="client-history-kpis-pro" class="kpi-grid"></div><div id="client-history-timeline-pro" class="pro-timeline"></div></div></div></div>
  <div class="modal-overlay" id="modal-tracking-history-pro"><div class="modal" style="max-width:900px"><div class="modal-header"><h3>Historial del Seguimiento</h3><button class="btn btn-icon" onclick="UI.closeModal('modal-tracking-history-pro')">✕</button></div><div class="modal-body"><div id="tracking-history-pro" class="pro-timeline"></div></div></div></div>
  <div class="modal-overlay" id="modal-audit-pro"><div class="modal" style="max-width:1000px"><div class="modal-header"><div><h3>Valores antes y después</h3><div class="text-sm text-muted" id="audit-title-pro"></div></div><button class="btn btn-icon" onclick="UI.closeModal('modal-audit-pro')">✕</button></div><div class="modal-body"><div class="grid-2"><div><h4 class="section-title">ANTES</h4><pre class="pro-audit-json" id="audit-before-pro"></pre></div><div><h4 class="section-title">DESPUÉS</h4><pre class="pro-audit-json" id="audit-after-pro"></pre></div></div></div></div></div>`;
  document.body.appendChild(wrap);

  /* Botón superior de alertas */
  const headerRight=document.querySelector('.header > .flex.items-center.gap-4:last-child');
  if(headerRight&&!document.getElementById('top-alert-button')){
    const btn=document.createElement('button');btn.id='top-alert-button';btn.className='btn btn-outline btn-sm pro-alert-top';btn.onclick=()=>AlertCenter.open();btn.innerHTML='🔔 Alertas <span id="top-alert-count" class="pro-alert-count" style="display:none">0</span>';headerRight.insertBefore(btn,headerRight.firstChild);
  }
  const alertsNav=document.querySelector('.nav-item[data-view="alerts"]');if(alertsNav&&!document.getElementById('sidebar-alert-dot')){alertsNav.style.position='relative';const dot=document.createElement('span');dot.id='sidebar-alert-dot';dot.className='pro-alert-dot';dot.style.display='none';alertsNav.appendChild(dot);}

  /* Configuración de documentos */
  const grid=document.querySelector('#view-settings > .grid-2');if(grid&&!document.getElementById('document-folder-settings-pro')){
    const card=document.createElement('div');card.className='card p-4';card.id='document-folder-settings-pro';card.innerHTML=`<h3 class="mb-4">Documentos y Descargas</h3><div class="input-group"><label class="label">Carpeta principal de documentos</label><div id="download-folder-status" class="pro-folder-status"></div></div><div class="flex gap-2" style="flex-wrap:wrap"><button class="btn btn-primary" onclick="DocumentCenter.chooseFolder()">📁 Elegir carpeta principal</button><button class="btn btn-outline" onclick="DocumentCenter.clearFolder()">Quitar carpeta</button><button class="btn btn-outline" onclick="AlertCenter.enableBrowserNotifications()">🔔 Activar notificaciones</button></div><p class="text-sm text-muted" style="margin-top:10px">El ERP crea automáticamente subcarpetas separadas para Cotizaciones, Pedidos, Facturas, Reservas, Notas de Venta, Notas de Crédito, Logística y Otros Documentos. Chrome/Edge solicitará autorización para escribir en la carpeta elegida.</p>`;grid.appendChild(card);DocumentCenter.updateFolderUI();
  }
  TrackingPro.install();AlertCenter.updateBadges();
}

/* ============================================================
   ESTILOS
============================================================ */
const style=document.createElement('style');style.id='integra-pro-styles';style.textContent=`
button[onclick*="App.printDocument"],button[onclick*="Modules.Quotes.print"]{display:none!important}
.pro-tracking-grid{display:grid;grid-template-columns:repeat(4,minmax(180px,1fr));gap:12px;margin-bottom:16px}.pro-track-card{background:var(--secondary);border:1px solid var(--border);border-left:4px solid var(--primary);border-radius:var(--radius);padding:14px;cursor:pointer;box-shadow:var(--shadow);transition:.2s}.pro-track-card:hover,.pro-track-card.active{transform:translateY(-1px);border-color:var(--primary)}.pro-track-card strong{display:block;font-size:13px;margin-bottom:4px}.pro-track-card span{font-size:11px;color:var(--text-muted);display:block;min-height:31px}.pro-track-card b{display:block;font-size:22px;margin-top:8px;color:var(--primary-dark)}
.pro-track-section{border:1px solid var(--border);border-radius:var(--radius);padding:15px;margin-bottom:15px;background:var(--bg-body)}.pro-track-section h4{font-size:13px;color:var(--primary-dark);margin-bottom:12px}.pro-client-chip{padding:10px;border:1px solid var(--border);border-radius:7px;background:var(--secondary);font-size:12px}.pro-dropzone{border:2px dashed var(--border);border-radius:8px;padding:20px;text-align:center;background:var(--secondary);cursor:pointer}.pro-dropzone.dragover{border-color:var(--primary);background:rgba(212,163,115,.1)}.pro-file-pill{display:inline-flex;gap:5px;align-items:center;border:1px solid var(--border);border-radius:16px;padding:4px 8px;margin:3px;background:var(--secondary);font-size:11px}.pro-file-pill button{border:0;background:none;cursor:pointer}
.pro-timeline{display:flex;flex-direction:column;gap:10px}.pro-timeline-item{border-left:3px solid var(--primary);background:var(--bg-body);border-radius:0 8px 8px 0;padding:11px 13px}.pro-timeline-date{font-size:11px;color:var(--text-muted);margin-bottom:3px}.pro-timeline-title{font-weight:700;margin-bottom:4px}.pro-timeline-detail{font-size:12px;white-space:pre-wrap}.pro-audit-json{max-height:340px;overflow:auto;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;font:11px/1.45 Consolas,monospace;white-space:pre-wrap;word-break:break-word}
.pro-folder-status{padding:11px;border:1px solid var(--border);border-radius:7px;background:var(--bg-body);font-size:12px;margin-bottom:10px}.pro-alert-top{position:relative}.pro-alert-count{position:absolute;top:-8px;right:-8px;min-width:19px;height:19px;padding:0 5px;border-radius:10px;background:var(--danger);color:#fff;font-size:10px;font-weight:800;align-items:center;justify-content:center}.pro-alert-dot{position:absolute;top:7px;right:12px;width:9px;height:9px;border-radius:50%;background:var(--danger);box-shadow:0 0 0 2px var(--primary-dark)}
@media(max-width:1050px){.pro-tracking-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:650px){.pro-tracking-grid{grid-template-columns:1fr}}
`;
document.head.appendChild(style);

/* ============================================================
   INICIO
============================================================ */
injectUI();

/* Tras renderizados dinámicos, eliminar Imprimir y mantener solo Descargar. */
function cleanDocumentButtons(){
  document.querySelectorAll('button[onclick*="printDocument"],button[onclick*=".print("],button[onclick*="printPDF"],button[title*="Imprimir" i]').forEach(b=>b.remove());
  document.querySelectorAll('button[onclick*="App.downloadPDF"],button[onclick*="Modules.Quotes.download"]').forEach(b=>{
    const txt=(b.textContent||'').trim();
    if(txt==='📥'||txt==='')b.textContent='📥 Descargar';
    if(!b.title||/descargar/i.test(b.title))b.title='Descargar PDF';
  });
}
cleanDocumentButtons();
const observer=new MutationObserver(cleanDocumentButtons);
observer.observe(document.body,{subtree:true,childList:true});

/* Comprobación periódica. */
setTimeout(()=>{BirthdayPro.check();ReminderPro.check();AlertCenter.updateBadges();},1500);
setInterval(()=>{BirthdayPro.check();ReminderPro.check();AlertCenter.updateBadges();},30000);

/* Al abrir Alertas, renderizar el centro. */
document.addEventListener('click',e=>{if(e.target.closest?.('.nav-item[data-view="alerts"]'))setTimeout(()=>AlertCenter.render(),30);});

})();

