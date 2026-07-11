#!/usr/bin/env node
/**
 * CLI do bot com estratégias anti-ban completas.
 *
 * Uso:
 *   node src/index.js --mode=auto
 *   node src/index.js --mode=manual
 *   node src/index.js --mode=one --phone=5531999990000
 *   node src/index.js --mode=warmup-status
 *   node src/index.js --mode=warmup-reset
 *   node src/index.js --mode=optout-add --phone=5531999990000
 */
const fs = require("fs");
const readline = require("readline");
const config = require("./config");
const { createClient } = require("./client");
const { sendBatch, sendToLead } = require("./sender");
const optout = require("./optout");
const warmup = require("./warmup");

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
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!Array.isArray(data)) throw new Error("O arquivo de leads deve conter um array JSON.");
  return data;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

function printWarmupHeader() {
  const st = warmup.status();
  console.log("\n📈 Warm-up:");
  console.log(`   Dia ${st.dayIndex} desde o início (${st.startDate})`);
  console.log(`   Limite hoje: ${st.limit} | Enviadas: ${st.sent} | Restantes: ${st.remaining}\n`);
}

async function runAuto(client) {
  const leads = loadLeads(config.leadsFile);
  printWarmupHeader();
  console.log(`🚀 Modo automático: ${leads.length} leads na fila.`);
  const results = await sendBatch(client, leads);
  const ok = results.filter((r) => r.ok).length;
  const skipped = results.filter((r) => r.skipped).length;
  console.log(`\n📊 Relatório final: ${ok} enviados | ${skipped} opt-out | ${results.length - ok - skipped} falhas.`);
}

async function runManual(client) {
  const leads = loadLeads(config.leadsFile);
  printWarmupHeader();
  console.log(`🖐️  Modo manual: ${leads.length} leads carregados.`);
  for (let i = 0; i < leads.length; i++) {
    if (warmup.remainingToday() <= 0) {
      console.warn("🛑 Limite diário do warm-up atingido. Encerrando.");
      break;
    }
    const lead = leads[i];
    const answer = await ask(`[${i + 1}/${leads.length}] Enviar para ${lead.nome} (${lead.telefone})? (s/n/q): `);
    if (answer.toLowerCase() === "q") break;
    if (answer.toLowerCase() !== "s") { console.log("↷ pulado."); continue; }
    await sendToLead(client, lead);
  }
}

async function runOne(client, phone) {
  if (!phone) throw new Error("Informe --phone=<numero> no modo one.");
  await sendToLead(client, {
    nome: "Teste",
    telefone: phone,
    condominio: "Residencial Teste",
    status: "Liberado",
  });
}

(async () => {
  const args = parseArgs(process.argv);
  const mode = args.mode || "auto";

  // Modos administrativos que não precisam do WhatsApp aberto.
  if (mode === "warmup-status") {
    printWarmupHeader();
    return process.exit(0);
  }
  if (mode === "warmup-reset") {
    warmup.reset();
    console.log("♻️  Warm-up reiniciado. Contadores zerados e data de início atualizada.");
    return process.exit(0);
  }
  if (mode === "optout-add") {
    if (!args.phone) { console.error("Informe --phone=<numero>"); return process.exit(1); }
    optout.addOptOut(args.phone, "manual");
    return process.exit(0);
  }

  console.log("🔧 Iniciando WhatsApp bot com estratégias anti-ban...");
  const client = await createClient();

  // Escuta respostas com "SAIR" e afins → opt-out automático.
  optout.attachOptOutListener(client);

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
