// client-side js, loaded by index.html
// run by the browser each time the page is loaded
var systems = [];
var xml;
var label;
var current;
var reset;
var info;
var staff;
var syswidth = 400;
var ongoingtouches = [];
var notestems = [];
var currenttouch;
var noteheadlock = true;
var historyy = [];
var numbeams = 1;
var hasbeam;

$('#dialogUnderlay,div.dialog').hide();

$(function() {
  console.log("hello world :o");
  
  systems = [
    {
      width: 400,
      staves: [
        {
          x: 1,
          centerline: 100,
          things: [],
          notes: []
        }
      ],
      barlines: []
    }
  ];
  xml = $.parseXML(`<score><scoreDef>
    <staffGrp>
        <staffDef n="1" lines="5" centerline="100"></staffDef>
    </staffGrp>
</scoreDef>
<section>
  <measure n="1">
    <staff n="1" >
      <layer></layer>
    </staff>
  </measure>
</section></score>`);
  
  var svg = document.getElementsByClassName('system');
  
  $(".system").svg({onLoad: (o) => {
    staff = o;
  }});
  
  //console.log($('h1').prop("tagName").toLowerCase());

  $.getJSON('/info/', function(body) {
        //console.log(body);
        info = body;
      }).fail(function( jqxhr, textStatus, error ) {
      var err = textStatus + ", " + error;
        //console.log("Text: " + jqxhr.responseText);
      console.log( "Request Failed: " + err );
      });

  
  window.onerror = function(msg, src, lineno, colno, error) {
    let message = [
      "Message: " + msg,
      
      "Line: " + lineno,
      "Column: " + colno
    ];
    alert("Sorry, there was an error! If you are not Alison, you might send her the below information:\n" + message.join("\n"));
    return true;
  }

  //save svg file
  $("#btnSave").on("click", () => {
    let file = `<svg width="${syswidth+100}" xmlns="http://www.w3.org/2000/svg">`;
    for (let i = 0; i < systems.length; i++) {
      file += stringify($("#system"+i));
    }
    file += `
    </svg>`;
    
    downloadToFile(file, 'staff-notation.svg', 'text/plain');
  });
  
  $("#noteheadlock").on("click", () => {
    noteheadlock = !noteheadlock;
    let text = "Notehead lock " + (noteheadlock ? "on" : "off");
    $("#noteheadlock").text(text);
  });
  
  //add/remove systems
  $("#numsystems").on("change", numsystems);
  
  //add/remove staves (applies to each system)
  $("#numstaves").on("change", (e) => {
    let num = Number($("#numstaves").val());
    if (num > systems[0].staves.length) {
      $(".barlines > g").remove();
      for (let n = systems[0].staves.length+1; n <= num; n++) {
        xml.find("staffGrp").append(`<staffDef n="${n}" lines="5" centerline="${n*100}" ></staffDef>`);
      }
      systems.forEach((sys,j) => {
        $("#system"+j).attr("height", (num+1)*100);
        for (let i = sys.staves.length; i < num; i++) {
          let centerline = sys.staves[i-1].centerline + 100;
          for (let n = 0; n < 5; n++) {
            staff.rect($("#system"+j+" .stafflines"), 1, centerline-21+n*10, sys.width, 3);
          }
          sys.staves.push({x: 1, centerline: centerline, things: [], notes: []});
          xml.find('measure[n="'+(j+1)+'"]').append(`<staff n="${i+1}"><layer></layer></staff>`);
        }
        if (num > 1 && !sys.barlines.find(o => o.x === 2)) {
          sys.barlines.push({x: 2, y: 80, stave: 0, system: j, label: "barline"});
        }
        sys.barlines.forEach(o => {
          let group = staff.group($("#system"+j+" .barlines"),[o.label,j,o.stave,o.x,o.y].join("-"), {class: "barline"});
          drawbarline(o,group);
        });
        
        
      });
      
      historyy.push({event: "change", id: "#numstaves", val: num});
    } else if (num < systems[0].staves.length) {
      reset = {obj: $("#numstaves"), attr: "value", value: systems[0].staves.length};
      $("#dialogUnderlay").show();
      let diff = systems[0].staves.length - num;
      $("#removestaff span:first-child").text(diff > 1 ? diff+" staves" : "staff");
      $("#removestaff span:last-child").text(diff > 1 ? "staves" : "staff");
      $("#removestaff").centre().show();
    }
  });
  
  //change system width (applies to every system)
  $("#syswidth").on("change", () => {
    let width = Number($("#syswidth").val());
    if (width > syswidth) {
      $(".stafflines rect").attr("width", width);
      $("svg.system").attr("width", width+50);
      systems.forEach(sys => sys.width = width);
      syswidth = width;
      historyy.push({event: "change", id: "#syswidth", val: width});
    } else if (width < syswidth) {
      reset = width;
      $("#dialogUnderlay").show();
      $("#shortenstaff").centre().show();
    }
  });
  
  $("#instruct").on("click", () => {
    $("#dialogUnderlay").show();
    $("#instructions").centre().show();
  });
  
  
  $("#shortenstaffOK").on("click", (e) => {
    let width = reset;
    $(".stafflines rect").attr("width", width);
    $("svg.system").attr("width", width+50);
    systems.forEach(sys => sys.width = width);
    syswidth = width;
    removethings(3,width);
    historyy.push({event: "change", id: "#syswidth", val: width});
  });
  
  $("#removestaffOK").on("click", (e) => {
    let num = Number($("#numstaves").val());
    
    for (let i = 0; i < systems.length; i++) {
      $("#system"+i).attr("height", (num+1)*100);
    }
    systems.forEach(s => s.staves = s.staves.slice(0,num));
    removethings(2,num);
    historyy.push({event: "change", id: "#numstaves", val: num});
  });
  
  $("#removesystemOK").on("click", (e) => {
    let num = Number($("#numsystems").val());
    $(".system:nth-child(1n+"+(num+1)+")").remove();
    systems = systems.slice(0, num);
    reset = null;
    cancelDialog();
    historyy.push({event: "change", id: "#numsystems", val: num});
  });
  
  $('button.cancel').click(cancelDialog);
  
  
  $("button.has-dropdown").on("click", (e) => {
    e.stopPropagation();
    $(e.target).children(".dropdown").toggleClass("block");
  });
  
  $("#numbeams li").on("click", (e) => {
    let n = Number($(e.target).text());
    numbeams = n;
    $("#numbeams span").text(n);
  });
  
  $("body").on("click", () => {
    $(".dropdown").removeClass("block");
  });
  
  
  $("button.has-dropdown li").on("click", (e) => {
    e.stopPropagation();
    $(e.target).siblings().removeClass("selected");
    $(e.target).addClass("selected");
  });
  
  $("#buttons button.has-dropdown li").on("click", (e) => {
    label = e.target.id;
  });

  
  $("#buttons button").on("click", (e) => {
    if (!$(e.target).hasClass("disabled")) {
      if (!$(e.target).hasClass("has-dropdown") || !label) {
        label = e.target.id;
      }
      
      $(e.target).siblings().removeClass("selected");
      $(e.target).addClass("selected");
      $(svg).off("mouseenter mouseleave");
      $("g").off("mouseenter mouseleave");
      $("path").off("mouseenter mouseleave");
      if (["note1","note2","note3", "barline", "treble", "sharp", "flat", "natural", "ledger", "bass", "quarterrest", "rectrest", "eighthrest", "cclef"].includes(label) || label.startsWith("timesig")) {
        
        $("path").attr("style", "");
        $(".notes").attr("style", "stroke: black; stroke-width: 1px; fill: black; fill-rule: evenodd;");
        
        $(svg).hover(function() {
          //if (!label.startsWith("timesig")) {
            let url = label != "barline" ? "url(svgs/"+label+".svg)"+info[label].coord : "url(https://cdn.glitch.com/ba66e22e-49d8-46fa-abb2-cdd3790b12e6%2F"+label+".png"+(info[label] ? `?${info[label].urlend}${info[label].coord}` : ")");
            $(svg).css("cursor", url + ", crosshair");
          //} else {
          //  $(svg).css("cursor", "crosshair");
          //}
          

        });
      } else {
        $("path").attr("style", "");
        $(".notes").attr("style", "stroke: black; stroke-width: 1px; fill: black; fill-rule: evenodd;");
        $(svg).hover(function() {
          $(svg).css("cursor", label.startsWith("timesig") ? "crosshair" : "default");
        });
      }
      
      if (label === "dot") {
        $(".note,.rest").children().hover(function() {
          $(this).css({fill: "blue", stroke: "blue"});
        }, function() {
          $(this).css({fill: "black", stroke: "black"});
        });
      }

      if (label === "eraser") {
        $(".note,.rest,.stems,.barlines,.clefs").children().hover(function() {
          $(this).css({fill: "blue", stroke: "blue"});
        }, function() {
          $(this).css({fill: "black", stroke: "black"});
        });
        $(".timesigs").children().hover(function() {
          $(this).css("fill", "blue");
        }, function() {
          $(this).css("fill", "black");
        });
      }

      if (label === "select") {

        $("path").attr("style", "");
        $(".notes").hover(function() {
          $(this).css("cursor", "pointer");
        });
      }
      
      if (["stemup", "stemdown", "flagup", "flagdown", "beamabove", "beambelow", "tieabove", "tiebelow", "increasebeam"].includes(label) && notestems.length) {
        $("path").attr("style", "");
        $(".notes").attr("style", "stroke: black; stroke-width: 1px; fill: black; fill-rule: evenodd;");
        let o = {label: label, notestems: notestems, system: current};
        
        switch (label) {
          case "stemup": case "stemdown": case "flagup": case "flagdown":
            o.numbeams = numbeams;
            o.event = "stems";
            stemflag(numbeams);
            break;
          case "beamabove": case "beambelow":
            o.numbeams = numbeams;
            o.event = "stems";
            addbeam(numbeams);
            break;
          case "tieabove": case "tiebelow":
            o.event = "ties";
            addties(notestems,label,current);
            break;
          case "increasebeam":
            o.event = "beam";
            o.beam = hasbeam;
            increasebeam(notestems,hasbeam);
        }
        historyy.push(o);
        notestems = [];
        hasbeam = false;
        $("#stemup,#stemdown,#beamabove,#beambelow,#flagup,#flagdown,#tieabove,#tiebelow,#increasebeam").addClass("disabled");
        $("#select").click();
      }
      
      

      notestems = [];
      
      
    }
    
  });
  
  $("#container").on("touchstart", ".system", (e) => {
    e.preventDefault();
    handleInput(e);
  });
  $("#container").on("touchmove", ".system", handleInput);
  $("#container").on("touchend", ".system", handleInput);
  $("#container").on("touchcancel", ".system", handleInput);
  
  


  $("#container").on("click", ".system", handleInput);


  
  
  
});


