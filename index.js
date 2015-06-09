/**
 * Created by dtevandijk on 09-06-15.
 */

var express = require('express');
var app = express();
var Firebase = require("firebase");
var async = require("async");
var util = require('util');
var _und = require('underscore');

var Timer = require('clockmaker').Timer,
    Timers = require('clockmaker').Timers;

app.set('port', process.env.PORT || 3002);

if (app.settings.env === 'development') process.env.NODE_ENV = 'development';

app.listen(app.get('port'), function() {
    console.log('App is Up at ' + app.get('port') + ' as ' + process.env.NODE_ENV);
});

function runslider (objectItem) {

    var _len;
    var _queue;
    var _prio;
    var highp;
    var latestv;

    var refAll = new Firebase("https://me-do.firebaseio.com/").child('events').child(objectItem).child('pictures').child('all');
    var refQueue = new Firebase("https://me-do.firebaseio.com/").child('events').child(objectItem).child('pictures').child('queue');
    var curItem = new Firebase("https://me-do.firebaseio.com/").child('events').child(objectItem).child('pictures').child('curItem');

    _prio = refAll.limitToLast(1);
    latestv = refAll.limitToLast(50);

    latestv.once('value', function (s) {
        _all = _und.map(s.val(), function (i,val) { i.$id = val; return i; });
    })

    refQueue.once('value', function (s) {
        _queue = _und.map(s.val(), function (i,val) { i.$id = val; return i; });
    })

    _prio.once('child_added', function (s) {
        _highp = s.getPriority();
    })

    if ( _queue.length === 0 ) {
        try {
            if ( _all.length === 0 ) { return; }
            async.parallel([function(callback) {
                curItem.set(_und.omit(_all[0], '$id'));
            }, function (callback) {
                refAll.child(_all[0].$id).setPriority(_highp+1);
            }]);
        } catch(err) {
            console.log(err);
            return;
        }
    } else {
        curItem.set(_und.omit(_queue[0], '$id'));
        refQueue.child(_queue[0].$id).remove();
    }

    refAll = null;
    _all = null;
    _queue = null;
    _highp = null;
    latestv = null;
}

var ref = new Firebase("https://me-do.firebaseio.com/events");
sliders = ref.orderByChild("status").startAt(true);

var sliderList;

sliders.on('value', function ( snap ) {
    sliderList = snap.val();
});

new Timer(function(timer) {

    async.each(Object.keys(sliderList), function (item, callback) {
        runslider(item);
        setImmediate(callback);
    }, function () {

    });

}, 5000, {
    repeat: true
}).start();

new Timer(function(timer) {
    global.gc();
    //console.log(util.inspect(process.memoryUsage()));
}, 20000, {
    repeat: true
}).start();
