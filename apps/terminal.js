"use strict";
/* Terminal app — a shell over the bogo filesystem. */
(window.APPS = window.APPS || {}).terminal = {
  title: "Terminal", glyph: "▓",
  launch(){
    WM.open({ title: "Terminal", icon: "▓", w: 560, h: 360, mount: mountTerminal });
  }
};

function mountTerminal(body){
  body.innerHTML = `<div class="term"><div class="log"></div>
    <form autocomplete="off"><span class="u" id="ps">~$</span><input aria-label="command" autofocus spellcheck="false"></form></div>`;
  const log = body.querySelector(".log"), form = body.querySelector("form"), input = body.querySelector("input"), ps = body.querySelector("#ps");
  const esc = s => String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const print = (html, cls) => { const d = document.createElement("div"); if(cls) d.className = cls; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; };
  const prompt = () => ps.textContent = FS.pwd().replace(/^\/$/, "/") + " $";
  const hist = []; let hi = 0;

  const HELP = `commands:
  ls              list the current directory
  cd <dir>        change directory (.. to go up)
  pwd             print working directory
  mkdir <name>    make a directory        touch <name>  make a file
  cat <file>      print a file            rm <name>     delete
  mv <a> <b>      rename                  edit <file>   open in the editor
  algos           list sort algorithms    use <algo>    set the active sorter
  sort            reorganize this dir with the active algorithm
  status          sorted? and what's active
  open <app>      launch an app (files, visualizer, editor, monitor)
  clear · about · help`;

  function run(line){
    print('<span class="u">'+esc(ps.textContent)+' '+esc(line)+'</span>');
    line = line.trim(); if(!line) return;
    const [c, ...rest] = line.split(/\s+/), arg = rest.join(" ");
    try{
      switch(c){
        case "help": print(HELP); break;
        case "about": print(`bogOS v0.4 — a windowed OS whose filesystem organizes itself only by\nsorting, and defaults to bogo sort. Open apps from the desktop or the\nbogOS menu. Everything is saved in your browser.`); break;
        case "ls": {
          const items = FS.list();
          if(!items.length){ print('<span class="dim">(empty)</span>'); break; }
          print(items.map(e => e.type==="dir"?`<span class="acc">${esc(e.name)}/</span>`:esc(e.name)).join("  ")
            + (FS.isSorted()?'   <span class="good">[sorted ✓]</span>':'   <span class="bad">[unsorted ✗]</span>')); break;
        }
        case "cd": FS.cd(arg||"/"); prompt(); break;
        case "pwd": print(FS.pwd()); break;
        case "mkdir": if(!arg) throw "mkdir: needs a name"; FS.mkdir(arg); print('created '+esc(arg)+'/'); break;
        case "touch": if(!arg) throw "touch: needs a name"; FS.touch(arg); print('created '+esc(arg)+'. '+reorgNote()); doSort(true); break;
        case "cat": print(esc(FS.read(arg))); break;
        case "rm": if(!arg) throw "rm: needs a name"; FS.rm(arg); print('removed '+esc(arg)); break;
        case "mv": { const [a,b]=rest; if(!a||!b) throw "mv: needs <a> <b>"; FS.mv(a,b); print('renamed '+esc(a)+' → '+esc(b)); break; }
        case "edit": if(!arg) throw "edit: needs a file"; APPS.editor.launch(FS.pwd()==="/"?("/"+arg):(FS.pwd()+"/"+arg)); break;
        case "algos": print(Object.values(ALGOS).map(a=>`  ${a.name===SYS.algo?"*":" "} ${a.name.padEnd(10)} ${a.blurb}`).join("\n")); break;
        case "use": if(!ALGOS[arg]) throw "no such algorithm: "+arg+" (try: algos)"; SYS.algo=arg; SYS.emit("algo",arg); print('active sorter is now <b>'+esc(arg)+'</b>'); break;
        case "sort": doSort(false); break;
        case "status": print((FS.isSorted()?'<span class="good">this directory is sorted.</span>':'<span class="bad">this directory is not sorted.</span>')+' active: <b>'+SYS.algo+'</b>'); break;
        case "open": { const a=APPS[arg]; if(!a) throw "no such app: "+arg; a.launch(); break; }
        case "clear": log.innerHTML=""; break;
        default: print('<span class="bad">'+esc(c)+': command not found</span> <span class="dim">(try: help)</span>');
      }
    }catch(err){ print('<span class="bad">'+esc(err)+'</span>'); }
  }
  const reorgNote = () => 'the OS insists on re-sorting…';
  function doSort(quiet){
    if(FS.isSorted()){ if(!quiet) print('<span class="dim">already in order (it happens).</span>'); return; }
    const r = FS.reorganize(SYS.algo);
    if(r.gaveUp) print(`<span class="bad">${SYS.algo}: gave up after ${r.steps.toLocaleString()} shuffles — still a mess. try: use quick</span>`);
    else print(`<span class="good">sorted via ${SYS.algo} in ${r.steps.toLocaleString()} step${r.steps===1?"":"s"}.</span>`);
  }

  form.onsubmit = e => { e.preventDefault(); const v=input.value; input.value=""; if(v.trim()){ hist.push(v); hi=hist.length; } run(v); };
  input.onkeydown = e => {
    if(e.key==="ArrowUp"){ if(hi>0){ hi--; input.value=hist[hi]; e.preventDefault(); } }
    else if(e.key==="ArrowDown"){ if(hi<hist.length-1){ hi++; input.value=hist[hi]; } else { hi=hist.length; input.value=""; } }
  };
  body.addEventListener("click", () => input.focus());
  prompt();
  print('<span class="dim">bogOS terminal · '+Object.keys(ALGOS).length+' sort algorithms loaded · type help</span>');
  setTimeout(() => input.focus(), 0);
}
