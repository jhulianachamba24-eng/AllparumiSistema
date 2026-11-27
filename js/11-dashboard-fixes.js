
/* Ajustes solicitados: ventas por pedido, fechas locales y RUC de empresa. */
(function(){
    'use strict';

    const COMPANY_RUC='1104985682001';
    window.INTEGRA_COMPANY_RUC=COMPANY_RUC;

    /*
     * Completar fechas vacías en registros nuevos usando el día local
     * de guardado. Se conservan las fechas que el usuario haya elegido.
     */
    const DATE_TABLES=new Set([
        'quotes',
        'orders',
        'invoices',
        'reservations',
        'sales_notes',
        'credit_notes',
        'logistics',
        'purchases',
        'tracking',
        'kardex'
    ]);
    const originalInsert=DB.insert.bind(DB);
    DB.insert=function(table,item){
        if(item&&typeof item==='object'&&DATE_TABLES.has(table)){
            if(!String(item.date||'').trim()){
                item.date=Utils.todayInputDate();
            }
            if(!String(item.created_at||'').trim()){
                item.created_at=new Date().toISOString();
            }
        }
        return originalInsert(table,item);
    };

    /*
     * Actualizar solo la empresa activa (o comp1 al entrar como
     * administrador del sistema). No sustituir el RUC de otras empresas.
     */
    function ensureCompanyRuc(){
        const active=Auth.currentCompany
            ?DB.getOne('companies',Auth.currentCompany.id)
            :null;
        const company=active||DB.getOne('companies','comp1');
        if(!company)return;

        const oldSampleRucs=new Set([
            '1790000000001',
            '11040551818001'
        ]);
        const shouldUpdate=
            company.id==='comp1'||
            !String(company.ruc||'').trim()||
            oldSampleRucs.has(String(company.ruc).trim());
        if(!shouldUpdate)return;

        DB.update('companies',company.id,{ruc:COMPANY_RUC});
        const updated=DB.getOne('companies',company.id)||{
            ...company,
            ruc:COMPANY_RUC
        };
        if(Auth.currentCompany?.id===company.id){
            Auth.currentCompany={
                ...Auth.currentCompany,
                ...updated,
                ruc:COMPANY_RUC
            };
        }
        [localStorage,sessionStorage].forEach(storage=>{
            try{
                const raw=storage.getItem('integra_session_active');
                if(!raw)return;
                const session=JSON.parse(raw);
                if(session?.company?.id===company.id){
                    session.company={
                        ...session.company,
                        ruc:COMPANY_RUC
                    };
                    storage.setItem(
                        'integra_session_active',
                        JSON.stringify(session)
                    );
                }
            }catch(_){}
        });
    }

    const originalStart=App.start.bind(App);
    App.start=function(...args){
        ensureCompanyRuc();
        return originalStart(...args);
    };

    function validOrders(companyId){
        return DB.getAll('orders',companyId).filter(order=>{
            const status=String(order.status||'')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g,'')
                .toLowerCase();
            return !order.cancelled&&
                !order.deleted&&
                !/(anulad|cancel|void|eliminad)/.test(status);
        });
    }

    function number(value){
        if(Modules.Orders&&
            typeof Modules.Orders.moneyToNumber==='function'){
            return Modules.Orders.moneyToNumber(value);
        }
        const parsed=parseFloat(String(value??'').replace(/[^\d,.-]/g,'').replace(',','.'));
        return Number.isFinite(parsed)?parsed:0;
    }

    function orderItems(order){
        const raw=order?.items;
        if(Array.isArray(raw))return raw;
        if(raw&&typeof raw==='object'){
            if(Array.isArray(raw.items))return raw.items;
            return [];
        }
        if(typeof raw==='string'){
            try{
                const parsed=JSON.parse(raw);
                return Array.isArray(parsed)
                    ?parsed
                    :(Array.isArray(parsed?.items)?parsed.items:[]);
            }catch(_){
                return [];
            }
        }
        return [];
    }

    function orderDateParts(order){
        const value=Utils.dateInputValue(order.date||order.created_at);
        const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if(!match)return null;
        return {
            year:Number(match[1]),
            month:Number(match[2])-1
        };
    }

    App.updateCharts=function(){
        const companyId=Auth.currentCompany?.id;
        if(!companyId||typeof Chart==='undefined')return;

        const orders=validOrders(companyId);
        const currentYear=new Date().getFullYear();
        const monthlySales=new Array(12).fill(0);
        const products=DB.getAll('products',companyId);
        const soldByProduct=new Map();

        orders.forEach(order=>{
            const parts=orderDateParts(order);
            if(parts&&parts.year===currentYear&&
                parts.month>=0&&parts.month<12){
                monthlySales[parts.month]+=
                    number(order.total||order.grand_total||order.amount);
            }

            orderItems(order).forEach(item=>{
                const productId=
                    item.prodId||
                    item.product_id||
                    item.productId||
                    item.idProducto||
                    item.id_product||
                    item.product?.id||
                    '';
                const product=productId
                    ?products.find(p=>String(p.id)===String(productId))
                    :null;
                const name=String(
                    item.name||
                    item.product_name||
                    item.productName||
                    item.nombre||
                    item.descripcion||
                    product?.name||
                    product?.product_name||
                    'Producto'
                ).trim();
                const quantity=Number(String(
                    item.qty??item.quantity??item.cantidad??item.units??0
                ).replace(',','.'));
                if(!name||!Number.isFinite(quantity)||quantity<=0)return;
                const key=String(productId||name.toLocaleLowerCase('es-EC'));
                const current=soldByProduct.get(key)||{name,quantity:0};
                current.quantity+=quantity;
                if(product?.name)current.name=product.name;
                soldByProduct.set(key,current);
            });
        });

        const salesCanvas=document.getElementById('salesChart');
        if(salesCanvas){
            if(this.salesChart)this.salesChart.destroy();
            this.salesChart=new Chart(salesCanvas,{
                type:'line',
                data:{
                    labels:[
                        'Ene','Feb','Mar','Abr','May','Jun',
                        'Jul','Ago','Sep','Oct','Nov','Dic'
                    ],
                    datasets:[{
                        label:'Pedidos',
                        data:monthlySales,
                        borderColor:'#3b82f6',
                        backgroundColor:'rgba(59,130,246,.12)',
                        fill:true,
                        tension:.25
                    }]
                },
                options:{
                    responsive:true,
                    maintainAspectRatio:false
                }
            });
        }

        const top=Array.from(soldByProduct.values())
            .sort((a,b)=>b.quantity-a.quantity)
            .slice(0,5);
        const productsCanvas=document.getElementById('topProductsChart');
        if(productsCanvas){
            if(this.topChart)this.topChart.destroy();
            this.topChart=new Chart(productsCanvas,{
                type:'bar',
                data:{
                    labels:top.map(item=>item.name),
                    datasets:[{
                        label:'Unidades vendidas',
                        data:top.map(item=>item.quantity),
                        backgroundColor:'#d4a373'
                    }]
                },
                options:{
                    responsive:true,
                    maintainAspectRatio:false
                }
            });
        }
    };

    const originalRefreshDashboard=App.refreshDashboard.bind(App);
    App.refreshDashboard=function(...args){
        const result=originalRefreshDashboard(...args);
        const companyId=Auth.currentCompany?.id;
        if(companyId){
            const total=validOrders(companyId).reduce(
                (sum,order)=>sum+
                    number(order.total||order.grand_total||order.amount),
                0
            );
            const sales=document.getElementById('kpi-sales');
            if(sales)sales.textContent=Utils.formatMoney(total);
        }
        return result;
    };
})();
