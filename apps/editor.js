"use strict";
/* Text Editor — edit files stored in the bogo filesystem. */
(window.APPS = window.APPS || {}).editor = {
  title: "Editor", glyph: "✎",
  launch(filePath){
    WM.open({ title: filePath ? "Editor — " + filePath : "Editor", icon: "✎", w: 480, h: 340,
      mount: (body, win) => mountEditor(body, win, filePath) });
  }
};

function mountEditor(body, win, filePath){
  let content = "";
  if(filePath){ try{ content = FS.read(filePath); }catch(e){ /* new/unknown file */ } }
  body.innerHTML = `<div style="height:100%;display:flex;flex-direction:column">
    <div class="toolbar">
      <button data-a="save">💾 Save</button>
      <input class="fn" placeholder="/path/to/file.txt" value="${(filePath||"").replace(/"/g,'&quot;')}" style="flex:1;padding:3px 7px">
    </div>
    <textarea class="ed" spellcheck="false" style="flex:1;border:0;border-radius:0;padding:10px;resize:none;background:#06120f"></textarea>
    <div class="st" style="padding:5px 10px;border-top:1px solid var(--line);color:var(--dim);font-size:11px"></div>
  </div>`;
  const ta = body.querySelector(".ed"), fn = body.querySelector(".fn"), st = body.querySelector(".st");
  ta.value = content;
  const count = () => st.textContent = `${ta.value.length} chars · ${ta.value.split(/\n/).length} lines`;
  ta.oninput = count; count();
  body.querySelector(".toolbar").onclick = e => {
    if(e.target.closest("button")?.dataset.a !== "save") return;
    const p = fn.value.trim();
    if(!p){ SYS.notify("editor: give the file a path first"); return; }
    try{ FS.write(p, ta.value); win.setTitle("Editor — " + p); SYS.notify("saved " + p); }
    catch(err){ SYS.notify(String(err)); }
  };
}
