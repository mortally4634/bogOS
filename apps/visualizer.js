"use strict";
/* Sort Visualizer — animates each algorithm on a bar chart so you can see why
   bogo sort is a catastrophe and quicksort is not. */
(window.APPS = window.APPS || {}).visualizer = {
  title: "Sorter", glyph: "S",
  launch(){ WM.open({ title: "Sort Visualizer", icon: "📊", w: 560, h: 400, mount: mountVisualizer }); }
};

function mountVisualizer(body){
  body.innerHTML = `<div style="height:100%;display:flex;flex-direction:column">
    <div class="toolbar">
      <select class="algo"></select>
      <label style="color:var(--dim);font-size:11px">n <input class="n" type="range" min="6" max="48" value="22" style="vertical-align:middle"></label>
      <button data-a="shuffle">Shuffle</button>
      <button data-a="go">Sort</button>
      <label style="color:var(--dim);font-size:11px"><input type="checkbox" class="never" style="vertical-align:middle"> never give up</label>
      <span class="stat path"></span>
    </div>
    <div class="bars" style="flex:1;display:flex;align-items:flex-end;gap:2px;padding:12px;background:var(--field)"></div>
  </div>`;
  const barsEl = body.querySelector(".bars"), sel = body.querySelector(".algo"),
        nEl = body.querySelector(".n"), stat = body.querySelector(".stat");
  const choices = ["bogo","bogobogo","bubble","insertion","selection","quick"];
  sel.innerHTML = choices.map(n => `<option ${n==="bubble"?"selected":""}>${n}</option>`).join("");

  let arr = [], running = false, raf = 0;
  const rnd = n => { const a = Array.from({length:n}, (_,i) => i+1); for(let i=n-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const ok = a => a.every((v,i)=>i===0||a[i-1]<=v);

  function draw(a, hi={}){
    const max = a.length;
    barsEl.innerHTML = "";
    a.forEach((v,i) => {
      const b = document.createElement("div");
      b.style.cssText = `flex:1;height:${(v/max*100)}%;border-radius:2px 2px 0 0;background:${i===hi.a?"var(--accent)":i===hi.b?"var(--bad)":hi.done?"var(--good)":"var(--accent2)"}`;
      barsEl.appendChild(b);
    });
  }
  function reset(){ cancelAnimationFrame(raf); running=false; arr = rnd(+nEl.value); draw(arr); stat.textContent = ""; }

  // instrumented comparison sorts return a list of frames {arr, a, b}
  function frames(name, input){
    const a = input.slice(), out = []; let steps = 0; const CAP = 6000;
    const snap = (x,y) => { if(out.length<CAP) out.push({arr:a.slice(), a:x, b:y}); };
    const swap = (i,j) => { [a[i],a[j]]=[a[j],a[i]]; };
    if(name==="bubble"){ for(let i=0;i<a.length;i++) for(let j=0;j<a.length-1-i;j++){ steps++; snap(j,j+1); if(a[j]>a[j+1]) swap(j,j+1); } }
    else if(name==="insertion"){ for(let i=1;i<a.length;i++){ let j=i; while(j>0&&a[j-1]>a[j]){ steps++; snap(j-1,j); swap(j-1,j); j--; } snap(j,i); } }
    else if(name==="selection"){ for(let i=0;i<a.length;i++){ let m=i; for(let j=i+1;j<a.length;j++){ steps++; snap(i,j); if(a[j]<a[m]) m=j; } if(m!==i) swap(i,m); } }
    else if(name==="quick"){ const qs=(lo,hi)=>{ if(lo>=hi) return; const p=a[hi]; let i=lo; for(let j=lo;j<hi;j++){ steps++; snap(j,hi); if(a[j]<p){ swap(i,j); i++; } } swap(i,hi); qs(lo,i-1); qs(i+1,hi); }; qs(0,a.length-1); }
    out.push({arr:a.slice(), done:true});
    return { out, steps, result:a };
  }

  function playFrames(name){
    const { out, steps } = frames(name, arr);
    let i = 0; running = true;
    const speed = Math.max(1, Math.ceil(out.length/400)); // finish any size in ~a few seconds
    const tick = () => {
      if(!running) return;
      for(let k=0;k<speed && i<out.length;k++){ draw(out[i].arr, out[i]); i++; }
      stat.innerHTML = `${name}: <span class="acc">${Math.min(i,out.length)}</span>/${out.length} frames · ${steps.toLocaleString()} comparisons`;
      if(i<out.length) raf = requestAnimationFrame(tick);
      else { arr = out[out.length-1].arr; draw(arr,{done:true}); running=false; }
    };
    tick();
  }

  function playBogo(name){
    // live shuffling until sorted or it gives up (bogobogo gives up far sooner, as a mercy)
    const CAP = body.querySelector(".never").checked ? Infinity : (name==="bogobogo" ? 8000 : 300000);
    let steps = 0; running = true;
    const tick = () => {
      if(!running) return;
      const budget = 1500;
      for(let k=0;k<budget;k++){
        if(ok(arr)){ draw(arr,{done:true}); stat.innerHTML = `<span class="good">${name} got lucky after ${steps.toLocaleString()} shuffles.</span>`; running=false; return; }
        if(steps>=CAP){ draw(arr); stat.innerHTML = `<span class="bad">${name} gave up after ${steps.toLocaleString()} shuffles. told you.</span>`; running=false; return; }
        for(let i=arr.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [arr[i],arr[j]]=[arr[j],arr[i]]; } steps++;
      }
      draw(arr); stat.innerHTML = `${name}: ${steps.toLocaleString()} shuffles, still not sorted…`;
      raf = requestAnimationFrame(tick);
    };
    tick();
  }

  body.querySelector(".toolbar").onclick = e => {
    const a = e.target.closest("button")?.dataset.a; if(!a) return;
    if(a==="shuffle") reset();
    else if(a==="go"){ if(running){ running=false; return; } if(ok(arr)) reset(); const name=sel.value; (name==="bogo"||name==="bogobogo")?playBogo(name):playFrames(name); }
  };
  nEl.oninput = reset;
  reset();
}