function numsystems(e) {
  let num = Number($("#numsystems").val());
  if (num > systems.length) {
    for (let i = systems.length; i < num; i++) {
      let system = $("#system0").clone();
      system.attr("id", "system"+i);
      system.children(".clefs,.notes,.timesigs,.stems,.barlines").children().remove();
      let sys = {
        width: syswidth,
        staves: [],
        barlines: []
      }
      if (systems[0].staves.length > 1) {
        let group = staff.group($("#system"+i+" .barlines"),["barline",i,0,2,80].join("-"), {class: "barline"});
        staff.path(group, `M 2 80 v `+((systems[0].staves.length-1)*100+40));
        sys.barlines.push({x: 2, y: 80, stave: 0, system: i, label: "barline"});
      }
      $("#container").append(system);
      let bar = Number(xml.find("measure:last-child").attr("n")) + 1;
      //add system to xml as another measure
      let children = `<measure n="${bar}">`;
      systems[0].staves.forEach((s,j) => {
        let stave = {
          x: s.x,
          centerline: s.centerline,
          things: [],
          notes: []
        }
        sys.staves.push(stave);
        children += `<staff n="${j+1}"><layer></layer></staff>`;
      });
      systems.push(sys);
      children += `</measure>`;
      xml.find("section").append(children);
    }
    historyy.push({event: "change", id: "#numsystems", val: num});
  } else if (num < systems.length) {
    reset = {obj: $("#numsystems"), attr: "value", value: systems.length};
    $("#dialogUnderlay").show();
    let diff = systems.length - num;
    $("#removesystem span:first-child").text(diff > 1 ? diff+" systems" : "system");
    $("#removesystem span:last-child").text(diff > 1 ? "systems" : "system");
    $("#removesystem").centre().show();
  }
}

function numstaves(e) {
  
}

function changewidth(e) {
  
}

function removeSys(e) {
  
}

function removeStaff(e) {
  
}

function shortenStaff(e) {
  
}

