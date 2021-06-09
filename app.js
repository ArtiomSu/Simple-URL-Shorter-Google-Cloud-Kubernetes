let createError = require('http-errors');
let express = require('express');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
require('dotenv').config();
let debug = require('debug')('api:app');
let database = require('./database');

let app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/',function (req,res,next){
  const html_out = "<!DOCTYPE html>\n" +
      "<html style=\"background: #3d3d3d; color: #d9d9d9; text-align: center\">\n" +
      "<head>\n" +
      "<title>Simple Url Shortner</title>\n" +
      "</head>\n" +
      "<body>\n" +
      "<h1>Simple Url Shortner</h1>\n" +
      "<p>use curl to upload original url</p>\n" +
      "<code>curl -d '{\"short\":\"gg\", \"full\":\"https://google.com\"}' -H \"Content-Type: application/json\" -X POST "+req.protocol + '://' + req.get('host')+'/'+"</code>\n" +
      "<p>you will get json back with the shortened url. short property is optional, if you don\'t supply it a random short url will be generated :)</p>\n" +
      "</body>\n" +
      "</html>";
  return res.send(html_out);
});

app.get(/^\/[a-z]+$/, database.getFullLink);

app.post('/',function (req,res,next){
    if(req.body.full){
        //check if long url is ok
        if(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(req.body.full)){
            if(req.body.short){
                if(! /^[a-z]+$/.test(req.body.short)){
                    return next({error:"invalid input must be letters a-z",status:400});
                }
            }
            return database.addLink(req,res,next,false,0);
        }
        return next({error:"invalid url",status:400});
    }
    return next({error:"invalid input",status:400});
});

if(process.env.env === 'development'){ //
  app.get('/test/all_links', database.getAllLinks);
  app.get('/test/clear_table', database.clearTable);
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  return next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // render the error page
  res.status(err.status || 500);
  //return res.json(process.env.env === 'development' ? err : {});
  return res.json(err);
});

module.exports = app;
