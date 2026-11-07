(() => {
  "use strict";
  const cfg = window.RESTART_CONFIG || {};
  const hasSupabase = window.supabase && cfg.SUPABASE_URL && !cfg.SUPABASE_URL.startsWith("COLE_AQUI") &&
    cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.startsWith("COLE_AQUI");
  const db = hasSupabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  const app = document.getElementById("app");
  const toast = (msg) => { const el=document.getElementById("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),3200); };
  const money = (value) => {
    const currency = cfg.CURRENCY || "USD";
    try { return new Intl.NumberFormat(cfg.LOCALE || "es-PY",{style:"currency",currency}).format(Number(value||0)); }
    catch { return `${currency} ${Number(value||0).toFixed(2)}`; }
  };
  const safe = (s="") => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const whatsappUrl = (number, message) => {
    const n = String(number || cfg.WHATSAPP_DEFAULT || "").replace(/\D/g,"");
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : "#";
  };
  const setWhatsapps = async () => {
    let number = cfg.WHATSAPP_DEFAULT || "";
    if (db) {
      const {data} = await db.from("store_settings").select("value").eq("key","whatsapp").maybeSingle();
      if (data?.value) number = data.value;
    }
    const url=whatsappUrl(number,"Olá! Gostaria de informações sobre a Restart Corporal.");
    ["header-whatsapp","promo-whatsapp","footer-whatsapp"].forEach(id=>{const el=document.getElementById(id);if(el)el.href=url;});
  };
  const card = p => `<article class="product-card">
    <a class="product-image" href="#/produto/${encodeURIComponent(p.slug)}">${p.image_url ? `<img src="${safe(p.image_url)}" alt="${safe(p.name)}" loading="lazy">` : `<span class="product-placeholder">RESTART</span>`}</a>
    <div class="product-info"><small>${safe(p.category_name || "RESTART CORPORAL")}</small><h3><a href="#/produto/${encodeURIComponent(p.slug)}">${safe(p.name)}</a></h3>
    <p>${safe(p.short_description || "")}</p>
    <div class="product-bottom"><b>${p.show_price ? money(p.price) : "Consulte"}</b><a class="button button-green button-small" href="${safe(whatsappUrl(p.whatsapp_number,`Olá! Gostaria de informações sobre: ${p.name} (código ${p.id}).`))}" target="_blank" rel="noopener">${safe(p.button_label || "Consultar")}</a></div></div>
  </article>`;
  const demoProducts = [
    {id:"demo-1",name:"Produto demonstrativo",slug:"produto-demonstrativo",short_description:"Exemplo de como os produtos serão apresentados na loja.",category_name:"Destaques",price:0,show_price:false,button_label:"Consultar",image_url:""},
    {id:"demo-2",name:"Atendimento personalizado",slug:"atendimento-personalizado",short_description:"Entre em contato para conhecer as opções de atendimento.",category_name:"Serviços",price:0,show_price:false,button_label:"Saiba mais",image_url:""}
  ];
  async function getProducts(search="") {
    if (!db) return demoProducts;
    let q=db.from("products").select("*, categories(name)").eq("is_published",true).order("sort_order").order("created_at",{ascending:false});
    if(search) q=q.ilike("name",`%${search}%`);
    const {data,error}=await q;
    if(error){console.error(error);return [];}
    return (data||[]).map(p=>({...p,category_name:p.categories?.name||""}));
  }
  async function renderHome(search="") {
    const products=await getProducts(search);
    const grid=document.getElementById("featured-products");
    if(!grid)return;
    grid.innerHTML=products.length?products.map(card).join(""):`<div class="empty-state">Nenhum produto publicado no momento.</div>`;
    if(!db) toast("Configure o Supabase em assets/js/config.js para carregar o catálogo real.");
  }
  async function renderCatalog(search="") {
    const products=await getProducts(search);
    app.innerHTML=`<section class="section catalog-page"><div class="section-heading"><div><span class="eyebrow">RESTART CORPORAL</span><h1>Catálogo</h1><p>Consulte a disponibilidade e as informações dos itens publicados.</p></div></div><div class="product-grid">${products.length?products.map(card).join(""):'<div class="empty-state">Nenhum item disponível no momento.</div>'}</div></section>`;
  }
  async function renderProduct(slug) {
    if(!db){app.innerHTML=`<section class="section"><a class="text-link" href="#/">← Voltar</a><h1>Catálogo em configuração</h1><p>Conecte o Supabase para consultar os produtos publicados.</p></section>`;return;}
    const {data:p,error}=await db.from("products").select("*, categories(name)").eq("slug",slug).eq("is_published",true).maybeSingle();
    if(error||!p){app.innerHTML='<section class="section empty-state">Produto não encontrado ou indisponível.</section>';return;}
    app.innerHTML=`<section class="section product-detail"><a class="text-link" href="#/catalogo">← Voltar ao catálogo</a><div class="detail-grid"><div class="detail-image">${p.image_url?`<img src="${safe(p.image_url)}" alt="${safe(p.name)}">`:'<span class="product-placeholder">RESTART</span>'}</div><div><span class="eyebrow">${safe(p.categories?.name||"RESTART CORPORAL")}</span><h1>${safe(p.name)}</h1><p>${safe(p.description||p.short_description||"")}</p><h2>${p.show_price?money(p.price):"Consulte disponibilidade"}</h2><a class="button button-green" href="${safe(whatsappUrl(p.whatsapp_number,`Olá! Gostaria de informações sobre ${p.name} (código ${p.id}).`))}" target="_blank" rel="noopener">${safe(p.button_label||"Consultar pelo WhatsApp")}</a><p class="disclaimer">As informações são gerais. A disponibilidade, a indicação e eventuais exigências legais devem ser confirmadas com a equipe responsável.</p></div></div></section>`;
  }
  function renderStatic(kind){
    const content={
      atendimento:["Atendimento","Entre em contato pelo WhatsApp para dúvidas gerais e informações sobre a Restart Corporal."],
      privacidade:["Privacidade","Este site utiliza apenas os dados necessários para seu funcionamento. Antes de coletar dados pessoais ou sensíveis, publique uma política de privacidade adequada à legislação aplicável e informe a finalidade, a base legal, o prazo de retenção e os canais de contato."],
      termos:["Termos de uso","O conteúdo deste site é informativo e não substitui avaliação profissional. A publicação de produtos depende de regularidade sanitária, autorizações e regras de publicidade aplicáveis no território de comercialização."]
    }[kind];
    app.innerHTML=`<section class="section static-page"><a class="text-link" href="#/">← Início</a><h1>${content[0]}</h1><p>${content[1]}</p></section>`;
  }
  function adminShell(inner){app.innerHTML=`<section class="admin-wrap"><aside class="admin-side"><a class="brand" href="#/"><span class="brand-mark">↻</span><span><b>RESTART</b><small>ADMIN</small></span></a><button data-tab="products" class="admin-tab active">Produtos</button><button data-tab="categories" class="admin-tab">Categorias</button><button data-tab="settings" class="admin-tab">Configurações</button><button id="logout" class="admin-tab">Sair</button><a class="admin-back" href="#/">← Ver loja</a></aside><div class="admin-main">${inner}</div></section>`;}
  async function renderAdmin(){
    if(!db){adminShell(`<div class="admin-login"><h1>Configuração necessária</h1><p>Preencha a URL e a chave pública do Supabase em <code>assets/js/config.js</code> antes de acessar o painel.</p></div>`);return;}
    const {data:{session}}=await db.auth.getSession();
    if(!session){adminShell(`<form id="login-form" class="admin-login"><span class="eyebrow">ÁREA RESTRITA</span><h1>Entrar no administrador</h1><label>E-mail<input name="email" type="email" required autocomplete="username"></label><label>Senha<input name="password" type="password" required autocomplete="current-password"></label><button class="button button-green">Entrar</button><p class="muted">O usuário precisa estar cadastrado no Supabase Auth e autorizado como administrador.</p></form>`);document.getElementById("login-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});if(error)toast(error.message);else renderAdmin();};return;}
    await adminProducts();
  }
  async function adminProducts(){
    const {data:products=[]}=await db.from("products").select("*").order("created_at",{ascending:false});
    adminShell(`<div class="admin-title"><div><span class="eyebrow">PAINEL ADMINISTRATIVO</span><h1>Produtos</h1><p>Gerencie os itens do catálogo.</p></div><button id="new-product" class="button button-green">+ Novo produto</button></div><div class="admin-table"><table><thead><tr><th>Produto</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead><tbody>${products.map(p=>`<tr><td><b>${safe(p.name)}</b><small>${safe(p.slug)}</small></td><td>${p.show_price?money(p.price):"Consultar"}</td><td>${p.is_published?"Publicado":"Rascunho"}</td><td><button class="link-button" data-edit="${p.id}">Editar</button> <button class="link-button danger" data-delete="${p.id}">Excluir</button></td></tr>`).join("")||'<tr><td colspan="4">Nenhum produto cadastrado.</td></tr>'}</tbody></table></div><div id="editor"></div>`);
    document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editProduct(products.find(p=>p.id===b.dataset.edit)));
    document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(confirm("Excluir este produto?")){const {error}=await db.from("products").delete().eq("id",b.dataset.delete);if(error)toast(error.message);else adminProducts();}});
    document.getElementById("new-product").onclick=()=>editProduct(null);
    document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>b.dataset.tab==="settings"?adminSettings():b.dataset.tab==="categories"?adminCategories():adminProducts());
    document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>b.dataset.tab==="settings"?adminSettings():b.dataset.tab==="categories"?adminCategories():adminProducts());
    document.getElementById("logout").onclick=async()=>{await db.auth.signOut();renderAdmin();};
  }
  async function editProduct(p){
    const {data:cats=[]}=await db.from("categories").select("*").order("name");
    const editor=document.getElementById("editor");
    editor.innerHTML=`<form id="product-form" class="editor"><h2>${p?"Editar produto":"Novo produto"}</h2><div class="form-grid">
      <label>Nome<input name="name" required value="${safe(p?.name||"")}"></label><label>Slug (URL)<input name="slug" required value="${safe(p?.slug||"")}"></label>
      <label>Categoria<select name="category_id"><option value="">Sem categoria</option>${cats.map(c=>`<option value="${c.id}" ${p?.category_id===c.id?"selected":""}>${safe(c.name)}</option>`).join("")}</select></label>
      <label>Preço<input name="price" type="number" min="0" step="0.01" value="${p?.price||0}"></label>
      <label class="full">Descrição curta<input name="short_description" value="${safe(p?.short_description||"")}"></label>
      <label class="full">Descrição completa<textarea name="description" rows="4">${safe(p?.description||"")}</textarea></label>
      <label class="full">URL da imagem<input name="image_url" type="url" value="${safe(p?.image_url||"")}" placeholder="https://..."></label>
      <label>WhatsApp específico (opcional)<input name="whatsapp_number" value="${safe(p?.whatsapp_number||"")}"></label>
      <label>Texto do botão<input name="button_label" value="${safe(p?.button_label||"Consultar pelo WhatsApp")}"></label>
      <label class="check"><input name="show_price" type="checkbox" ${p?.show_price?"checked":""}> Exibir preço</label>
      <label class="check"><input name="is_published" type="checkbox" ${p?.is_published?"checked":""}> Publicar na loja</label>
    </div><div class="form-actions"><button class="button button-green">Salvar produto</button><button type="button" id="cancel-edit" class="button button-outline">Cancelar</button></div><p class="form-note">Publique somente itens cuja comercialização e publicidade estejam autorizadas no território aplicável. Não use este painel para contornar exigências de receita ou controle sanitário.</p></form>`;
    document.getElementById("cancel-edit").onclick=()=>editor.innerHTML="";
    document.getElementById("product-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const name=f.get("name");const payload={name,slug:f.get("slug").trim().toLowerCase().replace(/[^a-z0-9-]+/g,"-"),category_id:f.get("category_id")||null,price:Number(f.get("price")||0),short_description:f.get("short_description"),description:f.get("description"),image_url:f.get("image_url")||null,whatsapp_number:f.get("whatsapp_number")||null,button_label:f.get("button_label")||"Consultar",show_price:f.has("show_price"),is_published:f.has("is_published")};
      const result=p?await db.from("products").update(payload).eq("id",p.id):await db.from("products").insert(payload);
      if(result.error)toast(result.error.message);else{toast("Produto salvo.");adminProducts();}
    };
  }
  async function adminCategories(){
    const {data:cats=[]}=await db.from("categories").select("*").order("name");
    adminShell(`<div class="admin-title"><div><span class="eyebrow">ORGANIZAÇÃO DA LOJA</span><h1>Categorias</h1></div></div><form id="category-form" class="editor compact"><label>Nova categoria<input name="name" required placeholder="Ex.: Bem-estar"></label><button class="button button-green">Adicionar</button></form><div class="admin-table"><table><tbody>${cats.map(c=>`<tr><td>${safe(c.name)}</td><td><button class="link-button danger" data-cat-delete="${c.id}">Excluir</button></td></tr>`).join("")||"<tr><td>Nenhuma categoria.</td></tr>"}</tbody></table></div>`);
    document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>b.dataset.tab==="settings"?adminSettings():b.dataset.tab==="products"?adminProducts():adminCategories());
    document.getElementById("logout").onclick=async()=>{await db.auth.signOut();renderAdmin();};
    document.getElementById("category-form").onsubmit=async e=>{e.preventDefault();const name=new FormData(e.currentTarget).get("name");const slug=name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-");const {error}=await db.from("categories").insert({name,slug});if(error)toast(error.message);else adminCategories();};
    document.querySelectorAll("[data-cat-delete]").forEach(b=>b.onclick=async()=>{if(confirm("Excluir categoria?")){const {error}=await db.from("categories").delete().eq("id",b.dataset.catDelete);if(error)toast(error.message);else adminCategories();}});
  }
  async function adminSettings(){
    const {data:rows=[]}=await db.from("store_settings").select("*");
    const vals=Object.fromEntries(rows.map(x=>[x.key,x.value]));
    adminShell(`<div class="admin-title"><div><span class="eyebrow">CONFIGURAÇÕES</span><h1>Loja</h1><p>Dados gerais e contato.</p></div></div><form id="settings-form" class="editor"><label>WhatsApp padrão (com código do país, somente números)<input name="whatsapp" value="${safe(vals.whatsapp||cfg.WHATSAPP_DEFAULT||"")}"></label><label>Nome da loja<input name="store_name" value="${safe(vals.store_name||"Restart Corporal")}"></label><button class="button button-green">Salvar configurações</button></form>`);
    document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>b.dataset.tab==="products"?adminProducts():b.dataset.tab==="categories"?adminCategories():adminSettings());
    document.getElementById("logout").onclick=async()=>{await db.auth.signOut();renderAdmin();};
    document.getElementById("settings-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);for(const key of ["whatsapp","store_name"]){const {error}=await db.from("store_settings").upsert({key,value:f.get(key)},{onConflict:"key"});if(error){toast(error.message);return;}}toast("Configurações salvas.");};
  }
  async function route(){
    const hash=location.hash||"#/";
    if(hash.startsWith("#/admin"))return renderAdmin();
    if(hash.startsWith("#/produto/"))return renderProduct(decodeURIComponent(hash.slice(10)));
    if(hash.startsWith("#/catalogo"))return renderCatalog();
    if(hash.startsWith("#/atendimento"))return renderStatic("atendimento");
    if(hash.startsWith("#/privacidade"))return renderStatic("privacidade");
    if(hash.startsWith("#/termos"))return renderStatic("termos");
    app.innerHTML=`<section class="hero"><div class="hero-copy"><span class="eyebrow">CUIDADO E BEM-ESTAR</span><h1>Um novo começo para sua saúde.</h1><p>Conheça a Restart Corporal: informação, atendimento individualizado e produtos selecionados com responsabilidade.</p><a class="button button-green" href="#produtos">Explorar catálogo</a></div><div class="hero-photo"><div class="photo-placeholder"><span>RESTART<br>CORPORAL</span><small>Adicione sua fotografia profissional em assets/eduardo-monteiro.jpg</small></div></div></section><section class="trust-strip"><div><b>Atendimento individualizado</b><small>Orientação conforme cada necessidade</small></div><div><b>Informação transparente</b><small>Descrição e disponibilidade claras</small></div><div><b>Contato direto</b><small>Atendimento pelo WhatsApp</small></div></section><section id="produtos" class="section"><div class="section-heading"><div><span class="eyebrow">NOSSO CATÁLOGO</span><h2>Produtos em destaque</h2><p>Consulte informações e disponibilidade com nossa equipe.</p></div><a href="#/catalogo" class="text-link">Ver catálogo completo →</a></div><div id="featured-products" class="product-grid"><div class="loading">Carregando catálogo…</div></div></section><section class="wide-promo"><div><span class="eyebrow">RESTART CORPORAL</span><h2>Informação e cuidado em cada etapa.</h2><p>Entre em contato para conhecer os serviços e esclarecer suas dúvidas.</p></div><a id="promo-whatsapp" class="button button-light" href="#" target="_blank" rel="noopener">Falar com a equipe</a></section><section class="section about"><div><span class="eyebrow">SOBRE A RESTART</span><h2>Conheça nossa proposta</h2></div><p>A Restart Corporal reúne conteúdo, atendimento e produtos selecionados. As informações deste site são gerais e não substituem avaliação profissional, diagnóstico ou prescrição individual.</p></section>`;
    await renderHome();
  }
  document.getElementById("search-form").addEventListener("submit",e=>{e.preventDefault();renderCatalog(document.getElementById("search-input").value.trim());location.hash="#/catalogo";});
  window.addEventListener("hashchange",route);
  document.getElementById("year").textContent=new Date().getFullYear();
  setWhatsapps(); route();
})();