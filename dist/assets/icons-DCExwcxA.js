import{r as e}from"./charts-DX7L9xqZ.js";
/**
 * @license lucide-react v1.31.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const t=(...e)=>e.filter((e,t,r)=>Boolean(e)&&""!==e.trim()&&r.indexOf(e)===t).join(" ").trim(),r=e=>{const t=(e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,t,r)=>r?r.toUpperCase():t.toLowerCase()))(e);return t.charAt(0).toUpperCase()+t.slice(1)};
/**
 * @license lucide-react v1.31.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
/**
 * @license lucide-react v1.31.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var o={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};
/**
 * @license lucide-react v1.31.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a=e=>{for(const t in e)if(t.startsWith("aria-")||"role"===t||"title"===t)return!0;return!1},s=e.createContext({}),i=e.forwardRef(({color:r,size:i,strokeWidth:n,absoluteStrokeWidth:c,className:d="",children:h,iconNode:l,...m},u)=>{const{size:p=24,strokeWidth:k=2,absoluteStrokeWidth:w=!1,color:f="currentColor",className:g=""}=e.useContext(s)??{},N=c??w?24*Number(n??k)/Number(i??p):n??k;return e.createElement("svg",{ref:u,...o,width:i??p??o.width,height:i??p??o.height,stroke:r??f,strokeWidth:N,className:t("lucide",g,d),...!h&&!a(m)&&{"aria-hidden":"true"},...m},[...l.map(([t,r])=>e.createElement(t,r)),...Array.isArray(h)?h:[h]])}),n=(o,a)=>{const s=e.forwardRef(({className:s,...n},c)=>{return e.createElement(i,{ref:c,iconNode:a,className:t(`lucide-${d=r(o),d.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase()}`,`lucide-${o}`,s),...n});var d});return s.displayName=r(o),s},c=n("minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]),d=n("trending-down",[["path",{d:"M16 17h6v-6",key:"t6n2it"}],["path",{d:"m22 17-8.5-8.5-5 5L2 7",key:"x473p"}]]),h=n("trending-up",[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]]);export{c as M,h as T,d as a};
