'use strict';
var files = [];
var request = require('request');
var fs = require('fs');
function file(place) {
  if (typeof place !== 'string') {
    throw new TypeError('Expected path to be a string. Got a ' + typeof place + '.');
  }
  var type = 'fs';
  if (place.indexOf('http') === 0) {
    type = 'url';
  }
  var res = {
    place: place,
    type: type,
    text: null,
    line: null,
    changes: [],
    listeners: [],
    lines: [],
    resolved: false,
    resolve: resolve,
    _update: update,
    save: save
  };
  files.push(res);
  res.text = text(res);
  res.line = lines(res);
  return res;
}
module.exports = file;
file.resolve = function (cb) {
  var count = 0, len = files.length;
  files.forEach(function (v) {
    count++;
    v.resolve(function () {
      if (count >= len) {
        cb();
      }
    });
  });
};
function text(parent) {
  return {
    parent: parent,
    get: getText,
    set: setText
  };
}
function lines(parent) {
  return {
    parent: parent,
    get: getLine,
    set: setLine
  };
}
function getText() {
  return new Promise(function (resolve, reject) {
    if (this.parent.resolved) {
      resolve(this.parent.lines.join('\n'));
    } else {
      this.parent.listeners.push(function (err) {
        if (err) {
          reject(err);
        }
        resolve(this.parent.lines.join('\n'));
      }.bind(this));
    }
  }.bind(this));
}
function getLine(n) {
  return new Promise(function (resolve, reject) {
    if (this.parent.resolved) {
      resolve(this.parent.lines[n]);
    } else {
      this.parent.listeners.push(function (err) {
        if (err) {
          reject(err);
        }
        resolve(this.parent.lines[n]);
      }.bind(this));
    }
  }.bind(this));
}
function setText(text) {
  this.parent.changes.push(change('text', text));
  if (this.parent.resolved) {
    this._update();
  }
}
function change(type, text, line) {
  return {
    type: type,
    text: text,
    line: line || 'all'
  };
}
function setLine(line, text) {
  this.parent.changes.push(change('line', text, line));
  if (this.parent.resolved) {
    this._update();
  }
}
function resolve(cb) {
  if (this.type === 'url') {
    request(this.place, function (error, response, body) {
      if (error) {
        this.listeners.forEach(function (v) {
          v(error);
        });
        this.listeners.length = 0;
        return cb(error);
      }
      this.lines = body.split('\n');
      this._update();
      this.resolved = true;
      cb();
    }.bind(this));
  } else {
    fs.readFile(this.place, {encoding: 'utf-8'}, function (error, body) {
      if (error) {
        this.listeners.forEach(function (v) {
          v(error);
        });
        this.listeners.length = 0;
        return cb(error);
      }
      this.lines = body.split('\n');
      this._update();
      this.resolved = true;
      cb();
    }.bind(this));
  }
}
function resolveChange(file, change) {
  if (change.type === 'text') {
    file.lines = change.text.split('\n');
  } else {
    file.lines[change.line] = change.text;
  }
}
function update() {
  this.listeners.forEach(function (v) {
    v();
  });
  this.changes.forEach(function (v) {
    resolveChange(this, v);
  }.bind(this));
  this.listeners.length = this.changes.length = 0;
}
function save(cb) {
  if (!this.resolved) {
    throw new Error('File must be resolved before saving. Call file.resolve().');
  }
  if (this.type === 'url') {
    request.post(this.place, {body: this.lines.join('\n')},function (error) {
      if (error) {
        return cb(error);
      }
      cb();
    });
  } else {
    fs.writeFile(this.place, {encoding: 'utf-8'}, function (error) {
      if (error) {
        return cb(error);
      }
      cb();
    });
  }
}