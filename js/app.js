"use strict";
const $ = id => document.getElementById(id);
const state = { people: [], campaign: null, activeUser: null, activeType: "cei" };
let toastTimer;

function showToast(msg) {
  const t = $("toast"); if (!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

const IG_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>';
const slug = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const safeUrl = u => { try { return new URL(u).protocol === "https:" ? u : null; } catch { return null; } };

const getTxt = (type, nome) => {
  const t = {
    cei: `Olá, vereador(a) ${nome}. Solicito seu apoio e assinatura oficial no requerimento para a instalação da CEI do transporte público em Salvador!`,
    posicao: `Olá, vereador(a) ${nome}. Como cidadão, gostaria de saber seu posicionamento público a respeito da fiscalização do transporte coletivo.`,
    transparencia: `Prezado(a) ${nome}, solicito transparência total e informações claras relativas ao andamento da CEI dos ônibus.`
  };
  return t[type] || t.cei;
};

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text); showToast("Mensagem copiada com sucesso!");
  } catch {
    const a = el("textarea"); a.value = text; document.body.appendChild(a); a.select();
    document.execCommand("copy"); a.remove(); showToast("Mensagem copiada.");
  }
}

function openCobranca(p) {
  state.activeUser = p; state.activeType = "cei";
  if (!$("modalCobranca")) return;
  $("modalNome").textContent = p.nome;
  $("modalPartido").textContent = p.partido;
  $("modalFoto").src = p.foto || `img/vereadores/${slug(p.nome)}.jpg`;
  $("modalPreview").value = getTxt("cei", p.nome);
  $("modalCobranca").classList.add("open");
}

function renderCampaign(c) {
  const s = $("campanha"); if (!s) return; s.replaceChildren();
  const art = el("article", "campaign");
  const b1 = el("a", "btn", "Cobrar um vereador"); b1.href = "#vereadores";
  const b2 = el("a", "btn secondary", "Consultar Câmara Municipal"); b2.href = "https://cms.ba.gov.br"; b2.target = "_blank"; b2.rel = "noopener noreferrer";
  
  const act = el("div", "campaign-actions"); act.append(b1, b2);
  const box = el("div"); box.append(el("span", "status", c.status), el("h3", "", c.titulo), el("p", "", c.resumo), act);
  
  const body = el("div", "campaign-body");
  const r = c.requerimento || {}; const link = r.documento_url && safeUrl(r.documento_url);
  if (link) {
    const a = el("a", "btn secondary", `Abrir documento oficial ${r.numero ? "nº "+r.numero : ""}`);
    a.href = link; a.target = "_blank"; a.rel = "noopener noreferrer"; body.append(a);
  }
  
  const ul = el("ul", "timeline");
  (c.linhaDoTempo || []).forEach(i => {
    const li = el("li"); li.append(el("time", "", i.data), document.createTextNode(i.texto + " "));
    const u = safeUrl(i.url); if (u) { const a = el("a", "", "Fonte"); a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer"; li.append(a); }
    ul.append(li);
  });
  body.append(ul);
  art.append(box, body); s.append(art);
}

function renderCouncilors() {
  const q = $("searchName") ? $("searchName").value.trim().toLocaleLowerCase("pt-BR") : "";
  const party = $("partyFilter") ? $("partyFilter").value : "";
  const list = state.people.filter(p => (!party || p.partido === party) && (p.nome + " " + p.partido).toLocaleLowerCase("pt-BR").includes(q));
  if ($("sortOrder") && $("sortOrder").value === "za") list.reverse();
  if (!$("councilGrid")) return;
  $("councilGrid").replaceChildren();

  list.forEach(p => {
    const card = el("article", "council-card");
    const head = el("div", "card-head");
    const src = p.foto ? (p.foto.startsWith("img/") ? p.foto : safeUrl(p.foto)) : `img/vereadores/${slug(p.nome)}.jpg`;
    const img = document.createElement("img"); img.src = src; img.alt = p.nome; img.width = 60; img.height = 60;
    
    const info = el("div"); info.append(el("h3", "", p.nome), el("span", "party", p.partido));
    head.append(img, info);

    const cobrar = el("button", "btn", "Cobrar vereador(a)"); cobrar.onclick = () => openCobranca(p);
    const insta = el("a", "btn btn-instagram"); insta.innerHTML = IG_SVG; insta.href = `https://instagram.com{p.instagram}`;
    const act = el("div", "card-actions"); act.append(cobrar, insta);
    
    card.append(head, sigBadge(p), act); $("councilGrid").append(card);
  });
}

const sigCfg = () => (state.campaign && state.campaign.assinaturas) || {};
const sigInfo = p => ({ ok: p.assinaturaConfirmada === true || p.assinaturaConfirmada === "true", data: p.dataAssinatura });

function sigBadge(p) {
  const i = sigInfo(p), d = el("div", "signature-status " + (i.ok ? "confirmed" : "pending"));
  d.append(el("span", "", i.ok ? "✓ Assinatura confirmada" : "◷ Assinatura não confirmada"));
  return d;
}

function updateCounter() {
  const total = state.people.length, n = state.people.filter(p => sigInfo(p).ok).length, meta = Number(sigCfg().necessarias) || total;
  if ($("signatureCount")) $("signatureCount").textContent = `${n} de ${meta}`;
  if ($("signatureProgressBar")) $("signatureProgressBar").style.width = Math.min(100, Math.round(n / meta * 100)) + "%";
}

async function init() {
  try {
    const [v, c] = await Promise.all([fetch("data/vereadores.json"), fetch("data/campaigns.json")].map(p => p.then(r => r.json())));
    state.people = v.vereadores; state.campaign = c.campanhas[0];
    renderCampaign(state.campaign);
    
    if ($("closeModal")) $("closeModal").onclick = () => $("modalCobranca").classList.remove("open");
    ["btnCei", "btnPosicao", "btnTransparencia"].forEach(id => {
      if ($(id)) $(id).onclick = e => {
        document.querySelectorAll(".modal-tabs-questions .btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active"); state.activeType = e.target.dataset.type;
        $("modalPreview").value = getTxt(state.activeType, state.activeUser.nome);
      };
    });
    if ($("btnModalCopiar")) $("btnModalCopiar").onclick = () => copyText($("modalPreview").value);
    if ($("btnModalInstagram")) $("btnModalInstagram").onclick = () => {
      copyText($("modalPreview").value); window.open(`https://instagram.com{state.activeUser.instagram}`, "_blank");
    };

    updateCounter(); renderCouncilors();
  } catch (e) { console.error(e); }
}

["input", "change"].forEach(ev => {
  if ($("searchName")) $("searchName").addEventListener(ev, renderCouncilors);
  if ($("partyFilter")) $("partyFilter").addEventListener(ev, renderCouncilors);
});

init();
