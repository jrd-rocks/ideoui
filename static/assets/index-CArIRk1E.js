(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=!1;async function t(t,n,r=``,i=``,a=``){if(!e){e=!0;try{if(r&&r.includes(`/api/log_error`))return;await fetch(`/api/log_error`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({error:t,text:n,url:r,status:i,context:a})})}catch{}finally{e=!1}}}var n=JSON.parse;JSON.parse=function(e,r){try{return n(e,r)}catch(n){throw console.error(`JSON.parse failed!`),console.error(`Erroneous input string:`,e),console.error(`Original parsing error:`,n),t(n.message,e,``,``,`JSON.parse`),n}},Response.prototype.json,Response.prototype.json=async function(){let e=await this.text();try{return n(e)}catch(n){throw console.error(`Response.json() failed to parse. Status: ${this.status}, URL: ${this.url}`),console.error(`Erroneous response body content:`,e),console.error(`Original parsing error:`,n),t(n.message,e,this.url,String(this.status),`Response.json`),n}};var r=globalThis,i=r.ShadowRoot&&(r.ShadyCSS===void 0||r.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,a=Symbol(),o=new WeakMap,s=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==a)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(i&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=o.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&o.set(t,e))}return e}toString(){return this.cssText}},c=e=>new s(typeof e==`string`?e:e+``,void 0,a),l=(e,t)=>{if(i)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let n of t){let t=document.createElement(`style`),i=r.litNonce;i!==void 0&&t.setAttribute(`nonce`,i),t.textContent=n.cssText,e.appendChild(t)}},u=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return c(t)})(e):e,{is:d,defineProperty:f,getOwnPropertyDescriptor:p,getOwnPropertyNames:m,getOwnPropertySymbols:ee,getPrototypeOf:te}=Object,h=globalThis,ne=h.trustedTypes,re=ne?ne.emptyScript:``,ie=h.reactiveElementPolyfillSupport,g=(e,t)=>e,_={toAttribute(e,t){switch(t){case Boolean:e=e?re:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},v=(e,t)=>!d(e,t),y={attribute:!0,type:String,converter:_,reflect:!1,useDefault:!1,hasChanged:v};Symbol.metadata??=Symbol(`metadata`),h.litPropertyMetadata??=new WeakMap;var b=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=y){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&f(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=p(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??y}static _$Ei(){if(this.hasOwnProperty(g(`elementProperties`)))return;let e=te(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(g(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(g(`properties`))){let e=this.properties,t=[...m(e),...ee(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(u(e))}else e!==void 0&&t.push(u(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return l(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?_:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?_:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??v)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};b.elementStyles=[],b.shadowRootOptions={mode:`open`},b[g(`elementProperties`)]=new Map,b[g(`finalized`)]=new Map,ie?.({ReactiveElement:b}),(h.reactiveElementVersions??=[]).push(`2.1.2`);var x=globalThis,ae=e=>e,S=x.trustedTypes,oe=S?S.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,se=`$lit$`,C=`lit$${Math.random().toFixed(9).slice(2)}$`,ce=`?`+C,le=`<${ce}>`,w=document,T=()=>w.createComment(``),E=e=>e===null||typeof e!=`object`&&typeof e!=`function`,D=Array.isArray,ue=e=>D(e)||typeof e?.[Symbol.iterator]==`function`,O=`[ 	
\f\r]`,k=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,A=/-->/g,j=/>/g,M=RegExp(`>|${O}(?:([^\\s"'>=/]+)(${O}*=${O}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),N=/'/g,P=/"/g,de=/^(?:script|style|textarea|title)$/i,fe=e=>(t,...n)=>({_$litType$:e,strings:t,values:n}),F=fe(1),I=fe(2),L=Symbol.for(`lit-noChange`),R=Symbol.for(`lit-nothing`),pe=new WeakMap,z=w.createTreeWalker(w,129);function me(e,t){if(!D(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return oe===void 0?t:oe.createHTML(t)}var he=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=k;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===k?c[1]===`!--`?o=A:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=M):(de.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=M):o=j:o===M?c[0]===`>`?(o=i??k,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?M:c[3]===`"`?P:N):o===P||o===N?o=M:o===A||o===j?o=k:(o=M,i=void 0);let d=o===M&&e[t+1].startsWith(`/>`)?` `:``;a+=o===k?n+le:l>=0?(r.push(s),n.slice(0,l)+se+n.slice(l)+C+d):n+C+(l===-2?t:d)}return[me(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},B=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=he(t,n);if(this.el=e.createElement(l,r),z.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=z.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(se)){let t=u[o++],n=i.getAttribute(e).split(C),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?_e:r[1]===`?`?ve:r[1]===`@`?ye:U}),i.removeAttribute(e)}else e.startsWith(C)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(de.test(i.tagName)){let e=i.textContent.split(C),t=e.length-1;if(t>0){i.textContent=S?S.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],T()),z.nextNode(),c.push({type:2,index:++a});i.append(e[t],T())}}}else if(i.nodeType===8)if(i.data===ce)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(C,e+1))!==-1;)c.push({type:7,index:a}),e+=C.length-1}a++}}static createElement(e,t){let n=w.createElement(`template`);return n.innerHTML=e,n}};function V(e,t,n=e,r){if(t===L)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=E(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=V(e,i._$AS(e,t.values),i,r)),t}var ge=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??w).importNode(t,!0);z.currentNode=r;let i=z.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new H(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new be(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=z.nextNode(),a++)}return z.currentNode=w,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},H=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=R,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=V(this,e,t),E(e)?e===R||e==null||e===``?(this._$AH!==R&&this._$AR(),this._$AH=R):e!==this._$AH&&e!==L&&this._(e):e._$litType$===void 0?e.nodeType===void 0?ue(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==R&&E(this._$AH)?this._$AA.nextSibling.data=e:this.T(w.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=B.createElement(me(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new ge(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=pe.get(e.strings);return t===void 0&&pe.set(e.strings,t=new B(e)),t}k(t){D(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(T()),this.O(T()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=ae(e).nextSibling;ae(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},U=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=R,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=R}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=V(this,e,t,0),a=!E(e)||e!==this._$AH&&e!==L,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=V(this,r[n+o],t,o),s===L&&(s=this._$AH[o]),a||=!E(s)||s!==this._$AH[o],s===R?e=R:e!==R&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===R?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},_e=class extends U{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===R?void 0:e}},ve=class extends U{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==R)}},ye=class extends U{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=V(this,e,t,0)??R)===L)return;let n=this._$AH,r=e===R&&n!==R||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==R&&(n===R||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},be=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){V(this,e)}},xe=x.litHtmlPolyfillSupport;xe?.(B,H),(x.litHtmlVersions??=[]).push(`3.3.3`);var Se=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new H(t.insertBefore(T(),e),e,void 0,n??{})}return i._$AI(e),i},W=globalThis,G=class extends b{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Se(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return L}};G._$litElement$=!0,G.finalized=!0,W.litElementHydrateSupport?.({LitElement:G});var Ce=W.litElementPolyfillSupport;Ce?.({LitElement:G}),(W.litElementVersions??=[]).push(`4.2.2`);function we(){return Promise.resolve(null)}async function Te(){let e=await fetch(`/api/history`);if(!e.ok)throw Error(`Failed to fetch history from backend`);let t=await e.json();return t.sort((e,t)=>t.timestamp-e.timestamp),t}async function Ee(e,t=null){let n=t||e;if(n&&!(await fetch(`/api/history/${n}`,{method:`DELETE`})).ok)throw Error(`Failed to delete history item from backend`)}async function De(){if(!(await fetch(`/api/history`,{method:`DELETE`})).ok)throw Error(`Failed to clear backend history`)}var K=new class{constructor(){this.jobQueue=[],this.selectedJobId=``,this.listeners=new Set,this.socket=null,this.reconnectTimer=null,this.reconnectDelay=1e3,this.connected=!1,this.streams={},this.localFieldLocks={}}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}notify(){for(let e of this.listeners)try{e()}catch(e){console.error(`Error in queue store listener:`,e)}}normalizeJob(e){return e?{...e,id:e.id||e.job_id,parentUuid:e.parentUuid??e.parent_uuid??null,rawPrompt:e.rawPrompt??e.raw_prompt??``,upsampledPrompt:e.upsampledPrompt??e.upsampled_prompt??null,displayText:e.displayText??e.display_text??``,chatMessages:e.chatMessages??e.chat_messages??[],providerParams:e.providerParams??e.provider_params??{},upsamplerParams:e.upsamplerParams??e.upsampler_params??{},draftJson:e.draftJson??e.draft_json??null,llmStream:e.llmStream??this.streams[e.id||e.job_id]??null,params:e.params||{}}:null}getSelectedJob(){return this.jobQueue.find(e=>e.id===this.selectedJobId)||null}setQueue(e){this.jobQueue=(e||[]).map(e=>this.normalizeJob(e)).filter(Boolean),this.selectedJobId&&!this.jobQueue.some(e=>e.id===this.selectedJobId)&&(this.selectedJobId=this.jobQueue[0]?.id||``),this.notify()}setSelectedJobId(e){this.selectedJobId=e||``,this.notify()}markLocalEdit(e,t,n=1e4){if(!e||!t?.length)return;let r=this.localFieldLocks[e]||{},i=Date.now()+n;for(let e of t)r[e]=i;this.localFieldLocks[e]=r}mergeRemoteJob(e,t){if(!e)return t;let n=this.localFieldLocks[e.id]||{},r=Date.now(),i={...e,...t};for(let[a,o]of Object.entries(n))o>r&&Object.prototype.hasOwnProperty.call(t,a)?t[a]===e[a]?delete n[a]:i[a]=e[a]:o<=r&&delete n[a];return Object.keys(n).length?this.localFieldLocks[e.id]=n:delete this.localFieldLocks[e.id],i}addJob(e){let t=this.normalizeJob(e);t&&(this.jobQueue.findIndex(e=>e.id===t.id)>=0?this.jobQueue=this.jobQueue.map(e=>e.id===t.id?this.normalizeJob(this.mergeRemoteJob(e,t)):e):this.jobQueue=[t,...this.jobQueue],this.notify())}updateJob(e,t,n={}){n.local&&this.markLocalEdit(e,n.fields||Object.keys(t||{}));let r=!1;this.jobQueue=this.jobQueue.map(n=>n.id===e?(r=!0,this.normalizeJob({...n,...t})):n),r&&this.notify()}removeJobLocal(e){this.jobQueue=this.jobQueue.filter(t=>t.id!==e),delete this.streams[e],this.selectedJobId===e&&(this.selectedJobId=this.jobQueue[0]?.id||``),this.notify()}async removeJob(e){let t=await fetch(`/api/jobs/${encodeURIComponent(e)}`,{method:`DELETE`});if(!t.ok&&t.status!==404){let e=await t.json().catch(()=>({}));throw Error(e.detail||`Failed to remove server job`)}this.removeJobLocal(e)}clearCompletedLocal(){this.jobQueue=this.jobQueue.filter(e=>![`completed`,`failed`,`cancelled`].includes(e.status)),this.selectedJobId&&!this.jobQueue.some(e=>e.id===this.selectedJobId)&&(this.selectedJobId=this.jobQueue[0]?.id||``),this.notify()}async clearCompleted(){let e=await fetch(`/api/jobs/completed`,{method:`DELETE`});if(!e.ok){let t=await e.json().catch(()=>({}));throw Error(t.detail||`Failed to clear completed server jobs`)}this.clearCompletedLocal()}async loadActiveJobs(){let e=await fetch(`/api/jobs/active`);if(!e.ok)throw Error(`Failed to load server jobs`);return this.setQueue(await e.json()),this.jobQueue}async sendJobRequest(e){let t=await fetch(`/api/jobs`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(e)});if(!t.ok){let e=await t.json().catch(()=>({}));throw Error(e.detail||`Failed to create job`)}let n=await t.json();return n.job&&this.addJob(n.job),this.setSelectedJobId(n.job_id),n}async fetchJob(e){let t=await fetch(`/api/jobs/${encodeURIComponent(e)}`);if(!t.ok)return null;let n=await t.json();return this.addJob(n),this.normalizeJob(n)}applyLlmStream(e){let t=e.job_id||e.id;if(!t)return;let n=this.streams[t]||{thinking:``,content:``,done:!1,context:e.context||`progress`},r={...n,context:e.context||n.context||`progress`,done:!!e.done};!e.done&&e.token&&(e.stream_type===`thinking`?r.thinking=`${r.thinking||``}${e.token}`:r.content=`${r.content||``}${e.token}`),this.streams[t]=r;let i=this.jobQueue.find(e=>e.id===t);if(i&&r.context===`chat`){let e=[...i.chatMessages||[]],n=e[e.length-1];n?.role===`assistant`&&n.streaming?e[e.length-1]={...n,content:r.content,streaming:!r.done}:r.done||e.push({role:`assistant`,content:r.content,streaming:!0}),this.updateJob(t,{chatMessages:e,llmStream:r});return}this.updateJob(t,{llmStream:r})}connect(){if(this.socket&&[WebSocket.OPEN,WebSocket.CONNECTING].includes(this.socket.readyState))return;let e=window.location.protocol===`https:`?`wss:`:`ws:`;this.socket=new WebSocket(`${e}//${window.location.host}/ws/stream`),this.socket.addEventListener(`open`,()=>{this.connected=!0,this.reconnectDelay=1e3,this.notify()}),this.socket.addEventListener(`message`,e=>{try{let t=JSON.parse(e.data);if(t.event_type===`initial_sync`){this.setQueue(t.jobs||[]);return}if(t.event_type===`job_removed`){this.removeJobLocal(t.job_id||t.id);return}if(t.event_type===`llm_stream`){this.applyLlmStream(t);return}let n=t.job||t;(n?.id||n?.job_id)&&this.addJob(n)}catch(e){console.error(`Invalid WebSocket job event:`,e)}}),this.socket.addEventListener(`close`,()=>{this.connected=!1,this.notify(),clearTimeout(this.reconnectTimer),this.reconnectTimer=setTimeout(()=>this.connect(),this.reconnectDelay),this.reconnectDelay=Math.min(this.reconnectDelay*2,3e4)}),this.socket.addEventListener(`error`,()=>this.socket?.close())}},Oe={refresh:I`<path d="M21.5 2v6h-6"></path><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>`,edit:I`<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>`,trash:I`<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>`,download:I`<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path>`,close:I`<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>`,plus:I`<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>`,search:I`<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>`,chevronDown:I`<polyline points="6 9 12 15 18 9"></polyline>`,check:I`<polyline points="20 6 9 17 4 12"></polyline>`,info:I`<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>`};function q(e,t=14){return I`
    <svg class="ui-icon" viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${Oe[e]||``}
    </svg>
  `}function ke(e=window.location.hash||`#/`){let t=e||`#/`;if(t===`#/`||t===``)return{name:`home`};if(t===`#/queue`)return{name:`queue`};if(t===`#/history`)return{name:`history`};let n=t.match(/^#\/job\/([^/]+)(?:\/lightbox\/(\d+))?$/);if(n)return{name:`job`,jobId:n[1],lightboxIndex:n[2]===void 0?null:Number(n[2])};let r=t.match(/^#\/editor\/start\/([^/]+)$/);if(r)return{name:`editor-start`,itemUuid:r[1]};let i=t.match(/^#\/editor\/([^/]+)$/);if(i)return{name:`editor`,jobId:i[1]};let a=t.match(/^#\/history\/([^/]+)\/lightbox\/(\d+)$/);return a?{name:`history-lightbox`,uuid:a[1],lightboxIndex:Number(a[2])}:{name:`unknown`,hash:t}}function J(e,t){t&&K.removeJobLocal(t),e.closeRouteLightbox(),e.activeTab=`current`,e.activeLeftTab=`generator`,K.setSelectedJobId(``),e.resetGeneratorForm(),e.scheduleSessionSave(),(window.location.hash||`#/`)!==`#/`&&(window.location.hash=`#/`)}function Ae(e,t={}){let n=window.location.hash||`#/`,r=ke(n);if(e.currentRoute=n,e.editorPinnedIndex=null,e.inspectorItem=null,r.name===`job`){let{jobId:t}=r,n=e.jobQueue.find(e=>e.id===t);n?(K.setSelectedJobId(t),e.activeTab=`current`,e.activeLeftTab=`progress`,e.updateFormInputs(n),r.lightboxIndex!==null&&e.openRouteLightbox(n,r.lightboxIndex)):K.fetchJob(t).then(n=>{n?(K.setSelectedJobId(t),e.activeLeftTab=`progress`,e.updateFormInputs(n),r.lightboxIndex!==null&&e.openRouteLightbox(n,r.lightboxIndex)):(window.location.hash||``).startsWith(`#/job/${t}`)&&J(e,t)})}else if(r.name===`queue`)e.activeTab=`current`,e.activeLeftTab=`progress`,e.closeRouteLightbox();else if(r.name===`editor-start`||r.name===`editor`)if(e.activeTab=`current`,e.closeRouteLightbox(),r.name===`editor-start`){let t=e.getHistoryItem(r.itemUuid);e.inspectorItem=t,K.setSelectedJobId(``),t||e.loadHistory().then(()=>{e.inspectorItem=e.getHistoryItem(r.itemUuid),e.requestUpdate()})}else{let t=r.jobId;K.setSelectedJobId(t),K.fetchJob(t).then(n=>{!n&&(window.location.hash||``).startsWith(`#/editor/${t}`)&&J(e,t)})}else if(r.name===`history`)e.activeTab=`history`,e.closeRouteLightbox();else if(r.name===`history-lightbox`){e.activeTab=`history`;let t=e.getHistoryItem(r.uuid);t?e.openRouteLightbox(t,r.lightboxIndex):e.loadHistory().then(()=>e.openRouteLightbox(e.getHistoryItem(r.uuid),r.lightboxIndex))}else e.activeTab=`current`,e.closeRouteLightbox(),n===`#/`&&!t.preserveHome&&!e._preserveNextHomeRoute&&(K.setSelectedJobId(``),e.activeLeftTab=`generator`,e.resetGeneratorForm()),e._preserveNextHomeRoute=!1;e.requestUpdate()}function Y(e){let t=Object.entries(e.providerSchemas||{}).find(([,e])=>e.type===`generation`&&e.default),n=Object.entries(e.providerSchemas||{}).find(([,e])=>e.type===`generation`);return t?.[0]||n?.[0]||e.selectedEndpoint||``}function X(e,t,n={}){let r=e.providerSchemas?.[t];if(!r)return{...n};let i={};for(let[e,t]of Object.entries(r.inputs||{}))i[e]=t.default??``;return{...i,...n||{}}}function je(e){let t=e.lastGeneratorSettings||{},n=t.provider||Y(e);e.prompt=``,e.magicPrompt=t.magicPrompt??!0,e.bypassUpsample=!1,e.cachedUpsampledPrompt=``,e.advancedMode=t.advancedMode??!1,e.isJsonMode=!1,e.parentUuid=``,e.selectedTemplate=t.selectedTemplate||e.templates?.[0]||`v1`,e.selectedEndpoint=n,e.providerParams=X(e,n,t.providerParams||{})}function Me(e){return e?.params?.providerParams?e.params.providerParams:{sampler_preset:e?.params?.preset||`V4_QUALITY_48`,size:e?.params?.size||`1024x1024`,steps:e?.params?.steps||48,guidance:e?.params?.guidance||``,image_count:e?.params?.imageCount||4,seed:e?.params?.seed||0}}function Ne(e={}){if(e.aspect_ratio)return String(e.aspect_ratio);let t=e.size;if(t&&String(t).includes(`x`)){let[e,n]=String(t).split(`x`).map(Number);if(e&&n){let t=(e,n)=>n?t(n,e%n):e,r=t(e,n);return`${e/r}:${n/r}`}}return`1:1`}function Pe(e,t){if(!e||!t)return e;try{let n=JSON.parse(e);return n.aspect_ratio=t,JSON.stringify(n)}catch{return e}}function Fe(e){let t=(e||``).trim();return t.startsWith(`{`)&&t.endsWith(`}`)||t.startsWith(`[`)&&t.endsWith(`]`)}function Ie(e,t){let n=t?.params?.provider||t?.params?.endpoint||e.selectedEndpoint||Y(e);e.selectedEndpoint=n,e.providerParams=X(e,n,Me(t)),e.selectedTemplate=t?.params?.upsampleTemplate||t?.params?.upsamplerParams?.template||e.selectedTemplate||`v1`,e.parentUuid=t?.uuid||``,e.advancedMode=!1;let r=!!t?.params?.isJsonMode,i=t?.params?.sourceRawPrompt||(r?t?.upsampledPrompt:t?.rawPrompt)||``;e.prompt=i,e.cachedUpsampledPrompt=r?``:t?.upsampledPrompt||``,e.isJsonMode=!!(r||Fe(i)),e.magicPrompt=!e.isJsonMode,e.bypassUpsample=!1}function Le(e){return{prompt:e.prompt,magicPrompt:e.magicPrompt,advancedMode:e.advancedMode,isJsonMode:e.isJsonMode,selectedTemplate:e.selectedTemplate,provider:e.selectedEndpoint,providerParams:e.providerParams}}function Re(e){e.lastGeneratorSettings={magicPrompt:e.magicPrompt,advancedMode:e.advancedMode,selectedTemplate:e.selectedTemplate,provider:e.selectedEndpoint,providerParams:{...e.providerParams||{}}}}function ze(e,t){return t?ze(t,e%t):e}function Be(e){if(!e)return`1:1`;let[t,n]=e.split(`x`).map(Number),r=ze(t,n)||1;return`${t/r}:${n/r}`}async function Ve(e){if(!e)return``;let t=e.trim(),n=t.match(/```json\s*([\s\S]*?)\s*```/i);if(n)t=n[1].trim();else{let e=t.match(/```\s*([\s\S]*?)\s*```/);if(e)t=e[1].trim();else{let e=t.indexOf(`{`),n=t.lastIndexOf(`}`);e!==-1&&n!==-1&&n>e&&(t=t.substring(e,n+1))}}try{return JSON.parse(t),t}catch(e){console.warn(`Direct JSON parsing failed. Requesting repair from backend...`,e)}try{let e=await fetch(`/api/repair_json`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({text:t})});if(e.ok){let t=await e.json();if(t.repaired)return JSON.parse(t.repaired),t.repaired}}catch(e){console.error(`Backend JSON repair failed:`,e)}return JSON.parse(t),t}function Z(e){try{return JSON.parse(e)}catch{return null}}function Q(e,t,n){if(!t||!n)return;let r=e.editorUndoStacks.get(t)||[];r[r.length-1]!==n&&(r.push(n),r.length>80&&r.shift(),e.editorUndoStacks.set(t,r),e.editorRedoStacks.set(t,[]))}async function $(e,t=null){let n=e.jobQueue.find(t=>t.id===e.selectedJobId);if(n?.status===`editing`||!e.inspectorItem)return n;let r=e.inspectorItem,i=r.params?.provider||r.params?.endpoint||e.selectedEndpoint,a=e.providerParamsFromHistory(r),o=e.promptWithAspectRatio(t||r.upsampledPrompt,e.aspectRatioFromProviderParams(a)),s=await K.sendJobRequest({raw_prompt:r.rawPrompt,provider:i,upsampler:r.params?.upsampler||`deepseek`,parent_uuid:r.uuid||null,magic_prompt:!1,advanced_mode:!0,provider_params:a,upsampler_params:r.params?.upsamplerParams||{template:r.params?.upsampleTemplate||`v1`},upsampled_prompt:o,chat_messages:[{role:`system`,content:`Visual Prompt Layout Chat Assistant.`},{role:`user`,content:`Editing existing layout from history.\nOriginal prompt: ${r.rawPrompt}`},{role:`assistant`,content:o}],job_type:`editing`}),c=K.getSelectedJob();return c&&(K.updateJob(c.id,{backgroundImage:r.images?.[0]||null}),Q(e,c.id,r.upsampledPrompt)),e.inspectorItem=null,window.location.hash=`#/editor/`+s.job_id,K.getSelectedJob()}async function He(e,t){let n=await $(e,t);if(!n)return;let r=e.hasPendingJobPatch?.(n.id);n.upsampledPrompt!==t&&!r&&Q(e,n.id,n.upsampledPrompt);let i=Z(t);K.updateJob(n.id,{upsampledPrompt:t,draftJson:i},{local:!0,fields:[`upsampledPrompt`,`draftJson`]}),e.scheduleJobPatch?e.scheduleJobPatch(n.id,{upsampledPrompt:t,draftJson:i}):e.patchServerJob(n.id,{upsampledPrompt:t,draftJson:i}),e.scheduleSessionSave()}function Ue(e){let t=K.getSelectedJob();if(!t)return;let n=e.editorUndoStacks.get(t.id)||[],r=n.pop();if(!r)return;let i=e.editorRedoStacks.get(t.id)||[];i.push(t.upsampledPrompt),e.editorUndoStacks.set(t.id,n),e.editorRedoStacks.set(t.id,i);let a=Z(r);K.updateJob(t.id,{upsampledPrompt:r,draftJson:a}),e.patchServerJob(t.id,{upsampledPrompt:r,draftJson:a})}function We(e){let t=K.getSelectedJob();if(!t)return;let n=e.editorRedoStacks.get(t.id)||[],r=n.pop();if(!r)return;let i=e.editorUndoStacks.get(t.id)||[];i.push(t.upsampledPrompt),e.editorRedoStacks.set(t.id,n),e.editorUndoStacks.set(t.id,i);let a=Z(r);K.updateJob(t.id,{upsampledPrompt:r,draftJson:a}),e.patchServerJob(t.id,{upsampledPrompt:r,draftJson:a})}async function Ge(e){let t=K.jobQueue.find(t=>t.id===e.selectedJobId);if(!t)return;e.editorPinnedIndex=null;let n={...e.providerParams||t.providerParams||{}},r=e.promptWithAspectRatio(t.upsampledPrompt,e.aspectRatioFromProviderParams(n)),i=await K.sendJobRequest({raw_prompt:t.rawPrompt,provider:t.provider||t.params.endpoint||e.selectedEndpoint,upsampler:t.upsampler||`deepseek`,parent_uuid:t.parentUuid||t.uuid||null,magic_prompt:!1,advanced_mode:!1,provider_params:n,upsampler_params:t.upsamplerParams||{template:t.params.upsampleTemplate||`v1`},upsampled_prompt:r,chat_messages:t.chatMessages||[]});e.showToast(`Queued generation for "${t.rawPrompt.substring(0,30)}..."`,`success`),e.activeLeftTab=`progress`,window.location.hash=`#/job/`+i.job_id}async function Ke(e,t){let n=await $(e);if(!n)return;e.isRefining=!0,e.requestUpdate();let r=[...n.chatMessages||[],{role:`user`,content:t}],i=-1;for(let e=r.length-1;e>=0;e--)if(r[e].role===`assistant`){i=e;break}i>=0&&(r[i]={...r[i],content:n.upsampledPrompt}),K.updateJob(n.id,{chatMessages:[...r,{role:`assistant`,content:``,streaming:!0}]}),e.patchServerJob(n.id,{chatMessages:r});try{let i=await fetch(`/api/jobs/${encodeURIComponent(n.id)}/chat`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({message:t,messages:r})});if(!i.ok){let e=await i.text();throw Error(`Server chat API failed: ${i.status} - ${e}`)}let a=await i.json(),o=(a.upsampledPrompt||a.upsampled_prompt||a.content||``).trim();o=await Ve(o);let s=[...r,{role:`assistant`,content:o}];K.updateJob(n.id,{upsampledPrompt:o,chatMessages:s}),e.patchServerJob(n.id,{upsampledPrompt:o,chatMessages:s})}catch(t){console.error(`AI refinement failed:`,t);let i=[...r,{role:`assistant`,content:`Error: ${t.message}`}];K.updateJob(n.id,{chatMessages:i}),e.patchServerJob(n.id,{chatMessages:i})}finally{e.isRefining=!1,e.requestUpdate()}}var qe=class extends G{static properties={jobQueue:{type:Array},selectedJobId:{type:String}};createRenderRoot(){return this}constructor(){super(),this.jobQueue=[],this.selectedJobId=``}selectJob(e){this.dispatchEvent(new CustomEvent(`select-job`,{detail:e}))}cancelJob(e,t){t.stopPropagation(),this.dispatchEvent(new CustomEvent(`cancel-job`,{detail:e}))}clearCompleted(){this.dispatchEvent(new CustomEvent(`clear-completed-jobs`))}render(){return!this.jobQueue||this.jobQueue.length===0?F``:F`
      <div id="queuePanel" class="queue-panel">
        <div class="queue-header">
          <h4>Active Queue (<span id="queueActiveCount">${this.jobQueue.filter(e=>e.status!==`completed`&&e.status!==`failed`).length}</span>)</h4>
          <button id="clearQueueBtn" class="clear-queue-btn" @click="${this.clearCompleted}">Clear Completed</button>
        </div>
        <div class="queue-list" id="queueList">
          ${this.jobQueue.map(e=>{let t=this.selectedJobId===e.id,n=``;e.status===`pending`?n=F`<span class="q-badge pending">Pending</span>`:e.status===`upsampling`?n=F`<span class="q-badge upsampling pulse-purple">Upsampling</span>`:e.status===`upsampled`?n=F`<span class="q-badge upsampled">Upsampled</span>`:e.status===`generating`?n=F`<span class="q-badge generating pulse-blue">Generating</span>`:e.status===`completed`?n=F`<span class="q-badge completed">Done</span>`:e.status===`failed`?n=F`<span class="q-badge failed">Failed</span>`:e.status===`editing`&&(n=F`<span class="q-badge editing pulse-purple">Editing</span>`);let r=e.displayText||e.display_text||e.status,i=e.providerParams||{},a=e.params?.size||i.aspect_ratio||`dynamic`,o=e.params?.seed??i.seed??0;return F`
              <div class="queue-item ${e.status} ${t?`selected`:``}" @click="${()=>this.selectJob(e)}">
                <div class="q-item-info">
                  <div class="q-item-prompt">${e.rawPrompt}</div>
                  <div class="q-item-meta">Size: ${a} | Seed: ${o} | ${n} <span class="q-item-detail">${r}</span></div>
                </div>
                <div class="q-item-actions">
                  <button class="q-cancel-btn" title="Remove Job" @click="${t=>this.cancelJob(e.id,t)}">
                    ${q(`close`,12)}
                  </button>
                </div>
              </div>
            `})}
        </div>
      </div>
    `}};customElements.define(`job-queue`,qe);var Je=class extends G{static properties={templates:{type:Array},hasCachedUpsample:{type:Boolean},prompt:{type:String},magicPrompt:{type:Boolean},bypassUpsample:{type:Boolean},selectedTemplate:{type:String},advancedMode:{type:Boolean},endpoints:{type:Array},selectedEndpoint:{type:String},providerSchemas:{type:Object},providerParams:{type:Object},isEditing:{type:Boolean},jobQueue:{type:Array},selectedJobId:{type:String},activeLeftTab:{type:String},isJsonMode:{type:Boolean}};createRenderRoot(){return this}constructor(){super(),this.templates=[],this.hasCachedUpsample=!1,this.prompt=``,this.magicPrompt=!0,this.bypassUpsample=!1,this.selectedTemplate=``,this.advancedMode=!1,this.endpoints=[],this.selectedEndpoint=``,this.providerSchemas={},this.providerParams={},this.isEditing=!1,this.jobQueue=[],this.selectedJobId=``,this.activeLeftTab=`generator`,this.isJsonMode=!1}onPromptInput(e){this.prompt=e.target.value;let t=this.prompt.trim(),n=t.startsWith(`{`)&&t.endsWith(`}`)||t.startsWith(`[`)&&t.endsWith(`]`)||t.startsWith("```json")||t.startsWith("```")&&(t.includes(`{`)||t.includes(`[`));n&&!this.isJsonMode?(this.isJsonMode=!0,this.dispatchEvent(new CustomEvent(`is-json-change`,{detail:!0}))):!n&&this.isJsonMode&&t===``&&(this.isJsonMode=!1,this.dispatchEvent(new CustomEvent(`is-json-change`,{detail:!1}))),this.dispatchEvent(new CustomEvent(`prompt-change`,{detail:this.prompt}))}onJsonModeToggle(e){this.isJsonMode=e.target.checked,this.dispatchEvent(new CustomEvent(`is-json-change`,{detail:this.isJsonMode}))}onMagicToggle(e){this.magicPrompt=e.target.checked,this.dispatchEvent(new CustomEvent(`magic-change`,{detail:this.magicPrompt}))}onBypassToggle(e){this.bypassUpsample=e.target.checked,this.dispatchEvent(new CustomEvent(`bypass-change`,{detail:this.bypassUpsample}))}onTemplateChange(e){this.selectedTemplate=e.target.value,this.dispatchEvent(new CustomEvent(`template-change`,{detail:this.selectedTemplate}))}onAdvancedToggle(e){this.advancedMode=e.target.checked,this.dispatchEvent(new CustomEvent(`advanced-change`,{detail:this.advancedMode}))}onEndpointChange(e){this.selectedEndpoint=e.target.value,this.dispatchEvent(new CustomEvent(`endpoint-change`,{detail:this.selectedEndpoint}))}onDynamicInput(e,t,n){let r=t.type===`checkbox`?n.target.checked:n.target.value;if(t.type===`number`||t.type===`slider`||t.type===`range`)r=r===``?``:Number(r);else if(t.type===`select`){let e=(t.options||[]).find(e=>String(e.value)===String(r));e&&typeof e.value!=`string`&&(r=e.value)}this.providerParams={...this.providerParams,[e]:r},this.dispatchEvent(new CustomEvent(`provider-params-change`,{detail:this.providerParams}))}isInputVisible(e){return e.visible_when?Object.entries(e.visible_when).every(([e,t])=>this.providerParams[e]===t):!0}renderDynamicInput(e,t){if(!t||!this.isInputVisible(t))return F``;let n=this.providerParams[e]??t.default??``;if(t.type===`select`)return F`
        <label class="section-label" for="provider-${e}">${t.label}</label>
        <select id="provider-${e}" .value="${String(n)}" @change="${n=>this.onDynamicInput(e,t,n)}">
          ${(t.options||[]).map(e=>F`
            <option value="${String(e.value)}" ?selected="${String(n)===String(e.value)}">${e.label}</option>
          `)}
        </select>
      `;if(t.type===`checkbox`)return F`
        <div class="checkbox-wrapper">
          <input id="provider-${e}" type="checkbox" .checked="${!!n}" @change="${n=>this.onDynamicInput(e,t,n)}">
          <label class="checkbox-label" for="provider-${e}">
            <span class="checkbox-custom"></span>
            <span class="label-title">${t.label}</span>
          </label>
        </div>
      `;let r=t.type===`slider`||t.type===`range`?`range`:t.type;return F`
      <label class="section-label" for="provider-${e}">${t.label}</label>
      <input
        id="provider-${e}"
        type="${r}"
        .value="${String(n)}"
        min="${t.min??``}"
        max="${t.max??``}"
        step="${t.step??``}"
        placeholder="${t.placeholder??``}"
        @input="${n=>this.onDynamicInput(e,t,n)}">
    `}renderDynamicSettings(){let e=this.providerSchemas?.[this.selectedEndpoint];return e?F`
      ${(e.layout||[]).map(t=>F`
        <div class="panel-section" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.75rem;">
          ${t.map(t=>{let n=e.inputs?.[t.id];return!n||!this.isInputVisible(n)?F``:F`
              <div style="grid-column:span ${Math.min(Number(t.col_span)||1,2)};">
                ${this.renderDynamicInput(t.id,n)}
              </div>
            `})}
        </div>
      `)}
    `:F``}triggerGenerate(){if(!this.prompt.trim()){alert(`Please enter a prompt idea first!`);return}this.dispatchEvent(new CustomEvent(`generate`,{detail:{prompt:this.prompt,magicPrompt:this.magicPrompt,bypassUpsample:this.bypassUpsample,selectedTemplate:this.selectedTemplate,advancedMode:this.advancedMode,endpoint:this.selectedEndpoint,providerParams:this.providerParams,isJsonMode:this.isJsonMode}}))}switchLeftTab(e){this.dispatchEvent(new CustomEvent(`left-tab-change`,{detail:e}))}render(){let e=(this.jobQueue||[]).filter(e=>e.status!==`completed`&&e.status!==`failed`).length,t=(this.jobQueue||[]).some(e=>e.status===`upsampling`||e.status===`generating`);return F`
      <section class="control-panel glass-card">
        <div class="panel-tabs">
          <button class="tab-btn ${this.activeLeftTab===`generator`?`active`:``}" @click="${()=>this.switchLeftTab(`generator`)}">Generator</button>
          <button class="tab-btn ${this.activeLeftTab===`progress`?`active`:``}" @click="${()=>this.switchLeftTab(`progress`)}">
            Progress
            ${e>0?F`<span class="badge-active-count">${e}</span>`:``}
            ${t?F`<span class="glowing-dot"></span>`:``}
          </button>
        </div>

        <!-- Tab Content: Generator -->
        <div class="control-panel-content ${this.activeLeftTab===`generator`?``:`hidden`}">
          <div class="panel-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <label for="promptInput" class="section-label" style="margin-bottom: 0;">Prompt Idea</label>
              
              <!-- JSON Mode Toggle -->
              <div class="checkbox-wrapper" style="margin-bottom: 0;">
                <input type="checkbox" id="jsonModeToggle" ?disabled="${this.isEditing}" .checked="${this.isJsonMode}" @change="${this.onJsonModeToggle}">
                <label for="jsonModeToggle" class="checkbox-label" style="font-size: 0.8rem;">
                  <span class="checkbox-custom"></span>
                  <span class="label-title">JSON Mode</span>
                </label>
              </div>
            </div>
            <textarea id="promptInput" ?disabled="${this.isEditing}" .value="${this.prompt}" @input="${this.onPromptInput}" placeholder="${this.isJsonMode?`Paste or enter your Ideogram 4 JSON prompt here...`:`Describe the image you want to create in natural language... (e.g., 'a cinematic shot of a red panda wearing a tiny crown')`}"></textarea>
            ${this.isEditing?F`<p class="section-hint" style="color: var(--accent-purple); font-weight: 500;">Layout editor active: prompt controls are read-only here. Adjust image settings below, then use Generate Image Now in the editor.</p>`:``}
          </div>

          <!-- Bypass Upsample Option -->
          <div id="bypassUpsampleContainer" class="panel-section bypass-upsample-section ${this.hasCachedUpsample&&!this.isEditing&&!this.isJsonMode?``:`hidden`}">
            <div class="checkbox-wrapper">
              <input type="checkbox" id="bypassUpsampleToggle" ?disabled="${this.isEditing}" .checked="${this.bypassUpsample}" @change="${this.onBypassToggle}">
              <label for="bypassUpsampleToggle" class="checkbox-label">
                <span class="checkbox-custom"></span>
                <span class="label-title">Reuse cached generated prompt</span>
              </label>
            </div>
            <p class="section-hint">Uses the generated JSON prompt saved with this history item and skips upsampling. Editing the text prompt clears this cache.</p>
          </div>

          <!-- Advanced Mode Toggle when JSON Mode is active -->
          ${this.isJsonMode&&!this.isEditing?F`
            <div class="panel-section" style="margin-top: -0.5rem; margin-bottom: 1.25rem;">
              <div class="checkbox-wrapper">
                <input type="checkbox" id="advancedModeToggleJson" .checked="${this.advancedMode}" @change="${this.onAdvancedToggle}">
                <label for="advancedModeToggleJson" class="checkbox-label">
                  <span class="checkbox-custom"></span>
                  <span class="label-title">Advanced Editor Mode</span>
                </label>
              </div>
              <p class="section-hint">Pause to let you edit bounding boxes and layout in the director canvas before generating.</p>
            </div>
          `:``}

          <div class="panel-section magic-prompt-section ${this.isEditing||this.isJsonMode?`hidden`:``}">
            <div class="checkbox-wrapper">
              <input type="checkbox" id="magicPromptToggle" ?disabled="${this.isEditing}" .checked="${this.magicPrompt}" @change="${this.onMagicToggle}">
              <label for="magicPromptToggle" class="checkbox-label">
                <span class="checkbox-custom"></span>
                  <span class="label-title">Magic Prompt</span>
              </label>
            </div>
            
            <div class="template-select-wrapper ${this.magicPrompt?``:`hidden`}" id="templateSelectWrapper">
              <label for="templateSelect" class="sub-label">Template Version</label>
              <select id="templateSelect" ?disabled="${this.isEditing}" .value="${this.selectedTemplate}" @change="${this.onTemplateChange}">
                ${this.templates.map(e=>F`<option value="${e}" ?selected="${this.selectedTemplate===e}">${e}</option>`)}
              </select>
            </div>

            <!-- Advanced Mode Toggle -->
            <div id="advancedModeContainer" class="advanced-mode-wrapper ${this.magicPrompt?``:`hidden`}">
              <div class="checkbox-wrapper">
                <input type="checkbox" id="advancedModeToggle" ?disabled="${this.isEditing}" .checked="${this.advancedMode}" @change="${this.onAdvancedToggle}">
                <label for="advancedModeToggle" class="checkbox-label">
                  <span class="checkbox-custom"></span>
                  <span class="label-title">Advanced Editor Mode</span>
                </label>
              </div>
            </div>

            <p class="section-hint">Uses the configured upsampler to expand your natural prompt. Advanced mode pauses to let you edit bounding boxes and layout.</p>
          </div>

          <!-- Inference Endpoint Selector -->
          <div class="panel-section">
            <label for="endpointSelect" class="section-label">Inference Endpoint</label>
            <select id="endpointSelect" .value="${this.selectedEndpoint}" @change="${this.onEndpointChange}">
              ${Object.entries(this.providerSchemas||{}).filter(([,e])=>e.type===`generation`).map(([e,t])=>F`<option value="${e}" ?selected="${this.selectedEndpoint===e}">${t.displayName}${t.default?` (default)`:``}</option>`)}
            </select>
          </div>

          ${this.renderDynamicSettings()}

          <button id="generateBtn" class="generate-btn" ?disabled="${this.isEditing}" @click="${this.triggerGenerate}">
            <span class="btn-glow"></span>
            <span class="btn-text">${this.isEditing?`Use Editor Generate`:`Generate Masterpiece`}</span>
          </button>
        </div>

        <!-- Tab Content: Progress / Queue -->
        <div class="control-panel-content ${this.activeLeftTab===`progress`?``:`hidden`}">
          <job-queue
            .jobQueue="${this.jobQueue}"
            .selectedJobId="${this.selectedJobId}"
            @select-job="${e=>this.dispatchEvent(new CustomEvent(`select-job`,{detail:e.detail}))}"
            @cancel-job="${e=>this.dispatchEvent(new CustomEvent(`cancel-job`,{detail:e.detail}))}"
            @clear-completed-jobs="${()=>this.dispatchEvent(new CustomEvent(`clear-completed-jobs`))}">
          </job-queue>
        </div>
      </section>
    `}};customElements.define(`control-panel`,Je);var Ye=class extends G{static properties={images:{type:Array},rawPrompt:{type:String},seed:{type:Number},params:{type:Object},upsampledPrompt:{type:String},uuid:{type:String},parentUuid:{type:String}};createRenderRoot(){return this}constructor(){super(),this.images=[],this.rawPrompt=``,this.seed=0,this.params={},this.upsampledPrompt=``,this.uuid=``,this.parentUuid=``}openLightbox(e,t){let n={uuid:this.uuid,parentUuid:this.parentUuid,rawPrompt:this.rawPrompt,images:this.images,params:this.params,upsampledPrompt:this.upsampledPrompt};this.dispatchEvent(new CustomEvent(`open-lightbox`,{detail:{src:e,prompt:this.rawPrompt,seed:`${this.seed} (Image ${t+1})`,item:n,imgIdx:t}}))}render(){if(!this.images||this.images.length===0)return F``;let[e,t]=(this.params?.size||`1024x1024`).split(`x`).map(Number),n=e&&t?`${e} / ${t}`:`1 / 1`;return F`
      <div class="image-grid" id="imageGrid">
        ${this.images.map((e,t)=>F`
          <div class="image-card" style="aspect-ratio: ${n};">
            <img src="${e}" alt="Generated masterpiece ${t+1}" @click="${()=>this.openLightbox(e,t)}">
            <div class="image-actions">
              <a class="download-icon-btn" href="${e}" download="ideogram_${this.seed}_${t}.png" title="Download Image">
                ${q(`download`,14)}
              </a>
            </div>
          </div>
        `)}
      </div>
    `}};customElements.define(`image-grid`,Ye);var Xe=class extends G{static properties={upsampledPrompt:{type:String},isOpen:{type:Boolean}};createRenderRoot(){return this}constructor(){super(),this.upsampledPrompt=``,this.isOpen=!1}toggleOpen(){this.isOpen=!this.isOpen}render(){if(!this.upsampledPrompt)return F``;let e=this.upsampledPrompt;try{let t=JSON.parse(this.upsampledPrompt);e=JSON.stringify(t,null,2)}catch{}return F`
      <div class="inspector-section ${this.isOpen?`open`:``}">
        <div class="inspector-header" @click="${this.toggleOpen}">
          <span>Magic Prompt JSON Caption</span>
          <span class="toggle-icon">
            ${q(`chevronDown`,18)}
          </span>
        </div>
        <div class="inspector-body ${this.isOpen?``:`hidden`}">
          <pre><code>${e}</code></pre>
        </div>
      </div>
    `}};customElements.define(`prompt-inspector`,Xe);var Ze=class extends G{static properties={aspectRatio:{type:String},elements:{type:Array},selectedElementIndex:{type:Number},pinnedBoxIndex:{type:Number},backgroundImage:{type:String},readOnly:{type:Boolean},_canvasWidth:{type:Number,state:!0},_canvasHeight:{type:Number,state:!0},_hoveredBoxIndex:{type:Number,state:!0},_hoveredCorner:{type:String,state:!0}};createRenderRoot(){return this}constructor(){super(),this.aspectRatio=`1:1`,this.elements=[],this.selectedElementIndex=null,this.pinnedBoxIndex=null,this.backgroundImage=``,this.readOnly=!1,this._canvasWidth=0,this._canvasHeight=0,this._hoveredBoxIndex=null,this._hoveredCorner=null}connectedCallback(){super.connectedCallback(),this._resizeObserver=new ResizeObserver(()=>{this._updateCanvasDimensions()})}disconnectedCallback(){super.disconnectedCallback(),this._resizeObserver&&this._resizeObserver.disconnect()}firstUpdated(){let e=this.querySelector(`.bbox-canvas-outer`);e&&this._resizeObserver&&this._resizeObserver.observe(e),this._updateCanvasDimensions()}updated(e){e.has(`aspectRatio`)&&this._updateCanvasDimensions()}_updateCanvasDimensions(){let e=this.querySelector(`.bbox-canvas-outer`);if(!e)return;let t=window.getComputedStyle(e),n=parseFloat(t.paddingLeft)||0,r=parseFloat(t.paddingRight)||0,i=parseFloat(t.paddingTop)||0,a=parseFloat(t.paddingBottom)||0,o=e.clientWidth-n-r,s=e.clientHeight-i-a;if(o<=0||s<=0)return;let c=(this.aspectRatio||`1:1`).split(`:`),l=1,u=1;c.length===2&&(l=Number(c[0])||1,u=Number(c[1])||1);let d=l/u,f=o/s,p,m;f>d?(m=s,p=s*d):(p=o,m=o/d),this._canvasWidth=Math.round(p),this._canvasHeight=Math.round(m),this.requestUpdate()}selectElement(e){this.selectedElementIndex=e,this.dispatchEvent(new CustomEvent(`element-selected`,{detail:e}))}onMouseMoveBbox(e){let t=e.currentTarget.querySelector(`.bbox-tooltip`);if(!t)return;let n=t.offsetHeight||140,r=e.clientX+15,i=e.clientY+15,a=window.innerWidth,o=window.innerHeight;r+260>a-10&&(r=e.clientX-260-15),r<10&&(r=10),i+n>o-10&&(i=e.clientY-n-15),i<10&&(i=10),t.style.left,t.style.top,t.style.left=`0px`,t.style.top=`0px`;let s=t.getBoundingClientRect(),c=s.left,l=s.top;t.style.left=`${r-c}px`,t.style.top=`${i-l}px`}onCanvasMouseMove(e){let t=this.querySelector(`#bboxCanvas`);if(!t)return;let n=t.querySelectorAll(`.bbox-element`),r=this.pinnedBoxIndex!==void 0&&this.pinnedBoxIndex!==null?this.pinnedBoxIndex:-1,i=e.clientX,a=e.clientY;if(r!==-1){let e=t.querySelector(`.bbox-element[data-index="${r}"]`);if(e){let t=e.getBoundingClientRect(),n=Math.hypot(i-t.right,a-t.bottom);this._hoveredBoxIndex=r,this._hoveredCorner=n<30?`bottom-right`:`top-left`}else this._hoveredBoxIndex=null,this._hoveredCorner=null;return}if(this.selectedElementIndex!==null){let e=t.querySelector(`.bbox-element[data-index="${this.selectedElementIndex}"]`);if(e){let t=e.getBoundingClientRect();if(i>=t.left&&i<=t.right&&a>=t.top&&a<=t.bottom&&Math.hypot(i-t.right,a-t.bottom)<30){this._hoveredBoxIndex=this.selectedElementIndex,this._hoveredCorner=`bottom-right`;return}}}let o=1/0,s=null,c=null;n.forEach(e=>{let t=parseInt(e.getAttribute(`data-index`),10),n=e.getBoundingClientRect();if(!(i>=n.left&&i<=n.right&&a>=n.top&&a<=n.bottom))return;let r=Math.hypot(i-n.right,a-n.bottom),l=Math.hypot(i-n.left,a-n.top),u,d;r<30?(u=r,d=`bottom-right`):(u=l,d=`top-left`),u<o&&(o=u,s=t,c=d)}),s===null?(this._hoveredBoxIndex=null,this._hoveredCorner=null):(this._hoveredBoxIndex=s,this._hoveredCorner=c)}onCanvasMouseLeave(){this._hoveredBoxIndex=null,this._hoveredCorner=null}onCanvasMouseDown(e){if(this.readOnly){this._hoveredBoxIndex!==null&&this.selectElement(this._hoveredBoxIndex);return}if(this.pinnedBoxIndex!==null&&this.pinnedBoxIndex!==void 0){let t=this.pinnedBoxIndex;this.selectElement(t);let n=this.querySelector(`#bboxCanvas`)?.querySelector(`.bbox-element[data-index="${t}"]`);if(n){let r=n.getBoundingClientRect();Math.hypot(e.clientX-r.right,e.clientY-r.bottom)<30?this.startResizing(t,e):this.startMoving(t,e)}return}if(this._hoveredBoxIndex!==null&&this._hoveredCorner!==null){e.preventDefault(),e.stopPropagation();let t=this._hoveredBoxIndex;this.selectElement(t),this._hoveredCorner===`bottom-right`?this.startResizing(t,e):this.startMoving(t,e)}}startMoving(e,t){let n=this.querySelector(`.bbox-element[data-index="${e}"]`),r=this.querySelector(`#bboxCanvas`);if(!n||!r)return;let i=t.clientX,a=t.clientY,o=r.getBoundingClientRect(),s=n.offsetLeft/o.width*100,c=n.offsetTop/o.height*100,l=n.offsetWidth/o.width*100,u=n.offsetHeight/o.height*100,d=e=>{let t=(e.clientX-i)/o.width*100,r=(e.clientY-a)/o.height*100,d=Math.max(0,Math.min(100-l,s+t)),f=Math.max(0,Math.min(100-u,c+r));n.style.left=`${d}%`,n.style.top=`${f}%`},f=()=>{document.removeEventListener(`mousemove`,d),document.removeEventListener(`mouseup`,f);let t=parseFloat(n.style.left),r=parseFloat(n.style.top),i=parseFloat(n.style.width||l),a=parseFloat(n.style.height||u),o=Math.round(r*10),s=Math.round(t*10),c=Math.round((r+a)*10),p=Math.round((t+i)*10);this.dispatchEvent(new CustomEvent(`element-updated`,{detail:{index:e,bbox:[Math.max(0,Math.min(1e3,o)),Math.max(0,Math.min(1e3,s)),Math.max(0,Math.min(1e3,c)),Math.max(0,Math.min(1e3,p))]}}))};document.addEventListener(`mousemove`,d),document.addEventListener(`mouseup`,f)}startResizing(e,t){let n=this.querySelector(`.bbox-element[data-index="${e}"]`),r=this.querySelector(`#bboxCanvas`);if(!n||!r)return;let i=t.clientX,a=t.clientY,o=r.getBoundingClientRect(),s=n.offsetWidth/o.width*100,c=n.offsetHeight/o.height*100,l=n.offsetLeft/o.width*100,u=n.offsetTop/o.height*100,d=e=>{let t=(e.clientX-i)/o.width*100,r=(e.clientY-a)/o.height*100,d=Math.max(2,Math.min(100-l,s+t)),f=Math.max(2,Math.min(100-u,c+r));n.style.width=`${d}%`,n.style.height=`${f}%`},f=()=>{document.removeEventListener(`mousemove`,d),document.removeEventListener(`mouseup`,f);let t=parseFloat(n.style.width),r=parseFloat(n.style.height),i=Math.round(u*10),a=Math.round(l*10),o=Math.round((u+r)*10),s=Math.round((l+t)*10);this.dispatchEvent(new CustomEvent(`element-updated`,{detail:{index:e,bbox:[Math.max(0,Math.min(1e3,i)),Math.max(0,Math.min(1e3,a)),Math.max(0,Math.min(1e3,o)),Math.max(0,Math.min(1e3,s))]}}))};document.addEventListener(`mousemove`,d),document.addEventListener(`mouseup`,f)}render(){let e=``;if(this._canvasWidth&&this._canvasHeight)e=`width: ${this._canvasWidth}px; height: ${this._canvasHeight}px;`;else{let t=(this.aspectRatio||`1:1`).split(`:`);t.length===2&&(e=`aspect-ratio: ${Number(t[0])||1} / ${Number(t[1])||1}; max-width: 100%; max-height: 100%;`)}return this.backgroundImage&&(e+=` background-image: url('${this.backgroundImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;`),F`
      <div class="bbox-canvas-outer">
        <div class="bbox-aspect-ratio-wrapper">
          <div id="bboxCanvas" class="bbox-canvas" style="${e}"
               @mousemove="${this.onCanvasMouseMove}"
               @mouseleave="${this.onCanvasMouseLeave}"
               @mousedown="${this.onCanvasMouseDown}">
            ${(this.elements||[]).map((e,t)=>{let n=e.bbox||[0,0,1e3,1e3],r=n[0],i=n[1],a=n[2],o=n[3],s=r/10,c=i/10,l=(o-i)/10,u=(a-r)/10,d=this.selectedElementIndex===t,f=this.pinnedBoxIndex===t;return F`
                <div class="bbox-element ${d?`active`:``} ${this._hoveredBoxIndex===t?`hovered`:``} ${this._hoveredBoxIndex===t&&this._hoveredCorner===`bottom-right`?`hovered-resize`:``} ${f?`pinned`:``}" 
                     data-index="${t}"
                     style="top: ${s}%; left: ${c}%; width: ${l}%; height: ${u}%;"
                     @mouseenter="${this.onMouseMoveBbox}"
                     @mousemove="${this.onMouseMoveBbox}">
                  <span class="bbox-badge ${this._hoveredBoxIndex===t&&this._hoveredCorner===`top-left`?`focus-hover`:``}">${String(t+1).padStart(2,`0`)}</span>
                  <span class="bbox-label">
                    ${e.type===`text`?e.text||``:e.desc&&e.desc.length>20?e.desc.slice(0,17)+`...`:e.desc||`Object`}
                  </span>
                  <div class="bbox-resizer ${this._hoveredBoxIndex===t&&this._hoveredCorner===`bottom-right`?`focus-hover`:``}"></div>
                  <div class="bbox-tooltip">
                    <div style="font-weight: 700; color: var(--accent-purple); text-transform: uppercase; font-size: 0.72rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.15rem;">Element #${t+1}</div>
                    <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Prompt:</span> "${e.text||e.desc||`Object`}"</div>
                    <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Type:</span> ${e.type||`obj`}</div>
                    <div><span style="color: var(--text-secondary);">BBox:</span> [${n.join(`, `)}]</div>
                  </div>
                </div>
              `})}
          </div>
        </div>
      </div>
    `}};customElements.define(`bbox-canvas`,Ze);var Qe=class extends G{static properties={upsampledPrompt:{type:String},backgroundImage:{type:String},selectedElementIndex:{type:Number},pinnedBoxIndex:{type:Number},readOnly:{type:Boolean}};createRenderRoot(){return this}constructor(){super(),this.upsampledPrompt=``,this.backgroundImage=``,this.selectedElementIndex=null,this.pinnedBoxIndex=null,this.readOnly=!1,this._boundKeyDown=e=>this.onKeyDown(e)}connectedCallback(){super.connectedCallback(),window.addEventListener(`keydown`,this._boundKeyDown)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener(`keydown`,this._boundKeyDown)}get parsedPrompt(){try{let e=JSON.parse(this.upsampledPrompt);return e.aspect_ratio||=`1:1`,e.compositional_deconstruction||={background:``,elements:[]},e.compositional_deconstruction.elements||(e.compositional_deconstruction.elements=[]),e}catch{return{aspect_ratio:`1:1`,compositional_deconstruction:{background:``,elements:[]}}}}updatePrompt(e){this.upsampledPrompt=JSON.stringify(e),this.dispatchEvent(new CustomEvent(`update-prompt`,{detail:this.upsampledPrompt}))}isTypingTarget(e){if(!e)return!1;let t=e.tagName?.toLowerCase();return t===`input`||t===`textarea`||t===`select`||e.isContentEditable}onKeyDown(e){let t=e.key.toLowerCase(),n=this.isTypingTarget(document.activeElement);if((e.ctrlKey||e.metaKey)&&t===`z`){e.preventDefault(),this.dispatchEvent(new CustomEvent(e.shiftKey?`editor-redo`:`editor-undo`));return}if((e.ctrlKey||e.metaKey)&&t===`y`){e.preventDefault(),this.dispatchEvent(new CustomEvent(`editor-redo`));return}if((e.ctrlKey||e.metaKey)&&t===`d`){e.preventDefault(),this.readOnly||this.duplicateSelected();return}n||(t===`p`||t===`l`?(e.preventDefault(),this.toggleSelectedPin()):e.key===`Tab`?(e.preventDefault(),this.cyclePin()):e.key===`Escape`?(e.preventDefault(),this.dispatchEvent(new CustomEvent(`element-pinned`,{detail:null})),this.dispatchEvent(new CustomEvent(`element-selected`,{detail:null}))):(e.key===`Delete`||e.key===`Backspace`)&&!this.readOnly&&(e.preventDefault(),this.deleteSelected()))}onElementSelected(e){this.dispatchEvent(new CustomEvent(`element-selected`,{detail:e.detail}))}onElementUpdated(e){if(this.readOnly)return;let{index:t,bbox:n}=e.detail,r=this.parsedPrompt;r.compositional_deconstruction.elements[t].bbox=n,this.updatePrompt(r)}addElement(){if(this.readOnly)return;let e=this.parsedPrompt;e.compositional_deconstruction.elements.push({type:`obj`,bbox:[350,350,650,650],desc:`a new element box`}),this.updatePrompt(e);let t=e.compositional_deconstruction.elements.length-1;this.dispatchEvent(new CustomEvent(`element-selected`,{detail:t}))}deleteSelected(){if(this.readOnly||this.selectedElementIndex===null)return;let e=this.parsedPrompt,t=e.compositional_deconstruction.elements||[];t[this.selectedElementIndex]&&(t.splice(this.selectedElementIndex,1),this.dispatchEvent(new CustomEvent(`element-selected`,{detail:null})),this.dispatchEvent(new CustomEvent(`element-pinned`,{detail:null})),this.updatePrompt(e))}duplicateSelected(){if(this.readOnly||this.selectedElementIndex===null)return;let e=this.parsedPrompt,t=e.compositional_deconstruction.elements||[],n=t[this.selectedElementIndex];if(!n)return;let r=JSON.parse(JSON.stringify(n)),i=r.bbox||[350,350,650,650];r.bbox=[Math.min(1e3,i[0]+30),Math.min(1e3,i[1]+30),Math.min(1e3,i[2]+30),Math.min(1e3,i[3]+30)],t.splice(this.selectedElementIndex+1,0,r),this.updatePrompt(e),this.dispatchEvent(new CustomEvent(`element-selected`,{detail:this.selectedElementIndex+1}))}toggleSelectedPin(){if(this.selectedElementIndex===null)return;let e=this.pinnedBoxIndex===this.selectedElementIndex?null:this.selectedElementIndex;this.dispatchEvent(new CustomEvent(`element-pinned`,{detail:e}))}cyclePin(){let e=this.parsedPrompt.compositional_deconstruction.elements||[];if(!e.length)return;let t=this.pinnedBoxIndex??this.selectedElementIndex;if(t==null)return;let n=(t+1)%e.length;this.dispatchEvent(new CustomEvent(`element-selected`,{detail:n})),this.dispatchEvent(new CustomEvent(`element-pinned`,{detail:n}))}discardJob(){confirm(`Discard this generation job?`)&&this.dispatchEvent(new CustomEvent(`cancel`))}generateImage(){this.dispatchEvent(new CustomEvent(`generate`))}render(){let e=this.parsedPrompt,t=e.compositional_deconstruction.elements||[];return F`
      <div id="editorPanel" class="editor-panel">
        <div class="editor-header">
          <h3>✨ Advanced Layout Director</h3>
          <p class="editor-subtitle">${this.readOnly?`Inspect the saved layout. Your first edit will create a new draft.`:`Drag bounding boxes to compose your scene. Use the panel on the right to edit descriptions and chat with the AI.`}</p>
        </div>

        <!-- Canvas takes all available vertical space -->
        <div class="editor-canvas-column">
          <bbox-canvas
            .aspectRatio="${e.aspect_ratio}"
            .elements="${t}"
            .selectedElementIndex="${this.selectedElementIndex}"
            .pinnedBoxIndex="${this.pinnedBoxIndex}"
            .backgroundImage="${this.backgroundImage}"
            .readOnly="${this.readOnly}"
            @element-selected="${this.onElementSelected}"
            @element-updated="${this.onElementUpdated}">
          </bbox-canvas>
          <div class="canvas-actions">
            <button id="undoEditorBtn" class="editor-btn-secondary" @click="${()=>this.dispatchEvent(new CustomEvent(`editor-undo`))}" ?disabled="${this.readOnly}" title="Undo">
              Undo
            </button>
            <button id="redoEditorBtn" class="editor-btn-secondary" @click="${()=>this.dispatchEvent(new CustomEvent(`editor-redo`))}" ?disabled="${this.readOnly}" title="Redo">
              Redo
            </button>
            <button id="duplicateBoxBtn" class="editor-btn-secondary" @click="${this.duplicateSelected}" ?disabled="${this.readOnly||this.selectedElementIndex===null}" title="Duplicate selected box">
              Duplicate
            </button>
            <button id="deleteBoxBtn" class="editor-btn-secondary" @click="${this.deleteSelected}" ?disabled="${this.readOnly||this.selectedElementIndex===null}" title="Delete selected box">
              Delete
            </button>
            <button id="addBoxBtn" class="editor-btn-secondary" @click="${this.addElement}" ?disabled="${this.readOnly}">
              ${q(`plus`,14)}
              Add Element Box
            </button>
          </div>
        </div>

        <!-- Bottom Actions Bar -->
        <div class="editor-actions-bar">
          <button id="editorCancelBtn" class="editor-btn-cancel" @click="${this.discardJob}">${this.readOnly?`Close Inspector`:`Discard Job`}</button>
          <div class="right-actions">
            <button id="editorGenerateBtn" class="generate-btn" @click="${this.generateImage}" ?disabled="${this.readOnly}">
              <span class="btn-glow"></span>
              <span class="btn-text">Generate Image Now</span>
            </button>
          </div>
        </div>
      </div>
    `}};customElements.define(`layout-editor`,Qe);var $e=class extends G{static properties={historyItems:{type:Array},showBboxes:{type:Boolean}};createRenderRoot(){return this}constructor(){super(),this.historyItems=[],this.showBboxes=!1}reuse(e){this.dispatchEvent(new CustomEvent(`reuse`,{detail:e}))}reuseAdvanced(e){let t=e.images&&e.images.length>0?e.images[0]:null;this.dispatchEvent(new CustomEvent(`reuse-advanced`,{detail:{item:e,bgImage:t}}))}deleteItem(e){this.dispatchEvent(new CustomEvent(`delete-item`,{detail:e}))}openLightbox(e,t,n,r,i){this.dispatchEvent(new CustomEvent(`open-lightbox`,{detail:{src:e,prompt:t,seed:`${n} (Image ${i+1})`,item:r,imgIdx:i}}))}onMouseMoveBbox(e){let t=e.currentTarget.querySelector(`.bbox-tooltip`);if(!t)return;let n=t.offsetHeight||140,r=e.clientX+15,i=e.clientY+15,a=window.innerWidth,o=window.innerHeight;r+260>a-10&&(r=e.clientX-260-15),r<10&&(r=10),i+n>o-10&&(i=e.clientY-n-15),i<10&&(i=10),t.style.left,t.style.top,t.style.left=`0px`,t.style.top=`0px`;let s=t.getBoundingClientRect(),c=s.left,l=s.top;t.style.left=`${r-c}px`,t.style.top=`${i-l}px`}aspectRatioForItem(e){let t=e?.params?.providerParams||{},n=t.aspect_ratio||e?.params?.aspect_ratio;if(n&&String(n).includes(`:`))return{label:String(n),css:String(n).replace(`:`,` / `)};let r=t.size||e?.params?.size||`1024x1024`,[i,a]=String(r).split(`x`).map(Number);return{label:Be(r),css:i&&a?`${i} / ${a}`:`1 / 1`}}getTreeRoots(){if(!this.historyItems||this.historyItems.length===0)return[];let e=new Map;for(let t of this.historyItems)e.set(t.uuid,{item:t,children:[]});let t=[];for(let n of e.values()){let r=n.item.parentUuid;r&&e.has(r)?e.get(r).children.push(n):t.push(n)}let n=e=>{let t=e.item.timestamp;for(let r of e.children)t=Math.max(t,n(r));return t},r=t.map(e=>({rootNode:e,maxTimestamp:n(e)}));return r.sort((e,t)=>t.maxTimestamp-e.maxTimestamp),r.map(e=>e.rootNode)}renderTree(e,t=0){let n=e.item,r=new Date(n.timestamp).toLocaleString(),i=[],a=n.params.providerParams||{},o=a.sampler_preset||n.params.preset||`V4_QUALITY_48`,s=this.aspectRatioForItem(n);if(i.push(`Aspect: ${s.label}`),o===`custom`){i.push(`Steps: ${a.steps??n.params.steps??48}`);let e=a.guidance??n.params.guidance;e&&i.push(`CFG: ${e}`)}else i.push(`Preset: ${String(o).replace(`V4_`,``).replace(`_`,` `)}`);if(i.push(`Seed: ${a.seed??n.params.seed??0}`),n.params.endpoint){let e=n.params.endpointType||`modal`;i.push(`Endpoint: ${e} | ${n.params.endpoint}`)}let c=s.css;return e.children.sort((e,t)=>e.item.timestamp-t.item.timestamp),F`
      <div class="history-card-wrapper" style="margin-left: ${t*28}px; position: relative;">
        ${t>0?F`
          <div class="history-card-branch-line"></div>
        `:``}
        <div class="history-card ${t>0?`nested-card`:``}">
          <div class="history-card-header">
            <div class="history-card-time-group">
              <span class="history-card-time">${r}</span>
              ${n.upsampledPrompt?F`
                <span class="history-badge magic">✨ Magic (${n.params.upsampleTemplate||`v1`})</span>
              `:``}
              ${n.parentUuid?(()=>{let e=this.historyItems.find(e=>e.uuid===n.parentUuid);return F`
                  <span class="history-badge lineage history-lineage-badge" title="${e?`Parent Prompt: ${e.rawPrompt}`:`Derived from a previous run`}">🌿 Derived run</span>
                `})():``}
            </div>
            <div class="history-card-actions">
              <button class="history-btn reuse-settings-btn" @click="${()=>this.reuse(n)}" title="Reuse settings from this generation">
                ${q(`refresh`,11)}
                Reuse
              </button>
              ${n.upsampledPrompt?F`
                <button class="history-btn advanced-edit-btn" @click="${()=>this.reuseAdvanced(n)}" title="Advanced edit layout boxes">
                  ${q(`edit`,11)}
                  Edit Layout
                </button>
              `:``}
              <button class="history-btn delete-item-btn" @click="${()=>this.deleteItem(n)}" title="Delete run">
                ${q(`trash`,11)}
                Delete
              </button>
            </div>
          </div>
          <div class="history-card-prompt">${n.rawPrompt}</div>
          <div class="history-card-meta">${i.join(` | `)}</div>
          <div class="history-card-thumbs">
            ${(n.images||[]).map((e,t)=>{let r=null;if(this.showBboxes&&n.upsampledPrompt)try{r=JSON.parse(n.upsampledPrompt)}catch{}let i=r?.compositional_deconstruction?.elements||[];return F`
                <div class="history-thumb-container" style="aspect-ratio: ${c}; cursor: pointer;" @click="${()=>this.openLightbox(e,n.rawPrompt,n.params.seed,n,t)}">
                  <img src="${e}" alt="Thumbnail ${t+1}" class="history-thumb ${this.showBboxes?`show-bboxes-active`:``}" loading="lazy">
                  ${i.map((r,i)=>{let a=r.bbox||[0,0,1e3,1e3],o=a[0],s=a[1],c=a[2],l=a[3];return F`
                      <div class="history-bbox-overlay" 
                           style="top: ${o/10}%; left: ${s/10}%; width: ${(l-s)/10}%; height: ${(c-o)/10}%;" 
                           @mouseenter="${this.onMouseMoveBbox}"
                           @mousemove="${this.onMouseMoveBbox}"
                           @click="${r=>{r.stopPropagation(),this.openLightbox(e,n.rawPrompt,n.params.seed,n,t)}}">
                        <span class="history-bbox-number">${i+1}</span>
                        <div class="bbox-tooltip">
                          <div style="font-weight: 700; color: var(--accent-purple); text-transform: uppercase; font-size: 0.72rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.15rem;">Element #${i+1}</div>
                          <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Prompt:</span> "${r.text||r.desc||`Object`}"</div>
                          <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Type:</span> ${r.type||`obj`}</div>
                          <div><span style="color: var(--text-secondary);">BBox:</span> [${a.join(`, `)}]</div>
                        </div>
                      </div>
                    `})}
                </div>
              `})}
          </div>
          ${n.upsampledPrompt?F`
            <prompt-inspector .upsampledPrompt="${n.upsampledPrompt}"></prompt-inspector>
          `:``}
        </div>
      </div>
      ${e.children.map(e=>this.renderTree(e,t+1))}
    `}render(){let e=this.getTreeRoots();return e.length===0?F`
        <div class="history-empty">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <p>No history yet. Generate some masterpieces!</p>
        </div>
      `:F`
      ${e.map(e=>F`
        <div class="history-tree-group">
          ${this.renderTree(e,0)}
        </div>
      `)}
    `}};customElements.define(`history-list`,$e);var et=class extends G{static properties={selectedJob:{type:Object},activeTab:{type:String},historyItems:{type:Array},isRefining:{type:Boolean},jobQueue:{type:Array},selectedJobId:{type:String},showBboxes:{type:Boolean},selectedElementIndex:{type:Number},pinnedBoxIndex:{type:Number},readOnlyEditor:{type:Boolean}};createRenderRoot(){return this}constructor(){super(),this.selectedJob=null,this.activeTab=`current`,this.historyItems=[],this.isRefining=!1,this.jobQueue=[],this.selectedJobId=``,this.showBboxes=!1,this.selectedElementIndex=null,this.pinnedBoxIndex=null,this.readOnlyEditor=!1,this._streamStickiness=new Map,this._streamObservers=new Map}updated(e){this.setupStreamScrollObservers(),this.updateStreamScroll()}disconnectedCallback(){super.disconnectedCallback();for(let e of this._streamObservers.values())e.disconnect();this._streamObservers.clear()}isNearBottom(e){return e.scrollHeight-e.scrollTop-e.clientHeight<36}updateStreamScroll(){requestAnimationFrame(()=>{this.querySelectorAll(`[data-stream-pane]`).forEach(e=>{let t=e.getAttribute(`data-stream-pane`);(this._streamStickiness.get(t)??!0)&&(e.scrollTop=e.scrollHeight)})})}setupStreamScrollObservers(){let e=Array.from(this.querySelectorAll(`[data-stream-pane]`)),t=new Set(e.map(e=>e.getAttribute(`data-stream-pane`)));for(let[e,n]of this._streamObservers.entries())t.has(e)||(n.disconnect(),this._streamObservers.delete(e));e.forEach(e=>{let t=e.getAttribute(`data-stream-pane`);if(!t||this._streamObservers.has(t))return;let n=new MutationObserver(()=>{(this._streamStickiness.get(t)??!0)&&requestAnimationFrame(()=>{e.scrollTop=e.scrollHeight})});n.observe(e,{childList:!0,characterData:!0,subtree:!0}),this._streamObservers.set(t,n),e.scrollTop=e.scrollHeight})}onStreamScroll(e){let t=e.currentTarget,n=t.getAttribute(`data-stream-pane`);n&&this._streamStickiness.set(n,this.isNearBottom(t))}switchTab(e){this.dispatchEvent(new CustomEvent(`switch-tab`,{detail:e}))}cancelActiveJob(){this.dispatchEvent(new CustomEvent(`cancel-active-job`))}clearHistory(){confirm(`Are you sure you want to delete ALL history? This action cannot be undone.`)&&this.dispatchEvent(new CustomEvent(`clear-history`))}toggleBboxes(e){this.showBboxes=e.target.checked}render(){let e=this.activeTab===`current`;return F`
      <section class="display-panel glass-card">
        <div class="panel-tabs">
          <button class="tab-btn ${e?`active`:``}" id="tabCurrent" @click="${()=>this.switchTab(`current`)}">Current Output</button>
          <button class="tab-btn ${e?``:`active`}" id="tabHistory" @click="${()=>this.switchTab(`history`)}">History (<span id="historyCount">${(this.historyItems||[]).length}</span>)</button>
        </div>

        <!-- Tab: Current Output -->
        <div id="currentTabContent" class="tab-content ${e?``:`hidden`}">
          ${this.renderCurrentContent()}
        </div>
      <!-- Tab: History -->
      <div id="historyTabContent" class="tab-content ${e?`hidden`:``}">
        <div class="history-header">
          <h3>Past Masterpieces</h3>
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <label class="toggle-switch-container" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem; user-select: none; color: var(--text-secondary);">
              <input type="checkbox" ?checked="${this.showBboxes}" @change="${this.toggleBboxes}" style="cursor: pointer; accent-color: var(--accent-purple);">
              <span>Show Bounding Boxes</span>
            </label>
            <button id="clearHistoryBtn" class="clear-history-btn" @click="${this.clearHistory}">Clear All</button>
          </div>
        </div>
        <div class="history-list" id="historyList">
          <history-list 
            .historyItems="${this.historyItems}"
            .showBboxes="${this.showBboxes}"
            @reuse="${e=>this.dispatchEvent(new CustomEvent(`reuse-settings`,{detail:e.detail}))}"
            @reuse-advanced="${e=>this.dispatchEvent(new CustomEvent(`reuse-advanced`,{detail:e.detail}))}"
            @delete-item="${e=>this.dispatchEvent(new CustomEvent(`delete-history-item`,{detail:e.detail}))}"
            @open-lightbox="${e=>this.dispatchEvent(new CustomEvent(`open-lightbox`,{detail:e.detail}))}">
          </history-list>
        </div>
      </div>
    </section>
  `}renderCurrentContent(){if(!this.selectedJob)return F`
      <!-- Idle State -->
      <div class="idle-state" id="idleState">
        <div class="sparkles-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 3V4M12 20V21M4 12H3M21 12H20M18.364 5.636L17.657 6.343M6.343 17.657L5.636 18.364M18.364 18.364L17.657 17.657M6.343 5.636L5.636 6.343" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M9.5 9.5L12 8.5L14.5 9.5L13.5 12L14.5 14.5L12 13.5L9.5 14.5L10.5 12L9.5 9.5Z" fill="currentColor"/>
          </svg>
        </div>
        <h2>Create Something Amazing</h2>
        <p>Enter a prompt, configure your parameters, and click Generate to see Ideogram 4's incredible layout and text rendering capabilities.</p>
      </div>
    `;let e=this.selectedJob;if(e.status===`pending`||e.status===`upsampling`||e.status===`upsampled`||e.status===`generating`){let t=e.status===`pending`?`Queued`:e.status===`generating`?`Generating`:e.status===`upsampling`?`Upsampling`:`Working`,n=e.displayText||e.display_text||`Waiting for the next server update...`;return F`
      <!-- Loading State -->
      <div class="loading-state" id="loadingState">
        <div class="loading-status-row">
          <div class="spinner-wrapper">
            <div class="spinner"></div>
            <div class="spinner-glow"></div>
          </div>
          <div class="loading-copy">
            <h3 id="loadingTitle">${t}</h3>
            <p id="loadingMsg">${n}</p>
          </div>
          <div class="loading-steps">
            ${(e.steps&&e.steps.length?e.steps:[{name:n,status:`active`}]).map(e=>F`
              <div class="loading-step ${e.status||`pending`}">
                <span class="step-bullet"></span>
                <span class="step-text">${e.name}</span>
              </div>
            `)}
          </div>
        </div>
        <div class="loading-main">
          ${e.status===`upsampling`||e.llmStream?.content||e.llmStream?.thinking?F`
            <details class="llm-stream-panel" ?open="${!e.llmStream?.done}">
              <summary>
                <span class="thinking-pulse"></span>
                ${e.llmStream?.done?`Final prompt`:`Thinking and building prompt`}
              </summary>
              <div class="llm-stream-body">
                ${e.llmStream?.thinking?F`
                  <section class="llm-stream-section thinking">
                    <div class="llm-stream-label">Thinking</div>
                    <pre class="llm-stream-thinking" data-stream-pane="thinking" @scroll="${this.onStreamScroll}">${e.llmStream.thinking}</pre>
                  </section>
                `:``}
                <section class="llm-stream-section content">
                  <div class="llm-stream-label">Generated prompt</div>
                  ${e.llmStream?.content?F`<pre class="llm-stream-content" data-stream-pane="content" @scroll="${this.onStreamScroll}">${e.llmStream.content}</pre>`:F`<div class="llm-stream-placeholder">Waiting for generated prompt tokens...</div>`}
                </section>
              </div>
            </details>
          `:F`
            <div class="loading-empty-stream">Waiting for the first provider update...</div>
          `}
        </div>
        <div class="loading-cancel-wrapper">
          <button id="cancelActiveJobBtn" class="loading-cancel-btn" @click="${this.cancelActiveJob}">Cancel Generation</button>
        </div>
      </div>
    `}return e.status===`editing`||e.status===`inspecting`?F`
      <layout-editor
        .upsampledPrompt="${e.upsampledPrompt}"
        .backgroundImage="${e.backgroundImage}"
        .selectedElementIndex="${this.selectedElementIndex}"
        .pinnedBoxIndex="${this.pinnedBoxIndex}"
        .readOnly="${this.readOnlyEditor||e.status===`inspecting`}"
        @update-prompt="${e=>this.dispatchEvent(new CustomEvent(`update-editor-prompt`,{detail:e.detail}))}"
        @editor-undo="${()=>this.dispatchEvent(new CustomEvent(`editor-undo`))}"
        @editor-redo="${()=>this.dispatchEvent(new CustomEvent(`editor-redo`))}"
        @element-selected="${e=>this.dispatchEvent(new CustomEvent(`element-selected`,{detail:e.detail}))}"
        @element-pinned="${e=>this.dispatchEvent(new CustomEvent(`element-pinned`,{detail:e.detail}))}"
        @cancel="${()=>this.dispatchEvent(new CustomEvent(`editor-cancel`))}"
        @generate="${()=>this.dispatchEvent(new CustomEvent(`editor-generate`))}">
      </layout-editor>
    `:e.status===`completed`?F`
      <!-- Outputs Panel -->
      <div class="outputs-content" id="outputsContent">
        <image-grid 
          .images="${e.images}" 
          .rawPrompt="${e.rawPrompt}" 
          .seed="${e.params.seed}" 
          .params="${e.params}"
          .upsampledPrompt="${e.upsampledPrompt}"
          .uuid="${e.uuid}"
          .parentUuid="${e.parentUuid}"
          @open-lightbox="${e=>this.dispatchEvent(new CustomEvent(`open-lightbox`,{detail:e.detail}))}">
        </image-grid>
        <prompt-inspector .upsampledPrompt="${e.upsampledPrompt}"></prompt-inspector>
      </div>
    `:e.status===`failed`?F`
      <div class="loading-state">
        <div class="spinner-wrapper" style="animation: none;">
          <div class="spinner" style="border-top-color: var(--status-red-border); border-bottom-color: var(--status-red-text); animation: none;"></div>
        </div>
        <h3>Execution Failed</h3>
        <p><span style="color: var(--status-red-text);">${e.error||`Unknown error`}</span></p>
        <div class="loading-cancel-wrapper">
          <button class="loading-cancel-btn" @click="${this.cancelActiveJob}">Clear Job</button>
        </div>
      </div>
    `:F``}};customElements.define(`display-panel`,et);var tt=class extends G{static properties={src:{type:String},prompt:{type:String},seedLabel:{type:String},item:{type:Object},hidden:{type:Boolean},showBboxes:{type:Boolean}};createRenderRoot(){return this}constructor(){super(),this.hidden=!0,this.src=``,this.prompt=``,this.seedLabel=``,this.item=null,this.showBboxes=!1}close(){this.hidden=!0,this.showBboxes=!1,this.dispatchEvent(new CustomEvent(`close`))}reuse(){this.dispatchEvent(new CustomEvent(`reuse`,{detail:this.item})),this.close()}advancedEdit(){this.dispatchEvent(new CustomEvent(`reuse-advanced`,{detail:{item:this.item,bgImage:this.src}})),this.close()}onMouseMoveBbox(e){let t=e.currentTarget.querySelector(`.bbox-tooltip`);if(!t)return;let n=t.offsetHeight||140,r=e.clientX+15,i=e.clientY+15,a=window.innerWidth,o=window.innerHeight;r+260>a-10&&(r=e.clientX-260-15),r<10&&(r=10);let s=this.querySelector(`.lightbox-bottom-bar`),c=s?s.getBoundingClientRect().top:o;i+n>c-10&&(i=e.clientY-n-15),i<10&&(i=10),t.style.left,t.style.top,t.style.left=`0px`,t.style.top=`0px`;let l=t.getBoundingClientRect(),u=l.left,d=l.top;t.style.left=`${r-u}px`,t.style.top=`${i-d}px`}render(){if(this.hidden)return F``;let e=null;if(this.showBboxes&&this.item&&this.item.upsampledPrompt)try{e=JSON.parse(this.item.upsampledPrompt)}catch{}let t=e?.compositional_deconstruction?.elements||[];return F`
      <div id="lightbox" class="lightbox" @click="${e=>{e.target.id===`lightbox`&&this.close()}}">
        <button class="lightbox-close" @click="${this.close}" title="Close Lightbox">
          ${q(`close`,24)}
        </button>
        <div class="lightbox-image-wrapper">
          <div class="lightbox-image-container">
            <img class="lightbox-content" id="lightboxImg" src="${this.src}">
            ${t.map((e,t)=>{let n=e.bbox||[0,0,1e3,1e3],r=n[0],i=n[1],a=n[2],o=n[3];return F`
                <div class="lightbox-bbox-overlay" 
                     style="top: ${r/10}%; left: ${i/10}%; width: ${(o-i)/10}%; height: ${(a-r)/10}%;"
                     @mouseenter="${this.onMouseMoveBbox}"
                     @mousemove="${this.onMouseMoveBbox}">
                  <span class="lightbox-bbox-number">${t+1}</span>
                  <span class="lightbox-bbox-label">${e.text||e.desc||`Element`}</span>
                  <div class="bbox-tooltip">
                    <div style="font-weight: 700; color: var(--accent-purple); text-transform: uppercase; font-size: 0.72rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--card-border); padding-bottom: 0.15rem;">Element #${t+1}</div>
                    <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Prompt:</span> "${e.text||e.desc||`Object`}"</div>
                    <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-secondary);">Type:</span> ${e.type||`obj`}</div>
                    <div><span style="color: var(--text-secondary);">BBox:</span> [${n.join(`, `)}]</div>
                  </div>
                </div>
              `})}
          </div>
        </div>
        <div class="lightbox-bottom-bar">
          <div class="lightbox-prompt-container">
            <span class="lightbox-prompt-label">Prompt Idea</span>
            <div id="lightboxCaption" class="lightbox-caption">${this.prompt}</div>
          </div>
          <div class="lightbox-row">
            <span class="lightbox-meta-badge" id="lightboxMeta">Seed: ${this.seedLabel}</span>
            <div class="lightbox-actions">
              ${this.item&&this.item.upsampledPrompt?F`
                <label class="toggle-switch-container" style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem; user-select: none; color: var(--text-secondary); margin-right: 1rem;">
                  <input type="checkbox" ?checked="${this.showBboxes}" @change="${e=>this.showBboxes=e.target.checked}" style="cursor: pointer; accent-color: var(--accent-purple);">
                  <span>Show Bounding Boxes</span>
                </label>
              `:``}
              ${this.item?F`
                <button id="lightboxReuseBtn" class="lightbox-action-btn" @click="${this.reuse}">
                  ${q(`refresh`,14)}
                  Reuse Settings
                </button>
              `:``}
              ${this.item&&this.item.upsampledPrompt?F`
                <button id="lightboxAdvancedEditBtn" class="lightbox-action-btn advanced-edit-btn" @click="${this.advancedEdit}">
                  ${q(`edit`,14)}
                  Advanced Edit Prompt
                </button>
              `:``}
              <a id="lightboxDownload" href="${this.src}" download="generated_image.png" class="lightbox-download-btn">
                ${q(`download`,14)}
                Download High-Res
              </a>
            </div>
          </div>
        </div>
      </div>
    `}};customElements.define(`image-lightbox`,tt);var nt=class extends G{static properties={chatMessages:{type:Array},isRefining:{type:Boolean}};createRenderRoot(){return this}constructor(){super(),this.chatMessages=[],this.isRefining=!1}updated(e){e.has(`chatMessages`)&&this.scrollToBottom()}scrollToBottom(){setTimeout(()=>{let e=this.querySelector(`#aiChatLog`);e&&(e.scrollTop=e.scrollHeight)},50)}onSend(){let e=this.querySelector(`#aiChatInput`),t=e?e.value.trim():``;!t||this.isRefining||(e&&(e.value=``),this.dispatchEvent(new CustomEvent(`send-chat`,{detail:t})))}onKeyDown(e){e.key===`Enter`&&!e.shiftKey&&(e.preventDefault(),this.onSend())}renderAssistantMessage(e){let t=e.content||``,n=t.trim();if(!e.streaming&&n.startsWith(`{`)&&n.endsWith(`}`))try{let e=JSON.parse(n);return F`
          <div class="ai-message assistant">
            <div style="font-weight: 600; font-size: 0.8rem; margin-bottom: 0.25rem; color: var(--accent-purple);">AI Layout Updated:</div>
            <div style="font-style: italic; font-size: 0.8rem; border-left: 2px solid var(--card-border); padding-left: 0.5rem; margin-bottom: 0.4rem;">
              "${e.high_level_description||`Layout JSON updated`}"
            </div>
            <span style="font-size: 0.75rem; opacity: 0.7;">Background: ${e.compositional_deconstruction?.background||`Updated composition`}</span>
          </div>
        `}catch{}return F`<div class="ai-message ${e.role}">
      ${t||(e.streaming?`Building JSON layout...`:``)}${e.streaming?F`<span class="stream-caret"></span>`:``}
    </div>`}render(){return F`
      <div id="contentSubtabAiChat" class="subtab-content-panel">
        <div class="ai-chat-log" id="aiChatLog">
          ${!this.chatMessages||this.chatMessages.length===0?F`
            <div class="ai-message system">Ask the AI Assistant to refine the layout for you. You can instruct it in natural language!</div>
          `:this.chatMessages.map(e=>e.role===`system`?F``:e.role===`assistant`?this.renderAssistantMessage(e):F`<div class="ai-message ${e.role}">${e.content||``}</div>`)}
        </div>
        <div class="ai-chat-input-wrapper">
          <textarea id="aiChatInput" placeholder="Ask AI to refine layout... (e.g. 'move the coffee to bottom-right')" ?disabled="${this.isRefining}" @keydown="${this.onKeyDown}"></textarea>
          <button id="sendAiChatBtn" class="editor-btn-primary" ?disabled="${this.isRefining}" @click="${this.onSend}">
            <span>${this.isRefining?`Refining...`:`Refine with AI`}</span>
          </button>
        </div>
      </div>
    `}};customElements.define(`ai-chat`,nt);var rt=class extends G{static properties={upsampledPrompt:{type:String},chatMessages:{type:Array},isRefining:{type:Boolean},selectedElementIndex:{type:Number},pinnedBoxIndex:{type:Number}};createRenderRoot(){return this}constructor(){super(),this.upsampledPrompt=``,this.chatMessages=[],this.isRefining=!1,this.selectedElementIndex=null,this.pinnedBoxIndex=null,this._subtab=`Form`,this._cachedStyleDescription=null,this._draftPrompt=``,this._draftData=null,this._draftDirty=!1,this._promptDispatchTimer=null}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this._promptDispatchTimer)}updated(e){if(e.has(`selectedElementIndex`)&&this.selectedElementIndex!==null&&setTimeout(()=>{let e=this.querySelector(`.element-card[data-index="${this.selectedElementIndex}"]`);e&&e.scrollIntoView({behavior:`smooth`,block:`nearest`})},50),e.has(`upsampledPrompt`)){if(this._draftDirty&&this.upsampledPrompt!==this._draftPrompt)return;this._draftDirty=!1,this._draftPrompt=``,this._draftData=null;let e=this.parsedPrompt;e?.style_description&&(this._cachedStyleDescription=e.style_description)}}parsePrompt(e){try{let t=JSON.parse(e||`{}`);return t.aspect_ratio||=`1:1`,t.high_level_description||=``,t.compositional_deconstruction||={background:``,elements:[]},t.compositional_deconstruction.background||(t.compositional_deconstruction.background=``),t.compositional_deconstruction.elements||(t.compositional_deconstruction.elements=[]),t}catch{return{aspect_ratio:`1:1`,high_level_description:``,compositional_deconstruction:{background:``,elements:[]}}}}get parsedPrompt(){return this._draftDirty?(this._draftData||=this.parsePrompt(this._draftPrompt),this._draftData):this.parsePrompt(this.upsampledPrompt)}get activePromptText(){return this._draftDirty?this._draftPrompt:this.upsampledPrompt||``}reorderPromptKeys(e){let t={};if(e.aspect_ratio!==void 0&&(t.aspect_ratio=e.aspect_ratio),e.high_level_description!==void 0&&e.high_level_description!==``&&(t.high_level_description=e.high_level_description),e.style_description){let n={},r=e.style_description.aesthetics,i=e.style_description.lighting,a=e.style_description.photo,o=e.style_description.medium,s=e.style_description.art_style,c=e.style_description.color_palette;r!==void 0&&(n.aesthetics=r),i!==void 0&&(n.lighting=i),a===void 0?(o!==void 0&&(n.medium=o),s!==void 0&&(n.art_style=s)):(n.photo=a,o!==void 0&&(n.medium=o)),c!==void 0&&Array.isArray(c)&&(n.color_palette=c),t.style_description=n}if(e.compositional_deconstruction){let n={};e.compositional_deconstruction.background!==void 0&&(n.background=e.compositional_deconstruction.background),Array.isArray(e.compositional_deconstruction.elements)&&(n.elements=e.compositional_deconstruction.elements.map(e=>{let t={};return t.type=e.type||`obj`,e.bbox!==void 0&&(t.bbox=e.bbox),e.type===`text`&&(t.text=e.text||``),t.desc=e.desc||``,e.color_palette!==void 0&&Array.isArray(e.color_palette)&&(t.color_palette=e.color_palette),t})),t.compositional_deconstruction=n}return t}dispatchPromptUpdate(e,t=!1){clearTimeout(this._promptDispatchTimer);let n=()=>{this.dispatchEvent(new CustomEvent(`update-prompt`,{detail:e}))};t?n():this._promptDispatchTimer=setTimeout(n,450)}updatePrompt(e,t={}){let n=this.reorderPromptKeys(e),r=JSON.stringify(n,null,2);this._draftData=n,this._draftPrompt=r,this._draftDirty=!0,t.render!==!1&&this.requestUpdate(),this.dispatchPromptUpdate(r,t.immediate===!0)}onHighLevelDescInput(e){let t=this.parsedPrompt;t.high_level_description=e.target.value,this.updatePrompt(t,{render:!1})}toggleStyleDescription(e){let t=this.parsedPrompt;e.target.checked?t.style_description=this._cachedStyleDescription||{aesthetics:`vibrant, highly detailed`,lighting:`warm sunset lighting`,medium:`photograph`,photo:`35mm lens, f/1.8, sharp focus`}:(t.style_description&&(this._cachedStyleDescription=t.style_description),delete t.style_description),this.updatePrompt(t)}onStyleAestheticsInput(e){let t=this.parsedPrompt;t.style_description&&(t.style_description.aesthetics=e.target.value,this.updatePrompt(t,{render:!1}))}onStyleLightingInput(e){let t=this.parsedPrompt;t.style_description&&(t.style_description.lighting=e.target.value,this.updatePrompt(t,{render:!1}))}onStyleMediumInput(e){let t=this.parsedPrompt;t.style_description&&(t.style_description.medium=e.target.value,this.updatePrompt(t,{render:!1}))}setStyleMedium(e){let t=this.parsedPrompt;t.style_description&&(t.style_description.medium=e,e===`photograph`?(t.style_description.photo===void 0&&(t.style_description.photo=`35mm, sharp focus`),delete t.style_description.art_style):(t.style_description.art_style===void 0&&(t.style_description.art_style=`clean vector illustration`),delete t.style_description.photo),this.updatePrompt(t))}setStyleCategory(e){let t=this.parsedPrompt;t.style_description&&(e===`photo`?(t.style_description.photo=t.style_description.photo||`35mm, sharp focus`,delete t.style_description.art_style):(t.style_description.art_style=t.style_description.art_style||`clean vector illustration`,delete t.style_description.photo),this.updatePrompt(t))}onStylePhotoInput(e){let t=this.parsedPrompt;t.style_description&&(t.style_description.photo=e.target.value,this.updatePrompt(t,{render:!1}))}onStyleArtStyleInput(e){let t=this.parsedPrompt;t.style_description&&(t.style_description.art_style=e.target.value,this.updatePrompt(t,{render:!1}))}addColor(e,t){let n=this.parsedPrompt,r=`#FFFFFF`;if(e){let e=n.compositional_deconstruction.elements[t];if(!e)return;e.color_palette||=[],e.color_palette.length<5&&e.color_palette.push(r)}else{if(!n.style_description)return;n.style_description.color_palette||(n.style_description.color_palette=[]),n.style_description.color_palette.length<16&&n.style_description.color_palette.push(r)}this.updatePrompt(n)}removeColor(e,t,n){let r=this.parsedPrompt;if(!t)r.style_description&&r.style_description.color_palette&&(r.style_description.color_palette.splice(e,1),r.style_description.color_palette.length===0&&delete r.style_description.color_palette);else{let t=r.compositional_deconstruction.elements[n];t&&t.color_palette&&(t.color_palette.splice(e,1),t.color_palette.length===0&&delete t.color_palette)}this.updatePrompt(r)}onColorPickerChange(e,t,n,r){let i=e.target.value.toUpperCase(),a=this.parsedPrompt;if(!n)a.style_description&&a.style_description.color_palette&&(a.style_description.color_palette[t]=i);else{let e=a.compositional_deconstruction.elements[r];e&&e.color_palette&&(e.color_palette[t]=i)}this.updatePrompt(a)}onColorHexTextChange(e,t,n,r){let i=e.target.value.trim().toUpperCase();i&&!i.startsWith(`#`)&&(i=`#`+i);let a=/^#[0-9A-F]{6}$/.test(i),o=this.parsedPrompt;if(a){if(!n)o.style_description&&o.style_description.color_palette&&(o.style_description.color_palette[t]=i);else{let e=o.compositional_deconstruction.elements[r];e&&e.color_palette&&(e.color_palette[t]=i)}this.updatePrompt(o)}else e.target.value=n?o.compositional_deconstruction.elements[r].color_palette[t]:o.style_description.color_palette[t]}renderColorPalette(e,t,n,r){return e||=[],F`
      <div class="color-palette-container">
        <div class="color-pills-list">
          ${e.map((e,r)=>F`
            <div class="color-pill">
               <div class="color-swatch-wrapper">
                 <div class="color-swatch" style="background-color: ${e};"></div>
                 <input type="color" .value="${e.toLowerCase()}" @input="${e=>this.onColorPickerChange(e,r,t,n)}">
               </div>
               <input type="text" class="color-hex-input" .value="${e}" @change="${e=>this.onColorHexTextChange(e,r,t,n)}" placeholder="#RRGGBB" maxlength="7">
               <button class="color-remove-btn" @click="${()=>this.removeColor(r,t,n)}" title="Remove color">&times;</button>
            </div>
          `)}
          ${e.length<r?F`
            <button class="color-add-btn" @click="${()=>this.addColor(t,n)}">
              ${q(`plus`,12)}
              Add Color
            </button>
          `:``}
        </div>
      </div>
    `}onBackgroundInput(e){let t=this.parsedPrompt;t.compositional_deconstruction.background=e.target.value,this.updatePrompt(t,{render:!1})}onRawJsonInput(e){this._draftPrompt=e.target.value,this._draftData=null,this._draftDirty=!0}syncFromJson(){try{let e=JSON.parse(this.activePromptText);this.updatePrompt(e),alert(`GUI synced successfully from raw JSON!`)}catch{alert(`Invalid JSON format! Please fix syntax errors first.`)}}onElementTypeChange(e,t){let n=this.parsedPrompt,r=n.compositional_deconstruction.elements[e];r.type=t.target.value,r.type===`text`?r.text=r.text||`TEXT`:delete r.text,this.updatePrompt(n)}onElementTextInput(e,t){let n=this.parsedPrompt;n.compositional_deconstruction.elements[e].text=t.target.value,this.updatePrompt(n,{render:!1})}onElementDescInput(e,t){let n=this.parsedPrompt;n.compositional_deconstruction.elements[e].desc=t.target.value,this.updatePrompt(n,{render:!1})}deleteElement(e){if(confirm(`Delete this element box?`)){let t=this.parsedPrompt;t.compositional_deconstruction.elements.splice(e,1),this.dispatchEvent(new CustomEvent(`element-selected`,{detail:null})),this.updatePrompt(t)}}togglePinElement(e,t){t.stopPropagation();let n=this.pinnedBoxIndex===e?null:e;n!==null&&this.selectElement(e),this.dispatchEvent(new CustomEvent(`element-pinned`,{detail:n}))}setSubtab(e){this._subtab=e,this.requestUpdate()}selectElement(e){this.dispatchEvent(new CustomEvent(`element-selected`,{detail:e}))}render(){let e=this.parsedPrompt,t=e.compositional_deconstruction.elements||[];return F`
      <div class="editor-subtabs">
        <button class="subtab-btn ${this._subtab===`Form`?`active`:``}" @click="${()=>this.setSubtab(`Form`)}">Composition</button>
        <button class="subtab-btn ${this._subtab===`RawJson`?`active`:``}" @click="${()=>this.setSubtab(`RawJson`)}">Raw JSON</button>
        <button class="subtab-btn ${this._subtab===`AiChat`?`active`:``}" @click="${()=>this.setSubtab(`AiChat`)}">AI Assistant</button>
      </div>

      <div class="subtab-contents">
        <!-- Subtab: Composition Form -->
        <div id="contentSubtabForm" class="subtab-content-panel ${this._subtab===`Form`?``:`hidden`}">
          
          <div class="form-group">
            <label for="editorHighLevelDesc" class="sub-label">High Level Description</label>
            <textarea id="editorHighLevelDesc" class="editor-textarea-sm" placeholder="Overall scene style, medium, composition..." .value="${e.high_level_description||``}" @input="${this.onHighLevelDescInput}"></textarea>
          </div>

          <!-- Style Description Collapsible Section -->
          <div class="form-group" style="border-top: 1px solid var(--card-border); padding-top: 0.75rem;">
            <label class="checkbox-wrapper">
              <input type="checkbox" ?checked="${e.style_description!==void 0}" @change="${this.toggleStyleDescription}">
              <div class="checkbox-label" style="font-size: 0.8rem;">
                <span class="checkbox-custom"></span>
                <span>Include Style Description</span>
              </div>
            </label>
          </div>

          ${e.style_description===void 0?``:F`
            <div class="style-description-fields" style="background: var(--overlay-bg); border: 1px solid var(--overlay-border); padding: 0.75rem; border-radius: 8px; display: flex; flex-direction: column; gap: 0.75rem; margin-top: -0.25rem;">
              <div class="form-group">
                <label class="sub-label">Aesthetics</label>
                <input type="text" class="element-card-text" placeholder="moody, cinematic, desaturated..." .value="${e.style_description.aesthetics||``}" @input="${this.onStyleAestheticsInput}">
              </div>
              <div class="form-group">
                <label class="sub-label">Lighting</label>
                <input type="text" class="element-card-text" placeholder="golden hour, studio lighting..." .value="${e.style_description.lighting||``}" @input="${this.onStyleLightingInput}">
              </div>
              <div class="form-group">
                <label class="sub-label">Medium</label>
                <input type="text" class="element-card-text" placeholder="photograph, painting, illustration..." .value="${e.style_description.medium||``}" @input="${this.onStyleMediumInput}">
                <div class="suggestion-chips">
                  ${[`photograph`,`illustration`,`3d_render`,`painting`,`graphic_design`].map(e=>F`
                    <button class="chip-btn" @click="${()=>this.setStyleMedium(e)}">${e.replace(`_`,` `)}</button>
                  `)}
                </div>
              </div>
              <div class="form-group">
                <label class="sub-label">Style Category</label>
                <div class="segmented-control">
                  <button class="segment-btn ${e.style_description.photo===void 0?``:`active`}" @click="${()=>this.setStyleCategory(`photo`)}">Photo</button>
                  <button class="segment-btn ${e.style_description.art_style===void 0?``:`active`}" @click="${()=>this.setStyleCategory(`art_style`)}">Art Style</button>
                </div>
              </div>
              ${e.style_description.photo===void 0?F`
                <div class="form-group">
                  <label class="sub-label">Art Style Details</label>
                  <textarea class="editor-textarea-sm" placeholder="e.g. flat vector, bold outlines, sketch, matte color" style="height: 40px;" .value="${e.style_description.art_style||``}" @input="${this.onStyleArtStyleInput}"></textarea>
                </div>
              `:F`
                <div class="form-group">
                  <label class="sub-label">Camera &amp; Lens Details (Photo)</label>
                  <textarea class="editor-textarea-sm" placeholder="e.g. 35mm, f/1.4, shallow depth of field, bokeh" style="height: 40px;" .value="${e.style_description.photo||``}" @input="${this.onStylePhotoInput}"></textarea>
                </div>
              `}
              <div class="form-group">
                <label class="sub-label">Style Color Palette (Max 16)</label>
                ${this.renderColorPalette(e.style_description.color_palette,!1,null,16)}
              </div>
            </div>
          `}

          <div class="form-group" style="border-top: 1px solid var(--card-border); padding-top: 0.75rem;">
            <label for="editorBackground" class="sub-label">Scene Background</label>
            <textarea id="editorBackground" class="editor-textarea-sm" placeholder="Background details, lighting, weather..." .value="${e.compositional_deconstruction.background||``}" @input="${this.onBackgroundInput}"></textarea>
          </div>

          <div class="elements-list-header">
            <span class="sub-label">Elements &amp; Bounding Boxes</span>
          </div>

          <div id="editorElementsList" class="editor-elements-list">
            ${t.map((e,t)=>F`
                <div class="element-card ${this.selectedElementIndex===t?`active`:``}" data-index="${t}" @click="${()=>this.selectElement(t)}">
                  <div class="element-card-header">
                    <div class="element-card-title">
                      <span class="element-card-badge">${String(t+1).padStart(2,`0`)}</span>
                      <select class="element-card-type-select" .value="${e.type||`obj`}" @change="${e=>this.onElementTypeChange(t,e)}">
                        <option value="obj">Object</option>
                        <option value="text">Text</option>
                      </select>
                    </div>
                    <div class="element-card-actions">
                      <button class="element-card-btn focus ${this.pinnedBoxIndex===t?`pinned`:``}" title="${this.pinnedBoxIndex===t?`Pinned (Click to Unpin)`:`Pin Focus on Canvas`}" @click="${e=>this.togglePinElement(t,e)}">
                        ${q(`search`,12)}
                      </button>
                      <button class="element-card-btn delete" title="Delete element" @click="${e=>{e.stopPropagation(),this.deleteElement(t)}}">
                        ${q(`trash`,12)}
                      </button>
                    </div>
                  </div>
                  <input type="text" class="element-card-text ${e.type===`text`?``:`hidden`}" placeholder="Exact characters to render..." .value="${e.text||``}" @input="${e=>this.onElementTextInput(t,e)}">
                  <textarea class="element-card-desc" placeholder="Details, color, pose..." .value="${e.desc||``}" @input="${e=>this.onElementDescInput(t,e)}"></textarea>
                  
                  <div class="form-group" style="margin-top: 0.35rem; border-top: 1px solid var(--card-border); padding-top: 0.5rem;">
                    <label class="sub-label" style="font-size: 0.65rem;">Element Color Palette (Max 5)</label>
                    ${this.renderColorPalette(e.color_palette,!0,t,5)}
                  </div>
                </div>
              `)}
          </div>
        </div>

        <!-- Subtab: Raw JSON -->
        <div id="contentSubtabRawJson" class="subtab-content-panel ${this._subtab===`RawJson`?``:`hidden`}">
          <textarea id="editorRawJson" class="editor-textarea-mono" placeholder="Raw JSON caption..." .value="${this.activePromptText}" @input="${this.onRawJsonInput}"></textarea>
          <div class="subtab-actions">
            <button id="syncFromJsonBtn" class="editor-btn-secondary" @click="${this.syncFromJson}">Sync to Box GUI</button>
          </div>
        </div>

        <!-- Subtab: AI Chat -->
        <div id="contentSubtabAiChat" class="subtab-content-panel ${this._subtab===`AiChat`?``:`hidden`}">
          <ai-chat
            .chatMessages="${this.chatMessages}"
            .isRefining="${this.isRefining}"
            @send-chat="${e=>this.dispatchEvent(new CustomEvent(`send-chat`,{detail:e.detail}))}">
          </ai-chat>
        </div>
      </div>
    `}};customElements.define(`editor-sidebar`,rt);var it=class extends G{static properties={apiOnline:{type:Boolean},templates:{type:Array},endpoints:{type:Array},selectedEndpoint:{type:String},providerSchemas:{type:Object},providerParams:{type:Object},jobQueue:{type:Array},selectedJobId:{type:String},isRefining:{type:Boolean},activeTab:{type:String},activeLeftTab:{type:String},historyItems:{type:Array},cachedUpsampledPrompt:{type:String},lightboxSrc:{type:String},lightboxPrompt:{type:String},lightboxSeedLabel:{type:String},lightboxItem:{type:Object},lightboxHidden:{type:Boolean},prompt:{type:String},magicPrompt:{type:Boolean},bypassUpsample:{type:Boolean},selectedTemplate:{type:String},advancedMode:{type:Boolean},editorSelectedIndex:{type:Number},editorPinnedIndex:{type:Number},currentRoute:{type:String},toasts:{type:Array},parentUuid:{type:String},isJsonMode:{type:Boolean},inspectorItem:{type:Object},lightboxIndex:{type:Number},theme:{type:String}};createRenderRoot(){return this}connectedCallback(){super.connectedCallback(),this._unsubscribeQueue=K.subscribe(()=>{let e=this._lastJobStatuses;this.jobQueue=K.jobQueue,this.selectedJobId=K.selectedJobId,this.apiOnline=K.connected;for(let t of this.jobQueue){let n=e.get(t.id);t.status===`completed`&&n!==`completed`&&this.loadHistory(),e.set(t.id,t.status)}this.requestUpdate()})}disconnectedCallback(){super.disconnectedCallback(),this._unsubscribeQueue&&this._unsubscribeQueue()}constructor(){super(),this.apiOnline=!0,this.theme=localStorage.getItem(`ideoui_theme`)||(window.matchMedia(`(prefers-color-scheme: dark)`).matches?`dark`:`light`),document.body.classList.remove(`light-theme`,`dark-theme`),document.body.classList.add(`${this.theme}-theme`),this.templates=[`v1`],this.jobQueue=K.jobQueue,this.selectedJobId=K.selectedJobId,this.isRefining=!1,this.activeTab=`current`,this.activeLeftTab=`generator`,this.historyItems=[],this.cachedUpsampledPrompt=``,this.lightboxSrc=``,this.lightboxPrompt=``,this.lightboxSeedLabel=``,this.lightboxItem=null,this.lightboxHidden=!0,this.prompt=``,this.magicPrompt=!0,this.bypassUpsample=!1,this.selectedTemplate=`v1`,this.advancedMode=!1,this.endpoints=[],this.selectedEndpoint=``,this.providerSchemas={},this.providerParams={},this.tabUuid=``,this._sessionSaveTimer=null,this.editorSelectedIndex=null,this.editorPinnedIndex=null,this.currentRoute=`#/`,this.toasts=[],this.parentUuid=``,this.isJsonMode=!1,this.inspectorItem=null,this.lightboxIndex=null,this.editorUndoStacks=new Map,this.editorRedoStacks=new Map,this._pendingJobPatches=new Map,this._jobPatchTimers=new Map,this._lastJobStatuses=new Map,this._preserveNextHomeRoute=!1,this.lastGeneratorSettings=null}async firstUpdated(){window.addEventListener(`hashchange`,()=>{this.handleRoute(),this.scheduleSessionSave()}),this.tabUuid=sessionStorage.getItem(`ideoui_tab_uuid`)||(crypto.randomUUID?crypto.randomUUID():`tab_${Date.now()}_${Math.random().toString(36).slice(2)}`),sessionStorage.setItem(`ideoui_tab_uuid`,this.tabUuid);try{await we(),await this.loadHistory(),await this.loadTemplates(),await this.loadProviderSchemas(),await this.loadEndpoints(),await K.loadActiveJobs(),K.connect(),await this.restoreSessionState()}catch(e){console.error(`Initialization failed`,e),this.loadTemplates()}this.handleRoute({preserveHome:!0})}getDefaultProviderId(){return Y(this)}resetGeneratorForm(){je(this)}goCleanHome(){this._preserveNextHomeRoute=!1,K.setSelectedJobId(``),this.activeLeftTab=`generator`,this.resetGeneratorForm(),window.location.hash===`#/`?this.handleRoute({preserveHome:!0}):window.location.hash=`#/`}getHistoryItem(e){return(this.historyItems||[]).find(t=>t.uuid===e)||null}itemAspect(e){let t=e?.params?.providerParams?.aspect_ratio||e?.params?.aspect_ratio;if(t&&String(t).includes(`:`))return String(t).replace(`:`,` / `);let n=e?.params?.size||`1024x1024`,[r,i]=String(n).split(`x`).map(Number);return r&&i?`${r} / ${i}`:`1 / 1`}openRouteLightbox(e,t){if(!e||!e.images?.[t])return;this.lightboxSrc=e.images[t],this.lightboxPrompt=e.rawPrompt||``;let n=e.params?.seed??e.params?.providerParams?.seed??0;this.lightboxSeedLabel=`${n} (Image ${t+1})`,this.lightboxItem=e,this.lightboxIndex=t,this.lightboxHidden=!1}closeRouteLightbox(){this.lightboxHidden=!0,this.lightboxIndex=null}clearMissingJobRoute(e){J(this,e)}handleRoute(e={}){Ae(this,e)}showToast(e,t=`info`){let n={id:Date.now()+`_`+Math.random().toString(36).substr(2,9),message:e,type:t};this.toasts=[...this.toasts,n],setTimeout(()=>{this.toasts=this.toasts.filter(e=>e.id!==n.id)},4e3)}async loadTemplates(){try{let e=await fetch(`/api/upsample_templates`);if(e.ok)this.templates=await e.json(),this.templates.length>0&&(this.selectedTemplate=this.templates[0]),this.apiOnline=!0;else throw Error()}catch{console.warn(`Backend API templates fetch failed`),this.apiOnline=!1,this.templates=[`v1`,`v2`]}}async loadHistory(){try{let e=await Te();e.sort((e,t)=>t.timestamp-e.timestamp),this.historyItems=e}catch(e){console.error(`Failed to load history from backend`,e)}}async loadEndpoints(){try{let e=await fetch(`/api/endpoints`);if(e.ok){this.endpoints=await e.json();let t=this.endpoints.find(e=>e.default);t?this.selectedEndpoint=t.name:this.endpoints.length>0&&(this.selectedEndpoint=this.endpoints[0].name),this.providerParams=this.withProviderDefaults(this.selectedEndpoint,this.providerParams)}}catch(e){console.error(`Failed to load endpoints:`,e)}}async loadProviderSchemas(){let e=await fetch(`/api/providers/schemas`);if(!e.ok)throw Error(`Failed to load provider schemas`);this.providerSchemas=await e.json();let t=Object.entries(this.providerSchemas).find(([,e])=>e.type===`generation`&&e.default),n=Object.entries(this.providerSchemas).find(([,e])=>e.type===`generation`);this.selectedEndpoint||=t?.[0]||n?.[0]||``,this.providerParams=this.withProviderDefaults(this.selectedEndpoint,this.providerParams)}withProviderDefaults(e,t={}){return X(this,e,t)}providerParamsFromHistory(e){return Me(e)}aspectRatioFromProviderParams(e={}){return Ne(e)}promptWithAspectRatio(e,t){return Pe(e,t)}looksLikeJsonPrompt(e){return Fe(e)}applyHistoryItemToForm(e,t=!1){Ie(this,e,t)}async restoreSessionState(){let e=await fetch(`/api/session/state?tab_uuid=${encodeURIComponent(this.tabUuid)}`),t=e.ok?await e.json():null;if(!t){let e=await fetch(`/api/session/state`);t=e.ok?await e.json():null}if(!t)return;let n=t.form_state||t.formState||{};this.prompt=n.prompt??this.prompt,this.magicPrompt=n.magicPrompt??n.magic_prompt??this.magicPrompt,this.advancedMode=n.advancedMode??n.advanced_mode??this.advancedMode,this.isJsonMode=n.isJsonMode??n.is_json_mode??this.isJsonMode,this.selectedTemplate=n.selectedTemplate??n.template??this.selectedTemplate,this.selectedEndpoint=n.provider??n.endpoint??this.selectedEndpoint,this.providerParams=this.withProviderDefaults(this.selectedEndpoint,n.providerParams||n.provider_params||this.providerParams),this.captureLastGeneratorSettings();let r=t.active_job_id||t.activeJobId;if(r&&K.jobQueue.some(e=>e.id===r)&&K.setSelectedJobId(r),t.route&&window.location.hash===``){let e=t.route.match(/^#\/(?:job|editor)\/([^/]+)/)?.[1];(!e||K.jobQueue.some(t=>t.id===e))&&(window.location.hash=t.route)}}getSessionFormState(){return Le(this)}captureLastGeneratorSettings(){Re(this)}scheduleSessionSave(){clearTimeout(this._sessionSaveTimer),this._sessionSaveTimer=setTimeout(()=>this.saveSessionState(),500)}async saveSessionState(){if(this.tabUuid)try{let e=this.jobQueue.find(e=>e.id===this.selectedJobId);await fetch(`/api/session/state`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({tab_uuid:this.tabUuid,active_job_id:this.selectedJobId||null,route:window.location.hash||`#/`,form_state:this.getSessionFormState(),draft_json:e?.draftJson||null})})}catch(e){console.warn(`Session autosave failed:`,e)}}rememberEditorSnapshot(e,t){Q(this,e,t)}async ensureEditableEditorJob(e=null){return $(this,e)}async patchServerJob(e,t){try{await fetch(`/api/jobs/${encodeURIComponent(e)}`,{method:`PATCH`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)})}catch(e){console.warn(`Job patch failed:`,e)}}hasPendingJobPatch(e){return this._pendingJobPatches.has(e)}scheduleJobPatch(e,t,n=700){if(!e||!t)return;let r={...this._pendingJobPatches.get(e)||{},...t};this._pendingJobPatches.set(e,r),clearTimeout(this._jobPatchTimers.get(e)),this._jobPatchTimers.set(e,setTimeout(async()=>{let t=this._pendingJobPatches.get(e);this._pendingJobPatches.delete(e),this._jobPatchTimers.delete(e),t&&await this.patchServerJob(e,t)},n))}async onGenerate(e){let t=e.detail;this.prompt=t.prompt,this.magicPrompt=t.magicPrompt,this.bypassUpsample=t.bypassUpsample,this.selectedTemplate=t.selectedTemplate,this.advancedMode=t.advancedMode,this.selectedEndpoint=t.endpoint,this.providerParams={...t.providerParams||this.providerParams},this.captureLastGeneratorSettings();try{let e=await K.sendJobRequest({raw_prompt:t.prompt,provider:t.endpoint,upsampler:`deepseek`,parent_uuid:this.parentUuid||null,magic_prompt:!!(t.magicPrompt&&!t.bypassUpsample),advanced_mode:!!t.advancedMode,is_json_mode:!!t.isJsonMode,provider_params:this.providerParams,upsampler_params:{template:t.selectedTemplate||`v1`},upsampled_prompt:t.bypassUpsample?this.cachedUpsampledPrompt:null});this.parentUuid=``,this.activeLeftTab=`progress`,window.location.hash=`#/job/`+e.job_id,this.scheduleSessionSave()}catch(e){this.showToast(e.message,`error`)}}onSelectJob(e){let t=e.detail;K.setSelectedJobId(t.id),this.activeLeftTab=`progress`,this.editorPinnedIndex=null,window.location.hash=`#/job/`+t.id}onCancelJob(e){let t=e.detail;this.removeJob(t)}async removeJob(e){try{await K.removeJob(e),this.selectedJobId===e&&(K.selectedJobId?window.location.hash=`#/job/`+K.selectedJobId:window.location.hash=`#/`)}catch(e){this.showToast(e.message,`error`)}}async onClearCompletedJobs(){try{await K.clearCompleted(),this.selectedJobId&&!K.jobQueue.find(e=>e.id===this.selectedJobId)&&(K.selectedJobId?window.location.hash=`#/job/`+K.selectedJobId:window.location.hash=`#/`)}catch(e){this.showToast(e.message,`error`)}}updateFormInputs(e){this.isJsonMode=e.params.isJsonMode||!1,this.prompt=this.isJsonMode&&e.upsampledPrompt||e.rawPrompt,this.magicPrompt=e.params.magicPrompt,this.advancedMode=e.params.advancedMode||!1,this.selectedTemplate=e.params.upsampleTemplate||`v1`,this.selectedEndpoint=e.provider||e.params.endpoint||this.endpoints.find(e=>e.default)?.name||``,this.providerParams=this.withProviderDefaults(this.selectedEndpoint,e.providerParams||e.params.providerParams||{}),e.upsampledPrompt?(this.cachedUpsampledPrompt=e.upsampledPrompt,this.bypassUpsample=!0):(this.cachedUpsampledPrompt=``,this.bypassUpsample=!1)}onPromptChange(e){this.prompt=e.detail,this.cachedUpsampledPrompt=``,this.bypassUpsample=!1,this.scheduleSessionSave()}onMagicChange(e){this.magicPrompt=e.detail,this.captureLastGeneratorSettings(),this.scheduleSessionSave()}onBypassChange(e){this.bypassUpsample=e.detail,this.scheduleSessionSave()}onTemplateChange(e){this.selectedTemplate=e.detail,this.captureLastGeneratorSettings(),this.scheduleSessionSave()}onAdvancedChange(e){this.advancedMode=e.detail,this.captureLastGeneratorSettings(),this.scheduleSessionSave()}onEndpointChange(e){this.selectedEndpoint=e.detail,this.providerParams=this.withProviderDefaults(this.selectedEndpoint,{}),this.captureLastGeneratorSettings(),this.scheduleSessionSave()}onProviderParamsChange(e){let t=this.aspectRatioFromProviderParams(this.providerParams);this.providerParams={...e.detail};let n=this.aspectRatioFromProviderParams(this.providerParams),r=K.getSelectedJob();if(r?.status===`editing`){let e={providerParams:this.providerParams};n!==t&&(e.upsampledPrompt=this.promptWithAspectRatio(r.upsampledPrompt,n),e.draftJson=this.promptToDraftJson(e.upsampledPrompt)),K.updateJob(r.id,e),this.patchServerJob(r.id,e)}this.captureLastGeneratorSettings(),this.scheduleSessionSave()}async onSwitchTab(e){e.detail===`history`?window.location.hash=`#/history`:this.selectedJobId?window.location.hash=`#/job/`+this.selectedJobId:window.location.hash=`#/`}onLeftTabChange(e){let t=e.detail;this.activeLeftTab=t,t===`progress`&&this.currentRoute===`#/`&&(window.location.hash=`#/queue`)}onReuseSettings(e){let t=e.detail;this.applyHistoryItemToForm(t,!!t.upsampledPrompt),this.captureLastGeneratorSettings(),this.activeLeftTab=`generator`,this._preserveNextHomeRoute=!0,window.location.hash=`#/`}async onReuseAdvancedSettings(e){let{item:t,bgImage:n}=e.detail;this.applyHistoryItemToForm(t,!1),this.captureLastGeneratorSettings();try{let e=t.params.provider||t.params.endpoint||this.selectedEndpoint,r=this.providerParamsFromHistory(t),i=this.promptWithAspectRatio(t.upsampledPrompt,this.aspectRatioFromProviderParams(r)),a=await K.sendJobRequest({raw_prompt:t.rawPrompt,provider:e,upsampler:t.params.upsampler||`deepseek`,parent_uuid:t.uuid||null,magic_prompt:!1,advanced_mode:!0,provider_params:r,upsampler_params:t.params.upsamplerParams||{template:t.params.upsampleTemplate||`v1`},upsampled_prompt:i,chat_messages:[{role:`system`,content:`Visual Prompt Layout Chat Assistant.`},{role:`assistant`,content:i}],job_type:`editing`}),o=K.getSelectedJob();o&&n&&K.updateJob(o.id,{backgroundImage:n}),this.activeLeftTab=`generator`,window.location.hash=`#/editor/`+a.job_id}catch(e){this.showToast(e.message,`error`)}}async onDeleteHistoryItem(e){let t=e.detail;await Ee(t.id,t.timestamp),await this.loadHistory()}async onClearHistory(){await De(),await this.loadHistory()}onOpenLightbox(e){let{src:t,prompt:n,seed:r,item:i}=e.detail;this.lightboxSrc=t,this.lightboxPrompt=n,this.lightboxSeedLabel=r,this.lightboxItem=i,this.lightboxHidden=!1;let a=Number(e.detail.imgIdx||0);this.lightboxIndex=a,i?.uuid&&(this.activeTab===`history`||this.currentRoute.startsWith(`#/history`)?window.location.hash=`#/history/${i.uuid}/lightbox/${a}`:this.selectedJobId&&(window.location.hash=`#/job/${this.selectedJobId}/lightbox/${a}`))}onCloseLightbox(){if(this.closeRouteLightbox(),this.currentRoute.includes(`/lightbox/`)){let e=this.currentRoute.replace(/\/lightbox\/\d+$/,``);window.location.hash=e||`#/`}}async onUpdateEditorPrompt(e){await He(this,e.detail)}promptToDraftJson(e){return Z(e)}onEditorUndo(){Ue(this)}onEditorRedo(){We(this)}onEditorCancel(){this.editorSelectedIndex=null,this.editorPinnedIndex=null,this.selectedJobId&&this.removeJob(this.selectedJobId),window.location.hash=`#/`}async onEditorGenerate(){try{await Ge(this)}catch(e){this.showToast(e.message,`error`)}}async onSendEditorChat(e){await Ke(this,e.detail)}toggleTheme(){let e=this.theme===`light`?`dark`:`light`;document.body.classList.remove(`${this.theme}-theme`),document.body.classList.add(`${e}-theme`),this.theme=e,localStorage.setItem(`ideoui_theme`,e)}render(){let e=this.jobQueue.find(e=>e.id===this.selectedJobId),t=this.inspectorItem?{id:`inspector_${this.inspectorItem.uuid}`,uuid:this.inspectorItem.uuid,parentUuid:this.inspectorItem.parentUuid,rawPrompt:this.inspectorItem.rawPrompt,upsampledPrompt:this.inspectorItem.upsampledPrompt,providerParams:this.providerParams,params:this.inspectorItem.params||{},images:this.inspectorItem.images||[],status:`inspecting`,backgroundImage:this.inspectorItem.images?.[0]||``}:null,n=t||e,r=this.activeTab===`current`&&e?.status===`editing`,i=this.activeTab===`current`&&!!t,a=r||i;return F`
      <div class="glow-bg"></div>
      <div class="app-container">
        <!-- Header -->
        <header class="app-header">
          <div class="logo-area" @click="${this.goCleanHome}" role="button" title="New Prompt">
            <div class="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 22H22L12 2Z" stroke="url(#logoGrad)" stroke-width="2" stroke-linejoin="round"/>
                <path d="M12 6L5 20H19L12 6Z" fill="url(#logoGrad)" fill-opacity="0.2"/>
                <circle cx="12" cy="14" r="3" stroke="url(#logoGrad)" stroke-width="2"/>
                <defs>
                  <linearGradient id="logoGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#a855f7"/>
                    <stop offset="1" stop-color="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1>Ideogram 4 <span>Studio</span></h1>
          </div>
          <div class="header-actions">
            <button class="theme-toggle-btn" @click="${this.toggleTheme}" title="Toggle light/dark theme" aria-label="Toggle theme">
              ${this.theme===`light`?F`<svg class="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`:F`<svg class="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="4.22" x2="19.78" y2="5.64"/></svg>`}
            </button>
            <div class="api-status">
              <span class="status-indicator ${this.apiOnline?`online`:`offline`}" id="backendStatus"></span>
              <span class="status-text">${this.apiOnline?`Backend Connected`:`Backend Disconnected`}</span>
            </div>
          </div>
        </header>

        <!-- Main Workspace -->
        <main class="workspace ${a?`editing`:``}">
          <!-- Left Panel: Controls -->
          <control-panel
            .templates="${this.templates}"
            .hasCachedUpsample="${!!this.cachedUpsampledPrompt}"
            .prompt="${this.prompt}"
            .magicPrompt="${this.magicPrompt}"
            .bypassUpsample="${this.bypassUpsample}"
            .selectedTemplate="${this.selectedTemplate}"
            .advancedMode="${this.advancedMode}"
            .endpoints="${this.endpoints}"
            .selectedEndpoint="${this.selectedEndpoint}"
            .providerSchemas="${this.providerSchemas}"
            .providerParams="${this.providerParams}"
            .isEditing="${a}"
            .jobQueue="${this.jobQueue}"
            .selectedJobId="${this.selectedJobId}"
            .activeLeftTab="${this.activeLeftTab}"
            .isJsonMode="${this.isJsonMode}"
            @is-json-change="${e=>{this.isJsonMode=e.detail,this.scheduleSessionSave()}}"
            @prompt-change="${this.onPromptChange}"
            @magic-change="${this.onMagicChange}"
            @bypass-change="${this.onBypassChange}"
            @template-change="${this.onTemplateChange}"
            @advanced-change="${this.onAdvancedChange}"
            @endpoint-change="${this.onEndpointChange}"
            @provider-params-change="${this.onProviderParamsChange}"
            @left-tab-change="${this.onLeftTabChange}"
            @generate="${this.onGenerate}"
            @select-job="${this.onSelectJob}"
            @cancel-job="${this.onCancelJob}"
            @clear-completed-jobs="${this.onClearCompletedJobs}">
          </control-panel>

          <!-- Center Panel: Results & Status -->
          <display-panel
            .selectedJob="${n}"
            .activeTab="${this.activeTab}"
            .historyItems="${this.historyItems}"
            .isRefining="${this.isRefining}"
            .jobQueue="${this.jobQueue}"
            .selectedJobId="${this.selectedJobId}"
            .selectedElementIndex="${this.editorSelectedIndex}"
            .pinnedBoxIndex="${this.editorPinnedIndex}"
            .readOnlyEditor="${i}"
            @switch-tab="${this.onSwitchTab}"
            @cancel-active-job="${()=>this.removeJob(this.selectedJobId)}"
            @select-job="${this.onSelectJob}"
            @cancel-job="${this.onCancelJob}"
            @clear-completed-jobs="${this.onClearCompletedJobs}"
            @reuse-settings="${this.onReuseSettings}"
            @reuse-advanced="${this.onReuseAdvancedSettings}"
            @delete-history-item="${this.onDeleteHistoryItem}"
            @clear-history="${this.onClearHistory}"
            @open-lightbox="${this.onOpenLightbox}"
            @update-editor-prompt="${this.onUpdateEditorPrompt}"
            @editor-undo="${this.onEditorUndo}"
            @editor-redo="${this.onEditorRedo}"
            @element-selected="${e=>{this.editorSelectedIndex=e.detail,this.requestUpdate()}}"
            @element-pinned="${e=>{this.editorPinnedIndex=e.detail,this.requestUpdate()}}"
            @editor-cancel="${this.onEditorCancel}"
            @editor-generate="${this.onEditorGenerate}">
          </display-panel>

          <!-- Right Panel: Editor Sidebar (only in editing mode) -->
          ${a&&n?F`
            <section class="editor-sidebar-column glass-card">
              <editor-sidebar
                .upsampledPrompt="${n.upsampledPrompt}"
                .chatMessages="${n.chatMessages||[]}"
                .isRefining="${this.isRefining}"
                .selectedElementIndex="${this.editorSelectedIndex}"
                .pinnedBoxIndex="${this.editorPinnedIndex}"
                .readOnly="${i}"
                @update-prompt="${e=>this.onUpdateEditorPrompt(e)}"
                @send-chat="${this.onSendEditorChat}"
                @element-selected="${e=>{this.editorSelectedIndex=e.detail,this.requestUpdate()}}"
                @element-pinned="${e=>{this.editorPinnedIndex=e.detail,this.requestUpdate()}}">
              </editor-sidebar>
            </section>
          `:``}
        </main>
      </div>

      <!-- Toast notifications -->
      <div class="toast-container">
        ${this.toasts.map(e=>F`
          <div class="toast ${e.type}">
            <div class="toast-content">
              <span class="toast-icon">
                ${e.type===`success`?F`
                  ${q(`check`,16)}
                `:F`
                  ${q(`info`,16)}
                `}
              </span>
              <span class="toast-message">${e.message}</span>
            </div>
          </div>
        `)}
      </div>

      <!-- Lightbox overlay -->
      <image-lightbox
        .src="${this.lightboxSrc}"
        .prompt="${this.lightboxPrompt}"
        .seedLabel="${this.lightboxSeedLabel}"
        .item="${this.lightboxItem}"
        .hidden="${this.lightboxHidden}"
        @close="${this.onCloseLightbox}"
        @reuse="${this.onReuseSettings}"
        @reuse-advanced="${this.onReuseAdvancedSettings}">
      </image-lightbox>
    `}};customElements.define(`app-root`,it);