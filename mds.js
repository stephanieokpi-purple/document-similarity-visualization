$(document).ready(function () {

    $.when($.getJSON("mds.json"), $.getJSON("clusters.json"))
    .done(function (mdsData, clusterData) {

        const data = mdsData[0];
        const clusters = clusterData[0];

        const svg = d3.select("#mdsPlot");
        const width = 780;   // ✅ fixed large width for scroll
        const height = 520;

        svg.attr("width", width)
       .attr("height", height);
        svg.attr("width", width).attr("height", height);

        const padding = 80; // ✅ better spacing

        // -----------------------------
        // MAIN GROUP + LAYERS
        // -----------------------------
        const g = svg.append("g");

        const heatLayer = g.append("g");
        const gridLayer = g.append("g");
        const axisLayer = g.append("g");
        const nodeLayer = g.append("g");

        // -----------------------------
        // CLUSTER MAP
        // -----------------------------
        const clusterMap = {};
        let clusterIndex = 0;

        Object.keys(clusters).forEach(clusterName => {
            clusters[clusterName].forEach(doc => {
                clusterMap[doc] = clusterIndex;
            });
            clusterIndex++;
        });

        const color = d3.scaleOrdinal(d3.schemeTableau10);

        // -----------------------------
        // SCALES
        // -----------------------------
        const xScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.x))
            .range([padding, width - padding]);

        const yScale = d3.scaleLinear()
            .domain(d3.extent(data, d => d.y))
            .range([height - padding, padding]);

        // -----------------------------
        // GRID
        // -----------------------------
        const xGrid = d3.axisBottom(xScale).tickSize(-height + 2 * padding).tickFormat("");
        const yGrid = d3.axisLeft(yScale).tickSize(-width + 2 * padding).tickFormat("");

        gridLayer.append("g")
            .attr("transform", `translate(0, ${height - padding})`)
            .call(xGrid)
            .selectAll("line")
            .attr("stroke", "#e2e8f0");

        gridLayer.append("g")
            .attr("transform", `translate(${padding}, 0)`)
            .call(yGrid)
            .selectAll("line")
            .attr("stroke", "#e2e8f0");

        // -----------------------------
        // HEATMAP (BACKGROUND)
        // -----------------------------
        const density = d3.contourDensity()
            .x(d => xScale(d.x))
            .y(d => yScale(d.y))
            .size([width, height])
            .bandwidth(30)(data);

        const heatColor = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, d3.max(density, d => d.value)]);

        const heatmap = heatLayer.selectAll("path")
            .data(density)
            .enter()
            .append("path")
            .attr("d", d3.geoPath())
            .attr("fill", d => heatColor(d.value))
            .attr("opacity", 0.18); // ✅ lighter

        let heatVisible = true;

        // -----------------------------
        // AXES
        // -----------------------------
        axisLayer.append("g")
            .attr("transform", `translate(0, ${height - padding})`)
            .call(d3.axisBottom(xScale));

        axisLayer.append("g")
            .attr("transform", `translate(${padding}, 0)`)
            .call(d3.axisLeft(yScale));

        // -----------------------------
        // TOOLTIP
        // -----------------------------
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "mdsTooltip");

        // -----------------------------
        // NODES
        // -----------------------------
        const nodes = nodeLayer.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "mdsNode")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", 6)
            .attr("fill", d => color(clusterMap[d.id]))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .attr("opacity", 0.9)
            .style("cursor", "pointer");

        // -----------------------------
        // HOVER
        // -----------------------------
        nodes.on("mouseover", function (event, d) {

            d3.select(this)
                .attr("stroke", "#000")
                .attr("stroke-width", 2);

            nodes.filter(n => n.id !== d.id)
                .attr("opacity", 0.2);

            $("#documentList li").removeClass("selectedDoc");
            $(`#documentList li[data-doc='${d.id}']`)
                .addClass("selectedDoc");

            tooltip.style("opacity", 1)
                .html(`<b>${d.id}</b><br>Cluster ${clusterMap[d.id] + 1}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");

        }).on("mouseout", function () {

            nodes.attr("stroke", "#fff").attr("opacity", 0.9);
            $("#documentList li").removeClass("selectedDoc");
            tooltip.style("opacity", 0);
        });

        // -----------------------------
        // CLICK → OPEN + SOFT FOCUS (NO JUMP)
        // -----------------------------
        nodes.on("click", function (event, d) {

            const li = $(`#documentList li[data-doc='${d.id}']`);
            if (li.length) li.trigger("click");

            // ✅ Smooth highlight instead of zoom jump
            nodes.transition().duration(200)
                .attr("opacity", n => n.id === d.id ? 1 : 0.2)
                .attr("r", n => n.id === d.id ? 10 : 6);
        });

        // -----------------------------
        // LEGEND
        // -----------------------------
       const legend = svg.append("g")
    .attr("transform", `translate(${padding}, 20)`);

// how many items per row
const itemsPerRow = 4;

// spacing
const colSpacing = 120;
const rowSpacing = 25;

Object.keys(clusters).forEach((c, i) => {

    const col = i % itemsPerRow;
    const row = Math.floor(i / itemsPerRow);

    const group = legend.append("g")
        .attr("transform", `translate(${col * colSpacing}, ${row * rowSpacing})`);

    group.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("fill", color(i));

    group.append("text")
        .attr("x", 10)
        .attr("y", 4)
        .text(c)
        .style("font-size", "12px");
});
        // -----------------------------
        // HEATMAP TOGGLE
        // -----------------------------
        $("#toggleHeatmap").on("click", function () {

            heatVisible = !heatVisible;

            heatLayer.transition()
                .duration(300)
                .style("opacity", heatVisible ? 1 : 0);

            $(this).text(heatVisible ? "🔥 Heatmap ON" : "❄️ Heatmap OFF");
        });

        // -----------------------------
        // ZOOM (CONTROLLED)
        // -----------------------------
        const zoom = d3.zoom()
            .scaleExtent([0.8, 2]) // ✅ stable zoom
            .on("zoom", function (event) {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

    });

});