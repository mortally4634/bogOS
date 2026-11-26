(window.ALGOS = window.ALGOS || {}).bogo = {
  name: "bogo",
  blurb: "shuffle at random, check, repeat · O(n·n!)",
  run(a){
    const CAP = 200000, ok = x => x.every((v,i) => i===0 || x[i-1] <= v);
    let steps = 0;
    while(!ok(a)){
      if(steps >= CAP) return { result: a, steps, gaveUp: true };
      for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; }
      steps++;
    }
    return { result: a, steps };
  }
};
