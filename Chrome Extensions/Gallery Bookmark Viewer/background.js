// Doesn't let me import, so have to manually add them
// import { hideScrollbar } from "./viewingOptions/hideScrollbar"
// import { leftToRight } from "./viewingOptions/leftToRight"
// import { rightToLeft } from "./viewingOptions/rightToLeft"
// import { vertical } from "./viewingOptions/vertical"

function createBookmark(title, url) {
  chrome.bookmarks.create({
    parentId: "2", // This Adds It To "All Bookmarks"
    title: title,
    url: url,
  })
}

chrome.runtime.onInstalled.addListener(function (details) {
  const reason = details.reason

  if (reason == "install") {
    // Not Recognized: ⬇️ & ⬅️
    createBookmark("📥 Vertical", vertical)
    createBookmark("➡️ Horizontal", leftToRight)
    createBookmark("⬅️ Horizontal", rightToLeft)
    createBookmark("🚫 Hide Scrollbar", hideScrollbar)
  }
})

chrome.action.onClicked.addListener((tab) => {
  // Not Recognized: ⬇️ & ⬅️
  createBookmark("📥 Vertical", vertical)
  createBookmark("➡️ Horizontal", leftToRight)
  createBookmark("⬅️ Horizontal", rightToLeft)
  createBookmark("🚫 Hide Scrollbar", hideScrollbar)
})

// ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■

const vertical = `
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
        '<div><img style="width:60%" src="' +
        document.getElementsByTagName("a")[i].getAttribute("href") +
        '">' +
        document
          .getElementsByTagName("a")
          [i].getAttribute("href")
          .split("/")
          .reverse()[0] +
        "</div>";
    }
  }
  html =
    "<head><title>" +
    title +
    '</title> <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script> </head><body style="overflow-x:hidden;background-color:#33343a" align="middle">' +
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
    '<div title="zoom" id="adj" style="position: fixed;right: 2px;top:2%;width: 15%;z-index: 999"><input id="zoom" type="range" min="5" max="100" value="60" class="slider" id="myRange"></div>'
  )
    .appendTo("body")
    .mousemove(() => {
      $("body>div>img").css("width", $("#zoom").val() + "%");
    });
  $(
    '<div id="adj" title="speed" style="position: fixed;right: 2px;top:5%;width: 15%;z-index: 999"><input id="scl" type="range" min="1" max="10" value="1" class="slider" id="myRange"></div>'
  ).appendTo("body");
  $('img[src="LOCATION"]').parent().remove();
  $(
    '<div id="adj" class="fullscr" style="background-color: white;border-radius: 5px; position: fixed;right: 20px;top:10px;width: 15%;z-index: 999;width:30px;height: 30px;border:1px #DCDCDC solid;cursor: pointer;color:black;font-weight:bold;">⤢</div>'
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
  $('<div><div class="btn btn-primary">Back To Directory</div></div>')
    .click(() => {
      window.open(
        window.location.href.split(
          window.location.href.split("/").reverse()[1]
        )[0],
        "_self"
      );
    })
    .css({ margin: "30px" })
    .appendTo("body");
  $(
    '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css"         integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">'
  ).appendTo("head");
  $("div,h2").attr("align", "middle");
  $(
    '<div title="Close this tab" id="scr0"style="left:0;background-color:blue;opacity:0;width:5px;height:100%;position:fixed;display:block">dd</div>'
  )
    .prependTo("body")
    .click(function () {
      var cus = open(" ", "_self", " ");
      cus.close();
      document.title = "d";
    });
  $(
    '<div id="scrl"style="right:0%;background-color:green;opacity:0;width:120px;height:100%;position:fixed;display:block">.</div>'
  )
    .prependTo("body")
    .hover(
      function () {
        $("html, body").animate({ scrollTop: $("body").scrollTop() + 0 }, 0);
      },
      function () {
        $("html, body").animate({ scrollTop: $("body").scrollTop() + 0 }, 0);
      }
    );
  $(
    '<div id="scrl2"style="right:0%;background-color:orange;z-index:99;opacity:0;width:100px;height:100%;position:fixed;display:block">dd</div>'
  )
    .mousedown(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.webkitRequestFullscreen();
      }
    })
    .prependTo("body")
    .hover(
      function () {
        $("#scrl").trigger("mouseenter");
        for (let i in [...Array(parseInt($("#scl").val()))]) {
          $("html, body").animate(
            { scrollTop: $("body").scrollTop() + 0.05 },
            0
          );
        }
        $(this).css("width", "20px");
      },
      function () {
        $("html, body").animate(
          { scrollTop: $("body").scrollTop() + parseFloat($("#scl").val()) },
          0
        );
        $("html, body").animate(
          { scrollTop: $("body").scrollTop() + parseFloat($("#scl").val()) },
          0
        );
        $("html, body").animate(
          { scrollTop: $("body").scrollTop() + parseFloat($("#scl").val()) },
          0
        );
        $(this).css("width", "100px");
      }
    );
});
$(
  "<div style='zoom:250%'><button id='btn1' type='button'>go down 100</button></div>"
).prependTo(document.body);
$(
  "<div style='zoom:250%'><button id='btn2' type='button'>go down 170</button></div>"
).prependTo(document.body);
$(
  "<div style='zoom:250%'><button id='btnFull' type='button'>full screen</button></div>"
).prependTo(document.body);
$(
  "<div style='zoom:550%'><button id='btnClose' type='button'>close</button></div>"
).appendTo(document.body);
$("#btn1").on("click", function () {
  $("html, body").animate({ scrollTop: $(document).height() }, 99000);
});
$("#btn2").on("click", function () {
  $("html, body").animate({ scrollTop: $("body").scrollTop() + 180 }, 17);
});
$("#btnFull").on("click", function () {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.webkitRequestFullscreen();
  }
});
$("#btnClose").on("click", function () {
  var customWindow = window.open(". ", "_self", "");
  customWindow.close();
});
function cb() {
  $(
    '<div id="scrl"style="right:5%;background-color:green;opacity:0;width:70px;height:100%;position:fixed;display:block">.</div>'
  )
    .prependTo("body")
    .hover(
      function () {
        $("#scrl").css("width", "90px");
        $("html, body").animate({ scrollTop: $("body").scrollTop() + 180 }, 17);
      },
      function () {
        $("#scrl").css("width", "70px");
        $("html, body").animate({ scrollTop: $("body").scrollTop() + 180 }, 17);
      }
    );
}
`
// ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
const leftToRight = `
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
// ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
const rightToLeft = `
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
  for (var i = document.getElementsByTagName("a").length - 1; i > -1; i--) {
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
    .insertBefore($("img").first());
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
  $("html, body").animate(
    { scrollLeft: $("span>img").last().offset().left },
    0
  );
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
// ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
const hideScrollbar = `
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
