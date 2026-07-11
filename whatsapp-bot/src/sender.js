const config = require("./config");
const { sleep, randomDelay, normalizePhone, renderTemplate, appendLog } = require("./utils");

/**
 * Envia uma mensagem para um único lead. Retorna { ok, lead, error? }.
 */
async function sendToLead(client, lead) {
  const phone = normalizePhone(lead.telefone, config.defaultCountryCode);
  const message = renderTemplate(config.messageTemplate, lead);

  try {
    // Confirma que o número está registrado no WhatsApp antes de enviar (economiza risco de ban).
    const numberId = await client.getNumberId(phone.replace("@c.us", ""));
    if (!numberId) throw new Error("Número não possui WhatsApp");

    await client.sendMessage(numberId._serialized, message);
    console.log(`✅ Enviado: ${lead.nome} (${lead.telefone})`);
    appendLog(config.logFile, { status: "success", lead });
    return { ok: true, lead };
  } catch (error) {
    const err = error && error.message ? error.message : String(error);
    console.error(`❌ Falha: ${lead.nome} (${lead.telefone}) → ${err}`);
    appendLog(config.logFile, { status: "error", lead, error: err });
    return { ok: false, lead, error: err };
  }
}

/**
 * Envia para uma lista de leads sequencialmente, com delay aleatório entre envios (anti-ban).
 * onProgress opcional recebe { index, total, result } após cada envio.
 */
async function sendBatch(client, leads, { onProgress } = {}) {
  const results = [];
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const result = await sendToLead(client, lead);
    results.push(result);
    if (onProgress) onProgress({ index: i, total: leads.length, result });

    // Delay aleatório apenas entre mensagens (não após a última).
    if (i < leads.length - 1) {
      const wait = randomDelay(config.minDelayMs, config.maxDelayMs);
      console.log(`⏱️  Aguardando ${(wait / 1000).toFixed(1)}s antes do próximo envio...`);
      await sleep(wait);
    }
  }
  return results;
}

module.exports = { sendToLead, sendBatch };
