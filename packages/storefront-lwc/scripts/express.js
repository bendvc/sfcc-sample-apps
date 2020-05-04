import * as core from '@sfcc-core/core';
/*
    Copyright (c) 2020, salesforce.com, inc.
    All rights reserved.
    SPDX-License-Identifier: BSD-3-Clause
    For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
*/
/**
 * Import Dependencies
 */
import color from 'colors';
import passport from 'passport';
import * as graphqlPassport from 'graphql-passport';
import express from 'express';
import expressSession from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import * as CommerceSdk from 'commerce-sdk';
import { getCommerceClientConfig } from '@sfcc-core/apiconfig';
import awsServerlessExpress from 'aws-serverless-express';

// ****************************************************
// Instantiate the new Storefront Reference Application
// ****************************************************
import { getSampleApp } from '../app/sample-app.js';

// TODO: Get experimental import meta syntax working if you want rollup to work.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// const __dirname = '/Users/ben/Projects/sfcc-sample-apps/packages/storefront-lwc/scripts'

/**
 * Constants
 */
const templateDir = path.resolve(__dirname, '..');
const publicDir = `${templateDir}/dist/`;
const mode = process.env.NODE_ENV || 'development';

const users = new Map();

export const createLambdaHandler = app => {
    const server = awsServerlessExpress.createServer(app, null, [
        'application/*',
        'audio/*',
        'font/*',
        'image/*',
        'video/*',
    ]);

    const handler = (event, context, callback) => {
        awsServerlessExpress.proxy(
            server,
            event, // The incoming event
            context, // The event context
            'CALLBACK', // How the proxy signals completion
            (err, response) => {
                return (
                    app._requestMonitor
                        ._waitForResponses()
                        .then(() => app.metrics.flush())
                        // Now call the Lambda callback to complete the response
                        .then(() => callback(err, response))
                );
            },
        );
    };

    return { server, handler };
};

export const createExpressApp = config => {
    //
    // Use this middleware when graphql-passport context.authenticate() are called
    // to retrieve a shopper token from the sdk. provide {id,token} to passport on success.
    //
    passport.use(
        new graphqlPassport.GraphQLLocalStrategy(function(user, pass, done) {
            const clientConfig = getCommerceClientConfig(config);
            CommerceSdk.helpers
                .getShopperToken(clientConfig, { type: 'guest' })
                .then(token => {
                    const customerId = JSON.parse(token.decodedToken.sub)
                        .customer_info.customer_id;
                    done(null, {
                        id: customerId,
                        token: token.getBearerHeader(),
                    });
                })
                .catch(error => done(error));
        }),
    );

    passport.serializeUser(function(user, done) {
        users.set(user.id, user);
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        done(null, users.get(id));
    });

    // Create Express Instance, register it with demo app and start demo app.
    const expressApplication = express();

    const sess = {
        secret: config.COMMERCE_SESSION_SECRET, // This is something new we add to the config
        resave: false,
        saveUninitialized: false,
        cookie: {
            sameSite: 'strict',
        },
    };

    if (mode === 'production') {
        expressApplication.set('trust proxy', 1); // trust first proxy
        sess.cookie.secure = true; // serve secure cookies
    }

    expressApplication.disable('x-powered-by');

    // generate cookie
    expressApplication.use(expressSession(sess));

    expressApplication.use(passport.initialize());
    expressApplication.use(passport.session());

    // Serve up static files
    expressApplication.use(
        '/',
        express.static(publicDir, {
            index: ['index.html'],
            immutable: true,
            maxAge: 31536000,
        }),
    );

    // provide route for service-worker
    expressApplication.use('/service-worker.js', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'service-worker.js'));
    });

    // This should be in the app start function.
    expressApplication.get('/apiconfig.js', function(req, res) {
        res.send(`window.apiconfig={"COMMERCE_API_PATH": "/api"}`);
    });

    expressApplication.get('/*', (req, res) => {
        res.sendFile(path.resolve(publicDir, 'index.html'));
    });

    return expressApplication;
};
