"use strict";
const $ = id => document.getElementById(id);
const state = { people: [], campaign: null };
let toastTimer;

function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

const IG_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>';
const slug = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const safeUrl = u => { try { const x = new URL(u); return x.protocol === "https:" ? x.href : null; } catch { return null; } };
const messageFor = p => ($("customMessage").value.trim() || state.campaign.mensagem).replaceAll("{nome}", p.nome);

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Mensagem copiada. Cole no canal do vereador.");
  } catch {
    const a = document.createElement("textarea");
    a.value = text; document.body.appendChild(a); a.select();
    const ok = document.execCommand("copy"); a.remove();
    showToast(ok ? "Mensagem copiada." : "Não foi possível copiar. Selecione o texto e copie manualmente.");
  }
}

function renderCampaign(c) {
  const s = $("campanha");
  s.replaceChildren();
  const head = el("div", "section-heading");
  const hd = el("div"); hd.append(el("h2", "", "Campanha em destaque"), el("p", "", "Uma pauta pública para acompanhar com responsabilidade."));
  head.append(hd);
  const art = el("article", "campaign");
  const top = el("div", "campaign-top"); const box = el("div");
  const actions = el("div", "campaign-actions");
  const b1 = el("a", "btn", "Cobrar um vereador"); b1.href = "#vereadores";
  const b2 = el("a", "btn secondary", "Consultar Câmara Municipal"); b2.href = "https://cms.ba.gov.br"; b2.target = "_blank"; b2.rel = "noopener noreferrer";
  actions.append(b1, b2);
  box.append(el("span", "status", c.status), el("h3", "", c.titulo), el("p", "", c.resumo), actions);
  top.append(box);
  const body = el("div", "campaign-body");

  body.append(el("h4", "", "Requerimento de CEI"));
  const r = c.requerimento || {};
  const link = r.documento_url && safeUrl(r.documento_url);
  if (link) {
    const a = el("a", "btn secondary", "Abrir documento oficial" + (r.numero ? " nº " + r.numero : ""));
    a.href = link; a.target = "_blank"; a.rel = "noopener noreferrer"; body.append(a);
  } else {
    body.append(el("p", "docs-empty", "Documento ainda não disponível neste site. Será publicado após confirmação por fonte oficial."));
  }

  if (r.situacao) body.append(el("p", "docs-empty", "Situação: " + r.situacao));
  body.append(el("h4", "", "Linha do tempo (com fontes)"));
  const ul = el("ul", "timeline");
  (c.linhaDoTempo || []).forEach(i => {
    const li = el("li"); li.append(el("time", "", i.data), document.createTextNode(i.texto + " "));
    const u = safeUrl(i.url);
    if (u) { const a = el("a", "", "Fonte: " + i.fonte); a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; li.append(a); }
    ul.append(li);
  });
  body.append(ul);

  if ((c.documentos || []).length) {
    body.append(el("h4", "", "Documentos oficiais"));
    const dl = el("ul", "timeline");
    c.documentos.forEach(d => {
      const u = safeUrl(d.url); if (!u) return;
      const li = el("li"); li.append(el("time", "", d.data || ""));
      const a = el("a", "", d.titulo); a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; li.append(a); dl.append(li);
    });
    body.append(dl);
  }
  const notice = el("div", "notice"); const st = el("strong", "", "Transparência: "); notice.append(st, document.createTextNode(c.aviso));
  art.append(top, body, notice);
  s.append(head, art);
}

