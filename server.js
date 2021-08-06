// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const http = require("http");
const express = require("express");
const app = express();

const server = http.createServer(app);
const io = require("socket.io")(server);

const router = require("./src/router.js");

// our default array of dreams
const dreams = [
  "Find and count some sheep",
  "Climb a really tall mountain",
  "Wash the dishes"
];



// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

app.get("/group", (request, response) => {
  response.sendFile(__dirname + "/views/group.html");
});

app.get("/harmony", (request, response) => {
  response.sendFile(__dirname + "/views/harmony.html")
});

app.get("/info", (request, response) => {
  response.sendFile(__dirname + "/src/info.json");
});


// send the default array of dreams to the webpage
app.get("/dreams", (request, response) => {
  // express helps us take JS objects and send them as JSON
  response.json(dreams);
});

router(io);

// listen for requests :)
const listener = server.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
