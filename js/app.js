"use strict";
const $ = id => document.getElementById(id);
const state = { people: [], campaign: null, activeUser: null, activeType: "cei" };
let toastTimer;

function showToast(msg) {
  const t = $("toast");
  if (!t) return;
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

const getMessageTemplate = (type, nomeVereador) => {
  const templates = {
    cei: `Olá, vereador(a) ${nomeVereador}. Como cidadão de Salvador, gostaria de solicitar o seu apoio e assinatura oficial no requerimento para a instalação da CEI sobre a frota de ônibus. A transparência no transporte público é fundamental para nossa cidade!`,
    posicao: `Olá, vereador(a) ${nomeVereador}. Gostaria de saber formalmente qual é o seu posicionamento público a respeito da fiscalização do transporte coletivo em Salvador. Aguardo sua resposta pelas redes sociais.`,
    transparencia: `Prezado(a) vereador(a) ${nomeVereador}, solicito acesso e transparência total às informações relativas ao andamento do requerimento da CEI do transporte coletivo. A população merece respostas claras.`
  };
  return templates[type] || templates.cei;
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Mensagem copiada com sucesso!");
  } catch {
    const a = document.createElement("textarea");
    a.value = text; document.body.appendChild(a); a.select();
    document.execCommand("copy"); a.remove();
    showToast("Mensagem copiada.");
  }
}

function openCobranca(p) {
  state.activeUser = p;
  state.activeType = "cei";
  
  const modal = $("modalCobranca");
  if (!modal) return;
  
  if ($("modalNome")) $("modalNome").textContent = p.nome;
  if ($("modalPartido")) $("modalPartido").textContent = p.partido;
  
  const img = $("modalFoto");
  if (img) img.src = p.foto || `img/vereadores/${slug(p.nome)}.jpg`;
  
  updateModalText();
  modal.classList.add("open");
}

function updateModalText() {
  if (!state.activeUser) return;
  const txt = getMessageTemplate(state.activeType, state.activeUser.nome);
  const preview = $("modalPreview");
  if (preview) preview.value = txt;
}

function renderCampaign(c) {
  const s = $("campanha");
  if (!s) return;
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

  const notice = el("div", "notice"); const st = el("strong", "", "Transparência: "); notice.append(st, document.createTextNode(c.aviso));
  art.append(top, body, notice);
  s.append(head, art);
}

function renderCouncilors() {
  const q = $("searchName") ? $("searchName").value.trim().toLocaleLowerCase("pt-BR") : "";
  const party = $("partyFilter") ? $("partyFilter").value : "";
  const list = state.people
    .filter(p => (!party || p.partido === party) && (p.nome + " " + p.partido).toLocaleLowerCase("pt-BR").includes(q))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  
  if ($("sortOrder") && $("sortOrder").value === "za") list.reverse();
  const grid = $("councilGrid");
  if (!grid) return;
  grid.replaceChildren();
  
  if($("resultsLine")) $("resultsLine").textContent = `${list.length} ${list.length === 1 ? "perfil encontrado" : "perfis encontrados"}.`;
  if (!list.length) { grid.append(el("div", "empty", "Nenhum vereador encontrado. Confira a grafia ou o partido.")); return; }

  list.forEach(p => {
    const card = el("article", "council-card");
    const head = el("div", "card-head");
    const initials = p.nome.split(/\s+/).slice(0, 2).map(w => w).join("").toLocaleUpperCase("pt-BR");
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
    
    // CORREÇÃO 1: Link do Instagram corrigido com aspas corretas e template string
    const insta = el("a", "btn btn-instagram"); insta.innerHTML = IG_SVG; insta.append(document.createTextNode(" @" + p.instagram));
    insta.href = `https://instagram.com{encodeURIComponent(p.instagram)}/`; insta.target = "_blank"; insta.rel = "noopener noreferrer";
    
    actions.append(cobrar, insta);
    card.append(head, sigBadge(p), actions);
    grid.append(grid.append(card));
  });
}

/* ===== Assinaturas ===== */
const fmtData = d => { const m = (d || "").match(/^(\d{4})-(\d{2})-(\d{2})$/) || (d || "").match(/^(\d{2})-(\d{2})-(\d{4})$/); return !m ? (d || "") : m.length === 4 ? `${m}/${m}/${m}` : `${m}/${m}/${m}`; };
const sigCfg = () => (state.campaign && state.campaign.assinaturas) || {};
function sigInfo(p) { return { ok: p.assinaturaConfirmada === true || p.assinaturaConfirmada === "true", url: safeUrl(p.fonteAssinatura || sigCfg().fonteUrl), data: fmtData(p.dataAssinatura) }; }

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
}

async function init() {
  try {
    const [v, c] = await Promise.all([fetch("data/vereadores.json"), fetch("data/campaigns.json")].map(p => p.then(r => { if (!r.ok) throw new Error(r.url); return r.json(); })));
    state.people = v.vereadores;
    state.campaign = c.campanhas.find(x => x.id === c.ativa) || c.campanhas;
    renderCampaign(state.campaign);
    
    setupModalListeners();
    
    [...new Set(state.people.map(p => p.partido))].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach(pt => {
      const o = el("option", "", pt); o.value = pt; if($("partyFilter")) $("partyFilter").append(o);
    });
    
    updateCounter();
    renderCouncilors();
  } catch (e) {
    if($("campanha")) $("campanha").replaceChildren(el("div", "error", "Não foi possível carregar os dados."));
  }
}

function setupModalListeners() {
  const closeBtn = $("closeModal");
if (closeBtn) closeBtn.addEventListener("click", () => $("modalCobranca").classList.remove("open"));
["btnCei", "btnPosicao", "btnTransparencia"].forEach(id => {
const btn = $(id);
if (btn) {
btn.addEventListener("click", (e) => {
document.querySelectorAll(".modal-tabs-questions .btn").forEach(b => b.classList.remove("active"));
e.target.classList.add("active");
state.activeType = e.target.dataset.type;
updateModalText();
});
}
});
const btnCopiar = $("btnModalCopiar");
if (btnCopiar) {
btnCopiar.addEventListener("click", () => {
const preview = $("modalPreview");
if (preview) copyText(preview.value);
});
}
const btnInsta = $("btnModalInstagram");
if (btnInsta) {
btnInsta.addEventListener("click", () => {
const preview = $("modalPreview");
if (preview) copyText(preview.value);
if (state.activeUser) {
// CORREÇÃO 2: String de abertura do link do modal corrigida com aspas e barras certas
window.open(https://instagram.com{encodeURIComponent(state.activeUser.instagram)}/, "_blank");
}
});
}
}
["input", "change"].forEach(ev => {
if($("searchName")) $("searchName").addEventListener(ev, renderCouncilors);
if($("partyFilter")) $("partyFilter").addEventListener(ev, renderCouncilors);
});
if($("sortOrder")) $("sortOrder").addEventListener("change", renderCouncilors);
init();