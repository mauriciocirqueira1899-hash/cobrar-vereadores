"use strict";
const $ = id => document.getElementById(id);
const state = { people: [], campaign: null, user: null, type: "cei", channel: "instagram" };
let toastTimer;

function showToast(msg) {
  const t = $("toast"); if (!t) return;
  const dg = $("cobrarDialog"), host = dg && dg.hasAttribute("open") ? dg : document.body;
  if (t.parentElement !== host) host.append(t);
  t.textContent = msg; t.classList.add("show");
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
const WWW_HOSTS = ["cms.ba.gov.br", "instagram.com"];
const safeUrl = u => { try { const x = new URL(u); if (x.protocol !== "https:") return null; if (WWW_HOSTS.includes(x.hostname)) x.hostname = "www." + x.hostname; return x.href; } catch { return null; } };
const igUrl = user => `https://www.instagram.com/${encodeURIComponent(user)}/`;

/* ===== Mensagens ===== */
const OPTIONS = [
  { id: "cei", label: "Apoiar e assinar o requerimento de CEI", subject: "Requerimento de CEI sobre a frota de ônibus" },
  { id: "posicao", label: "Pedir posição pública (sim ou não)", subject: "Posicionamento sobre a CEI da frota de ônibus" },
  { id: "transparencia", label: "Pedir transparência sobre o requerimento", subject: "Transparência sobre o requerimento de CEI" },
  { id: "andamento", label: "Pedir divulgação do requerimento e do andamento", subject: "Divulgação e andamento do requerimento de CEI" },
  { id: "livre", label: "Escrever minha própria mensagem", subject: "Mensagem de cidadão de Salvador" }
];

function getMessage(type, nome) {
  const base = state.campaign && state.campaign.mensagem;
  const custom = $("customMessage") ? $("customMessage").value.trim() : "";
  const ceiText = custom || base || `Olá, vereador(a) {nome}. Como cidadão(ã) de Salvador, peço que o(a) senhor(a) assine o requerimento de instalação da CEI sobre a frota de ônibus e informe publicamente sua posição.`;
  const t = {
    cei: ceiText,
    posicao: `Olá, vereador(a) {nome}. Como cidadão(ã) de Salvador, gostaria de saber qual é o seu posicionamento público sobre o requerimento de instalação da CEI da frota de ônibus: o(a) senhor(a) é favorável ou contrário(a)? Aguardo sua resposta.`,
    transparencia: `Prezado(a) vereador(a) {nome}, como cidadão(ã) de Salvador, peço transparência sobre o andamento do requerimento de CEI da frota de ônibus: quem assinou, qual é o prazo e como acompanhar a votação. Aguardo retorno.`,
    andamento: `Olá, vereador(a) {nome}. Como cidadão(ã) de Salvador, vi que o(a) senhor(a) consta entre os signatários do requerimento de CEI sobre a frota de ônibus. Peço que divulgue o texto do requerimento e o andamento, e que ajude a reunir as demais assinaturas necessárias, para que a população possa acompanhar. Obrigado(a).`,
    livre: ""
  };
  return (t[type] || "").replaceAll("{nome}", nome);
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(okMsg || "Mensagem copiada com sucesso!");
  } catch {
    const a = document.createElement("textarea");
    a.value = text; document.body.appendChild(a); a.select();
    try { document.execCommand("copy"); } catch {}
    a.remove();
    showToast(okMsg || "Mensagem copiada.");
  }
}

/* ===== Foto com fallback de iniciais ===== */
function photoEl(p) {
  const initials = p.nome.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toLocaleUpperCase("pt-BR");
  const fallback = () => { const a = el("div", "avatar", initials); a.setAttribute("aria-hidden", "true"); return a; };
  const src = p.foto ? (p.foto.startsWith("img/") ? p.foto : safeUrl(p.foto)) : `img/vereadores/${slug(p.nome)}.jpg`;
  if (!src) return fallback();
  const img = document.createElement("img");
  img.src = src; img.alt = `Foto de ${p.nome}`; img.loading = "lazy"; img.width = 60; img.height = 60;
  img.addEventListener("error", () => img.replaceWith(fallback()), { once: true });
  return img;
}

