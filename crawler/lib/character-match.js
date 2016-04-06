const fs = require("fs");
const async = require("async");
const request = require("request");
const fountain = require('fountain-js');
const cheerio = require('cheerio');
const util = require("util");
const FuzzySet = require("fuzzyset.js");
const _ = require("underscore")

const movieObj = require(`${__dirname}/../../data/js/movieObj`);
const characterObj = require(`${__dirname}/../../data/js/characterObj`);

const cornellCharacterObj = require(`${__dirname}/../../data/js/cornellCharacterObj`);
const imsdbCharacterObj = require(`${__dirname}/../../data/js/imsdbCharacterObj`);
const manualCharacterObj = require(`${__dirname}/../../data/js/manualCharacterObj`);
  
var movieMaxLineNumber = {};
var characterOverrideObj = {};

var matchedIMDBChars = {};


var scriptKey = {
  "5527": {
    r: "Rapunzel", 
    f: "Flynn Rider", 
    g: "Mother Gothel", 
    hook: "Hook-Hand Thug", 
    big: "Big Nose Thug", 
    st: "The Stabbington Brothers", 
    vlad: "Vladamir", 
    shorty: "Shorty Thug", 
    youngr: "Young Rapunzel", 
    capt: "Captain of the Guard"
  }
}


function matchCharacters(options, callback) {

  var characters = options.characters;

  var scrape_id = options.scrape_id;

  var movie = movieObj[scrape_id];
  var overrideChars = characterOverrideObj[scrape_id];

  var movieCharacters = characterObj[movie.imdb_match];

  function getMatchedCharacter (charName) {

    if(["NULL", "-"].indexOf(charName) !== -1){
      return null;
    } 

    var lowerCaseCharName = charName.toLowerCase().replace(/[^a-z|A-Z|\s]/g, "");

    if(typeof scriptKey[scrape_id] !== "undefined") {
      var tempNewName = scriptKey[scrape_id][lowerCaseCharName.trim()];

      if(typeof tempNewName !== "undefined"){
        lowerCaseCharName = tempNewName.toLowerCase().replace(/[^a-z|A-Z|\s]/g, "");
      }
    }


    var removedPeriodChars = Object.keys(movieCharacters.charActorImdb).map((key) => { return key.toLowerCase().replace(/[^a-z|A-Z|\s]/g, "")})

    var foundIndex = removedPeriodChars.indexOf(lowerCaseCharName);
    
    //exact match
    if(foundIndex !== -1){

      var cleanCharName = Object.keys(movieCharacters.charActorImdb)[foundIndex];
      if(typeof movieCharacters.charActorImdb[cleanCharName.toLowerCase()] !== "undefined"){
        return {
          charName: cleanCharName,
          imdbID: movieCharacters.charActorImdb[cleanCharName.toLowerCase()]
        }
      }

      return null;

    } else {

        var foundIndex = -1;

        for(var x = 0; x < removedPeriodChars.length; x++){
          var imdbCharName = removedPeriodChars[x];

          var names = [charName.toLowerCase().replace(/[^a-z|A-Z|\s]/g, ""), imdbCharName]
                      .sort((a, b) => { return b.length - a.length});

          var subsetIndex = names[0].indexOf(names[1]);

          if(subsetIndex !== -1){
            foundIndex = x;
            break;
          }
        }

        if(foundIndex !== -1){
          var cleanCharName = Object.keys(movieCharacters.charActorImdb)[foundIndex];
          if(typeof movieCharacters.charActorImdb[cleanCharName.toLowerCase()] !== "undefined"){
            return {
              charName: cleanCharName,
              imdbID: movieCharacters.charActorImdb[cleanCharName.toLowerCase()]
            }
          } 
        }
      

      return null;
    }
  }

  var tempMatchedChars = {}

  var undefined_count = 0;
 
  async.forEachSeries(Object.keys(characters), (charName, cb2) => {
    var character = characters[charName];

    var hasIMDB = false;

    function generateMatchedCharacterData(options){

      var id = `undefined-${undefined_count}`;

      var matchedCharacter = options.matchedCharacter;
      var newCharacter = options.newCharacter;

      if(!isNaN(parseInt(character.name.toLowerCase().trim().replace(/[^a-z|A-Z|0-9]/g, "")))){
        return null;
      } 

      if(matchedCharacter !== null){
        hasIMDB = true
        id = matchedCharacter.imdbID
        closest_character_name = matchedCharacter.charName;

        if(typeof newCharacter !== "undefined"){
          if(newCharacter.actor_change.toLowerCase() === "n/a"){
            hasIMDB = false;
          }
        }
      } 
        
      if(!hasIMDB) {
        id = `undefined-${undefined_count}`;
        closest_character_name = "-";
        undefined_count++;
      }
    
      if(typeof tempMatchedChars[id] === "undefined"){
        tempMatchedChars[id] = { 
          character_from_script: character.name.toLowerCase(),
          closest_imdb_character_id: matchedCharacter !== null? id: "NULL",
          overrideGender: overrideGender,
          closest_character_name: closest_character_name, 
          dialogue:[]
        }
        character.lineIndex.forEach((value, i) => {
          if(character.numberOfWords[i] > 0) {
            tempMatchedChars[id].dialogue.push({
              lineIndex: character.lineIndex[i],
              numberOfLines: character.numberOfLines[i],
              numberOfWords: character.numberOfWords[i]
            });
          }
        });

      }


        
      tempMatchedChars[id].dialogue = (
        tempMatchedChars[id].dialogue.sort((a, b) => {
          return a.lineIndex - b.lineIndex;
        })
      );

      if(typeof movieMaxLineNumber[scrape_id] === "undefined"){
        movieMaxLineNumber[scrape_id] = -1;
      }

      if(tempMatchedChars[id].dialogue.length > 0){
        if(tempMatchedChars[id].dialogue[tempMatchedChars[id].dialogue.length -1].lineIndex > movieMaxLineNumber[scrape_id]){
          movieMaxLineNumber[scrape_id] = tempMatchedChars[id].dialogue[tempMatchedChars[id].dialogue.length -1].lineIndex;
        }
      }   
    }  

    var matchedCharacter = null;
    var deleteCharacter = true;

    var closest_character_name = "-";
    var overrideGender = null;
  
    if(typeof overrideChars === "undefined"){

      matchedCharacter = getMatchedCharacter(character.name);
      generateMatchedCharacterData({matchedCharacter: matchedCharacter});

      async.setImmediate(() => { cb2(); });

    } else {
      var newCharacter = overrideChars[character.name.toLowerCase().replace(/[^a-z|A-Z|\s]/g, "")]
      if(typeof newCharacter === "undefined"){
        
        matchedCharacter = getMatchedCharacter(character.name);
        generateMatchedCharacterData({matchedCharacter: matchedCharacter});

        async.setImmediate(() => { cb2(); });

      } else {
        deleteCharacter = ([1, "1"].indexOf(newCharacter.delete_character.trim()) !== -1)
      
        if (!deleteCharacter){
          var confidence = newCharacter.confidence;
          if(confidence === "-"){
            confidence = 0;
          }

          matchedCharacter = getMatchedCharacter(character.name);

          if(matchedCharacter === null && parseFloat(confidence) > 0.75){
            matchedCharacter = getMatchedCharacter(newCharacter.closest_character_name_from_imdb_match);
          } 

          if(matchedCharacter === null){
            matchedCharacter = getMatchedCharacter(newCharacter.actor_new_join);
          }

          if(matchedCharacter === null){
            matchedCharacter = getMatchedCharacter(newCharacter.actor_change);
          }

          overrideGender = newCharacter.missing_actor_gender;
          generateMatchedCharacterData({matchedCharacter: matchedCharacter, newCharacter: newCharacter});

          async.setImmediate(() => { cb2(); });

        }
      }
    }

    async.setImmediate(() => { cb2(); });

  }, () => {
   // console.log(tempMatchedChars)
    callback(tempMatchedChars);
  });
}