function stemflag(num) {
  for (let i = 0; i < notestems.length; i++) {
    let x = notestems[i].x;
    let y;
    let v;
    let notes = systems[current].staves[notestems[i].staff].notes.filter(o => o.x === notestems[i].x);
    let centerline = systems[current].staves[notestems[i].staff].centerline;
    let stemlabel;

    switch (label) {
      case "stemup": case "flagup":
        x += 10;
        y = Math.max(...notestems[i].y);
        v = Math.min(...notestems[i].y)-y;
        if (Math.min(...notestems[i].y) < centerline && (label === "stemup" || num === 1)) { // top note of chord is above centerline
          v -= Math.max(Math.min(...notestems[i].y)-centerline+35, 25);
        } else if (Math.min(...notestems[i].y)-35 > centerline) { // top note of chord is so low a normal stem won't reach centerline
          v -= Math.min(...notestems[i].y)-centerline;
        } else {
          v -= 35;
        }
        if (label === "flagup" && num > 2) {
          v -= (num-2)*8;
        }
        stemlabel = "stemup";
        break;
      case "stemdown": case "flagdown":
        y = Math.min(...notestems[i].y);
        v = Math.max(...notestems[i].y)-y;
        if (Math.max(...notestems[i].y) > centerline && (label === "stemdown" || num === 1)) {
          v += Math.max(centerline+35-Math.max(...notestems[i].y), 25);
        } else if (Math.max(...notestems[i].y)+35 < centerline) {
          v += centerline - Math.max(...notestems[i].y);
        } else {
          v += 35;
        }
        if (label === "flagdown" && num > 2) {
          v += (num-2)*8;
        }
        stemlabel = "stemdown";
        break;
    }

    let id = [stemlabel,current,notestems[i].staff,x,y].join("-");
    let parent = [(notestems[i].y.length === 1 ? notestems[i].type : "chord"),current,notestems[i].staff,notestems[i].x,Math.min(...notestems[i].y)+3.5].join("-");
    //console.log(parent);
    if (!$("#"+id).length) {
      staff.path($('g[id="'+parent+'"]'), `M ${x} ${y} v ${v}`, {id: id, fill: "none", "stroke-width": "1.5"});
    }
    if (label.startsWith("flag")) {
      let dir = label.endsWith("down") ? 1 : -1;
      let flagid = [label,current,notestems[i].staff,x,y+v].join("-");
      let path = num === 1 ? 
          "M "+x+" "+(y+v)+" "+draweighthflag(dir,Math.abs(v)) : 
          drawflags(dir,num,x,y+v);
      staff.path($('g[id="'+parent+'"]'), path, {id: flagid});
    }

  }
}

function addbeam(num) {
  notestems.sort((a,b) => a.x-b.x);
  let x = Math.min(...notestems.map(o => o.x));
  let h = Math.max(...notestems.map(o => o.x));
  let s = notestems[0].staff;

  let starty, endy;
  let center = systems[current].staves[s].centerline;
  //calculate the allowable positions for a beam
  let values = [];
  for (let i = -2; i <= 2; i++) {
    values.push(center+i*10-4,center+i*10-1.5,center+i*10);
  }
  if (label === "beamabove") {
    x += 10;
    h+=10;
    values.reverse();
  }
  //console.log(notestems.length);
  let yy = notestems.map(o => {return {y: o.y}});
  if (notestems.length === 2 || (notestems.length > 2 && unidirectional(yy, label === "beamabove" ? "min" : "max"))) {
    //if the beam is only connecting two notes, or its notes are unidirectional
    switch (label) {
      case "beamabove":
        starty = Math.min(...notestems.find(o => o.x === x-10).y) - 34;
        endy = Math.min(...notestems.find(o => o.x === h-10).y) - 34;
        starty = Math.min(starty, center-1.5);
        endy = Math.min(endy, center-1.5);
        break;
      case "beambelow":
        starty = Math.max(...notestems.find(o => o.x === x).y) + 30;
        endy = Math.max(...notestems.find(o => o.x === h).y) + 30;
        starty = Math.max(starty, center+1.5);
        endy = Math.max(endy, center+1.5);
        break;
    }
  } else {
    //find the note closest to the beam and set y coord based on it
    let closest;
    switch (label) {
      case "beamabove":
        closest = Math.min(...notestems.map(o => Math.min(...o.y)));
        if (closest < center) {
          starty = closest - Math.max(closest-center+34, 24);
        } else if (closest-34 > center) {
          starty = center-1.5;
        } else {
          starty = closest-34;
        }
        break;
      case "beambelow":
        closest = Math.max(...notestems.map(o => Math.max(...o.y)));
        if (closest > center) {
          starty = closest + Math.max(center+30-closest,20);
        } else if (closest+30 < center) {
          starty = center-1.5;
        } else {
          starty = closest+30;
        }
    }
    endy = starty;
  }
  //make sure start and end y coords are valid
  if (!values.includes(starty) && Math.abs(center-starty) < 24) {
    switch (label) {
      case "beamabove":
        starty = values.find(v => v < starty);
        break;
      case "beambelow":
        starty = values.find(v => v > starty);
        break;
    }
  }
  if (!values.includes(endy) && Math.abs(center-endy) < 24) {
    switch (label) {
      case "beamabove":
        endy = values.find(v => v < endy);
        break;
      case "beambelow":
        endy = values.find(v => v > endy);
        break;
    }
  }
  x -= .5;
  let dir = label === "beambelow" ? 1 : -1;
  if (num > 1) {
    starty += dir*10*(num-1.5);
    endy += dir*10*(num-1.5);
  }
  
  let id = ["beam",current,s,x,starty].join("-");
  if (!$("#"+id).length) {
    let group = staff.group($("#system"+current + " .notes"), ["beamgroup",current,s,x,starty].join("-"), {class: "beam"});
    let arr = ["M",x,starty,"l",h-x,endy-starty,"v 4 l",x-h,starty-endy,"v -4"];
    let path = arr.join(" ");
    for (let i = 1; i < num; i++) {
      arr.splice(2,1,starty-dir*10*i);
      path += " " + arr.join(" ");
    }
    staff.path(group, path, {id: id});
    let m = (endy-starty)/(h-x);
    let b = starty - m*x;
    for (let i = 0; i < notestems.length; i++) {
      let stemx = notestems[i].x;
      let y;

      let v;
      switch (label) {
        case "beamabove":
          stemx += 10;
          y = Math.max(...notestems[i].y);
          break;
        case "beambelow":
          y = Math.min(...notestems[i].y);
          break;
      }
      let intersect = m*stemx + b;
      v = intersect - y;
      let parent = [(notestems[i].y.length === 1 ? notestems[i].type : "chord"),current,notestems[i].staff,notestems[i].x,Math.min(...notestems[i].y)+3.5].join("-");
      let stemid = ["stem"+(label === "beamabove" ? "up" : "down"),current,s,stemx,y].join("-");
      staff.path($('g[id="'+parent+'"]'), `M ${stemx} ${y} v ${v}`, {id: stemid, fill: "none", "stroke-width": "1.5", class: "stem"});
      $('g[id="'+parent+'"]').detach().appendTo(group);
    }
  }
}

