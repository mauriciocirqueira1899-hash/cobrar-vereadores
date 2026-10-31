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