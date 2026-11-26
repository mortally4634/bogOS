"use strict";
/* bogOS kernel — boots a windowed desktop whose filesystem organizes itself only by sorting.
   Loads the window manager, the filesystem, the sort drivers, and the apps, then boots. */

const DRIVERS = [
  "lib/fs.js","lib/wm.js",
  "algos/bogo.js","algos/bogobogo.js","algos/bubble.js","algos/insertion.js","algos/quick.js",
  "apps/terminal.js","apps/files.js","apps/visualizer.js","apps/editor.js","apps/monitor.js"
];

window.ALGOS = window.ALGOS || {};
window.APPS  = window.APPS  || {};

/* ---- shared system services ---- */
const SYS = window.SYS = {
  booted: Date.now(),
  algo: "bogo",
  listeners: {},
  on(ev, fn){ (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
  emit(ev, d){ (this.listeners[ev] || []).forEach(fn => fn(d)); },
  uptime(){ const s = ((Date.now()-this.booted)/1000)|0; return `${(s/60|0)}m ${s%60}s`; },
  notify(msg){
    const n = document.createElement("div");
    n.className = "toast"; n.textContent = msg;
    document.getElementById("desktop").appendChild(n);
    requestAnimationFrame(() => n.classList.add("show"));
    setTimeout(() => { n.classList.remove("show"); setTimeout(() => n.remove(), 300); }, 2600);
  }
};

/* ---- styles ---- */
document.head.insertAdjacentHTML("beforeend", `<style>
  :root{
    --bg:#15171b; --surface:#1b1e23; --chrome:#20242a; --field:#121419;
    --fg:#d9dce1; --dim:#848b96; --line:#2b2f37; --line2:#363b45;
    --accent:#9fb7c4;           /* one restrained steel accent */
    --accent2:#6f8a97;          /* dimmer steel, for secondary marks (chart bars) */
    --good:#8fb79a; --bad:#c89a9a;
    --ui:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
    color-scheme:dark;
  }
  *{box-sizing:border-box}
  html,body{height:100%;margin:0;overflow:hidden}
  body{background:var(--bg);color:var(--fg);font:13px/1.55 var(--ui);user-select:none;
    -webkit-font-smoothing:antialiased}

  button{font:inherit;cursor:pointer;color:var(--fg);background:transparent;
    border:1px solid var(--line);border-radius:5px;padding:4px 10px;transition:border-color .12s,background .12s}
  button:hover{border-color:var(--line2);background:rgba(255,255,255,.03)}
  button:active{background:rgba(255,255,255,.05)}
  input,textarea,select{font:inherit;color:var(--fg);background:var(--field);
    border:1px solid var(--line);border-radius:5px;outline:none}
  input:focus,textarea:focus,select:focus{border-color:var(--accent)}
  ::selection{background:rgba(159,183,196,.25)}

  /* boot */
  #boot{position:fixed;inset:0;z-index:5000;background:var(--bg);color:var(--dim);
    padding:40px;white-space:pre-wrap;font:12.5px/1.7 var(--mono);letter-spacing:.2px}
  #boot .cap{color:var(--fg)}
  #boot.hide{opacity:0;transition:opacity .5s;pointer-events:none}

  /* desktop */
  #desktop{position:absolute;inset:0 0 32px 0;background:var(--bg);overflow:hidden}
  #icons{position:absolute;top:16px;left:16px;display:flex;flex-direction:column;gap:6px}
  .icon{display:flex;flex-direction:column;align-items:center;gap:7px;width:74px;padding:8px 6px;border-radius:7px}
  .icon:hover{background:rgba(255,255,255,.04)}
  .icon .glyph{width:40px;height:40px;display:grid;place-items:center;border:1px solid var(--line);
    border-radius:9px;background:var(--surface);color:var(--accent);font:600 15px/1 var(--mono)}
  .icon .lbl{font-size:11px;color:var(--dim)}
  .wordmark{position:absolute;right:20px;bottom:46px;text-align:right;pointer-events:none;opacity:.7}
  .wordmark b{color:var(--fg);letter-spacing:.14em;font-weight:600;font-size:13px}
  .wordmark span{display:block;color:var(--dim);font-size:10px;margin-top:2px}

  /* windows */
  .win{position:absolute;min-width:260px;min-height:160px;background:var(--surface);
    border:1px solid var(--line);border-radius:9px;display:flex;flex-direction:column;overflow:hidden}
  .win.active{border-color:var(--line2);box-shadow:0 12px 34px rgba(0,0,0,.4)}
  .win .bar{display:flex;align-items:center;gap:8px;padding:0 6px 0 12px;height:34px;
    background:var(--chrome);border-bottom:1px solid var(--line);cursor:grab}
  .win .bar .t{flex:1;font-size:12px;font-weight:500;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .win .bar .btn{width:24px;height:24px;border:0;border-radius:5px;padding:0;color:var(--dim);
    font-size:14px;line-height:1;display:grid;place-items:center;background:transparent}
  .win .bar .btn:hover{background:rgba(255,255,255,.06);color:var(--fg)}
  .win .bar .btn.cls:hover{color:var(--bad)}
  .win .body{flex:1;overflow:auto;position:relative;background:var(--surface)}
  .win .rs{position:absolute;right:2px;bottom:2px;width:14px;height:14px;cursor:nwse-resize;opacity:.5;
    background:linear-gradient(135deg,transparent 55%,var(--line2) 55% 70%,transparent 70%)}

  /* taskbar */
  #taskbar{position:absolute;left:0;right:0;bottom:0;height:32px;background:var(--surface);
    border-top:1px solid var(--line);display:flex;align-items:center;gap:6px;padding:0 8px;z-index:400}
  #start{font-weight:600;font-size:12px;padding:3px 10px}
  #tasks{flex:1;display:flex;gap:6px;overflow:hidden}
  .task{font-size:11px;color:var(--dim);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 10px}
  .task.active{color:var(--fg);border-color:var(--line2);background:rgba(255,255,255,.04)}
  #tray{display:flex;gap:14px;align-items:center;color:var(--dim);font-size:11px}
  #algoind{font-family:var(--mono)}
  #clock{color:var(--fg);font-family:var(--mono);font-variant-numeric:tabular-nums}
  #menu{position:absolute;left:8px;bottom:40px;width:206px;background:var(--surface);border:1px solid var(--line);
    border-radius:9px;padding:6px;z-index:500;box-shadow:0 14px 34px rgba(0,0,0,.45)}
  #menu[hidden]{display:none}
  #menu .mi{display:flex;gap:10px;align-items:center;padding:7px 9px;border-radius:6px;font-size:12px}
  #menu .mi:hover{background:rgba(255,255,255,.05)}
  #menu .mi .g{color:var(--accent);width:18px;text-align:center;font-family:var(--mono);font-size:12px}

  /* toast */
  .toast{position:absolute;right:16px;bottom:16px;background:var(--chrome);border:1px solid var(--line2);
    border-radius:7px;padding:9px 13px;font-size:12px;color:var(--fg);opacity:0;transform:translateY(6px);transition:.25s;z-index:600}
  .toast.show{opacity:1;transform:none}

  /* shared app bits */
  .term{height:100%;display:flex;flex-direction:column;background:var(--field)}
  .term .log{flex:1;overflow:auto;white-space:pre-wrap;word-break:break-word;padding:11px 12px;font-family:var(--mono);font-size:12.5px;line-height:1.55}
  .term .log .u{color:var(--fg)} .dim{color:var(--dim)}.bad{color:var(--bad)}.good{color:var(--good)}.acc{color:var(--accent)}
  .term form{display:flex;gap:8px;border-top:1px solid var(--line);padding:9px 12px;align-items:center}
  .term #ps{color:var(--accent);font-family:var(--mono);font-size:12.5px}
  .term input{flex:1;border:0;background:transparent;font-family:var(--mono);font-size:12.5px;padding:0}
  .toolbar{display:flex;gap:7px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--line);background:var(--chrome);flex-wrap:wrap}
  .toolbar button,.toolbar select,.toolbar input{padding:3px 8px}
  .toolbar .path{color:var(--dim);font-size:11px;margin-left:4px;font-family:var(--mono)}
  .stat{font-family:var(--mono);font-size:11px;color:var(--dim)}
</style>`);

/* ---- boot sequence ---- */
function boot(){
  const log = [
    `<span class="cap">bogOS</span>  ·  ${Object.keys(ALGOS).length} sort modules`,
    ``,
    `mount  bogofs            ok`,
    `start  window manager    ok`,
    `note   filesystem order is not guaranteed`,
    ``,
    `ready.`
  ];
  const el = document.getElementById("boot");
  let i = 0;
  const step = () => {
    if(i < log.length){
      el.insertAdjacentHTML("beforeend", log[i] + "\n"); i++;
      setTimeout(step, 150 + Math.random()*90);
    } else {
      setTimeout(() => { el.classList.add("hide"); setTimeout(() => el.remove(), 550); startDesktop(); }, 450);
    }
  };
  step();
}

function startDesktop(){
  const icons = document.getElementById("icons");
  Object.entries(APPS).forEach(([id, app]) => {
    if(app.desktop === false) return;
    const el = document.createElement("div");
    el.className = "icon"; el.tabIndex = 0;
    el.innerHTML = `<span class="glyph">${app.glyph || "□"}</span><span class="lbl">${app.title}</span>`;
    el.ondblclick = () => app.launch();
    el.onkeydown = e => { if(e.key === "Enter") app.launch(); };
    icons.appendChild(el);
  });
  const menu = document.getElementById("menu");
  menu.innerHTML = Object.entries(APPS).map(([id, a]) =>
    `<div class="mi" data-app="${id}"><span class="g">${a.glyph || "□"}</span>${a.title}</div>`).join("");
  menu.onclick = e => { const mi = e.target.closest(".mi"); if(mi){ APPS[mi.dataset.app].launch(); menu.hidden = true; } };
  document.getElementById("start").onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
  document.addEventListener("click", () => menu.hidden = true);

  const clock = document.getElementById("clock");
  const tick = () => clock.textContent = new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  tick(); setInterval(tick, 1000);

  if(APPS.terminal) APPS.terminal.launch();
}

document.body.innerHTML = `
  <div id="desktop">
    <div id="icons"></div>
    <div class="wordmark"><b>bogOS</b><span>sorted by chance</span></div>
  </div>
  <div id="menu" hidden></div>
  <div id="taskbar">
    <button id="start">bogOS</button>
    <div id="tasks"></div>
    <div id="tray"><span id="algoind"></span><span id="clock"></span></div>
  </div>
  <div id="boot"></div>`;

const loadDriver = src => new Promise(res => {
  const s = document.createElement("script");
  s.src = src; s.onload = res;
  s.onerror = () => { console.warn("driver failed:", src); res(); };
  document.head.appendChild(s);
});

SYS.on("algo", a => { const t = document.getElementById("algoind"); if(t) t.textContent = "sort · " + a; });

DRIVERS.reduce((p, src) => p.then(() => loadDriver(src)), Promise.resolve()).then(() => {
  SYS.emit("algo", SYS.algo);
  boot();
});
