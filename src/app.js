
    //Camera Authentication
    var ip_address = "10.1.0.98"
    //camera username and password
    var username = "rtsp";
    var password="rtsp123456";

    const url = require('url');
    const http = require('http');
    Stream = require('./videoStream');
/*
    Stream = require('./node-rtsp-stream.js');
    const server = http.createServer().listen(9999);
    //A channel of camera stream
    stream = new Stream({
        // streamUrl: 'rtsp://' + username + ':' + password + '@' + ip_address +':554/cam/realmonitor?channel=1&subtype=0&unicast=true&proto=Onvif',
        streamUrl: 'rtsp://' + username + ':' + password + '@' + ip_address +':554/cam/realmonitor?channel=1&subtype=0',
        wsPort: -1 
    });
    server.on('upgrade', function upgrade(request, socket, head) {
  	const pathname = url.parse(request.url).pathname;

  	if (pathname === '/foo') {
console.log("/foo upgrade...");
	  let wss1 = stream.wsServer;
    	  wss1.handleUpgrade(request, socket, head, function done(ws) {
      	    wss1.emit('connection', ws, request);
          });
  	} else if (pathname === '/bar') {
console.log("/bar upgrade...");
            socket.destroy();
        } else {
console.log("other path upgrade... : " + pathname);
            socket.destroy();
        }
    }); 
*/
    stream = new Stream({
        streamUrl: 'rtsp://' + username + ':' + password + '@' + ip_address +':554/cam/realmonitor?channel=1&subtype=0',
        wsPort: 9999 
    });
