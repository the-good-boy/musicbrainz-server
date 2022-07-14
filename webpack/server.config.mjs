/*
 * Copyright (C) 2018 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import path from 'path';

import webpack from 'webpack';
import nodeExternals from 'webpack-node-externals';

import {
  MB_SERVER_ROOT,
} from '../root/static/scripts/common/DBDefs.js';

import cacheConfig from './cacheConfig.mjs';
import {
  BUILD_DIR,
  ROOT_DIR,
  SCRIPTS_DIR,
  WEBPACK_MODE,
} from './constants.mjs';
import moduleConfig from './moduleConfig.mjs';
import definePluginConfig from './definePluginConfig.mjs';
import providePluginConfig from './providePluginConfig.mjs';

/*
 * Components must use the same context, gettext, and linkedEntities
 * instances created in the server process, so those must be externals.
 */
const externals = [
  'root/context',
  'root/server/gettext',
  'root/static/scripts/common/DBDefs',
  'root/static/scripts/common/DBDefs-client',
  'root/static/scripts/common/linkedEntities',
];

export default {
  cache: cacheConfig,

  context: MB_SERVER_ROOT,

  devtool: false,

  entry: {
    'server-components': path.resolve(ROOT_DIR, 'server/components'),
  },

  externals: [
    nodeExternals({
      /*
       * jquery and @popperjs are resolved to root/static/scripts/empty.js
       * on the server. See NormalModuleReplacementPlugin below.
       *
       * mutate-cow is allowed because it's published as an ES module, which
       * must be converted to CommonJS.
       */
      allowlist: [/(jquery|@popperjs|mutate-cow)/],
      modulesFromFile: true,
    }),

    function ({context, request}, callback) {
      const resolvedRequest = path.resolve(context, request);
      const requestFromCheckout = path.relative(
        MB_SERVER_ROOT,
        resolvedRequest,
      );
      if (externals.includes(requestFromCheckout)) {
        /*
         * Output a path relative to the build dir, since that's where
         * the server-components bundle will be.
         */
        callback(
          null,
          'commonjs ./' + path.relative(BUILD_DIR, resolvedRequest),
        );
        return;
      }
      callback();
    },
  ],

  mode: WEBPACK_MODE,

  module: moduleConfig,

  name: 'server-bundle',

  node: false,

  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    path: BUILD_DIR,
  },

  plugins: [
    new webpack.NormalModuleReplacementPlugin(
      /(jquery|@popperjs)/,
      path.resolve(SCRIPTS_DIR, 'empty.js'),
    ),
    new webpack.DefinePlugin(definePluginConfig),
    new webpack.ProvidePlugin(providePluginConfig),
    ...(
      String(process.env.NO_PROGRESS) === '1'
        ? []
        : [new webpack.ProgressPlugin({activeModules: true})]
    ),
  ],

  target: 'node',
};
