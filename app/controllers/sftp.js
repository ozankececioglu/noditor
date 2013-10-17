var sftpConnection = false
  , connection = false;

function readFolder(sftp, folderName, res){
  var result = {
    folders: [],
    files: [],
    name: folderName
  }

  sftp.opendir(folderName + "/", function(err, handle){
    if(err) throw err;

    console.log(folderName);
    sftp.readdir(handle, function(err, list){
      var count = list.length;
      console.log(count);
      if(list.length === 2) {
        res.write(JSON.stringify({
            success: true
            , tree: result
        }));
        res.end();                  
        return;        
      }

      list.forEach(function(l){
        if(l.filename!="." && l.filename!="..") {
          var fileName = folderName+"/"+l.filename;
          if(count<=0){
            console.log(result);
            return;
          }
          sftp.stat(fileName, function(err, stat){
            count--;
            if(stat.isDirectory()){
                result.folders.push(fileName);
            } else {
                result.files.push(fileName);
            }
            if(count<=2){
              res.write(JSON.stringify({
                  success: true
                  , tree: result
              }));

              res.end();                  
              return;
            }
          })
        }
      });
    });
  });
}
exports.start = function(req, res) {

    var Connection = require('ssh2');

    var c = new Connection();

    c.on('connect', function() {
      console.log('Connection :: connect');
    });

    var rootFolder = {};
    var allFoldersInRoot = {};
    var allFolderNames = [];
    var treeRootObject = {};

    var rootFolderName = req.param("root");
    var password = req.param("password");
    var username = req.param("username");
    var host = req.param("host");

    c.on('ready', function() {
      console.log('Connection :: ready');
      connection = c;
      //sftpConnection = c;
      c.sftp(function(err, sftp) {

        console.log("sftp ready")
        sftpConnection = sftp
        if (err) {console.log("error");throw err;}
        sftp.on('end', function() {
          console.log('SFTP :: SFTP session closed');
        });
        //readFolder(sftp, rootFolderName);
        //sftp.readFolder(rootFolderName)
        //sftp.opendir(rootFolderName + "/", function readdir(err, handle){
        var r = readFolder(sftp, rootFolderName, res);

        console.log(r);
        //return;
      });
    });
    c.on('error', function(err) {
      console.log('Connection :: error :: ' + err);
    });
    c.on('end', function() {
      console.log('Connection :: end');
    });
    c.on('close', function(had_error) {
      console.log('Connection :: close');
    });
    c.connect({
      host: host,
      port: 22,
      username: username,
      password: password,
      hostVerifier: function(){
        return true;
      }
    });

    var started=0, finished=0, running=0;
    var createNestedObject = function( base, names ) {
        for( var i = 0; i < names.length; i++ ) {
          if(names[i]!='') base = base[ names[i] ] = base[ names[i] ] || {};
        }
    };

    var readFolderRecursive = function(sftp, folderName) {
      started += 1;
      running += 1;
      sftp.opendir(folderName + "/", function readdir(err, handle){
          if(err) throw err;

          sftp.readdir(handle, function(err, list){

            allFoldersInRoot[folderName] = {
              files: []
            };
            allFolderNames.push(folderName);
            var base = createNestedObject(treeRootObject, folderName.replace(rootFolderName, "").split(/\//));
              var count = list.length;

              console.log("list", list);
              console.log("************");
              list.forEach(function(l){
                  if(l.filename!="." && l.filename!="..") {
                      var fileName = folderName+l.filename
                      sftp.stat(fileName, function(err, stat){
                          count--;
                          //if(typeof stat !== "undefined"){
                            if(stat.isDirectory()){
                                readFolder(sftp, fileName + "/");
                            } else {
                                if(allFoldersInRoot[folderName]!==undefined){
                                  allFoldersInRoot[folderName].files.push(fileName);
                                }
                            }
                          //}
                          if(count<=0){
                              running -= 1;
                              finished += 1;

                              //end of the async recursive cycle
                              if(started===finished && running===0){
                                allFolderNames.forEach(function(fn){
                                  if(fn[0]=='') return;
                                  var fs = fn.replace(rootFolderName, "").split(/\//);
                                  var ii = treeRootObject;
                                  for(var i=0; i<fs.length; i++){
                                    if(fs[i]!=''){
                                      var b = ii[fs[i]]
                                      ii = b;
                                    }
                                  }
                                  ii.files = [];
                                  var files = allFoldersInRoot[fn].files;
                                  for(var i=0; i<files.length; i++){
                                    ii.files.push(files[i]);
                                  }
                                });
                                res.write(JSON.stringify({
                                    success: true
                                    , tree: treeRootObject
                                }));

                                res.end();
                              }
                              return folderName;
                          }
                      })
                  } else {
                      count--;
                  }
              });
          });
      });
    }

}

exports.readDir = function(req, res){
  var rootFolderName = req.param("root");
  readFolder(sftpConnection, rootFolderName, res);
}

exports.readFile = function(req, res){
  var fileName = req.param("fileName");
  var rs = sftpConnection.createReadStream(fileName);
  console.log(rs);
  rs.pipe(res);
}

exports.writeFile = function(req, res){
  var fileContent = req.param("content");
  var fileName = req.param("name");

  //sftpConnection.fastPut("../../tmp/text-x.js", "/home/diki/nodes/noditor/test-x.js", function);
  var ws = sftpConnection.createWriteStream(fileName, {autoClose: false});

  ws.write(fileContent, 'utf8', function(){
    console.log("written!!!!!");
    res.write(JSON.stringify({
        success: true
    }));

    res.end();  
  });
}

exports.createFile = function(req, res) {
  var fileName = req.param("name");
  try {
    console.log(fileName);
    sftpConnection.createWriteStream(fileName, {autoClose: false});
    res.write(JSON.stringify({
        success: true
    }));

    res.end();     
  } catch(e) {
    res.send("",400);
  }
}

exports.createFolder = function(req, res) {
  var folderName = req.param("name");
  sftpConnection.mkdir(folderName, function(err){
    if(err) res.send(500);
    res.send({success: true});
  });
}

exports.removeFolder = function(req, res) {
  var folderName = req.param("name");
  console.log(folderName);
  try {
    connection.exec('rm -R ' + folderName, function(err, stream){
      if (err) { throw err; res.send(500); }
      stream.on('data', function(data, extended) {
        console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ')
                    + data);
      });
      stream.on('end', function() {
        console.log('Stream :: EOF');
      });
      stream.on('close', function() {
        console.log('Stream :: close');
      });
      stream.on('exit', function(code, signal) {
        if(code === 0) res.send({success: true});
        console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
      });
    });
  } catch(e) {
    console.log(e);
  }
}

exports.removeFile = function(req, res) {
  var folderName = req.param("name");
  try {
    connection.exec('rm ' + folderName, function(err, stream){
      if (err) { throw err; res.send(500); }
      stream.on('data', function(data, extended) {
        console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ')
                    + data);
      });
      stream.on('end', function() {
        console.log('Stream :: EOF');
      });
      stream.on('close', function() {
        console.log('Stream :: close');
      });
      stream.on('exit', function(code, signal) {
        if(code === 0) res.send({success: true});
        console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
      });
    });
  } catch(e) {
    console.log(e);
  }
}

