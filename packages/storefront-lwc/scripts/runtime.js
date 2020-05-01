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
import { createExpressApp } from './express';

// ****************************************************
// Instantiate the new Storefront Reference Application
// ****************************************************
import { getSampleApp } from '../app/sample-app.js';

/**
 * Constants
 */
const port = process.env.PORT || 3000;

const users = new Map();

function validateConfig(config) {
    const REQUIRED_KEYS = [
        'COMMERCE_API_PATH',
        'COMMERCE_CLIENT_API_SITE_ID',
        'COMMERCE_CLIENT_CLIENT_ID',
        'COMMERCE_CLIENT_REALM_ID',
        'COMMERCE_CLIENT_INSTANCE_ID',
        'COMMERCE_CLIENT_ORGANIZATION_ID',
        'COMMERCE_CLIENT_SHORT_CODE',
        'COMMERCE_SESSION_SECRET',
    ];

    REQUIRED_KEYS.forEach(KEY => {
        if (!config[KEY]) {
            console.log(
                `Make sure ${KEY} is defined within api.js or as an environment variable`
                    .red,
            );
            process.exit(1);
        }
    });
}

/**
 * Setup and Start Server
 */
(async () => {
    const sampleApp = await getSampleApp();
    const config = sampleApp.apiConfig.config;
    validateConfig(config);

    // Create Express Instance, register it with demo app and start demo app.
    sampleApp.expressApplication = createExpressApp(config);

    sampleApp.start();

    // start the server
    const server = sampleApp.expressApplication.listen(port, () => {
        const portToTellUser =
            process.env.NODE_ENV === 'development'
                ? 3000
                : server.address().port;

        console.log('======== Example SFRA runtime ======== ');
        console.log(
            `🌩 Client Server up on ==============> http://localhost:${portToTellUser} <=========== Client UI ========== 🌩`
                .yellow,
        );
        console.log(
            `🚀 Apollo GraphQL Server up on ======> http://localhost:${portToTellUser}${sampleApp.apiConfig.config.COMMERCE_API_PATH} <=== Apollo GraphQL ===== 🚀`
                .blue,
        );
    });

    return server;
})();
