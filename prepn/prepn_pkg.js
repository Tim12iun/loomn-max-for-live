// prepn Paket-Schreiber (Node for Max). Läuft neben Live, blockiert Live nicht.
// Bekommt einen Auftrag als JSON: Ordner anlegen, Full-Stems kopieren, Passagen als eigene Dateien ausschneiden.
// Kann WAV und AIFF (so nimmt Live auf). Ausgeschnitten wird verlustfrei, ohne Neuberechnung.
"use strict";
const fs = require("fs");
const path = require("path");

let maxApi = null;
try { maxApi = require("max-api"); } catch (e) { /* Test ohne Max */ }
const send = (...a) => (maxApi ? maxApi.outlet(...a) : console.log(...a));

// ---------- WAV ----------
function readWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return null;
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString("ascii", p, p + 4), size = buf.readUInt32LE(p + 4), body = p + 8;
    if (id === "fmt ") fmt = { start: p, size, chunk: buf.subarray(p, body + size + (size & 1)) };
    if (id === "data") { data = { start: body, size: Math.min(size, buf.length - body) }; break; }
    p = body + size + (size & 1);
  }
  if (!fmt || !data) return null;
  const f = buf.subarray(fmt.start + 8);
  return { kind: "wav", channels: f.readUInt16LE(2), rate: f.readUInt32LE(4), block: f.readUInt16LE(12),
           fmtChunk: fmt.chunk, dataStart: data.start, dataSize: data.size };
}
function writeWav(info, pcm) {
  const head = Buffer.alloc(12);
  head.write("RIFF", 0, "ascii"); head.write("WAVE", 8, "ascii");
  const dh = Buffer.alloc(8); dh.write("data", 0, "ascii"); dh.writeUInt32LE(pcm.length, 4);
  const pad = pcm.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0);
  const out = Buffer.concat([head, info.fmtChunk, dh, pcm, pad]);
  out.writeUInt32LE(out.length - 8, 4);
  return out;
}

// ---------- AIFF / AIFC ----------
function readExt80(b, o) { // 80-bit IEEE extended (Abtastrate)
  const exp = ((b[o] & 0x7f) << 8) | b[o + 1];
  const hi = b.readUInt32BE(o + 2), lo = b.readUInt32BE(o + 6);
  if (!exp && !hi && !lo) return 0;
  return (hi * Math.pow(2, 32) + lo) * Math.pow(2, exp - 16383 - 63) * (b[o] & 0x80 ? -1 : 1);
}
function readAiff(buf) {
  if (buf.toString("ascii", 0, 4) !== "FORM") return null;
  const type = buf.toString("ascii", 8, 12);
  if (type !== "AIFF" && type !== "AIFC") return null;
  let p = 12, comm = null, ssnd = null;
  const extra = [];
  while (p + 8 <= buf.length) {
    const id = buf.toString("ascii", p, p + 4), size = buf.readUInt32BE(p + 4), body = p + 8;
    if (id === "COMM") comm = { start: p, size };
    else if (id === "SSND") { ssnd = { body, size: Math.min(size, buf.length - body) }; break; }
    else if (id === "FVER") extra.push(buf.subarray(p, body + size + (size & 1)));
    p = body + size + (size & 1);
  }
  if (!comm || !ssnd) return null;
  const c = comm.start + 8;
  const channels = buf.readUInt16BE(c), bits = buf.readUInt16BE(c + 6), rate = readExt80(buf, c + 8);
  const offset = buf.readUInt32BE(ssnd.body);
  return { kind: "aiff", type, channels, rate, block: channels * Math.ceil(bits / 8),
           commChunk: Buffer.from(buf.subarray(comm.start, c + comm.size + (comm.size & 1))), extra,
           dataStart: ssnd.body + 8 + offset, dataSize: ssnd.size - 8 - offset };
}
function writeAiff(info, pcm) {
  const comm = Buffer.from(info.commChunk);
  comm.writeUInt32BE(pcm.length / info.block, 8 + 2); // numSampleFrames
  const sh = Buffer.alloc(16);
  sh.write("SSND", 0, "ascii"); sh.writeUInt32BE(pcm.length + 8, 4); // offset 0, blockSize 0
  const pad = pcm.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0);
  const head = Buffer.alloc(12); head.write("FORM", 0, "ascii"); head.write(info.type, 8, "ascii");
  const out = Buffer.concat([head].concat(info.extra, [comm, sh, pcm, pad]));
  out.writeUInt32BE(out.length - 8, 4);
  return out;
}

