const config = require("./config");
const { sleep, randomInt, normalizePhone, personalize, appendLog } = require("./utils");
const optout = require("./optout");
const warmup = require("./warmup");

/**
 * Simula digitação por um período aleatório antes de enviar.
 */
async function simulateTyping(chat) {
  try {
    await chat.sendStateTyping();
    await sleep(randomInt(config.minTypingMs, config.maxTypingMs));
    await chat.clearState();
  } catch { /* algumas versões não expõem clearState */ }
}

/**
 * Envia uma mensagem para um lead com todas as camadas anti-ban:
 * - verifica opt-out
 * - verifica se o número tem WhatsApp
 * - simula presença/digitação
 * - aplica spintax + variáveis
 * - registra no warm-up + log
 */
async function sendToLead(client, lead) {
  const phoneNormalized = normalizePhone(lead.telefone, config.defaultCountryCode);

  if (optout.isOptedOut(lead.telefone)) {
    console.log(`⏭️  Pulado (opt-out): ${lead.nome} (${lead.telefone})`);
    appendLog(config.logFile, { status: "skipped_optout", lead });
    return { ok: false, skipped: true, reason: "optout", lead };
  }

  try {
    const numberId = await client.getNumberId(phoneNormalized.replace("@c.us", ""));
    if (!numberId) throw new Error("Número não possui WhatsApp");

    const chatId = numberId._serialized;
    const chat = await client.getChatById(chatId);

    // Simula digitação humana antes de enviar.
    await simulateTyping(chat);

    const message = personalize(config.messageTemplate, lead);
    await client.sendMessage(chatId, message);

    const totalToday = warmup.recordSent();
    console.log(`✅ Enviado (${totalToday}/${warmup.todayLimit()} hoje): ${lead.nome}`);
    appendLog(config.logFile, { status: "success", lead, message });
    return { ok: true, lead, message };
  } catch (error) {
    const err = error && error.message ? error.message : String(error);
    console.error(`❌ Falha: ${lead.nome} (${lead.telefone}) → ${err}`);
    appendLog(config.logFile, { status: "error", lead, error: err });
    return { ok: false, lead, error: err };
  }
}

/**
 * Envia para uma fila com:
 * - delay aleatório 20–40s entre mensagens (config)
 * - pausa longa 5–10min a cada N mensagens (config.batchSize)
 * - respeito ao limite diário do warm-up (aborta ao atingir)
 */
async function sendBatch(client, leads, { onProgress } = {}) {
  const results = [];
  let sentInBlock = 0;

  for (let i = 0; i < leads.length; i++) {
    // Warm-up: aborta se o limite diário foi atingido.
    if (warmup.remainingToday() <= 0) {
      const st = warmup.status();
      console.warn(`\n🛑 Limite diário atingido (${st.sent}/${st.limit}). Envio pausado até amanhã.`);
      appendLog(config.logFile, { status: "daily_limit_reached", ...st });
      break;
    }

    const lead = leads[i];
    const result = await sendToLead(client, lead);
    results.push(result);
    if (onProgress) onProgress({ index: i, total: leads.length, result });

    // Só conta para o bloco quando de fato enviou (não em skip).
    if (result.ok) sentInBlock++;

    const isLast = i === leads.length - 1;
    if (isLast) break;

    // Pausa longa após o bloco.
    if (sentInBlock >= config.batchSize) {
      const pause = randomInt(config.minLongPauseMs, config.maxLongPauseMs);
      const min = (pause / 60000).toFixed(1);
      console.log(`\n☕ Pausa longa: ${min} min (evitando padrão de envio).`);
      appendLog(config.logFile, { status: "long_pause", durationMs: pause });
      await sleep(pause);
      sentInBlock = 0;
      continue;
    }

    // Delay aleatório normal entre mensagens.
    const wait = randomInt(config.minDelayMs, config.maxDelayMs);
    console.log(`⏱️  Próximo envio em ${(wait / 1000).toFixed(1)}s...`);
    await sleep(wait);
  }
  return results;
}

module.exports = { sendToLead, sendBatch };