function addties(notes,where,sys) {
  notes.sort((a,b) => a.x-b.x);
  let startx = Math.min(...notes.map(o => o.x)) + 10;
  let endx = notes.length === 1 ? startx + 50 : Math.max(...notes.map(o => o.x)) + 2;
  let stave = notes[0].staff;
  let dx = endx - startx;
  let dir = where === "tiebelow" ? 1 : -1;
  
  notes[0].y.forEach(y => {
    let ypos = y;
    if (notes[0].type != "note3") ypos -= 3.5;
    ypos += dir === 1 ? 10 : -5;
    let xcontrol = Math.min(5,dx/7);
    let ycontrol = Math.min(12,.4*dx);
    let y2 = ycontrol <= 10 ? ycontrol - 1.5 : ycontrol - 2;
    ycontrol *= dir, y2 *= dir;
    let arr = ["M",startx,ypos,"c",xcontrol,ycontrol,dx-xcontrol,ycontrol,dx,0,
               "c",-xcontrol-1,y2,-dx+xcontrol+1,y2,-dx,0];
    let id = ["tie",sys,stave,startx,ypos].join("-");
    staff.path($("#system"+sys+" .notes"), arr.join(" "), {id: id, class: "tie", stroke: "none"});
  });
}

function increasebeam(notes, beam) {
  notes.sort((a,b) => a.x-b.x);
  let arr = beam.split("-");
  let starty = Number(arr[4]);
  let startx = Number(arr[3]);
  let endy;
  let endx;
  arr.splice(0,1,"beam");
  let dir = starty > notes[0].y[0] ? 1 : -1;
  let g = $('g[id="'+beam+'"]');
  let group = g;
  let level = beam;
  let by1 = starty;
  //move current beam to make room & increase stem lengths
  do {
    let arr2 = level.split("-");
    arr2.splice(0,1,"beam");
    let old = $('path[id="'+arr2.join("-")+'"]');
    let patharr = old.attr("d").split(" ");
    if (!endy) endy = Number(patharr[5]) + starty;
    if (!endx) endx = Number(patharr[4]) + startx;
    for (let i = 2; i < patharr.length; i+= 13) { ///
      patharr[i] = Number(patharr[i])+dir*10; ///
    }
    by1 += dir*10;
    arr2.splice(4,1,by1);
    old.attr({id: arr2.join("-"), d: patharr.join(" ")});
    arr2.splice(0,1,"beamgroup");
    group.attr("id",arr2.join("-"));
    level = group.parents(".beam").length ? group.parents(".beam")[0].id : null;
    if (level) group = $('g[id="'+level+'"]');
  } while (level);

  
  group.find(".stem").each(function() {
    let path = $(this).attr("d").split(" ");
    path[4] = Number(path[4]) + dir*10;
    $(this).attr("d", path.join(" "));
  });
  
  
  let m = (endy-starty)/(endx-startx);
  let b = starty - m*startx;
  let parent, parentid;
  //single note/chord: add little flag (how do I know the direction??)
  if (notes.length === 1) {
    let x = notes[0].x;
    x += dir === 1 ? -.5 : 9.5;
    let endx;
    if (x === startx) {
      endx = x + 6.5;
    } else {
      endx = x+.5;
      x -= 6.5;
    }
    let dx = endx - x;
    let y1 = m*x + b;
    let y2 = m*endx + b;
    parentid = ["beamgroup",arr[1],arr[2],x,y1];
    parent = staff.group(g, parentid.join("-"), {class: "beam"});
    parentid.splice(0, 1, "beam");
    let id = parentid.join("-");
    let path = ["M",x,y1,"l",dx,y2-y1,"v 4 l",-dx,y1-y2,"v -4"].join(" ");
    staff.path(parent, path, {id: id});
    let note = [notes[0].y.length === 1 ? notes[0].type : "chord",arr[1],arr[2],notes[0].x,Math.min(...notes[0].y)+3.5].join("-");
    $('g[id="'+note+'"]').detach().appendTo(parent);
  } else {
    //more than one note/chord: just find first and last and calculate the extra beam based on that
    let x = notes[0].x;
    let endx = notes[notes.length-1].x;
    if (dir === -1) x += 9.5, endx += 10;
    if (dir === 1) x -= .5;
    let dx = endx - x;
    let y1 = m*x + b;
    let y2 = m*endx + b;
    let id = ["beamgroup",arr[1],arr[2],x,y1];
    let path = ["M",x,y1,"l",dx,y2-y1,"v 4 l",-dx,y1-y2,"v -4"].join(" ");
    parent = staff.group(g, id.join("-"), {class: "beam"});
    id.splice(0, 1, "beam");
    id = id.join("-");
    staff.path(parent, path, {id: id});
    notes.forEach(n => {
      let note = [n.y.length === 1 ? n.type : "chord",arr[1],arr[2],n.x,Math.min(...n.y)+3.5].join("-");
      $('g[id="'+note+'"]').detach().appendTo(parent);
    });
    
  }
  
}
 
