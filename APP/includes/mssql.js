﻿const SKU_TYPE_DEFAULT = 0;
const SKU_TYPE_MIN = 1;
const SKU_TYPE_ADD = 2;

const async = require('async'),
    fs = require('fs'),
    mssql = require('mssql'),
    event = require('./events.js');

const parseArticleFile = function( mag ) {
    return './artykuly-'+ mag +'.txt';
};

var config = {};

class SQLRequest {
    makeConnection(cb) {
        let mssqlConfig = {
            "user": config.getValue( 'mssql.user' ),
            "password": config.getValue( 'mssql.password' ),
            "server": config.getValue( 'mssql.server' ),
            "database": config.getValue( 'mssql.database' ),
            "pool": {
                "max": Number( config.getValue( 'mssql.pool.max' ) ),
                "min": Number( config.getValue( 'mssql.pool.min' ) ),
                "idleTimeoutMillis": Number( config.getValue( 'mssql.pool.idleTimeoutMillis' ) )
            },
            "options": {
                "encrypt": Boolean( Number( config.getValue( 'mssql.options.encrypt' ) ) )
            },
            "port": Number( config.getValue( 'mssql.port' ) ),
            "stream": Boolean( Number( config.getValue( 'mssql.stream' ) ) ),
            "parseJSON": Boolean( Number( config.getValue( 'mssql.parseJSON' ) ) )
        };

        console.log( mssqlConfig );

        mssql.connect( mssqlConfig, function (err) {
            return cb(err);
        });

        mssql.on('error', function (err) {
            config.logs('mssql error!' + err);
        });
    }

    closeConnection() {
        mssql.close();
    }

    checkArticleFile( mag, cb ) {
        if( !fs.existsSync( parseArticleFile( mag ) ) ) return cb( true );

        return cb( /*fs.statSync( parseArticleFile( mag ) ).mTime - new Date() > 3600*/ true );
    }

    prepareRequest( products, mag, cb ) {
        var artykuly = {};

        async.waterfall([
            function( callback ) {
                fs.readFile( parseArticleFile( mag ), function(err, data) {
                    if (err) return callback( err );
                    
					data = JSON.parse( 
                        data.toString() || '{}'
                    );					
					
                    return callback( null, data );
                });
            },
            function( cachedProducts, callback ) {
                async.forEachOf(products, function (pValue, pKey, pCallback) {
                    var multiSKU = ''; var SKUType = SKU_TYPE_DEFAULT; var tempCount = 0;

                    if( typeof pValue.sku !== 'string' ) {
						console.log( pValue, 'jest niepoprawnym ciągiem!', pKey );
						return pCallback(null);
					}
						
					if( pValue.sku.length < 1 ) {
						console.log( pValue, 'brak sku!' );
						return pCallback(null);
					}
					
					multiSKU = pValue.sku.split(/:|\&|\+/g);
       
                    if( pValue.sku.indexOf('&') >= 0 )      SKUType = SKU_TYPE_MIN;
                    else if( pValue.sku.indexOf('+') >= 0 ) SKUType = SKU_TYPE_ADD;
        
                    async.forEachOf(multiSKU, function (mValue, mKey, mCallback) {
                        if( mValue == '' ) return mCallback( null );
                        if( typeof cachedProducts[ mValue ] === 'undefined' ) {
                            console.log( mValue, 'nie istnieje!' );
                            tempCount = 0;
                            return mCallback(null);
                        }

                        var productCount = cachedProducts[ mValue ][1];

                        switch( SKUType ) {
                            case SKU_TYPE_MIN: {
								if( tempCount == 0 ) tempCount = productCount;
                                if( productCount < tempCount ) tempCount = productCount;
                                //console.log( 'SKU-TYPE-MIN', productCount, mValue, pValue );
                            } break;

                            case SKU_TYPE_ADD: {
                                tempCount += productCount;
                                //console.log( 'SKU-TYPE-ADD', productCount, mValue, pValue );
                            } break;

                            default: {
                                tempCount = productCount;
                                //console.log( 'SKU-TYPE-NORMAL', productCount, mValue, pValue );
                            }
                        }

                        return mCallback(null);
                    }, function (err) {
                        artykuly[ pValue.id ] = tempCount;
                        return pCallback(null);
                    });
                }, function (err) {
                    if( err ) return callback( err );
                    return callback( null, artykuly );
                });
            }
        ], function(err, artykuly) {
            if( err ) return cb( err );
            return cb( null, artykuly );
        });
    }

    refreshProducts(mag, cb) {
        this.closeConnection();
        this.makeConnection(function (err) {
            if (err) return cb(err, true);
            
            const msreq = new mssql.Request();
            msreq.stream = true;
            msreq.query('SELECT Nazwa1, NrKatalogowy, IloscDostepna FROM WIDOK_ARTYKUL WHERE idMagazynu = '+mag+' ORDER BY nrKatalogowy'); // or request.execute(procedure)

            var artykuly = {};

            msreq.on('row', function (row) {
                /*if (typeof products[row.NrKatalogowy] === 'undefined') {
                    if (row.IloscDostepna) {
                        //event.emit('show-info', 'Brak artykułu: ' + row.Nazwa1 + ' [ ' + row.NrKatalogowy + ' ] Ilość:' + row.IloscDostepna);
                    }
                } else {
                // event.emit( 'show-info', 'Artykuł jest: ' + row.Nazwa1 );
                }*/

                artykuly[ row.NrKatalogowy ] = [ row.Nazwa1, row.IloscDostepna ];
            });

            msreq.on('error', function (err) {
                config.logs('Wystąpił błąd podczas pobierania artykułów z bazy danych:' + err);
            });

            msreq.on('done', function (result) {
                console.log( 'Otwieram plik:', parseArticleFile( mag ) );
                fs.open( parseArticleFile( mag ), 'w', (err, fd) => {
                    if (err) return cb(err);
        
                    var text = JSON.stringify(artykuly, null, 2);

                    fs.appendFile(fd, text, 'utf8', (err) => {
                        if (err) return cb(err);
        
                        fs.close(fd, (err) => {
                            if (err) return cb(err);
        
                            return cb(null);
                        });
                    });
                });
            });
        });
    }
}

event.on( 'mssql:offer:get', function(e) {
    console.log( 'mssql:offer:get', e );
});

module.exports = function (cfg) {
    config = cfg;

    return new SQLRequest();
}