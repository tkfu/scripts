var allActors = [];
var actorLines = {};
var lines = [];
var actors = [];

$(document).ready(() => {


	async.series({
		getActorLines: (cb) => {
			d3.tsv("../../data/character-override-match.tsv", (err, characterLines) => {
				lines = characterLines;

				async.forEach(lines, (line, cb1) => {

					if(line["closest_imdb_character_id"].startsWith("nm")){
						if(typeof actorLines[line["closest_imdb_character_id"]] === "undefined"){
							actorLines[line["closest_imdb_character_id"]] = [];
						}

						actorLines[line["closest_imdb_character_id"]].push(line);
					}
					async.setImmediate(() => { cb1(); });
				}, () => {
					cb();
				});
			});
		},
		getActors: (cb) => {

			d3.tsv("../../data/nndb-actor-1.tsv", (err, actors1) => {
				allActors = allActors.concat(actors1);
				d3.tsv("../../data/nndb-actor-2.tsv", (err, actors2) => {
					allActors = allActors.concat(actors2);
					cb();
				});
			});

		}, filterTaggedActors: (cb) => {
			
			actors = allActors.filter((actor) => { return actor["nndb id"] !== "-"});
			cb();

		}, done: () => {
			console.log(actors)
			drawActors();
		}
	})
	
});

function drawActors(){

	var race = {};
	var nationalities = {};

	async.forEach(actors, (actor, cb) => {

		var actorNationality = actor["nndb nationality"].replace(/^\s+|\s+$/g, "");
		if(typeof nationalities[actorNationality] === "undefined"){
			nationalities[actorNationality] = [];
		}
		nationalities[actorNationality].push(actor);

		var actorRace = actor["race or ethnicity"].replace(/^\s+|\s+$/g, "");
		
		if(typeof race[actorRace] === "undefined"){
			race[actorRace] = [];
		}
		race[actorRace].push(actor);


		async.setImmediate(() => { cb(); });
	}, () => {
		drawRace(race)
		drawNationality(nationalities)
	})

}

function drawRace(raceObj) {
	var races = Object.keys(raceObj).map((race) => { 
		return {
			race: race, 
			actors: raceObj[race].map((a) => {
				a.numLines = 0;

				if(typeof actorLines[a["IMDB"]] !== "undefined"){
					a.numLines = d3.sum(actorLines[a["IMDB"]].map((l) => { return l["total_num_of_words"]}));
				}
				return a;
			}).sort((a, b) => { return b.numLines - a.numLines })
	}});
	
	var svg = d3.select("#race-container")
								.append("g")
								.attr("class", "block-container")
								.attr("width", 1000)
   							 .attr("height", 500);


	svg.selectAll(".block-container")
					    	.data(races.sort((a, b) => { return b.actors.length - a.actors.length}))
					    .enter()
	    					.append("rect")
								.attr("class", "race-block")
	    					.attr("height", 20)
	    					.attr("width", (d) => { return (d.actors.length / 8) })
	    					.style("margin-top", 10)
	    					.style("fill", "blue")
	    					.attr("transform", (d, i) => { 
	    						return `translate(0, ${(i * 21) })`; 
	    					})
	    					.on("mouseover", (d) => {

	    						var males = d.actors.filter((actor) => { 
	    												return actor["nndb gender"].trim() === "Male";
	    											});

	    						var females = d.actors.filter((actor) => { 
	    												return actor["nndb gender"].trim() === "Female";
	    											});

	    						$("#actor-list").html(
	    							"<h3>" + d.race + " Actors/Actresses</h3>"
	    							+ "<table style='width:500px'>"
	    								+ "<tbody>"
	    									+ "<tr>"	
	    										+ "<td style='vertical-align: top'>"

	    											+ males.map((actor, i) => { 
	    												return `${i + 1}. ${actor["imdb name"]} - <small style='float:right'>${actor.numLines} </small>` 
	    											}).join("<br>")

	    										+ "</td>"
	    										+ "<td style='vertical-align: top'>"

	    											+ females.map((actor, i) => { 
	    												return `${i + 1}. ${actor["imdb name"]} - <small style='float:right'>${actor.numLines} </small>` 
	    											}).join("<br>")

	    											+ "</td>"
	    									+ "</tr>"
	    								+ "</tbody>"
	    							+ "</table>"
	    						)
	    					})
	    					// .on("mouseout", (d) => {
	    					// 	$("#actor-list").html("")
	    					// });

}

function drawNationality(nationalityObj) {
	var nationalities = Object.keys(nationalityObj).map((nationality) => { return {nationality: nationality, actors: nationalityObj[nationality] }});

}


