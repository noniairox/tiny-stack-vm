import{readFileSync as R,mkdirSync as K,writeFileSync as W}from'fs';
let i,d,P,I,S,C,M,p,q,o,n,e,t,u,v,A,B,g,F,U,V;
g=()=>S.pop()??(()=>{throw 2})();
F=[()=>{if(S.push(P[p++]<<24>>24)>256)throw 3},()=>{if(S.push(P[p]|P[p+1]<<8|P[p+2]<<16|P[p+3]<<24)>256)throw 3;p+=4},()=>g(),()=>{v=g();if(S.push(v,v)>256)throw 3},()=>{u=g();v=g();S.push(u,v)},()=>{v=g();u=g();if(S.push(u,v,u)>256)throw 3},()=>{u=g();v=g();S.push(v,u,g())}];
for(i=1;i<41;i++){
d='i0'+(i<10?'0'+i:i);
A='/input/'+d;B='/output/'+d;
P=R(A+'/program.bin');I=R(A+'/input.bin');
S=[];C=[];M=[];p=q=n=0;o='';
try{for(;;){
if(n++>=1e6)throw 10;
t=P[p++];if(t==null)throw 9;
if(!t)throw 0;
else if(t<8)F[t-1]();
else if(t>15&t<35&t!=31){
if(t==23|t==27)S.push(-g()-(t==27)|0);
else{v=g();u=g();U=u>>>0,V=v>>>0;if(!v&t>18&t<23)throw 4;S.push([u+v|0,u-v|0,Math.imul(u,v),u/v|0,u%v,U/V,U%V,0,u&v,u|v,u^v,0,u<<v,u>>v,u>>>v,0,+(u==v),+(u<v),+(U<V)][t-16]|0)}
}else if(t>47&t<53){
if(t==52){p=C.pop();if(p==null)throw 8}
else{v=P[p]+P[p+1]*256;if(v!=v)throw 9;if(t==51){if(C.push(p+2)>64)throw 7;p=v}else{v=v<<16>>16;if(t==48)p+=2+v;else{u=g();p+=2+v*(!u==(t&1))}}}
}else if(t>63&t<66){
u=g();if(t&1)v=g();if(u<0|u>255)throw 6;t&1?M[u]=v:S.push(M[u]|0);
}else if(t>79&t<84){
if(t<82){v=g();u=t&1?String.fromCharCode(v&255):''+v;if(o.length+u.length>65536)throw 11;o+=u}
else if(t==82){if(S.push(I[q++]??-1)>256)throw 3}
else throw g()&255;
}else throw 5;
}}catch(x){e=x}
K(B);
W(B+'/stdout.bin',o,'latin1');
W(B+'/exit.txt',e+'');
}
