// Titremesiz hareket: fotograf klipleri ve kartlar zoompan kullanmamali (tam piksele yuvarlar, video titrer).
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const F = require("../lib/render-ffmpeg");
const K = require("../lib/render-klip");

const ayar = efekt => ({ W: 1080, H: 1920, SW: 1440, SH: 2560, FPS: 30, efekt, renkFiltresi: "null" });
const vf = (efekt, zin) => {
  const argv = K.klipArgv(ayar(efekt), { yol: "a.jpg", kare: 90, zin }, { ara: [] }, 2);
  return { argv, vf: argv[argv.indexOf("-vf") + 1] };
};

test("titreme: her efekt ve yonde kesirli pikselli perspective kullanilir, tek kareden tam kare sayisi cikar", () => {
  for (const efekt of ["yok", "yavas", "hizli", "kaydir", "zoom"]) for (const zin of [true, false]) {
    const { argv, vf: f } = vf(efekt, zin);
    assert.ok(!/zoompan/.test(f), efekt + " zoompan kullanmamali");
    assert.match(f, /loop=loop=89:size=1:start=0,setpts=N\/\(30\*TB\),fps=30,perspective=/);
    assert.match(f, /interpolation=linear:eval=frame,scale=1080:1920/);
    assert.ok(!argv.includes("-loop"), "girdi tek kare beslenir");
    assert.equal(argv[argv.indexOf("-frames:v") + 1], "90");
  }
});

test("titreme: renk ve olcek adimlari loop'tan once kalir (kare basina tekrar calismaz)", () => {
  const f = vf("hizli", true).vf;
  assert.ok(f.indexOf("scale=1440:2560") < f.indexOf("loop=loop"));
  assert.ok(f.indexOf("crop=1440:2560") < f.indexOf("loop=loop"));
});

test("titreme: kaydirma yonu xOran ile, zoom yonu z ile gelir", () => {
  assert.ok(vf("kaydir", true).vf.includes("*(on/90)"));
  assert.ok(vf("kaydir", false).vf.includes("*(1-on/90)"));
  assert.ok(vf("hizli", true).vf.includes("min(1+0.0009*on,1.30)"));
  assert.ok(vf("hizli", false).vf.includes("max(1.30-0.0009*on,1.0)"));
});

test("puruzsuzHareket: tek karelik klipte loop 0 olur, ortalanmis varsayilan", () => {
  const f = F.puruzsuzHareket({ z: "1", kare: 1, fps: 30, w: 100, h: 200 });
  assert.match(f, /^loop=loop=0:/);
  assert.ok(f.includes("x0='(W-W/(1))*(0.5)'"));
});

test("titreme: lib altinda zoompan filtresi cagrisi kalmadi", () => {
  const dizin = path.join(__dirname, "..", "lib");
  for (const ad of fs.readdirSync(dizin).filter(x => x.endsWith(".js")))
    assert.ok(!/zoompan=/.test(fs.readFileSync(path.join(dizin, ad), "utf8")), ad + " zoompan= iceriyor");
});
