"use strict";
/* bogOS window manager: draggable, resizable, focusable windows + taskbar buttons. */
window.WM = (function(){
  let z = 20;
  const wins = new Map(); // id -> win
  let seq = 0;

  function tasksEl(){ return document.getElementById("tasks"); }

  function focus(win){
    wins.forEach(w => { w.el.classList.toggle("active", w === win); if(w.task) w.task.classList.toggle("active", w === win); });
    win.el.style.zIndex = ++z;
  }

  function drag(win, handle){
    handle.addEventListener("pointerdown", e => {
      if(e.target.classList.contains("btn")) return;
      focus(win);
      const r = win.el.getBoundingClientRect();
      const ox = e.clientX - r.left, oy = e.clientY - r.top;
      handle.setPointerCapture(e.pointerId);
      const move = ev => {
        win.el.style.left = Math.max(0, Math.min(window.innerWidth - 40, ev.clientX - ox)) + "px";
        win.el.style.top  = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - oy)) + "px";
      };
      const up = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    });
  }

  function resize(win, grip){
    grip.addEventListener("pointerdown", e => {
      e.stopPropagation(); focus(win);
      const r = win.el.getBoundingClientRect();
      const ox = e.clientX, oy = e.clientY, w0 = r.width, h0 = r.height;
      grip.setPointerCapture(e.pointerId);
      const move = ev => {
        win.el.style.width  = Math.max(240, w0 + ev.clientX - ox) + "px";
        win.el.style.height = Math.max(150, h0 + ev.clientY - oy) + "px";
      };
      const up = () => { grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); };
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", up);
    });
  }

  function open(opts){
    if(opts.id && wins.has(opts.id)){ const w = wins.get(opts.id); w.el.hidden = false; focus(w); return w; }
    const id = opts.id || ("win" + (++seq));
    const el = document.createElement("div");
    el.className = "win";
    const w = Math.min(opts.w || 460, window.innerWidth - 40);
    const h = Math.min(opts.h || 320, window.innerHeight - 80);
    el.style.width = w + "px"; el.style.height = h + "px";
    el.style.left = (opts.x ?? (40 + (seq*26)%180)) + "px";
    el.style.top  = (opts.y ?? (40 + (seq*26)%120)) + "px";
    el.innerHTML = `<div class="bar"><span class="t">${opts.title||"window"}</span>
      <button class="btn min" title="minimize">–</button><button class="btn cls" title="close">×</button></div>
      <div class="body"></div><div class="rs"></div>`;
    document.getElementById("desktop").appendChild(el);

    const task = document.createElement("button");
    task.className = "task"; task.textContent = opts.title || "window";
    tasksEl().appendChild(task);

    const win = { id, el, body: el.querySelector(".body"), task,
      setTitle(t){ el.querySelector(".t").textContent = t; task.textContent = t; },
      focus(){ focus(win); },
      close(){ el.remove(); task.remove(); wins.delete(id); opts.onClose && opts.onClose(); } };
    wins.set(id, win);

    el.querySelector(".cls").onclick = win.close;
    el.querySelector(".min").onclick = () => { el.hidden = true; };
    task.onclick = () => { if(el.hidden){ el.hidden = false; focus(win); } else if(el.classList.contains("active")){ el.hidden = true; } else focus(win); };
    el.addEventListener("pointerdown", () => focus(win), true);
    drag(win, el.querySelector(".bar"));
    resize(win, el.querySelector(".rs"));
    focus(win);

    opts.mount && opts.mount(win.body, win);
    return win;
  }

  return { open };
})();
