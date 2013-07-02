module.exports = function (app, passport, auth) {

  // home route
  var ace = require('../app/controllers/ace')
  app.get('/', ace.index)

  //sftp roots
  var sftp = require('../app/controllers/sftp')
  app.post('/sftp', sftp.start);
  app.post('/sftp/read', sftp.readFile);
  app.post('/sftp/dir', sftp.readDir);
  app.post('/sftp/write', sftp.writeFile);

}
