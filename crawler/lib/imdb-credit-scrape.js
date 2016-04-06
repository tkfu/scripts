const fs = require("fs");
const async = require("async");
const request = require("request");
const jsdom = require("jsdom").jsdom;
const fountain = require('fountain-js');
const cheerio = require('cheerio');
const util = require("util");

const movieObj = require(`${__dirname}/../../data/js/movieObj`);

var productionCompany = "Movie IMDB ID\tProduction Company ID\tCompany Name\n";

var imdbMovieTitles = {};

var crawledIMDBIds = [];
var uncrawledIMDBIds = [];

var imdbMovieCompany = {};

function main(callback) {
  async.series({
    getScrapedMapping: (cb) => {
       async.forEachSeries(Object.keys(movieObj), (scrape_id, cb1) => {

        var movie = movieObj[scrape_id];
        imdbMovieTitles[movie.imdb_match] = movie.title;
        
        async.setImmediate(() => { cb1() });

        }, () => {
          cb();
        })
      });

    },
    getUncrawledMovieIds: (cb) => {

      fs.readFile(`${__dirname}/../../data/production-company.tsv`, "utf8", (error, data) => {
        
        var rows = data.split("\n");
        async.forEach(rows.slice(1), (row, cb1) => {

          if(row.length > 0){
            var parts = row.split("\t");

            var movieIMDB = parts[0];
            var companyIMDB = parts[1];

            var movie = movieObj[movieIMDB]
            if(crawledIMDBIds.indexOf(movieIMDB) === -1){
              crawledIMDBIds.push(movieIMDB);
            }

            if(typeof imdbMovieCompany[movieIMDB] === "undefined"){
              imdbMovieCompany[movieIMDB] = [];
            }

            if(imdbMovieCompany[movieIMDB].indexOf(companyIMDB) === -1){
              imdbMovieCompany[movieIMDB].push(companyIMDB)
              productionCompany += `${row}\n`;
            }
          } 

          async.setImmediate(() => { cb1(); });
        }, () => {

          async.forEachSeries(Object.keys(movieObj), (scrape_id, cb1) => { 

            var imdbID = movieObj[scrape_id].imdb_match;

            if(crawledIMDBIds.indexOf(imdbID) === -1 && uncrawledIMDBIds.indexOf(imdbID) === -1){
              uncrawledIMDBIds.push(imdbID)
            }
            async.setImmediate(() => { cb1(); })

          }, () => {
            cb();
          });


        });

      });
    },
    iterateMovies: (cb) => {
       //var characters = "Scrape ID\tMovie IMDB ID\tActor IMDB ID\tCharacter Name\n";

      var index = 1;
      async.forEachSeries(uncrawledIMDBIds, (movieIMDB, cb1) => {

        console.log("--------------------")
        console.log(imdbMovieTitles[movieIMDB])
        console.log(`${index}/${uncrawledIMDBIds.length}`);

        request(`http://www.imdb.com/title/${movieIMDB}/companycredits`, (err, resp, body) => {
          
          var $ = cheerio.load(body);
          index++;
          async.forEachSeries($("#production").next(".simpleList").find("li a"), (a, cb2) => {

            var companyLink = $(a).attr("href");
            var companyIMDB = companyLink.slice(companyLink.indexOf("company/") + 8, companyLink.indexOf("?ref"));
            var companyName = $(a).text();

            productionCompany += `${movieIMDB}\t${companyIMDB}\t${companyName}\n`;
            async.setImmediate(() => { cb2(); }); 

          }, () => {

            fs.writeFile(`${__dirname}/../../data/production-company.tsv`, productionCompany);
            async.setImmediate(() => { cb1(); });
          })
        });

      }, () => {

        fs.writeFile(`${__dirname}/../../data/production-company.tsv`, productionCompany);
        async.setImmediate(() => { cb(); });

      });

    },
    done: () => {
      console.log("Finished: imdb-credit-scrape.js")
      callback();
    }
  });
}


main(() => { console.log("FINISHED IMDB CREDIT SCRAPE") })

module.exports = main;
