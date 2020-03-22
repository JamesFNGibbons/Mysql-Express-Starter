const express = require('express');
const body = require('body-parser');
const fs = require('fs');

const config = require('./config.json');

/** 
 * Function used to run the SQL database migration,
 * and run the SQL scripts that are contained within
 * the models directory.
 * 
 * @param {SQLConnection} connection The MYSQL connection instance.
 * 
 */

async function runDatabaseMigration(connection) {
  console.log('[DB] => Starting DB Migration');

  for(let model of fs.readdirSync(__driname + '/models')) {
    let modelSQLData = fs.readFileSync(__dirname + '/models/' + model);
    console.log('[DB] => Starting migration of model [' + model + ']');

    try {
      let query = await connection.query(modelSQLData);
      console.log('[DB] => Done migration of model ['+ model + ']');
    }
    catch(err) {
      console.error(err);
    }
  }
}

async () => {
  const app = express();
  
  // Bootstrap the config object to the express app.
  app.config = config;

  /** 
   * Attempt a connection to the MYSQL database, and
   * handle connection errors if needed.
   * 
  */
  if(config.mysql && config.mysql.username && config.mysql.password && config.mysql.database) {
    if(!config.mysql.hostname || config.mysql.hostname == '') {
      config.mysql.hostname = 'localhost';
    }

    const connection = mysql.createConnection(config.mysql);
    try {
      await new Promise((resolve, reject) => {
        connection.connect((err) => {
          return err ? reject(err) : resolve();
        });
      });

      // Bootstrap the active MYSQL connection to the express app.
      app.db = connection;

      // Run a new SQL model migration on the server.
      await runDatabaseMigration(connection);
      console.log('[DB] => Done Database Setup.');
    }
    catch (err) {
      console.error(err);
      throw '[DB] => Could not establish connection to MYSQL Server.';
    }
    
  }

  /** 
   * Load the middleware from the middlware directory, 
   * if there is anything to load.
   * 
  */
  for(let middlware of fs.readdirSync('./middleware')) {
    if(middlware !== '.keep') {
      app.use(require('./middleware/' + middlware));
    }
  }

  /** 
   * Load the API endpoints into the express application.
   */
  for(let endpoint of fs.readdirSync('./endpoints')) {
    if(endpoint !== '.keep') {
      app.use('/api/' + endpoint.split('.js')[0], require('./endpoints/' + endpoint));
      console.log('[ENDPOINT] => Loading endpoint ' + endpoint);
    }
  }

}

