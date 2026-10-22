$(document).ready(function () {

    let zIndexCounter = 10;

    const CLUSTER_COLORS = [
        "#2563eb", "#16a34a", "#dc2626", "#d97706",
        "#7c3aed", "#0891b2", "#be185d", "#65a30d"
    ];

    function hexToFaintRgba(hex, opacity) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${opacity})`;
    }

    function drawLines() {
        $("#connectionLines").remove();
        const windows = $(".documentWindow");
        if (windows.length < 2) return;
        const wsOffset = $("#workspace").offset();
        const svg = $('<svg id="connectionLines" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;"></svg>');
        const winArray = [];
        windows.each(function () {
            const pos = $(this).offset();
            const w = $(this).outerWidth();
            const h = $(this).outerHeight();
            winArray.push({
                cluster: $(this).attr("data-cluster"),
                color:   $(this).attr("data-color"),
                cx:      pos.left - wsOffset.left + w / 2,
                cy:      pos.top  - wsOffset.top  + h / 2
            });
        });
        const drawn = new Set();
        for (let i = 0; i < winArray.length; i++) {
            const a = winArray[i];
            let nearestDist = Infinity, nearestJ = -1;
            for (let j = 0; j < winArray.length; j++) {
                if (i === j) continue;
                const b = winArray[j];
                const dist = Math.sqrt(Math.pow(a.cx - b.cx, 2) + Math.pow(a.cy - b.cy, 2));
                if (dist < nearestDist) { nearestDist = dist; nearestJ = j; }
            }
            if (nearestJ === -1) continue;
            const key = [Math.min(i, nearestJ), Math.max(i, nearestJ)].join("-");
            if (drawn.has(key)) continue;
            drawn.add(key);
            const b = winArray[nearestJ];
            const sameCluster = a.cluster === b.cluster;
            const line = $(document.createElementNS("http://www.w3.org/2000/svg", "line"));
            line.attr({
                x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy,
                stroke:             sameCluster ? (a.color || "#2563eb") : "#94a3b8",
                "stroke-width":     sameCluster ? "2" : "1.5",
                "stroke-opacity":   sameCluster ? "0.5" : "0.35",
                "stroke-dasharray": sameCluster ? "none" : "6,4"
            });
            svg.append(line);
            [a, b].forEach(function (pt) {
                const circle = $(document.createElementNS("http://www.w3.org/2000/svg", "circle"));
                circle.attr({ cx: pt.cx, cy: pt.cy, r: "4", fill: sameCluster ? (a.color || "#2563eb") : "#94a3b8", "fill-opacity": "0.5" });
                svg.append(circle);
            });
        }
        $("#workspace").prepend(svg);
    }

    $.getJSON("clusters.json", function (clusters) {

        $("#documentList").empty();
        let clusterIndex = 0;

        Object.keys(clusters).forEach(function (clusterName) {

            const color = CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length];
            const docs  = clusters[clusterName];
            clusterIndex++;

            const clusterDiv  = $("<div class='clusterBlock'></div>").attr("data-cluster", clusterName);
            const header      = $("<div class='clusterHeader'></div>").css("background", color);
            const titleSpan   = $("<span class='clusterTitle'></span>").text(clusterName);
            const countBadge  = $("<span class='countBadge'></span>").text(docs.length + " docs");
            const btnGroup    = $("<div class='clusterBtns'></div>");

            /* --- Up/Down reorder buttons --- */
            const upBtn       = $("<button class='clusterBtn reorderBtn' title='Move Up'>▲</button>");
            const downBtn     = $("<button class='clusterBtn reorderBtn' title='Move Down'>▼</button>");
            const openAllBtn  = $("<button class='clusterBtn openAllBtn'>⊞ Open All</button>");
            const closeAllBtn = $("<button class='clusterBtn closeAllBtn'>✕ Close All</button>");
            const collapseBtn = $("<button class='clusterBtn collapseBtn'>▾</button>");

            btnGroup.append(upBtn, downBtn, openAllBtn, closeAllBtn, collapseBtn);
            header.append(titleSpan, countBadge, btnGroup);

            const ul = $("<ul></ul>");

            docs.forEach(function (doc) {
                const li = $("<li></li>")
                    .text(doc)
                    .attr("data-doc", doc)
                    .attr("data-cluster", clusterName)
                    .attr("data-color", color)
                    .css("border-left-color", color);

                li.on("click", function () {
                    $("#documentList li").removeClass("selectedDoc");
                    $(this).addClass("selectedDoc");
                    $(".clusterBlock").removeClass("activeCluster");
                    $(this).closest(".clusterBlock").addClass("activeCluster");
                    setTimeout(() => $(".clusterBlock").removeClass("activeCluster"), 1200);
                    openDocument(doc, color, clusterName);
                });

                ul.append(li);

                li.draggable({
                    helper: function () {
                        return $("<div></div>").text(doc).css({
                            "background": color, "border-left": "5px solid " + color,
                            "color": "white", "padding": "10px 14px",
                            "border-radius": "5px", "font-size": "13px",
                            "font-weight": "600", "width": "200px",
                            "box-shadow": "0 8px 20px rgba(0,0,0,0.25)",
                            "opacity": "0.9", "list-style": "none", "cursor": "grabbing"
                        });
                    },
                    appendTo: "body",
                    zIndex: 9999,
                    cursor: "grabbing",
                    revert: "invalid",
                    start: function () { $(this).addClass("dragging"); },
                    stop:  function () { $(this).removeClass("dragging"); }
                });
            });

            clusterDiv.append(header, ul);
            $("#documentList").append(clusterDiv);

            /* --- Move Up --- */
            upBtn.on("click", function (e) {
                e.stopPropagation();
                const prev = clusterDiv.prev(".clusterBlock");
                if (prev.length) {
                    clusterDiv.insertBefore(prev);
                    showToast("Cluster moved up!");
                }
            });

            /* --- Move Down --- */
            downBtn.on("click", function (e) {
                e.stopPropagation();
                const next = clusterDiv.next(".clusterBlock");
                if (next.length) {
                    clusterDiv.insertAfter(next);
                    showToast("Cluster moved down!");
                }
            });

            /* --- Collapse --- */
            collapseBtn.on("click", function (e) {
                e.stopPropagation();
                ul.slideToggle(200);
                collapseBtn.text(collapseBtn.text() === "▾" ? "▸" : "▾");
            });

            /* --- Open All --- */
            openAllBtn.on("click", function (e) {
                e.stopPropagation();
                ul.find("li:visible").each(function () {
                    openDocument($(this).attr("data-doc"), $(this).attr("data-color"), clusterName);
                });
                clusterDiv.addClass("activeCluster");
                setTimeout(() => clusterDiv.removeClass("activeCluster"), 800);
            });

            /* --- Close All --- */
            closeAllBtn.on("click", function (e) {
                e.stopPropagation();
                $(".documentWindow[data-cluster='" + clusterName + "']").each(function () {
                    $(this).fadeOut(200, function () { $(this).remove(); drawLines(); });
                });
            });
        });

        /* --- Workspace droppable --- */
        $("#workspace").droppable({
            accept: "#documentList li",
            tolerance: "pointer",
            over:  function () { $(this).addClass("dropReady"); },
            out:   function () { $(this).removeClass("dropReady"); },
            drop: function (event, ui) {
                $(this).removeClass("dropReady");
                const docID   = ui.draggable.attr("data-doc");
                const cluster = ui.draggable.attr("data-cluster");
                const color   = ui.draggable.attr("data-color");
                const wsOffset = $("#workspace").offset();
                const dropX    = ui.position.left - wsOffset.left + ui.helper.width() / 2;
                const dropY    = ui.position.top  - wsOffset.top  + ui.helper.height() / 2;
                openDocument(docID, color, cluster, dropX, dropY);
            }
        });

    });

    /* --- Search --- */
    $("#searchBox").on("keyup", function () {
        const value = $(this).val().toLowerCase().trim();
        $(".clusterBlock").each(function () {
            let hasVisible = false;
            $(this).find("li").each(function () {
                const match = $(this).attr("data-doc").toLowerCase().includes(value);
                $(this).toggle(match);
                if (match) hasVisible = true;
            });
            $(this).toggle(hasVisible || value === "");
        });
    });

    /* --- Open Document --- */
    function openDocument(docID, color, cluster, dropX, dropY) {
        if ($(".documentWindow[data-id='" + docID + "']").length > 0) {
            const existing = $(".documentWindow[data-id='" + docID + "']");
            existing.css("z-index", zIndexCounter++);
            existing.effect("shake", { distance: 6, times: 2 }, 300);
            return;
        }

        $.get("dataset/" + docID, function (data) {
            const windowDiv   = $("<div class='documentWindow'></div>")
                .attr("data-id", docID).attr("data-cluster", cluster || "").attr("data-color", color || "#2563eb");
            const header      = $("<div class='documentHeader'></div>").css("background", color || "#2563eb");
            const titleSpan   = $("<span class='docTitle'></span>").text(docID);
            const btnRow      = $("<div class='winBtns'></div>");
            const minimizeBtn = $("<button class='winBtn minimizeBtn' title='Minimize'>─</button>");
            const closeBtn    = $("<button class='winBtn closeBtn' title='Close'>✕</button>");

            btnRow.append(minimizeBtn, closeBtn);
            header.append(titleSpan, btnRow);

            const tintBg = hexToFaintRgba(color || "#2563eb", 0.07);
            const content = $("<div class='documentContent'></div>").text(data).css("background", tintBg);

            windowDiv.append(header, content);

            const offset = ($(".documentWindow").length % 6) * 30;
            windowDiv.css({
                top:      dropY ? dropY - 20  : 60 + offset,
                left:     dropX ? dropX - 170 : 20 + offset,
                "z-index": zIndexCounter++
            });

            $("#workspace").append(windowDiv);
            setTimeout(drawLines, 50);

            windowDiv.draggable({
                handle: ".documentHeader", containment: "#workspace",
                start: function () { $(this).css("z-index", zIndexCounter++); },
                drag:  function () { drawLines(); },
                stop:  function () { drawLines(); }
            });

            windowDiv.resizable({ minWidth: 220, minHeight: 120, stop: function () { drawLines(); } });
            windowDiv.on("mousedown", function () { $(this).css("z-index", zIndexCounter++); });

            let isMinimized = false;
            minimizeBtn.on("click", function (e) {
                e.stopPropagation();
                if (!isMinimized) {
                    content.slideUp(150); windowDiv.css("height", "auto");
                    minimizeBtn.text("□"); isMinimized = true;
                } else {
                    content.slideDown(150); minimizeBtn.text("─"); isMinimized = false;
                }
                setTimeout(drawLines, 200);
            });

            closeBtn.on("click", function () {
                windowDiv.fadeOut(200, function () { $(this).remove(); drawLines(); });
            });

        }).fail(function () { showToast("Could not load: " + docID, true); });
    }

    /* --- Toolbar --- */
    $("#closeAllWindows").on("click", function () {
        $(".documentWindow").fadeOut(200, function () { $(this).remove(); drawLines(); });
    });

    $("#tileWindows").on("click", function () {
        const windows = $(".documentWindow");
        if (windows.length === 0) return;
        const cols = Math.ceil(Math.sqrt(windows.length));
        const wsW  = $("#workspace").width()  - 40;
        const wsH  = $("#workspace").height() - 60;
        const winW = Math.floor(wsW / cols) - 10;
        const winH = Math.floor(wsH / Math.ceil(windows.length / cols)) - 10;
        windows.each(function (i) {
            const col = i % cols, row = Math.floor(i / cols);
            $(this).animate({
                left: 20 + col * (winW + 10), top: 50 + row * (winH + 10),
                width: winW, height: winH
            }, 300, function () { drawLines(); });
        });
    });

    /* --- Toast --- */
    function showToast(msg, isError) {
        const toast = $("<div class='toast'></div>").text(msg);
        if (isError) toast.addClass("toastError");
        $("body").append(toast);
        setTimeout(() => toast.addClass("toastVisible"), 50);
        setTimeout(() => { toast.removeClass("toastVisible"); setTimeout(() => toast.remove(), 400); }, 2500);
    }

});