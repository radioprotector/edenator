(this.webpackJsonpedenator=this.webpackJsonpedenator||[]).push([[0],{54:function(e,r,t){},61:function(e,r,t){},66:function(e,r,t){},67:function(e,r,t){"use strict";t.r(r);var n,a=t(5),o=t.n(a),i=t(41),s=t.n(i),c=(t(54),t(13)),u=t(17),l=t.n(u),d=t(16),f=t(20),h=t(11),b=t(42),m=t(1),p=t(2);!function(e){e.C_Major="1d",e.A_Minor="1m",e.G_Major="2d",e.E_Minor="2m",e.D_Major="3d",e.B_Minor="3m",e.A_Major="4d",e.F_Sharp_Minor="4m",e.E_Major="5d",e.C_Sharp_Minor="5m",e.B_Major="6m",e.G_Sharp_Minor="6d",e.F_Sharp_Major="7d",e.D_Sharp_Minor="7m",e.D_Flat_Major="8d",e.B_Flat_Minor="8m",e.A_Flat_Major="9d",e.F_Minor="9m",e.E_Flat_Major="10d",e.C_Minor="10m",e.B_Flat_Major="11d",e.G_Minor="11m",e.F_Major="12d",e.D_Minor="12m",e.OffKey="0"}(n||(n={}));var j=function(){function e(){Object(m.a)(this,e),this.title="",this.artist="",this.bpm=120,this.length=0,this.key=null,this.subBass=[],this.bass=[],this.beat=[],this.treble=[],this.lulls=[],this.trackHash=1,this.isEmpty=!1}return Object(p.a)(e,[{key:"secondsPerMeasure",get:function(){return 240/this.bpm}},{key:"getTrackRandomInt",value:function(e,r){return this.getTrackSeededRandomInt(e,r,0)}},{key:"getTrackSeededRandomInt",value:function(e,r,t){var n=(Math.sin(this.trackHash+t)+1)/2;return e+Math.floor(n*(r-e+1))}},{key:"getTrackSeededRandomFloat",value:function(e,r,t){return e+(Math.sin(this.trackHash+t)+1)/2*(r-e)}}]),e}(),v=new j;v.isEmpty=!0;var y=44100,M=Object.values(n),g={"1A":n.G_Sharp_Minor,"G#m":n.G_Sharp_Minor,Abm:n.G_Sharp_Minor,"1B":n.B_Major,B:n.B_Major,"2A":n.D_Sharp_Minor,"D#m":n.D_Sharp_Minor,Ebm:n.D_Sharp_Minor,"2B":n.F_Sharp_Major,"F#":n.F_Sharp_Major,Gb:n.F_Sharp_Major,"3A":n.B_Flat_Minor,"A#m":n.B_Flat_Minor,Bbm:n.B_Flat_Minor,"3B":n.D_Flat_Major,"C#":n.D_Flat_Major,Db:n.D_Flat_Major,"4A":n.F_Minor,Fm:n.F_Minor,"4B":n.A_Flat_Major,"G#":n.A_Flat_Major,Ab:n.A_Flat_Major,"5A":n.C_Minor,Cm:n.C_Minor,"5B":n.E_Flat_Major,"D#":n.E_Flat_Major,Eb:n.E_Flat_Major,"6A":n.G_Minor,Gm:n.G_Minor,"6B":n.B_Flat_Major,"A#":n.B_Flat_Major,Bb:n.B_Flat_Major,"7A":n.D_Minor,Dm:n.D_Minor,"7B":n.F_Major,F:n.F_Major,"8A":n.A_Minor,Am:n.A_Minor,"8B":n.C_Major,C:n.C_Major,"9A":n.E_Minor,Em:n.E_Minor,"9B":n.G_Major,G:n.G_Major,"10A":n.B_Minor,Bm:n.B_Minor,"10B":n.D_Major,D:n.D_Major,"11A":n.F_Sharp_Minor,"F#m":n.F_Sharp_Minor,Gbm:n.F_Sharp_Minor,"11B":n.A_Major,A:n.A_Major,"12A":n.C_Sharp_Minor,"C#m":n.C_Sharp_Minor,Dbm:n.C_Sharp_Minor,"12B":n.E_Major,E:n.E_Major,o:n.OffKey,O:n.OffKey};function w(e){return new Promise((function(r,t){new b.Reader(e).read({onSuccess:function(e){r(e)},onError:function(e){var r=new Error(e.info);r.name="MediaTagsError",t(r)}})}))}function _(e,r,t){if(null!==r){var n,a=Object(h.a)(r);try{for(a.s();!(n=a.n()).done;){var o=n.value;if(o in e.tags)return e.tags[o]}}catch(b){a.e(b)}finally{a.f()}}if(null!==t&&"TXXX"in e.tags){var i=[];i=Array.isArray(e.tags.TXXX)?e.tags.TXXX:[e.tags.TXXX];var s,c=Object(h.a)(t);try{for(c.s();!(s=c.n()).done;){var u,l=s.value,d=Object(h.a)(i);try{for(d.s();!(u=d.n()).done;){var f=u.value;if("user_description"in f.data&&"data"in f.data&&f.data.user_description===l)return{id:l,description:l,data:f.data.data}}}catch(b){d.e(b)}finally{d.f()}}}catch(b){c.e(b)}finally{c.f()}}return null}function C(e){var r=_(e,["BPM","TBPM","TMPO"],["fBPM"]),t="";return null===r?null:("string"===typeof(t=r.data)&&(t=parseFloat(t)),"number"===typeof t&&Number.isFinite(t)&&t>0?t:null)}function O(e){var r=_(e,["KEY","TKEY"],["INITIAL KEY","INITIAL_KEY"]),t="";return null===r?null:((t=(t=r.data.toString()).replace(/ /,""))in g&&(t=g[t]),null!==t&&M.includes(t.trim())?t:null)}function x(e){return new window.OfflineAudioContext(1,y,y).decodeAudioData(e).then((function(e){var r=new window.OfflineAudioContext(1,e.length,y),t=r.createBufferSource();return t.buffer=e,t.connect(r.destination),t.start(0),r.startRendering()})).then((function(e){for(var r=e.getChannelData(0),t=new Float32Array(r),n=Math.floor(882),a=0,o=0;o<r.length;o+=n){var i,s=0,c=0;for(c=0;c<n&&o+c<r.length;c++)s+=r[o+c]*r[o+c];for(i=Math.sqrt(s/(c+1)),a=Math.max(i,.9*a),c=0;c<n&&o+c<r.length;c++)t[o+c]=a}return t}))}function k(e,r,t){var n=new window.OfflineAudioContext(1,r.length,y);return n.decodeAudioData(e).then((function(e){var r=n.createBufferSource(),a=r;if(r.buffer=e,null!=t.minFrequency){var o=new BiquadFilterNode(n,{type:"highpass",Q:1,frequency:t.minFrequency});a.connect(o),a=o}if(null!=t.maxFrequency){var i=new BiquadFilterNode(n,{type:"lowpass",Q:1,frequency:t.maxFrequency});a.connect(i),a=i}return a.connect(n.destination),r.start(0),n.startRendering()})).then((function(e){for(var n=e.getChannelData(0),a=[],o={},i=0;i<n.length;)if(0!==r[i]){var s=Math.abs(n[i]),c=s/r[i];if(s>=t.initialAbsoluteThreshold&&c>=t.initialRelativeThreshold){var u={time:i/y,intensity:0,intensityNormalized:0,end:0};do{if(u.intensity=Math.max(u.intensity,s),u.intensityNormalized=Math.max(u.intensityNormalized,c),++i>=n.length||0===r[i])break;c=(s=Math.abs(n[i]))/r[i]}while(s>=t.sustainAbsoluteThreshold&&c>=t.sustainRelativeThreshold);u.end=i/y,a.push(u);var l=u.intensityNormalized.toFixed(2);l in o?o[l]++:o[l]=1,i+=Math.ceil(2756.25)}i++}else i++;var d=Math.ceil(t.expectedMaxPeaksPerMinute*e.duration/60);if(a.length>d){for(var f=Object.keys(o).map((function(e){return{intensity:parseFloat(e),count:o[e]}})).sort((function(e,r){return r.intensity-e.intensity})),h=0,b=f[0].intensity,m=f[0].count;m<d&&h<f.length-1;)h++,b=f[h].intensity,m+=f[h].count;return a.filter((function(e){return e.intensityNormalized>=b}))}return a}))}function F(e,r){if(!e)return null;var t=r/60*45;if(e.length<t)return null;var n={};e.forEach((function(r,t){for(var a=1;a<10&&!(t+a>=e.length);a++){var o=e[t+a].time-r.time,i=o.toFixed(2);o<.25||(i in n?n[i]++:n[i]=1)}}));var a={};Object.keys(n).forEach((function(e){for(var r=60/(parseFloat(e)/y);r<90;)r*=2;for(;r>180;)r/=2;var t=r.toFixed(0);t in a?a[t]+=n[e]:a[t]=n[e]}));var o=Object.keys(a).map((function(e){return{bpm:parseFloat(e),intervals:a[e]}})).sort((function(e,r){return r.bpm-e.bpm})),i=0,s=0,c=0;o.forEach((function(e){e.intervals>i&&(e.bpm,i=e.intervals),s+=e.bpm*e.intervals,c+=e.intervals}));var u=s/c;if(c>2&&o.length>1){for(var l=Math.floor(c/2),d=0;l>0&&d<o.length;)l-=o[d].intervals,d++;0===l?(o[d-1].bpm+o[d].bpm)/2:o[d-1].bpm}return u}function S(e,r,t){for(var n=0;n<e.length;n++){if(e[n].duration<t.duration)return e.splice(n,0,t),e.length>r&&e.pop(),!0}return e.length<r&&(e.push(t),!0)}function A(e,r){for(var t=Number.MAX_SAFE_INTEGER,n=-1,a=-1,o=0;o<e.length;o++){var i=e[o],s=r[o];if(!(s>=i.length)){var c=i[s];c.time<t&&(t=c.time,n=o,a=s)}}return{arrayIndex:n,elementIndex:a}}function B(e,r,t,n){if(r<=0||n.length<=0)return[];for(var a=(n=n.filter((function(e){return e.length>0}))).map((function(){return 0})),o=[],i=t,s=0;;){var c=A(n,a);if(-1===c.arrayIndex){var u={time:s,end:e,duration:e-s};u.duration>i&&S(o,r,u);break}a[c.arrayIndex]++;var l=n[c.arrayIndex][c.elementIndex];if(!(l.time>0&&l.time<=s)){var d={time:s,end:l.time,duration:l.time-s};if(d.duration>i&&S(o,r,d)&&o.length>=r&&(i=o[o.length-1].duration),(s=l.end+t)>e)break}}return o.sort((function(e,r){return e.time-r.time}))}function T(e,r){if(!(0===e.length||e.length>=r)){e.sort((function(e,r){return r.duration-e.duration}));for(;e.length<r&&e[0].duration/2>e[e.length-1].duration;){var t=e.shift(),n=t.duration/2,a=t.time+n,o={time:t.time,end:a,duration:n},i={time:a,end:t.end,duration:n};S(e,r,o),S(e,r,i)}e.sort((function(e,r){return e.time-r.time}))}}function L(){return(L=Object(f.a)(l.a.mark((function e(r){var t,n,a,o,i,s;return l.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.prev=0,e.next=3,w(r);case 3:t=e.sent,e.next=9;break;case 6:return e.prev=6,e.t0=e.catch(0),e.abrupt("return",Promise.reject(e.t0));case 9:return e.next=11,r.arrayBuffer().then((function(e){return x(e)}));case 11:return n=e.sent,a=r.arrayBuffer().then((function(e){return k(e,n,{minFrequency:20,maxFrequency:50,expectedMaxPeaksPerMinute:60,initialAbsoluteThreshold:.4,initialRelativeThreshold:.5,sustainAbsoluteThreshold:.4,sustainRelativeThreshold:.5})})),o=r.arrayBuffer().then((function(e){return k(e,n,{minFrequency:50,maxFrequency:90,expectedMaxPeaksPerMinute:120,initialAbsoluteThreshold:.4,initialRelativeThreshold:.5,sustainAbsoluteThreshold:.4,sustainRelativeThreshold:.5})})),i=r.arrayBuffer().then((function(e){return k(e,n,{minFrequency:90,maxFrequency:200,expectedMaxPeaksPerMinute:300,initialAbsoluteThreshold:.4,initialRelativeThreshold:.5,sustainAbsoluteThreshold:.4,sustainRelativeThreshold:.5})})),s=r.arrayBuffer().then((function(e){return k(e,n,{minFrequency:2048,maxFrequency:null,expectedMaxPeaksPerMinute:120,initialAbsoluteThreshold:.4,initialRelativeThreshold:.5,sustainAbsoluteThreshold:.25,sustainRelativeThreshold:.35})})),e.abrupt("return",Promise.all([t,a,o,i,s]).then((function(e){var t,a,o,i=Object(c.a)(e,5),s=i[0],u=i[1],l=i[2],f=i[3],h=i[4],b=n.length/y,m=O(s),p=C(s);p||(p=F(f,b));var v=new j;v.title=null!==(t=s.tags.title)&&void 0!==t?t:"Unknown Title",v.artist=null!==(a=s.tags.artist)&&void 0!==a?a:"Unknown Artist",v.bpm=null!==(o=p)&&void 0!==o?o:120,v.length=b,v.key=m,v.subBass=u,v.bass=l,v.beat=f,v.treble=h,v.trackHash=Math.floor(r.lastModified+r.size)+1;var M,g=Math.floor(b/60*12),w=v.secondsPerMeasure;(v.lulls=B(b,g,w,[f,h]),v.lulls.length<g)&&((M=v.lulls).push.apply(M,Object(d.a)(B(b,g-v.lulls.length,w,[v.lulls,u]))),v.lulls.sort((function(e,r){return e.time-r.time})),T(v.lulls,g));return v})));case 17:case"end":return e.stop()}}),e,null,[[0,6]])})))).apply(this,arguments)}var E=t(32),P=t.n(E),R=t(43),D=t(0),I=new D.Color(0),G=new D.Color(16777215);function q(e){return e<=.03928?e/12.92:Math.pow((e+.055)/1.055,2.4)}function V(e){return.2126*q(e.r)+.7152*q(e.g)+.0722*q(e.b)}var U=.43;function N(e,r,t){var n,a,o,i=arguments.length>3&&void 0!==arguments[3]?arguments[3]:null;return null===i&&(i=new D.Color(r).lerp(t,.5)),V(r)<U?(n=G,a=new D.Color(r).lerp(I,.3),o=new D.Color(r).lerp(G,.2)):(n=I,a=new D.Color(r).lerp(G,.3),o=new D.Color(r).lerp(I,.2)),{name:e,bass:{wireframeColor:new D.Color(i).lerp(I,.3),panelColor:new D.Color(i)},beat:{color:new D.Color(r)},treble:{spriteColor:new D.Color(r).lerp(G,.65),spriteTexture:"/edenator/textures/extendring.png",lightColor:new D.Color(r).lerp(G,.75)},frequencyGrid:{lineColor:new D.Color(t)},background:{fillColor:new D.Color(r).lerp(I,.97),sunColor:new D.Color(r).lerp(t,.75).lerp(G,.5),burstLineColor:new D.Color(r).lerp(t,.75).lerp(G,.25),starColor:new D.Color(r).lerp(t,.75).lerp(G,.1),starFlashColor:new D.Color(r).lerp(t,.75)},ui:{textColor:n,backgroundColor:new D.Color(r),disabledBackgroundColor:a,focusBackgroundColor:o,borderColor:new D.Color(t)}}}var z=N("default",new D.Color(16737792),new D.Color(16724787),new D.Color(16750899)),W=N("magenta",new D.Color(16724991),new D.Color(10040217),new D.Color(13311)),X=N("indigo",new D.Color(13369599),new D.Color(6711039),new D.Color(6697983)),H=N("deep blue",new D.Color(13311),new D.Color(13408512),new D.Color(52428)),K=N("mid blue",new D.Color(6724095),new D.Color(6736998),new D.Color(3368703)),Z=N("light blue",new D.Color(10079487),new D.Color(16738047),new D.Color(3407667)),Y=N("blue-green",new D.Color(65535),new D.Color(13395456),new D.Color(3381657)),J=N("green",new D.Color(65280),new D.Color(16711833),new D.Color(65433)),Q=N("yellow-green",new D.Color(10092492),new D.Color(16763955),new D.Color(3394560)),$=N("yellow",new D.Color(16763904),new D.Color(3355647),new D.Color(13421619)),ee=N("orange",new D.Color(16737792),new D.Color(3407871),new D.Color(16711680)),re=N("red",new D.Color(16711680),new D.Color(10092492),new D.Color(16737945)),te=N("pink",new D.Color(16751052),new D.Color(16724787),new D.Color(13382604)),ne=N("hotdog stand",new D.Color(16711680),new D.Color(16776960)),ae=N("fluorescent",new D.Color(16711935),new D.Color(65280)),oe=N("plasma power saver",new D.Color(255),new D.Color(16711935),new D.Color(13369446)),ie=[z,W,X,H,K,Z,Y,J,Q,$,ee,re,te,ne,ae,oe];var se,ce=P()(Object(R.subscribeWithSelector)((function(e){return{analysis:v,theme:z,audioLastSeeked:0,setAnalysis:function(r){return e((function(e){e.analysis=r}))},setTheme:function(r){return e((function(e){e.theme=r}))},indicateAudioSeeked:function(){return e((function(e){e.audioLastSeeked=Date.now()}))}}}))),ue=(t(61),t(44)),le=t(45),de=t(6),fe=new Path2D("M64,12.8C64,5.735 58.265,0 51.2,0L12.8,0C5.735,0 0,5.735 0,12.8L0,51.2C0,58.265 5.735,64 12.8,64L51.2,64C58.265,64 64,58.265 64,51.2L64,12.8Z"),he=new Path2D("M-0.063,32C-0.063,32 0.1,14.756 0.706,14.762C1.308,14.768 1.352,48.687 2.623,48.679C3.713,48.672 4.033,19.674 6.498,19.72C8.476,19.757 9.898,44.125 11.665,44.137C13.269,44.148 15.225,27.314 18.123,27.262C19.97,27.228 22.316,34.293 24.748,34.262C26.547,34.239 29.486,30.126 31.915,30.179C33.821,30.22 36.836,32.346 39.185,32.262C41.258,32.188 44.23,31.313 45.976,31.262C47.511,31.217 51.354,32.125 53.396,32.058C55.048,32.004 58.987,31.707 60.222,31.672C61.416,31.638 62.61,31.788 63.804,31.845"),be=new Path2D("M25.418,10.25L27.74,9.882L27.993,11.48L29.435,10.745L30.502,12.84L29.06,13.575L30.204,14.719L28.542,16.381L27.398,15.237L26.663,16.679L24.568,15.612L25.303,14.17L23.705,13.917L24.073,11.595L25.671,11.848L25.418,10.25Z"),me=new Path2D("M44.075,49.242L45.903,47.762L46.921,49.02L47.802,47.663L49.774,48.943L48.893,50.3L50.456,50.719L49.847,52.99L48.284,52.571L48.369,54.187L46.021,54.31L45.936,52.694L44.426,53.274L43.583,51.079L45.094,50.499L44.075,49.242Z");var pe=function(){var e=ce((function(e){return e.theme.ui}));return Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.theme.ui}),(function(e){var r;null===(r=document.querySelector('meta[name="theme-color"]'))||void 0===r||r.setAttribute("content",e.backgroundColor.getStyle());var t=document.createElement("canvas");t.setAttribute("width","64px"),t.setAttribute("height","64px");var n=t.getContext("2d",{alpha:!0,desynchronized:!0});if(n){var a;n.fillStyle=e.backgroundColor.getStyle(),n.fill(fe),n.strokeStyle=e.textColor.getStyle(),n.lineWidth=2,n.stroke(he),n.lineWidth=1,n.stroke(be),n.stroke(me);var o=t.toDataURL("image/png");null===(a=document.querySelector('link[rel="icon"]'))||void 0===a||a.setAttribute("href",o)}t.remove()}))}),[]),Object(de.jsx)("style",{type:"text/css",children:Object(le.a)(se||(se=Object(ue.a)(["\n        html {\n          --ui-color-text: ",";\n          --ui-color-contrast: ",";\n          --ui-color-contrast-disabled: ",";\n          --ui-color-contrast-focus: ",";\n          --ui-color-border: ",";\n      }"])),e.textColor.getStyle(),e.backgroundColor.getStyle(),e.disabledBackgroundColor.getStyle(),e.focusBackgroundColor.getStyle(),e.borderColor.getStyle())})},je=t(15);function ve(e){return Array.from(Array(e).keys())}var ye=Math.PI/2,Me=15,ge=new D.BufferGeometry;ge.setFromPoints([new D.Vector3(.5,-.5,.5),new D.Vector3(.5,.5,.5),new D.Vector3(.5,.5,.5),new D.Vector3(-.5,.5,.5),new D.Vector3(-.5,.5,.5),new D.Vector3(-.5,-.5,.5),new D.Vector3(-.5,-.5,.5),new D.Vector3(.5,-.5,.5),new D.Vector3(-.5,.5,.5),new D.Vector3(-.5,.5,-.5),new D.Vector3(-.5,-.5,.5),new D.Vector3(-.5,-.5,-.5),new D.Vector3(.5,.5,.5),new D.Vector3(.5,.5,-.5),new D.Vector3(.5,-.5,.5),new D.Vector3(.5,-.5,-.5),new D.Vector3(.5,-.5,-.5),new D.Vector3(.5,.5,-.5),new D.Vector3(.5,.5,-.5),new D.Vector3(-.5,.5,-.5),new D.Vector3(-.5,.5,-.5),new D.Vector3(-.5,-.5,-.5),new D.Vector3(-.5,-.5,-.5),new D.Vector3(.5,-.5,-.5)]);var we,_e=new D.LineBasicMaterial,Ce=new D.PlaneGeometry,Oe=new D.MeshBasicMaterial({side:D.DoubleSide,transparent:!0,opacity:.6});function xe(e,r,t,n,a){switch(r.visible=!0,t.visible=!0,n.isEmpty?we.PlaneHidden:n.getTrackSeededRandomInt(we.MIN,we.MAX,a+e)){case we.SegmentHidden:r.visible=!1,t.visible=!1;break;case we.PlaneLeft:t.scale.set(5,Me,1),t.position.set(-1,0,0),t.rotation.set(0,ye,0);break;case we.PlaneRight:t.scale.set(5,Me,1),t.position.set(1,0,0),t.rotation.set(0,ye,0);break;case we.PlaneFront:t.scale.set(2,Me,1),t.position.set(0,0,2.5),t.rotation.set(0,0,0);break;case we.PlaneTop:t.scale.set(2,5,1),t.position.set(0,7.5,0),t.rotation.set(ye,0,0);break;case we.PlaneBottom:t.scale.set(2,5,1),t.position.set(0,-7.5,0),t.rotation.set(ye,0,0);break;case we.PlaneHidden:t.visible=!1;break;default:0,t.visible=!1}}function ke(e){return 5-e%20*5}!function(e){e[e.SegmentHidden=0]="SegmentHidden",e[e.MIN=0]="MIN",e[e.PlaneLeft=1]="PlaneLeft",e[e.PlaneRight=2]="PlaneRight",e[e.PlaneFront=3]="PlaneFront",e[e.PlaneTop=4]="PlaneTop",e[e.PlaneBottom=5]="PlaneBottom",e[e.PlaneHidden=6]="PlaneHidden",e[e.MAX=6]="MAX"}(we||(we={}));var Fe=function(e){var r=0,t=0,n=ce((function(e){return e.analysis}));_e.color=ce().theme.bass.wireframeColor,Oe.color=ce().theme.bass.panelColor,Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.theme.bass.wireframeColor}),(function(e){_e.color=e}))}),[]),Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.theme.bass.panelColor}),(function(e){Oe.color=e}))}),[]);var o=Object(a.useRef)([]),i=Object(a.useRef)([]),s=Object(a.useRef)([]),c=Object(a.useMemo)((function(){return ve(40).map((function(e){return Object(de.jsxs)("group",{ref:function(r){return o.current[e]=r},children:[Object(de.jsx)("lineSegments",{ref:function(r){return i.current[e]=r},scale:[2,Me,5],geometry:ge,material:_e}),Object(de.jsx)("mesh",{ref:function(r){return s.current[e]=r},geometry:Ce,material:Oe})]},e)}))}),[]),u=Object(a.useMemo)((function(){return.5*n.secondsPerMeasure*20}),[n]);return Object(a.useEffect)((function(){for(var e=0;e<o.current.length;e++){var r=o.current[e],t=s.current[e],a=ke(e);e<20?r.position.set(-12,0,a):r.position.set(12,0,a),xe(e,r,t,n,0)}}),[n,o,s]),Object(a.useEffect)((function(){return ce.subscribe((function(e){return[e.analysis,e.audioLastSeeked]}),(function(){r=0,t=0}))}),[]),Object(je.b)((function(){var a=ke(0)+10,i=0,c=0,l=0,d=0;null!==e.audio.current&&(i=(c=e.audio.current.currentTime)%u*100/u);for(var f=r;f<n.bass.length;f++){var h=n.bass[f],b=h.time-.25,m=h.end+.5,p=h.intensity;if(b>c)break;m<c?r++:(c<h.time?p=D.MathUtils.mapLinear(c,b,h.time,0,p):c>h.end&&(p=D.MathUtils.mapLinear(c,h.end,m,p,0)),l=Math.max(p,l))}for(var j=t;j<n.subBass.length;j++){var v=n.subBass[j],y=v.time-.5,M=v.end+1.5,g=v.intensity;if(y>c)break;M<c?t++:(c<v.time?g=D.MathUtils.mapLinear(c,y,v.time,0,g):c>v.end&&(g=D.MathUtils.mapLinear(c,v.end,M,g,0)),d=Math.max(g,d))}for(var w=0;w<o.current.length;w++){var _=o.current[w],C=ke(w)+i;if(_.visible=!n.isEmpty,C>a)if((C-=100)<_.position.z)xe(w,_,s.current[w],n,c);_.position.z=C,_.scale.set(1+d,1+.75*l,1)}})),Object(de.jsx)("group",{children:c})};function Se(e,r,t){var n=e%r/r*2*Math.PI;return Math.ceil(e/r)%2===0&&(n+=Math.PI/r),new D.Vector3(Math.cos(n),Math.sin(n),0).multiplyScalar(t)}var Ae=new D.SphereGeometry,Be=new D.MeshPhongMaterial({shininess:.5});var Te=function(e){var r=0,t=0,n=Object(a.useRef)([]),o=ce((function(e){return e.analysis}));Be.color=ce().theme.beat.color,Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.theme.beat.color}),(function(e){Be.color=e}))}),[]);var i=ve(36).map((function(e){return Object(de.jsx)("mesh",{ref:function(r){return n.current[e]=r},visible:!1,position:Se(e,6,5),geometry:Ae,material:Be},e)}));return Object(a.useEffect)((function(){return ce.subscribe((function(e){return[e.analysis,e.audioLastSeeked]}),(function(){r=0,t=0}))}),[]),Object(je.b)((function(a,i){if(null!==e.audio.current){for(var s=e.audio.current.currentTime,c=Math.max(s-i,0),u=r;u<o.beat.length;u++){var l=o.beat[u],d=l.time-1.5;if(c>l.end+.25)r++;else{if(d>s)break;n.current[t].userData.peak=l,t=(t+1)%n.current.length,r++}}var f,b=Object(h.a)(n.current);try{for(b.s();!(f=b.n()).done;){var m=f.value,p=m.userData.peak;if(null!==p&&void 0!==p){var j=p.time-1.5,v=p.end+.25;j>s||v<c?(m.visible=!1,delete m.userData.peak):(m.visible=!0,m.position.z=D.MathUtils.mapLinear(s,j,v,-200,-10),s>=p.time&&s<v?m.scale.setScalar(D.MathUtils.mapLinear(s,p.time,v,1,2)):m.scale.setScalar(1))}else m.visible=!1}}catch(y){b.e(y)}finally{b.f()}}})),Object(de.jsx)("group",{children:i})},Le=new D.LineBasicMaterial;var Ee=function(e){var r=-20,t=ce((function(e){return e.analysis}));Le.color=ce().theme.frequencyGrid.lineColor,Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.theme.frequencyGrid.lineColor}),(function(e){Le.color=e}))}),[]);var n=Object(a.useMemo)((function(){for(var e=[],r=-24,t=0;t<8;t++)e.push(new D.Vector3(r,0,0)),r+=1;for(var n=0;n<64;n++)e.push(new D.Vector3(r,0,0)),r+=.5;for(var a=0;a<8;a++)e.push(new D.Vector3(r,0,0)),r+=1;return e}),[]),o=Object(a.useMemo)((function(){var e=new D.BufferGeometry;return e.setFromPoints(n),e}),[n]),i=Object(a.useRef)([]),s=Object(a.useMemo)((function(){return ve(10).map((function(e){var t=new D.Line(o,Le);return t.position.set(0,-10,r*e-10),t.scale.set(.6,D.MathUtils.mapLinear(e,0,9,1,.1),1),i.current[e]=t,Object(de.jsx)("primitive",{object:t},e)}))}),[o,-10,r,10]);return Object(je.b)((function(a,o){if(null!==e.analyser.current&&null!==e.audio.current){var s=new Uint8Array(e.analyser.current.frequencyBinCount);e.analyser.current.getByteFrequencyData(s);for(var c=0;c<s.length;c++)n[c+8].y=s[c]/255*5;for(var u=s[0]/255*5,l=s[s.length-1]/255*5,d=7;d>0;d--)u/=1.618,n[d].y=u;for(var f=72;f<n.length-1;f++)l/=1.618,n[f].y=l;var h=0,b=t.secondsPerMeasure;e.audio.current.currentTime>0&&(h=e.audio.current.currentTime%b/b);for(var m=0;m<i.current.length;m++){var p=i.current[m],j=r*m-10;p.visible=!t.isEmpty,p.geometry.setFromPoints(n),p.geometry.computeBoundingBox(),e.audio.current.currentTime>0?p.position.z=j-r*h:p.position.z=j}}})),Object(de.jsx)("group",{children:s})},Pe=t(68);var Re=function(e){var r=0,t=0,n=Object(a.useRef)([]),o=ce((function(e){return e.analysis})),i=ce((function(e){return e.theme.treble})),s=Object(Pe.a)(i.spriteTexture),c=ve(20).map((function(e){return Object(de.jsxs)("group",{visible:!1,ref:function(r){return n.current[e]=r},children:[Object(de.jsx)("sprite",{scale:[15,15,1],children:Object(de.jsx)("spriteMaterial",{color:i.spriteColor,map:s,depthWrite:!1,transparent:!0,blending:D.CustomBlending,blendEquation:D.AddEquation,blendSrc:D.SrcAlphaFactor,blendDst:D.OneFactor})}),Object(de.jsx)("pointLight",{color:i.lightColor,castShadow:!1,distance:20})]},e)}));return Object(a.useEffect)((function(){return ce.subscribe((function(e){return[e.analysis,e.audioLastSeeked]}),(function(){r=0,t=0}))}),[]),Object(je.b)((function(a,i){if(null!==e.audio.current){for(var s=e.audio.current.currentTime,c=Math.max(s-i,0),u=r;u<o.treble.length;u++){var l=o.treble[u],d=l.time-.1;if(c>l.end+.5)r++;else{if(d>s)break;var f=n.current[t];f.userData.peak=l;var h=o.getTrackSeededRandomInt(0,359,l.time)*D.MathUtils.DEG2RAD,b=o.getTrackSeededRandomInt(12,20,l.time);f.position.x=Math.cos(h)*b,f.position.y=Math.sin(h)*b,t=(t+1)%n.current.length,r++}}for(var m=0;m<n.current.length;m++){var p=n.current[m],j=p.userData.peak;if(null!==j&&void 0!==j){var v=j.time-.1,y=j.end+.5;if(v>s||y<c)p.visible=!1,delete p.userData.peak;else{p.visible=!0,p.position.z=D.MathUtils.mapLinear(s,v,y,-200,10);var M=p.children[0],g=p.children[1];if(s<j.time){var w=D.MathUtils.mapLinear(s,v,j.time,0,1);M.material.opacity=w,g.intensity=20*w}else if(s>j.end){var _=D.MathUtils.mapLinear(s,j.end,y,1,0);M.material.opacity=_,g.intensity=20*_}else M.material.opacity=1,g.intensity=20}}else p.visible=!1}}})),Object(de.jsx)("group",{children:c})},De=150,Ie=new D.Vector3(0,0,0),Ge=[[new D.ConeGeometry(De,450,void 0,void 0,!0),new D.Vector3(0,De,0)],[new D.SphereGeometry(De,void 0,void 0,void 0,void 0,0,Math.PI/2),new D.Vector3(0,-75,0)],[new D.BoxGeometry(De,750,De),Ie],[new D.TorusGeometry(De,75,void 0,void 0,Math.PI).rotateY(Math.PI/2),new D.Vector3(0,-100,0)],[new D.CylinderGeometry(De,De,750,void 0,void 0,!0),Ie]],qe=new D.MeshStandardMaterial({fog:!0}),Ve=new D.MeshStandardMaterial({fog:!0}),Ue=new D.MeshStandardMaterial({fog:!0}),Ne=new D.MeshBasicMaterial({wireframe:!0}),ze=[qe,Ve,Ue,Ne];function We(e,r,t){if(e.geometry.groups.length<=1){var n=t.getTrackSeededRandomInt(0,ze.length-1,r.end);e.material=ze[n]}else{var a=t.getTrackSeededRandomInt(0,ze.length-1,r.end),o=t.getTrackSeededRandomInt(0,ze.length-1,r.end+1);e.material=[];for(var i=0;i<e.geometry.groups.length;i++)e.material[i]=i%2===0?ze[a]:ze[o]}}var Xe=function(e){var r=0,t=0,n=Object(a.useRef)([]),o=ce((function(e){return e.analysis})),i=Object(a.useMemo)((function(){return 2*o.secondsPerMeasure}),[o]),s=ve(10).map((function(e){return Object(de.jsx)("mesh",{visible:!1,ref:function(r){return n.current[e]=r},position:[375,-10,-1e3]},e)}));return qe.color=ce().theme.beat.color,Ve.color=ce().theme.bass.panelColor,Ue.color=ce().theme.background.starFlashColor,Ne.color=ce().theme.frequencyGrid.lineColor,Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.theme.beat.color}),(function(e){qe.color=e}))}),[]),Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.theme.bass.panelColor}),(function(e){Ve.color=e}))}),[]),Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.theme.background.starFlashColor}),(function(e){Ue.color=e}))}),[]),Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.theme.frequencyGrid.lineColor}),(function(e){Ne.color=e}))}),[]),Object(a.useEffect)((function(){return ce.subscribe((function(e){return[e.analysis,e.audioLastSeeked]}),(function(){r=0,t=0}))}),[]),Object(je.b)((function(a,s){if(null!==e.audio.current){for(var c=e.audio.current.currentTime,u=Math.max(c-s,0),l=r;l<o.lulls.length;l++){var d=o.lulls[l],f=d.time-i;if(u>d.time+d.duration)r++;else{if(f>c)break;var h=n.current[t];h.userData.lull=d;var b=o.getTrackSeededRandomInt(0,Ge.length-1,d.time);h.geometry=Ge[b][0];var m=Ge[b][1];0===o.getTrackSeededRandomInt(0,1,d.time)?h.position.x=375+m.x:h.position.x=-375-m.x,We(h,d,o),h.position.y=-10+m.y,t=(t+1)%n.current.length,r++}}var p=0,j=0;if(e.audio.current.currentTime>0&&null!=e.analyser.current){var v=new Uint8Array(e.analyser.current.frequencyBinCount);e.analyser.current.getByteFrequencyData(v),Number.isFinite(v[7])&&(p=v[7]/255/3),Number.isFinite(v[23])&&(j=v[23]/255/10)}for(var y=0;y<n.current.length;y++){var M=n.current[y],g=M.userData.lull;if(null!==g&&void 0!==g){var w=g.time-i,_=g.time+g.duration;if(w>c||_<u)M.visible=!1,delete M.userData.lull;else{M.visible=!0,M.position.z=D.MathUtils.mapLinear(c,w,_,-1e3,0);var C=.995*M.scale.x,O=.995*M.scale.y,x=.995*M.scale.z,k=1.0025*M.scale.x,F=1.0025*M.scale.y,S=1.0025*M.scale.z;M.scale.set(Math.max(C,Math.min(k,1+j)),Math.max(O,Math.min(F,1+p)),Math.max(x,Math.min(S,1+j)))}}else M.visible=!1}}})),Object(de.jsx)("group",{children:s})},He=2*Math.PI;function Ke(e,r,t){for(var n=[],a=Math.max(r-e,1),o=0;o<120;o++){var i=(3*o+t)*D.MathUtils.DEG2RAD,s=e+(Math.sin(o*e)+1)*a/2,c=Math.cos(i),u=Math.sin(i);n.push(new D.Vector3(c*e,u*e,0)),n.push(new D.Vector3(c*s,u*s,0))}var l=new D.BufferGeometry;return l.setFromPoints(n),l}var Ze=new D.PlaneGeometry(2048,2048);var Ye=function(e){var r=Object(Pe.a)({star_first:"/edenator/backgrounds/star-01.png",star_first_glow:"/edenator/backgrounds/star-01-glow.png",star_second:"/edenator/backgrounds/star-02.png",star_second_glow:"/edenator/backgrounds/star-02-glow.png",star_third:"/edenator/backgrounds/star-03.png",star_third_glow:"/edenator/backgrounds/star-03-glow.png",horizon:"/edenator/backgrounds/horizon.png"});[r.star_first,r.star_first_glow,r.star_second,r.star_second_glow,r.star_third,r.star_third_glow].forEach((function(e){e.wrapS=e.wrapT=D.RepeatWrapping,e.repeat.setScalar(4)})),r.horizon.wrapS=r.horizon.wrapT=D.RepeatWrapping;var t=ce((function(e){return e.analysis})),n=ce((function(e){return e.theme.background})),o=Object(a.useMemo)((function(){return Ke(100,120,0)}),[]),i=Object(a.useMemo)((function(){return Ke(125,145,15)}),[]),s=Object(a.useMemo)((function(){return Ke(150,170,30)}),[]),c=Object(a.useMemo)((function(){return 8*t.secondsPerMeasure}),[t]),u=Object(a.useMemo)((function(){return 16*t.secondsPerMeasure}),[t]),l=Object(a.useRef)(null),d=Object(a.useRef)(null),f=Object(a.useRef)(null),h=Object(a.useRef)(null),b=Object(a.useRef)(null),m=Object(a.useRef)(null),p=Object(a.useRef)(null),j=Object(a.useRef)(null),v=Object(a.useRef)(null),y=Object(a.useRef)(null),M=Object(a.useRef)(null);return Object(je.b)((function(r){r.scene.background=n.fillColor,j.current.visible=!t.isEmpty;var a=0,o=0;null!==e.audio.current&&(a=e.audio.current.currentTime,o=e.audio.current.duration);var i=a%c/c,s=Math.sin(i*He);v.current.rotation.set(0,0,s),y.current.rotation.set(0,0,.75*s),M.current.rotation.set(0,0,.5*s);var g=a%u/u,w=Math.sin(g*He);d.current.position.x=50*w,f.current.position.x=50*w,h.current.position.x=60*w,b.current.position.x=60*w,m.current.position.x=70*w,p.current.position.x=70*w;var _=0,C=0,O=0,x=0;if(a>0&&null!==e.analyser.current){var k=new Uint8Array(e.analyser.current.frequencyBinCount);e.analyser.current.getByteFrequencyData(k),Number.isFinite(k[15])&&(_=k[15]/255/2),Number.isFinite(k[7])&&(C=k[7]/255/4),Number.isFinite(k[31])&&(O=k[31]/255/3),Number.isFinite(k[53])&&(x=k[53]/255/5)}v.current.material.opacity=.5+_,y.current.material.opacity=.4+_,M.current.material.opacity=.3+_;var F=.95*l.current.material.opacity;F<=.01&&(F=0),l.current.material.opacity=Math.max(O,F);var S=.95*f.current.material.opacity;S<=.01&&(S=0);var A=Math.max(x,S);f.current.material.opacity=A,b.current.material.opacity=A,p.current.material.opacity=A;var B=.9*v.current.scale.x,T=Math.max(1+C,B);if(v.current.scale.x=v.current.scale.y=T,y.current.scale.x=y.current.scale.y=T,M.current.scale.x=M.current.scale.y=T,Number.isFinite(o)&&o>0){var L=D.MathUtils.mapLinear(a,0,o,.5,1.5);j.current.scale.x=j.current.scale.y=L}})),Object(de.jsxs)("group",{children:[Object(de.jsxs)("mesh",{ref:l,frustumCulled:!1,position:[0,0,-300],scale:[8,.125,1],children:[Object(de.jsx)("planeGeometry",{args:[1024,512]}),Object(de.jsx)("meshBasicMaterial",{color:n.starFlashColor,map:r.horizon,transparent:!0,opacity:0,fog:!1,depthWrite:!1,precision:"mediump"})]}),Object(de.jsxs)("group",{ref:j,children:[Object(de.jsx)("lineSegments",{ref:v,position:[0,0,-250],geometry:o,children:Object(de.jsx)("lineBasicMaterial",{color:n.burstLineColor,transparent:!0,opacity:.5,fog:!1,precision:"lowp"})}),Object(de.jsx)("lineSegments",{ref:y,position:[0,0,-250],geometry:i,children:Object(de.jsx)("lineBasicMaterial",{color:n.burstLineColor,transparent:!0,opacity:.4,fog:!1,precision:"lowp"})}),Object(de.jsx)("lineSegments",{ref:M,position:[0,0,-250],geometry:s,children:Object(de.jsx)("lineBasicMaterial",{color:n.burstLineColor,transparent:!0,opacity:.3,fog:!1,precision:"lowp"})})]}),Object(de.jsxs)("group",{children:[Object(de.jsx)("mesh",{ref:f,position:[0,0,-599],scale:[2,2,1],frustumCulled:!1,geometry:Ze,children:Object(de.jsx)("meshBasicMaterial",{color:n.starFlashColor,map:r.star_first_glow,transparent:!0,opacity:0,fog:!1,depthWrite:!1,precision:"lowp"})}),Object(de.jsx)("mesh",{ref:d,position:[0,0,-600],scale:[2,2,1],frustumCulled:!1,geometry:Ze,children:Object(de.jsx)("meshBasicMaterial",{color:n.starColor,map:r.star_first,transparent:!0,fog:!1,depthWrite:!1,precision:"lowp"})}),Object(de.jsx)("mesh",{ref:b,position:[0,0,-699],scale:[2,2,1],frustumCulled:!1,geometry:Ze,children:Object(de.jsx)("meshBasicMaterial",{color:n.starFlashColor,map:r.star_second_glow,transparent:!0,opacity:0,fog:!1,depthWrite:!1,precision:"lowp"})}),Object(de.jsx)("mesh",{ref:h,position:[0,0,-700],scale:[2,2,1],frustumCulled:!1,geometry:Ze,children:Object(de.jsx)("meshBasicMaterial",{color:n.starColor,map:r.star_second,transparent:!0,fog:!1,depthWrite:!1,precision:"lowp"})}),Object(de.jsx)("mesh",{ref:p,position:[0,0,-799],scale:[2,2,1],frustumCulled:!1,geometry:Ze,children:Object(de.jsx)("meshBasicMaterial",{color:n.starFlashColor,map:r.star_third_glow,transparent:!0,opacity:0,fog:!1,depthWrite:!1,precision:"lowp"})}),Object(de.jsx)("mesh",{ref:m,position:[0,0,-800],scale:[2,2,1],frustumCulled:!1,geometry:Ze,children:Object(de.jsx)("meshBasicMaterial",{color:n.starColor,map:r.star_third,transparent:!0,fog:!1,depthWrite:!1,precision:"lowp"})})]})]})},Je=t(35),Qe=t(10);var $e=function(e){var r=Object(a.useRef)(null);return Object(je.b)((function(){if(!(null===e.audio.current||e.audio.current.currentTime<=0||null===e.analyser.current||null===r.current)){var t=new Uint8Array(e.analyser.current.frequencyBinCount);e.analyser.current.getByteFrequencyData(t);var n=r.current.godRaysPass.getFullscreenMaterial();if(Number.isFinite(t[5])){var a=t[5]/255;n.uniforms.decay.value=D.MathUtils.lerp(.4,.93,a),n.uniforms.exposure.value=D.MathUtils.lerp(.4,.85,a)}else n.uniforms.decay.value=.4,n.uniforms.exposure.value=.4}})),Object(de.jsxs)(Je.b,{children:[Object(de.jsx)(Je.a,{intensity:1,width:Qe.y.AUTO_SIZE,height:Qe.y.AUTO_SIZE,kernelSize:Qe.r.MEDIUM,luminanceThreshold:.4,luminanceSmoothing:.1}),Object(de.jsx)(Je.c,{ref:r,sun:e.sunMesh,blur:10,blendFunction:Qe.a.Screen,samples:60,density:.85,decay:.85,weight:.4,exposure:.4,clampMax:1,width:Qe.y.AUTO_SIZE,height:Qe.y.AUTO_SIZE,kernelSize:Qe.r.MEDIUM})]})},er=new D.MeshBasicMaterial({transparent:!0,fog:!1}),rr=new D.Mesh(new D.SphereGeometry(5),er);rr.frustumCulled=!1,rr.position.set(0,0,-200);var tr=function(e){return er.color=ce.getState().theme.background.sunColor,Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.theme.background.sunColor}),(function(e){er.color=e}))}),[]),Object(de.jsxs)(je.a,{camera:{position:[0,0,15]},children:[Object(de.jsx)("ambientLight",{intensity:.1}),Object(de.jsx)("directionalLight",{position:[0,0,20]}),Object(de.jsx)("primitive",{object:rr}),Object(de.jsx)(Fe,{audio:e.audio}),Object(de.jsx)(Te,{audio:e.audio}),Object(de.jsx)(Ee,{audio:e.audio,analyser:e.analyser}),Object(de.jsx)(Re,{audio:e.audio}),Object(de.jsx)(Xe,{audio:e.audio,analyser:e.analyser}),Object(de.jsx)(Ye,{audio:e.audio,analyser:e.analyser}),Object(de.jsx)($e,{audio:e.audio,analyser:e.analyser,sunMesh:rr})]})};t(66);function nr(){return navigator.userAgent.indexOf("AppleWebKit")>-1&&-1===navigator.userAgent.indexOf("Chrome")}var ar=function(){var e="",r=ce((function(e){return e.setAnalysis})),t=ce((function(e){return e.setTheme})),o=ce((function(e){return e.indicateAudioSeeked})),i=Object(a.useRef)(new AudioContext),s=Object(a.useRef)(null),u=Object(a.useRef)(null),l=Object(a.useRef)(null),d=Object(a.useState)(""),f=Object(c.a)(d,2),h=f[0],b=f[1],m=Object(a.useRef)(null),p=Object(a.useRef)(null),j=Object(a.useRef)(new WeakMap),v=Object(a.useCallback)((function(e){if(null!=e){var r;j.current.has(e)?r=j.current.get(e):(r=new MediaElementAudioSourceNode(i.current,{mediaElement:e}),j.current.set(e,r));var t=new AnalyserNode(i.current,{fftSize:128});r.connect(t),t.connect(i.current.destination),m.current=e,p.current=t}}),[i]);return Object(a.useEffect)((function(){return ce.subscribe((function(e){return e.analysis}),(function(e){null===e||e.isEmpty||""===e.artist||""===e.title?document.title="Edenator":document.title="Edenator (".concat(e.artist," - ").concat(e.title,")")}))}),[]),Object(de.jsxs)("div",{children:[Object(de.jsx)(pe,{}),Object(de.jsxs)("div",{ref:s,className:"app-title",children:[Object(de.jsx)("h1",{children:"Edenator"}),Object(de.jsx)("p",{children:"An in-browser audio visualizer. Start by choosing a track."}),Object(de.jsx)("p",{children:Object(de.jsx)("strong",{children:Object(de.jsx)("em",{children:"The visuals used by this application may not be suitable for people with photosensitive epilepsy."})})}),Object(de.jsx)("p",{children:"This visualizer requires support for WebGL 2.0 and the Web Audio API. All audio processing is performed in-browser and is not uploaded."})]}),Object(de.jsxs)("div",{className:"app-error",hidden:!h,children:[h,Object(de.jsx)("button",{type:"button",onClick:function(){return b("")},children:"Dismiss"})]}),Object(de.jsxs)("div",{id:"filePicker",children:[Object(de.jsx)("button",{type:"button",ref:l,id:"dummyFilePicker",className:"btn",onClick:function(){if(nr()&&i.current&&m.current&&!m.current.src)try{i.current.resume(),m.current.play()}catch(e){}u.current.click()},children:"Choose a track"}),Object(de.jsx)("input",{type:"file",ref:u,id:"sourceFile","aria-label":"Choose an audio file",accept:nr()?".mp3,.m4a,.ogg,.aac,.flac":"audio/*",onChange:function(){var a,c;if(1===(null===(a=u.current)||void 0===a||null===(c=a.files)||void 0===c?void 0:c.length)){l.current.disabled=!0,l.current.innerText="Analyzing...",u.current.disabled=!0,u.current.readOnly=!0,b(""),m.current&&(m.current.pause(),m.current.controls=!1);var d=u.current.files[0];(function(e){return L.apply(this,arguments)})(d).then((function(a){var c=URL.createObjectURL(d);if(null!==m.current){m.current.src=c,m.current.load();var u=i.current.resume(),l=m.current.play();void 0!==u&&void 0!==l&&Promise.all([u,l]).then((function(){})).catch((function(){window.setTimeout((function(){i.current&&m.current&&(i.current.resume(),m.current.play())}))}))}""!==e&&URL.revokeObjectURL(e),e=c,s.current.hidden=!0;var f=function(e){if(null===e)return z;if(null===e.key){var r=e.getTrackRandomInt(0,ie.length-1);return ie[r]}switch(e.key){case n.C_Major:case n.A_Minor:return W;case n.G_Major:case n.E_Minor:return X;case n.D_Major:case n.B_Minor:return H;case n.A_Major:case n.F_Sharp_Minor:return K;case n.E_Major:case n.C_Sharp_Minor:return Z;case n.B_Major:case n.G_Sharp_Minor:return Y;case n.F_Sharp_Major:case n.D_Sharp_Minor:return J;case n.D_Flat_Major:case n.B_Flat_Minor:return Q;case n.A_Flat_Major:case n.F_Minor:return $;case n.E_Flat_Major:case n.C_Minor:return ee;case n.B_Flat_Major:case n.G_Minor:return re;case n.F_Major:case n.D_Minor:return te;case n.OffKey:return ne;default:return z}}(a);r(a),t(f),o()})).catch((function(e){console.error(e),b('Error opening "'.concat(null===d||void 0===d?void 0:d.name,'":\n').concat(e.toString()))})).finally((function(){u.current&&(u.current.disabled=!1,u.current.readOnly=!1),l.current&&(l.current.disabled=!1,l.current.innerText="Choose a track"),m.current&&m.current.src&&(m.current.controls=!0)}))}}})]}),Object(de.jsx)("button",{type:"button",id:"themeCycler",className:"btn",onClick:function(){var e=function(e){var r=ie.indexOf(e);return-1===r||r===ie.length-1?ie[0]:ie[r+1]}(ce.getState().theme);t(e)},children:"Switch theme"}),Object(de.jsx)("audio",{ref:v,id:"audioPlayer",onSeeked:o}),Object(de.jsx)("div",{id:"canvas-container",children:Object(de.jsx)(a.Suspense,{fallback:null,children:Object(de.jsx)(tr,{audio:m,analyser:p})})}),!1,!1]})},or=function(e){e&&e instanceof Function&&t.e(3).then(t.bind(null,69)).then((function(r){var t=r.getCLS,n=r.getFID,a=r.getFCP,o=r.getLCP,i=r.getTTFB;t(e),n(e),a(e),o(e),i(e)}))};s.a.render(Object(de.jsx)(o.a.StrictMode,{children:Object(de.jsx)(ar,{})}),document.getElementById("root")),or()}},[[67,1,2]]]);
//# sourceMappingURL=main.71726fed.chunk.js.map