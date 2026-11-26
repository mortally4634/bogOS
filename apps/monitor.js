"use strict";
/* System Monitor — uptime, the active sorter, and the processes keeping bogOS busy. */
(window.APPS = window.APPS || {}).monitor = {
  title: "Monitor", glyph: "M",
  launch(){ WM.open({ title: "System Monitor", icon: "📈", w: 420, h: 320, mount: mountMonitor }); }
};

function mountMonitor(body){
  const procs = [
    { pid: 1,   name: "bogod",     note: "reorganizing filesystem (will not finish)" },
    { pid: 7,   name: "kernel",    note: "pretending to be an OS" },
    { pid: 42,  name: "entropyd",  note: "generating disorder" },
    { pid: 101, name: "wm",        note: "dragging windows" },
    { pid: 256, name: "hope",      note: "zombie" }
  ];
  body.innerHTML = `<div style="padding:12px;display:flex;flex-direction:column;gap:12px;height:100%">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="tile"><div class="k">uptime</div><div class="v up"></div></div>
      <div class="tile"><div class="k">active sorter</div><div class="v al"></div></div>
      <div class="tile"><div class="k">entropy</div><div class="v">maximum</div></div>
      <div class="tile"><div class="k">files sorted</div><div class="v">0 (as expected)</div></div>
    </div>
    <div style="flex:1;overflow:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="color:var(--dim);text-align:left"><th style="padding:4px 6px">PID</th><th>process</th><th>CPU</th><th>note</th></tr></thead>
        <tbody class="pl"></tbody>
      </table>
    </div>
  </div>
  <style>
    .tile{background:var(--chrome);border:1px solid var(--line);border-radius:8px;padding:9px}
    .tile .k{color:var(--dim);font-size:11px}.tile .v{color:var(--accent);font-size:16px;margin-top:3px}
    .pl td{padding:4px 6px;border-top:1px solid var(--line)}
  </style>`;
  const up = body.querySelector(".up"), al = body.querySelector(".al"), pl = body.querySelector(".pl");
  const render = () => {
    up.textContent = SYS.uptime();
    al.textContent = SYS.algo;
    pl.innerHTML = procs.map(p =>
      `<tr><td>${p.pid}</td><td class="acc">${p.name}</td><td>${p.name==="bogod"?(90+Math.floor(Math.random()*10)):(Math.floor(Math.random()*4))}%</td><td class="dim">${p.note}</td></tr>`).join("");
  };
  render();
  const t = setInterval(render, 1000);
  // stop ticking when the window's body is removed from the DOM
  const obs = new MutationObserver(() => { if(!body.isConnected){ clearInterval(t); obs.disconnect(); } });
  obs.observe(document.getElementById("desktop"), { childList:true, subtree:true });
}
