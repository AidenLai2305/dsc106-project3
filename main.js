import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const svg = d3.select("svg");
const width = 1000;
const height = 300;
const margin = { top: 20, right: 20, bottom: 30, left: 40 };

svg.attr("width", width)
   .attr("height", height);

const data = await d3.csv("mouse.csv", d3.autoType);
const mouseIDs = Object.keys(data[0]);

// Create control checkboxes
const controls = d3.select("#mouse-controls");
controls.selectAll("label")
  .data(mouseIDs)
  .join("label")
  .attr("style", "margin-right: 10px;")
  .html(d => `<input type="checkbox" value="${d}" checked> ${d}`);

// Format: [{id: 'f1', values: [{time, temp}, ...]}, ...]
const mouseLines = mouseIDs.map(id => ({
  id,
  values: data.map((d, i) => ({ time: i, temperature: d[id] }))
}));

const xScale = d3.scaleLinear()
  .domain([0, data.length - 1])
  .range([margin.left, width - margin.right]);

const yScale = d3.scaleLinear()
  .domain([
    d3.min(mouseLines, line => d3.min(line.values, d => d.temperature)),
    d3.max(mouseLines, line => d3.max(line.values, d => d.temperature))
  ])
  .range([height - margin.bottom, margin.top]);

const line = d3.line()
  .x(d => xScale(d.time))
  .y(d => yScale(d.temperature));

// Create path container
const paths = svg.append("g")
  .attr("class", "mouse-lines")
  .selectAll("path")
  .data(mouseLines)
  .join("path")
  .attr("id", d => `line-${d.id}`)
  .attr("fill", "none")
  .attr("stroke", (_, i) => d3.schemeCategory10[i % 10])
  .attr("stroke-width", 1.5)
  .attr("d", d => line(d.values));

// Checkbox listener
d3.selectAll("#mouse-controls input[type=checkbox]")
  .on("change", function () {
    const selected = new Set(
      d3.selectAll("#mouse-controls input:checked").nodes().map(n => n.value)
    );

    svg.selectAll("path")
      .attr("display", d => selected.has(d.id) ? null : "none");
  });