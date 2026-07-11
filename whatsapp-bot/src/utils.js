const fs = require("fs");
const path = require("path");

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function randomInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }

/**
 * Normaliza telefone para "<DDI><DDD><numero>@c.us".
 */
function normalizePhone(raw, defaultCountryCode = "55") {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) throw new Error("Telefone vazio ou inválido");
  const withCC = digits.length <= 11 ? `${defaultCountryCode}${digits}` : digits;
  return `${withCC}@c.us`;
}

/**
 * Resolve spintax: "{a|b|c}" → um dos três, aleatoriamente.
 * Suporta múltiplas ocorrências no mesmo texto. Não suporta aninhamento.
 */
function resolveSpintax(text) {
  return text.replace(/\{([^{}]+)\}/g, (match, group) => {
    if (!group.includes("|")) return match; // não é spintax, é placeholder de variável
    const options = group.split("|").map((s) => s.trim()).filter(Boolean);
    return options[Math.floor(Math.random() * options.length)];
  });
}

/**
 * Substitui placeholders {chave} pelos valores do lead. Chaves ausentes → "".
 */
function renderVariables(text, lead) {
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const value = lead[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/**
 * Pipeline completo de personalização: spintax → variáveis.
 */
function personalize(template, lead) {
  return renderVariables(resolveSpintax(template), lead);
}

function ensureDir(dirPath) { fs.mkdirSync(dirPath, { recursive: true }); }

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { return fallback; }
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function appendLog(logFile, entry) {
  ensureDir(path.dirname(logFile));
  fs.appendFileSync(logFile, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}

module.exports = {
  sleep, randomInt, normalizePhone,
  resolveSpintax, renderVariables, personalize,
  ensureDir, readJson, writeJson, appendLog,
};
