define([
  'jquery',
  'underscore',
  'backbone'
], function($, _, Backbone) {

    var FileTabs = Backbone.View.extend({
        el: '#editor-tabs'
        , events : {
            'click .tab-link' : 'openTab'
        }
        , initialize : function() {
            this.openTabs = new (Backbone.Collection.extend({}))();
            this.openedFiles = new (Backbone.Collection.extend({}))();
            this.on('add', this.addTab, this);
        }
        , addTab : function(fileModel) {
            console.log('adding', fileModel);
            var id = fileModel.id
                , fileName = fileModel.name
                , location = fileModel.location
                , self = this;

            //if it was not fetched already fetch file content and save it in 
            //openedFiles collection
            if(this.openedFiles.get(id) === undefined) {
                var EditSession = require("ace/edit_session").EditSession;
                var UndoManager = require("ace/undomanager").UndoManager;
                var mode = modelist.getModeForPath(fileName);
                //get file content
                $.ajax({
                    type : 'POST'
                    , url : '/sftp/read'
                    , data : {
                        fileName: location
                    }
                    , success : function(value) {
                        //create new EditSession with new undoManager
                        var session = new EditSession(value, modelist.getModeForPath(fileName));
                        session.setUndoManager(new UndoManager);
                        session.setMode(mode.mode);
                        //window.env.editor.setSession(session);
                        //add to openedFiles collection
                        self.openedFiles.add({
                            id : id
                            , value : value
                            , mode : modelist.getModeForPath(fileName)
                            , session : session
                        });
                        self.renderTab(fileModel);
                    }
                });
            } else {
                window.env.editor.setSession(this.openedFiles.get(id).get('session'));
                this.renderTab(fileModel);
            }
            
        }
        , renderTab : function(fileModel) {
            var id = fileModel.id
                , fileName = fileModel.name
                , location = fileModel.location
                , self = this;
            $('li', this.el).removeClass('active');
            //openTabs collection hold only open tabs
            if(this.openTabs.get(id) === undefined) {
                this.openTabs.add(fileModel);
                var li = $('<li data-file-name="'+fileName+'"'+
                    'class="tab-link active" id="' + id + '_tab">' + fileName +
                    '<span class="close-tab" style="float:right; font-weight:bold;">x</span>'+
                    '</li>'); 
                this.$el.append(li);               
            } else {
                $('li', this.el).removeClass('active');
                $('#' + id + '_tab').addClass('active');
            }
            this.$el.addClass('filled');
            this.setActiveTab(id);
        }
        , openTab : function(e) {
            $('li', this.el).removeClass('active');
            $(e.target).addClass('active');
            var fileId = $(e.target).attr('id').split('_')[0];
            this.setActiveTab(fileId);
        }
        //set session (it should be already in openedFiles collection)
        , setActiveTab : function(fileId) {
            var session = this.openedFiles.get(fileId).get('session');
            window.env.editor.setSession(session);
            window.env.editor.focus();
            count = session.getLength();
            window.env.editor.gotoLine(count, session.getLine(count-1).length);
        }

    });
  
    return FileTabs;
  
});
