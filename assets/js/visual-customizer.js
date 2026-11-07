/* Personalização visual da Restart Corporal.
   Mantém o app principal intacto e acrescenta a tela de identidade visual. */
(() => {
  "use strict";
  const cfg = window.RESTART_CONFIG;
  if (!cfg || !window.supabase) return;

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const DEFAULTS = {
    color_navy:"#17436c", color_navy_dark:"#103451",
    color_green:"#43a52d", color_green_dark:"#318323",
    color_bg:"#f6f8fa", color_ink:"#25313b", color_card:"#ffffff"
  };
  const KEYS = [
    "store_name","whatsapp","logo_url","banner_image_url","banner_eyebrow",
    "banner_title","banner_text","promo_image_url","topline_text","footer_caption",
    ...Object.keys(DEFAULTS)
  ];
  let publicSettings = {};
  let applyQueued = false;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const val = (obj,k,d="") => obj[k] == null ? d : obj[k];

  async function readSettings() {
    const {data,error} = await client.from("store_settings").select("key,value").in("key", KEYS);
    if (error) throw error;
    return Object.fromEntries((data || []).map(x => [x.key, x.value]));
  }

  function applyColors(s) {
    const root = document.documentElement;
    const map = {
      color_navy:"--navy", color_navy_dark:"--navy-dark",
      color_green:"--green", color_green_dark:"--green-dark",
      color_bg:"--bg", color_ink:"--ink", color_card:"--card"
    };
    Object.entries(map).forEach(([k,v]) => root.style.setProperty(v, s[k] || DEFAULTS[k]));
  }

  function applyStorefront(s) {
    if (!s || location.hash.startsWith("#/admin")) return;
    applyColors(s);
    if (s.store_name) document.title = `${s.store_name} | Dr. Eduardo Monteiro`;
    if (s.topline_text) {
      const top = document.querySelector(".topline");
      if (top) top.textContent = s.topline_text;
    }
    if (s.logo_url) {
      document.querySelectorAll(".brand-mark").forEach(el => {
        el.innerHTML = `<img src="${esc(s.logo_url)}" alt="${esc(s.store_name || "Logo")}" style="width:100%;height:100%;object-fit:contain">`;
        el.style.background = "transparent";
      });
    }
    const hero = document.querySelector(".hero-photo");
    if (hero && s.banner_image_url) {
      hero.innerHTML = `<img src="${esc(s.banner_image_url)}" alt="Imagem principal da loja" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    }
    const copy = document.querySelector(".hero-copy");
    if (copy) {
      const eyebrow = copy.querySelector(".eyebrow");
      const title = copy.querySelector("h1");
      const paragraph = copy.querySelector("p");
      if (eyebrow && s.banner_eyebrow) eyebrow.textContent = s.banner_eyebrow;
      if (title && s.banner_title) title.textContent = s.banner_title;
      if (paragraph && s.banner_text) paragraph.textContent = s.banner_text;
    }
    const promo = document.querySelector(".wide-promo");
    if (promo && s.promo_image_url) {
      promo.style.backgroundImage = `linear-gradient(90deg, rgba(16,52,81,.88), rgba(16,52,81,.55)), url("${String(s.promo_image_url).replace(/["\\]/g,"")}")`;
      promo.style.backgroundSize = "cover";
      promo.style.backgroundPosition = "center";
    }
    const footerCaption = document.querySelector(".footer-brand small");
    if (footerCaption && s.footer_caption) footerCaption.textContent = s.footer_caption;
  }

  async function refreshPublic() {
    try {
      publicSettings = await readSettings();
      applyStorefront(publicSettings);
    } catch (e) {
      console.warn("Personalização visual indisponível:", e.message);
    }
  }
  function queueRefresh() {
    if (applyQueued) return;
    applyQueued = true;
    setTimeout(() => { applyQueued = false; if (!location.hash.startsWith("#/admin")) refreshPublic(); }, 250);
  }
  const app = document.getElementById("app");
  if (app) new MutationObserver(queueRefresh).observe(app, {childList:true,subtree:true});
  window.addEventListener("hashchange", () => {
    if (!location.hash.startsWith("#/admin")) refreshPublic();
  });
  refreshPublic();

  function field(label,key,value="",type="text",hint="") {
    return `<label class="vc-field">${label}<input name="${key}" type="${type}" value="${esc(value)}">${hint ? `<small>${hint}</small>` : ""}</label>`;
  }
  function imageField(label,key,value="") {
    return `<div class="vc-field"><label>${label}</label><input name="${key}" type="url" value="${esc(value)}" placeholder="URL da imagem (preenchida ao enviar arquivo)"><input type="file" accept="image/*" data-upload="${key}"><small>Envie uma imagem JPG, PNG ou WebP. O arquivo será salvo no Supabase.</small><img data-preview="${key}" src="${esc(value)}" ${value ? "" : "hidden"} alt="Prévia" class="vc-preview"></div>`;
  }

  async function openVisualAdmin() {
    const main = document.querySelector(".admin-main");
    if (!main) return;
    const {data:{session}} = await client.auth.getSession();
    if (!session) {
      main.innerHTML = `<div class="admin-login"><h1>Entre no painel primeiro</h1><p>Faça login na aba Produtos e depois abra Configurações.</p></div>`;
      return;
    }
    let s = {};
    try { s = await readSettings(); } catch(e) { main.innerHTML = `<h2>Não foi possível carregar as configurações</h2><p>${esc(e.message)}</p>`; return; }
    const colors = Object.keys(DEFAULTS).map(k => `<label class="vc-color">${({
      color_navy:"Azul principal",color_navy_dark:"Azul escuro",color_green:"Verde de destaque",
      color_green_dark:"Verde escuro",color_bg:"Fundo da página",color_ink:"Texto",color_card:"Fundo dos cartões"
    })[k]}<input type="color" name="${k}" value="${esc(s[k] || DEFAULTS[k])}"></label>`).join("");
    main.innerHTML = `
      <div class="admin-title"><div><span class="eyebrow">IDENTIDADE DA LOJA</span><h1>Personalização</h1><p>Altere textos, imagens e cores da sua vitrine.</p></div></div>
      <form id="visual-form" class="vc-form">
        <section class="vc-section"><h2>Marca e contato</h2><div class="vc-grid">
          ${field("Nome da loja","store_name",val(s,"store_name","Restart Corporal"))}
          <label class="vc-field">Moeda da loja<select name="currency_code">
            ${[
              ["USD","Dólar americano (USD)","en-US"],
              ["PYG","Guarani paraguaio (PYG)","es-PY"],
              ["BRL","Real brasileiro (BRL)","pt-BR"],
              ["ARS","Peso argentino (ARS)","es-AR"],
              ["EUR","Euro (EUR)","es-ES"],
              ["UYU","Peso uruguaio (UYU)","es-UY"],
              ["CLP","Peso chileno (CLP)","es-CL"],
              ["BOB","Boliviano (BOB)","es-BO"]
            ].map(([code,label]) => `<option value="${code}" ${val(s,"currency_code",cfg.CURRENCY || "USD")===code?"selected":""}>${label}</option>`).join("")}
          </select><small>A moeda será usada na exibição dos preços. Os valores cadastrados nos produtos não serão convertidos.</small></label>
          ${field("WhatsApp (com código do país)","whatsapp",val(s,"whatsapp",cfg.WHATSAPP_DEFAULT || ""),"tel","Exemplo: 595981234567. Deixe vazio para não alterar o contato atual.")}
          ${field("Texto da faixa superior","topline_text",val(s,"topline_text","RESTART CORPORAL • Saúde, bem-estar e cuidado individualizado"))}
          ${field("Texto abaixo da marca no rodapé","footer_caption",val(s,"footer_caption","Dr. Eduardo Monteiro"))}
        </div>${imageField("Logo da loja","logo_url",val(s,"logo_url"))}</section>
        <section class="vc-section"><h2>Banner principal</h2><div class="vc-grid">
          ${field("Chamada pequena","banner_eyebrow",val(s,"banner_eyebrow","CUIDADO E BEM-ESTAR"))}
          ${field("Título principal","banner_title",val(s,"banner_title","Um novo começo para sua saúde."))}
          <label class="vc-field vc-wide">Descrição do banner<textarea name="banner_text" rows="3">${esc(val(s,"banner_text","Conheça a Restart Corporal: informação, atendimento individualizado e produtos selecionados com responsabilidade."))}</textarea></label>
        </div>${imageField("Imagem do banner","banner_image_url",val(s,"banner_image_url"))}</section>
        <section class="vc-section"><h2>Faixa promocional</h2>${imageField("Imagem de fundo promocional","promo_image_url",val(s,"promo_image_url"))}</section>
        <section class="vc-section"><h2>Cores e aparência</h2><div class="vc-colors">${colors}</div>
          <div class="vc-preview"><b>Prévia das cores</b><span>Restart Corporal</span><button type="button" class="vc-preview-button">Botão de exemplo</button><p>Os tons são aplicados à loja assim que você salva.</p></div>
          <button type="button" id="vc-reset" class="button button-light">Restaurar cores originais</button>
        </section>
        <div class="vc-actions"><button class="button button-green" type="submit">Salvar personalização</button><span id="vc-status" role="status"></span></div>
      </form>`;
    const form = document.getElementById("visual-form");
    const previewColors = () => {
      const data = Object.fromEntries(new FormData(form).entries());
      applyColors(data);
      const p = form.querySelector(".vc-preview");
      p.style.background = data.color_bg || DEFAULTS.color_bg;
      p.style.color = data.color_ink || DEFAULTS.color_ink;
      p.querySelector("span").style.color = data.color_navy || DEFAULTS.color_navy;
      p.querySelector("button").style.background = data.color_green || DEFAULTS.color_green;
    };
    form.querySelectorAll('input[type="color"]').forEach(el => el.addEventListener("input", previewColors));
    document.getElementById("vc-reset").addEventListener("click", () => {
      Object.entries(DEFAULTS).forEach(([k,v]) => { form.elements[k].value = v; });
      previewColors();
    });
    form.querySelectorAll("[data-upload]").forEach(input => input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const key = input.dataset.upload;
      const status = document.getElementById("vc-status");
      status.textContent = "Enviando imagem…";
      try {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g,"") || "jpg";
        const path = `store/${key}-${Date.now()}.${ext}`;
        const {error} = await client.storage.from("product-images").upload(path,file,{upsert:true,contentType:file.type || "image/jpeg"});
        if (error) throw error;
        const {data} = client.storage.from("product-images").getPublicUrl(path);
        form.elements[key].value = data.publicUrl;
        const img = form.querySelector(`[data-preview="${key}"]`);
        img.src = data.publicUrl; img.hidden = false;
        status.textContent = "Imagem enviada. Salve a personalização para publicar.";
      } catch(e) { status.textContent = "Erro ao enviar: " + e.message; }
    }));
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const status = document.getElementById("vc-status");
      status.textContent = "Salvando…";
      const fd = new FormData(form);
      const rows = KEYS.map(key => ({key,value: String(fd.get(key) ?? "")}));
      const localeByCurrency = {USD:"en-US",PYG:"es-PY",BRL:"pt-BR",ARS:"es-AR",EUR:"es-ES",UYU:"es-UY",CLP:"es-CL",BOB:"es-BO"};
      const selectedCurrency = String(fd.get("currency_code") || cfg.CURRENCY || "USD");
      const localeRow = rows.find(r => r.key === "currency_locale");
      if (localeRow) localeRow.value = localeByCurrency[selectedCurrency] || "en-US";
      try {
        localStorage.setItem("restart_store_currency", selectedCurrency);
        localStorage.setItem("restart_store_locale", localeByCurrency[selectedCurrency] || "en-US");
      } catch (_) {}
      const {error} = await client.from("store_settings").upsert(rows,{onConflict:"key"});
      if (error) { status.textContent = "Erro ao salvar: " + error.message; return; }
      status.textContent = "Personalização salva com sucesso. Atualize a loja para visualizar a moeda nos preços.";
      publicSettings = Object.fromEntries(rows.map(r => [r.key,r.value]));
      applyStorefront(publicSettings);
    });
  }

  // Intercepta somente a aba Configurações do painel existente.
  document.addEventListener("click", e => {
    const button = e.target.closest('[data-tab="settings"]');
    if (!button || !location.hash.startsWith("#/admin")) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    document.querySelectorAll(".admin-tab").forEach(b => b.classList.toggle("active", b === button));
    openVisualAdmin();
  }, true);

  // Mantém as cores padrão também nos cartões de produto.
  const style = document.createElement("style");
  style.textContent = `
    :root{--card:#fff}
    .product-card{background:var(--card,#fff)!important}
    .vc-form{display:grid;gap:18px}
    .vc-section{background:#fff;border:1px solid #e7ebef;border-radius:14px;padding:20px;display:grid;gap:15px}
    .vc-section h2{font-size:18px;margin:0;color:#25313b}
    .vc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .vc-field{display:grid;gap:7px;font-size:13px;font-weight:600;color:#344454}
    .vc-field input,.vc-field textarea,.vc-field select{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #dce3e9;border-radius:8px;font:inherit;font-weight:400;background:#fff;color:#25313b}
    .vc-field input[type=file]{padding:8px}
    .vc-field small{font-size:11px;font-weight:400;color:#74808a}
    .vc-wide{grid-column:1/-1}
    .vc-preview{border:1px solid #e7ebef;border-radius:12px;padding:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
    .vc-preview span{font-weight:800}.vc-preview p{width:100%;margin:0;font-size:12px}
    .vc-preview-button{border:0;color:#fff;border-radius:8px;padding:10px 14px}
    .vc-colors{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .vc-color{display:grid;gap:7px;font-size:12px;font-weight:600;color:#344454}
    .vc-color input{width:100%;height:42px;border:1px solid #dce3e9;border-radius:8px;padding:3px;background:#fff}
    .vc-preview{background:var(--bg);color:var(--ink)}
    .vc-preview-button{background:var(--green)}
    .vc-preview img,.vc-preview{max-width:100%}
    .vc-preview[hidden]{display:none}
    .vc-field img.vc-preview{width:auto;max-width:180px;max-height:110px;object-fit:contain;border:1px solid #e7ebef;border-radius:8px;padding:4px}
    .vc-actions{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
    #vc-status{font-size:13px;color:#318323}
    @media(max-width:700px){.vc-grid{grid-template-columns:1fr}.vc-colors{grid-template-columns:repeat(2,minmax(0,1fr))}.vc-section{padding:14px}}
  `;
  document.head.appendChild(style);
})();