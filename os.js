"use strict";
// bogOS shell: a filesystem that only reorders itself by running a sort algorithm.
// Default is bogo (pure chance). `use <algo>` swaps in a faster one.
const ALGOS = window.ALGOS || {};
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
  const r = algo.run(files.slice()); // run on a copy; only keep the result if it finished
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
    case "about": print(`bogOS v0.2 — the filesystem organizes itself only by sorting, and ships\nwith bogo sort (shuffle, check, repeat; O(n·n!)). Faster algorithms are\noptional add-ons. Each lives in its own file. \`algos\` shows them.`); break;
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

document.getElementById("cmd").addEventListener("submit", e => { e.preventDefault(); const v=input.value; input.value=""; run(v); });
document.getElementById("theme").addEventListener("click", () => { const r=document.documentElement; r.setAttribute("data-theme", r.getAttribute("data-theme")==="light"?"dark":"light"); });
document.getElementById("scr").addEventListener("click", () => input.focus());

print('<span class="dim">booting bogOS… '+Object.keys(ALGOS).length+' sorting algorithms installed. order still not guaranteed.</span>');
print(HELP);
