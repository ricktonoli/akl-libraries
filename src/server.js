var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var pythonshell = require('python-shell');
var moment = require('moment');
var PushBullet = require('pushbullet');

var app = express();

var scriptPath = "/opt/auckland-libraries/src/";

// add timestamps in front of log messages
//require('console-stamp')(console, '[HH:MM:ss.l]');

// since logger only returns a UTC version of date, I'm defining my own date
// format - using an internal module from console-stamp
//morgan.format('mydate', function() {
//    var df = require('console-stamp/node_modules/dateformat');
//    return df(new Date(), 'HH:MM:ss.l');
//});

//app.use(morgan('[:mydate] :method :url :status :res[content-length] - :remote-addr - :response-time ms'));

console.log("Starting up...");

/* Body parser for easy request body parsing of our json data */
app.use(bodyParser.json());

/* helper to handle root requests */
app.get('/', function(req, res) {
  response = '/books/[login]/[id]/[pin] - JSON list of taken out books\r\n\r\n';
  response = response + '/overdue/[login]/[id]/[pin] - JSON list of overdue books\r\n\r\n';
  response = response + '/fines/[login]/[id]/[pin] - Total fines\r\n\r\n';
  response = response + '/count/[login]/[id]/[pin] - Total books out\r\n\r\n';
  response = response + '/count/overdue/[login]/[id]/[pin] - Total books out\r\n\r\n';
  response = response + '/check/[login]/[id]/[pin]/[pushbulletapikey]/[pushbulletdeviceiden]/[duration] - check and notify to pushbullet device any books due less than [duration] days';
  res.status(200).end(response);
})


/* retrieve library book data */
app.get('/overdue/:login/:id/:pin/', function(req, res, next) {
  var pythonoptions = {
    mode: 'text',
    pythonPath: '/usr/bin/python',
    scriptPath: scriptPath,
    args: [req.params.login, req.params.pin, req.params.id]
  };

  pythonshell.run('library.py', pythonoptions, function(err, results) {
   if (err) throw err;
    json = JSON.parse(results);

     response = '{"books":'
     books = new Array()
     for(var i = 0; i < json.books.length; i++){
        duedate = moment(json.books[i].due.substring(0, 6) + "20" + json.books[i].due.substring(6, 8), "DD-MM-YYYY");
        today = moment();
        due = duedate.diff(today, 'days');
        if (due <= 0) {
          books.push('{"name":"' + json.books[i].name + '","due":' + due + '}')
        }
    }
    response = response + '[' +  books + ']}';
    res.send(response);
  });

})


/* retrieve library book data */
app.get('/books/:login/:id/:pin/', function(req, res, next) {
  var pythonoptions = {
    mode: 'text',
    pythonPath: '/usr/bin/python',
    scriptPath: scriptPath,
    args: [req.params.login, req.params.pin, req.params.id]
  };

  pythonshell.run('library.py', pythonoptions, function(err, results) {
   if (err) throw err;
    json = JSON.parse(results);

    response = '{"books":'
    books = new Array()
    for(var i = 0; i < json.books.length; i++){
        duedate = moment(json.books[i].due.substring(0, 6) + "20" + json.books[i].due.substring(6, 8), "DD-MM-YYYY");
        today = moment();
        due = duedate.diff(today, 'days');
        books.push('{"name":"' + json.books[i].name + '","due":' + due + '}')
    }
    response = response + '[' +  books + ']}';
    res.send(response);
  });

})

/* retrieve library fine data */
app.get('/fines/:login/:id/:pin/', function(req, res, next) {
  var pythonoptions = {
    mode: 'text',
    pythonPath: '/usr/bin/python',
    scriptPath: scriptPath,
    args: [req.params.login, req.params.pin, req.params.id]
  };

  pythonshell.run('library.py', pythonoptions, function(err, results) {
    if (err) throw err;
    json = JSON.parse(results);
    res.send(JSON.stringify(json.fines));
  });

})

/* retrieve count of library books out */
app.get('/count/:login/:id/:pin/', function(req, res, next) {
  var pythonoptions = {
    mode: 'text',
    pythonPath: '/usr/bin/python',
    scriptPath: scriptPath,
    args: [req.params.login, req.params.pin, req.params.id]
  };

  pythonshell.run('library.py', pythonoptions, function(err, results) {
    if (err) throw err;
    json = JSON.parse(results);
    res.json({total:JSON.stringify(json.books.length)});
  });

})

/* retrieve count of library books out */
app.get('/count/overdue/:login/:id/:pin/', function(req, res, next) {
  var pythonoptions = {
    mode: 'text',
    pythonPath: '/usr/bin/python',
    scriptPath: scriptPath,
    args: [req.params.login, req.params.pin, req.params.id]
  };

  pythonshell.run('library.py', pythonoptions, function(err, results) {
    if (err) throw err;
    json = JSON.parse(results);

    count = 0
    for(var i = 0; i < json.books.length; i++){
       duedate = moment(json.books[i].due.substring(0, 6) + "20" + json.books[i].due.substring(6, 8), "DD-MM-YYYY");
       today = moment();
       due = duedate.diff(today, 'days');
       if (due <= 0) {
         count ++
       }
    }
    res.json({total:count});
    
  });

})

/* do overdue check */
app.get('/check/:login/:id/:pin/:pbapi/:pbdevice/:duration', function(req, res, next) {

  var pythonoptions = {
    mode: 'text',
    pythonPath: '/usr/bin/python',
    scriptPath: scriptPath,
    args: [req.params.login, req.params.pin, req.params.id]
  };

  var pusher = new PushBullet(req.params.pbapi);

  pythonshell.run('library.py', pythonoptions, function(err, results) {
    if (err) throw err;
    json = JSON.parse(results);

    console.log("Checking for books due less than " + req.params.duration);

    for(var i = 0; i < json.books.length; i++){
	duedate = moment(json.books[i].due.substring(0, 6) + "20" + json.books[i].due.substring(6, 8), "DD-MM-YYYY");
        today = moment();
	due = duedate.diff(today, 'days');

	if (due < req.params.duration && due >= 0) {
	  console.log(json.books[i].name + " is due in " + due + " days!");
	    pusher.note(req.params.pbdevice, "Book Due", json.books[i].name + " is due in " + due + " days!", function(error, response) {
 	  });
	}

	if (due < 0) {
	  console.log(json.books[i].name + " is overdue by " + Math.abs(due) + " days!");
	    pusher.note(req.params.pbdevice, "Book Due", json.books[i].name + " is overdue by " + Math.abs(due) + " days!", function(error, response) {
 	  });
	}

    }

    res.send("OK");
  });

})

console.log("Started...");

app.listen(3101);