async.series({
  createOverrideObject: (cb) => {

    fs.readFile(`${__dirname}/../../data/character-override.tsv`, "utf8", (err, data) => {

      var rows = data.split("\n").slice(1);

      async.forEachSeries(rows, (row, cb1) => {

        if(row.length > 0){
          var parts = row.split("\t");

          var imdb_id = parts[0];
          var script_id = parts[1];
          var actor_change = parts[2];
          var missing_actor_gender = parts[3];
          var actor_new_join = parts[4];
          var total_num_of_character_lines = parts[5];
          var character_from_script = parts[6];
          var closest_character_name_from_imdb_match = parts[7];
          var confidence = parts[8];
          var delete_character = parts[9];
          var closest_imdb_character_imdb = parts[10];

          if(typeof characterOverrideObj[script_id] === "undefined"){
            characterOverrideObj[script_id] = {};
          }

          characterOverrideObj[script_id][character_from_script] = {
            imdb_id: imdb_id,
            script_id: script_id,
            actor_change: actor_change,
            missing_actor_gender: missing_actor_gender,
            actor_new_join: actor_new_join,
            total_num_of_character_lines: total_num_of_character_lines,
            character_from_script: character_from_script,
            closest_character_name_from_imdb_match: closest_character_name_from_imdb_match,
            confidence: confidence,
            delete_character: delete_character,
            closest_imdb_character_imdb: closest_imdb_character_imdb
          }


        }
        async.setImmediate(() => { cb1(); });
      }, () => {
        cb();
      })

    })

  }, 
  runCharacterMatch: (cb) => {

    var index = 1;
    var keys = Object.keys(movieObj);

    //keys = ["29"];
    async.forEachSeries(keys, (scrape_id, cb1) => {
      
      var movie = movieObj[scrape_id];
      console.log("--------------MATCHING");
      console.log(`${index}/${Object.keys(movieObj).length}`);
      console.log(movie);
      index++;
      var movieCharacters = characterObj[movie.imdb_match];
     
      if(typeof movieCharacters !== "undefined"){
        async.series({
          getParsedCharacters: (cb2) => {

            if(movie.source === "cornell"){

              var cornellId = movie.cornellId;
              var characters = cornellCharacterObj[cornellId].characters;

              matchCharacters({scrape_id: scrape_id, characters: characters}, (result) => {
                matchedIMDBChars[scrape_id] = result;
                async.setImmediate(() => { cb2(); });
              });

            } else if (movie.source === "imsdb") {

              var characters = imsdbCharacterObj[scrape_id].characters;

              matchCharacters({scrape_id: scrape_id, characters: characters}, (result) => {
                matchedIMDBChars[scrape_id] = result;
                async.setImmediate(() => { cb2(); });
              });

            } else if (movie.source === "manual" || movie.source === "scriptdrive"){

              var characters = manualCharacterObj[scrape_id];

              if (typeof characters !== "undefined") {
                matchCharacters({scrape_id: scrape_id, characters: characters}, (result) => {
                  matchedIMDBChars[scrape_id] = result;
                  async.setImmediate(() => { cb2(); });
                });
              } else {
                async.setImmediate(() => { cb2(); });
              }

            } else {
              async.setImmediate(() => { cb2(); });
            }

          },
          done: () => {
            async.setImmediate(() => { cb1(); });
          }
        });

      } else {
        async.setImmediate(() => { cb1(); });
      }

    }, () => {
      //var rows = "Scrape Id\tActor IMDB\tLine Indexes\tNumber of Lines\n";

      //var output_rows = "script_id\timdb_id\tcharacter_from_script\tclosest_character_name_from_imdb_match\ttotal_num_words\tclosest_imdb_character_id\tmissing_actor_gender\n"
      var output_rows = "script_id\timdb_id\tcharacter_from_script\tclosest_character_name_from_imdb_match\ttotal_num_words\tline_indexes\tclosest_imdb_character_id\tmissing_actor_gender\n"
      
      var linesCSVIndexCounter = 0;
      var linesCSVIndex = 0;

      var outputLineIndex = 0;
      var writeIndex = 1;


      var numFilmsWithMatchedCharacters = 0;
      async.forEachSeries(Object.keys(matchedIMDBChars), (scrape_id, cb1) => {

        var movie = movieObj[scrape_id];

        var charSet = matchedIMDBChars[scrape_id];

        console.log("--------------WRITING");
        console.log(`${writeIndex}/${Object.keys(matchedIMDBChars).length}`);
        console.log(movie);
        console.log( `${Object.keys(charSet).length} matchedCharacter`)
        writeIndex++;

        if(Object.keys(charSet).length > 0) {
          numFilmsWithMatchedCharacters++;
        }

        async.forEachSeries(Object.keys(charSet), (imdbID, cb2) => {


          var character = charSet[imdbID];

          var lineIndexes = character.dialogue.map((lineInfo) => { return lineInfo.lineIndex; });
          // var numberOfLines = character.dialogue.map((lineInfo) => { return lineInfo.numberOfLines; }).join()
          var numberOfWords = _.reduce(character.dialogue.map((lineInfo) => {return lineInfo.numberOfWords }), 
                                      (memo, num) =>{ return parseInt(memo) + parseInt(num); }, 0)

          /*
            // var max = movieMaxLineNumber[scrape_id]

            // var binaryString = "";
            // for(var x = 1; x <= max; x++) {

            //   if(lineIndexes.indexOf(x) !== -1){
            //     binaryString += "1";
            //   } else {
            //     binaryString += "0";
            //   }
            // }
            // // binaryString = 1111000011110000

            // splitByFour = binaryString.match(/.{1,4}/g).map((num) => {
            //   return `${num}0000`.slice(0, 4);
            // });
            // // splitByFour = ["1111", "0000", "1111", "0000"]

            // hexedArray = splitByFour.map((num) => {
            //   return parseInt(num, 2).toString(16);
            // });
            // // hexedArray = ["f", "0", "f", "0"]
            
            // var lineIndexHex = hexedArray.join("").replace(/^0+/, '');

            // // RETURN TO ORIGINAL LINE INDEXES
            // // returnedBinarySplitByFour = hexedArray.map((num) => {
            // //  return `0000${parseInt(num, 16).toString(2)}`.slice(-4)
            // // });
            // // console.log(returnedBinarySplitByFour)
            // // //returnedBinarySplitByFour = ["1111", "0000", "1111", "0000"]

            // // returnedDecimalValues = [];
            // // returnedBinarySplitByFour.join("").split("").forEach((item, i) => {
            // //  var num = parseInt(item);
            // //  if(num != 0){
            // //    returnedDecimalValues.push(i + 1);
            // //  }
            // // });
          */

          var character_imdb = character.closest_imdb_character_id;

          if(character_imdb.startsWith("undefined")){
            character_imdb = "NULL"
          }

          var overrideGender = "NULL";

          if(character.overrideGender !== null){
            overrideGender = character.overrideGender;
          }

          //word count
          //output_rows += `${scrape_id}\t${movie.imdb_match}\t${character.character_from_script}\t${character.closest_character_name}\t${numberOfWords}\t${character_imdb}\t${overrideGender}\n` 
          output_rows += `${scrape_id}\t${movie.imdb_match}\t${character.character_from_script}\t${character.closest_character_name}\t${numberOfWords}\t${lineIndexes.join(", ")}\t${character_imdb}\t${overrideGender}\n` 
          
          fs.writeFile(`${__dirname}/../../data/character-override-match-line-index-${linesCSVIndex}-index.tsv`, output_rows);


          outputLineIndex++;
          linesCSVIndexCounter++;

          if(linesCSVIndexCounter === 50000) {
            linesCSVIndexCounter = 0;
            linesCSVIndex++;
            //output_rows = "script_id\timdb_id\tcharacter_from_script\tclosest_character_name_from_imdb_match\ttotal_num_words\tclosest_imdb_character_id\tmissing_actor_gender\n"
            output_rows = "script_id\timdb_id\tcharacter_from_script\tclosest_character_name_from_imdb_match\ttotal_num_words\tline_indexes\tclosest_imdb_character_id\tmissing_actor_gender\n"
      
          
          }
          async.setImmediate(() => { cb2(); });

        }, () => {
          //fs.writeFile(`${__dirname}/../../data/character-override-match-line-index.tsv`, output_rows);
          async.setImmediate(() => { cb1(); });
        });
       
      }, () => {
        // fs.writeFile(`${__dirname}/../../data/character-override-match-line-index.tsv`, output_rows);
        
        // console.log(`${numFilmsWithMatchedCharacters} films with matchedCharacter`)
        // console.log(`${outputLineIndex} numLines in speadsheet`)
        // console.log(`${numCharThings} imdb characters`)
        //fs.writeFile(`${__dirname}/../../data/character-override-match.tsv`, output_rows);
        cb();
      })

    });

  },
  done: () => {
    console.log("Finished: character-match.js")
  }
})






