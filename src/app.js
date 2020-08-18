// for test purpose
//Camera Authentication
var ip_address = "10.1.0.98"
//camera username and password
var username = "rtsp";
var password = "rtsp123456";

var _streamingMap = {}; // {key: value} => {uuid path: node-rtsp-stream object}

const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const url = require('url');
const http = require('http');
Stream = require('./videoStream');

//A channel of camera stream
stream = new Stream({
  // streamUrl: 'rtsp://' + username + ':' + password + '@' + ip_address +':554/cam/realmonitor?channel=1&subtype=0&unicast=true&proto=Onvif',
  streamUrl: 'rtsp://' + username + ':' + password + '@' + ip_address + ':554/cam/realmonitor?channel=1&subtype=0',
  ffmpegOptions: {
    "-s": "640x480"
  },
  // wsPort: 9999 
  wsPort: -1,
  // timeout: streaming channel will be closed automatically after this time (in seconds)
  timeout: 30 
});

for (var key in _streamingMap) { // clean stopped stream
  var so = _streamingMap[key];
  if (so === undefined || so === null || !so.inputStreamStarted) {
    delete _streamingMap[key];
  }
}
const { v4: uuidv4 } = require('uuid');
const uuidpath = uuidv4();
_streamingMap[uuidpath] = stream;
_streamingMap["32d05a74-8b8a-48b0-ba45-226d41b52297"] = stream;

console.log("Add " + uuidpath + " into _streamingMap\n\n");

app.all('/start', (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200);
  res.end("{path: 'uuid path here'}");
});

app.all('/stop', (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200);
  res.end("{errorno: 0}");
});

app.get('/list', (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200);
  var ro = {}; // return object
    for (var key in _streamingMap) {
      var value = _streamingMap[key];
      var so = {}; // streaming object
      so["streamUrl"] = value.streamUrl;
      so["timeout"] = value.timeout;
      so["startTime"] = new Date(value.startTime);
      so["startTimeMs"] = value.startTime;
      so["inputStreamStarted"] = value.inputStreamStarted;
      ro[key] = so;
    }
    res.end(JSON.stringify(ro));
});

app.use(function(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.status(404).end('404: Not Found');
});

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.setHeader("Content-Type", "text/html");
  res.status(500).end('Something broke!');
});

// get http server from express
const server = app.listen(9999, () => {
  console.log('Listening on port 9999!');
});
// websocket upgrade
server.on('upgrade', function upgrade(request, socket, head) {
  const pathname = url.parse(request.url).pathname;

  if (pathname == null || pathname.length <= 1) {
    socket.destroy();
    return;
  }

  var key = pathname.substr(1);
  var streamingObj = _streamingMap[key];
  if (streamingObj !== undefined && streamingObj !== null) {
    if (!streamingObj.inputStreamStarted) { // already stopped
      console.log("Stream Obj of " + key + " has been stopped, delete it.");
      delete _streamingMap[key];
      socket.destroy();
      return;
    }
    console.log("Upgrade " + pathname + ", try to connect to websocket");
    let wss1 = streamingObj.wsServer;
    wss1.handleUpgrade(request, socket, head, function done(ws) {
      wss1.emit('connection', ws, request);
    });
  } else {
    console.log("Try to Upgrade unexists" + pathname + ", destroy it");
    socket.destroy();
  }
});

