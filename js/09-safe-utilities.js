
(function(){
'use strict';

/* ---------- Utilidades seguras ---------- */
const money=n=>Number.isFinite(Number(n))?Number(n):0;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const itemVatRate=(item)=>{
    if(item && item.iva!==undefined && item.iva!==null && item.iva!=='') return clamp(money(item.iva),0,100);
    const p=item?.prodId?DB.getOne('products',item.prodId):null;
    return clamp(money(p?.iva),0,100);
};

/* ---------- Numeración: COT y PED empiezan en 17 ---------- */
const __numberBase=DB.getNextNumber.bind(DB);
DB.getNextNumber=function(type){
    let generated=__numberBase(type);
    if(type!=='COT' && type!=='PED') return generated;

    const table=type==='COT'?'quotes':'orders';
    const prefix=type;
    const parsed=parseInt(String(generated||'').match(/(\d+)$/)?.[1]||'0',10)||0;
    const existing=(DB.data?.[table]||[]).map(row=>parseInt(String(row.number||'').match(/(\d+)$/)?.[1]||'0',10)||0);
    const maxExisting=existing.length?Math.max(...existing):0;
    const safe=Math.max(17,parsed,maxExisting+1);

    DB.data.counters=DB.data.counters||{};
    DB.data.counters[type]=Math.max(Number(DB.data.counters[type])||0,safe);
    try{DB.save();}catch(e){}
    return `${prefix}-${String(safe).padStart(6,'0')}`;
};

/* ---------- Cotizaciones: precio editable + IVA real por producto ---------- */
if(typeof Modules!=='undefined'&&Modules.Quotes){
    Modules.Quotes.updatePrice=function(i,v){
        const it=this.tempItems?.[i];
        if(!it)return;
        const raw=String(v??'').trim().replace(',','.');
        if(raw===''){
            it.price=0;
        }else{
            const price=Number(raw);
            if(!Number.isFinite(price)||price<0)return;
            it.price=price;
        }
        it.subtotal=money(it.price)*money(it.qty);
        this.calculateTotals();
        const cell=document.getElementById('quote-line-total-'+i);
        if(cell)cell.textContent=Utils.formatMoney(money(it.subtotal));
    };

    Modules.Quotes.renderItems=function(){
        const tbody=document.getElementById('quote-items-tbody');
        const headerRow=tbody?.closest('table')?.querySelector('thead tr');
        if(headerRow&&!headerRow.querySelector('[data-quote-code-column]')){
            const codeHeader=document.createElement('th');
            codeHeader.textContent='Código';
            codeHeader.dataset.quoteCodeColumn='true';
            headerRow.insertBefore(codeHeader,headerRow.children[1]||null);
        }
        if(tbody){
            tbody.innerHTML=(this.tempItems||[]).map((it,i)=>{
                const rate=itemVatRate(it);
                it.iva=rate;

                // Código del producto: del ítem o, si falta, del producto
                let code=it.prodCode||it.product_code||it.productCode||it.code||it.sku||'';
                if(!code&&it.prodId){
                    const p=DB.getOne('products',it.prodId);
                    if(p){
                        code=p.code||p.product_code||p.productCode||p.sku||p.codigo||p.barcode||p.ref||'';
                    }
                }
                if(code)it.prodCode=code;

                return `<tr>
                    <td>${it.prodImg?`<img src="${it.prodImg}" class="prod-thumb">`:''}</td>
                    <td>${code?Utils.escape(code):'—'}</td>
                    <td>${Utils.escape(it.prodName||'')}<div class="quote-iva-label">IVA del producto: ${rate}%</div></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" aria-label="Cantidad" class="input" style="width:70px" value="${money(it.qty)}" oninput="Modules.Quotes.updateQty(${i},this.value)"></td>
                    <td><input type="text" inputmode="decimal" autocomplete="off" aria-label="Precio unitario" class="input quote-price-input" value="${money(it.price).toFixed(2)}" oninput="Modules.Quotes.updatePrice(${i},this.value)"></td>
                    <td><input type="number" min="0" max="100" step="0.01" class="input" style="width:72px" placeholder="0" value="${money(it.disc_pct)>0?money(it.disc_pct):''}" oninput="Modules.Quotes.updateDiscount(${i},this.value)" onchange="Modules.Quotes.renderItems()"></td>
                    <td class="font-bold" id="quote-line-total-${i}">${Utils.formatMoney(money(it.price)*money(it.qty)*(1-clamp(money(it.disc_pct),0,100)/100))}</td>
                    <td><button onclick="Modules.Quotes.removeItem(${i})" style="color:red;background:none;border:none">✕</button></td>
                </tr>`;
            }).join('');
        }
        this.calculateTotals();
    };

    Modules.Quotes.updateQty=function(i,v){
        const it=this.tempItems?.[i];
        if(!it)return;
        const raw=String(v??'').trim().replace(',','.');
        if(raw===''){
            it.qty=0;
        }else{
            const qty=Number(raw);
            if(!Number.isFinite(qty)||qty<0)return;
            it.qty=qty;
        }
        it.subtotal=money(it.price)*it.qty;
        this.calculateTotals();
        const cell=document.getElementById('quote-line-total-'+i);
        if(cell)cell.textContent=Utils.formatMoney(money(it.subtotal));
    };

    Modules.Quotes.updateDiscount=function(i,v){
        const it=this.tempItems?.[i];
        if(!it)return;
        it.disc_pct=clamp(parseFloat(v)||0,0,100);
        this.calculateTotals();
        const cell=document.getElementById('quote-line-total-'+i);
        if(cell)cell.textContent=Utils.formatMoney(money(it.subtotal));
    };

    Modules.Quotes.calculateTotals=function(){
        const items=this.tempItems||[];
        const globalPct=clamp(parseFloat(document.getElementById('quote-disc-global')?.value)||0,0,100);
        let subtotal=0;
        let itemDiscountTotal=0;
        let ivaTotal=0;
        let taxableTotal=0;
        const breakdown={};

        items.forEach(item=>{
            const price=Math.max(0,money(item.price));
            const qty=Math.max(0,money(item.qty));
            const gross=price*qty;
            const pct=clamp(money(item.disc_pct),0,100);
            let itemDiscount;
            if(pct>0){
                itemDiscount=gross*(pct/100);
            }else{
                const discRaw=Math.max(0,money(item.discount));
                itemDiscount=discRaw<=100?gross*(discRaw/100):Math.min(gross,discRaw);
            }
            const afterItem=Math.max(0,gross-itemDiscount);
            const globalDiscountForLine=afterItem*(globalPct/100);
            const taxable=Math.max(0,afterItem-globalDiscountForLine);
            const rate=itemVatRate(item);
            const tax=taxable*(rate/100);

            item.price=price;
            item.qty=qty;
            item.iva=rate;
            item.disc_pct=pct;
            item.discount_amount=itemDiscount;
            item.subtotal=afterItem;
            item.taxable=taxable;
            item.iva_amount=tax;

            subtotal+=afterItem;
            itemDiscountTotal+=itemDiscount;
            taxableTotal+=taxable;
            ivaTotal+=tax;
            const key=String(rate);
            breakdown[key]=breakdown[key]||{rate,base:0,tax:0};
            breakdown[key].base+=taxable;
            breakdown[key].tax+=tax;
        });

        const globalDiscount=subtotal*(globalPct/100);
        const discountTotal=itemDiscountTotal+globalDiscount;
        const total=Math.max(0,taxableTotal+ivaTotal);

        const sub=document.getElementById('quote-subtotal');
        const dis=document.getElementById('quote-discount');
        const iva=document.getElementById('quote-iva');
        const tot=document.getElementById('quote-total');
        if(sub)sub.textContent=Utils.formatMoney(subtotal);
        if(dis)dis.textContent='-'+Utils.formatMoney(discountTotal);
        if(iva)iva.textContent=Utils.formatMoney(ivaTotal);
        if(tot)tot.textContent=Utils.formatMoney(total);

        let bd=document.getElementById('quote-iva-breakdown');
        if(!bd && iva){
            bd=document.createElement('div');
            bd.id='quote-iva-breakdown';
            bd.className='text-muted';
            bd.style.cssText='font-size:10px;margin-top:4px;text-align:right;';
            const host=iva.closest('.flex')?.parentElement || iva.parentElement;
            host?.appendChild(bd);
        }
        if(bd){
            bd.innerHTML=ivaTotal>0
                ?`IVA: <strong>${Utils.formatMoney(ivaTotal)}</strong>`
                :'';
        }

        this.currentTotals={subtotal,itemDiscountTotal,globalDiscount,discountTotal,taxableTotal,totalIva:ivaTotal,total,breakdown};
        try{this.calcInstallments();}catch(e){}
        return this.currentTotals;
    };

    const __quoteSaveFinal=Modules.Quotes.save.bind(Modules.Quotes);
    Modules.Quotes.save=function(){
        this.calculateTotals();
        const result=__quoteSaveFinal();
        const id=document.getElementById('quote-id')?.value||'';
        const q=id?DB.getOne('quotes',id):(DB.data.quotes||[]).at(-1);
        if(q && this.currentTotals){
            q.subtotal=this.currentTotals.subtotal;
            q.discount_amount=this.currentTotals.discountTotal;
            q.taxable_subtotal=this.currentTotals.taxableTotal;
            q.iva=this.currentTotals.totalIva;
            q.total=this.currentTotals.total;
            q.tax_breakdown=this.currentTotals.breakdown;
            q.items=JSON.stringify(this.tempItems||[]);
            DB.save();
        }
        return result;
    };
}
/* ---------- Pedidos: conservar exactamente los totales e IVA de la cotización ---------- */
if(typeof Modules!=='undefined'&&Modules.Orders){
    const __createOrder=Modules.Orders.createFromQuote?.bind(Modules.Orders);
    if(__createOrder){
        Modules.Orders.createFromQuote=function(){
            const qid=document.getElementById('to-order-quote-id')?.value||'';
            const q=DB.getOne('quotes',qid);
            if(q && Modules.Quotes?.tempItems && document.getElementById('quote-id')?.value===qid){
                Modules.Quotes.calculateTotals();
            }
            const before=(DB.data.orders||[]).length;
            const result=__createOrder();
            const o=(DB.data.orders||[]).length>before?(DB.data.orders||[]).at(-1):null;
            const source=q|| (o?.source_quote_id?DB.getOne('quotes',o.source_quote_id):null);
            if(o && source){
                o.items=source.items;
                o.subtotal=money(source.taxable_subtotal ?? source.subtotal);
                o.iva=money(source.iva);
                o.tax_breakdown=source.tax_breakdown||null;
                o.total=money(source.total);
                o.discount=money(source.discount);
                o.discount_amount=money(source.discount_amount);
                DB.save();
                try{this.render();}catch(e){}
            }
            return result;
        };
    }
}

/* ---------- Controles cerrar / minimizar / maximizar para modales ---------- */
const WindowManager={
    enhance(overlay){
        if(!overlay || overlay.dataset.erpWindow==='1')return;
        const modal=overlay.querySelector(':scope > .modal');
        const header=modal?.querySelector(':scope > .modal-header');
        if(!modal||!header)return;
        overlay.dataset.erpWindow='1';

        // Quitar únicamente el botón X antiguo para no duplicarlo.
        [...header.querySelectorAll('button')].forEach(b=>{
            if((b.textContent||'').trim()==='✕' && !b.classList.contains('erp-window-btn')) b.remove();
        });

        const controls=document.createElement('div');
        controls.className='erp-window-controls';
        controls.innerHTML=`
            <button type="button" class="erp-window-btn erp-min" title="Minimizar">—</button>
            <button type="button" class="erp-window-btn erp-max" title="Maximizar / Restaurar">□</button>
            <button type="button" class="erp-window-btn erp-close" title="Cerrar">✕</button>`;
        header.appendChild(controls);

        controls.querySelector('.erp-min').onclick=(e)=>{
            e.stopPropagation();
            modal.classList.toggle('erp-minimized');
            if(modal.classList.contains('erp-minimized'))modal.classList.remove('erp-maximized');
        };
        controls.querySelector('.erp-max').onclick=(e)=>{
            e.stopPropagation();
            modal.classList.toggle('erp-maximized');
            if(modal.classList.contains('erp-maximized'))modal.classList.remove('erp-minimized');
        };
        controls.querySelector('.erp-close').onclick=(e)=>{
            e.stopPropagation();
            modal.classList.remove('erp-minimized','erp-maximized');
            UI.closeModal(overlay.id);
        };
    },
    init(){document.querySelectorAll('.modal-overlay').forEach(x=>this.enhance(x));}
};
window.ERPWindowManager=WindowManager;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>WindowManager.init(),{once:true});else WindowManager.init();
new MutationObserver(()=>WindowManager.init()).observe(document.documentElement,{childList:true,subtree:true});

/* Quitar el aviso solicitado, incluso si ORVEN lo crea después. */
const removeServerWarnings=()=>{
    document.getElementById('orven-file-warning')?.remove();
    document.querySelectorAll('.toast,.alerta-flotante').forEach(el=>{
        const t=(el.textContent||'').toLowerCase();
        if(t.includes('iniciar_erp.bat')||t.includes('restricciones file://'))el.remove();
    });
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{removeServerWarnings();setInterval(removeServerWarnings,1200)},{once:true});
else {removeServerWarnings();setInterval(removeServerWarnings,1200)}

console.log('✅ Patch 2026-09-18 activo: IVA por producto, COT/PED desde 17, precio editable y controles de ventana.');
})();
