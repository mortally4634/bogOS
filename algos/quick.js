(window.ALGOS = window.ALGOS || {}).quick = {
  name: "quick",
  blurb: "partition around a pivot, recurse · O(n log n)",
  run(a){
    let steps = 0;
    const qs = arr => {
      if(arr.length <= 1) return arr;
      const pivot = arr[arr.length>>1], lo = [], hi = [], eq = [];
      for(const v of arr){ steps++; v < pivot ? lo.push(v) : v > pivot ? hi.push(v) : eq.push(v); }
      return [...qs(lo), ...eq, ...qs(hi)];
    };
    return { result: qs(a), steps };
  }
};
