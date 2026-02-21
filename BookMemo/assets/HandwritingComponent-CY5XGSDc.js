const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-Cgf_Vpp6.js","assets/index-C-MIeiUx.css"])))=>i.map(i=>d[i]);
import{o as _,u as D,r,a as P,_ as F,j as t,F as I,b as M,w as N,$ as H,c as d}from"./index-Cgf_Vpp6.js";const L=d.div`
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
`;function A({nodeKey:p,data:i}){const[h]=_(),[m]=D(p),[b,g]=r.useState(!1),[x,c]=r.useState(null),{language:s}=P(),[v,n]=r.useState(!1);r.useEffect(()=>{if(!i){c(null);return}n(!0);const l=document.createElement("canvas");F(async()=>{const{fabric:o}=await import("./index-Cgf_Vpp6.js").then(e=>e.f);return{fabric:o}},__vite__mapDeps([0,1])).then(({fabric:o})=>{try{const e=new o.StaticCanvas(l);e.loadFromJSON(i,()=>{const u=e.getObjects().filter(a=>a.visible&&!a.isPageBackground&&!a.isPixelEraser&&!a.isObjectEraser&&!a.excludeFromExport);if(u.length>0){let a=0;u.forEach(O=>{const f=O.getBoundingRect(!0);a=Math.max(a,f.top+f.height)});const S=40,j=100,k=e.getWidth()||800,C=Math.max(j,a+S);e.setDimensions({width:k,height:C}),e.backgroundColor=void 0,e.setViewportTransform([1,0,0,1,0,0]),e.renderAll(),c(e.toDataURL({format:"png",quality:1,enableRetinaScaling:!0}))}else c(null);e.dispose(),n(!1)})}catch(e){console.error("Fabric load preview error:",e),n(!1)}}).catch(o=>{console.error("Fabric import error:",o),n(!1)})},[i]);const w=()=>{g(!0)},y=l=>{h.update(()=>{const o=N(p);H(o)&&o.setData(l)})},E=()=>{g(!1)};return t.jsxs(t.Fragment,{children:[t.jsxs(L,{onClick:w,className:m?"selected":"",children:[v?t.jsx("div",{style:{padding:"20px",color:"#adb5bd",fontSize:"0.8rem",fontStyle:"italic"},children:s==="ko"?"불러오는 중...":"Loading..."}):x?t.jsx(T,{src:x,alt:"Handwriting Preview"}):t.jsxs("div",{style:{padding:"20px",display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",color:"#868e96"},children:[t.jsx(I,{size:24}),t.jsx("span",{style:{fontSize:"13px"},children:s==="ko"?"기록된 필기 없음 (클릭하여 시작)":"No handwriting (Click to start)"})]}),t.jsx(z,{className:"edit-overlay",children:s==="ko"?"수정":"Edit"})]}),b&&t.jsx(M,{initialData:i,onSave:y,onClose:E,language:s})]})}export{A as default};
