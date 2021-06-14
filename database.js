const pg = require("pg");
const debug = require('debug')('api:database');

const initial_short_url_length = 3;

let pgConfig = {
    user: process.env.POSTGRESS_USER,
    password: process.env.POSTGRESS_PASSWORD,
    database: process.env.POSTGRESS_DATABASE,
    host: 5432, // hardcoded because I use googles sql proxy so its the same port and ip for dev and prod
    port: "127.0.0.1"
};

let pgPool;
if (!pgPool) {
    pgPool = new pg.Pool(pgConfig);
}

genShort = (length) => {
    let result           = '';
    let characters       = 'abcdefghijklmnopqrstuvwxyz';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}

//TODO instead of checking for conflicts grab a seed counter from the database and use that to gen random short url.
exports.addLink = (req,res, next, url_is_generated, conflict_hit_count) =>{
    if(!req.body.short){
        url_is_generated = true;
    }
    if(url_is_generated){
        //increase the size of the short url if hit a conflict, after 7 conflicts give up
        req.body.short = genShort(initial_short_url_length+conflict_hit_count);
    }

    pgPool.query("INSERT INTO url(full_,short) values($1,$2)",[req.body.full,req.body.short]).then(userResponse =>{
        if(userResponse){
            return res.status(200).json({url:req.protocol + '://' + req.get('host')+'/'+req.body.short});
        }
        return next();
        //return res.status(500).json({error: 'No data available'});
    }).catch(err =>{
        if(err.code === '23505'){ //primary key (short) already exists
            if(url_is_generated){
                if(conflict_hit_count > 6){
                    debug("can't generate url hit 7 conflicts");
                    return next({error: 'generated url space used up, try manually specifying short url.'});
                }else{
                    debug("generated url conflict hit will try again");
                    exports.addLink(req,res,next,true, ++conflict_hit_count);
                }
            }else{
                return next({error: 'This shortened url already exists, please pick another one', status:400});
            }
        }else{
            return next({error: 'Internal Server Error! '+err.message});
        }
    })
}

exports.getFullLink = (req,res, next) =>{
    const short_url = req.url.split('/')[1];
    pgPool.query("SELECT full_ from url where short = $1",[short_url]).then(userResponse =>{
        if(userResponse && userResponse.rows.length > 0){
            return res.redirect(userResponse.rows[0].full_);
        }
        return next();
    }).catch(err =>{
        return next({error: 'Internal Server Error! '+err.message});
    })
}

exports.getAllLinks = (req, res, next) => {
        pgPool.query("SELECT * from url").then(userResponse =>{
            if(userResponse){
                return res.status(200).json({rows:userResponse.rows});
            }
            return next({error: 'No data available'});
        }).catch(err =>{
            return next({error: 'Internal Server Error! '+err.message});
        })
}

exports.clearTable = (req,res, next) =>{
    pgPool.query("TRUNCATE url").then(userResponse =>{
        if(userResponse){
            return res.json({table:'Deleted'});
        }
        return next();
    }).catch(err =>{
        debug(err.message);
        return next({error: 'Failed to delete Table'});
    })
}

