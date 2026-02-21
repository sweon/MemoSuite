import{o as O,u as z,r as j,a as D,j as t,S as N,w as R,d as J,c}from"./index-w13Patmy.js";const T=c.div`
  background: #fcfcfd;
  border: 1px solid #edf2f7;
  border-left: 4px solid #00acc1;
  border-radius: 8px;
  margin: 12px 0;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    background: #f8f9fa;
    border-color: #cbd5e0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);

    .edit-overlay {
      opacity: 1;
    }
  }
`,F=c.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #00acc1;
  font-weight: 600;
  border: 1px solid #edf2f7;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
`,I=c.div`
  overflow: auto;
  max-height: 400px;
  background-color: #fff;
`,W=c.table`
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: normal;
`,w=c.th`
  background: #f8f9fa;
  border: 1px solid #d1d5db;
  height: 22px;
  padding: 0 4px;
  font-weight: 500;
  color: #666;
  text-align: center;
`,S=c.td`
  border: 1px solid #d1d5db;
  height: 22px;
  padding: 0 4px;
  min-width: 60px;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
  vertical-align: middle;
`,B=c.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  color: #868e96;
  font-size: 14px;
`;function L({nodeKey:m,data:x}){const[M]=O(),[C]=z(m),[u,y]=j.useState(!1),{language:f}=D(),g=j.useMemo(()=>{if(!x)return null;try{const o=JSON.parse(x);if(!Array.isArray(o)||o.length===0)return null;const r=o[0],n=r.celldata||[],p=r.data,v=Array.isArray(n)&&n.length>0,b=Array.isArray(p)&&p.length>0;if(!v&&!b)return null;let d=0,a=0;const h=[];if(b){d=Math.min(p.length-1,30);for(let i=0;i<=d;i++){h[i]=[];const l=p[i]||[];a=Math.max(a,l.length-1);for(let e=0;e<l.length&&e<=10;e++){const s=l[e];h[i][e]=s?.m||s?.v||""}}a=Math.min(a,10)}else if(v){n.forEach(e=>{e.r>d&&(d=e.r),e.c>a&&(a=e.c)});const i=Math.min(d,30),l=Math.min(a,10);for(let e=0;e<=i;e++){h[e]=[];for(let s=0;s<=l;s++)h[e][s]=""}n.forEach(e=>{if(e.r<=i&&e.c<=l){const s=e.v?.m||e.v?.v||"";h[e.r][e.c]=s}}),d=i,a=l}return{grid:h,maxRow:Math.min(d,30),maxCol:Math.min(a,10)}}catch{return null}},[x]),k=()=>{y(!0)},A=o=>{const r=typeof o=="string"?o:JSON.stringify(o);M.update(()=>{const n=R(m);J(n)&&n.setData(r)})},E=()=>{y(!1)};return t.jsxs(t.Fragment,{children:[t.jsxs(T,{onClick:k,className:C?"selected":"",children:[g?t.jsx(I,{children:t.jsxs(W,{children:[t.jsx("thead",{children:t.jsxs("tr",{children:[t.jsx(w,{style:{width:"32px",height:"22px",padding:"0 4px"},children:"#"}),Array.from({length:g.maxCol+1}).map((o,r)=>t.jsx(w,{style:{height:"22px",padding:"0 4px"},children:String.fromCharCode(65+r)},r))]})}),t.jsx("tbody",{children:g.grid.map((o,r)=>t.jsxs("tr",{children:[t.jsx(S,{style:{background:"#f8f9fa",textAlign:"center",fontSize:"11px",color:"#666",padding:"0 4px",height:"22px"},children:r+1}),o.map((n,p)=>t.jsx(S,{style:{height:"22px",padding:"0 4px"},children:n},p))]},r))})]})}):t.jsxs(B,{children:[t.jsx("div",{style:{fontSize:"20px"},children:"📊"}),t.jsxs("div",{children:[t.jsx("div",{style:{fontWeight:600,color:"#343a40"},children:f==="ko"?"스프레드시트 (비어 있음)":"Spreadsheet (Empty)"}),t.jsx("div",{style:{fontSize:"11px",color:"#868e96"},children:f==="ko"?"클릭하여 편집":"Click to open editor"})]})]}),t.jsx(F,{className:"edit-overlay",children:f==="ko"?"수정":"Edit"})]}),u&&t.jsx(N,{isOpen:u,initialData:(()=>{try{return x?JSON.parse(x):void 0}catch{return}})(),onSave:A,onClose:E,language:f})]})}export{L as default};
