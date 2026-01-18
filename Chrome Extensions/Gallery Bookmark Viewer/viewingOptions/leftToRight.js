export const leftToRight = `
javascript: if (
  window.location.href.includes(".jpg") |
  window.location.href.includes(".jpeg") |
  window.location.href.includes(".gif") |
  window.location.href.includes(".GIF") |
  window.location.href.includes(".webp") |
  window.location.href.includes(".png") |
  window.location.href.includes(".bmp")
) {
  window.open(
    window.location.href.split(window.location.href.split("/").reverse()[0])[0],
    "_self"
  );
}
function main(callBack) {
  var html = "";
  if (typeof title == "undefined") {
    var title = document
      .getElementsByTagName("h1")[0]
      .innerHTML.split(":")[1]
      .split(document.getElementsByTagName("h1")[0].innerHTML.slice(11, 12))
      .reverse()[1];
  }
  for (var i = 0; i < document.getElementsByTagName("a").length; i++) {
    var item = document.getElementsByTagName("a")[i].getAttribute("href");
    if (
      !item.includes(".jpg") &
      !item.includes(".jpeg") &
      !item.includes(".gif") &
      !item.includes(".GIF") &
      !item.includes(".webp") &
      !item.includes(".png") &
      !item.includes(".bmp")
    ) {
    } else {
      html +=
        '<span ><img style="height:731px" src="' +
        document.getElementsByTagName("a")[i].getAttribute("href") +
        '"><span style="zoom:1%">' +
        document
          .getElementsByTagName("a")
          [i].getAttribute("href")
          .split("/")
          .reverse()[0] +
        "</span></span>";
    }
  }
  html =
    "<head><title>" +
    title +
    '</title> <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script> </head><body style="background-color:#33343a; white-space: nowrap; overflow-x: auto; line-height: 0;" align="left"><br>' +
    html +
    "</body>";
  document.write(html);
  setTimeout(function () {
    callBack();
  }, 900);
}
main(function () {
  var s = 1;
  $(
    '<div id="adj" style="position: fixed;right: 50px;top:2%;width: 15%;z-index: 999"><input id="zoom" type="range" min="50" max="130" value="100" class="slider" id="myRange"></div>'
  )
    .appendTo("body")
    .mousemove(() => {
      $("img").css("zoom", $("#zoom").val() + "%");
    });
  $('img[src="LOCATION"]').parent().remove();
  $(
    '<div id="adj" class="fullscr" style="background-color: white;border-radius: 5px; position: fixed;right: 20px;top:10px;width: 15%;z-index: 999;width:30px;height: 30px;border:1px #DCDCDC solid;cursor: pointer;color:black;font-weight:bold;line-height: 1.5rem;">⤢</div>'
  )
    .appendTo("body")
    .click(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.webkitRequestFullscreen();
      }
    })
    .hover(
      function () {
        $(this).css("opacity", 0.3);
      },
      function () {
        $(this).css("opacity", 1);
      }
    );
  $('<div class="btn btn-primary">Back To Directory</div>')
    .click(() => {
      window.open(
        window.location.href.split(
          window.location.href.split("/").reverse()[1]
        )[0],
        "_self"
      );
    })
    .css({ margin: "30px" })
    .insertAfter($("img").last());
  $(
    '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">'
  ).appendTo("head");
  $("div,h2").attr("align", "middle");
  $("body")
    .css(
      "width",
      parseInt($("img").css("width")) * parseInt($("img").length) * 0
    )
    .css("height", $("img").css("height"));
  $(
    '<div title="Close this tab" id="scr0"style="left:0;background-color:blue;opacity:0;width:5px;height:100%;position:fixed;display:block">dd</div>'
  )
    .prependTo("body")
    .click(function () {
      var cus = open(" ", "_self", " ");
      cus.close();
      document.title = "d";
    });
});
`