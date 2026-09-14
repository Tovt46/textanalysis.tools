"use client";
import {useEffect,useState} from "react";
type Part={value:string;added?:boolean;removed?:boolean};
export default function TextContractDiff({before,after,label}:{before:string;after:string;label:string}){
  const [open,setOpen]=useState(false),[parts,setParts]=useState<Part[]|null>(null);
  useEffect(()=>{
    if(!open)return;
    let active=true;
    void import("diff").then(({diffWordsWithSpace})=>{const changes=diffWordsWithSpace(before,after,{timeout:100,maxEditLength:4000});if(active)setParts(changes??null);});
    return()=>{active=false;};
  },[open,before,after]);
  return <details className="contract-diff" onToggle={event=>setOpen(event.currentTarget.open)}><summary>{label}</summary>{open&&(parts?<pre className="contract-full-diff">{parts.map((part,index)=>part.added?<ins key={index}>{part.value}</ins>:part.removed?<del key={index}>{part.value}</del>:<span key={index}>{part.value}</span>)}</pre>:<div className="evidence-diff"><div><span>FULL BEFORE</span><pre>{before}</pre></div><div><span>FULL AFTER</span><pre>{after}</pre></div></div>)}</details>;
}
