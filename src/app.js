    console.log("app.js beginning================================\n");
    var _streamingMap = {};
    //Camera Authentication
    var ip_address = "10.1.0.98"
    //camera username and password
    var username = "rtsp";
    var password="rtsp123456";

    const url = require('url');
    const http = require('http');
    Stream = require('./videoStream');
    //A channel of camera stream
    stream = new Stream({
        // streamUrl: 'rtsp://' + username + ':' + password + '@' + ip_address +':554/cam/realmonitor?channel=1&subtype=0&unicast=true&proto=Onvif',
        streamUrl: 'rtsp://' + username + ':' + password + '@' + ip_address +':554/cam/realmonitor?channel=1&subtype=0',
        // wsPort: 9999 
        wsPort: -1,
	// timeout: streaming channel will be closed automatically after this time (in seconds)
	timeout: 60
    });
    const { v4: uuidv4 } = require('uuid');
    const uuidpath = uuidv4();
    _streamingMap[uuidpath] = stream;
    console.log("Add " + uuidpath + " into _streamingMap\n\n");
    const server = http.createServer().listen(9999);
    server.on('upgrade', function upgrade(request, socket, head) {
  	const pathname = url.parse(request.url).pathname;

	if (pathname == null || pathname.length <= 1) {
	  socket.destroy();
	  return;
	}
	console.log("on(\"upgrade\") for " + pathname + "\n\n");
	var streamingObj = _streamingMap[pathname.substr(1)];
	if (streamingObj != null) {
	  console.log("on(\"upgrade\") for " + pathname + ", try to connect to websocket\n");
	  let wss1 = streamingObj.wsServer;
    	  wss1.handleUpgrade(request, socket, head, function done(ws) {
      	    wss1.emit('connection', ws, request);
          });
	} else {
	  console.log("on(\"upgrade\") for " + pathname + ", no streaming, destroy...\n");
          socket.destroy();
	}
    }); 

