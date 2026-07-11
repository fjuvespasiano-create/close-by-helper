/**
 * Opt-out persistente. Armazena telefones normalizados que pediram para sair
 * (via resposta com palavra-chave ou manualmente).
 */
const config = require("./config");
const { readJson, writeJson, normalizePhone } = require("./utils");

function load() {
  const data = readJson(config.optOutFile, { numbers: [], firstAddedAt: null });
  if (!Array.isArray(data.numbers)) data.numbers = [];
  return data;
}

function save(data) { writeJson(config.optOutFile, data); }

function isOptedOut(phoneRaw) {
  const norm = normalizePhone(phoneRaw, config.defaultCountryCode);
  const data = load();
  return data.numbers.includes(norm);
}

function addOptOut(phoneRaw, reason = "user_request") {
  const norm = normalizePhone(phoneRaw, config.defaultCountryCode);
  const data = load();
  if (!data.numbers.includes(norm)) {
    data.numbers.push(norm);
    data.firstAddedAt = data.firstAddedAt || new Date().toISOString();
    data.lastAddedAt = new Date().toISOString();
    save(data);
    console.log(`🚫 Opt-out registrado: ${norm} (motivo: ${reason})`);
  }
  return norm;
}

/**
 * Escuta mensagens recebidas; se contiver palavra-chave de opt-out, adiciona.
 */
function attachOptOutListener(client) {
  client.on("message", async (msg) => {
    if (msg.fromMe) return;
    const body = (msg.body || "").trim().toLowerCase();
    if (!body) return;
    const matched = config.optOutKeywords.some((kw) => body === kw || body.split(/\s+/).includes(kw));
    if (matched) {
      addOptOut(msg.from, "keyword_reply");
      try {
        await msg.reply(
          "Recebemos sua solicitação. Você não receberá mais avisos automáticos por aqui. ✅"
        );
      } catch (e) { /* ignore */ }
    }
  });
}

module.exports = { isOptedOut, addOptOut, attachOptOutListener };
