
(function(){
'use strict';

const V4 = window.IntegraV4 = {
  version:'4.0',
  bigLegacyKeys:['integra_suite_v76','integra_v74_master','integra_v74_master_backup'],
  dbName:'IntegraSuiteCorporateDB',
  storeName:'kv',
  stateKey:'erp_state_v4'
};

const DurableStore = window.DurableStore = {
  _db:null,
  _saveTimer:null,
  _lastPromise:Promise.resolve(),
  async open(){
    if(this._db) return this._db;
    this._db = await new Promise((resolve,reject)=>{
      const req=indexedDB.open(V4.dbName,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(V4.storeName)) db.createObjectStore(V4.storeName);
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('No se pudo abrir IndexedDB'));
    });
    return this._db;
  },
  async get(key){
    const db=await this.open();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(V4.storeName,'readonly');
      const req=tx.objectStore(V4.storeName).get(key);
      req.onsuccess=()=>resolve(req.result??null);
      req.onerror=()=>reject(req.error);
    });
  },
  async set(key,value){
    const db=await this.open();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(V4.storeName,'readwrite');
      tx.objectStore(V4.storeName).put(value,key);
      tx.oncomplete=()=>resolve(true);
      tx.onerror=()=>reject(tx.error||new Error('Error escribiendo IndexedDB'));
      tx.onabort=()=>reject(tx.error||new Error('Guardado IndexedDB cancelado'));
    });
  },
  queue(value){
    clearTimeout(this._saveTimer);
    this._saveTimer=setTimeout(()=>{
      let snapshot;
      try{snapshot=structuredClone(value);}catch(e){snapshot=JSON.parse(JSON.stringify(value));}
      this._lastPromise=this.set(V4.stateKey,snapshot).catch(err=>{
        console.error('IndexedDB save error:',err);
        if(window.UI?.toast) UI.toast('No se pudo guardar en la base local del navegador','error');
      });
    },180);
    return true;
  },
  async flush(value){
    clearTimeout(this._saveTimer);
    let snapshot;
    try{snapshot=structuredClone(value);}catch(e){snapshot=JSON.parse(JSON.stringify(value));}
    this._lastPromise=this.set(V4.stateKey,snapshot);
    return await this._lastPromise;
  }
};

function copyStateIntoDB(p){
  if(!p||typeof p!=='object') return false;
  Object.keys(DB.data).forEach(k=>{
    if(Array.isArray(DB.data[k])) DB.data[k]=Array.isArray(p[k])?p[k]:[];
    else DB.data[k]=(p[k]&&typeof p[k]==='object')?p[k]:{};
  });
  return true;
}

function readLegacyState(){
  for(const key of V4.bigLegacyKeys){
    try{
      const raw=localStorage.getItem(key);
      if(raw){
        const p=JSON.parse(raw);
        if(p&&typeof p==='object') return p;
      }
    }catch(e){}
  }
  return null;
}

function clearLegacyCopies(){
  for(const key of V4.bigLegacyKeys){
    try{localStorage.removeItem(key);}catch(e){}
  }
}

// Reemplazo final de DB.init: IndexedDB es la fuente local principal.
DB.init=async function(){
  let loaded=null;
  let migrated=false;
  let idbAvailable=true;
  try{loaded=await DurableStore.get(V4.stateKey);}catch(e){idbAvailable=false;console.warn('IndexedDB read:',e);}
  if(!loaded){
    loaded=readLegacyState();
    migrated=!!loaded;
  }
  try{
    if(loaded) copyStateIntoDB(loaded);
    else DB.seedData();
    if(DB.migrateUsers) DB.migrateUsers();
    if(DB.ensureSystemAdmin) DB.ensureSystemAdmin();
  }catch(e){
    console.error('Error preparando datos locales:',e);
    if(!loaded){DB.seedData(); if(DB.ensureSystemAdmin)DB.ensureSystemAdmin();}
  }

  // Guardar primero en IndexedDB y limpiar las copias gigantes SOLO si la migración terminó bien.
  if(idbAvailable){
    try{
      await DurableStore.flush(DB.data);
      clearLegacyCopies();
      try{navigator.storage?.persist?.();}catch(e){}
    }catch(e){
      console.error('No se pudo confirmar la migración a IndexedDB:',e);
      idbAvailable=false;
      window.UI?.toast?.('No se pudo activar el almacenamiento de alta capacidad; no se borraron sus datos antiguos','warning');
    }
  }

  // Supabase solo se intenta desde un origen web válido.
  if(window.CloudAPI){
    if(location.protocol==='file:'){
      CloudAPI.online=false;
      CloudAPI.setStatus?.('💻 Local: use INICIAR_ERP.bat',false);
    }else{
      const b=await CloudAPI.bootstrap();
      if(b){
        if(Array.isArray(b.companies)&&b.companies.length){
          DB.data.companies=b.companies.map(rc=>({...(DB.data.companies.find(lc=>lc.id===rc.id)||{}),...rc}));
        }
        if(Array.isArray(b.branches)&&b.branches.length){
          DB.data.branches=b.branches.map(rb=>({...(DB.data.branches.find(lb=>lb.id===rb.id)||{}),...rb}));
        }
        if(idbAvailable) DurableStore.queue(DB.data);
      }
    }
  }
  if(migrated&&idbAvailable) setTimeout(()=>window.UI?.toast?.('Datos migrados a almacenamiento local de alta capacidad','success'),500);
  return true;
};

// Reemplazo final: NO vuelve a escribir el ERP completo en localStorage.
DB.save=function(){
  DurableStore.queue(DB.data);
  if(window.CloudAPI?.online&&CloudAPI.token) CloudAPI.scheduleSave();
  return true;
};

// Cloud bundle: misma lógica, pero sin volver a llenar localStorage.
if(window.CloudAPI){
  CloudAPI.applyBundle=function(bundle){
    if(!bundle)return;
    const state=bundle.state||bundle.payload||{};
    const currentSettings=DB.data.settings||{};
    const defaults={...DB.data};
    Object.keys(defaults).forEach(k=>{
      if(k==='users'||k==='settings')return;
      if(Array.isArray(defaults[k])) DB.data[k]=Array.isArray(state[k])?state[k]:defaults[k];
      else if(k!=='_meta') DB.data[k]=(state[k]&&typeof state[k]==='object')?state[k]:defaults[k];
    });
    DB.data.settings={...currentSettings,...(state.settings||{})};
    if(Array.isArray(bundle.users))DB.data.users=bundle.users;
    this.revision=Number(bundle.revision||this.revision||0);
    try{localStorage.setItem('integra_cloud_revision_v1',String(this.revision));}catch(e){}
    DurableStore.queue(DB.data);
  };

  const rawRequest=CloudAPI.request.bind(CloudAPI);
  CloudAPI.request=async function(action,payload={},requireSession=true){
    if(location.protocol==='file:'){
      const err=new Error('Supabase requiere abrir el ERP mediante http://127.0.0.1, no file://');
      err.code='FILE_ORIGIN';
      throw err;
    }
    return await rawRequest(action,payload,requireSession);
  };
}

// Persistir cambios pendientes cuando la pestaña pierde visibilidad.
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden') DurableStore.flush(DB.data).catch(()=>{});
});

// Aviso claro si el usuario abre el HTML directamente.
if(location.protocol==='file:'){
  window.addEventListener('DOMContentLoaded',()=>{
    setTimeout(()=>window.UI?.toast?.('Modo local activo','warning'),700);
  });
}

console.log('✅ Integra Suite v4: IndexedDB activo; localStorage pesado deshabilitado.');
})();
