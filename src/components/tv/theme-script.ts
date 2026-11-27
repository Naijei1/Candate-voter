export const LIGHT_BAR = "#FFFFFF";
export const DARK_BAR = "#0B1628";

/** Runs before paint so the first frame uses the saved or system theme. Kept out of "use client" modules so the server layout gets the text. */
export const THEME_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get('theme');if(q==='dark'||q==='light'){localStorage.setItem('tv-theme',q)}var t=q||localStorage.getItem('tv-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;var m=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<m.length;i++){m[i].content=t==='dark'?'${DARK_BAR}':'${LIGHT_BAR}';m[i].removeAttribute('media')}}catch(e){}})();`;