function handleInput(e) {
  let output = {};
  let touch;
  if (label) {
    switch (label) {
      case "select":
        selectnotes(e);
        break;
      case "eraser":
        output.event = "erase";
        output.target = e.target; //this needs to actually be a copy
        historyy.push(output);
        erase(output);
        break;
      default:
        switch (e.type) {
          case "touchstart": case "touchmove": case "touchend": case "touchcancel":
            let touches = e.originalEvent.changedTouches;

            if (touches) e.preventDefault();
            if (touches && touches.length === 1 ) {
              touch = copyTouch(touches[0]);
              output.x = Number(touch.pageX)-16;
              if (touch.offsetY) {
                output.y = Number(touch.offsetY);
              } else {
                let offset = $(e.currentTarget).offset();
                output.y = Number(touch.pageY) - offset.top;
              }
              if ((["note1", "note2", "note3", "rectrest", "ledger", "sharp", "flat", "natural", "cclef"].includes(label) || label.startsWith("timesig")) && output.y > 30) output.y -= 30;
            }
            break;
          case "click":
            output.x = Number(e.originalEvent.pageX)-16;
            if (e.originalEvent.offsetY) {
              output.y = Number(e.originalEvent.offsetY);
            } else {
              let offset = $(e.currentTarget).offset();
              output.y = Number(e.originalEvent.pageY) - offset.top;
            }
            break;
        }
        if (output.x) {
          current = Number(e.currentTarget.id.slice(6)); //current system
          let staves = systems[current].staves.map(s => s.centerline);
          let stave = output.y < 50 ? 0 : output.y >= staves[staves.length-1]+50 ? staves.length-1 : staves.findIndex(s => output.y >= s-50 && output.y < s+50);
          output.event = ["touchend","touchcancel","touchmove"].includes(e.type) ? "move" : "add";
          output.system = current;
          output.stave = stave;
          output.type = e.type;
          output.label = label;
          output.noteheadlock = noteheadlock;
          output.target = e.target; //probably need to copy this?

          historyy.push(output);
          let result;
          if (e.type === "touchmove") {
            if (currenttouch) {
              result = handleMove(output);
              touch.elementid = result.id;
              touch.info = result.obj;
              touch.stave = stave;
              currenttouch = touch;
            }
          } else if (["touchend","touchcancel"].includes(e.type)) {
            if (currenttouch) {
              result = handleMove(output);
              if (result.id.startsWith("note")) {
                let o = result.obj;
                let lock = systems[current].staves[stave].notes.filter(n => Math.abs(n.x-o.x) < 12);
                if (lock.length && output.noteheadlock) {
                  locknotes(lock, stave, o);
                  result.id = movething(result.id,o.x,o.y);

                }
              }
              finishdraw(result);
              currenttouch = null;
            }
          } else {
            result = addthings(output);
            if (e.type === "touchstart" && !["dot","treble","bass","barline"].includes(label)) {
              touch.elementid = result.id;
              touch.info = result.obj;
              touch.stave = stave;
              currenttouch = touch;
            } else { //if (e.type === "click")
              finishdraw(result);
            }
          }
        }
    }
  
  }
}



function addthings(o) {
  let result = {stave: o.stave};
  let parent;
  let parentstr = "#system"+o.system;
  if (info[o.label].parent) parentstr += info[o.label].parent;
  let staffpos = Math.round((systems[o.system].staves[o.stave].centerline - (Math.round(o.y/5)*5))/5);
  if (["flat","sharp","natural","ledger"].includes(o.label) || o.label.startsWith("note")) o.staffpos = staffpos;
  o.y = calcy(o);
  if (o.label.startsWith("timesig")) o.x += info[o.label].x;
  
  if (o.label.startsWith("note")) {
    o.attachments = [];
    let lock = systems[o.system].staves[o.stave].notes.filter(n => Math.abs(n.x-o.x) < 8);
    if (lock.length && o.noteheadlock && o.type === "click") {
      locknotes(lock, o.stave, o)
    }
    if (Math.abs(o.staffpos) > 5) {
      let ledgers = systems[o.system].staves[o.stave].things.filter(l => l.label === "ledger" && Math.abs(l.x-o.x) < 25 && ((o.staffpos > 0 && l.staffpos <= o.staffpos) || (o.staffpos < 0 && l.staffpos >= o.staffpos)));
      if (ledgers.length) {
        ledgers.forEach(l => {
          let lid = ["ledger", o.system, o.stave, l.x, l.y].join("-");
          if (!l.note) {
            l.x = o.x-6;
            if (o.label === "note3") l.h = 30;
            //console.log("connecting note and ledger");
            //console.log(l);
          } else {
            let notes = systems[o.system].staves[o.stave].notes.filter(n => n.type.startsWith("note") && n.attachments.find(e => e.label === "ledger" && e.x === l.x && e.y === l.y));
            //console.log(notes);
            let xx = notes.map(n => n.x);
            xx.push(o.x);
            let oldx = l.x;
            l.x = Math.min(...xx)-6;
            l.h = (o.label === "note3" ? 30 : 22) + Math.max(...xx) - Math.min(...xx);
            notes.forEach(n => {
              let i = n.attachments.findIndex(e => e.label === "ledger" && e.x === oldx && e.y === l.y);
              if (i > -1) {
                n.attachments.splice(i, 1, l);
              }
            });
          }
          let path = ["M",l.x,l.y,"h",l.h].join(" ");
          let lid2 = ["ledger", o.system, o.stave, l.x, l.y].join("-");
          $("#"+lid).attr({d: path, id: lid2});
          l.note = true;
          o.attachments.push(l);

        });
      }
    }
    parentstr = o.chord ? 'g[id="'+o.chord+'"]' : "#system"+o.system+" .notes";
  } else if (o.label === "dot") {
    if ($(o.target).parent().hasClass("note") || $(o.target).parent().hasClass("rest")) {
      let arr = $(o.target).parent().attr("id").split("-");
      o.x = Number(arr[3]);
      o.y = Number(arr[4]);
      let note = systems[o.system].staves[o.stave].notes.find(n => n.y === o.y && n.x === o.x);
      let second = systems[o.system].staves[o.stave].notes.find(n => n.y === o.y-5 && n.x < o.x+12 && n.x > o.x);
      if (second) o.x = second.x;
      switch (arr[0]) {
        case "note1": case "note2":
          o.y -= 3.5;
          o.x += 17;
          break;
        case "note3":
          o.x += 24;
          break;
        case "quarterrest":
          o.y += 10;
          o.x += 12;
          break;
        case "rectrest":
          if (o.y%10 === 1) o.y -= 1;
          o.x += 17;
          break;
        case "eighthrest":
          o.x += 12;
      }
      if (o.y%10 === 0) {
        o.y += arr[0].startsWith("note") ? -5 : 5;
      }
      o.y = Math.round(o.y/5)*5 + .75;

      let id = [o.label, o.system, o.stave, o.x, o.y].join("-");
      while ($('circle[id="'+id+'"]').length) {
        o.x += 7;
        id = [o.label, o.system, o.stave, o.x, o.y].join("-");
      }
      if (note) note.attachments.push(o);
      parent = $(o.target).parent();
      //console.log(o);
    }
  } else if (o.label === "ledger") {
    o.h = 22;
    o.staffpos = (systems[o.system].staves[o.stave].centerline - o.y)/5;
    let notes = systems[o.system].staves[o.stave].notes.filter(n => ((o.staffpos < 0 && n.staffpos <= o.staffpos) || (o.staffpos > 0 && n.staffpos >= o.staffpos)) && Math.abs(o.x-n.x) < 16);
    if (notes.length) {

      notes.forEach(n => n.attachments.push(o));
      o.note = true;
      let xx = notes.map(n => n.x);
      o.x = Math.min(...xx) - 7;
      o.h += Math.max(...xx) - Math.min(...xx);
    }
  }
  
  result.id = [o.label,o.system,o.stave,o.x,o.y].join("-");
  if (["ledger","sharp", "natural", "flat"].includes(o.label) || (o.label.startsWith("timesig") && o.label[7] != "c")) {
    parent = $(parentstr);
  } else if (info[o.label].class && ["clef", "rest", "barline", "timesig", "note"].includes(info[o.label].class)) {
    parent = staff.group($(parentstr), result.id, {class: info[o.label].class});
  }
  
  //draw the thing
  if (o.label === "ledger") {
    staff.path(parent, `M ${o.x} ${o.y} h ${o.h}`, {id: result.id});
  } else if (o.label.startsWith("bar")) {
    drawbarline(o,parent);
    
  } else {
    let id = ["dot","sharp","flat","natural"].includes(o.label) ? result.id : null;
    let elem = draw(o,parent,id);
    //console.log(elem);
    if (["dot","sharp","flat","natural"].includes(o.label)) {
      //elem.attr("id", result.id);
    }
  }
  result.obj = o;
  return result;
}

