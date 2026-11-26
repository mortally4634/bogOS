(window.ALGOS = window.ALGOS || {}).insertion = {
  name: "insertion",
  blurb: "slot each file into place · O(n²), fast when near-sorted",
  run(a){
    let steps = 0;
    for(let i=1;i<a.length;i++){
      const key = a[i]; let j = i-1;
      while(j>=0 && a[j] > key){ steps++; a[j+1]=a[j]; j--; }
      a[j+1] = key; steps++;
    }
    return { result: a, steps };
  }
};
