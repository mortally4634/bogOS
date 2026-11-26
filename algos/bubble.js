(window.ALGOS = window.ALGOS || {}).bubble = {
  name: "bubble",
  blurb: "swap adjacent pairs until calm · O(n²)",
  run(a){
    let steps = 0, swapped = true;
    while(swapped){
      swapped = false;
      for(let i=0;i<a.length-1;i++){ steps++; if(a[i] > a[i+1]){ [a[i],a[i+1]]=[a[i+1],a[i]]; swapped = true; } }
    }
    return { result: a, steps };
  }
};
