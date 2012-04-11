#!/usr/bin/env ringo

var sqlite = require('.');
var c = sqlite.open('./test.db');
var rows = c.all('select a as joe, max(b, 2) from m')

require('ringo/shell').start()
