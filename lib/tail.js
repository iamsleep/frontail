'use strict';
var EventEmitter = require('events').EventEmitter;
var childProcess = require('child_process');
var util = require('util');
var CBuffer = require('CBuffer');
var Tail = function(path, options) {
    EventEmitter.call(this);
    options = options || {
        buffer: 0
    };
    this._buffer = new CBuffer(options.buffer);
    var tail;
    var servers = options.ssh.remoteHost.split(',');
    for (var x = 0, len = servers.length; x < len; x++) {
        var server = servers[x];
        var spath = path[x];
        if (options.ssh) {
            var args = [
                //options.ssh.remoteUser + '@' + options.ssh.remoteHost,
                options.ssh.remoteUser + '@' + server, '-p', options.ssh.remotePort, 'tail -F'
            ].concat(spath);
            tail = childProcess.spawn('ssh', args);
        } else {
            tail = childProcess.spawn('tail', ['-n', options.buffer, '-F'].concat(spath));
        }
        tail.stderr.on('data', function(data) {
            //if there is any error then display it in the console and then kill the tail.
            console.error(data.toString());
            //process.exit();
        });
        tail.stdout.on('data', function(data) {
            var lines = data.toString('utf-8').split('\n');
            lines.pop();
            lines.forEach(function(line) {
                this._buffer.push('host ' + server + " " + line);
                this.emit('line', 'host ' + server + " " + line);
            }.bind(this));
        }.bind(this));
        process.on('exit', function() {
            tail.kill();
        });
    }
};
util.inherits(Tail, EventEmitter);
Tail.prototype.getBuffer = function() {
    return this._buffer.toArray();
};
module.exports = function(path, options) {
    return new Tail(path, options);
};
