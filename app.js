let createError = require('http-errors');
let express = require('express');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
const { URL, parse } = require('url');
let debug = require('debug')('app');
require('dotenv').config();
let database = require('./database');

const full_property_max_length = 250;
const short_property_max_length = 19;

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
        if(isValidUrl(req.body.full, ['http', 'https']) && req.body.full.length <= full_property_max_length){
            debug("long url is ok");
            if(req.body.short){
                if(! /^[a-z]+$/.test(req.body.short)){
                    return next({error:"invalid input must be letters a-z",status:400});
                }
                if(req.body.short.length >= short_property_max_length){
                    return next({error:"invalid input short is too long",status:400});
                }
                debug("short url is ok");
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
  res.status(err.status || 500);
  //return res.json(process.env.env === 'development' ? err : {});
  debug(err);
  return res.json(err);
});

const isValidUrl = (s, protocols) => {
    try {
        new URL(s);
        const parsed = parse(s);
        return protocols
            ? parsed.protocol
                ? protocols.map(x => `${x.toLowerCase()}:`).includes(parsed.protocol)
                : false
            : true;
    } catch (err) {
        return false;
    }
};

module.exports = app;