function drawelement(o) {
  
}



function locknotes(lock, stave, o) {
  lock.sort((a,b) => Math.abs(a.x-o.x)-Math.abs(b.x-o.x));
  if (!lock[0].chord) {
    o.x = lock[0].x;
    let int = lock[0].staffpos - o.staffpos;
    let chordx = lock[0].x;
    if (int === -1) { //new note is higher than old
      o.x += 10;
      chordx = o.staffpos > 0 ? o.x : lock[0].x;
    }
    if (int === 1) { //new note is lower than old
      o.x -= 10;
      chordx = o.staffpos < 0 ? o.x : lock[0].x;
    }
    //create new chord

    let chordid = ["chord",current,stave,chordx,Math.min(o.y,lock[0].y)].join("-");
    lock[0].chord = chordid;
    o.chord = chordid;
    let chord = staff.group($("#system"+current+" .notes"), chordid, {class: "chord"});
    let lockid = [lock[0].label,current,stave,lock[0].x,lock[0].y].join("-"); /////////////////////
    $('g[id="'+lockid+'"]').detach().appendTo(chord);
  } else {
    let oldchord = lock[0].chord;
    let arr = oldchord.split("-");
    let notes = systems[current].staves[stave].notes.filter(n => n.chord === oldchord);
    o.x = Number(arr[3]);
    
    let stemdir = Math.min(...notes.map(n => n.staffpos)) + Math.max(...notes.map(n => n.staffpos));
    stemdir = stemdir >= 0 ? 1 : -1; //1 means down, -1 means up
    let ints = [1,2,-1,-2].map(i => notes.find(n => n.staffpos-o.staffpos === i*stemdir));
    console.log(ints);
    if (ints[0] && !ints[1]) {
      //stemdir down and new note below or vice versa
      o.x -= stemdir*10;
    } else if (ints[2]) {
      //stemdir down and new note above or vice versa
      let i = 1;
      let note = ints[2];
      do {
        let x = i%2 === 1 ? o.x - stemdir*10 : o.x;
        let id = [note.label,current,stave,note.x,note.y].join("-"); /////////////////////
        movething(id,x,null);
        i++;
        note = notes.find(n => n.staffpos-o.staffpos === i*stemdir*-1);
      } while (note);

    }
    let chordid = oldchord;
    if (o.y < Number(arr[4])) {
      arr.splice(4,1,o.y);
      chordid = arr.join("-");
      $('g[id="'+oldchord+'"]').attr("id",chordid);
      notes.forEach(n => n.chord = chordid);
    }
    o.chord = chordid;
  }
  
}

function calcy(o) {
  let y;
  switch (o.label) {
    case "note1": case "note2": case "note3": case "sharp": case "flat": case "natural": case "rectrest": case "eighthrest":
      y = Math.round(o.y/5)*5 + info[o.label].y;
      break;
    case "quarterrest":
      y = Math.ceil(o.y/10)*10-5;
      break;
    case "ledger":
      y = Math.round(o.y/10)*10;
      break;
    case "cclef":
      y = Math.round(o.y/10)*10 + 1;
      break;
    case "treble": case "bass":
      y = systems[o.system].staves[o.stave].centerline + info[o.label].y;
      break;
    case "barline": case "barfinal": case "barendrep": case "barstartrep": case "barbothrep":
      y = 80;
      break;
    default:
      if (o.label.startsWith("timesig")) {
        y = Math.round(o.y/5)*5 + info[o.label].y;
      } else {
        y = o.y;
      }
  }
  return y;
}



function selectnotes(e) {
  //console.log($(e.target).parent().prop("tagName"));
  let id = $(e.target).parent().attr("id");
  if (id.startsWith("note") && (!hasbeam || $(e.target).parents('g[id="'+hasbeam+'"]').length)) { 
    let selected = $(e.target).attr("style").includes("blue");
    $(e.target).attr("style", selected ? "fill:black; stroke:black" : "fill:blue; stroke:blue");
    if (notestems.length === 0 && $(e.target).parents(".beam").length) hasbeam = $(e.target).parents(".beam")[0].id;
    //console.log(hasbeam);
    let arr = id.split("-");
    let x = Number(arr[3]);
    let s = Number(arr[2]);
    let y = Number(arr[4])-(arr[0] === "note3" ? 0 : 3.5);
    let i = notestems.findIndex(o => o.x === x && o.staff === s);
    if (i > -1) {
      if (selected) {
        let j = notestems[i].y.indexOf(y);
        if (j > -1) {
          notestems[i].y.splice(j, 1);
          if (notestems[i].y.length === 0) {
            notestems.splice(i, 1);
          }
        }
      } else {
        notestems[i].y.push(y);
      }
    } else if (!selected) {
      notestems.push({x: x, y: [y], staff: s, type: arr[0]});
    }
    if (notestems.length === 0) {
      hasbeam = false;
      $("#increasebeam").addClass("disabled");
    }
    if (notestems.length === 1 && !hasbeam) {
      $("#stemup,#stemdown,#flagup,#flagdown,#tieabove,#tiebelow").removeClass("disabled");
    }
    if (notestems.length === 1 && hasbeam) {
      $("#increasebeam,#tieabove,#tiebelow").removeClass("disabled");
    }
    if (notestems.length === 2 && !hasbeam) {
      $("#beamabove,#beambelow").removeClass("disabled");
    }
    //console.log(notestems);
  }
}

