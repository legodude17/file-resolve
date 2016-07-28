"use strict";
var file = require('.');
var index = file('./index.js');
var fs = require('fs');
var assert = require('assert');
index.text.get().then(function (txt) {
  assert(fs.readFileSync('index.js') === txt);
});
index.text.set('hello');
file.resolve(function () {
  index.text.get().then(function (txt) {
    assert(txt === 'hello');
  });
});