function renderCouncilors() {
  const q = $("searchName").value.trim().toLocaleLowerCase("pt-BR");
  const party = $("partyFilter").value;
  const list = state.people
    .filter(p => (!party || p.partido === party) && (p.nome + " " + p.partido).toLocaleLowerCase("pt-BR").includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if ($("sortOrder").value === "za") list.reverse();
  const grid = $("councilGrid");
  grid.replaceChildren();
  $("resultsLine").textContent = `${list.length} ${list.length === 1 ? "perfil encontrado" : "perfis encontrados"}.`;
  if (!list.length) { grid.append(el("div", "empty", "Nenhum vereador encontrado. Confira a grafia ou o partido.")); return; }

  list.forEach(p => {
    const card = el("article", "council-card");
    const head = el("div", "card-head");
    const initials = p.nome.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toLocaleUpperCase("pt-BR");
    const fallback = () => { const a = el("div", "avatar", initials); a.setAttribute("aria-hidden", "true"); return a; };
    const src = p.foto ? (p.foto.startsWith("img/") ? p.foto : safeUrl(p.foto)) : `img/vereadores/${slug(p.nome)}.jpg`;
    if (src) {
      const img = document.createElement("img");
      img.src = src; img.alt = `Foto de ${p.nome}`; img.loading = "lazy"; img.width = 60; img.height = 60;
      img.addEventListener("error", () => img.replaceWith(fallback()), { once: true });
      head.append(img);
    } else head.append(fallback());
    const info = el("div"); info.append(el("h3", "", p.nome), el("span", "party", p.partido));
    head.append(info);

    const actions = el("div", "card-actions");
    const cobrar = el("button", "btn", "Cobrar vereador(a)"); cobrar.type = "button";
    cobrar.setAttribute("aria-haspopup", "dialog");
    cobrar.addEventListener("click", () => openCobranca(p));
    const insta = el("a", "btn btn-instagram"); insta.innerHTML = IG_SVG; insta.append(document.createTextNode(" @" + p.instagram));
    insta.href = `https://www.instagram.com/${encodeURIComponent(p.instagram)}/`; insta.target = "_blank"; insta.rel = "noopener noreferrer";
    insta.setAttribute("aria-label", `Abrir Instagram de ${p.nome} (nova aba)`);
    actions.append(cobrar, insta);
    card.append(head, sigBadge(p), actions);
    grid.append(card);
  });
}


/* ===== Assinaturas (campos do vereadores.json: assinaturaConfirmada, dataAssinatura, fonteAssinatura opcional) ===== */
const fmtData = d => { const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})$/) || (d || "").match(/^(\d{2})-(\d{2})-(\d{4})$/); return !m ? (d || "") : m[1].length === 4 ? `${m[3]}/${m[2]}/${m[1]}` : `${m[1]}/${m[2]}/${m[3]}`; };
const sigCfg = () => (state.campaign && state.campaign.assinaturas) || {};
function sigInfo(p) { return { ok: p.assinaturaConfirmada === true, url: safeUrl(p.fonteAssinatura || sigCfg().fonteUrl), data: fmtData(p.dataAssinatura) }; }
function sigBadge(p) {
  const i = sigInfo(p), d = el("div", "signature-status " + (i.ok ? "confirmed" : "pending"));
  d.append(el("span", "", i.ok ? "✓ Assinatura confirmada" : "◷ Assinatura não confirmada"));
  if (i.ok && (i.data || i.url)) {
    const s = el("small"); if (i.data) s.append(document.createTextNode(i.data + (i.url ? " · " : "")));
    if (i.url) { const a = el("a", "", "fonte"); a.href = i.url; a.target = "_blank"; a.rel = "noopener noreferrer"; s.append(a); }
    d.append(s);
  }
  return d;
}
function updateCounter() {
  const c = $("signatureCount"); if (!c) return;
  const total = state.people.length, n = state.people.filter(p => sigInfo(p).ok).length, meta = Number(sigCfg().necessarias) || total;
  const pct = Math.min(100, Math.round(n / meta * 100));
  c.textContent = `${n} de ${meta}`;
  const bar = $("signatureProgressBar"); if (bar) bar.style.width = pct + "%";
  const pg = $("signatureProgress"); if (pg) pg.setAttribute("aria-valuenow", String(pct));
  const lb = document.querySelector(".signature-counter-label");
  if (lb) lb.textContent = sigCfg().necessarias ? `Assinaturas confirmadas (necessárias: ${meta})` : "Assinaturas confirmadas";
}