/* ===== Janela "Cobrar vereador(a)" ===== */
function buildDialog() {
  if ($("cobrarDialog")) return;
  const d = document.createElement("dialog");
  d.id = "cobrarDialog"; d.className = "cobrar-dialog"; d.setAttribute("aria-labelledby", "cdTitle");
  d.innerHTML = `
    <button type="button" class="cd-close" id="cdClose" aria-label="Fechar">×</button>
    <div class="cd-head"><span id="cdPhoto"></span><div><h3 id="cdTitle"></h3><span class="party" id="cdParty"></span></div></div>
    <fieldset class="cd-q" id="cdQ"><legend>O que você quer cobrar?</legend></fieldset>
    <div class="cd-tabs" role="group" aria-label="Canal de envio">
      <button type="button" data-ch="instagram" aria-pressed="true">Instagram</button>
      <button type="button" data-ch="email" aria-pressed="false">E-mail</button>
    </div>
    <div class="cd-preview">
      <div class="cd-meta" id="cdMeta"></div>
      <label class="sr-only" for="cdText">Texto da mensagem</label>
      <textarea id="cdText" rows="7"></textarea>
      <div class="cd-count" id="cdCount"></div>
    </div>
    <p class="cd-hint" id="cdHint"></p>
    <div class="cd-actions">
      <button type="button" class="btn ghost" id="cdCopy">Copiar texto</button>
      <button type="button" class="btn btn-instagram" id="cdIg">${IG_SVG} Copiar e abrir Instagram</button>
      <a class="btn" id="cdMail" href="#">Abrir e-mail</a>
    </div>
    <p class="cd-note">Esta mensagem é de cidadão e não é assinatura nem ato oficial de vereador. Este site não envia nem guarda o texto.</p>`;
  document.body.append(d);
  d.addEventListener("close", () => { if ($("toast")) document.body.append($("toast")); });

  d.querySelectorAll(".cd-tabs button").forEach(b => b.addEventListener("click", () => setChannel(b.dataset.ch)));
  $("cdClose").addEventListener("click", () => closeDialog());
  d.addEventListener("click", e => { if (e.target === d) closeDialog(); });
  $("cdText").addEventListener("input", refresh);
  $("cdCopy").addEventListener("click", () => copyText($("cdText").value));
  $("cdIg").addEventListener("click", () => {
    copyText($("cdText").value, "Texto copiado. Cole no perfil ou direct do Instagram.");
    if (state.user) window.open(igUrl(state.user.instagram), "_blank", "noopener,noreferrer");
  });
}

function renderOptions(p) {
  const q = $("cdQ"); q.querySelectorAll("label").forEach(n => n.remove());
  const ids = sigInfo(p).ok ? ["andamento", "livre"] : ["cei", "posicao", "transparencia", "livre"];
  ids.map(id => OPTIONS.find(o => o.id === id)).forEach((o, i) => {
    const lab = el("label", "cd-opt"), r = document.createElement("input");
    r.type = "radio"; r.name = "cdOpt"; r.value = o.id; r.checked = i === 0;
    r.addEventListener("change", () => { state.type = o.id; setText(getMessage(o.id, state.user.nome)); if (o.id === "livre") $("cdText").focus(); });
    lab.append(r, el("span", "", o.label)); q.append(lab);
  });
  return ids[0];
}

function closeDialog() {
  const d = $("cobrarDialog"); if (!d) return;
  if (d.close) d.close(); else d.removeAttribute("open");
  if ($("toast")) document.body.append($("toast"));
}

function setText(t) { $("cdText").value = t; refresh(); }

