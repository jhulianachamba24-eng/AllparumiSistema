
(function(){
    if(typeof Modules==='undefined' || !Modules.Orders) return;

    const Orders=Modules.Orders;
    const originalOpenFromQuote=Orders.openFromQuote;

    Orders.addDaysToInputDate=function(dateStr,days){
        const baseStr=Utils.dateInputValue(dateStr)||Utils.todayInputDate();
        const d=new Date(`${baseStr}T12:00:00`);
        d.setDate(d.getDate()+(parseInt(days)||0));
        const y=d.getFullYear();
        const m=String(d.getMonth()+1).padStart(2,'0');
        const day=String(d.getDate()).padStart(2,'0');
        return `${y}-${m}-${day}`;
    };

    Orders.daysBetweenInputDates=function(start,end){
        const s=Utils.dateInputValue(start);
        const e=Utils.dateInputValue(end);
        if(!s||!e)return 30;
        const a=new Date(`${s}T12:00:00`);
        const b=new Date(`${e}T12:00:00`);
        const diff=Math.round((b-a)/86400000);
        return diff>0?diff:1;
    };

    Orders.syncOrderExpirationFromValidity=function(){
        const date=document.getElementById('order-date')?.value||Utils.todayInputDate();
        const validity=parseInt(document.getElementById('order-validity')?.value||'30')||30;
        const expiration=document.getElementById('order-expiration-date');
        if(expiration)expiration.value=this.addDaysToInputDate(date,validity);
    };

    Orders.syncOrderValidityFromExpiration=function(){
        const date=document.getElementById('order-date')?.value||Utils.todayInputDate();
        const expiration=document.getElementById('order-expiration-date')?.value||'';
        const validity=document.getElementById('order-validity');
        if(validity&&expiration)validity.value=this.daysBetweenInputDates(date,expiration);
    };

    Orders.openFromQuote=function(qid){
        const result=originalOpenFromQuote.call(this,qid);
        const editId=document.getElementById('order-edit-id');
        if(editId)editId.value='';
        const title=document.getElementById('order-modal-title');
        if(title)title.textContent='Convertir a Pedido';
        const saveBtn=document.getElementById('order-save-btn');
        if(saveBtn)saveBtn.textContent='Crear Pedido';
        const orderDate=document.getElementById('order-date');
        if(orderDate)orderDate.value=Utils.todayInputDate();
        const validity=document.getElementById('order-validity');
        if(validity)validity.value='30';
        this.syncOrderExpirationFromValidity();
        return result;
    };

    Orders.saveOrder=function(){
        const id=document.getElementById('order-edit-id')?.value||'';
        if(id)return this.saveEdit(id);
        return this.createFromQuote();
    };

    Orders.edit=function(id){
        const o=DB.getOne('orders',id);
        if(!o)return UI.toast('Pedido no encontrado','error');

        const cid=Auth.currentCompany?.id;
        const whs=DB.getAll('warehouses',cid);
        const whSelect=document.getElementById('order-warehouse-select');
        if(whSelect){
            whSelect.innerHTML='<option value="">Seleccione bodega</option>'+whs.map(w=>`<option value="${w.id}">${Utils.escape(w.name||'')}</option>`).join('');
        }

        const set=(id,value)=>{const el=document.getElementById(id);if(el)el.value=value??'';};
        set('order-edit-id',o.id);
        set('to-order-quote-id',o.source_quote_id||'');
        set('order-date',Utils.dateInputValue(o.date)||Utils.todayInputDate());
        set('order-delivery-date',Utils.dateInputValue(o.delivery_date)||Utils.todayInputDate());
        set('order-delivery-time',o.delivery_time||'');
        set('order-priority',o.priority||'Normal');
        set('order-warehouse-select',o.warehouse_id||'');
        set('order-carrier',o.carrier||'');
        set('order-notes',o.observations||o.notes||'');
        set('order-expiration-date',Utils.dateInputValue(o.expiration_date)||'');

        const date=Utils.dateInputValue(o.date)||Utils.todayInputDate();
        const validity=o.validity || (o.expiration_date?this.daysBetweenInputDates(date,o.expiration_date):30);
        set('order-validity',validity);
        if(!document.getElementById('order-expiration-date')?.value){
            this.syncOrderExpirationFromValidity();
        }

        const title=document.getElementById('order-modal-title');
        if(title)title.textContent=`Editar Pedido ${o.number||''}`.trim();
        const saveBtn=document.getElementById('order-save-btn');
        if(saveBtn)saveBtn.textContent='Guardar Cambios';

        UI.openModal('modal-to-order');
    };

    Orders.saveEdit=function(id){
        const o=DB.getOne('orders',id);
        if(!o)return UI.toast('Pedido no encontrado','error');

        const date=document.getElementById('order-date')?.value||Utils.todayInputDate();
        const validity=parseInt(document.getElementById('order-validity')?.value||'30')||30;
        let expiration=document.getElementById('order-expiration-date')?.value||'';
        if(!expiration)expiration=this.addDaysToInputDate(date,validity);
        const observations=document.getElementById('order-notes')?.value||'';
        const user=this.getCurrentUser();

        DB.update('orders',id,{
            ...o,
            date:date,
            validity:validity,
            expiration_date:expiration,
            delivery_date:document.getElementById('order-delivery-date')?.value||'',
            delivery_time:document.getElementById('order-delivery-time')?.value||'',
            priority:document.getElementById('order-priority')?.value||'Normal',
            warehouse_id:document.getElementById('order-warehouse-select')?.value||'',
            carrier:document.getElementById('order-carrier')?.value||'',
            notes:observations,
            observations:observations,
            modified_at:new Date().toISOString(),
            modified_by:user.id,
            modified_by_name:user.name
        });

        UI.closeModal('modal-to-order');
        UI.toast('Pedido actualizado correctamente','success');
        this.render();
    };
})();
