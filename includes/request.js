﻿const request = require('request');
var config = event = null;

class Request {
    send(url, art, cb) {
        request.post(url + 'aktualizuj', { json: true, form: { api: config.siteKey, products: art } },
            function (err, res, body) {
                if (err) {
                    return cb(err);
                }

                if( config.debug ) {
                    console.log('Request->send(', url, ',', art, ') =>', body);
                }

                return cb(null, body);
            });
    }

    list(url, cb) {
        request.post(url + 'produkty', { json: true, form: { api: config.siteKey } },
            function (err, res, body) {
                if (err) {
                    return cb(err);
                }
                
                return cb(null, body);
            });
    }

    allegro( cb ) {
        let base64 = new Buffer( config.allegro.client_id + ':' + config.allegro.client_secret ).toString('base64');

        request.post( {
            url: 'https://allegro.pl/auth/oauth/device', 
            headers: {
                'Authorization': 'Basic '+base64,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'client_id=' + config.allegro.client_id
        }, function( err, res, body ) {
            if (err) {
                console.log( err );
                return cb(err);
            }

            return cb( null, body );
        });
    }

    getOrdersFromShop( site, keys, cb ) {
        request( site+'/wp-json/wc/v3/orders',function (error, response, body) {
            if( error ) return cb ( error );
            if( response.statusCode != 200 ) return cb ( 'Wystąpił błąd poczas próby pobrania zamówień ze sklepu: '+ response.statusCode );

            return cb( null, body );
        }).auth( keys.client, keys.secret);
    }
}

module.exports = function (cfg, e) {
    config = cfg;
    event = e;

    return new Request();
}