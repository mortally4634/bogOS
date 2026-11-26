(window.ALGOS = window.ALGOS || {}).bogobogo = {
  name: "bogobogo",
  blurb: "bogo-sort every prefix before each check · O(n! ^ something cruel)",
  run(a){
    const CAP = 40000;              // it will hit this. that is the point.
    let steps = 0, gaveUp = false;
    const ok = x => x.every((v,i) => i===0 || x[i-1] <= v);
    const shuf = x => { for(let i=x.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [x[i],x[j]]=[x[j],x[i]]; } };
    const bbs = list => {
      if(gaveUp || list.length <= 1) return list.slice();
      let c = list.slice();
      while(true){
        if(++steps > CAP){ gaveUp = true; return c; }
        c = [...bbs(c.slice(0, c.length-1)), c[c.length-1]]; // "sort" the prefix, then look at the last
        if(ok(c)) return c;
        shuf(c);
      }
    };
    const result = bbs(a.slice());
    return { result, steps, gaveUp };
  }
};
