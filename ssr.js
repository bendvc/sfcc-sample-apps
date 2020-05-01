var {
    createExpressApp,
    createLambdaHandler,
} = require('./packages/storefront-lwc/scripts/express.cjs.js');
var config = require('./packages/storefront-lwc/app/api.js');

var app = createExpressApp(config);

exports.get = createLambdaHandler(app);
