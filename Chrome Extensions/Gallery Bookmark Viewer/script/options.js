window.addEventListener("load", (event) => {
  //$('body').remove()
  $("head").append(
    '<style type="text/css">' +
      "@font-face {\n" +
      "\tfont-family: 'JP_EN__Senobi-Gothic-Regular';\n" +
      "\tsrc: url('" +
      chrome.extension.getURL("fonts/JP_EN__Senobi-Gothic-Regular.ttf") +
      '\')format("truetype");\n' +
      "}\n" +
      "@font-face {\n" +
      "\tfont-family: 'JP_EN__OtsutomeFont_Ver2';\n" +
      "\tsrc: url('" +
      chrome.extension.getURL("fonts/JP_EN__OtsutomeFont_Ver2.ttf") +
      '\')format("truetype");\n' +
      "}\n" +
      "@font-face {\n" +
      "\tfont-family: 'JP_EN__komorebi-gothic';\n" +
      "\tsrc: url('" +
      chrome.extension.getURL("fonts/JP_EN__komorebi-gothic.ttf") +
      '\')format("truetype");\n' +
      "}\n"
  )

  $(
    '<div title="Click to close this tab" id="scr0"style="left:0;background-color:blue;opacity:0.3;width:5px;height:100%;position:fixed;display:block"></div>'
  )
    .prependTo("body")
    .click(() => {
      var customWindow = window.open(" ", "_self", "")
      customWindow.close()
    })

  var lang = chrome.i18n.getUILanguage()
  //open(chrome.runtime.getURL('script/album.html'),'_blank')
  $("#gallery")
    .hover(
      (e) => {
        $(e.currentTarget).css("opacity", "0.6")
      },
      (e) => {
        $(e.currentTarget).css("opacity", "1")
      }
    )
    .click(() => {
      open(chrome.runtime.getURL("script/album.html"), "_self")
    })

  function new_search({
    title: title,
    url: url,
    img: img,
    url2: url2 = "",
    size = "35",
  }) {
    $(`<div id="item"style="box-shadow: 10px 10px 25px -8px rgba(0,3,20,1);
        display:inline-block;border-radius:5px;background-color:white;"
        href="${url}">
      <img  title="${title}" alt="${title}"
      style="display:inline-block;margin:0 auto;height:${size}px;width:${size}px;z-index:99;"
        src="${img}"><div>`)
      .appendTo("#banner")
      .hover(
        function () {
          $(this).css("border", "3px solid orange")
        },
        function () {
          $(this).css("border", "")
        }
      )
      .click(function () {
        //document.title=$(this).attr('href')
        if ($(this).css("opacity") == "1") {
          $(this).css("opacity", 0.2).attr("class", "off")
        } else {
          $(this).css("opacity", 1).attr("class", "on")
        }
      })
  }

  $("#twiview").hover(
    () => {
      $(`<img id="pop" style="left:28%;top:7%;overflow:hidden;display:none;border-radius:6px;position:absolute;zoom:80%;border:1px white solid" 
              src="https://lh3.googleusercontent.com/-thwJD3tbvvoZzp7n8T78qfjRNLPQBrDMkWxg7LFhOy5y-PkUD4ZOpb3FyFMAugWO3iQswDhpemhdbDP0RoY_AScRSbRZTcSkZkLQS2_emL2Y6C3vXoo4NlWx0wEbDT6ltvrjFChwvJGBosHqV2TFJq5S1lFTozt3NnW_doHXyWGh_VB56qH1vxKI-Pvfo-UpauaaP5ESkZxRfD5FwSHwWOkECg4gyzDJ00baH6LvttYhvo0Jxaz7ImWqol7peDqe8B5olFycd60gBbzrWxWt0OFZZvtoZ9mKk87uQUsAK25yW13Fo5oEMPpgGLsEbNgb0abWj-_6pTE_ZkfQ77rSC2hy3CUd1oHJhkzzzfPP2wdir34qFRuZYikLR8aFEg02gJr6sf4--5RSwXcj8dPz4A4vUVZFQUYm1pPowd7FpXFG-IcLKsjjNXY-IW7L_AS0DdY6_Axl4Q0-f3110zT14RVkRnzG4-NZfQT3zMcULC9izT6hutJqB0j2I8uYoPlLh3xQsXT_Gea2XSEVVPX8BIfyT-rpuytLNamN-alj1hrJyc3FN0QDPy_E4IyK-cACH_RnND1_3BO881MV78qkuW19yl4FDPnLoZ_Ivb46r5z_8Iol9npOuOzdT09K4i-VRWueiLvJBVvY2oBl73m9aL96M2iDoEmP5luE0lBXdcoHLGDrJP8rtk=w600-h286-no">`)
        .appendTo("body")
        .fadeIn(150)
    },
    () => {
      $("body>#pop").fadeOut(50)
    }
  )
  $("#vivigrid").hover(
    () => {
      $(`<img id="pop" style="left:28%;top:7%;overflow:hidden;display:none;border-radius:6px;position:absolute;zoom:80%;border:1px white solid" 
              src="https://lh3.googleusercontent.com/v3AyciWnAPYieQSYlevfL2Ou2eTuBj39pEHohRPhr8HlqSo9GnxdbCsV1cZNpVSeK-c6A5OQZikMm2mMXsH6sf3BpOroDd4aELPNHkmCsQKsUlTS2Um0YCz2nLXnICbbn3zvdDN0fuwYFe40cfG8CEnSgSHRyHbJ7VkIegwxn3MvNLtOARmyiBWuhaf6AQ1h1BsSoZYrwHTy8XlTWRRl-kkgrqBBb-fomCzoTeTYqyVE_1T75Q_6LeG9ZcOCkMaevBG9NA6FCs_5n4b456wFiB8sf_8GBz8o9OaV7WtYuNzy37pfRnO2peKZmFFouM0IHZDYVfQIQb3mAhl2vUVpN4wFIx8g13AGZYwdSTVKBh0wR-QRSyvC7KHnIfp18PZLgSexkzVcSgzRhfpgFgzS-apGWpZOFj5Y4VvZn2GLtPNa5X_LqG-B0knXqvfD8Zu23EoM7m9u0KzMYm2HldCBVj-bE89bVOzteCU7EeYPi7opzvN8wJY3zSsgs828j5Va7Hz49f3saV8BvTyiH3DEMBpeDWISEungMziHK7BFSEfn3Tei6QXmdqz91eVKcFXdzeyvUd5MLLzjJgJXUd353nNKtqyh6ct1yTYCOaHNz5AP9rzO0_EibjmG00cRcSEvcyBdfnzujvkwE7XfGNulNCjujYcu7tW2fOoqsWsfh35TuZJHtZV8WRs=w576-h287-no">`)
        .appendTo("body")
        .fadeIn(150)
    },
    () => {
      $("body>#pop").fadeOut(50)
    }
  )
  $("#gogetme").hover(
    () => {
      $(`<img id="pop" style="left:28%;top:7%;width:650px;overflow:hidden;display:none;border-radius:6px;position:absolute;zoom:80%;border:1px white solid" 
              src="https://lh3.googleusercontent.com/qF9CTmlXahihS1AuDlo85YwV3Y-oGEmG4m6RgzM4g8CP-wzH6aMBd9zF2926V7TJt84I-AWZ4Hjo9BTH01jQW1LLbO0sj2MWxkK1h5EYMIzLavNLhJbdKIPS6mtL5AVsMYG-Fcu2paHyB-b8KOjKtN__Q1rAU-gnwaN34wmaE77fIvyxjwGX4bMi3z78S030a31XeUIsFpd0TsuW7XLFGaPRsLRV-MY4xd-6fOIvAnDAcp9ndTicLR0aCPNZi2V1yBw4MfUEsuzLNxQGzcjzhKhIcrp5coDb_EUbLF0IPIigUk_01MbtWYhTUTVOyAg5g6c8C6ECKnIKTuuWSZg-8ashk0cB7jntGzvhX3zMBz83P46oL7PvL1OV7IiSPuGWUbiSzuQFlHQzpmjgKK6HOv1tPn5hRkde47NtRi5OH31glEV2zwaI0ulaJwblQRdKo2xxFYKm2GdLr1b7Jsc0LVmymSQbUAnp59THBIzFrq6WSTjnmH5XrXB6_uA4eC_NtUKqTzg2QfEHU1Y5ZXR87GdFsfL2IeNW0HmbsxuwGEx2zcu-9eRiyyhazGieT8R2uw_5_fB0_PyA-AQ77QpdFGQUfbeogCiiV0BxiCjoFSyyuCzpQVuYhLk3i0hvT7eQTvOYWQPsR-nH4Aai8MarxbcGG20dxfPdy1Q6Y9y956NCx0v2mTXfrNg=w600-h314-no">`)
        .appendTo("body")
        .fadeIn(150)
    },
    () => {
      $("body>#pop").fadeOut(50)
    }
  )
  $("#tubetube").hover(
    () => {
      $(`<img id="pop" style="left:28%;top:7%;overflow:hidden;display:none;border-radius:6px;position:absolute;zoom:80%;border:1px white solid" 
              src="https://lh3.googleusercontent.com/4pewtuyybNJbYLr0Vr-F70SW_kpMFdXNbaLNeYOUZCzds4pEaQ5rxcYd5nTEVR7678xeabr2vbCWhYmDAFnYrV-bWizNAuHwVDD_8_7Pqu9UkGwO96e79kEJt7A6eXCJtiXFyQmraBZLthn3lvKErR3Pjrz6P9_bOxjNYgmB664-u5ZZn5tnk0h0NdXPQlRPnr3y5_Mt4hIZzylFn4V86o4mb0sEOi49Q67kXFDvow_swE1uglP_7WU76vK8Gj7nZzKlZq1rDKv2GCdmc8zd_QP8pkWJcWaTT2fwXn-r1QY1AQ6IvGJL4R2KjyMA2ISJ0eV65Duh8N6P4kTzI4H6I2PT_TXIkaYJbg99DLcDIDKvbPubE-o3VpQPN3xrao6k6o3qfw_D8Gubz_0cBEFq1NImOG__4lMN5YWmac9F7P0S0CJpzjTi4DNdynxi6sw1n_Az57vacOWyvpMkHaHz80NL2ncKTKMB-PUg5TMJFXsAQNl7WpEsYqK6Sm8dgogkUjgjI8I2H2zWFtof7-h_7jgV5vV_irKfVc8K9oUFf1JUXHULR4cJIdIIlU6oRDjvMgfkBEbPX1kwqs6f7gHSgE-JTbsd81Z4_DVNMdmhOwynOGOaBFMVioT5UAIJxwfg0IRWGNSbjikGqDtYN1XTGQRyHGv15YczZDuWafcZvaceR0BwipNAG_k=w600-h338-no">`)
        .appendTo("body")
        .fadeIn(150)
    },
    () => {
      $("body>#pop").fadeOut(50)
    }
  )
  $("#manga").hover(
    () => {
      $(`<img id="pop" style="left:28%;top:7%;overflow:hidden;display:none;border-radius:6px;position:absolute;zoom:80%;border:1px white solid" 
              src="https://lh3.googleusercontent.com/tb6Ng4CHW9qUfRkXOP4DbH4TMN-X8eQiigmSQXkVUsGoF23dY9Q4DYsCrT8n5U2CGnNgNLqAkxbQrvjLCS9hjHQ-xVvEps31jTguE5vXSwAcUvwXOnD38YkY5VHFBhoJSIu3AX6JPNaQVMc7QOT-33ewYsFMHixJORvGDEpyP0DAXkEwl_C4BAIezWirqMfYHtlVIxMm_IORHD-I6Lz9OkM9zgyrSmbwfIaBXjoRR-YOLkcJarFQaH8pbojddKtyYk4maeeu5NcVdSJvTJIvVGj7FWzNXmdbAJYuyea-A9V5SgR05n_WGOyKbqbq6Z4hBIuKlpWA3-BKaG1Cl2Sh-9mrXMwTus29Q0admkaMca70fV0M1zvZN-QyWUYvc9FHFEfwtH-1YFFJ0nykkXAaU4fN0f4vSoWOTuLcWwGY8RS6EUMih_UzuBa6Bh2b0u30SG8wYQQ_j1nUBxKfeF0Wwkrd7PHGl2bcPTlC1wppho2xdh71AHgMi0vj3GKKWpVzN3rYzokyqHHjh0uRJ0DtxCu1dqLJlXxl3UJyN8tYA7SSqnZw3z3CjwUJhQ2qnYhNV_py08_V2n4hestJUGZ19XIQBEMwudOu_Uex-osz5ij7c8PdQM4NtUxJ4XrqKQvJhH_qVe9KFfQOt8LdcuYpa0iZHec8x-2ykQMXx1dufV994mtm85axCo8=w600-h338-no">`)
        .appendTo("body")
        .fadeIn(150)
    },
    () => {
      $("body>#pop").fadeOut(50)
    }
  )
  $("#memory").hover(
    () => {
      $(`<img id="pop" style="left:28%;top:7%;overflow:hidden;display:none;border-radius:6px;position:absolute;zoom:80%;border:1px white solid" 
              src="https://lh3.googleusercontent.com/HPoSesRd5lxMSTCJF3x3VezOszsshiA9AqVKh3dEWy6Bv-y8pbs6hoByczRds8VUbTZ7rNqj5oeanvd_Mw81soZIkQbVj_zLJB5Ito0nLTOvxcBql8AjC3Gq6yg4Rjd4nayGHIugEkEPFH9nwf7J3R-9VYX7y2C5lCn34uWVIbUDpT3ZQEZ8srVCr4fHxNqaqpgzDFF-QljBTbh-gD3lIPiOCLZtjSLeW0OQSS-rqLjEmcx9__Ba6-OxFKYJHuoyepDKrbEyrXtNOY6EouwImbm1M_ybOkSZ4ymdAewwlk9lfGB4WNUqW3055TP-WHvD2QLCCYeOuZHCjLFTSU9NbF1aNRsjj5Dp3wqaGW0XSYByRcse_LR_NKUa1TFfAqE4xDduNw8f3OyCgm-qjKmfYsPoO7TqNXBNde_FhSbWcCX3nCvjyJvrY6AT0qp_O3-NiA29FrsHFo_-dDbF1_cjujgxD15ISLiNoX9lyQdvH8F39bpivA6ehySPh3fGxdiaf1PDJunOV3IQmxjfbwpWpYrs2vubgmn1TlZLZiwxk0g96Oh7_hR2ioYuY5IMjbU0yyUU0MltnYmmujjQDsctEMqA1HQRYJpeGOUHjAoD9EzqPaXza3hL_Yy2GbQvYAacanVacRC2eFSlZhPr6Har7pzdf5cn8JrSk7LcEghBL6tDE4nv9jU9fco=w600-h364-no">`)
        .appendTo("body")
        .fadeIn(150)
    },
    () => {
      $("body>#pop").fadeOut(50)
    }
  )

  $("#dog")
    .hover(
      (e) => {
        $(e.currentTarget).css("opacity", "0.6")
      },
      (e) => {
        $(e.currentTarget).css("opacity", "1")
      }
    )
    .click((e) => {
      $("tbody").first().fadeOut(100).fadeIn(100)
      $(e.currentTarget).attr(
        "src",
        $(e.currentTarget).attr("src").slice(0, -5) +
          ((parseInt($(e.currentTarget).attr("src").slice(-5, -4)) + 1) % 6) +
          ".gif"
      )

      $("#name,#url_1").val(
        "Corgi! " + $(e.currentTarget).attr("src").slice(-5, -4)
      )
      $("#url_icon").val(chrome.runtime.getURL($(e.currentTarget).attr("src")))
    })

  $(".links").hover(
    (e) => {
      $(e.currentTarget).css("opacity", "1")
    },
    (e) => {
      $(e.currentTarget).css("opacity", "0.8")
    }
  )

  chrome.storage.sync.get(["twiview_onoff"], function (result) {
    if (typeof result.twiview_onoff == "undefined") {
      chrome.storage.sync.set({ twiview_onoff: 1 })
    } else {
      if (result.twiview_onoff == 0) {
        $("#onoff").trigger("click")
      }
    }
  })

  $("#onoff").click(function () {
    if ($(this).text().includes("ON")) {
      $(this).css("background-color", "#bf0835").animate({ width: "120%" }, 300)
      chrome.storage.sync.set({ twiview_onoff: 0 })
      $(this).text("OFF")
    } else if ($(this).text().includes("OFF")) {
      $(this).css("background-color", "#52eb34").animate({ width: "205%" }, 300)
      chrome.storage.sync.set({ twiview_onoff: 1 })
      $(this).text("ON")
    }
  })

  // end--------
})
