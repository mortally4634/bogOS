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
  algo: "bogo",                         // the active sorting algorithm, shared OS-wide
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
    --bg0:#071512; --bg1:#0c2a22; --panel:#0d1f1a; --chrome:#10322a; --fg:#c8f5df; --dim:#5f9c82;
    --accent:#f2c14e; --accent2:#54c7a0; --bad:#ff6b6b; --good:#7ee787; --line:#1d4a3b;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
    color-scheme:dark;
  }
  *{box-sizing:border-box}
  html,body{height:100%;margin:0;overflow:hidden}
  body{background:var(--bg0);color:var(--fg);font:13px/1.5 var(--mono);user-select:none}
  button{font:inherit;cursor:pointer;color:var(--fg);background:var(--chrome);border:1px solid var(--line);border-radius:6px;padding:4px 9px}
  button:hover{border-color:var(--accent2)}
  button:active{transform:translateY(1px)}
  input,textarea{font:inherit;color:var(--fg);background:#06120f;border:1px solid var(--line);border-radius:6px;outline:none}
  input:focus,textarea:focus{border-color:var(--accent2)}

  /* scanline / CRT atmosphere */
  #crt{position:fixed;inset:0;pointer-events:none;z-index:9999;
    background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px);
    mix-blend-mode:multiply;opacity:.5}
  #crt::after{content:"";position:absolute;inset:0;background:radial-gradient(130% 110% at 50% 50%,transparent 60%,rgba(0,0,0,.45))}

  /* boot */
  #boot{position:fixed;inset:0;z-index:5000;background:#030b09;color:var(--good);
    padding:28px;white-space:pre-wrap;font-size:13px;overflow:hidden}
  #boot .cap{color:var(--accent)}
  #boot.hide{opacity:0;transition:opacity .6s;pointer-events:none}

  /* desktop */
  #desktop{position:absolute;inset:0 0 34px 0;
    background:
      radial-gradient(90% 70% at 50% -10%,var(--bg1),transparent 70%),
      linear-gradient(160deg,var(--bg0),#04100d);
    overflow:hidden}
  #icons{position:absolute;top:14px;left:14px;display:flex;flex-direction:column;gap:14px}
  .icon{width:78px;display:flex;flex-direction:column;align-items:center;gap:5px;padding:6px;border-radius:8px;text-align:center;color:var(--fg)}
  .icon:hover{background:rgba(84,199,160,.12)}
  .icon .glyph{font-size:24px;line-height:1}
  .icon .lbl{font-size:11px;color:var(--dim)}
  .wordmark{position:absolute;right:18px;bottom:46px;text-align:right;opacity:.5;pointer-events:none}
  .wordmark b{color:var(--accent);letter-spacing:.2em;font-size:15px}
  .wordmark span{display:block;color:var(--dim);font-size:10px}

  /* windows */
  .win{position:absolute;min-width:240px;min-height:150px;background:var(--panel);
    border:1px solid var(--line);border-radius:10px;box-shadow:0 18px 50px rgba(0,0,0,.55);
    display:flex;flex-direction:column;overflow:hidden}
  .win.active{border-color:var(--accent2);box-shadow:0 22px 60px rgba(0,0,0,.65)}
  .win .bar{display:flex;align-items:center;gap:8px;padding:7px 9px;background:var(--chrome);
    border-bottom:1px solid var(--line);cursor:grab}
  .win .bar .ico{color:var(--accent2)}
  .win .bar .t{flex:1;font-size:12px;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .win .bar .btn{width:16px;height:16px;border-radius:50%;border:0;padding:0;cursor:pointer}
  .btn.min{background:#f2c14e}.btn.cls{background:#ff6b6b}
  .win .body{flex:1;overflow:auto;position:relative}
  .win .rs{position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;
    background:linear-gradient(135deg,transparent 50%,var(--line) 50%)}

  /* taskbar */
  #taskbar{position:absolute;left:0;right:0;bottom:0;height:34px;background:#06140f;
    border-top:1px solid var(--line);display:flex;align-items:center;gap:6px;padding:0 8px;z-index:400}
  #start{font-weight:bold;color:var(--accent);background:transparent;border:0}
  #tasks{flex:1;display:flex;gap:6px;overflow:hidden}
  .task{font-size:11px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:var(--chrome)}
  .task.active{border-color:var(--accent2);color:var(--fg)}
  #tray{display:flex;gap:10px;align-items:center;color:var(--dim);font-size:11px}
  #clock{color:var(--fg)}
  #menu{position:absolute;left:8px;bottom:40px;width:210px;background:var(--panel);border:1px solid var(--line);
    border-radius:10px;padding:6px;z-index:500;box-shadow:0 18px 40px rgba(0,0,0,.6)}
  #menu[hidden]{display:none}
  #menu .mi{display:flex;gap:9px;align-items:center;padding:7px 9px;border-radius:7px}
  #menu .mi:hover{background:rgba(84,199,160,.14)}
  #menu .mi .g{color:var(--accent2);width:18px;text-align:center}

  /* toast */
  .toast{position:absolute;right:16px;bottom:16px;background:var(--chrome);border:1px solid var(--accent2);
    border-radius:8px;padding:9px 13px;font-size:12px;opacity:0;transform:translateY(8px);transition:.3s;z-index:600}
  .toast.show{opacity:1;transform:none}

  /* generic app bits reused by apps */
  .term{height:100%;display:flex;flex-direction:column;background:#06120f}
  .term .log{flex:1;overflow:auto;white-space:pre-wrap;word-break:break-word;padding:9px}
  .term .log .u{color:var(--accent)} .dim{color:var(--dim)}.bad{color:var(--bad)}.good{color:var(--good)}.acc{color:var(--accent)}
  .term form{display:flex;gap:7px;border-top:1px solid var(--line);padding:7px}
  .term input{flex:1;border:0;background:transparent}
  .toolbar{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--line);background:var(--chrome);flex-wrap:wrap}
  .toolbar .path{color:var(--dim);font-size:11px;margin-left:4px}
  select{font:inherit;color:var(--fg);background:#06120f;border:1px solid var(--line);border-radius:6px;padding:3px 6px}
</style>`);

/* ---- boot sequence ---- */
function boot(){
  const log = [
    `<span class="cap">bogBIOS v0.4</span>  (c) Entropy Systems`,
    `  CPU: 1 x VirtuaCore @ ??? GHz        [ok]`,
    `  RAM: counting… gave up, probably enough [ok]`,
    `  sort coprocessor: bogo unit online      [ok]`,
    ``,
    `mounting bogofs …                         [ok]`,
    `loading sort drivers: ${Object.keys(ALGOS).join(", ")}`,
    `starting window manager …                 [ok]`,
    `WARNING: filesystem order is not, and will never be, guaranteed`,
    ``,
    `welcome to bogOS.`
  ];
  const el = document.getElementById("boot");
  let i = 0;
  const step = () => {
    if(i < log.length){
      el.insertAdjacentHTML("beforeend", log[i] + "\n");
      i++;
      setTimeout(step, 230 + Math.random()*160);
    } else {
      setTimeout(() => {
        el.classList.add("hide");
        setTimeout(() => el.remove(), 650);
        startDesktop();
      }, 650);
    }
  };
  step();
}

function startDesktop(){
  // desktop icons for every app that wants one
  const icons = document.getElementById("icons");
  Object.entries(APPS).forEach(([id, app]) => {
    if(app.desktop === false) return;
    const el = document.createElement("div");
    el.className = "icon"; el.tabIndex = 0;
    el.innerHTML = `<span class="glyph">${app.glyph || "▢"}</span><span class="lbl">${app.title}</span>`;
    el.ondblclick = () => app.launch();
    el.onkeydown = e => { if(e.key === "Enter") app.launch(); };
    icons.appendChild(el);
  });
  // start menu
  const menu = document.getElementById("menu");
  menu.innerHTML = Object.entries(APPS).map(([id, a]) =>
    `<div class="mi" data-app="${id}"><span class="g">${a.glyph || "▢"}</span>${a.title}</div>`).join("");
  menu.onclick = e => { const mi = e.target.closest(".mi"); if(mi){ APPS[mi.dataset.app].launch(); menu.hidden = true; } };
  document.getElementById("start").onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
  document.addEventListener("click", () => menu.hidden = true);

  // clock
  const clock = document.getElementById("clock");
  const tick = () => clock.textContent = new Date().toLocaleTimeString();
  tick(); setInterval(tick, 1000);

  // open the terminal to greet
  if(APPS.terminal) APPS.terminal.launch();
  SYS.notify("bogOS ready. your files are a mess. this is fine.");
}

/* build the shell DOM, then load drivers and boot */
document.body.innerHTML = `
  <div id="crt"></div>
  <div id="desktop">
    <div id="icons"></div>
    <div class="wordmark"><b>bogOS</b><span>sorted by chance</span></div>
  </div>
  <div id="menu" hidden></div>
  <div id="taskbar">
    <button id="start">bogOS ▴</button>
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

// reflect the active algorithm in the tray
SYS.on("algo", a => { const t = document.getElementById("algoind"); if(t) t.textContent = "sort: " + a; });

DRIVERS.reduce((p, src) => p.then(() => loadDriver(src)), Promise.resolve()).then(() => {
  SYS.emit("algo", SYS.algo);
  boot();
});