/* ===== Janela "Cobrar vereador" ===== */
function buildModels(c, p) {
  if (sigInfo(p).ok) return [
    { rotulo: "Pedir divulgação do requerimento e do andamento", texto: "Olá, vereador(a) {nome}. Sou morador(a) de Salvador. Vi que o(a) senhor(a) consta entre os signatários do requerimento de CEI sobre a frota de ônibus no segundo turno. Peço que divulgue o texto do requerimento e o andamento, e que ajude a reunir as demais assinaturas necessárias, para que a população possa acompanhar. Obrigado(a)." },
    { rotulo: "Escrever minha própria mensagem", texto: "" }
  ];
  if (Array.isArray(c.modelos) && c.modelos.length) return c.modelos;
  return [
    { rotulo: "Apoiar e assinar o requerimento de CEI", texto: c.mensagem },
    { rotulo: "Pedir posicionamento público (sim ou não)", texto: "Olá, vereador(a) {nome}. Sou morador(a) de Salvador. Há requerimento para instalação de Comissão Especial de Inquérito sobre a redução da frota de ônibus no segundo turno. O(a) senhor(a) apoia a instalação da CEI? Peço que informe publicamente sua posição, com os motivos. Obrigado(a)." },
    { rotulo: "Pedir transparência sobre o requerimento", texto: "Olá, vereador(a) {nome}. Sou morador(a) de Salvador e acompanho o requerimento de instalação de CEI sobre a frota de ônibus no segundo turno. Peço que o(a) senhor(a) apoie a divulgação pública do número, da autoria, do texto e do andamento do requerimento, para que a população possa acompanhar. Obrigado(a)." },
    { rotulo: "Escrever minha própria mensagem", texto: "" }
  ];
}
const MAIL_SUBJECT = "Cobrança cidadã: requerimento de CEI sobre a frota de ônibus";
let dlg, cur = { p: null, ch: "ig", models: [] };

function ensureDialog() {
  if (dlg) return dlg;
  dlg = document.createElement("dialog");
  dlg.className = "cobrar-dialog";
  dlg.setAttribute("aria-labelledby", "cdTitle");
  dlg.innerHTML = `<button type="button" class="cd-close" id="cdClose" aria-label="Fechar">×</button>
  <div class="cd-head"><div id="cdPhoto"></div><div><h3 id="cdTitle"></h3><span class="party" id="cdParty"></span></div></div>
  <div id="cdSig"></div>
  <fieldset class="cd-q"><legend>O que você quer cobrar?</legend><div id="cdOptions"></div></fieldset>
  <div class="cd-tabs" role="group" aria-label="Canal de envio">
    <button type="button" data-ch="ig" aria-pressed="true">Instagram</button>
    <button type="button" data-ch="mail" aria-pressed="false">E-mail</button>
  </div>
  <div class="cd-preview"><div class="cd-meta" id="cdMeta"></div>
    <label class="sr-only" for="cdText">Texto da mensagem (editável)</label>
    <textarea id="cdText" rows="8"></textarea>
    <div class="cd-count" id="cdCount" aria-live="off"></div></div>
  <p class="cd-hint" id="cdHint"></p>
  <div class="cd-actions"><button type="button" class="btn ghost" id="cdCopy">Copiar texto</button>
    <a class="btn btn-instagram" id="cdIg" target="_blank" rel="noopener noreferrer">Copiar e abrir Instagram</a>
    <a class="btn" id="cdMail">Abrir e-mail</a></div>
  <p class="cd-note">Este site não envia a mensagem por você. Mensagem de cidadão não é assinatura nem ato oficial de vereador.</p>`;
  document.body.append(dlg);
  const q = id => dlg.querySelector("#" + id);
  q("cdClose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  dlg.querySelectorAll(".cd-tabs button").forEach(b => b.addEventListener("click", () => { cur.ch = b.dataset.ch; refreshChannel(); }));
  q("cdText").addEventListener("input", refreshChannel);
  q("cdCopy").addEventListener("click", () => copyText(q("cdText").value.trim() || ""));
  q("cdIg").addEventListener("click", () => { copyText(q("cdText").value.trim()); });
  return dlg;
}

function refreshChannel() {
  const q = id => dlg.querySelector("#" + id), p = cur.p, txt = q("cdText").value;
  const hasMail = !!p.email;
  if (cur.ch === "mail" && !hasMail) cur.ch = "ig";
  dlg.querySelectorAll(".cd-tabs button").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.ch === cur.ch));
    if (b.dataset.ch === "mail") { b.disabled = !hasMail; b.title = hasMail ? "" : "E-mail institucional não informado pela Câmara"; }
  });
  const ig = cur.ch === "ig";
  q("cdMeta").textContent = ig ? `Mensagem direta para @${p.instagram}` : `Para: ${p.email}  ·  Assunto: ${MAIL_SUBJECT}`;
  q("cdHint").textContent = ig
    ? "O Instagram não abre a conversa com texto pronto: o texto é copiado, e você cola no direct ou em um comentário do perfil."
    : "O e-mail abre no seu aplicativo já preenchido. Revise antes de enviar; o e-mail institucional fica registrado.";
  q("cdCount").textContent = `${txt.length} caracteres`;
  const igA = q("cdIg"), mailA = q("cdMail");
  igA.hidden = !ig; mailA.hidden = ig;
  igA.href = `https://www.instagram.com/${encodeURIComponent(p.instagram)}/`;
  igA.setAttribute("aria-label", `Copiar texto e abrir Instagram de ${p.nome} (nova aba)`);
  if (hasMail) mailA.href = `mailto:${p.email}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(txt)}`;
}

