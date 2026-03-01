const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-C6pbanl2.js","assets/index-C-MIeiUx.css"])))=>i.map(i=>d[i]);
import{o as _,u as D,r,a as P,_ as F,j as t,F as I,b as M,w as N,$ as H,c as d}from"./index-C6pbanl2.js";const L=d.div`
  background: #fcfcfd;
  border: 1px solid #edf2f7;
  border-left: 4px solid #4c6ef5;
  border-radius: 8px;
  padding: 8px;
  margin: 12px 0;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  position: relative;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &:hover {
    background: #f8f9fa;
    border-color: #cbd5e0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);

    .edit-overlay {
      opacity: 1;
    }
  }
`,T=d.img`
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  display: block;
`,z=d.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: #4c6ef5;
  font-weight: 600;
  border: 1px solid #edf2f7;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;
`;function A({nodeKey:p,data:i}){const[m]=_(),[b]=D(p),[v,g]=r.useState(!1),[x,c]=r.useState(null),{language:s}=P(),[w,n]=r.useState(!1);r.useEffect(()=>{if(!i){c(null);return}n(!0);const l=document.createElement("canvas");F(async()=>{const{fabric:a}=await import("./index-C6pbanl2.js").then(e=>e.f);return{fabric:a}},__vite__mapDeps([0,1])).then(({fabric:a})=>{try{const e=new a.StaticCanvas(l);e.loadFromJSON(i,()=>{const f=e.getObjects().filter(o=>o.visible&&!o.isPageBackground&&!o.isPixelEraser&&!o.isObjectEraser&&!o.excludeFromExport);if(f.length>0){let o=0;f.forEach(O=>{const h=O.getBoundingRect(!0);o=Math.max(o,h.top+h.height)});const S=40,j=100,k=e.getWidth()||800,C=Math.max(j,o+S);e.setDimensions({width:k,height:C}),e.backgroundColor=void 0,e.setViewportTransform([1,0,0,1,0,0]),e.renderAll(),c(e.toDataURL({format:"png",quality:1,enableRetinaScaling:!0}))}else c(null);e.dispose(),n(!1)})}catch(e){console.error("Fabric load preview error:",e),n(!1)}}).catch(a=>{console.error("Fabric import error:",a),n(!1)})},[i]);const y=()=>{g(!0)},u=l=>{m.update(()=>{const a=N(p);H(a)&&a.setData(l)})},E=()=>{g(!1)};return t.jsxs(t.Fragment,{children:[t.jsxs(L,{onClick:y,className:b?"selected":"",children:[w?t.jsx("div",{style:{padding:"20px",color:"#adb5bd",fontSize:"0.8rem",fontStyle:"italic"},children:s==="ko"?"불러오는 중...":"Loading..."}):x?t.jsx(T,{src:x,alt:"Handwriting Preview"}):t.jsxs("div",{style:{padding:"20px",display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",color:"#868e96"},children:[t.jsx(I,{size:24}),t.jsx("span",{style:{fontSize:"13px"},children:s==="ko"?"기록된 필기 없음 (클릭하여 시작)":"No handwriting (Click to start)"})]}),t.jsx(z,{className:"edit-overlay",children:s==="ko"?"수정":"Edit"})]}),v&&t.jsx(M,{initialData:i,onSave:u,onAutosave:u,onClose:E,language:s})]})}export{A as default};
