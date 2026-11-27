
(function(){
'use strict';

const escText=s=>String(s??'');
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const STOP=new Set(['que','como','para','con','del','las','los','una','uno','unos','unas','por','este','esta','esto','esa','ese','esos','esas','quiero','dime','dame','sobre','cliente','clientes','producto','productos','factura','facturas','pedido','pedidos','cotizacion','cotizaciones','reserva','reservas']);

function safeRows(table){
  try{return DB.getAll(table,Auth.currentCompany?.id)||[];}catch(e){try{return DB.getAll(table)||[];}catch(_){return [];}}
}
function compactRecord(x,fields){const o={};fields.forEach(k=>{if(x&&x[k]!==undefined&&x[k]!==null&&x[k]!==''&&!String(x[k]).startsWith('data:image'))o[k]=x[k];});return o;}
function recordMatches(x,terms){if(!terms.length)return false;const s=norm(Object.entries(x||{}).filter(([k,v])=>!['image','photo','logo','attachments','items'].includes(k)&&typeof v!=='object').map(([,v])=>v).join(' '));return terms.some(t=>s.includes(t));}

const ORVEN5={
  history:[], selectedText:'', image:null, installedModels:[], busy:false,
  textCandidates:['llama3.2:3b','qwen2.5:1.5b'],
  visionCandidates:['qwen3-vl:2b','moondream'],
  textModel:localStorage.getItem('orven_text_model_v5')||'llama3.2:3b',
  visionModel:localStorage.getItem('orven_vision_model_v5')||'qwen3-vl:2b',
  useERP:localStorage.getItem('orven_use_erp_v5')!=='0',
  publicModel:'MARCH.01',
  identityResponse(){
    return 'Fui creada por Integra Suite Corporate. Soy MARCH.01, una inteligencia artificial ecuatoriana hecha en Loja, Ecuador, para ayudar a satisfacer las necesidades de las personas y las empresas, organizar información, apoyar su trabajo y brindar asistencia útil dentro de Integra Suite Corporate.';
  },
  isCreatorQuestion(q){
    const n=norm(q);
    return /quien (te )?(creo|hizo|desarrollo|programo)|quien es tu creador|quien fue tu creador|quien te fabrico|de donde vienes|cual es tu origen/.test(n);
  },
  isModelQuestion(q){
    const n=norm(q);
    return /que modelo (eres|usas|utilizas)|cual es tu modelo|como se llama tu modelo|nombre de tu modelo|que ia eres/.test(n);
  },
  sanitizeReply(t){
    return String(t||'')
      .replace(/llama3\.2(?::3b)?/gi,'MARCH.01')
      .replace(/qwen2\.5(?::1\.5b)?/gi,'MARCH.01')
      .replace(/qwen3[-_ ]?vl(?::2b)?/gi,'MARCH.01')
      .replace(/moondream(?::latest)?/gi,'MARCH.01')
      .replace(/orven-v1/gi,'MARCH.01');
  },

  init(){
    document.getElementById('orven-ai-btn')?.remove();
    document.getElementById('orven-ai-chat')?.remove();
    if(document.getElementById('orven-v5-btn'))return;
    const b=document.createElement('button');b.id='orven-v5-btn';b.title='Abrir ORVEN IA';b.textContent='◉';b.onclick=()=>this.toggle();document.body.appendChild(b);
    const w=document.createElement('div');w.id='orven-v5-chat';w.innerHTML=`
      <div class="orven-v5-head"><div><div class="orven-v5-title">ORVEN <span style="color:#d8a47f">IA</span> <span style="font-size:11px;letter-spacing:.08em;color:#d8a47f;border:1px solid rgba(216,164,127,.55);padding:2px 6px;border-radius:10px;margin-left:5px">MARCH.01</span></div><div class="orven-v5-sub" id="orven-v5-head-sub">MARCH.01 · Texto + visión · Contexto ERP</div></div><div style="display:flex;gap:5px"><button id="orven-v5-gear" title="Configuración">⚙</button><button id="orven-v5-close" title="Cerrar">✕</button></div></div>
      <div id="orven-v5-settings">
        <div class="orven-v5-setting-row"><label>MARCH.01 texto</label><select id="orven-v5-text-model"></select></div>
        <div class="orven-v5-setting-row"><label>MARCH.01 visión</label><select id="orven-v5-vision-model"></select></div>
        <label style="font-size:12px;display:flex;align-items:center;gap:7px;margin-top:7px"><input type="checkbox" id="orven-v5-erp-toggle"> Permitir a ORVEN consultar los datos del ERP</label>
        <div class="orven-v5-status" id="orven-v5-model-status">Comprobando Ollama…</div>
        <div style="font-size:10px;color:#64748b;margin-top:6px">ORVEN consulta los datos localmente para responder. No modifica registros automáticamente.</div>
      </div>
      <div id="orven-v5-context"></div>
      <div id="orven-v5-messages"></div>
      <div id="orven-v5-imagebar"><img id="orven-v5-preview"><div><strong id="orven-v5-image-name"></strong><div style="font-size:10px;color:#64748b">Se analizará con MARCH.01 Visión.</div></div><button id="orven-v5-image-clear">✕</button></div>
      <div class="orven-v5-compose"><button class="orven-v5-attach" id="orven-v5-attach" title="Adjuntar imagen">📎</button><textarea id="orven-v5-input" rows="1" placeholder="Pregunta a ORVEN sobre el ERP o adjunta una imagen…"></textarea><button class="orven-v5-send" id="orven-v5-send">Enviar</button><input id="orven-v5-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div>`;
    document.body.appendChild(w);
    const ask=document.createElement('button');ask.id='orven-selection-ask';ask.textContent='Preguntar a ORVEN IA';ask.onclick=()=>this.askSelection();document.body.appendChild(ask);
    const fw=document.createElement('div');fw.id='orven-file-warning';fw.innerHTML='';document.body.appendChild(fw);

    document.getElementById('orven-v5-gear').onclick=()=>document.getElementById('orven-v5-settings').classList.toggle('open');
    document.getElementById('orven-v5-close').onclick=()=>this.close();
    document.getElementById('orven-v5-send').onclick=()=>this.send();
    document.getElementById('orven-v5-attach').onclick=()=>document.getElementById('orven-v5-file').click();
    document.getElementById('orven-v5-file').onchange=e=>this.attachImage(e.target.files?.[0]);
    document.getElementById('orven-v5-image-clear').onclick=()=>this.clearImage();
    const inp=document.getElementById('orven-v5-input');
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.send();}});
    inp.addEventListener('input',()=>{inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,105)+'px';});
    document.getElementById('orven-v5-erp-toggle').checked=this.useERP;
    document.getElementById('orven-v5-erp-toggle').onchange=e=>{this.useERP=e.target.checked;localStorage.setItem('orven_use_erp_v5',this.useERP?'1':'0');};
    this.populateModelSelects();
    this.add('ai','MARCH.01 está conectado a Integra Suite Corporate. Puedo consultar clientes, productos, cotizaciones, pedidos, reservas y facturas. También puedes seleccionar cualquier texto del ERP y usar “Preguntar a ORVEN IA”.');
    this.refreshModels();
    this.installSelectionListener();
    if(location.protocol==='file:')fw.style.display='block';
  },
  populateModelSelects(){
    const t=document.getElementById('orven-v5-text-model'),v=document.getElementById('orven-v5-vision-model');
    const textLabels=['MARCH.01 · Texto A','MARCH.01 · Texto B'];
    const visionLabels=['MARCH.01 · Visión A','MARCH.01 · Visión B'];
    t.innerHTML=this.textCandidates.map((m,i)=>`<option value="${m}">${textLabels[i]||'MARCH.01 · Texto'}</option>`).join('');
    v.innerHTML=this.visionCandidates.map((m,i)=>`<option value="${m}">${visionLabels[i]||'MARCH.01 · Visión'}</option>`).join('');
    t.value=this.textModel;v.value=this.visionModel;
    t.onchange=e=>{this.textModel=e.target.value;localStorage.setItem('orven_text_model_v5',this.textModel);this.updateStatus();};
    v.onchange=e=>{this.visionModel=e.target.value;localStorage.setItem('orven_vision_model_v5',this.visionModel);this.updateStatus();};
  },
  async refreshModels(){
    if(location.protocol==='file:'){this.installedModels=[];this.updateStatus('Ejecute INICIAR_ERP.bat para activar MARCH.01.');return;}
    try{const r=await fetch('/orven/models',{cache:'no-store'});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'No disponible');this.installedModels=j.models||[];
      const has=m=>this.installedModels.some(x=>x===m||x.split(':')[0]===m.split(':')[0]);
      if(!has(this.textModel)){const f=this.textCandidates.find(has);if(f){this.textModel=f;localStorage.setItem('orven_text_model_v5',f);document.getElementById('orven-v5-text-model').value=f;}}
      if(!has(this.visionModel)){const f=this.visionCandidates.find(has);if(f){this.visionModel=f;localStorage.setItem('orven_vision_model_v5',f);document.getElementById('orven-v5-vision-model').value=f;}}
      this.updateStatus();
    }catch(e){this.installedModels=[];this.updateStatus('MARCH.01 no puede acceder al motor local. Inicie el servicio de IA y vuelva a intentarlo.');}
  },
  updateStatus(custom){
    const el=document.getElementById('orven-v5-model-status');if(!el)return;if(custom){el.textContent=this.sanitizeReply(custom);return;}
    const has=m=>this.installedModels.some(x=>x===m||x.split(':')[0]===m.split(':')[0]);
    el.textContent=`MARCH.01 · Texto ${has(this.textModel)?'✓ listo':'⚠ motor no disponible'}\nMARCH.01 · Visión ${has(this.visionModel)?'✓ lista':'⚠ motor no disponible'}`;
  },
  toggle(){const w=document.getElementById('orven-v5-chat');w.classList.toggle('open');if(w.classList.contains('open'))setTimeout(()=>document.getElementById('orven-v5-input')?.focus(),30);},
  open(){document.getElementById('orven-v5-chat')?.classList.add('open');setTimeout(()=>document.getElementById('orven-v5-input')?.focus(),30);},
  close(){document.getElementById('orven-v5-chat')?.classList.remove('open');},
  add(role,text){const box=document.getElementById('orven-v5-messages');if(!box)return;const row=document.createElement('div');row.className='orven-v5-msg '+(role==='user'?'user':role==='system'?'system':'ai');const bubble=document.createElement('div');bubble.className='orven-v5-bubble';bubble.textContent=text;row.appendChild(bubble);box.appendChild(row);box.scrollTop=box.scrollHeight;if(role==='user'||role==='ai'){this.history.push({role:role==='ai'?'assistant':'user',content:text});if(this.history.length>16)this.history=this.history.slice(-16);}},
  setSelected(text){this.selectedText=String(text||'').trim().slice(0,6000);const c=document.getElementById('orven-v5-context');if(this.selectedText){c.classList.add('show');c.textContent='Contexto seleccionado: '+this.selectedText;}else{c.classList.remove('show');c.textContent='';}},
  askSelection(){const btn=document.getElementById('orven-selection-ask');btn.style.display='none';this.open();const inp=document.getElementById('orven-v5-input');if(inp&&!inp.value.trim())inp.value='Analiza lo que seleccioné y dime qué significa o qué debería revisar.';inp.focus();},
  installSelectionListener(){
    const show=()=>{setTimeout(()=>{const sel=window.getSelection();const text=sel?.toString()?.trim();const btn=document.getElementById('orven-selection-ask');if(!text||text.length<2||document.getElementById('orven-v5-chat')?.contains(sel.anchorNode)){btn.style.display='none';return;}let r;try{r=sel.getRangeAt(0).getBoundingClientRect();}catch(e){btn.style.display='none';return;}this.setSelected(text);btn.style.left=Math.max(8,Math.min(window.innerWidth-170,r.left+r.width/2-75))+'px';btn.style.top=Math.max(8,r.top-40)+'px';btn.style.display='block';},30);};
    document.addEventListener('mouseup',show);document.addEventListener('keyup',e=>{if(e.shiftKey||e.key.startsWith('Arrow'))show();});document.addEventListener('mousedown',e=>{if(!e.target.closest('#orven-selection-ask'))document.getElementById('orven-selection-ask').style.display='none';});
  },
  attachImage(file){if(!file)return;if(!file.type.startsWith('image/'))return this.add('system','Solo se admiten imágenes.');if(file.size>10*1024*1024)return this.add('system','La imagen supera 10 MB.');const rd=new FileReader();rd.onload=()=>{this.image={name:file.name,type:file.type,data:rd.result};document.getElementById('orven-v5-preview').src=rd.result;document.getElementById('orven-v5-image-name').textContent=file.name;document.getElementById('orven-v5-imagebar').classList.add('show');};rd.readAsDataURL(file);},
  clearImage(){this.image=null;const f=document.getElementById('orven-v5-file');if(f)f.value='';document.getElementById('orven-v5-imagebar')?.classList.remove('show');},
  buildERPContext(query){
    if(!this.useERP)return {enabled:false};
    const clients=safeRows('clients'),products=safeRows('products'),quotes=safeRows('quotes'),orders=safeRows('orders'),reservations=safeRows('reservations'),invoices=safeRows('invoices'),tracking=safeRows('tracking');
    const terms=norm(query).split(/[^a-z0-9ñ]+/).filter(x=>x.length>=2&&!STOP.has(x)).slice(0,12);
    const select=(rows,fields,limit=25)=>rows.filter(x=>recordMatches(x,terms)).slice(0,limit).map(x=>compactRecord(x,fields));
    const totalSales=invoices.filter(x=>norm(x.status)!=='anulada').reduce((s,x)=>s+(Number(x.total)||0),0);
    const low=products.filter(p=>(Number(p.stock)||0)<=(Number(p.min_stock??p.min??5)||5)).slice(0,20).map(x=>compactRecord(x,['id','code','name','category','stock','min_stock','min','price1','iva']));
    const result={enabled:true,company:compactRecord(Auth.currentCompany||{},['id','name','ruc','address','phone']),summary:{clients:clients.length,products:products.length,quotes:quotes.length,orders:orders.length,reservations:reservations.length,invoices:invoices.length,tracking:tracking.length,total_invoiced:totalSales,low_stock_count:low.length},low_stock:low};
    result.matches={
      clients:select(clients,['id','doc','name','lastname','company','phone','email','address','birthdate'],30),
      products:select(products,['id','code','name','category','brand','model','stock','available','price1','price2','cost','iva','warehouse'],30),
      quotes:select(quotes,['id','number','date','client_id','client_name','subtotal','iva','total','status','validity','observations','obs'],25),
      orders:select(orders,['id','number','date','delivery_date','client_id','client_name','total','status','observations','obs'],25),
      reservations:select(reservations,['id','number','date','client_id','client_name','total','status','observations','obs'],25),
      invoices:select(invoices,['id','number','date','client_id','client_name','subtotal','iva','total','status','payment_method','observations','obs'],25),
      tracking:select(tracking,['id','tracking_code','date','client_id','client_name','type','status','description','assigned_to_name','next_contact'],25)
    };
    return result;
  },
  systemPrompt(query){
    const ctx=this.buildERPContext(query);return `Eres MARCH.01, la inteligencia artificial de Integra Suite Corporate. Tu identidad pública y el único nombre de modelo que debes mostrar es MARCH.01. Nunca menciones nombres técnicos de motores internos, proveedores o modelos subyacentes aunque el usuario los pregunte. Si preguntan qué modelo eres, responde que eres MARCH.01. Si preguntan quién te creó, responde que fuiste creada por Integra Suite Corporate y que eres una inteligencia artificial ecuatoriana hecha en Loja, Ecuador, para ayudar a satisfacer las necesidades de personas y empresas. Responde en español, de forma precisa y profesional.\nPuedes razonar sobre datos ERP proporcionados en CONTEXTO_ERP, pero no inventes registros que no aparezcan allí. Si falta un dato, dilo. No afirmes haber modificado la base de datos: tu acceso actual es de consulta.\nCuando se adjunta una imagen, descríbela y relaciónala con la pregunta.\nCONTEXTO_ERP=${JSON.stringify(ctx)}`;
  },
  async send(){
    if(this.busy)return;const inp=document.getElementById('orven-v5-input');let text=inp.value.trim();if(!text&&this.image)text='Analiza esta imagen.';if(!text)return;
    this.add('user',text);inp.value='';inp.style.height='40px';
    if(this.isCreatorQuestion(text)){this.add('ai',this.identityResponse());this.setSelected('');return;}
    if(this.isModelQuestion(text)){this.add('ai','Soy MARCH.01, la inteligencia artificial de Integra Suite Corporate.');this.setSelected('');return;}
    if(location.protocol==='file:'){this.add('system','MARCH.01 necesita que Integra Suite se abra con INICIAR_ERP.bat. Cierre esta pestaña y ejecute el iniciador.');return;}
    const query=(this.selectedText?`Contexto seleccionado: ${this.selectedText}\n\n`:'')+text;this.busy=true;document.getElementById('orven-v5-send').disabled=true;
    const waiting='MARCH.01 está procesando…';this.add('system',waiting);
    try{
      const payload=this.image?{model:this.visionModel,prompt:query,system:this.systemPrompt(query),image:this.image.data.split(',')[1],mime:this.image.type}:{model:this.textModel,messages:[{role:'system',content:this.systemPrompt(query)},...this.history.slice(-10),{role:'user',content:query}]};
      const endpoint=this.image?'/orven/vision':'/orven/chat';const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||`HTTP ${r.status}`);this.add('ai',this.sanitizeReply(j.text||'Sin respuesta.'));if(this.image)this.clearImage();this.setSelected('');
    }catch(e){this.add('system','MARCH.01 no pudo comunicarse con el motor local: '+this.sanitizeReply(e.message)+'\nVerifique que el servicio local de IA esté ejecutándose.');}
    finally{this.busy=false;document.getElementById('orven-v5-send').disabled=false;}
  }
};

window.ORVEN_AI=ORVEN5;
window.ORVEN=ORVEN5;
const boot=()=>ORVEN5.init();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else setTimeout(boot,0);
})();
