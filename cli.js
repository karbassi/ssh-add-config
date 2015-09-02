#!/usr/bin/env node
'use strict';

var fs = require('fs');
var updateNotifier = require('update-notifier');
var meow = require('meow');
var async = require('async');
var pathExists = require('path-exists');
var sshConfig = require('ssh-config')

var cli = meow({
  help: [
    'Usage',
    '  $ ssh-add-config -n <name> [-i <key>] [<user>@]<host>',
    '',
    'Example',
    '  $ ssh-add-config -n -i ~/.ssh/id_rsa.pub user@host'
  ],
}, {
  string: ['_']
});

updateNotifier({
  pkg: cli.pkg
}).notify();

if (cli.input.length === 0) {
  console.error('You need to specify at least one path');
  process.exit(1);
}

if (cli.flags['n'] == null) {
  console.error('You need to specify a name with the -n flag.');
  process.exit(1);
}

var FILE = process.env.HOME + '/.ssh/config';
var config;

async.parallel({
  readFile: function(cb) {
    var file = fs.readFileSync(FILE, 'utf8')
    config = sshConfig.parse(file);
    cb();
  },
  host: function(cb) {
    var host = cli.flags['n'];

    var foundHost = config.find({
      Host: host
    });

    // TODO: Add option to update
    if (foundHost) {
      console.error('The host by name of \'' + host + '\' already exists. Please use a new host name.');
      process.exit(1);
    }

    cb(null, host);
  },
  identityFile: function(cb) {
    var key = cli.flags['i'];

    if (!key) {
      cb();
    }

    pathExists(key, function(err, exists) {
      if (err) {
        console.error(err.message);
        return;
      }

      if (exists) {
        cb(null, key);
      } else {
        console.error('The ssh key (' + key + ') does not exist. Please check your path.');
        process.exit(1);
      }

    });
  },
  user: function(cb) {
    var user = cli.input[0].split('@')[0];
    cb(null, user);
  },
  hostName: function(cb) {
    var host = cli.input[0].split('@')[1];
    cb(null, host);
  }
}, function(err, results) {

  if (err) {
    console.error(err.message);
    process.exit(1);
  }


  var data = "\nHost " + results.host + "\n";

  if (results.hostName) {
    data += "    HostName " + results.hostName + "\n";
  }

  if (results.user) {
    data += "    User " + results.user + "\n";
  }

  if (results.identityFile) {
    data += "    IdentityFile " + results.identityFile + "\n";
  }

  fs.appendFileSync(FILE, data);

});
