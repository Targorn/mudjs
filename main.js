
var PROTO_VERSION = 'DreamLand Web Client/1.7';
var rpccmd = function() {}, send = function() {}, notify = function() {};
var wsUrl = "wss://dreamland.rocks/dreamland";
var options = { "escape_html" : false, "ansi_colors": false };

if(location.hash === '#build') {
    wsUrl = "wss://dreamland.rocks/buildplot";
} else if(location.hash === '#local') {
    wsUrl = "ws://localhost:1234";
}
    var lastLocation, locationChannel, bcastLocation;

$(window).bind('beforeunload', function() {
    return 'leaving already?';
});

$(document).ready(function() {

    var sessionId = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();

    if('BroadcastChannel' in window) {
        locationChannel = new BroadcastChannel('location');

        locationChannel.onmessage = function(e) {
            if(e.data.what === 'where am i' && lastLocation) {
                bcastLocation();
            }
        };
    }

    bcastLocation = function () {
        if(locationChannel) {
            locationChannel.postMessage({
                what: 'location',
                location: lastLocation,
                sessionId: sessionId
            });
        }
    };

    $('#map-button').click(function(e) {
        if(!lastLocation) {
            e.preventDefault();
            return;
        }

        var mapfile = '/maps/' + lastLocation.area.replace(/\.are$/, '') + '.html?sessionId=' + sessionId;
        window.open(mapfile);
        e.preventDefault();
    });

    function process(s) {
        $('#terminal').trigger('output', [s]);
    }

    function connect() {
        ws = new WebSocket(wsUrl, ['binary']);

        var telnet = new Telnet();

        telnet.handleRaw = function(s) {
            process(s);
        }

        var handlers = {
            'console_out': function(b) {
                telnet.process(b);
            },
            'notify': function(b) {
                notify(b);
            },
            'alert': function(b) {
                alert(b);
            },
            'prompt': function(b) {
                promptHandler(b);
            },
            'version': function(b) {
                if(b !== PROTO_VERSION) {
                    process('\n\u001b[1;31mВерсия клиента (' + PROTO_VERSION + ') не совпадает с версией сервера (' + b + ').\n' +
                            'Обнови страницу, если не поможет - почисти кеши.\u001b[0;37m\n');
                    ws.close();
                }
            },
            'editor_open': function(b) {
                texteditor(b)
                    .then(function(text) {
                        rpccmd('editor_save', text);
                    });
            },
            'cs_edit': function(subj, body) {
                csEdit(subj, body);
            }
        };

        ws.binaryType = 'arraybuffer';
        ws.onmessage = function(e) {
            var b = new Uint8Array(e.data);
            b = String.fromCharCode.apply(null, b);
            b = decodeURIComponent(escape(b));
            b = JSON.parse(b);
            var h = handlers[b.command];
            if(h) {
                h.apply(handlers, b.args);
            } else {
                console.log('Dont know how to handle ' + b.command);
            }
        }
        ws.onopen = function(e) {
            send('1'); // use internal encoding (koi8). All WebSocket IO is converted to/from UTF8 at the transport layer.
        }
        ws.onclose = function(e) {
            process('\u001b[1;31m#################### DISCONNECTED ####################\u001b[0;37m\n');
            $('#reconnect').show();
            $('#input input').hide();
            ws = null;
        }

        rpccmd = function(cmd) {
            ws.send(JSON.stringify({
                command: cmd,
                args: Array.prototype.slice.call(arguments, 1)
            }));
        }

        send = function(text) {
            rpccmd('console_in', text + '\n');
        }

        process('Connecting....\n');
        $('#reconnect').hide();
        $('#input input').show();
    }

    terminalInit()
        .then(function() {
            connect();
        })
        .catch(function(e) {
            console.log(e);
        });

    $('#reconnect').click(function(e) {
        e.preventDefault();
        connect();
    });

    $('body').on('keydown', function(e) {
        var input = $('#input input');

        // dont autofocus if modal dialog is present
        if($('body.modal-open').length != 0)
            return;

        if(e.ctrlKey || e.altKey)
            return;

        if(input.is(':focus'))
            return;

        input.focus();
    });


    if('Notification' in window) {
        Promise.resolve(Notification.permission)
            .then(function(perm) {
                if(perm === 'granted') {
                    return perm;
                } else {
                    return Notification.requestPermission();
                }
            })
            .then(function(perm) {
                if(perm === 'granted') {
                    notify = function(text) {
                        if(document.hidden) {
                            new Notification(text);
                        }
                    }
                }
            });
    }

    /*
     * Handlers for plus-minus buttons to change terminal font size.
     */ 
    var fontDelta = 2;
    
    function changeFontSize(delta) {
        var style = terminal.css('font-size'); 
        var fontSize = parseFloat(style); 
        terminal.css('font-size', (fontSize + delta) + 'px');
    }

    $('#font-plus-button').click(function(e) {
        e.preventDefault();
        changeFontSize(fontDelta);
    });

    $('#font-minus-button').click(function(e) {
        e.preventDefault();
        changeFontSize(-fontDelta);
    });

    /*
     * Handlers for 'keypad' key area.
     */
    // Long press: open/close direction etc.
    var btnTimer;
    var wasLongPress = false;
    var longPressDelay = 800;

    $('.btn-keypad').on('touchstart', function(e) {
        wasLongPress = false;

        // Send specified long-cmd once the delay has elapsed.
        btnTimer = setTimeout(function() {
            btnTimer = null;
            wasLongPress = true;
            var btn = $(e.currentTarget), cmd = btn.data('long-cmd');
            if (cmd) {
                send(cmd);
            }

        }, longPressDelay);

    }).on('touchend', function(e) {
        if (btnTimer)  
            clearTimeout(btnTimer);
    });

    // Single click: go direction, look etc.`
    $('.btn-keypad').click(function(e) {
        if (wasLongPress)
            return;

        e.preventDefault();
        var btn = $(e.currentTarget), cmd = btn.data('cmd');

        if (cmd) {
            send(cmd);
        }
    });

});

