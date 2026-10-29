// Diagnose: node modules/MMM-ioBrokerMusic/diag.js  (im MagicMirror-Ordner ausführen)
const path = require("path");
const config = require(path.join(__dirname, "../../config/config.js"));
const mod = config.modules.find((m) => m.module === "MMM-ioBrokerMusic");
if (!mod) { console.log("MMM-ioBrokerMusic nicht in config.js gefunden"); process.exit(1); }
const c = mod.config || {};
const base = `http://${c.ip || "iobroker.local"}:${c.port || 8082}`;
const keys = ["playerstatus", "trackId", "artistId", "coverId", "totaltime", "timeremaining"];

(async () => {
  console.log(`ioBroker: ${base}  disabled=${!!mod.disabled}  position=${mod.position}\n`);
  for (const p of c.players || []) {
    console.log(`== ${p.name} (${p.id})`);
    for (const k of keys) {
      if (!p[k]) { console.log(`  ${k.padEnd(14)} (nicht konfiguriert)`); continue; }
      try {
        const r = await fetch(`${base}/get/${encodeURIComponent(p[k])}`, { signal: AbortSignal.timeout(4000) });
        const t = await r.text();
        let out;
        try { const j = JSON.parse(t); out = j ? `${JSON.stringify(j.val).slice(0, 60)}  (${new Date(j.ts).toLocaleString("de-DE")})` : "null -> Datenpunkt existiert nicht"; }
        catch { out = `HTTP ${r.status}: ${t.slice(0, 80)}`; }
        console.log(`  ${k.padEnd(14)} ${out}`);
      } catch (e) {
        console.log(`  ${k.padEnd(14)} FEHLER ${e.cause?.code || e.name}: ${e.message}`);
      }
    }
  }
})();
