define(function(require, exports, module) {
    "use strict";

    console.log("initializing editor");

    require("ace/lib/fixoldbrowsers");

    var config = require("ace/config");
    config.init();

    var env = {};
    var app = {};

    var $ = require("jquery");
    //set sftp parameters from cookie
    $("#username").val(readCookie("username"));
    $("#password").val(readCookie("password"));
    $("#directory").val(readCookie("directory"));
    $("#host").val(readCookie("host"));

    //click event for settings
    $("#settings").click(function() {
        $("#menu-toggle").toggle();
    });

    var boot = require("bootstrap");
    //context menu for fileTreeView
    var context = require("context");
    context.init({
        fadeSpeed: 100,
        above: 'auto',
        compress: false
    });
    context.attach('.node-name', [{
        text: "New Folder"
        , action: function() {
            $("#newFolderModal").modal();
        }        
    }, {
        text: "New File"
        , action: function() {
            $("#newFileModal").modal();
        }
    }, {
        text: "Delete"
        , action: function() {
            $("#deleteFolderName").html(lastContextFolderName);
            $("#removeFolderModal").modal();
        }        
    }]);  
    context.attach('.file-name', [{
        text: "Save"
    }, {
        text: "Delete"
    }]); 

    //context menu event for folder
    $(document).on("contextmenu", ".node-name", function(e){
       console.log("new file context opened");
       //set this variables to use in new folder and new file
       window.lastContextFolderName = $(e.target).prev().attr("data-location");
       window.lastContextFolderDOM = $(e.target).parent().parent();
    });
    //context menu event for file
    $(document).on("contextmenu", ".file-name", function(e){
       console.log("delete file context opened");
       window.lastContectFile = $(e.target).attr("data-location");
    });

    //create file click event
    $("#create-file").click(function() {
        var fileName = window.lastContextFolderName + "/" + $("#fileName").val();
        $.ajax({
            type: "POST",
            url: "/sftp/touch",
            data: {
                name : fileName
            },
            dataType: "json",
            success: function(resp){
                //insert the shit
                window.lastContextFolderDOM.find('.files-container').append(
                '<div id="file-' + randString(5) +
                '" class="file-name" style="margin-left:' + '12px" data-location="'+
                fileName + '">' + $("#fileName").val() + '</div>');

                // window.lastContextFolderDOM.find(".toggle-folder")                
                $("#newFileModal").modal('hide');
                if(!window.lastContextFolderDOM.find('.files-container').is(':visible')) {
                    window.lastContextFolderDOM.find('.toggle-folder').first().click();
                }
            }
        });
    });

    //create folder click event
    $("#create-folder").click(function() {
        var fileName = window.lastContextFolderName + "/" + $("#folderName").val();
        $.ajax({
            type: "POST",
            url: "/sftp/mkdir",
            data: {
                name : fileName
            },
            dataType: "json",
            success: function(resp){
                //insert the shit
                window.lastContextFolderDOM.find(".folders-container").first().append(
                    '<div class="tree-node" style="padding-left:12px;">' +
                      '<div class="name-info">' +
                        '<span class="toggle-folder" data-fetched="0" data-location="'+fileName+'">&#9654;</span>' +
                        '<span class="node-name">' + $("#folderName").val() + '</span>' +
                      '</div>' +
                      '<div class="folders-container" style="display:none;">'+
                      '</div>' +
                      '<div class="files-container" style="display:none;">'+
                      '</div>'+            
                    '</div>'
                );
                // window.lastContextFolderDOM.find(".toggle-folder")                
                $("#newFolderModal").modal('hide');
                if(!window.lastContextFolderDOM.find('.folders-container').is(':visible')) {
                    window.lastContextFolderDOM.find('.toggle-folder').first().click();
                }
            }
        });
    });

    //delete folder click event
    $("#delete-folder").click(function() {
        var fileName = window.lastContextFolderName;
        $.ajax({
            type: "POST",
            url: "/sftp/rmdir",
            data: {
                name : fileName
            },
            dataType: "json",
            success: function(resp){
                //insert the shit
                // window.lastContextFolderDOM.find(".folders-container").first().append(
                //     '<div class="tree-node" style="padding-left:12px;">' +
                //       '<div class="name-info">' +
                //         '<span class="toggle-folder" data-fetched="0" data-location="'+fileName+'">&#9654;</span>' +
                //         '<span class="node-name">' + $("#folderName").val() + '</span>' +
                //       '</div>' +
                //       '<div class="folders-container" style="display:none;">'+
                //       '</div>' +
                //       '<div class="files-container" style="display:none;">'+
                //       '</div>'+            
                //     '</div>'
                // );
                // // window.lastContextFolderDOM.find(".toggle-folder")   
                window.lastContextFolderDOM.remove();             
                $("#removeFolderModal").modal('hide');
                // if(!window.lastContextFolderDOM.find('.folders-container').is(':visible')) {
                //     window.lastContextFolderDOM.find('.toggle-folder').first().click();
                // }
            }
        });
    });
    //file tabs view;
    window.app = app;
    var tabs = require('js/views/FileTabs');
    window.app.FileTabs = new tabs({});

    var dom = require("ace/lib/dom");
    // var net = require("ace/lib/net");
    // var lang = require("ace/lib/lang");
    // var useragent = require("ace/lib/useragent");

    var theme = require("ace/theme/textmate");
    var EditSession = require("ace/edit_session").EditSession;
    var UndoManager = require("ace/undomanager").UndoManager;

    var HashHandler = require("ace/keyboard/hash_handler").HashHandler;

    var Renderer = require("ace/virtual_renderer").VirtualRenderer;
    var Editor = require("ace/editor").Editor;
    var MultiSelect = require("ace/multi_select").MultiSelect;
    
    var whitespace = require("ace/ext/whitespace");

    var doclist = require("./doclist");
    window.modelist = require("ace/ext/modelist");
    var layout = require("./layout");
    var TokenTooltip = require("./token_tooltip").TokenTooltip;
    var util = require("./util");
    var saveOption = util.saveOption;
    var fillDropdown = util.fillDropdown;
    var bindCheckbox = util.bindCheckbox;
    var bindDropdown = util.bindDropdown;

    var ElasticTabstopsLite = require("ace/ext/elastic_tabstops_lite").ElasticTabstopsLite;

    var IncrementalSearch = require("ace/incremental_search").IncrementalSearch;

    /*********** create editor ***************************/
    var containerWrapper = document.getElementById("editor-container");
    var container = document.createElement('div');
    container.className = 'editor-class';
    //container.setAttribute("id", self.options.id || "no-id");
    containerWrapper.appendChild(container);

    //crate tab
    //$("#editor-tabs").append('<li data-link="'+self.options.id+'">'+'asdjaalskd'+'</li>');

    // Splitting.
    var Split = require("ace/split").Split;
    var split = new Split(container, theme, 1);
    env.editor = split.getEditor(0);
    split.on("focus", function(editor) {
        env.editor = editor;
        updateUIEditorOptions();
    });
    env.split = split;
    window.envs = []
    window.env = env;
    window.envs.push(env);
    window.ace = env.editor;
    //env.editor.setAnimatedScroll(true);

    // add multiple cursor support to editor
    require("ace/multi_select").MultiSelect(env.editor);
    env.editor.session.setUndoManager(new UndoManager);
    //keep default session for later use
    env.defaultSession = env.editor.session;
    env.noFile = true;

    var consoleEl = dom.createElement("div");
    container.parentNode.appendChild(consoleEl);
    consoleEl.style.cssText = "position:fixed; bottom:1px; right:0;\
    border:1px solid #baf; z-index:100";

    var cmdLine = new layout.singleLineEditor(consoleEl);
    cmdLine.editor = env.editor;
    env.editor.cmdLine = cmdLine;

    env.editor.showCommandLine = function(val) {
        this.cmdLine.focus();
        if (typeof val == "string")
            this.cmdLine.setValue(val, 1);
    };

    /**
     * This demonstrates how you can define commands and bind shortcuts to them.
     */
    env.editor.commands.addCommands([{
        name: "gotoline",
        bindKey: {win: "Ctrl-L", mac: "Command-L"},
        exec: function(editor, line) {
            if (typeof line == "object") {
                var arg = this.name + " " + editor.getCursorPosition().row;
                editor.cmdLine.setValue(arg, 1);
                editor.cmdLine.focus();
                return;
            }
            line = parseInt(line, 10);
            if (!isNaN(line))
                editor.gotoLine(line);
        },
        readOnly: true
    }, {
        name: "snippet",
        bindKey: {win: "Alt-C", mac: "Command-Alt-C"},
        exec: function(editor, needle) {
            if (typeof needle == "object") {
                editor.cmdLine.setValue("snippet ", 1);
                editor.cmdLine.focus();
                return;
            }
            var s = snippetManager.getSnippetByName(needle, editor);
            if (s)
                snippetManager.insertSnippet(editor, s.content);
        },
        readOnly: true
    }, {
        name: "focusCommandLine",
        bindKey: "shift-esc|ctrl-`",
        exec: function(editor, needle) { editor.cmdLine.focus(); },
        readOnly: true
    }
    // , {
    //     name: "nextFile",
    //     bindKey: "Ctrl-tab",
    //     exec: function(editor) { doclist.cycleOpen(editor, 1); },
    //     readOnly: true
    // }, {
    //     name: "previousFile",
    //     bindKey: "Ctrl-shift-tab",
    //     exec: function(editor) { doclist.cycleOpen(editor, -1); },
    //     readOnly: true
    // }
    , {
        name: "execute",
        bindKey: "ctrl+enter",
        exec: function(editor) {
            try {
                var r = eval(editor.getCopyText()||editor.getValue());
            } catch(e) {
                r = e;
            }
            editor.cmdLine.setValue(r + "")
        },
        readOnly: true
    }, {
        name: "showKeyboardShortcuts",
        bindKey: {win: "Ctrl-Alt-h", mac: "Command-Alt-h"},
        exec: function(editor) {
            config.loadModule("ace/ext/keybinding_menu", function(module) {
                module.init(editor);
                editor.showKeyboardShortcuts()
            })
        }
    }]);


    env.editor.commands.addCommands(whitespace.commands);

    cmdLine.commands.bindKeys({
        "Shift-Return|Ctrl-Return|Alt-Return": function(cmdLine) { cmdLine.insert("\n"); },
        "Esc|Shift-Esc": function(cmdLine){ cmdLine.editor.focus(); },
        "Return": function(cmdLine){
            var command = cmdLine.getValue().split(/\s+/);
            var editor = cmdLine.editor;
            editor.commands.exec(command[0], editor, command[1]);
            editor.focus();
        }
    });

    cmdLine.commands.removeCommands(["find", "gotoline", "findall", "replace", "replaceall"]);

    var commands = env.editor.commands;
    commands.addCommand({
        name: "save",
        bindKey: {win: "Ctrl-S", mac: "Command-S"},
        exec: function() {
            var id = $('li.active').attr('id').split('_')[0]
                , content = env.editor.session.getValue()
                , fileName = window.app.FileTabs.openTabs.get(id).get('location');

            if(typeof fileName === "undefined") {
                return;
            }
            var text = "Saving file " + fileName
            var writeInterval = setInterval(function(){
                text = text + "."
                env.editor.cmdLine.setValue(text);
            }, 30) 
            //if there is no change don't save but show a fake save animation :)
            var session = window.app.FileTabs.sessions.get(id);
            if(session.get('value') === session.get('session').getValue()) {
                setTimeout(function() {
                    clearInterval(writeInterval);
                    env.editor.cmdLine.setValue(fileName + " successfully saved");
                }, 1500);
                return;
            }
            $.ajax({
                type: 'POST'
                , data: {
                  content: content
                  , name: fileName
                }
                , dataType: 'json'
                , url: '/sftp/write'
                , success: function(resp){
                    clearInterval(writeInterval);
                    if(resp.success){
                        env.editor.cmdLine.setValue(fileName + " successfully saved");
                    }
                    //sync session value with collection
                    session.set('value', content);
                    //change filename span *
                    var span = $('#' + id + '_tab').find('span').first();
                    span.html(session.get('filename'));
                }
            });            
        }
    });

    var keybindings = {
        ace: null, // Null = use "default" keymapping
        vim: require("ace/keyboard/vim").handler,
        emacs: "ace/keyboard/emacs",
        // This is a way to define simple keyboard remappings
        custom: new HashHandler({
            "gotoright":      "Tab",
            "indent":         "]",
            "outdent":        "[",
            "gotolinestart":  "^",
            "gotolineend":    "$"
        })
    };



    /*********** manage layout ***************************/
    var consoleHeight = 20;
    function onResize() {

        var left = env.split.$container.offsetLeft;
        var width = document.documentElement.clientWidth;
        //container.style.width = "100%";
        container.style.height = document.documentElement.clientHeight - consoleHeight - 45 + "px";
        env.split.resize();

        console.log("window resize", width);
        consoleEl.style.width = width + "px";

        var editMenu = document.getElementById("menu-toggle");
        editMenu.style.height = document.documentElement.clientHeight - consoleHeight + "px";
        cmdLine.resize();

        $("#start-sftp").click(function(){
            $.ajax({
                type: "POST",
                data: {
                  username: $("#username").val(),
                  password: $("#password").val(),
                  root: $("#directory").val(),
                  host: $("#host").val()
                },

                dataType: "json",
                url: "/sftp",

                success: function(resp){
                    createCookie("username", $("#username").val(), 2);
                    createCookie("password", $("#password").val(), 2);
                    createCookie("directory", $("#directory").val(), 2);
                    createCookie("host", $("#host").val(), 2);

                    var FileTreeView = require("js/views/FileTreeView");
                    window.fileTreeView = new FileTreeView(resp.tree);
                    $("#myModal").modal("hide");
                }
            });
        });

    }

    //window.onresize = onResize;
    onResize();

    /*********** options panel ***************************/
    var docEl = document.getElementById("doc");
    //var modeEl = document.getElementById("mode");
    var wrapModeEl = document.getElementById("soft_wrap");
    var themeEl = document.getElementById("theme");
    var foldingEl = document.getElementById("folding");
    var selectStyleEl = document.getElementById("select_style");
    var highlightActiveEl = document.getElementById("highlight_active");
    var showHiddenEl = document.getElementById("show_hidden");
    var showGutterEl = document.getElementById("show_gutter");
    var showPrintMarginEl = document.getElementById("show_print_margin");
    var highlightSelectedWordE = document.getElementById("highlight_selected_word");
    var showHScrollEl = document.getElementById("show_hscroll");
    var animateScrollEl = document.getElementById("animate_scroll");
    var softTabEl = document.getElementById("soft_tab");
    var behavioursEl = document.getElementById("enable_behaviours");

    //fillDropdown(docEl, doclist.all);

    //fillDropdown(modeEl, modelist.modes);
    //var modesByName = modelist.modesByName;
    // bindDropdown("mode", function(value) {
    //     env.editor.session.setMode(modesByName[value].mode || modesByName.text.mode);
    //     env.editor.session.modeName = value;
    // });

    doclist.history = doclist.docs.map(function(doc) {
        return doc.name;
    });
    doclist.history.index = 0;
    doclist.cycleOpen = function(editor, dir) {

        var h = this.history
        h.index += dir;
        if (h.index >= h.length) 
            h.index = 0;
        else if (h.index <= 0)
            h.index = h.length - 1;
        var s = h[h.index];
        docEl.value = s;
        docEl.onchange();
        h.index
    }
    doclist.addToHistory = function(name) {
        var h = this.history
        var i = h.indexOf(name);
        if (i != h.index) {
            if (i != -1)
                h.splice(i, 1);
            h.index = h.push(name);
        }
    }

    // bindDropdown("doc", function(name) {
    //     doclist.loadDoc(name, function(session) {
    //         if (!session)
    //             return;
    //         doclist.addToHistory(session.name);
    //         session = env.split.setSession(session);
    //         whitespace.detectIndentation(session);
    //         updateUIEditorOptions();
    //         env.editor.focus();
    //     });
    // });


    function updateUIEditorOptions() {
        var editor = env.editor;
        var session = editor.session;

        session.setFoldStyle(foldingEl.value);

        // saveOption(docEl, session.name);
        // saveOption(modeEl, session.modeName || "text");
        saveOption(wrapModeEl, session.getUseWrapMode() ? session.getWrapLimitRange().min || "free" : "off");

        saveOption(selectStyleEl, editor.getSelectionStyle() == "line");
        saveOption(themeEl, editor.getTheme());
        saveOption(highlightActiveEl, editor.getHighlightActiveLine());
        saveOption(showHiddenEl, editor.getShowInvisibles());
        saveOption(showGutterEl, editor.renderer.getShowGutter());
        saveOption(showPrintMarginEl, editor.renderer.getShowPrintMargin());
        saveOption(highlightSelectedWordE, editor.getHighlightSelectedWord());
        saveOption(showHScrollEl, editor.renderer.getHScrollBarAlwaysVisible());
        saveOption(animateScrollEl, editor.getAnimatedScroll());
        saveOption(softTabEl, session.getUseSoftTabs());
        saveOption(behavioursEl, editor.getBehavioursEnabled());
    }

    // event.addListener(themeEl, "mouseover", function(e){
    //     this.desiredValue = e.target.value;
    //     if (!this.$timer)
    //         this.$timer = setTimeout(this.updateTheme);
    // });

    // event.addListener(themeEl, "mouseout", function(e){
    //     this.desiredValue = null;
    //     if (!this.$timer)
    //         this.$timer = setTimeout(this.updateTheme, 20);
    // });

    themeEl.updateTheme = function(){
        env.split.setTheme(themeEl.desiredValue || themeEl.selectedValue);
        themeEl.$timer = null;
    };

    bindDropdown("theme", function(value) {
        if (!value)
            return;
        env.editor.setTheme(value);
        themeEl.selectedValue = value;
    });

    bindDropdown("keybinding", function(value) {
        env.editor.setKeyboardHandler(keybindings[value]);
    });

    bindDropdown("fontsize", function(value) {
        env.split.setFontSize(value);
    });

    bindDropdown("folding", function(value) {
        env.editor.session.setFoldStyle(value);
        env.editor.setShowFoldWidgets(value !== "manual");
    });

    bindDropdown("soft_wrap", function(value) {
        var session = env.editor.session;
        var renderer = env.editor.renderer;
        switch (value) {
            case "off":
                session.setUseWrapMode(false);
                renderer.setPrintMarginColumn(80);
                break;
            case "free":
                session.setUseWrapMode(true);
                session.setWrapLimitRange(null, null);
                renderer.setPrintMarginColumn(80);
                break;
            default:
                session.setUseWrapMode(true);
                var col = parseInt(value, 10);
                session.setWrapLimitRange(col, col);
                renderer.setPrintMarginColumn(col);
        }
    });

    bindCheckbox("select_style", function(checked) {
        env.editor.setSelectionStyle(checked ? "line" : "text");
    });

    bindCheckbox("highlight_active", function(checked) {
        env.editor.setHighlightActiveLine(checked);
    });

    bindCheckbox("show_hidden", function(checked) {
        env.editor.setShowInvisibles(checked);
    });

    bindCheckbox("display_indent_guides", function(checked) {
        env.editor.setDisplayIndentGuides(checked);
    });

    bindCheckbox("show_gutter", function(checked) {
        env.editor.renderer.setShowGutter(checked);
    });

    bindCheckbox("show_print_margin", function(checked) {
        env.editor.renderer.setShowPrintMargin(checked);
    });

    bindCheckbox("highlight_selected_word", function(checked) {
        env.editor.setHighlightSelectedWord(checked);
    });

    bindCheckbox("show_hscroll", function(checked) {
        env.editor.renderer.setHScrollBarAlwaysVisible(checked);
    });

    bindCheckbox("animate_scroll", function(checked) {
        env.editor.setAnimatedScroll(checked);
    });

    bindCheckbox("soft_tab", function(checked) {
        env.editor.session.setUseSoftTabs(checked);
    });

    bindCheckbox("enable_behaviours", function(checked) {
        env.editor.setBehavioursEnabled(checked);
    });

    bindCheckbox("fade_fold_widgets", function(checked) {
        env.editor.setFadeFoldWidgets(checked);
    });
    bindCheckbox("read_only", function(checked) {
        env.editor.setReadOnly(checked);
    });

    bindDropdown("split", function(value) {
        var sp = env.split;
        if (value == "none") {
            sp.setSplits(1);
        } else {
            var newEditor = (sp.getSplits() == 1);
            sp.setOrientation(value == "below" ? sp.BELOW : sp.BESIDE);
            sp.setSplits(2);

            if (newEditor) {
                var session = sp.getEditor(0).session;
                var newSession = sp.setSession(session, 1);
                newSession.name = session.name;
            }
        }
    });


    bindCheckbox("elastic_tabstops", function(checked) {
        env.editor.setOption("useElasticTabstops", checked);
    });

    var iSearchCheckbox = bindCheckbox("isearch", function(checked) {
        env.editor.setOption("useIncrementalSearch", checked);
    });

    env.editor.addEventListener('incrementalSearchSettingChanged', function(event) {
        iSearchCheckbox.checked = event.isEnabled;
    });


    function synchroniseScrolling() {
        var s1 = env.split.$editors[0].session;
        var s2 = env.split.$editors[1].session;
        s1.on('changeScrollTop', function(pos) {s2.setScrollTop(pos)});
        s2.on('changeScrollTop', function(pos) {s1.setScrollTop(pos)});
        s1.on('changeScrollLeft', function(pos) {s2.setScrollLeft(pos)});
        s2.on('changeScrollLeft', function(pos) {s1.setScrollLeft(pos)});
    }

    bindCheckbox("highlight_token", function(checked) {
        var editor = env.editor;
        if (editor.tokenTooltip && !checked) {
            editor.tokenTooltip.destroy();
            delete editor.tokenTooltip;
        } else if (checked) {
            editor.tokenTooltip = new TokenTooltip(editor);
        }
    });

    /************** dragover ***************************/
    // event.addListener(container, "dragover", function(e) {
    //     var types = e.dataTransfer.types;
    //     if (types && Array.prototype.indexOf.call(types, 'Files') !== -1)
    //         return event.preventDefault(e);
    // });

    // event.addListener(container, "drop", function(e) {
    //     var file;
    //     try {
    //         file = e.dataTransfer.files[0];
    //         if (window.FileReader) {
    //             var reader = new FileReader();
    //             reader.onload = function() {
    //                 var mode = modelist.getModeForPath(file.name);

    //                 env.editor.session.doc.setValue(reader.result);
    //                 modeEl.value = mode.name;
    //                 env.editor.session.setMode(mode.mode);
    //                 env.editor.session.modeName = mode.name;
    //             };
    //             reader.readAsText(file);
    //         }
    //         return event.preventDefault(e);
    //     } catch(err) {
    //         return event.stopEvent(e);
    //     }
    // });



    var StatusBar = require("ace/ext/statusbar").StatusBar;
    new StatusBar(env.editor, cmdLine.container);


    // var Emmet = require("ace/ext/emmet");
    // net.loadScript("https://rawgithub.com/nightwing/emmet-core/master/emmet.js", function() {
    //     Emmet.setCore(window.emmet);
    //     env.editor.setOption("enableEmmet", true);
    // })


    require("ace/placeholder").PlaceHolder;

    var snippetManager = require("ace/snippets").snippetManager
    var jsSnippets = require("ace/snippets/javascript");
    window.snippetManager = snippetManager
    saveSnippets()

    function saveSnippets() {
        jsSnippets.snippets = snippetManager.parseSnippetFile(jsSnippets.snippetText);
        snippetManager.register(jsSnippets.snippets, "javascript")
    }

    env.editSnippets = function() {
        var sp = env.split;
        if (sp.getSplits() == 2) {
            sp.setSplits(1);
            return;
        }
        sp.setSplits(1);
        sp.setSplits(2);
        sp.setOrientation(sp.BESIDE);
        var editor = sp.$editors[1]
        if (!env.snippetSession) {
            var file = jsSnippets.snippetText;
            env.snippetSession = doclist.initDoc(file, "", {});
            env.snippetSession.setMode("ace/mode/tmsnippet");
            env.snippetSession.setUseSoftTabs(false);
        }
        editor.on("blur", function() {
            jsSnippets.snippetText = editor.getValue();
            saveSnippets();
        })
        editor.setSession(env.snippetSession, 1);
        editor.focus();
    }

    ace.commands.bindKey("Tab", function(editor) {
        var success = snippetManager.expandWithTab(editor);
        if (!success)
            editor.execCommand("indent");
    })

    function createCookie(name,value,days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            var expires = "; expires="+date.toGMTString();
        }
        else var expires = "";
        document.cookie = name+"="+value+expires+"; path=/";
    }
    function readCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for(var i=0;i < ca.length;i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    }
    function randString(x){
        var s = "";
        while(s.length<x&&x>0){
            var r = Math.random();
            s+= String.fromCharCode(Math.floor(r*26) + (r>0.5?97:65));
        }
        return s;
    }    

});
