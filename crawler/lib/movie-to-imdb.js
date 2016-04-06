const fs = require("fs");
const async = require("async");
const request = require("request");
const fountain = require('fountain-js');
const cheerio = require('cheerio');
const util = require("util");
const FuzzySet = require("fuzzyset.js");

var dictionary = FuzzySet();
var titleImdbObj = {};

var fuzzyMatchedNames = "id\ttitle\tsource\tyear\tlink\tmanual_match\timdb_match\tfuzzy_match\tfuzzy_match_confidence\n";

function main(callback) {
  
  async.series({
    getTopBoxOffice: (cb) => {

      fs.readFile(`${__dirname}/../data/gross_rank.csv`, "utf8", (err, data) => {
        
        var rows = data.split("\n").slice(1);

        async.forEachSeries(rows, (row, cb1) => {

          if(row.length > 0){

            var cleanRow = row.replace(/[\,\"|\"\']+/g, "\t")
            var parts = cleanRow.split("\t");
            var year = parts[0]
            var title = parts[1];
            var imdbID = parts[2];

            var reversed = title.split("").reverse().join("");
            var lastWS = reversed.indexOf(reversed.trim().slice(0,1));
            reversed = reversed.slice(lastWS);
            title = reversed.split("").reverse().join("");

            dictionary.add(title);

            if(typeof titleImdbObj[title.toLowerCase()] === "undefined") {
              titleImdbObj[title.toLowerCase()] = [];
            }
            titleImdbObj[title.toLowerCase()].push({ year: year, imdbID: imdbID, title: title})
          }
          async.setImmediate(() => { cb1(); });

        }, () => {
          cb();

        });
      });
    
    },
    getScrapedURLs: (cb) => {
      
      fs.readFile(`${__dirname}/../../data/fuzzy-matched-titles-more.tsv`, "utf8", (err, data) => {

        var rows = data.split("\n").slice(1);

        async.forEach(rows, (row, cb1) => {

          if (row.length > 0){
            var parts = row.split("\t");
            var scrape_id = parts[0];
            var title = parts[1];
            var source = parts[2]
            var year = parts[3];
            var link = parts[4];
            var manual_match = parts[5];
            var imdb_match = parts[6];
            var fuzzy_match = parts[7];

            var movieIMDB = fuzzy_match;

            if(typeof movieIMDB === "undefined" || movieIMDB.length === 0){
              movieIMDB = imdb_match;
            } 

            var reversed = title.split("").reverse().join("");
            var lastWS = reversed.indexOf(reversed.trim().slice(0,1));
            reversed = reversed.slice(lastWS);
            title = reversed.split("").reverse().join("");



            if (typeof title !== "undefined" && 
                ( movieIMDB === "NULL" || 
                  typeof movieIMDB === "undefined" || 
                  movieIMDB.length === 0)) {
              
              var matchedTitles;

              if (typeof titleImdbObj[title.toLowerCase()] !== "undefined"){
                matchedTitles = [[1, title]]
              } else {
                matchedTitles = dictionary.get(title);
              }

             

              if (matchedTitles) {

                var hasMatched = false;

                var sortedTitles = matchedTitles.sort((a, b) => {return b[0] - a[0]})

                async.forEach(sortedTitles, (matchedTitle, cb2) => {

                  var cleanTitle = matchedTitle[1]; 
                  async.forEach(titleImdbObj[cleanTitle.toLowerCase()], (aMovie, cb3) => {

                    if(!hasMatched){
                      if(aMovie.year === year || year === "NULL"){
                        if(aMovie.imdbID.startsWith("tt")){

                          fuzzyMatchedNames+= `${scrape_id}\t${title}\t${source}\t${year}\t${link}\t${manual_match}\t${imdb_match}\t${aMovie.imdbID}\t${matchedTitle[0].toFixed(3)}\n`;
                          hasMatched = true;
                        }
                      }
                    }
                    async.setImmediate(() => { cb3(); });

                  }, () => {
                    async.setImmediate(() => { cb2(); });
                  });

                }, () => {

                  if(!hasMatched){
                    fuzzyMatchedNames += `${row}\n`;
                  }

                });
               


              } else {
                fuzzyMatchedNames += `${row}\n`;
              }
            } else {
              fuzzyMatchedNames += `${row}\n`;
            }
          }
          async.setImmediate(() => { cb1(); });
        }, () => {
          cb();
        });

      });

    }, 
    done: () => {

      fs.writeFile(`${__dirname}/../../data/fuzzy-matched-titles.tsv`, fuzzyMatchedNames);
      console.log("Finished: movie-to-imdb.js")
      callback();
    }
  });
}

module.exports = main;