function erase(e) {
  if ($(e.target).parent().hasClass("clef") || $(e.target).parent().hasClass("note") || $(e.target).parent().hasClass("rest")) {
    let thing = $(e.target).parent();
    let arr = thing.attr("id").split("-");
    //console.log("note, rest, or clef");
    let key = thing.hasClass("clef") ? "things" : "notes";
    let search = systems[Number(arr[1])].staves[Number(arr[2])][key];
    let i = search.findIndex(o => o.x === Number(arr[3]) && o.y === Number(arr[4]));
    if (i > -1) {
      search.splice(i, 1);
      console.log("erased");
    }
    $(e.target).parent().remove();
  //} else if ($(e.target).parent().hasClass("note") || $(e.target).parent().hasClass("rest")) {
    
  } else if ($(e.target).parent().hasClass("barline") || $(e.target).parent().hasClass("timesig")) {
    $(e.target).parent().remove();
  } else if ($(e.target).is("path") || $(e.target).is("text") || $(e.target).is("circle")) {
    $(e.target).remove();
  } 
}

function drawbarline(o,parent) {
  o.v = (systems[o.system].staves.length-1)*100 + 40;
  o.y = 80;
  systems[o.system].barlines.push(o);
  if (o.label != "barline") {
    staff.rect(parent, o.x+3, 81, 2, o.v-1);
  }
  if (o.label != "barstartrep") {
    staff.path(parent, `M ${o.x} 80 v ${o.v}`);
  }
  if (["barstartrep", "barbothrep"].includes(o.label)) {
    staff.path(parent, `M ${o.x+8} 80 v ${o.v}`);
    systems[o.system].staves.forEach(st => {
      staff.circle(parent, o.x+13, st.centerline-4.5, 2);
      staff.circle(parent, o.x+13, st.centerline+5.5, 2);
    });
  }
  if (["barendrep", "barbothrep"].includes(o.label)) {
    systems[o.system].staves.forEach(st => {
      staff.circle(parent, o.x-5, st.centerline-4.5, 2);
      staff.circle(parent, o.x-5, st.centerline+5.5, 2);
    });
  }
}

//given object with label, parent, x, y, draw the necessary elements
function draw(o,parent,id) {
  let last;
  info[o.label].elements.forEach(e => {
    let args = [parent];
    switch (e.type) {
      case "circle":
        args.push(o.x+e.x, o.y+e.y, e.r);
        break;
      case "path":
        args.push("M "+(o.x+e.x)+" "+(o.y+e.y)+e.d);
        break;
      case "rect":
        args.push(o.x+e.x, o.y+e.y, e.width, e.height);
        break;
    }
    if (e.other || id) {
      let other = e.other || {};
      if (id) other.id = id;
      args.push(other);
    }
    last = staff[e.type](...args);
  });
  return last;
}

function draweighthflag(dir,len) {
  let path = [1,-6,1,-6,6,-10,9,-11,4,-24,5,13,2,20,-10,24];
  for (let i = 1; i < path.length; i += 2) {
    path[i] *= dir * Math.min(len,35)/35;
  }
  path.splice(10,0,"c");
  path.splice(6,0,"s");
  return "c "+path.join(" ");
}

function drawflags(dir,num,x,y) {
  let path = [1,-4,1,-4,6,-7.5,7,-8,4,-18,3,10,2,14,-10,18];
  let add = [1,-4,1,-4,6,-7.5,7,-7.75,4,-13,3,5.25,1,10,-10,13];
  for (let i = 1; i < path.length; i+=2) {
    path[i] *= dir;
    add[i] *= dir;
  }
  let yy = [];
  for (let i = 0; i < num; i++) {
    yy.unshift(y-8*dir*i);
  }
  path.splice(10,0,"c");
  path.splice(6,0,"s");
  add.splice(10,0,"c");
  add.splice(6,0,"s");
  path.unshift("M",x,yy[0],"c");
  add.unshift("M",x,yy[1],"c");
  let flags = path.join(" ") + " " + add.join(" ");
  for (let i = 2; i < num; i++) {
    add.splice(2,1,yy[i]);
    flags += " " + add.join(" ");
  }
  return flags;
}

function finishdraw(r) {
  if (r.id && (r.id.startsWith("note") || r.id.includes("rest"))) {
    systems[current].staves[r.stave].notes.push(r.obj);
  } else if (r.obj && ["treble", "bass", "ledger", "cclef"].includes(r.obj.label)) {
    systems[current].staves[r.stave].things.push(r.obj);
  }
}

//not using
function handleStart(evt) {
  let touches = evt.originalEvent.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    ongoingtouches.push(copyTouch(touches[i]));
  }
  if (ongoingtouches.length === 1) {
    let r = drawelement(evt);
    if (r.id) {
      ongoingtouches[0].elementid = r.id;
      ongoingtouches[0].info = r.obj;
      ongoingtouches[0].stave = r.stave;
      
    }
  }
  console.log(ongoingtouches[0]);

}


function handleMove(o) {
  let result = {
    stave: o.stave
  };
  let staffpos = Math.round((systems[o.system].staves[o.stave].centerline - (Math.round(o.y/5)*5))/5);
  
  let y = calcy(o);
  currenttouch.info.y = y;
  if (currenttouch.info.staffpos || currenttouch.info.staffpos === 0) {
    currenttouch.info.staffpos = staffpos;
  }
  result.id = movething(currenttouch.elementid,null,y);
  //if (o.label === "ledger") alert(currenttouch.elementid + "\n" + result.id);
  result.obj = currenttouch.info;
  return result;
}

function movenote(oldid,x,y) {
  let arr = oldid.split("-");
  let obj = systems[Number(arr[1])].staves[Number(arr[2])].notes.find(o => o.x === Number(arr[3]) && o.y === Number(arr[4]));
  let path = $('path[id="'+oldid+'"]');
  //console.log(path);
  let group = path.parent("g");
  let patharr = path.attr("d").split(" ");
  if (x !== null) {
    patharr.splice(1,1,x);
    arr.splice(3,1,x);
    if (obj) obj.x = x;
  }
  if (y !== null) {
    patharr.splice(2,1,y);
    arr.splice(4,1,y);
    if (obj) {
      obj.y = y;
      obj.staffpos = Math.floor((systems[Number(arr[1])].staves[Number(arr[2])].centerline - y)/5);
    }
  }
  let id = arr.join("-");
  path.attr({d: patharr.join(" "), id: id});
  arr.splice(0,1,"group");
  if (group.hasClass("note") || group.hasClass("rest")) group.attr("id",arr.join("-"));
  return id;
}

