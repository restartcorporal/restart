(() => {
"use strict";
const cfg=window.RESTART_CONFIG||{};
if(!window.supabase||!cfg.SUPABASE_URL)return;
const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const $=s=>document.querySelector(s), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>{try{return new Intl.NumberFormat(cfg.LOCALE||"es-PY",{style:"currency",currency:cfg.CURRENCY||"USD"}).format(Number(n||0))}catch{return String(n)}};
let active="overview", mounted=false;
const modules=[["overview","Visão geral","layout-dashboard"],["orders","Pedidos","shopping-bag"],["inventory","Estoque","boxes"],["customers","Clientes","users"],["coupons","Cupons e promoções","ticket-percent"],["reports","Relatórios","chart-no-axes-combined"],["staff","Funcionários","user-cog"],["audit","Histórico e segurança","shield-check"],["shipping","Frete e entrega","truck"]];
async function isLogged(){const {data:{session}}=await db.auth.getSession();return !!session}
function addNav(){
 const side=$(".admin-side");if(!side||side.dataset.v2==="1")return;
 side.dataset.v2="1";
 const anchor=side.querySelector('[data-tab="products"]');
 const group=document.createElement("div");group.className="v2-nav";
 group.innerHTML=modules.map(([id,label])=>`<button class="admin-tab v2-tab" data-v2="${id}">${label}</button>`).join("");
 anchor?.after(group);
}
function shell(title,sub,body){const main=$(".admin-main");if(!main)return;main.innerHTML=`<div class="admin-title"><div><span class="eyebrow">RESTART CORPORAL • ADMIN 2.0</span><h1>${title}</h1><p>${sub||""}</p></div></div>${body}`;}
function table(headers,rows){return `<div class="admin-table"><table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">Nenhum registro encontrado.</td></tr>`}</tbody></table></div>`}
function formField(label,name,type="text",value="",extra=""){return `<label class="v2-field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`}
function status(msg){const el=$("#v2-status");if(el)el.textContent=msg;else alert(msg)}
async function page(id){
 if(!await isLogged()){shell("Acesso necessário","Entre no painel administrativo para continuar.",'<p>Faça login na aba Produtos.</p>');return}
 active=id;document.querySelectorAll(".v2-tab").forEach(b=>b.classList.toggle("active",b.dataset.v2===id));
 try {
  if(id==="overview")return await overview();
  if(id==="orders")return await orders();
  if(id==="inventory")return await inventory();
  if(id==="customers")return await customers();
  if(id==="coupons")return await coupons();
  if(id==="reports")return await reports();
  if(id==="staff")return await staff();
  if(id==="audit")return await audit();
  if(id==="shipping")return await shipping();
 } catch(e){shell("Não foi possível carregar", "Confira se a migração do Supabase foi executada.",`<p class="v2-error">${esc(e.message)}</p><p>Abra o SQL Editor do Supabase e execute <b>supabase/admin-v2.sql</b>.</p>`)}
}
async function overview(){
 const [p,o,c,low]=await Promise.all([
  db.from("products").select("id",{count:"exact",head:true}),
  db.from("orders").select("id,total,status,created_at"),
  db.from("customers").select("id",{count:"exact",head:true}),
  db.from("products").select("id,name,stock_quantity,stock_alert_level").eq("track_inventory",true)
 ]);
 if(o.error)throw o.error;
 const orders=o.data||[], total=orders.filter(x=>!["cancelled","refunded"].includes(x.status)).reduce((a,x)=>a+Number(x.total||0),0);
 shell("Visão geral","Indicadores consultados diretamente no Supabase.",`
 <div class="v2-stats">
  <article><small>Produtos cadastrados</small><b>${p.count??0}</b></article>
  <article><small>Pedidos registrados</small><b>${orders.length}</b></article>
  <article><small>Clientes</small><b>${c.count??0}</b></article>
  <article><small>Vendas não canceladas</small><b>${money(total)}</b></article>
 </div>
 <section class="v2-panel"><h2>Pedidos recentes</h2>${table(["Data","Pedido","Status","Total"],orders.slice(0,8).map(x=>`<tr><td>${new Date(x.created_at).toLocaleDateString()}</td><td>${esc(x.order_number||x.id.slice(0,8))}</td><td>${esc(x.status)}</td><td>${money(x.total)}</td></tr>`).join(""))}</section>
 <section class="v2-panel"><h2>Alertas de estoque</h2>${table(["Produto","Disponível","Mínimo"],(low.data||[]).filter(x=>Number(x.stock_quantity)<=Number(x.stock_alert_level)).map(x=>`<tr><td>${esc(x.name)}</td><td>${x.stock_quantity}</td><td>${x.stock_alert_level}</td></tr>`).join(""))}</section>`);
}
async function orders(){
 const {data,error}=await db.from("orders").select("*,customers(name,phone)").order("created_at",{ascending:false}).limit(200);if(error)throw error;
 shell("Pedidos","Até 200 pedidos mais recentes. Registre pedidos recebidos pelo WhatsApp ou outros canais.",`
 <form id="new-order" class="v2-panel v2-grid"><h2>Novo pedido manual</h2>${formField("Nome do cliente","customer_name")}${formField("Telefone","phone","tel")}${formField("Total","total","number","0",'min="0" step="0.01"') }
 <label class="v2-field">Status<select name="status"><option value="pending">Pendente</option><option value="confirmed">Confirmado</option><option value="paid">Pago</option><option value="processing">Em preparação</option><option value="shipped">Enviado</option><option value="delivered">Entregue</option></select></label><button class="button button-green">Registrar pedido</button><span id="v2-status"></span></form>
 ${table(["Pedido","Cliente","Data","Status","Total","Atualizar"],(data||[]).map(x=>`<tr><td>${esc(x.order_number||x.id.slice(0,8))}</td><td>${esc(x.customers?.name||"—")}</td><td>${new Date(x.created_at).toLocaleDateString()}</td><td>${esc(x.status)}</td><td>${money(x.total)}</td><td><select data-order-status="${x.id}">${["pending","confirmed","paid","processing","shipped","delivered","cancelled","refunded"].map(s=>`<option ${x.status===s?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join(""))}`);
 $("#new-order").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);let customer=null;const phone=String(f.get("phone")||"").trim();if(phone){const q=await db.from("customers").upsert({name:f.get("customer_name"),phone},{onConflict:"phone"}).select("id").single();if(q.error)return status(q.error.message);customer=q.data.id}
 const r=await db.from("orders").insert({customer_id:customer,total:Number(f.get("total")),status:f.get("status"),source:"manual"});if(r.error)status(r.error.message);else page("orders")};
 document.querySelectorAll("[data-order-status]").forEach(el=>el.onchange=async()=>{const r=await db.from("orders").update({status:el.value}).eq("id",el.dataset.orderStatus);if(r.error)alert(r.error.message);else page("orders")});
}
async function inventory(){
 const {data,error}=await db.from("products").select("id,name,price,track_inventory,stock_quantity,stock_alert_level").order("name");if(error)throw error;
 shell("Estoque","Ative o controle por produto e registre entradas ou saídas.",table(["Produto","Controlar","Quantidade","Alerta mínimo","Ação"],data.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.track_inventory?"Sim":"Não"}</td><td>${p.stock_quantity}</td><td>${p.stock_alert_level}</td><td><button class="link-button" data-stock="${p.id}" data-name="${esc(p.name)}">Ajustar</button></td></tr>`).join("")));
 document.querySelectorAll("[data-stock]").forEach(b=>b.onclick=async()=>{const qty=prompt("Nova quantidade para "+b.dataset.name);if(qty===null)return;const n=Number(qty);if(!Number.isInteger(n)||n<0)return alert("Informe um número inteiro não negativo.");const reason=prompt("Motivo do ajuste (ex.: entrada, venda, inventário)")||"Ajuste manual";const r=await db.from("products").update({track_inventory:true,stock_quantity:n}).eq("id",b.dataset.stock);if(r.error)return alert(r.error.message);await db.from("inventory_movements").insert({product_id:b.dataset.stock,quantity_delta:0,quantity_after:n,reason});page("inventory")});
}
async function customers(){
 const {data,error}=await db.from("customers").select("*,orders(id,total,status,created_at)").order("created_at",{ascending:false}).limit(300);if(error)throw error;
 shell("Clientes","Cadastro e histórico de pedidos. Armazene apenas dados necessários ao atendimento.",table(["Cliente","Telefone","E-mail","Pedidos","Total comprado"],data.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.phone||"—")}</td><td>${esc(c.email||"—")}</td><td>${c.orders?.length||0}</td><td>${money((c.orders||[]).filter(o=>!["cancelled","refunded"].includes(o.status)).reduce((a,o)=>a+Number(o.total||0),0))}</td></tr>`).join("")));
}
async function coupons(){
 const {data,error}=await db.from("coupons").select("*").order("created_at",{ascending:false});if(error)throw error;
 shell("Cupons e promoções","Crie códigos de desconto. A aplicação automática no checkout depende de integração futura.",`
 <form id="coupon-form" class="v2-panel v2-grid"><h2>Novo cupom</h2>${formField("Código","code","text","","required")}${formField("Tipo de desconto","discount_type","text","percent",'placeholder="percent ou fixed"')}${formField("Valor do desconto","discount_value","number","10",'min="0" step="0.01"')}${formField("Validade até (opcional)","expires_at","date")}<button class="button button-green">Criar cupom</button><span id="v2-status"></span></form>
 ${table(["Código","Tipo","Valor","Validade","Ativo"],data.map(c=>`<tr><td>${esc(c.code)}</td><td>${esc(c.discount_type)}</td><td>${c.discount_value}</td><td>${c.expires_at||"Sem validade"}</td><td>${c.is_active?"Sim":"Não"}</td></tr>`).join(""))}`);
 $("#coupon-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const r=await db.from("coupons").insert({code:String(f.get("code")).trim().toUpperCase(),discount_type:f.get("discount_type")==="fixed"?"fixed":"percent",discount_value:Number(f.get("discount_value")),expires_at:f.get("expires_at")||null});if(r.error)status(r.error.message);else page("coupons")};
}
async function reports(){
 const {data,error}=await db.from("orders").select("order_number,total,status,source,created_at").order("created_at",{ascending:false});if(error)throw error;
 const rows=data||[], sum=rows.filter(x=>!["cancelled","refunded"].includes(x.status)).reduce((a,x)=>a+Number(x.total||0),0);
 shell("Relatórios","Resumo baseado nos pedidos registrados.",`<div class="v2-stats"><article><small>Pedidos</small><b>${rows.length}</b></article><article><small>Total não cancelado</small><b>${money(sum)}</b></article><article><small>Concluídos</small><b>${rows.filter(x=>x.status==="delivered").length}</b></article></div><section class="v2-panel"><button id="csv-export" class="button button-green">Exportar pedidos CSV (Excel)</button><p>O CSV usa UTF-8 com BOM e pode ser aberto no Excel.</p></section>${table(["Pedido","Data","Status","Origem","Total"],rows.slice(0,100).map(x=>`<tr><td>${esc(x.order_number||"—")}</td><td>${new Date(x.created_at).toLocaleDateString()}</td><td>${esc(x.status)}</td><td>${esc(x.source||"—")}</td><td>${money(x.total)}</td></tr>`).join(""))}`);
 $("#csv-export").onclick=()=>{const cols=["order_number","created_at","status","source","total"];const csv=[cols.join(";"),...rows.map(r=>cols.map(k=>`"${String(r[k]??"").replace(/"/g,'""')}"`).join(";"))].join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="restart-relatorio-pedidos.csv";a.click();URL.revokeObjectURL(a.href)};
}
async function staff(){
 const {data,error}=await db.from("staff_members").select("*").order("created_at",{ascending:false});if(error)throw error;
 shell("Funcionários e permissões","Cadastre o vínculo de usuários já criados em Supabase Authentication. Este painel não cria senha.",`
 <form id="staff-form" class="v2-panel v2-grid"><h2>Autorizar funcionário existente</h2>${formField("UUID do usuário Auth","user_id","text","","required") }<label class="v2-field">Função<select name="role"><option value="manager">Gerente</option><option value="orders">Pedidos</option><option value="inventory">Estoque</option><option value="viewer">Somente leitura</option></select></label>${formField("Nome de exibição","display_name")}<button class="button button-green">Autorizar acesso</button><span id="v2-status"></span></form>
 ${table(["Funcionário","UUID","Função","Ativo"],data.map(x=>`<tr><td>${esc(x.display_name||"—")}</td><td>${esc(x.user_id)}</td><td>${esc(x.role)}</td><td>${x.is_active?"Sim":"Não"}</td></tr>`).join(""))}`);
 $("#staff-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const r=await db.from("staff_members").upsert({user_id:f.get("user_id"),role:f.get("role"),display_name:f.get("display_name"),is_active:true},{onConflict:"user_id"});if(r.error)status(r.error.message);else page("staff")};
}
async function audit(){
 const {data,error}=await db.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(300);if(error)throw error;
 shell("Histórico e segurança","Registro de alterações em produtos e pedidos. O log é somente leitura pelo painel.",table(["Data","Usuário","Ação","Tabela","Registro"],data.map(x=>`<tr><td>${new Date(x.created_at).toLocaleString()}</td><td>${esc(x.actor_id||"—")}</td><td>${esc(x.action)}</td><td>${esc(x.table_name)}</td><td>${esc(x.record_id||"—")}</td></tr>`).join("")));
}
async function shipping(){
 const {data,error}=await db.from("shipments").select("*,orders(order_number)").order("created_at",{ascending:false});if(error)throw error;
 shell("Frete e entrega","Registre transportadora, rastreio, custo e situação das entregas.",`
 <form id="ship-form" class="v2-panel v2-grid"><h2>Nova entrega</h2>${formField("ID do pedido","order_id")}${formField("Transportadora","carrier")}${formField("Código de rastreio","tracking_code")}${formField("Custo do frete","shipping_cost","number","0",'min="0" step="0.01"')}<label class="v2-field">Status<select name="status"><option>preparing</option><option>shipped</option><option>delivered</option><option>exception</option></select></label><button class="button button-green">Registrar entrega</button><span id="v2-status"></span></form>
 ${table(["Pedido","Transportadora","Rastreio","Frete","Status"],data.map(x=>`<tr><td>${esc(x.orders?.order_number||x.order_id)}</td><td>${esc(x.carrier||"—")}</td><td>${esc(x.tracking_code||"—")}</td><td>${money(x.shipping_cost)}</td><td>${esc(x.status)}</td></tr>`).join(""))}`);
 $("#ship-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const r=await db.from("shipments").insert({order_id:f.get("order_id"),carrier:f.get("carrier"),tracking_code:f.get("tracking_code"),shipping_cost:Number(f.get("shipping_cost")||0),status:f.get("status")});if(r.error)status(r.error.message);else page("shipping")};
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-v2]");if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();page(b.dataset.v2)},true);
const obs=new MutationObserver(()=>{if(location.hash.startsWith("#/admin")&&$(".admin-side"))addNav()});
obs.observe(document.body,{childList:true,subtree:true});
window.addEventListener("hashchange",()=>{if(location.hash.startsWith("#/admin"))setTimeout(addNav,100)});
const css=document.createElement("style");css.textContent=`
.v2-nav{border-top:1px solid #e7ebef;margin-top:8px;padding-top:8px;display:grid;gap:3px}.v2-tab{font-size:11px}.v2-tab.active{background:#edf5ea;color:#318323}
.v2-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:18px 0}.v2-stats article,.v2-panel{background:#fff;border:1px solid #e7ebef;border-radius:9px;padding:18px;margin:14px 0}.v2-stats small,.v2-stats b{display:block}.v2-stats small{font-size:11px;color:#6c7781}.v2-stats b{font-size:25px;color:#17436c;margin-top:8px}.v2-panel h2{font-size:17px;color:#17436c;margin:0 0 14px}.v2-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.v2-grid h2,.v2-grid button,.v2-grid span{grid-column:1/-1}.v2-field{display:grid;gap:6px;font-size:12px;font-weight:600;color:#17436c}.v2-field input,.v2-field select{padding:10px;border:1px solid #dce3e8;border-radius:6px;min-width:0}.v2-error{color:#b23b3b}.v2-panel p{font-size:12px;color:#6c7781}
@media(max-width:850px){.v2-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.v2-grid{grid-template-columns:1fr}.v2-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.v2-nav{grid-template-columns:repeat(2,minmax(0,1fr));width:100%}}
`;document.head.appendChild(css);

// CORREÇÃO DO BOTÃO PRODUTOS
document.addEventListener("click", function(e) {
  const btn = e.target.closest('.admin-side [data-tab="products"]');

  if (!btn || !location.hash.startsWith("#/admin")) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  location.hash = "#/admin?tab=products&refresh=" + Date.now();
}, true);

})();
