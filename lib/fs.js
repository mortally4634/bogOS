"use strict";
/* bogOS filesystem: a tree that persists in localStorage and only reorders a
   directory when you run a sort algorithm over it. Each dir keeps an explicit
   `order` of its child names — scrambled on write, fixed only by sorting. */
window.FS = (function(){
  const KEY = "bogos.fs.v2";
  let root, cwd = [];

  const scramble = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const dir  = (children={}) => ({ type:"dir", children, order:scramble(Object.keys(children)) });
  const file = (content="") => ({ type:"file", content });

  function seed(){
    return dir({
      "readme.txt": file("welcome to bogOS.\n\nthis filesystem organizes itself using sorting algorithms only.\nby default that algorithm is bogo sort, so it is, essentially, never organized.\n\ntry the Sort button in Files, or `sort` in the Terminal.\n"),
      "home": dir({
        "todo.md": file("# todo\n- [ ] sort the filesystem\n- [ ] give up\n- [x] accept entropy\n"),
        "cat.gif": file("(a cat, allegedly)"),
        "notes.txt": file("bogo sort is O(n * n!). bogobogo is worse. on purpose.")
      }),
      "bin": dir({ "kernel.img": file("\x00\x00bogOS\x00"), "bogod": file("#!/bin/bogo\nwhile true; do shuffle; done") }),
      "etc": dir({ "bogo.conf": file("algorithm=bogo\ngive_up_after=200000\nhope=false"), "motd": file("order is a social construct.") })
    });
  }

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      root = raw ? JSON.parse(raw) : seed();
    }catch(e){ root = seed(); }
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(root)); }catch(e){} }

  function nodeAt(path){ // path = array of names from root
    let n = root;
    for(const name of path){ if(!n.children || !n.children[name]) return null; n = n.children[name]; }
    return n;
  }
  function resolve(str){ // -> path array, or throw
    let path = str.startsWith("/") ? [] : cwd.slice();
    for(const part of str.split("/")){
      if(part === "" || part === ".") continue;
      if(part === ".."){ path.pop(); continue; }
      path.push(part);
    }
    return path;
  }
  const curDir = () => nodeAt(cwd);
  const pwd = () => "/" + cwd.join("/");

  function addChild(d, name, node){ d.children[name] = node; d.order.push(name); } // appended, unsorted — on purpose

  load(); // initialize from storage (or seed) the moment this driver loads

  return {
    load, save,
    get cwd(){ return cwd.slice(); },
    pwd,
    nodeAt, resolve,
    list(path){ const d = path ? nodeAt(path) : curDir(); if(!d || d.type!=="dir") return []; return d.order.filter(n=>d.children[n]).map(n => ({ name:n, type:d.children[n].type })); },
    isSorted(path){ const names = this.list(path).map(e=>e.name); return names.every((v,i)=>i===0||names[i-1]<=v); },
    cd(str){ const p = resolve(str); const n = nodeAt(p); if(!n) throw "no such directory: "+str; if(n.type!=="dir") throw "not a directory: "+str; cwd = p; save(); },
    mkdir(name){ const d = curDir(); if(d.children[name]) throw name+" exists"; addChild(d, name, dir()); save(); },
    touch(name){ const d = curDir(); if(d.children[name]) throw name+" exists"; addChild(d, name, file("")); save(); },
    write(str, content){ const p = resolve(str); const name = p.pop(); const d = nodeAt(p); if(!d||d.type!=="dir") throw "bad path"; if(!d.children[name]) addChild(d, name, file(content)); else { if(d.children[name].type!=="file") throw name+" is a directory"; d.children[name].content = content; } save(); },
    read(str){ const n = nodeAt(resolve(str)); if(!n) throw "no such file: "+str; if(n.type!=="file") throw str+" is a directory"; return n.content; },
    rm(name){ const d = curDir(); if(!d.children[name]) throw "no such file: "+name; delete d.children[name]; d.order = d.order.filter(n=>n!==name); save(); },
    mv(a, b){ const d = curDir(); if(!d.children[a]) throw "no such file: "+a; if(d.children[b]) throw b+" exists"; d.children[b] = d.children[a]; delete d.children[a]; d.order = d.order.map(n=>n===a?b:n); save(); },
    // reorganize current dir by running a sort driver over its order array
    reorganize(algoName, path){
      const d = path ? nodeAt(path) : curDir();
      if(!d || d.type!=="dir") throw "not a directory";
      const algo = (window.ALGOS||{})[algoName];
      if(!algo) throw "no such algorithm: "+algoName;
      const r = algo.run(d.order.slice());
      if(!r.gaveUp){ d.order = r.result; save(); }
      return r;
    }
  };
})();