function movething(oldid,x,y) {
  let arr = oldid.split("-");
  let key = ["treble","bass","cclef","ledger"].includes(arr[0]) ? "things" : "notes";
  let obj = arr[0].startsWith("bar") ? systems[Number(arr[1])].barlines.find(findobj) : systems[Number(arr[1])].staves[Number(arr[2])][key].find(findobj);
  let thing = $('g[id="'+oldid+'"]').length ? $('g[id="'+oldid+'"]') : $('path[id="'+oldid+'"]');
  let dx = x ? x - Number(arr[3]) : null;
  let dy = y ? y - Number(arr[4]) : null;
  if (thing.prop("tagName") === "g") {
    thing.children().each(function() {
      moveelem($(this),dx,dy);
    });
  } else {
    arr = moveelem(thing,dx,dy,oldid);
  }
  if (x !== null) {
    arr.splice(3,1,x);
    if (obj) obj.x = x;
  }
  if (y !== null) {
    arr.splice(4,1,y);
    if (obj) obj.y = y;
  }
  thing.attr("id", arr.join("-"));
  return arr.join("-");
  
  function findobj(o) {
    return o.x === Number(arr[3]) && o.y === Number(arr[4]) && o.label === arr[0];
  }
}



function moveelem(elem,dx,dy,id) {
  let tag = elem.prop("tagName");
  let arr;
  if (id) arr = id.split("-");
  let patharr = tag === "path" ? elem.attr("d").split(" ") : null;
  
  if (dx !== null) {
    let x;
    switch (tag) {
      case "path":
        x = Number(patharr[1])+dx;
        patharr.splice(1,1,x);
        break;
      case "circle":
        x = Number(elem.attr("cx"))+dx;
        elem.attr("cx",x);
        break;
      case "rect":
        x = Number(elem.attr("x"))+dx;
        elem.attr("x",x);
        break;
    }
    if (arr) arr.splice(3,1,x);
  }
  if (dy !== null) {
    let y;
    switch (tag) {
      case "path":
        y = Number(patharr[2])+dy;
        patharr.splice(2,1,y);
        break;
      case "circle":
        y = Number(elem.attr("cy"))+dy;
        elem.attr("cy",y);
        break;
      case "rect":
        y = Number(elem.attr("y"))+dy;
        elem.attr("y",y);
        break;
    }
    if (arr) arr.splice(4,1,y);
  }
  if (patharr) elem.attr("d", patharr.join(" "));
  return arr;
}

//no longer using
function handleEnd(evt) {
  //console.log("touch end");
  if (currenttouch) {
    let r = drawelement(evt);
    if (r.id.startsWith("note")) {
      let o = r.obj;
      let lock = systems[current].staves[r.stave].notes.filter(n => Math.abs(n.x-o.x) < 12);
      if (lock.length && noteheadlock) {
        locknotes(lock, r.stave, o);
        r.id = movenote(r.id,o.x,o.y);
        
      }
    }
    
    finishdraw(r);
    currenttouch = null;
  }
  
  
}

//not using this
function handleCancel(evt) {
  var touches = evt.originalEvent.changedTouches;

  for (var i = 0; i < touches.length; i++) {
    var idx = ongoingTouchIndexById(touches[i].identifier);
    ongoingtouches.splice(idx, 1);  // remove it; we're done
  }
}

function copyTouch({ identifier, pageX, pageY }) {
  return { identifier, pageX, pageY };
}

function ongoingTouchIndexById(idToFind) {
  for (var i = 0; i < ongoingtouches.length; i++) {
    var id = ongoingtouches[i].identifier;

    if (id == idToFind) {
      return i;
    }
  }
  return -1;    // not found
}

function removethings(idx, num) {
  
  $(".clef,.notes > path,.stems > path,.timesigs > text").each(function(i) {
    let s = Number(this.id.split("-")[idx]);
    if (([1,2].includes(idx) && s >= num) || ([3,4].includes(idx) && s > num)) {
      $(this).remove();
    }
  });
  $(".barlines path").each(function(i) {
    let path = $(this).attr("d");
    if (idx === 2) {
      path = path.slice(0, path.indexOf("v"));
      path += "v " + ((num-1)*100+40);
      $(this).attr("d", path);
    } else if (idx === 3) {
      let x = Number(path.split(" ")[1]);
      if (x > num) $(this).parent().remove();
    }
  });
  $(".barlines rect").each(function() {
    if (idx === 2) {
      $(this).attr("height", num*100-61);
    }
  });
  $(".barlines circle").each(function() {
    if (idx === 2) {
      let y = Number($(this).attr("cy"));
      if (y > num*100) {
        $(this).remove();
      }
    }
  })
  $(".stafflines > rect").each(function() {
    if (idx === 2 && Number($(this).attr("y")) > num*100+40) {
      $(this).remove();
    }
  });
  reset = null;
  cancelDialog();
}

function cancelDialog() {
	$('#dialogUnderlay,div.dialog').hide();
  if (reset && reset.obj) {
    reset.obj.attr(reset.attr, reset.value);
  }
  reset = null;
}

function stringify(elem) {
  const attrs = ["id", "class", "width", "height", "xmlns", "d", "x", "y", "cx", "cy", "r", "style", "fill", "stroke"];
  let tag = elem.prop("tagName");
  //console.log(tag);
  let string = `
  <${tag} `;
  if (tag === "svg") {
    let num = Number(elem.attr("id").slice(6))
    let height = (systems[0].staves.length+1)*100;
    let y = num * height;
    string += `y="${y}" `;
  }
  attrs.forEach(a => {
    let att = elem.attr(a);
    if (att && (a != "style" || tag != "svg")) {
      string += a + `="${att}" `;
    }
  });
  if (["path", "rect", "circle"].includes(tag)) {
    string += '/>';
  } else {
    string += '>';
    if (tag === "text") {
      string += elem.text() + '</text>';
    } else {
      elem.children().each(function() {
        string += stringify($(this));
      });
      string += `</${tag}>`;
    }
  }
  
  return string;
}

function downloadToFile(content, filename, contentType) {
  const a = document.createElement('a');
  const file = new Blob([content], {type: contentType});
  
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(a.href);
}

function unidirectional(arr, ext) {
  
  arr.forEach(o => o.y = ext === "max" ? Math.max(...o.y) : Math.min(...o.y));
  let i = 2;
  let dir = arr[1].y - arr[0].y;
  dir = dir > 0 ? 1 : dir < 0 ? -1 : 0;
  let next;
  let result = true;
  do {
    next = arr[i].y - arr[i-1].y;
    next = next > 0 ? 1 : next < 0 ? -1 : 0;
    if (dir === 0 && next != 0) dir = next;
    if (next != 0 && next != dir) result = false;
    i++;
  } while ((next === dir || next === 0) && i < arr.length && result);
  //console.log(result);
  return result;
}