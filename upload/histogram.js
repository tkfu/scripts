function generateMovieData (callback) {

  var data = [];
  for(var m in moviesObj){
    var movie = moviesObj[m];

    movie.males = 0;
    movie.females = 0;
    movie.questions = 0;
    movie.male_words = 0;
    movie.female_words = 0;
    movie.question_words = 0;
    movie.total_words = 0;

    for(var c in movie.characters){
      var char_id = movie.characters[c];
      var character = characters[char_id];
      var char_words = character_words[char_id];

      //movie.total_words += char_words;
      if(character.gender === "m"){
        movie.males++;
        movie.male_words += char_words;

      } else if (character.gender === "f"){
        movie.females++;
        movie.female_words += char_words;

      } else {
        movie.questions++;
        movie.question_words += char_words;

      }
    }

    movie.total_words = movie.female_words +  movie.male_words;
   
    data.push(movie);
  }

  callback(data)
}

function drawHistogram(){
  generateMovieData((movieData) => {
    // Generate a Bates distribution of 10 random variables.
    
    var values = [];

    for(var d in movieData){
      if(movieData[d].total_words > 0){
        values.push(movieData[d].female_words / movieData[d].total_words);
      }
    }

    // A formatter for counts.
    var formatCount = d3.format(".0%");

    var margin = {top: 10, right: 30, bottom: 30, left: 50},
        width = 700 - margin.left - margin.right,
        height = 450 - margin.top - margin.bottom;

    var x = d3.scale.linear()
        .domain([0, 1])
        .range([0, width]);

    // Generate a histogram using twenty uniformly-spaced bins.
    var data = d3.layout.histogram()
        .bins(x.ticks(10))
        (values);

    var bucketData = [];

    var bucketSize = 20;
    var bucketIndexes = {};
    for(var d in movieData){
      var point = movieData[d];
      if(point.total_words > 0){
        point.female_percent = point.female_words / point.total_words;
        point.x = point.female_percent;

        point.bucket = x(Math.floor(point.female_percent * bucketSize) / bucketSize)

        if(typeof bucketIndexes[point.bucket] === "undefined"){
          bucketIndexes[point.bucket] = 0;
        }
        bucketIndexes[point.bucket]++;

        point.y = bucketIndexes[point.bucket];

        bucketData.push(point)
      }
    }

    var y = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height, 0]);


    var svg = d3.select("#histogram")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    var axisTickValues = [0.25, 0.5, 0.75];
    
    var yScale = d3.scale.linear()
            .domain([0, 1])
            .range([0, height - (margin.top)]);

    var tickLine = svg.append("g")
            .attr("class", "tick-line")
            // .attr("transform", 
            //       "translate(" + margin + ",0)");
    
    for(var v in axisTickValues){
       tickLine.append("line")
            .attr("x1", 0 - margin.left)
            .attr("x2", width + margin.right)
            .attr("y1", yScale(axisTickValues[v]))
            .attr("y2", yScale(axisTickValues[v]));
    }


    var buckets = svg.selectAll(".blocks")
        .data(bucketData)
      .enter().append("g")
        .attr("transform", function(d, i) { 
          return "translate(" + d.bucket  + "," + y(d.y) + ")"; 
        })

    buckets.append("rect")
      .attr("class", "block")
      .style("fill", (d) => { 

        var color = "black";
        if(d.x < 0.5){
          color = "#146089";
        } else {
          color = "#FF1782";
        }
        return color;

        // var colorScale = chroma.scale(['#146089', '#FF1782']);
        // return colorScale(d.x).css()

      })
      .attr("x", 0)
      .attr("width", 30)
      .attr("height", 2)

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickValues([0, 0.25, 0.5, 0.75, 1])
        .tickFormat((tick) => {
          if(tick === 0.5){ return "Gender Parity";
          } else if(tick === 0){ return "All Men";
          } else if(tick === 1){ return "All Women";
          } else if(tick === 0.25){ return "75% Men";
          } else { return "75% Women"; }
        });

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

  })

} 

//$(document).ready(() => {
  drawHistogram();
//});
