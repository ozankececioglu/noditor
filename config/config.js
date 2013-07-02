var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')

module.exports = {
  development: {
    db: 'mongodb://admin:pass@dharma.mongohq.com:10081/kiks',
    root: rootPath,
    app: {
      name: 'Nodejs Express Mongoose Demo'
    }
  },
  test: {
    db: 'mongodb://admin:pass@dharma.mongohq.com:10081/kiks',
    root: rootPath,
    app: {
      name: 'Nodejs Express Mongoose Demo'
    }
  },
  production: {}
}

