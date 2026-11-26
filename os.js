"use strict";
// bogOS kernel: builds its own screen, loads the sort drivers, then runs the shell.
// The filesystem only ever reorders itself by running a sort algorithm.

const DRIVERS = ["algos/bogo.js","algos/bubble.js","algos/insertion.js","algos/quick.js"];

document.head.insertAdjacentHTML("beforeend", `<style>
  :root{--bg:#0b1a12;--fg:#9df5c4;--dim:#4f7e63;--accent:#f2c14e;--bad:#ff6b6b;--good:#7ee787;--line:#16422d}
  :root[data-theme="light"]{--bg:#f4f6f2;--fg:#123a26;--dim:#6b8c7a;--accent:#b7791f;--bad:#c0392b;--good:#1f7a43;--line:#d7e2da;color-scheme:light}
  html,body{height:100%}
  body{margin:0;background:var(--bg);color:var(--fg);font:14px ui-monospace,Menlo,Consolas,monospace}
  #scr{height:100%;max-width:820px;margin:0 auto;display:flex;flex-direction:column;box-sizing:border-box;
    padding-block:14px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
  header{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;border-bottom:1px solid var(--line);padding-bottom:8px}
  h1{margin:0;font-size:1rem;letter-spacing:.14em;color:var(--accent)}
  .dim{color:var(--dim)}.bad{color:var(--bad)}.good{color:var(--good)}.u{color:var(--accent)}
  #log{flex:1;overflow-y:auto;white-space:pre-wrap;word-break:break-word;line-height:1.5;min-width:0;padding:8px 0}
  form{display:flex;gap:8px;border-top:1px solid var(--line);padding-top:8px}
  input{flex:1;min-width:0;background:transparent;border:0;color:var(--fg);font:inherit;outline:none;caret-color:var(--accent)}
  button{background:transparent;border:1px solid var(--line);color:var(--dim);font:inherit;font-size:.7rem;border-radius:6px;padding:3px 8px;cursor:pointer}
</style>`);

document.body.innerHTML = `<div id="scr">
  <header><h1>bogOS</h1><span class="dim" style="font-size:.72rem">sorted by chance — unless you install better luck · type help</span>
  <span style="flex:1"></span><button id="theme">theme</button></header>
  <div id="log" aria-live="polite"></div>
  <form id="cmd" autocomplete="off"><span class="u">~$</span><input id="in" autofocus spellcheck="false" aria-label="command"></form>
</div>`;

const ALGOS = window.ALGOS = window.ALGOS || {};
const log = document.getElementById("log"), input = document.getElementById("in");
let files = ["readme.txt","kernel.img","todo.md","cat.gif","bogo.conf"];
let current = "bogo";

const esc = s => s.replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
function print(html, cls){
  const d = document.createElement("div");
  if(cls) d.className = cls;
  d.innerHTML = html;
  log.appendChild(d); log.scrollTop = log.scrollHeight;
}
const sorted = a => a.every((v,i) => i===0 || a[i-1] <= v);

function doSort(){
  const algo = ALGOS[current];
  if(sorted(files)){ print('<span class="dim">already in order (it happens).</span>'); return; }
  const r = algo.run(files.slice());
  if(r.gaveUp){
    print(`<span class="bad">${algo.name}: gave up after ${r.steps.toLocaleString()} shuffles — still a mess. install something better: <span class="dim">use quick</span></span>`);
    return;
  }
  files = r.result;
  print(`<span class="good">sorted via ${algo.name} in ${r.steps.toLocaleString()} step${r.steps===1?"":"s"}.</span>`);
}

const HELP = `commands:
  ls              list the directory in its current arrangement
  touch <name>    create a file (the OS re-sorts with the active algorithm)
  rm <name>       delete a file
  algos           list installed sorting algorithms
  use <algo>      make <algo> the active sorter
  sort            sort the directory now, with the active algorithm
  status          sorted or not, and what's active
  clear | about | help`;

function run(raw){
  const line = raw.trim();
  print('<span class="u">~$ '+esc(line)+'</span>');
  if(!line) return;
  const [c, ...rest] = line.split(/\s+/), arg = rest.join(" ");
  switch(c){
    case "help": print(HELP); break;
    case "about": print(`bogOS v0.3 — the kernel builds its own screen and loads sort drivers from\nseparate files. The filesystem organizes itself only by sorting; it ships\nwith bogo sort (shuffle, check, repeat; O(n·n!)). \`algos\` lists the rest.`); break;
    case "ls":
      if(!files.length){ print('<span class="dim">(empty)</span>'); break; }
      print(files.join("  ") + (sorted(files)?'   <span class="good">[sorted ✓]</span>':'   <span class="bad">[unsorted ✗]</span>'));
      break;
    case "status":
      print((sorted(files)?'<span class="good">sorted.</span>':'<span class="bad">not sorted.</span>')+` active algorithm: <b>${current}</b>`);
      break;
    case "algos":
      print(Object.values(ALGOS).map(a => `  ${a.name===current?"*":" "} ${a.name.padEnd(10)} ${a.blurb}`).join("\n")+'\n<span class="dim">* = active · use &lt;name&gt; to switch</span>');
      break;
    case "use":
      if(!ALGOS[arg]){ print('<span class="bad">use: no algorithm named '+esc(arg)+' — try: algos</span>'); break; }
      current = arg; print('active sorter is now <b>'+esc(arg)+'</b>.'); break;
    case "touch":
      if(!arg){ print('<span class="bad">touch: needs a filename</span>'); break; }
      if(files.includes(arg)){ print('<span class="bad">touch: '+esc(arg)+' already exists</span>'); break; }
      files.push(arg); print('created <b>'+esc(arg)+'</b>. re-sorting…'); doSort(); break;
    case "rm":
      if(!arg){ print('<span class="bad">rm: needs a filename</span>'); break; }
      if(!files.includes(arg)){ print('<span class="bad">rm: '+esc(arg)+': no such file</span>'); break; }
      files = files.filter(f => f!==arg); print('removed <b>'+esc(arg)+'</b>.'); break;
    case "sort": doSort(); break;
    case "clear": log.innerHTML=""; break;
    default: print('<span class="bad">'+esc(c)+': command not found</span> <span class="dim">(try: help)</span>');
  }
}

function startShell(){
  document.getElementById("cmd").addEventListener("submit", e => { e.preventDefault(); const v=input.value; input.value=""; run(v); });
  document.getElementById("theme").addEventListener("click", () => { const r=document.documentElement; r.setAttribute("data-theme", r.getAttribute("data-theme")==="light"?"dark":"light"); });
  document.getElementById("scr").addEventListener("click", () => input.focus());
  print('<span class="dim">booting bogOS… '+Object.keys(ALGOS).length+' sort driver(s) loaded. order still not guaranteed.</span>');
  print(HELP);
  input.focus();
}

// load each sort driver, then start. a driver that fails to load is skipped, not fatal.
const loadDriver = src => new Promise(res => {
  const s = document.createElement("script");
  s.src = src; s.onload = res; s.onerror = () => { print('<span class="bad">driver failed to load: '+esc(src)+'</span>'); res(); };
  document.head.appendChild(s);
});
DRIVERS.reduce((p, src) => p.then(() => loadDriver(src)), Promise.resolve()).then(startShell);
