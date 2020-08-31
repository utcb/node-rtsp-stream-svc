var _streamingMap = {}; // {key: value} => {uuid path: node-rtsp-stream object}

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
const cors = require('cors');
app.use(cors()); // CORS-enabled for all origins

const url = require('url');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
Stream = require('./videoStream');

const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/data.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to sqlite3 database data/data/db');
});
/* test database query
 *
db.all('select * from device', (err, rows) => {
  if (err) {
    throw err;
  }
  console.log(rows);
});
*/

app.all('/start', (req, res) => {
  let devid = req.query.id;
  let devtoken = req.query.token;
  if (!devid || !devtoken ) {
    res.setHeader("Content-Type", "text/html");
    return res.status(404).end('404: Not Found');
  }
  let devduration = req.query.duration;
  let devsize = req.query.size;

  db.get('select * from device where id = ?', [devid], (err, row) => {
    if (err) {
      console.error(err.message);
      res.setHeader("Content-Type", "text/html");
      return res.status(500).end('Something broke!');
    }
    if (row) { // found
      let token = row.token;
      if (devtoken === row.token) { // matched
        console.log(`Found ${devid} and token matched`);
        let duration = null; // timeout: streaming channel will be closed automatically after this time (in seconds)
        if (devduration) {
          duration = devduration;
        } else if (row.duration) {
          duration = row.duration;
        }
        if (duration == null) {
          duration = 60;
        } else if (duration < 30) {
          duration = 30;
        } else if (duration > 180) {
          duration = 180;
        }
        let size = null;
        if (devsize) {
          size = devsize;
        }
        let ffmpegOpt = {
          '-q': 8,
          '-bf': 0
        };
        if (size) {
          ffmpegOpt['-s'] = size;
        }
        for (var key in _streamingMap) { // clean stopped stream
          var so = _streamingMap[key];
          if (so === undefined || so === null || !so.inputStreamStarted) {
            delete _streamingMap[key];
          }
        }
        let uuidpath = uuidv4(); // ws path
        // new streaming
        let stream = new Stream({
          streamUrl: row.url,
          ffmpegOptions: ffmpegOpt,
          wsPort: -1,
          timeout: duration 
        });
        _streamingMap[uuidpath] = stream;
        _streamingMap[uuidpath].on('exitWithError', () => {
          if (_streamingMap[uuidpath]) {
            console.log(`exitWithError: delete [${uuidpath}] from _streamingMap`);
            delete _streamingMap[uuidpath];
          }
        });
        console.log("Add " + uuidpath + " into _streamingMap");
        res.setHeader("Content-Type", "application/json");
        res.status(200);
        let retobj = {
          path: uuidpath,
          startTimeMs: stream.startTime,
          timeout: duration
        };
        return res.end(JSON.stringify(retobj));
      } else {
        console.warn(`Found ${devid} but token not matched`);
        res.setHeader("Content-Type", "text/html");
        return res.status(403).end('403: Forbidden');
      }
    } else { // not found
      res.setHeader("Content-Type", "text/html");
      return res.status(404).end('404: Not Found');
    }
  });
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
function handle_sig(signal) {
  console.log(`Recieve ${signal}`);
  server.close();
  // close all stream
  for (var key in _streamingMap) {
    var so = _streamingMap[key];
    if (so !== undefined && so !== null) {
      console.log("Stop stream: " + so.streamUrl)
      so.stop();
    }
  }
  db.close(err => {
    if (err) {
      console.error(err.message);
    }
    console.log("Database is closed");
    console.log('Process terminated')
    process.exit();
  });
};
process.on('SIGINT', handle_sig); // ctrl+c
process.on('SIGTERM', handle_sig); // gracefully

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

