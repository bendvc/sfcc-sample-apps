var {
    createExpressApp,
    createLambdaHandler,
} = require('../scripts/express.js');
var config = require('../app/api.js');

var app = createExpressApp(config);

exports.get = createLambdaHandler(app);
