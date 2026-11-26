"use strict";
/* Files — a graphical browser over the bogo filesystem. Entries appear in whatever
   order the filesystem is in; the Sort button reorganizes with the active algorithm. */
(window.APPS = window.APPS || {}).files = {
  title: "Files", glyph: "F",
  launch(){ WM.open({ title: "Files", icon: "🗂", w: 520, h: 360, mount: mountFiles }); }
};

function mountFiles(body){
  let path = []; // view path (array of names from root)
  const esc = s => String(s).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  body.innerHTML = `<div style="height:100%;display:flex;flex-direction:column">
    <div class="toolbar">
      <button data-a="up">↑ Up</button>
      <button data-a="mkdir">+ Folder</button>
      <button data-a="touch">+ File</button>
      <button data-a="sort">Sort</button>
      <select class="algo"></select>
      <span class="path"></span>
    </div>
    <div class="grid" style="flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,88px);gap:10px;padding:12px;align-content:start"></div>
    <div class="status" style="padding:6px 10px;border-top:1px solid var(--line);color:var(--dim);font-size:11px"></div>
  </div>`;
  const grid = body.querySelector(".grid"), pathEl = body.querySelector(".path"),
        statusEl = body.querySelector(".status"), sel = body.querySelector(".algo");
  sel.innerHTML = Object.keys(ALGOS).map(n => `<option ${n===SYS.algo?"selected":""}>${n}</option>`).join("");
  sel.onchange = () => { SYS.algo = sel.value; SYS.emit("algo", sel.value); };
  SYS.on("algo", a => { if(sel.value!==a) sel.value = a; });

  function uniqueName(base){ const d = FS.nodeAt(path); let n = base, i = 1; while(d.children[n]) n = base + (++i); return n; }

  function render(editName){
    const items = FS.list(path);
    pathEl.textContent = "/" + path.join("/");
    const names = items.map(e => e.name);
    const sorted = names.every((v,i)=>i===0||names[i-1]<=v);
    statusEl.innerHTML = `${items.length} item(s) · ` + (sorted?'<span class="good">sorted ✓</span>':'<span class="bad">unsorted ✗ — hit Sort</span>');
    grid.innerHTML = "";
    items.forEach(e => {
      const d = document.createElement("div");
      d.className = "icon"; d.style.width = "88px"; d.tabIndex = 0;
      d.innerHTML = `<span class="glyph">${e.type==="dir"?"▸":"·"}</span><span class="lbl" data-name="${esc(e.name)}">${esc(e.name)}</span>`;
      d.ondblclick = () => {
        if(e.type==="dir"){ path = path.concat(e.name); render(); }
        else APPS.editor.launch("/" + path.concat(e.name).join("/"));
      };
      grid.appendChild(d);
      if(e.name === editName) beginRename(d.querySelector(".lbl"), e.name);
    });
  }

  function beginRename(lbl, oldName){
    lbl.contentEditable = "true"; lbl.focus();
    const r = document.createRange(); r.selectNodeContents(lbl);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    const commit = () => {
      lbl.contentEditable = "false";
      const nn = lbl.textContent.trim().replace(/\//g,"");
      const d = FS.nodeAt(path);
      if(nn && nn !== oldName && !d.children[nn]){
        d.children[nn] = d.children[oldName]; delete d.children[oldName];
        d.order = d.order.map(x => x===oldName ? nn : x); FS.save();
      }
      render();
    };
    lbl.onblur = commit;
    lbl.onkeydown = ev => { if(ev.key==="Enter"){ ev.preventDefault(); lbl.blur(); } if(ev.key==="Escape"){ lbl.textContent = oldName; lbl.blur(); } };
  }

  body.querySelector(".toolbar").onclick = e => {
    const a = e.target.closest("button")?.dataset.a; if(!a) return;
    const d = FS.nodeAt(path);
    try{
      if(a==="up"){ if(path.length){ path.pop(); render(); } }
      else if(a==="mkdir"){ const n = uniqueName("folder"); d.children[n] = {type:"dir",children:{},order:[]}; d.order.push(n); FS.save(); render(n); }
      else if(a==="touch"){ const n = uniqueName("file"); d.children[n] = {type:"file",content:""}; d.order.push(n); FS.save(); render(n); }
      else if(a==="sort"){
        const r = FS.reorganize(SYS.algo, path);
        SYS.notify(r.gaveUp ? `${SYS.algo} gave up after ${r.steps.toLocaleString()} shuffles — still a mess.`
                            : `sorted via ${SYS.algo} in ${r.steps.toLocaleString()} steps.`);
        render();
      }
    }catch(err){ SYS.notify(String(err)); }
  };
  render();
}