function readAudio(file) {
  const buf = fs.readFileSync(file);
  const info = readWav(buf) || readAiff(buf);
  if (!info) throw new Error("Unbekanntes Audioformat: " + path.basename(file));
  info.buf = buf;
  return info;
}
function cut(info, startSec, endSec) {
  const frames = Math.floor(info.dataSize / info.block);
  const a = Math.max(0, Math.min(frames, Math.round(startSec * info.rate)));
  const b = Math.max(a, Math.min(frames, Math.round(endSec * info.rate)));
  const pcm = info.buf.subarray(info.dataStart + a * info.block, info.dataStart + b * info.block);
  return info.kind === "wav" ? writeWav(info, pcm) : writeAiff(info, pcm);
}

const safe = s => String(s).replace(/[\/:\\]/g, "-").replace(/\s+/g, " ").trim();

// Auftrag: { dir, json, stems: [{ file, name, clips: [{ name, start, end }] }] } (Zeiten in Sekunden)
// Bestehendes Paket nie überschreiben: "<Song>-Live-Set 2", "… 3" usw.
function freeDir(dir) {
  let d = dir, i = 2;
  while (fs.existsSync(d)) d = dir + " " + i++;
  return d;
}

async function run(job) {
  job.dir = freeDir(job.dir);
  fs.mkdirSync(job.dir, { recursive: true });
  const total = job.stems.reduce((n, s) => n + 1 + s.clips.length, 0) || 1;
  let done = 0, files = 0;
  const tick = () => send("progress", Math.round(100 * ++done / total));
  for (const st of job.stems) {
    const ext = path.extname(st.file) || ".wav";
    fs.copyFileSync(st.file, path.join(job.dir, safe(st.name) + ext));
    st.out = safe(st.name) + ext; files++; tick();
    const cache = {};
    for (const c of st.clips) {
      const src = c.file || st.file; // eigener Clip (z. B. konsolidiert) -> aus seiner eigenen Datei schneiden
      const info = cache[src] || (cache[src] = readAudio(src));
      const out = safe(c.name) + (path.extname(src) || ext);
      fs.writeFileSync(path.join(job.dir, out), cut(info, c.start, c.end));
      c.out = out; files++; tick();
      await new Promise(r => setImmediate(r));
    }
  }
  if (job.json) {
    job.json.files = job.stems.map(s => ({ stem: s.out, clips: s.clips.map(c => c.out) }));
    fs.writeFileSync(path.join(job.dir, "SETMAKER.json"), JSON.stringify(job.json, null, 1));
  }
  return files;
}

async function handle(enc) {
  try {
    const job = JSON.parse(decodeURIComponent(enc));
    const files = await run(job);
    send("done", encodeURIComponent(JSON.stringify({ dir: job.dir, files })));
  } catch (e) {
    send("error", encodeURIComponent(String(e && e.message || e)));
  }
}

// Aufräumen: Aufnahme-Dateien (+ .asd) verschieben, nie löschen. Bestehende Ziele werden nicht überschrieben.
function move(from, to) {
  if (!fs.existsSync(from)) return 0;
  let dst = to, i = 2;
  while (fs.existsSync(dst)) dst = to.replace(/(\.[^.\/]+)$/, " " + i++ + "$1");
  try { fs.renameSync(from, dst); } catch (e) { fs.copyFileSync(from, dst); fs.unlinkSync(from); }
  return 1;
}
function tidy(enc) {
  try {
    const list = JSON.parse(decodeURIComponent(enc));
    let n = 0;
    for (const m of list) {
      fs.mkdirSync(path.dirname(m.to), { recursive: true });
      n += move(m.from, m.to);
      n += move(m.from + ".asd", m.to + ".asd");
    }
    send("tidied", n);
  } catch (e) {
    send("tidyerror", encodeURIComponent(String(e && e.message || e)));
  }
}

if (maxApi) { maxApi.addHandler("job", handle); maxApi.addHandler("tidy", tidy); }
module.exports = { run, readAudio, cut, readWav, readAiff, tidy };
