
const $ = require('jquery');

require('brace');
require('brace/theme/monokai');
require('devbridge-autocomplete');

var websock = require('./websock');

// Help keyword and id lookup inside webedit (if you run 'webedit help'):
function initHelpIds() {
    var heditLookup = $('#textedit-modal input');

    $.get("hedit.json", function(data) { 
        console.log('Retrieved', data.length, 'help ids.');
        
        var topics = $.map(data, function(dataItem) { 
            return {value: dataItem.id + ': ' + dataItem.kw.toLowerCase(), 
                    data: dataItem.id}; 
        });
        
        heditLookup.autocomplete({ 
            lookup: topics, 
            lookupLimit: 20, 
            autoSelectFirst: true, 
            showNoSuggestionNotice: true, 
            noSuggestionNotice: 'Справка не найдена', 
            onSelect: function(suggestion) { 
                $('#textedit-modal .editor').focus();
            } 
        }); 

    }, 'json').fail(function() {
        console.log('Cannot retrieve help ids.');
        $('#textedit-modal input').hide();
    }); 
}

$(document).ready(function() {
    var editor = global.ace.edit($('#textedit-modal .editor')[0]);
    editor.$blockScrolling = Infinity
    const edit = document.getElementById('textedit-modal')
    if (edit) {
        edit.addEventListener('paste', (e) => {
            e.preventDefault()
            const data = (e.clipboardData || window.clipboardData).getData('text')
            const strLength = 80
            if (data.length > strLength) {
                let text = ''
                let end = false
                let counter = 0
                const wordsArr = data.split(/(\s)/)
                for (const word of wordsArr) {
                    counter += word.length
                    if (counter > strLength) {
                        text += '\n'
                        counter = word.length
                        end = true
                    }
                    if (!end) {
                        text += word
                    } else {
                        end = !end
                        if (word.match(/\s/)) {
                            counter = 0
                        } else {
                            text += word
                        }
                    }
                    
                }
                editor.setValue(text)
            }
        })
    }

    editor.setTheme('ace/theme/monokai');

    $('#rpc-events').on('rpc-editor_open', function(e, text, arg) {
        editor.setValue(text);
        $('#textedit-modal').modal('show');

        
        if (arg === 'help') {
            $('#textedit-modal input').show();
            initHelpIds();
        }
        else
            $('#textedit-modal input').hide();

        $('#textedit-modal .save-button')
            .off()
            .click(function(e) {
                e.preventDefault();
                websock.rpccmd('editor_save', editor.getValue());
            });

        $('#textedit-modal .cancel-button')
            .off()
            .click(function(e) {
                e.preventDefault();
            });

    });

});
