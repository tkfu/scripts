const fs = require("fs");
const async = require("async");
const request = require("request");
const jsdom = require("jsdom").jsdom;
const fountain = require('fountain-js');
const cheerio = require('cheerio');
const util = require("util");

const movieObj = require(`${__dirname}/../../data/js/movieObj`);

var writers = "Movie IMDB ID\tWriter ID\tName\n";

var imdbMovieTitles = {};

var crawledIMDBIds = [];
var uncrawledIMDBIds = [];

var imdbMovieWriter = {};

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

    },
    getUncrawledMovieIds: (cb) => {

      fs.readFile(`${__dirname}/../../data/writers.tsv`, "utf8", (error, data) => {
        
        var rows = data.split("\n");
        async.forEach(rows.slice(1), (row, cb1) => {

          if(row.length > 0){
            var parts = row.split("\t");

            var movieIMDB = parts[0];
            var writerIMDB = parts[1];

            var movie = movieObj[movieIMDB]
            if(crawledIMDBIds.indexOf(movieIMDB) === -1){
              crawledIMDBIds.push(movieIMDB);
            }

            if(typeof imdbMovieWriter[movieIMDB] === "undefined"){
              imdbMovieWriter[movieIMDB] = [];
            }

            if(imdbMovieWriter[movieIMDB].indexOf(writerIMDB) === -1){
              imdbMovieWriter[movieIMDB].push(writerIMDB)
              writers += `${row}\n`;
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
       
      var index = 1;
      async.forEachSeries(uncrawledIMDBIds, (movieIMDB, cb1) => {

        console.log("--------------------")
        console.log(imdbMovieTitles[movieIMDB])
        console.log(`${index}/${uncrawledIMDBIds.length}`);

        request(`http://www.imdb.com/title/${movieIMDB}/fullcredits`, (err, resp, body) => {
          
          var $ = cheerio.load(body);
          index++;
          async.forEachSeries($("h4.dataHeaderWithBorder:contains(Writing Credits)").next().find("a"), (a, cb2) => {

            var writerLink = $(a).attr("href");
            var writerIMDB = writerLink.slice(writerLink.indexOf("name/") + 5, writerLink.indexOf("/?ref"));
            var writerName = $(a).text();

            writers += `${movieIMDB}\t${writerIMDB}\t${writerName}`;
            async.setImmediate(() => { cb2(); }); 

          }, () => {

            fs.writeFile(`${__dirname}/../../data/writers.tsv`, writers);
            async.setImmediate(() => { cb1(); });
          })
        });

      }, () => {
        fs.writeFile(`${__dirname}/../../data/writers.tsv`, writers);
        async.setImmediate(() => { cb(); });

      });

    },
    done: () => {
      console.log("Finished: imdb-writer-scrape.js")
      callback();
    }
  });
}


main(() => { console.log("FINISHED IMDB WRITER SCRAPE") })

module.exports = main;