function openCobranca(p) {
  ensureDialog();
  const q = id => dlg.querySelector("#" + id);
  cur = { p, ch: "ig", models: buildModels(state.campaign, p) };
  q("cdTitle").textContent = `Cobrar ${p.nome}`;
  q("cdParty").textContent = p.partido;
  const ph = q("cdPhoto"); ph.replaceChildren();
  const initials = p.nome.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toLocaleUpperCase("pt-BR");
  const fb = () => { const a = el("div", "avatar", initials); a.setAttribute("aria-hidden", "true"); return a; };
  const src = p.foto ? (p.foto.startsWith("img/") ? p.foto : safeUrl(p.foto)) : `img/vereadores/${slug(p.nome)}.jpg`;
  if (src) { const im = document.createElement("img"); im.src = src; im.alt = ""; im.width = 60; im.height = 60; im.addEventListener("error", () => im.replaceWith(fb()), { once: true }); ph.append(im); } else ph.append(fb());
  q("cdSig").replaceChildren(sigBadge(p));
  const opts = q("cdOptions"); opts.replaceChildren();
  cur.models.forEach((m, i) => {
    const lab = el("label", "cd-opt"), r = document.createElement("input");
    r.type = "radio"; r.name = "cdModel"; r.value = i; r.checked = i === 0;
    r.addEventListener("change", () => {
      const t = q("cdText"); t.value = (m.texto || "").replaceAll("{nome}", p.nome);
      if (!m.texto) { t.placeholder = "Escreva sua mensagem com respeito e baseada em fatos…"; t.focus(); }
      refreshChannel();
    });
    lab.append(r, document.createTextNode(" " + m.rotulo)); opts.append(lab);
  });
  q("cdText").value = (cur.models[0].texto || "").replaceAll("{nome}", p.nome);
  refreshChannel();
  if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
}

async function init() {
  try {
    const [v, c] = await Promise.all([fetch("data/vereadores.json"), fetch("data/campaigns.json")].map(p => p.then(r => { if (!r.ok) throw new Error(r.url); return r.json(); })));
    state.people = v.vereadores;
    state.campaign = c.campanhas.find(x => x.id === c.ativa) || c.campanhas[0];
    renderCampaign(state.campaign);
    $("customMessage").value = state.campaign.mensagem;
    [...new Set(state.people.map(p => p.partido))].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach(pt => {
      const o = el("option", "", pt); o.value = pt; $("partyFilter").append(o);
    });
    const link = safeUrl(v.fonteUrl);
    $("sourceLine").textContent = `Fonte dos nomes, partidos e e-mails: ${v.fonte}${link ? " (" + link + ")" : ""}. Conferido em ${v.conferidoEm}. Confirme sempre no site oficial.`;
    renderCouncilors();
    updateCounter();
  } catch (e) {
    $("campanha").replaceChildren(el("div", "error", "Não foi possível carregar os dados. Se abriu o arquivo direto no navegador, use um servidor local (extensão Live Server do VS Code) ou acesse o site publicado."));
  }
}

["input", "change"].forEach(ev => { $("searchName").addEventListener(ev, renderCouncilors); $("partyFilter").addEventListener(ev, renderCouncilors); $("sortOrder").addEventListener(ev, renderCouncilors); });
$("resetMessage").addEventListener("click", () => { if (state.campaign) { $("customMessage").value = state.campaign.mensagem; showToast("Texto sugerido restaurado."); } });
$("copyCustom").addEventListener("click", () => {
  const m = $("customMessage").value.trim();
  if (!m) return showToast("Escreva uma mensagem antes de copiar.");
  copyText(m.replaceAll("{nome}", "vereador(a)"));
});
init();