var mantle_win;
if (parent) {
  mantle_win = parent;
}
if (window.opener) {
  if (window.opener.parent) mantle_win = window.opener.parent;
  else mantle_win = window.opener;
}

var active_theme = mantle_win.active_theme;
var core_theme_tree = mantle_win.core_theme_tree;
var module_theme_tree = mantle_win.module_theme_tree;
var CONTEXT_PATH = mantle_win.CONTEXT_PATH;

var muiCssDir = "../mui/css/";
var muiImgDir = "../mui/images/";
var cssDir = "../css/";

var themeScript = document.createElement("script");
themeScript.setAttribute("src", "../../../../js/themeResources.js");
document.getElementsByTagName("HEAD")[0].appendChild(themeScript);

