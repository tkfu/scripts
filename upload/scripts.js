

d3.csv("lines.csv", function(error, lines) {
  d3.csv("movies.csv", function(error, movies) {

  var linesData = [];

  for (line in lines){
    var sentences = lines[line]["character_text"].split("  ");
    for (sentence in sentences){
      linesData.push(lines[line]["Gender"]);
    }
  }

  // var lines = d3.select(".lines-container");

  var linesChart = d3.select(".lines-container")
    .selectAll("div")
    .data(linesData)
    .enter()
    .append("div")
    .attr("class","line")
    .style("background",function(d){
      if(d == "f"){
        return "#FF1B84";
      }
      return "#0091E6";
    })
    .style("top",function(d){
      if(d == "f"){
        return "0px";
      }
      return "18px";
    })
    .style("left",function(d,i){
      return i + "px";
    })
    .on("click",function(){
      linesChart.filter(function(d){
        return d == "f"
      })
      .transition()
      .duration(200)
      .style("left",function(d,i){
        return i + "px";
      })
      ;

      linesChart.filter(function(d){
        return d == "m"
      })
      .transition()
      .duration(200)
      .style("left",function(d,i){
        return i + "px";
      })
      ;
    })
    ;

  d3.select(".movies-container")
    .selectAll("div")
    .data(movies)
    .enter()
    .append("div")
    .attr("class","movie")
    ;

//people
});
//movies.csv
});
