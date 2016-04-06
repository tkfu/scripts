const fs = require("fs");
const async = require("async");
const request = require("request");
const jsdom = require("jsdom").jsdom;
const fountain = require('fountain-js');
const cheerio = require('cheerio');
const util = require("util");

const movieObj = require(`${__dirname}/../../data/js/movieObj`);

var actors = "Actor IMDB ID\tName\tGender\tBirthdate\n";
var characters = "Movie IMDB ID\tActor IMDB ID\tCharacter Name\n";

var crawedActorIDs = [];
var uncrawledActorIDs = [];


var imdbMovieTitles = {};
var imdbMovieActor = {};

var crawledMovieIMDBIds = [];
var uncrawledMovieIMDBIds = [];



//function main(callback) {
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

      fs.readFile(`${__dirname}/../../data/characters.tsv`, "utf8", (error, data) => {
        
        var rows = data.split("\n");
        async.forEach(rows.slice(1), (row, cb1) => {

          if(row.length > 0){
            var parts = row.split("\t");

            var movieIMDB = parts[0];
            var actorIMDB = parts[1];

            if(crawledMovieIMDBIds.indexOf(movieIMDB) === -1){
              crawledMovieIMDBIds.push(movieIMDB);
            }

            if(typeof imdbMovieActor[movieIMDB] === "undefined"){
              imdbMovieActor[movieIMDB] = [];
            }

            if(imdbMovieActor[movieIMDB].indexOf(actorIMDB) === -1){
              imdbMovieActor[movieIMDB].push(actorIMDB)
              characters += `${row}\n`;
            }

          } 

          async.setImmediate(() => { cb1(); });
        }, () => {

          async.forEachSeries(Object.keys(movieObj), (scrape_id, cb1) => { 

            var imdbID = movieObj[scrape_id].imdb_match;

            if(crawledMovieIMDBIds.indexOf(imdbID) === -1 && uncrawledMovieIMDBIds.indexOf(imdbID) === -1){
              uncrawledMovieIMDBIds.push(imdbID)
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
      console.log(uncrawledMovieIMDBIds.length)
      async.forEachSeries(uncrawledMovieIMDBIds, (movieIMDB, cb1) => {

        console.log("--------------------")
        console.log(movieIMDB)
        console.log(imdbMovieTitles[movieIMDB])
        console.log(`${index}/${uncrawledMovieIMDBIds.length}`);

        request(`http://www.imdb.com/title/${movieIMDB}/fullcredits`, (err, resp, body) => {
          
          var $ = cheerio.load(body);
          index++;


          async.forEach($(".cast_list tr"), (characterRow, cb2) => {

            var actorLink = $(characterRow).find("td[itemprop=actor] a").attr("href");

            if(typeof actorLink !== "undefined"){
                
              var actorIMDB = actorLink.slice(actorLink.indexOf("name/") + 5, actorLink.indexOf("/?ref"))
              
              var actorName = $(characterRow).find("td[itemprop=actor]")
                    .text().replace("(uncredited)", "")
                    .replace("(voice)", "")
                    .replace(/\n/g, "").trim();

              var characterName = $(characterRow).find("td.character")
                    .text().replace("(uncredited)", "")
                    .replace("(voice)", "")
                    .replace(/\n/g, "").trim();

              characters += `${movieIMDB}\t${actorIMDB}\t${characterName}\n`;
            }
            
            async.setImmediate(() => { cb2(); })

          }, () => { 
            fs.writeFile(`${__dirname}/../../data/characters.tsv`, characters);
            async.setImmediate(() => { cb1(); })
          });

        })
         
        
      }, () => {
        fs.writeFile(`${__dirname}/../../data/characters.tsv`, characters);
        cb();
      });

    },
    // getUncrawledActorIds: (cb) => {

    //   fs.readFile(`${__dirname}/../../data/actors-part-1.tsv`, "utf8", (error, data) => {
    //     //actors = data;

    //     var rows = data.split("\n");
    //     async.forEach(rows.slice(1), (row, cb1) => {

    //       if(row.length > 0){
    //         var parts = row.split("\t");

    //         var actorIMDB = parts[0];

    //         if(crawedActorIDs.indexOf(actorIMDB) === -1){
    //           crawedActorIDs.push(actorIMDB);
    //         }
    //       } 

    //       async.setImmediate(() => { cb1(); });
    //     }, () => {
    //       cb();
    //     });

    //   });

    // },
    // getActorGenders: (cb) => {

    //   fs.readFile(`${__dirname}/../../data/characters.tsv`, "utf8", (error, data) => {
    //     var rows = data.split("\n");
    //     console.log(rows.length);
        
    //     async.series({
    //       getIDs: (cb1) => {
    //         async.forEach(rows.slice(1), (row, cb2) => {

    //           var parts = row.split("\t");
    //           var actorIMDB = parts[1];

    //           if(uncrawledActorIDs.indexOf(actorIMDB) === -1 && crawedActorIDs.indexOf(actorIMDB) === -1){
    //             uncrawledActorIDs.push(actorIMDB);
    //           }
    //           async.setImmediate(() => { cb2(); });

    //         }, () => {
    //           cb1();
    //         });
    //       },
    //       crawlIMDB: (cb1) => {
    //         var index = 1;
    //         async.forEachSeries(uncrawledActorIDs, (actorIMDB, cb2) => {

    //           request(`http://www.imdb.com/name/${actorIMDB}`, (err, resp, body) => {

    //             var $ = cheerio.load(body); 

    //             var name = $("h1.header span[itemprop=name]").text();
    //             var gender = "?";

    //             if($("a[href=#actress]").length > 0){
    //               gender = "f";

    //             } else if($("a[href=#actor]").length > 0){
    //               gender = "m";
    //             }

    //             var birthdate = $("time[itemprop=birthDate]").attr("datetime");

    //             console.log("-----------------");
    //             console.log(`${index}/${uncrawledActorIDs.length}`)
    //             console.log(`${gender}\t${actorIMDB}\t${birthdate}\t${name}`);
    //             index++;

    //             actors += `${actorIMDB}\t${name}\t${gender}\t${birthdate}\n`;
    //             fs.writeFile(`${__dirname}/../../data/actors-part-2.tsv`, actors);
    //             async.setImmediate(() => { cb2(); });
    //           });

    //         }, () => {
    //           cb1();
    //         })
    //       },
    //       done: () => {
    //         cb();
    //       }
    //     });
      
    //   });

    // },
    done: () => {
      console.log("Finished: imdb-character-scrape.js")
      //callback();
    }
  })
// }

// main(() => { console.log("FINISHED IMDB CHARACTER SCRAPE") })

//module.exports = main;