function setChannel(ch) {
  state.channel = ch;
  document.querySelectorAll("#cobrarDialog .cd-tabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ch === ch)));
  refresh();
}

function refresh() {
  const p = state.user; if (!p) return;
  const text = $("cdText").value;
  const hasMail = !!(p.email && p.email.trim());
  const mailTab = document.querySelector('#cobrarDialog .cd-tabs [data-ch="email"]');
  mailTab.disabled = !hasMail;
  if (!hasMail && state.channel === "email") state.channel = "instagram";
  const ig = state.channel === "instagram";
  const opt = OPTIONS.find(o => o.id === state.type) || OPTIONS[0];
  document.querySelectorAll("#cobrarDialog .cd-tabs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ch === state.channel)));

  $("cdCount").textContent = `${text.length} caracteres`;
  $("cdIg").hidden = !ig;
  $("cdMail").hidden = ig;
  $("cdCopy").hidden = false;

  if (ig) {
    $("cdMeta").textContent = `Para: @${p.instagram}`;
    $("cdHint").textContent = "O Instagram não permite abrir o direct com texto pronto. O texto é copiado e você cola no perfil ou no direct.";
  } else {
    const subject = `${opt.subject}`;
    $("cdMeta").textContent = `Para: ${p.email} · Assunto: ${subject}`;
    $("cdMail").href = `mailto:${p.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    $("cdHint").textContent = hasMail ? "O e-mail abre já preenchido no seu aplicativo de e-mail." : "";
  }
  if (!hasMail) $("cdHint").textContent += (ig ? " " : "") + "Este vereador não tem e-mail público cadastrado.";
}

function openCobranca(p) {
  buildDialog();
  state.user = p; state.channel = "instagram"; state.type = renderOptions(p);
  $("cdPhoto").replaceChildren(photoEl(p));
  $("cdTitle").textContent = p.nome;
  $("cdParty").textContent = p.partido;
  setText(getMessage(state.type, p.nome));
  const d = $("cobrarDialog");
  if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
}

/* ===== Campanha ===== */
function renderCampaign(c) {
  const s = $("campanha"); if (!s) return;
  s.replaceChildren();
  const head = el("div", "section-heading"), hd = el("div");
  hd.append(el("h2", "", "Campanha em destaque"), el("p", "", "Uma pauta pública para acompanhar com responsabilidade."));
  head.append(hd);
  const art = el("article", "campaign"), top = el("div", "campaign-top"), box = el("div"), actions = el("div", "campaign-actions");
  const b1 = el("a", "btn", "Cobrar todos de uma vez"); b1.href = "#bulkBox";
  const b2 = el("a", "btn secondary", "Escolher um vereador"); b2.href = "#vereadores";
  actions.append(b1, b2);
  const note = el("p", "docs-empty"), nl = el("a", "", "Entenda o caso");
  nl.href = "#caso"; nl.addEventListener("click", () => { const d = document.querySelector("#caso details"); if (d) d.open = true; });
  note.append(document.createTextNode("Mensagens de cidadãos não são assinaturas. Fatos, fontes e andamento: "), nl, document.createTextNode("."));
  box.append(el("span", "status", c.status), el("h3", "", c.titulo), el("p", "", c.resumo), actions, note);
  top.append(box); art.append(top); s.append(head, art);
  renderCase(c);
}

function renderCase(c) {
  const anchor = $("vereadores"); if (!anchor) return;
  let sec = $("caso");
  if (!sec) { sec = document.createElement("section"); sec.id = "caso"; anchor.after(sec); }
  sec.replaceChildren();
  const det = document.createElement("details"); det.className = "case";
  if (window.matchMedia && matchMedia("(min-width: 851px)").matches) det.open = true;
  det.append(el("summary", "", "Entenda o caso, linha do tempo e fontes"));
  const art = el("article", "campaign"), body = el("div", "campaign-body");
  body.append(el("h4", "", "Requerimento de CEI"));
  const r = c.requerimento || {}, link = r.documento_url && safeUrl(r.documento_url);
  if (link) {
    const a = el("a", "btn secondary", "Abrir documento oficial" + (r.numero ? " nº " + r.numero : ""));
    a.href = link; a.target = "_blank"; a.rel = "noopener noreferrer"; body.append(a);
  } else body.append(el("p", "docs-empty", "Documento ainda não disponível neste site. Será publicado após confirmação por fonte oficial."));
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
  const cms = el("a", "btn secondary", "Consultar Câmara Municipal"); cms.href = "https://www.cms.ba.gov.br"; cms.target = "_blank"; cms.rel = "noopener noreferrer";
  body.append(cms);
  const notice = el("div", "notice"); notice.append(el("strong", "", "Transparência: "), document.createTextNode(c.aviso || ""));
  art.append(body, notice); det.append(art); sec.append(det);
}

/* ===== Assinaturas ===== */
const fmtData = d => {
  d = d || "";
  let m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  m = d.match(/^(\d{2})-(\d{2})-(\d{4})$/); if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  return d;
};
const sigCfg = () => (state.campaign && state.campaign.assinaturas) || {};
function sigInfo(p) {
  return { ok: p.assinaturaConfirmada === true || p.assinaturaConfirmada === "true", url: safeUrl(p.fonteAssinatura || sigCfg().fonteUrl), data: fmtData(p.dataAssinatura) };
}

function sigBadge(p) {
  const i = sigInfo(p), d = el("div", "signature-status " + (i.ok ? "confirmed" : "pending"));
  d.append(el("span", "", i.ok ? "✓ Assinatura confirmada" : "◷ Assinatura não confirmada"));
  if (i.ok && (i.data || i.url)) {
    const s = el("small");
    if (i.data) s.append(document.createTextNode(i.data + (i.url ? " · " : "")));
    if (i.url) { const a = el("a", "", "fonte"); a.href = i.url; a.target = "_blank"; a.rel = "noopener noreferrer"; s.append(a); }
    d.append(s);
  }
  return d;
}

function updateCounter() {
  const c = $("signatureCount"); if (!c) return;
  const nomes = state.people.filter(p => sigInfo(p).ok).length;
  const n = Math.max(nomes, Number(sigCfg().totalRelatado) || 0);
  const meta = Number(sigCfg().necessarias) || state.people.length;
  const pct = Math.min(100, Math.round(n / meta * 100));
  c.textContent = `${n} de ${meta}`;
  const bar = $("signatureProgressBar"); if (bar) bar.style.width = pct + "%";
  const pg = $("signatureProgress"); if (pg) pg.setAttribute("aria-valuenow", String(pct));
  const lb = document.querySelector(".signature-counter-label");
  if (lb) lb.textContent = n > nomes ? `Assinaturas relatadas (${nomes} nomes confirmados)` : "Assinaturas confirmadas";
}

/* ===== Cards ===== */
function renderCouncilors() {
  const q = $("searchName") ? $("searchName").value.trim().toLocaleLowerCase("pt-BR") : "";
  const party = $("partyFilter") ? $("partyFilter").value : "";
  const list = state.people
    .filter(p => (!party || p.partido === party) && (p.nome + " " + p.partido).toLocaleLowerCase("pt-BR").includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if ($("sortOrder") && $("sortOrder").value === "za") list.reverse();

  const grid = $("councilGrid"); if (!grid) return;
  grid.replaceChildren();
  if ($("resultsLine")) $("resultsLine").textContent = `${list.length} ${list.length === 1 ? "perfil encontrado" : "perfis encontrados"}.`;
  if (!list.length) { grid.append(el("div", "empty", "Nenhum vereador encontrado. Confira a grafia ou o partido.")); return; }

  list.forEach(p => {
    const card = el("article", "council-card");
    const head = el("div", "card-head");
    head.append(photoEl(p));
    const info = el("div"); info.append(el("h3", "", p.nome), el("span", "party", p.partido));
    head.append(info);

    const actions = el("div", "card-actions");
    const cobrar = el("button", "btn", "Cobrar vereador(a)"); cobrar.type = "button";
    cobrar.setAttribute("aria-haspopup", "dialog");
    cobrar.addEventListener("click", () => openCobranca(p));

    const insta = el("a", "btn btn-instagram"); insta.innerHTML = IG_SVG; insta.append(document.createTextNode(" @" + p.instagram));
    insta.href = igUrl(p.instagram); insta.target = "_blank"; insta.rel = "noopener noreferrer";

    actions.append(cobrar, insta);
    card.append(head, sigBadge(p), actions);
    grid.append(card);
  });
}

/* ===== Edição da mensagem geral ===== */
function setupCustomMessage() {
  const ta = $("customMessage"); if (!ta) return;
  const base = (state.campaign && state.campaign.mensagem) || "";
  ta.value = base;
  const reset = $("resetMessage"), copy = $("copyCustom");
  if (reset) reset.addEventListener("click", () => { ta.value = base; showToast("Texto restaurado."); });
  if (copy) copy.addEventListener("click", () => copyText(ta.value.replaceAll("{nome}", "(nome do vereador)")));
}

/* ===== E-mail para todos que ainda não assinaram ===== */
const GRUPO_PADRAO = "Prezados(as) vereadores(as), sou morador(a) de Salvador e escrevo como cidadão(ã). No segundo turno das eleições (25/10), o TRE-BA determinou o restabelecimento integral da frota de ônibus e mandou apurar a redução da circulação. A apuração segue em curso e a Prefeitura nega ter orientado a redução. Cabe à Câmara fiscalizar o Executivo. Em 27/10 foi protocolado requerimento de Comissão Especial de Inquérito, que precisa de 14 assinaturas. Peço que subscrevam o requerimento, garantidos o contraditório e a ampla defesa, e informem publicamente suas posições. Aguardo resposta.";
function renderBulk() {
  const old = $("bulkBox"); if (old) old.remove();
  const pend = state.people.filter(p => !sigInfo(p).ok);
  const alvo = pend.filter(p => p.email && p.email.trim()), sem = pend.filter(p => !(p.email && p.email.trim()));
  const host = $("campanha");
  if (!alvo.length || !host) return;
  const emails = alvo.map(p => p.email.trim());
  const box = el("article", "campaign"); box.id = "bulkBox";
  const top = el("div", "campaign-top"), tb = el("div");
  tb.append(el("h3", "", "Cobrar todos de uma vez"), el("p", "", `${alvo.length} vereadores com e-mail institucional que ainda não constam como signatários do requerimento. Quem já consta como signatário não recebe.`));
  top.append(tb);
  const body = el("div", "campaign-body");
  const txt = document.createElement("textarea"); txt.id = "bulkText"; txt.rows = 8;
  txt.value = (state.campaign && state.campaign.mensagemGrupo) || GRUPO_PADRAO;
  txt.setAttribute("aria-label", "Texto do e-mail para todos (editável)");
  const hint = el("p", "docs-empty"), acts = el("div", "campaign-actions");
  const mail = el("a", "btn", "Abrir meu e-mail com todos");
  const cE = el("button", "btn secondary", "Copiar lista de e-mails"); cE.type = "button";
  const cT = el("button", "btn ghost", "Copiar texto"); cT.type = "button";
  const subject = "Cobrança cidadã: requerimento de CEI sobre a frota de ônibus";
  const refreshBulk = () => {
    mail.href = `mailto:${emails.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(txt.value)}`;
    hint.textContent = mail.href.length > 6000 ? "O texto está longo e alguns aplicativos de e-mail podem cortá-lo. Se acontecer, use \"Copiar lista de e-mails\" e \"Copiar texto\"." : "Seu aplicativo de e-mail abre com todos no campo \"Para\". Revise antes de enviar: este site não envia nada por você.";
  };
  txt.addEventListener("input", refreshBulk);
  cE.addEventListener("click", () => copyText(emails.join(", "), "Lista de e-mails copiada."));
  cT.addEventListener("click", () => copyText(txt.value, "Texto copiado."));
  acts.append(mail, cE, cT);
  const det = document.createElement("details"); det.append(el("summary", "", "Ver quem vai receber"), el("p", "", alvo.map(p => p.nome).join(", ") + "."));
  const dt = document.createElement("details"); dt.append(el("summary", "", "Ver e editar o texto do e-mail"), txt);
  if (window.matchMedia && matchMedia("(min-width: 851px)").matches) dt.open = true;
  body.append(acts, hint, dt, det);
  if (sem.length) body.append(el("p", "docs-empty", "Sem e-mail público na Câmara (use o Instagram): " + sem.map(p => p.nome).join(", ") + "."));
  box.append(top, body); host.append(box); refreshBulk();
}

/* ===== Início ===== */
async function init() {
  try {
    const [v, c] = await Promise.all(
      [fetch("data/vereadores.json"), fetch("data/campaigns.json")].map(p => p.then(r => { if (!r.ok) throw new Error(r.url); return r.json(); }))
    );
    state.people = v.vereadores;
    state.campaign = c.campanhas.find(x => x.id === c.ativa) || c.campanhas[0];
    renderCampaign(state.campaign);
    setupCustomMessage();

    const pf = $("partyFilter");
    if (pf) [...new Set(state.people.map(p => p.partido))].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach(pt => {
      const o = el("option", "", pt); o.value = pt; pf.append(o);
    });

    updateCounter();
    renderCouncilors();
    renderBulk();
  } catch (e) {
    console.error(e);
    if ($("campanha")) $("campanha").replaceChildren(el("div", "error", "Não foi possível carregar os dados."));
  }
}

["searchName", "partyFilter", "sortOrder"].forEach(id => {
  const n = $(id); if (!n) return;
  ["input", "change"].forEach(ev => n.addEventListener(ev, renderCouncilors));
});

init();