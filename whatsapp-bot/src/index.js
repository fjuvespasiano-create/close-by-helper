#!/usr/bin/env node
/**
 * Ponto de entrada CLI do bot.
 *
 * Uso:
 *   node src/index.js --mode=auto                → dispara para todos os leads em lote
 *   node src/index.js --mode=manual              → prompt interativo lead-a-lead
 *   node src/index.js --mode=one --phone=553199...→ envia teste para um número
 */
const fs = require("fs");
const readline = require("readline");
const config = require("./config");
const { createClient } = require("./client");
const { sendBatch, sendToLead } = require("./sender");

function parseArgs(argv) {
  const args = {};
  for (const item of argv.slice(2)) {
    const match = item.match(/^--([^=]+)(?:=(.*))?$/);
    if (match) args[match[1]] = match[2] === undefined ? true : match[2];
  }
  return args;
}

function loadLeads(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo de leads não encontrado: ${filePath}. Copie leads.example.json → leads.json.`);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("O arquivo de leads deve conter um array JSON.");
  return data;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function runAuto(client) {
  const leads = loadLeads(config.leadsFile);
  console.log(`🚀 Modo automático: ${leads.length} leads na fila.`);
  const results = await sendBatch(client, leads);
  const ok = results.filter((r) => r.ok).length;
  console.log(`\n📊 Relatório final: ${ok}/${results.length} enviados com sucesso.`);
}

async function runManual(client) {
  const leads = loadLeads(config.leadsFile);
  console.log(`🖐️  Modo manual: ${leads.length} leads carregados.`);
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const answer = await ask(`[${i + 1}/${leads.length}] Enviar para ${lead.nome} (${lead.telefone})? (s/n/q): `);
    if (answer.toLowerCase() === "q") break;
    if (answer.toLowerCase() !== "s") { console.log("↷ pulado."); continue; }
    await sendToLead(client, lead);
  }
}

async function runOne(client, phone) {
  if (!phone) throw new Error("Informe --phone=<numero> no modo one.");
  await sendToLead(client, { nome: "Teste", telefone: phone, condominio: "Teste", status: "Teste" });
}

(async () => {
  const args = parseArgs(process.argv);
  const mode = args.mode || "auto";

  console.log("🔧 Iniciando WhatsApp bot...");
  const client = await createClient();

  try {
    if (mode === "auto") await runAuto(client);
    else if (mode === "manual") await runManual(client);
    else if (mode === "one") await runOne(client, args.phone);
    else console.error(`Modo desconhecido: ${mode}`);
  } catch (err) {
    console.error("💥 Erro fatal:", err);
  } finally {
    console.log("\n👋 Encerrando cliente...");
    await client.destroy();
    process.exit(0);
  }
})();
