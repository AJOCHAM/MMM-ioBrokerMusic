const NodeHelper = require("node_helper");

const TIMEOUT_MS = 8000;
const pad = (n) => String(n).padStart(2, "0");

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

// Alexa: true/false. Bose: Status ("PLAY_STATE") oder Quelle ("TUNEIN" = an, "STANDBY" = aus).
// Jeder nicht-leere String, der kein bekannter Aus-/Pause-Wert ist, gilt als "spielt".
const OFF_VALUES = ["", "false", "0", "standby", "invalid_source", "stop_state", "pause_state",
  "paused", "pause", "stopped", "stop", "idle", "off"];
function isPlaying(v) {
  if (v === true || v === 1) return true;
  if (typeof v === "string") return !OFF_VALUES.includes(v.trim().toLowerCase());
  return false;
}

module.exports = NodeHelper.create({
  start() {
    console.log("[MMM-ioBrokerMusic] node_helper gestartet");
    this.busy = {};
    this.lastLog = {};
    this.lastValues = {};
    this.bulkSupported = undefined;
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "FETCH_IOBROKER_DATA") {
      if (!this.lastLog[payload.player.id]) {
        console.log(`[MMM-ioBrokerMusic] erste Anfrage für ${payload.player.name} an ${payload.baseURL}`);
      }
      this.fetchPlayer(payload.baseURL, payload.player);
    }
  },

  // Holt einen Datenpunkt als JSON ({val, ts, ...}); wirft bei HTTP-Fehler/Timeout
  async getState(baseURL, id) {
    if (!id) return undefined;
    const res = await fetch(`${baseURL}/get/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Connection: "close" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} für ${id}`);
    const data = await res.json();
    return data ? data.val : undefined;
  },

  // Alle Datenpunkte eines Players mit EINEM getBulk-Request (ein Retry).
  // Liefert { werte, fehler }. Fällt bei 404/400 dauerhaft auf Einzelabfragen zurück.
  async getAll(baseURL, fields) {
    const keys = Object.keys(fields).filter((k) => fields[k]);
    if (this.bulkSupported !== false) {
      const url = `${baseURL}/getBulk/${keys.map((k) => encodeURIComponent(fields[k])).join(",")}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { Connection: "close" }
          });
          if (res.status === 404 || res.status === 400) {
            console.warn("[MMM-ioBrokerMusic] getBulk nicht verfügbar, nutze Einzelabfragen");
            this.bulkSupported = false;
            break;
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const list = await res.json();
          const byId = {};
          (Array.isArray(list) ? list : []).forEach((st) => { if (st && st.id) byId[st.id] = st.val; });
          const v = {};
          keys.forEach((k) => { v[k] = byId[fields[k]]; });
          return { v, errors: [] };
        } catch (e) {
          if (attempt === 1) return { v: null, errors: [`getBulk: ${e.cause?.code || e.message}`] };
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }
    // Fallback: nacheinander statt alle parallel
    const v = {};
    const errors = [];
    for (const k of keys) {
      try { v[k] = await this.getState(baseURL, fields[k]); }
      catch (e) { errors.push(`${k}: ${e.cause?.code || e.message}`); }
    }
    return { v, errors };
  },

  async fetchPlayer(baseURL, player) {
    // Keine überlappenden Abfragen pro Player (Intervall kürzer als ioBroker-Antwort)
    if (this.busy[player.id]) return;
    this.busy[player.id] = true;

    const fields = {
      playerstatus: player.playerstatus,
      album: player.albumId,
      artist: player.artistId,
      track: player.trackId,
      cover: player.coverId,
      totaltime: player.totaltime,
      timeremaining: player.timeremaining
    };

    try {
      const { v: fresh, errors } = await this.getAll(baseURL, fields);
      if (errors.length) {
        console.error(`[MMM-ioBrokerMusic] ${player.name}: ${errors.join(" | ")}`);
      }
      // Bei komplettem Ausfall letzte bekannte Werte behalten statt Anzeige zu leeren
      if (!fresh) return;
      this.lastValues[player.id] = fresh;
      const v = fresh;

      const playing = isPlaying(v.playerstatus) && !!v.track;
      const total = toNum(v.totaltime);
      const t = toNum(v.timeremaining);

      // Bose-Skript liefert vergangene Zeit (elapsedSec), Alexa die Restzeit (mediaRemaining).
      // Automatisch am Datenpunktnamen erkennen, per player.timeType überschreibbar.
      const timeType =
        player.timeType ||
        (/elapsed|progress/i.test(player.timeremaining || "") ? "elapsed" : "remaining");
      const elapsed = Math.min(total, Math.max(0, timeType === "elapsed" ? t : total - t));

      const logLine = `status=${JSON.stringify(v.playerstatus)} track=${JSON.stringify(v.track)} -> playing=${playing}`;
      if (this.lastLog[player.id] !== logLine) {
        console.log(`[MMM-ioBrokerMusic] ${player.name}: ${logLine}`);
        this.lastLog[player.id] = logLine;
      }

      this.sendSocketNotification("IOBROKER_DATA", {
        id: player.id,
        data: {
          playing,
          track: v.track || "",
          artist: v.artist || "",
          album: v.album || "",
          cover: v.cover || "",
          hasTime: total > 0,
          progress: total > 0 ? Math.round((elapsed / total) * 100) : 0,
          elapsedText: fmtTime(elapsed),
          totalText: fmtTime(total)
        }
      });
    } catch (e) {
      console.error(`[MMM-ioBrokerMusic] ${player.name}: unerwarteter Fehler`, e);
    } finally {
      this.busy[player.id] = false;
    }
  }
});
