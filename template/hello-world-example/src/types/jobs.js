"use strict";
/* eslint-disable new-cap */
exports.__esModule = true;
exports.filterJobInput = void 0;
var t = require("runtypes");
var runtypes_filter_1 = require("runtypes-filter");
var JobInput = t.Record({
    hirer: t.Record({
        id: t.String
    })
});
exports.filterJobInput = (0, runtypes_filter_1["default"])(JobInput);
