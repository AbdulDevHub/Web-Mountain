export const hideScrollbar = `
javascript: (function () {
  var css = document.createElement("style");
  css.type = "text/css";
  css.id = "hideScroll";
  if (!document.getElementById("hideScroll")) {
    css.appendChild(
      document.createTextNode("::-webkit-scrollbar { display: none; }")
    );
    document.getElementsByTagName("head")[0].appendChild(css);
  } else {
    document.getElementById("hideScroll").remove();
  }
})();
`
