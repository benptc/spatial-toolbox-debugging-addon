/**
 * Created by Ben Reynolds on 06/15/20
 * 
 * Copyright (c) 2018 PTC
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// step 1
// all hardware interfaces should start with these 3 lines, to load the APIs and the "enabled" state
var server = require('@libraries/hardwareInterfaces');
var settings = server.loadHardwareInterface(__dirname);
exports.enabled = settings("enabled");

// TODO: create a settings page for this interface and make the objectName configurable
// https://spatialtoolbox.vuforia.com/docs/tutorials/adding-settings-to-hardware-interface
const objectName = 'testObject';
const toolName = 'testTool';
const nodeName = 'testNode';

// wrapping everything in this makes sure it only runs when we've turned on the interface
if (exports.enabled) {

    // this block of code sets up an Express app so that we can host our interface on a web page
    let express = require('express');
    let app = express();
    let bodyParser = require('body-parser');
    // add the middleware for HTTP Cross-Origin sharing and use the CORS cross origin REST model
    // we don't care about security for this debuggin interface so allow requests from all origins
    let cors = require('cors');
    app.use(cors());
    app.options('*', cors());
    // host a static server with all the contents of the public/ directory
    app.use(express.static(__dirname + '/public'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    // we choose an arbitrary port to host this server on. visit localhost:8088 to see the interface
    startHTTPServer(8088);
    
    // step 2 - create the object, tool, and node if they don't already exist
    server.addNode(objectName, toolName, nodeName, 'node', {x: 0, y: 0, scale: 0.5});

    function startHTTPServer(port) {
        let http = require('http').Server(app);
        let io = require('socket.io')(http);

        http.listen(port, function() {
            // wait for a client to connect to the web app before using the hardwareInterface APIs
            io.on('connection', function (socket) {
                
                // step 3 - receive values from the interface
                socket.on('newValueFromExternalSystem', function (msg) {
                    var msgContent = (typeof msg === 'string') ? JSON.parse(msg) : msg;
                    // when we receive a new value from the interface, write it to the node
                    // so that the value propagates across any links and reaches the AR content
                    server.write(objectName, toolName, nodeName, msgContent.value);
                });
                
                // step 4 - send values to the interface
                server.addReadListener(objectName, toolName, nodeName, function (data) {
                    // when the node receives a new value from attached AR content, send it to
                    // the socket to the web frontend so that the external system updates
                    socket.emit('newValueFromEdgeServer', data);
                });
            });
        });
    }
}
