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
  const b2 = el("a", "btn secondary", "Consultar Câmara Municipal"); b2.href = "https://www.cms.ba.gov.br/vereadores"; b2.target = "_blank"; b2.rel = "noopener noreferrer";
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
    if (r.situacao) body.append(el("p", "docs-empty", "Situação: " + r.situacao));
  } else {
    body.append(el("p", "docs-empty", "Documento ainda não disponível neste site. Será publicado após confirmação por fonte oficial."));
  }

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
    const copy = el("button", "btn secondary", "Copiar cobrança"); copy.type = "button";
    copy.addEventListener("click", () => copyText(messageFor(p)));
    
   const insta = el("a", "btn btn-instagram", "");
    insta.href = `https://www.instagram.com/${encodeURIComponent(p.instagram)}/`;
    insta.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg> @${p.instagram}`;
    insta.target = "_blank"; insta.rel = "noopener noreferrer"; insta.setAttribute("aria-label", `Abrir Instagram de ${p.nome} (nova aba)`);
    
    actions.append(copy, insta);

    if (p.email) {
      const mail = el("a", "btn ghost mail", "Enviar e-mail institucional");
      mail.href = "#"; mail.addEventListener("click", ev => {
        ev.preventDefault();
        const subj = encodeURIComponent("Cobrança cidadã: requerimento de CEI sobre a frota de ônibus");
        location.href = `mailto:${p.email}?subject=${subj}&body=${encodeURIComponent(messageFor(p))}`;
      });
      mail.setAttribute("aria-label", `Enviar e-mail a ${p.nome}`);
      actions.append(mail);
    }
    card.append(head, actions);
    grid.append(card);
  });
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

/**
 * Atualiza o contador com base na lista completa de vereadores.
 * Não use apenas os vereadores filtrados pela pesquisa.
 */
function atualizarContadorAssinaturas(vereadores) {
  const contador = document.getElementById("signatureCount");
  const barra = document.getElementById("signatureProgressBar");
  const progresso = document.getElementById("signatureProgress");

  if (!contador || !barra || !progresso || !Array.isArray(vereadores)) {
    return;
  }

  const total = vereadores.length;

  const assinaturas = vereadores.filter(
    vereador => vereador.assinaturaConfirmada === true
  ).length;

  const percentual = total > 0
    ? (assinaturas / total) * 100
    : 0;

  contador.textContent = `${assinaturas} de ${total}`;

  barra.style.width = `${percentual}%`;

  progresso.setAttribute(
    "aria-valuenow",
    percentual.toFixed(1)
  );
}

/**
 * Cria o selo que aparece no card de cada vereador.
 */
function criarStatusAssinatura(vereador) {
  const status = document.createElement("div");

  if (vereador.assinaturaConfirmada === true) {
    status.className = "signature-status confirmed";
    status.textContent = "✓ Assinatura confirmada";

    if (vereador.dataAssinatura) {
      const data = document.createElement("small");

      const partes = vereador.dataAssinatura.split("-");

      data.textContent = partes.length === 3
        ? `Data: ${partes[2]}/${partes[1]}/${partes[0]}`
        : `Data: ${vereador.dataAssinatura}`;

      status.appendChild(data);
    }
  } else {
    status.className = "signature-status pending";
    status.textContent = "◷ Assinatura não confirmada";
  }

  return status;
}
