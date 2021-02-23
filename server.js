'use strict';

const express = require('express');
const server = express();
const dot = require('dotenv');
dot.config();
const pg = require('pg')

// const client = new pg.Client(process.env.DATABASE_URL)
const client = new pg.Client({ connectionString: process.env.DATABASE_URL,   ssl: { rejectUnauthorized: false } });
client.connect();
const cors = require('cors');

server.use(cors());

const port = process.env.PORT || 4000;



const superAgent = require('superagent')


// Routes 

server.get('/location', locHandler)
server.get('/weather', wetherHandler)
server.get('/parks', parksHandler)
server.get('*', errHandler)


// Handler Functions




// http://localhost:3500/location?city=amman
function locHandler(req, res) {

    const cityName = req.query.city
    let trigger = false;
    let key = process.env.LOCATION_KEY;
    let url = `https://api.locationiq.com/v1/autocomplete.php?key=${key}&q=${cityName}`;
    let SQL = `SELECT * FROM locations;`;

    client.query(SQL)
        .then(result => {
            result.rows.forEach(element => {
                if (element.search_query == cityName) {
                    trigger = true;
                }
            });
            if (trigger) {

                let SQL = `SELECT * FROM locations WHERE search_query='${cityName}';`

                client.query(SQL)
                    .then(result => {
                        let x = new getLocationfromDAtaB(cityName, result.rows[0])

                        function getLocationfromDAtaB(city, data) {
                            this.search_query = city;
                            this.formatted_query = data.formatted_query;
                            this.latitude = data.latitude;
                            this.longitude = data.longitude;
                        }
                        res.send(x)
                    })

            } else if (!trigger) {
                console.log("SSdasdsa");
                superAgent.get(url).then(locData => {
                    let fstLoc = new getLocation(cityName, locData.body[0])

                    function getLocation(city, data) {

                        this.search_query = city;
                        this.formatted_query = data.display_name;
                        this.latitude = data.lat;
                        this.longitude = data.lat;
                    }
                    let citynam = fstLoc.search_query;
                    let formN = fstLoc.formatted_query;
                    let lati = fstLoc.latitude;
                    let long = fstLoc.longitude;
                    let sql = `INSERT INTO locations VALUES($1,$2,$3,$4);`
                    let allRes = [citynam, formN, lati, long]
                    client.query(sql, allRes)
                        .then((result) => {
                            // res.send(result.rows);
                            // res.send('data has been inserted!!');
                        })
                    res.send(fstLoc)
                })
            }

        })



    // const cityName = req.query.city;
    // let key = process.env.LOCATION_KEY;
    // let url = `https://api.locationiq.com/v1/autocomplete.php?key=${key}&q=${cityName}`

    // superAgent.get(url)
    //     .then(locData => {
    //         const locObj = new Location(cityName, locData.body[0]);
    //         res.send(locObj);
    //     })
}













// http://localhost:3500/weather?search_query=amman&formatted_query=Amman%2C%20Amman%2C%2011181%2C%20Jordan&latitude=31.9515694&longitude=35.9239625&page=1
function wetherHandler(req, res) {

    const cityName = req.query.search_query;
    let key = process.env.WEATHER_KEY;
    let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${cityName}&key=${key}`;

    superAgent.get(url)
        .then(wethData => {
            let wethObjArr = wethData.body.data.map(value => {
                return new Weather(value)
            })
            res.send(wethObjArr);
        })
}

// http://localhost:3500/parks?search_query=amman&formatted_query=Amman%2C%20Amman%2C%2011181%2C%20Jordan&latitude=31.9515694&longitude=35.9239625&page=1
function parksHandler(req, res) {

    const cityName = req.query.search_query;
    let key = process.env.PARKS_KEY;
    let url = `https://developer.nps.gov/api/v1/parks?q=${cityName}&api_key=${key}`

    superAgent.get(url)
        .then(parksData => {
            let parksObjArr = parksData.body.data.map(value => {
                return new Parks(value)
            })
            res.send(parksObjArr);
        })
}



function errHandler(req, res) {
    let errObj = {
        status: 500,
        responseText: "Sorry, something went wrong"
    }
    res.send(errObj);
}


// Constructors

function Location(cityName, locData) {
    this.search_query = cityName;
    this.formatted_query = locData.display_name;
    this.latitude = locData.lat;
    this.longitude = locData.lon;
}
function Weather(wetherData) {
    this.forecast = wetherData.weather.description;
    this.time = new Date(wetherData.datetime).toString().slice(0, 15);;
}
function Parks(parksData) {
    this.name = parksData.fullName;
    this.address = `${parksData.addresses[0].line1}" "${parksData.addresses[0].city}" "${parksData.addresses[0].stateCode}"  "${parksData.addresses[0].postalCode}`;
    this.fee = parksData.entranceFees[0].cost;
    this.description = parksData.description;
    this.url = parksData.url;
}

server.listen(port, () => {
    console.log(`Server is listening on Port ${port}`)
})