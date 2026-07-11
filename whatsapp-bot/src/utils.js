const fs = require("fs");
const path = require("path");

/** Espera N milissegundos. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Delay aleatório entre min e max (inclusive). */
function randomDelay(minMs, maxMs) {
  const delta = Math.max(0, maxMs - minMs);
  return Math.floor(minMs + Math.random() * delta);
}

/**
 * Normaliza telefone para o formato aceito pelo whatsapp-web.js: "<DDI><DDD><numero>@c.us".
 * Remove qualquer caractere não numérico.
 */
function normalizePhone(raw, defaultCountryCode = "55") {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) throw new Error("Telefone vazio ou inválido");
  const withCC = digits.length <= 11 ? `${defaultCountryCode}${digits}` : digits;
  return `${withCC}@c.us`;
}

/**
 * Substitui placeholders {chave} do template pelos valores do lead.
 * Chaves ausentes viram string vazia.
 */
function renderTemplate(template, lead) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = lead[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/** Garante que um diretório exista. */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/** Loga em console + arquivo JSONL. */
function appendLog(logFile, entry) {
  ensureDir(path.dirname(logFile));
  fs.appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}

module.exports = { sleep, randomDelay, normalizePhone, renderTemplate, ensureDir, appendLog };
