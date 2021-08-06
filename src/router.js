var entrants = [];
var svg;
var systems;
var limbo = [];
var happenings = [];

module.exports = function router(io) {
  
  io.on("connection", (socket) => {
    console.log("connection");
    if (entrants.length) {
      //io.to(entrants[0].id).emit("sendstatus");
    }
    socket.emit('names', entrants.map(e => e.name));
    
    socket.on("entrant", obj => {
      console.log("entrant");
      if (obj.secret === process.env.SECRET) {
        let o = {name: obj.name, id: socket.id};
        entrants.push(o);
        socket.emit("open", {entrants: entrants, happenings: happenings});
        socket.broadcast.emit("entrance", o);
      } else {
        socket.emit("wrong");
      }
    });
    
    //a socket disconnects
    socket.on("disconnect", (r) => {
      console.log("user disconnected");
      if (["ping timeout", "transport close", "transport error"].includes(r)) {
        limbo.push(socket.id);
        //setTimeout(function() {
          for (let i = limbo.length-1; i > -1; i--) {
            disconnect(limbo[i]);
          }
        //}, 3000);
      } else {
        disconnect();
      }
      
      
    });
    
    socket.on("svg", (o) => {
      console.log("svg");
      svg = o.str;
      systems = o.systems;
    });
    
    socket.on("test", s => {
      console.log(s);
    });
    
    socket.on("happening", o => {
      console.log("happening");
      happenings.push(o);
      socket.broadcast.emit("happening", o);
    });
    
    function disconnect(id) {
      let i = entrants.findIndex(e => e.id === id);
      if (i > -1) {
        io.emit("exit", entrants[i].name);
        entrants.splice(i,1);
      }
      if (entrants.length === 0) {
        svg = null;
        systems = null;
        happenings = [];
      }
      let j = limbo.indexOf(id);
      if (j > -1) limbo.splice(j,1);
    }
    
  });
  
}