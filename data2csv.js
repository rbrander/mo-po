// data2csv.js
// converts text files containing JSON records to CSV for import into spreadsheet

var fs = require('fs');

function convertUserData() {
  var filename = 'userdata.txt';

  if (!fs.existsSync(filename)) {
    console.error('Invalid or missing file: ' + filename);
    process.exit(2);
  }

  // Read all the file contents
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err) {
      console.error(err);
      return;
    }

    var results = [];
    // JSON parse each line of the file and add it to the results array
    data.split('\n').forEach(function(line) {
      if (line.length > 0) {
        results.push(JSON.parse(line));
      }
    });

    if (results.length === 0) {
      console.error("No data to output");
      return;
    }

    // Write each line into a CSV
    var csv_filename = filename.replace(/\.txt$/, '.csv');
    // The first line in a CSV file is the headings, which will be the
    // keys of the first object, since all objects should have the same structure
    var keys = Object.keys(results[0]);
    var csv_data = keys.join(',') + '\n';
    results.forEach(function(obj) {
      csv_data += keys.map(function(key) {
        var value = obj[key];
        if (typeof(value) === 'string') {
          return '"'+value+'"';
        }
        return obj[key]
      }).join(',') + '\n';
    })

    console.log('writing data to ' + csv_filename);
    fs.writeFileSync(csv_filename, csv_data, 'utf8');
  });
}

function convertGameData() {
  var filename = 'gamedata.txt';

  if (!fs.existsSync(filename)) {
    console.error('Invalid or missing file: ' + filename);
    process.exit(2);
  }

  // Read all the file contents
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err) {
      console.error(err);
      return;
    }

    var results = [];
    // JSON parse each line of the file and add it to the results array
    data.split('\n').forEach(function(line) {
      if (line.length > 0) {
        results.push(JSON.parse(line));
      }
    });

    if (results.length === 0) {
      console.error("No data to output");
      return;
    }

    // Write each line into a CSV
    var csv_filename = filename.replace(/\.txt$/, '.csv');
    // The first line in a CSV file is the headings, which will be the
    // keys of the first object, since all objects should have the same structure

/*
  Sample Data:

  {"score":[2,6],
  "players":[{
    "centerPos":81,"paddleWidth":25,"status":"playing",
    "socketId":"/player#c7jVqzC6dbJ84xO2AAAC",
    "number":1,
    "firstName":"Rob","lastName":"Brander"},
    {"centerPos":40,"paddleWidth":25,"status":"playing",
    "socketId":"/player#bCCb5-ZZSN8HHB_wAAAD","number":2,
    "firstName":"Ken","lastName":"Kutaragi"}],"finished":"4/17/2016, 4:17:51 PM"}
*/
    var csv_data = '"Game date/time", ' +
      '"Player 1 First Name", "Player 1 Last Name", ' + 
      '"Player 2 First Name", "Player 2 Last Name", ' +
      '"Player 1 Score", "Player 2 Score"\n';

    results.forEach(function(obj) {
      var line = '"' + obj.finished + '", ';
      line += '"' + obj.players[0].firstName + '", "' + obj.players[0].lastName + '", ';
      line += '"' + obj.players[1].firstName + '", "' + obj.players[1].lastName + '", ';
      line += '' + obj.score[0] + ', ' + obj.score[1] + '\n';
      csv_data += line;
    })

    console.log('writing data to ' + csv_filename);
    fs.writeFileSync(csv_filename, csv_data, 'utf8');
  });
}

convertGameData();
convertUserData();
