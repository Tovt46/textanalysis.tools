// A saved presentation preference is applied before the first paint.
export default function ThemeInit(){
  return <script dangerouslySetInnerHTML={{__html:'try{document.documentElement.dataset.theme=localStorage.getItem("textanalysis-theme-v1")==="light"?"light":"dark"}catch{document.documentElement.dataset.theme="dark"}'}}/>;
}
