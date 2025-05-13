import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

const svg = d3.select("svg");
const width = window.innerWidth * 0.85;
const height = window.innerWidth * 0.3;

const margin = { top: 50, right: 30, bottom: 70, left: 60 };
svg.attr("width", width).attr("height", height);

const data = await d3.csv("mouse.csv", d3.autoType);
const mouseIDs = Object.keys(data[0]);

// Create selection
const controls = d3.select("#mouse-controls");
controls
  .selectAll("label")
  .data(mouseIDs)
  .join("label")
  .attr("style", "margin-right: 10px;")
  .html(
    (d) => `
    <input type="radio" name="mouse" value="${d}" ${
      d === "f1" ? "checked" : ""
    }> ${d}
  `
  );

// Organize mouse lines
const mouseLines = mouseIDs.map((id) => ({
  id,
  values: data.map((d, i) => ({ time: i, temperature: d[id] })),
}));

// Scales
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

const customColors = [
  "#e6194b",
  "#f58231",
  "#e6ab02",
  "#3cb44b",
  "#58A39B",
  "#2E94AA",
  "#4363d8",
  "#911eb4",
  "#000075",
  "#f032e6",
  "#800000",
  "#9A6324",
  "#808000",
];

const colorScale = d3.scaleOrdinal().domain(mouseIDs).range(customColors);

// Grey shaded range
const rangeData = data.map((row, i) => {
  const temps = Object.values(row).map(Number);
  return {
    time: i,
    min: d3.min(temps),
    max: d3.max(temps),
  };
});

const rangeArea = d3
  .area()
  .x((d) => xScale(d.time))
  .y0((d) => yScale(d.min))
  .y1((d) => yScale(d.max));

svg
  .append("path")
  .datum(rangeData)
  .attr("fill", "#666")
  .attr("opacity", 0.3)
  .attr("d", rangeArea);

// Mean line
const meanData = data.map((row, i) => ({
  time: i,
  mean: d3.mean(Object.values(row).map(Number)),
}));

const meanLine = d3
  .line()
  .x((d) => xScale(d.time))
  .y((d) => yScale(d.mean));

svg
  .append("path")
  .datum(meanData)
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("stroke-width", 1.2)
  .attr("d", meanLine)
  .lower(); // keep behind selected lines

// Mouse lines (initially hidden)
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
  .attr("opacity", 0.6)
  .attr("d", (d) => line(d.values))
  .attr("display", "none");

// Axes
const xAxis = d3
  .axisBottom(xScale)
  .tickValues(d3.range(0, 14).map((d) => d * 24 * 60))
  .tickFormat((d) => `Day ${d / (24 * 60) + 1}`);

const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".1f"));

const highlightDays = [2, 6, 10, 14];
const halfDay = 12 * 60; // 12 hours in minutes

svg
  .append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(xAxis)
  .selectAll(".tick")
  .filter(function (d) {
    // Get only the start of each of the desired days
    return highlightDays.includes(d / (24 * 60) + 1);
  })
  .select("text")
  .style("fill", "red");

svg.append("g").attr("transform", `translate(${margin.left},0)`).call(yAxis);

// Labels
svg
  .append("text")
  .attr("x", width / 2)
  .attr("y", height - margin.bottom + 35)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .attr("font-weight", "bold")
  .text("Time (Days)");

svg
  .append("text")
  .attr("x", width / 2)
  .attr("y", height - margin.bottom + 50)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .attr("fill", "red")
  .text("* Red Days Indicate the Start of the Ovulation Cycle");

svg
  .append("text")
  .attr("x", width - 230)
  .attr("y", 30)
  .attr("text-anchor", "middle")
  // .attr("font-size", "12px")
  .text("* Black Line Represents the Mean Body Temp of All Mice");

svg
  .append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", 24)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .attr("font-weight", "bold")
  .text("Temperature (°C)");

// Runner circle
const runner = svg
  .append("circle")
  .attr("r", 5)
  .attr("fill", "red")
  .attr("cx", xScale(0))
  .attr("cy", yScale(37))
  .style("display", "none");

// Tooltip logic (only for selected mice)
function renderTooltips() {
  svg.selectAll("circle.tooltip-dot").remove();

  const selected = new Set(
    d3
      .selectAll("#mouse-controls input:checked")
      .nodes()
      .map((n) => n.value)
  );

  mouseLines
    .filter((line) => selected.has(line.id))
    .forEach((lineData) => {
      svg
        .selectAll(`.dot-${lineData.id}`)
        .data(lineData.values)
        .join("circle")
        .attr("class", `tooltip-dot dot-${lineData.id}`)
        .attr("cx", (d) => xScale(d.time))
        .attr("cy", (d) => yScale(d.temperature))
        .attr("r", 5)
        .attr("fill", "transparent")
        .attr("pointer-events", "all")
        .on("mouseover", (event, d) => {
          d3.select("#tooltip").style("display", "block").html(`
              <strong>Mouse:</strong> ${lineData.id}<br/>
              <strong>Temp:</strong> ${d.temperature.toFixed(1)} °C<br/>
              <strong>Minute:</strong> ${d.time}
            `);
        })
        .on("mousemove", (event) => {
          d3.select("#tooltip")
            .style("left", `${event.pageX + 12}px`)
            .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
          d3.select("#tooltip").style("display", "none");
        });
    });
}

// selection interaction
d3.selectAll("#mouse-controls input[type=radio]").on("change", function () {
  const selected = new Set(
    d3
      .selectAll("#mouse-controls input:checked")
      .nodes()
      .map((n) => n.value)
  );

  svg
    .selectAll(".mouse-lines path")
    .attr("display", (d) => (selected.has(d.id) ? null : "none"));

  renderTooltips();
});

// Manually trigger the change event for f1
d3.select(`#mouse-controls input[value="f1"]`).dispatch("change");

// Run animation button
document.getElementById("run-button").addEventListener("click", () => {
  const checked = Array.from(
    document.querySelectorAll('#mouse-controls input[type="radio"]:checked')
  );

  if (checked.length !== 1) {
    alert("Please select exactly ONE mouse to run the animation.");
    return;
  }

  const selectedID = checked[0].value;
  const lineData = mouseLines.find((d) => d.id === selectedID).values;

  runner.style("display", "block").attr("fill", colorScale(selectedID));

  let i = 0;
  d3.timer(function () {
    if (i >= lineData.length) return true;
    runner
      .attr("cx", xScale(lineData[i].time))
      .attr("cy", yScale(lineData[i].temperature));
    i += 50;
  });
});
