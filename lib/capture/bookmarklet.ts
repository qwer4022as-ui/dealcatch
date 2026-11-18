// 북마클릿 소스. 사용자가 보고 있는 무신사 상품 페이지 1개에서, 사용자가 버튼을 눌렀을 때만 실행된다.
// 페이지에 이미 들어 있는 공개 meta 태그(검색엔진·공유 미리보기용)와 페이지 데이터(__NEXT_DATA__)의
// 품번(styleNo)·옵션 이름·옵션 추가금만 읽고, 네트워크 요청은 보내지 않는다.
// 품번은 상세 정보 항목(goodsNo 일치)에, 옵션은 별도 옵션 항목(optionItems[].goodsNo 일치)에 들어 있다.
// 색상이 선택 옵션이 아니면 optionItems[].colors[].colorCode 를 페이지의 colorImages 표(colorId → colorName)로 이름을 찾는다.
// 읽은 값은 이 앱의 /capture#d=... 로 새 탭에서 연다 (해시는 서버로 전송되지 않음).
// docs/platform-reviews/musinsa.md §6

/** __APP__ 자리에 앱 주소(JSON 문자열)가 들어간다. 브라우저 호환을 위해 ES5 문법만 쓴다. */
export const BOOKMARKLET_SOURCE = `(function(){
var APP=__APP__;
if(!/(^|\\.)musinsa\\.com$/.test(location.hostname)){alert("무신사 상품 페이지에서 눌러 주세요.");return;}
function m(p){var e=document.querySelector('meta[property="'+p+'"]');return e?(e.getAttribute("content")||""):"";}
var brand=m("product:brand").trim();
var name=m("og:title").replace(/\\s*-\\s*사이즈\\s*&\\s*후기[\\s\\S]*$/,"").replace(/\\s*\\|\\s*무신사[\\s\\S]*$/,"").trim();
if(brand&&name.indexOf(brand)===0){name=name.slice(brand.length).replace(/^\\s*\\([^)]*\\)\\s*/,"").trim();}
var url=m("og:url")||location.href,gid=(url.match(/\\/products\\/(\\d+)/)||[])[1],g=null;
var its=[],cmap={};
try{var nd=document.getElementById("__NEXT_DATA__"),qs=JSON.parse(nd.textContent).props.pageProps.dehydratedState.queries;for(var q=0;q<qs.length;q++){var x=qs[q]&&qs[q].state&&qs[q].state.data&&qs[q].state.data.data;if(!x)continue;if(!g&&String(x.goodsNo)===gid)g=x;if(x.colorImages instanceof Array){for(var c=0;c<x.colorImages.length;c++){var ci=x.colorImages[c];if(ci&&ci.colorId!=null&&typeof ci.colorName==="string")cmap[String(ci.colorId)]=ci.colorName.trim();}}if(!its.length&&x.optionItems instanceof Array){for(var z=0;z<x.optionItems.length;z++){if(x.optionItems[z]&&String(x.optionItems[z].goodsNo)===gid)its.push(x.optionItems[z]);}}}}catch(err){g=null;its=[];cmap={};}
var d={v:1,url:url,name:name,brand:brand,modelNo:g&&typeof g.styleNo==="string"?g.styleNo:"",salePrice:m("product:price:amount"),listPrice:m("product:price:normal_price"),options:[]};
for(var k=0;k<its.length&&d.options.length<50;k++){var it=its[k];if(!it||it.isDeleted||!(it.optionValues instanceof Array))continue;var col="",rest=[];for(var j=0;j<it.optionValues.length;j++){var ov=it.optionValues[j]||{},nm=typeof ov.name==="string"?ov.name.trim():"";if(!nm)continue;if(!col&&/색상|컬러|색|colou?r/i.test(ov.optionName||""))col=nm;else rest.push(nm);}if(!col&&it.colors instanceof Array&&it.colors[0]&&cmap[String(it.colors[0].colorCode)])col=cmap[String(it.colors[0].colorCode)];var sz=rest.join(" ");if(!col&&!sz)continue;d.options.push({label:col?(sz?col+" / "+sz:col+" /"):sz,soldOut:null,extraPrice:typeof it.price==="number"?it.price:null});}
if(!d.salePrice){alert("가격 정보를 찾지 못했습니다. 상품 상세 페이지인지 확인해 주세요.");return;}
var b=new TextEncoder().encode(JSON.stringify(d)),s="";for(var i=0;i<b.length;i++){s+=String.fromCharCode(b[i]);}
var enc=btoa(s).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
window.open(APP+"/capture#d="+enc,"_blank","noopener");
})();`;

const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/i;

/** 앱 주소를 넣은 실행 코드. 주소 형식이 이상하면 거부한다 (Host 헤더 조작 대비) */
export function buildBookmarkletCode(appOrigin: string): string {
  if (!ORIGIN_RE.test(appOrigin)) throw new Error(`앱 주소 형식이 올바르지 않습니다: ${appOrigin}`);
  return BOOKMARKLET_SOURCE.replace("__APP__", JSON.stringify(appOrigin)).replace(/\n/g, "");
}

/** 즐겨찾기에 넣을 javascript: 주소 */
export function buildBookmarkletHref(appOrigin: string): string {
  return `javascript:${encodeURIComponent(buildBookmarkletCode(appOrigin))}`;
}
