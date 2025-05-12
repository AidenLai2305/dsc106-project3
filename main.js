import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const svg = d3.select("svg");
const width = window.innerWidth * 0.85; 
// const height = 500;
const height = window.innerWidth * 0.3; // adjust multiplier as needed

const margin = { top: 50, right: 30, bottom: 50, left: 60 };

svg.attr("width", width).attr("height", height);  

const data = await d3.csv("mouse.csv", d3.autoType);
const mouseIDs = Object.keys(data[0]);

// Create control checkboxes
const controls = d3.select("#mouse-controls");
controls
  .selectAll("label")
  .data(mouseIDs)
  .join("label")
  .attr("style", "margin-right: 10px;")
  .html((d) => `<input type="checkbox" value="${d}"> ${d}`);

// Format: [{id: 'f1', values: [{time, temp}, ...]}, ...]
const mouseLines = mouseIDs.map((id) => ({
  id,
  values: data.map((d, i) => ({ time: i, temperature: d[id] })),
}));

const xScale = d3
  .scaleLinear()
  .domain([0, data.length - 1])
  .range([margin.left, width - margin.right]);

const yScale = d3
  .scaleLinear()
  .domain([
    d3.min(mouseLines, (line) => d3.min(line.values, (d) => d.temperature)),
    d3.max(mouseLines, (line) => d3.max(line.values, (d) => d.temperature)),
  ])
  .range([height - margin.bottom, margin.top]);

const line = d3
  .line()
  .x((d) => xScale(d.time))
  .y((d) => yScale(d.temperature));

const colorScale = d3
  .scaleOrdinal()
  .domain(mouseIDs)
  .range(d3.schemeCategory10);

// Create path container
const paths = svg
  .append("g")
  .attr("class", "mouse-lines")
  .selectAll("path")
  .data(mouseLines)
  .join("path")
  .attr("id", (d) => `line-${d.id}`)
  .attr("fill", "none")
  .attr("stroke", (d) => colorScale(d.id))
  .attr("stroke-width", 1.5)
  .attr("d", (d) => line(d.values));

paths.attr("display", "none"); // hide all mouse lines initially

// Checkbox listener
d3.selectAll("#mouse-controls input[type=checkbox]").on("change", function () {
  const selected = new Set(
    d3
      .selectAll("#mouse-controls input:checked")
      .nodes()
      .map((n) => n.value)
  );

  svg
    .selectAll("path")
    .attr("display", (d) => (selected.has(d.id) ? null : "none"));
});

// Add axes
const dayTicks = d3.range(0, 14).map(d => d * 24 * 60); // [0, 1440, 2880, ..., 18720]

const xAxis = d3.axisBottom(xScale)
  .tickValues(dayTicks)
  .tickFormat(d => `Day ${d / (24 * 60) + 1}`);

const yAxis = d3
  .axisLeft(yScale)
  .ticks(5)
  .tickFormat((d) => d3.format(".1f")(d));
svg
  .append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(xAxis);
svg
  .append("g")
  .attr("class", "y-axis")
  .attr("transform", `translate(${margin.left},0)`)
  .call(yAxis);

// Add title
// svg
//   .append("text")
//   .attr("x", width / 2)
//   .attr("y", margin.top / 2 + 5)
//   .attr("text-anchor", "middle")
//   .attr("font-size", "18px")
//   .attr("font-weight", "bold")
//   .text("Mouse Temperature Plot (Placeholder)");

// X-axis label
svg
  .append("text")
  .attr("x", width / 2)
  .attr("y", height - margin.bottom + 35)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .attr("font-weight", "bold")
  .text("Time (Days)");

// Y-axis label
svg
  .append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", 8)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .attr("font-weight", "bold")
  .text("Temperature (°C)");

const runner = svg
  .append("circle")
  .attr("r", 5)
  .attr("fill", "red")
  .attr("cx", xScale(0))
  .attr("cy", yScale(37)) // placeholder value
  .style("display", "none");

document.getElementById("run-button").addEventListener("click", () => {
  // Get checked mouse input (not including "Select All")
  const checkedInputs = Array.from(
    document.querySelectorAll(
      '#mouse-controls input[type="checkbox"]:not(#select-all):checked'
    )
  );

  if (checkedInputs.length !== 1) {
    alert("Please select exactly ONE mouse to run the animation.");
    return;
  }

  const selectedID = checkedInputs[0].value; // e.g., "f1"
  const lineData = mouseLines.find((d) => d.id === selectedID).values;

  runner.style("display", "block").attr("fill", colorScale(selectedID)); // match color to selected mouse

  runner.style("display", "block");

  let i = 0;
  d3.timer(function () {
    if (i >= lineData.length) return true;

    runner
      .attr("cx", xScale(lineData[i].time))
      .attr("cy", yScale(lineData[i].temperature));

    i += 50; // speed
  });
});

mouseLines
  .filter(line => line.id.startsWith("f")) // only real mice like f1, f2, ...
  .forEach(lineData => {
    svg.selectAll(`.dot-${lineData.id}`)
      .data(lineData.values)
      .join("circle")
      .attr("class", `dot-${lineData.id}`)
      .attr("cx", d => xScale(d.time))
      .attr("cy", d => yScale(d.temperature))
      .attr("r", 6)
      .attr("fill", "transparent")
      .attr("pointer-events", "all")
      .on("mouseover", function (event, d) {
        d3.select("#tooltip")
          .style("display", "block")
          .html(`
            <strong>Mouse:</strong> ${lineData.id}<br/>
            <strong>Temp:</strong> ${d.temperature.toFixed(1)} °C<br/>
            <strong>Minute:</strong> ${d.time}
          `);
      })
      .on("mousemove", function (event) {
        d3.select("#tooltip")
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function () {
        d3.select("#tooltip").style("display", "none");
      });
  });

const rangeData = data.map((row, i) => {
  const temps = Object.values(row).map(Number); // grab all 13 temperatures
  return {
    time: i,
    min: d3.min(temps),
    max: d3.max(temps)
  };
});

const rangeArea = d3.area()
  .x(d => xScale(d.time))
  .y0(d => yScale(d.min))
  .y1(d => yScale(d.max))
  .curve(d3.curveBasis); // optional smoothing

svg.append("path")
.datum(rangeData)
.attr("fill", "#666")
.attr("opacity", 0.3)
.attr("d", rangeArea);

const meanData = data.map((row, i) => {
  const temps = Object.values(row).map(Number);
  return {
    time: i,
    temperature: d3.mean(temps)
  };
});

const meanLine = d3.line()
  .x(d => xScale(d.time))
  .y(d => yScale(d.temperature))
  .curve(d3.curveBasis); // optional smoothing

svg.append("path")
.datum(meanData)
.attr("fill", "none")
.attr("stroke", "black")
.attr("stroke-dasharray", "4 2")
.attr("stroke-width", 2)
.attr("d", meanLine);