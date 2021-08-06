

console.log("hello world :o");

var info;

$.getJSON('/info/', function(body) {
  //console.log(body);
  info = body;
}).fail(function( jqxhr, textStatus, error ) {
  var err = textStatus + ", " + error;
    //console.log("Text: " + jqxhr.responseText);
  console.log( "Request Failed: " + err );
});

let answers = {};
let clicked;

$("body").on("click", (e) => {
  
  clicked = $(e.target);
  console.log(clicked);
});

$("button#start").on("click", (e) => {
  answers.id = $("input#idnumber").val();
  $("div#container").css("display", "block");
  console.log(answers);
});

$("rect.text").on("click", (e) => {
  clicked = $(e.target);
  $("body").off("keypress");
  //console.log($(e.target).attr("x"));
  $("rect.text").attr("style", "stroke:black;stroke-width:1");
  $(e.target).attr("style", "stroke:blue;stroke-width:2");
  let text = $(e.target).next().text();
  
  if (clicked.is("rect.text")) {
    console.log(clicked);
    $("body").on("keypress", (ee) => {
      console.log(ee.which);
      if (text.length > 0 && ee.which === 8) {
        text = text.slice(0, -1);
      } else if (ee.which > 64 && ee.which < 123 && ![91,92,93,94,95,96].includes(ee.which)) {
        text += String.fromCharCode(ee.which);
      }
      $(e.target).next().text(text);
      answers[e.target.id] = text;
      console.log(answers);
    });
  } else {
    $(this).off("keypress");
  }
  
  
});

$("input").on("click", (e) => {
  $("body").off("keypress");
    //$(e.target).off("keypress");
  //  $("rect.text").attr("style", "stroke:black;stroke-width:1");
});

$("input").on("change", (e) => {
  console.log(e.target);
  answers[e.target.id] = $(e.target).val();
  console.log(answers);
});

var label;
var svg = document.getElementById("svg-q2");
let notestems = [];

$("#buttons button").on("click", (e) => {
  label = e.target.id;
  if (["note2","note3", "barline"].includes(label)) {
    $("path").off("mouseenter mouseleave");
    $("path").attr("style", "");
    $("#notes").attr("style", "stroke: black; stroke-width: 1px; fill: black; fill-rule: evenodd;");
    $(svg).hover(function() {
      let url = "url(https://cdn.glitch.com/ba66e22e-49d8-46fa-abb2-cdd3790b12e6%2F"+label+".png"+(info[label] ? `?${info[label].urlend}${info[label].coord}` : ")");
      $(this).css("cursor", url + ", crosshair");
    });
  } else {
    $("path").attr("style", "");
    $("#notes").attr("style", "stroke: black; stroke-width: 1px; fill: black; fill-rule: evenodd;");
    $(svg).hover(function() {
      $(svg).css("cursor", "auto");
    });
  }
  
  if (label === "eraser") {
    $("#notes").hover(function() {
      $(this).css("cursor", "no-drop");
    });
    $("#stems").hover(function() {
      $(this).css("cursor", "no-drop");
    });
    $("#barlines").hover(function() {
      $(this).css("cursor", "no-drop");
    });
  }
  
  if (label === "select") {
    
    $("path").attr("style", "");
    $("#notes").hover(function() {
      $(this).css("cursor", "pointer");
    });
  }
  if (["stemup", "stemdown"].includes(label)) {
    $("#notes").hover(function() {
      $(this).css("cursor", "auto");
    });
  }
  
  if (["stemup", "stemdown"].includes(label) && notestems.length) {
    $("path").attr("style", "");
    $("#notes").attr("style", "stroke: black; stroke-width: 1px; fill: black; fill-rule: evenodd;");
    
    for (let i = 0; i < notestems.length; i++) {
      let x = notestems[i].x;
      let y;
      let v;
      switch (label) {
        case "stemup":
          x += 10;
          y = Math.max(...notestems[i].y);
          v = Math.min(...notestems[i].y)-y-35;
          break;
        case "stemdown":
          y = Math.min(...notestems[i].y);
          v = Math.max(...notestems[i].y)-y+35;
          break;
      }
      let element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      element.setAttributeNS(null, "d", `M ${x} ${y} v ${v}`);
      document.getElementById("stems").appendChild(element);
    }
    
    notestems = [];
  }
                        
  
});



$(svg).on("click", (e) => {
  if (["note2","note3"].includes(label) && $(e.target).is("rect")) {
    let y = Math.ceil(Number($(e.target).attr("y"))/5)*5;
    if (label === "note2") y+=3.5;
    console.log(y);
    let element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    element.setAttributeNS(null, "d", `M ${Number($(e.target).attr("x"))+12} ${y} ${info[label].path}`);
    let notes = document.getElementById("notes");
    notes.appendChild(element);
  } else if (label === "eraser" && $(e.target).is("path")) {
    console.log($(e.target).parent().attr("id"));
    let notes = document.getElementById($(e.target).parent().attr("id"));
    notes.removeChild(e.target);
  } else if (label === "barline" && $(e.target).is("rect")) {
    let element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    element.setAttributeNS(null, "d", `M ${Number($(e.target).attr("x"))+17} 80 v 120`);
    document.getElementById("barlines").appendChild(element);
  } else if (label === "select" && $(e.target).parent().attr("id") === "notes") {
    $(e.target).attr("style", "fill:blue; stroke:blue");
    let arr = $(e.target).attr("d").split(" ");
    let x = Number(arr[1]);
    let i = notestems.findIndex(o => o.x === x);
    if (i > -1) {
      notestems[i].y.push(Number(arr[2])-3.5);
    } else {
      notestems.push({x: x, y: [Number(arr[2])-3.5]});
    }
    console.log(notestems);
  }
});