// Marks all matching domains with divs of class domain-overlay

var heavyMarked = 150;  // Limit for heavy (animated) marking
var maxMarked =  1000;  // Overall limit for marking
var baseRadius =   20;  // TODO: Couple this to render size
var baseMargin =  200; // TODO: Should be coupled to zoom level
var strokeWidth = 2.0;
// Which links to consider when calculating shortest path between two nodes
var defaultVisitIn = false;
var defaultVisitOut = true;
// Which nodes to ignore when calculating shortest path
var illegalNodesForShortestPath = ["google.com", "google.dk", "facebook.com", "bing.com", "twitter.com", "wikipedia.dk", "wikipedia.org", "wordpress.com"];

// The search mode. Valid values: 'search' and 'connect'
var searchType = 'search';

var svg = null;
var diffusor = null;
var svgString = '';
function createSVGOverlay() {
    /* Must be before the svg so that it is positioned underneath */
    diffusor = document.createElement("div");
    diffusor.id = "diffusor-overlay";
    myDragon.addOverlay({
        element: diffusor,
        location: myDragon.viewport.getHomeBounds()
    });

    svg = document.createElement("div");
    svg.id = "svg-overlay";
    myDragon.addOverlay({
        element: svg,
        location: myDragon.viewport.getHomeBounds()
    });
    svgString = '';
}

function clearSVGOverlay() {
    if (diffusor) {
        svgString = '';
        updateSVGOverlay('');
        diffusor.style.opacity = 0.0;
    } else {
        createSVGOverlay();
    }
}

function updateSVGOverlay(svgXML) {
    svgString += svgXML;

    svg.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;z-index:10;margin:0;padding:0;top:0;left:0;width:100%;height:100%" viewBox="' + viewbox.x1 + ' ' + viewbox.y1 + ' ' + viewbox.x2 + ' ' + viewbox.y2 + '">' + svgString + '</svg>';
    diffusor.style.opacity = 0.8;
}

function drawLinks(links) {
    var svgLines = '';
    for (var i = 0 ; i < links.length ; i++) {
        var link = links[i];
/*<path fill="none" stroke-width="1.0"
              d="M -170.428101,133.646652 C -151.027847,138.653076 -129.437119,175.263123 -134.443542,194.663376"
              class="id_dukkehjem.dk id_poolforum.se" stroke-opacity="1.0"
              stroke="#ff5584"/>*/
        svgLines += '<path fill="none" stroke-width="' + strokeWidth + '" d="' + link.path + '" stroke-opacity="1.0" stroke="#' + link.color + '"><title>' + link.sourceName + '→' + link.destName + '</path>\n'
    }
    updateSVGOverlay(svgLines);
}

function getSVGCircle(domain, color) {
    if (!color) {
        color = getDomainColor(domain);
    }
    return '<circle fill-opacity="1.0" fill="#' + color + '" r="' + domain.r + '" cx="' + domain.x + '" cy="' + domain.y + '" stroke="#000000" stroke-opacity="1.0" stroke-width="1.0"><title>' + domain.d + ' (in=' + linksIndexes(domain.in).length + ', out=' + linksIndexes(domain.out).length + ')</title></circle>\n';    
}

// TODO: Get text to align properly and get the right font size
function getSVGText(domain) {
    return '<text font-size="' + domain.fs + '" x="' + domain.x + '" y="' + domain.y + '" style="pointer-events:none; text-anchor: middle; dominant-baseline: central;" font-family="' + textfont + '">' + domain.d + '</text>';
}

function getDomainColor(domain) {
    if (!domain.out) {
        return "cccccc";
    }        
    var links = domain.out.length == 0 ? domain.in : domain.out;
    if (links.length == 0) {
        console.log("No links");
        return "cccccc";
    }
    /* 222(-589.385315,-193.555618~-604.705933,-255.864410#c0c0c0);123... */
    var tokens = links.split(";")[0].split('#');
    return tokens.length > 1 ? tokens[1].replace(')', '') : "cccccc";
}

function drawCircles(links, isInLinks) {
    var svgCircles = '';
    for (var i = 0 ; i < links.length ; i++) {
        var link = links[i];
        var external = isInLinks ? domains[link.sourceIndex] : domains[link.destIndex];
        // TODO: the color is a bit tricky as it depends on whether the node has outgoing only ingoing links
        var color = getDomainColor(external);
        svgCircles += getSVGCircle(external, color);
        svgCircles += getSVGText(external);
    }
    updateSVGOverlay(svgCircles);
}

function markLinks(domainName, domainIndex, clearPrevious) {
    if (clearPrevious) {
        myDragon.clearOverlays();
    }
    if (document.getElementById("domain-selector")) {
        document.getElementById("domain-selector").value = " " + domainName + " ";
    }
    var worldW = myDragon.world.getItemAt(0).getContentSize().x;
    var radiusFactor = baseRadius/worldW;

    if (clearPrevious || diffusor == null) {
        createSVGOverlay();
    }
    var domain = domains[domainIndex];
    var inLinks = expandLinks(domain, domainIndex, domain.in, true);
    var outLinks = expandLinks(domain, domainIndex, domain.out, false);
    /* Draw link lines */
    drawLinks(inLinks);
    drawLinks(outLinks);
    /* Draw linked circles */
    drawCircles(inLinks, true);
    drawCircles(outLinks, false);
    /* Draw self-circle */
    updateSVGOverlay(getSVGCircle(domain, getDomainColor(domain)));
    updateSVGOverlay(getSVGText(domain));
    
    /* Mark in-links */
/*    markChosen(linksIndexes(domains[domainIndex].in), 1, heavyMarked, maxMarked, radiusFactor, "domain-overlay-mimick", "domain-overlay-mimick", function(elt, domainName, domainIndex) {
        elt.onclick = function() {
            markLinks(domainName, domainIndex);
        }
    });*/
    /* Mark out-links */
/*    markChosen(linksIndexes(domains[domainIndex].out), 1 + linksIndexes(domains[domainIndex].in).length, heavyMarked, maxMarked, radiusFactor, "domain-overlay-mimick", "domain-overlay-mimick", function(elt, domainName, domainIndex) {
        elt.onclick = function() {
            markLinks(domainName, domainIndex);
        }
    });*/
    /* Mark self */
//    markChosen([domainIndex], 0, heavyMarked, maxMarked, radiusFactor, "domain-overlay", "domain-overlay-hp");
}

/*
{d:"391.org", x:-589.0432, y:-281.74088, r:5.0, in:"222(-589.385315,-193.555618~-604.705933,-255.864410);223(-591.702942,-188.440689~-606.290222,-254.769012)", out:""},
*/
function expandLinks(source, sourceIndex, linksString, reverse) {
    if (!linksString) {
        return [];
    }
    var tokens = linksString.split(";");
    var links = [];
    var sourceCoordinates = source.x + ',' + source.y;
    var arrayLength = tokens.length;
    for (var i = 0; i < arrayLength; i++) {
        if (tokens[i].length == 0) {
            continue;
        }
        /* 222(-589.385315,-193.555618~-604.705933,-255.864410#c0c0c0) */
        var subTokens = tokens[i].split("(")
        var linkIndex = subTokens[0];
        /* -589.385315,-193.555618~-604.705933,-255.864410#c0c0c0) */
        if (subTokens[1]) {
            var coorCol = subTokens[1].split('#');
            var infixCoordinates = coorCol[0].replace('~', ' ');
            var color = coorCol[1].replace(')', '');
        } else { // No edge visuals
            var color = "cccccc";
        }
            
        var destCoordinates = domains[linkIndex].x + ',' + domains[linkIndex].y;
        var sIndex, dIndex;
        var sCoor, dCoor;
        var sName, dName;
        var sRadius, dRadius;
            
        if (reverse) {
            sIndex = linkIndex;
            dIndex = sourceIndex;
            sCoor = destCoordinates;
            dCoor = sourceCoordinates;
            sName = domains[linkIndex].d;
            dName = source.d;
            sRadius = domains[dIndex].r;
            dRadius = source.r;
        } else {
            sIndex = sourceIndex;
            dIndex = linkIndex; 
            sCoor = sourceCoordinates;
            dCoor = destCoordinates;
            sName = source.d;
            dName = domains[dIndex].d;
            sRadius = source.r;
            dRadius = domains[dIndex].r;
        }
        links.push({sourceName: sName, destName: dName, sourceIndex: sIndex, destIndex: dIndex, sourceRadius: sRadius, destRadius: dRadius, path: infixCoordinates ? "M " + sCoor + " C " + infixCoordinates + " " + dCoor : null, color: color});
    }
    return links;
}

function expandAllLinks(index) {
    var node = domains[index];
    return expandLinks(node, index, node.out, false).concat(expandLinks(node, index, node.in, true));
}    

function linksIndexes(linksString) {
    if (!linksString) {
        return [];
    }
    var tokens = linksString.split(";");
    var indexes = [];
    var arrayLength = tokens.length;
    for (var i = 0; i < arrayLength; i++) {
        if (tokens[i].length == 0) {
            continue;
        }
        /* 222(-589.385315,-193.555618~-604.705933,-255.864410) */
        indexes.push(tokens[i].split("(")[0]);
    }
    return indexes;
}

/*
Visually marks the domains for all given indexes.
*/
function markChosen(indexes, matched, heavyLimit, normalLimit, radiusFactor, heavyClass, normalClass, callback) {
    var minX = 1;
    var maxX = 0;
    var minY = 1;
    var maxY = 0;
    var added = [];
    var arrayLength = indexes.length; // domains is defined in domains.js
    for (var i = 0; i < arrayLength; i++) {
        var domain = domains[indexes[i]];

        matched++;
        if (matched == heavyLimit+1) { // Exceeded. Convert to passive marking
            var l = added.length;
            for (var i = 0; i < l; i++) {
                added[i].className = normalClass;
            }
        }
        if (matched > normalLimit) {
            continue;
        }
        
        var rx = (domain.x - viewbox.x1)/viewbox.x2;
        var ry = (domain.y - viewbox.y1)/viewbox.x2;
        var w = domain.r*radiusFactor;

        if (rx < minX) {
            minX = rx;
        }
        if (rx > maxX) {
            maxX = rx;
        }
        if (ry < minY) {
            minY = ry;
        }
        if (ry > maxY) {
            maxY = ry;
        }
        var elt = document.createElement("div");
        elt.id = "domain-overlay-" + matched;
        elt.className = matched > heavyLimit ? normalClass : heavyClass;
        elt.setAttribute('title', domain.d + " (in=" + linksIndexes(domain.in).length + ", out=" + linksIndexes(domain.out).length + ")");
        elt.domain = domain.d;
        elt.domainIndex = indexes[i];
        if (callback) {
            callback(elt, elt.domain, elt.domainIndex);
        }
        myDragon.addOverlay({
            element: elt,
            location: new OpenSeadragon.Rect(rx-w/2, ry-w/2, w, w),
            placement: OpenSeadragon.Placement.TOP_LEFT // FIXME: placement seems to be without effect!?
        });
        added.push(elt);
    }
    return {"minX": minX, "maxX": maxX, "minY": minY, "maxY": maxY, "matched": matched}
}

function getLinkBetween(sourceIndex, destIndex) {
    var links = expandAllLinks(sourceIndex);
    for (var i = 0 ; i < links.length ; i++) {
        if (links[i].destIndex == destIndex || links[i].sourceIndex == destIndex) {
            return [links[i]];
        }
    }
    return [];
}

/*
Given an array of indexes, mark all nodex and the immediate paths between subsequent nodes
*/
function markPath(nodeIndexes) {
    clearSVGOverlay();
    for (var i = 0 ; i < nodeIndexes.length ; i++) {
        var node = domains[nodeIndexes[i]];
        updateSVGOverlay(getSVGCircle(node));
        if (i < nodeIndexes.length-1) {
            drawLinks(getLinkBetween(nodeIndexes[i], nodeIndexes[i+1]));
        }
    }
//        console.log(path[i] + ": " + domains[path[i]].d);
}

/*
Performs a sequential search through all domains, visually marking the ones that has the given domainInfix
*/
function markMatching(domainInfix) {
    myDragon.clearOverlays(); // FIXME: Quite clumsy to freeze the OpenSeadragon instance this way
    if (domainInfix.length < 1) {
        myDragon.viewport.fitHorizontally().fitVertically();
        domainFeedback.innerHTML = "";
        return;
    }

    var worldW = myDragon.world.getItemAt(0).getContentSize().x;
    var radiusFactor = baseRadius/worldW;
    var boundsMargin = baseMargin/worldW;
    
    // OSD y coordinates are scaled from width. viewbox is defined in domains.js
    var d_width = viewbox.x2 - viewbox.x1; 
    
    var startTime = new Date().getTime();
    var matched = 0;
    var matchIndexes = [];
    var arrayLength = domains.length; // domains is defined in domains.js
    for (var i = 0; i < arrayLength; i++) {
        var domain = domains[i];

        if (!((' ' + domain.d + ' ').indexOf(domainInfix) >= 0 || domainInfix == "*")) {
            continue;
        }
        matched++;
        if (matched > maxMarked) {
            continue;
        }
        matchIndexes.push(i);
    }
    var pm = markChosen(matchIndexes, 0, heavyMarked, maxMarked, radiusFactor, "domain-overlay", "domain-overlay-hp", function(elt, domain, domainIndex) {
        elt.onclick = function() {
            markLinks(domain, domainIndex, true);
        }
    });
    console.log("Matched " + matched + " nodes (max " + maxMarked + " marked) in " + (new Date().getTime() - startTime) + " ms");
    var dom = matched == 1 ? " node" : " nodes";
    domainFeedback.innerHTML = matched > maxMarked ?
        "Matched " + matched + dom + " (only " + maxMarked + " highlighted)" :
        "Matched " + matched + dom;
    
    if (matched > 0) {
        pm.minX -= boundsMargin;
        pm.minY -= boundsMargin;
        pm.maxX += boundsMargin;
        pm.maxY += boundsMargin;
        myDragon.viewport.fitBoundsWithConstraints(new OpenSeadragon.Rect(pm.minX, pm.minY, pm.maxX-pm.minX, pm.maxY-pm.minY));
    } else {
        myDragon.viewport.fitHorizontally().fitVertically();
    }
}

function getShortest(unvisited) {
    var min = Infinity;
    var entryKey = null;
    for (var [key, value] of unvisited.entries()) {
        if (value.dist < min) {
            min = value.dist;
            entryKey = key;
        }
    }
    return entryKey;
}

function traverse(visited, unvisited, destIndex, visitIn=defaultVisitIn, visitOut=defaultVisitOut) {
    var sourceIndex = getShortest(unvisited);
//    console.log("Traversing with visited=" + visited.size + ", unvisited=" + unvisited.size + ", shortest=" + sourceIndex);
    if (sourceIndex == null) {
        return "EON"; // No more nodes
    }
    
    var sourceValue = unvisited.get(sourceIndex);
    var path = updateUnvisitedLinks(visited, unvisited, sourceIndex, destIndex, sourceValue.dist, sourceValue.path, visitIn, visitOut);
    // https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm#Algorithm step 4
    visited.add(sourceIndex);
    unvisited.delete(sourceIndex);
    return path ? path : "";
}

// https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm#Algorithm step 3
// Returns path if the destination node has been reached
function updateUnvisitedLinks(visited, unvisited, sourceIndex, destIndex, sourceDist, sourcePath, visitIn=defaultVisitIn, visitOut=defaultVisitOut) {
    var links = [];
    if (visitIn) {
        links = links.concat(linksIndexes(domains[sourceIndex].in));
    }
    if (visitOut) {
        links = links.concat(linksIndexes(domains[sourceIndex].out));
    }
    for (var i = 0 ; i < links.length ; i++) {
        var nodeIndex = Number(links[i]); // nodeIndex is a string and type matters for Set & map
        
        if (visited.has(nodeIndex)) { 
            continue;
        }
        var n = unvisited.get(nodeIndex);
        if (n && n.dist <= sourceDist+1) {
            continue
        }
        var nPath = sourcePath.length == 0 ? [] : sourcePath.slice(0);
        nPath.push(nodeIndex);
        if (nodeIndex == destIndex) {
            return nPath;
        }
        unvisited.set(nodeIndex, {dist: sourceDist+1, path: nPath});
    }
    return undefined;
}

/*
Returns indexes for illegalNodesForShortestPath, ensuring that they don't appear in the path
*/
var initialIllegalVisits = null;
function getIllegalVisits() {
    if (initialIllegalVisits == null) {
        var remove = illegalNodesForShortestPath.slice(0);
        initialIllegalVisits = new Set();
        for (var j = 0 ; j < domains.length ; j++) {
            var nodeName = domains[j].d;
            for (var i = 0 ; i < remove.length ; i++) {
                if (nodeName == remove[i]) {
//                    console.log("Removing " + nodeName + " with index " + j);
                    initialIllegalVisits.add(j);
                    remove.splice(i, 1);
                    if (remove.length == 0) {
                        return new Set(initialIllegalVisits);
                    }
                    break;
                }
            }
        }
    }
    return new Set(initialIllegalVisits);
}

/*
Finds the shortest path between two nodes, using Dijkstra's algorithm O(n^2)
While O(n^2) sounds problematic, only insanely interlinked graphs should take a long time and a lot of memory
Note: illegalNodesForShortestPath holds a list of domains to ignore when doing traversal: It is not very 
      interesting to see that a & b are connected by linking to google.com
*/
function findShortestPath(sourceIndex, destIndex, visitIn=defaultVisitIn, visitOut=defaultVisitOut) {
    var visited = getIllegalVisits();
    visited.delete(sourceIndex);
    visited.delete(destIndex);
    var unvisited = new Map();
    var path;
    if (sourceIndex == destIndex) {
        console.log("Source == destination");
        return;
    }
    
    unvisited.set(sourceIndex, {dist: 0, path: [sourceIndex]});
    path = updateUnvisitedLinks(visited, unvisited, sourceIndex, destIndex, 0, [sourceIndex], visitIn, visitOut);
    if (path) {
        return path == "EON" ? undefined : path;
    }

    while ((path = traverse(visited, unvisited, destIndex, visitIn, visitOut)) == "");
    return !path || path == "EON" ? undefined : path;
}

function message(m) {
    console.log(m);
    domainFeedback.innerHTML = m;
}

function isNodeIndexInLinks(linksString, nodeIndex) {
    var li = linksIndexes(linksString);
    for (var i = 0 ; i < li.length ; i++) {
        if (li[i] == nodeIndex) {
            return true;
        }
    }
    return false;
}

function pathToText(path) {
    var s = domains[path[0]].d;
    for (var i = 0 ; i < path.length-1 ; i++) {
        var sourceDomain = domains[path[i]];
        var outLink = isNodeIndexInLinks(sourceDomain.out, path[i+1]);
        var inLink = isNodeIndexInLinks(sourceDomain.in, path[i+1]);
        s += outLink && inLink ? " ↔ " : inLink ? " ← " : outLink ? " → " : " ? ";
        s += domains[path[i+1]].d;
    }
    return s;
}

function markShortestPath(sourceName, destName) {
    myDragon.clearOverlays();
    clearSVGOverlay();
    createSVGOverlay();
    
    sourceName = sourceName.trim();
    destName = destName.trim();
    // TODO: If there is no destination, just mark the source node without links
    var sourceIndex = -1;
    var destIndex = -1;
    var arrayLength = domains.length;
    for (var i = 0; i < arrayLength; i++) {
        var domainName = domains[i].d;
        if (domainName == sourceName) {
            sourceIndex = i;
            if (destIndex != -1) {
                break;
            }
        }
        if (domainName == destName) {
            destIndex = i;
            if (sourceIndex != -1) {
                break;
            }
        }
    }
    if (sourceIndex != -1) {
        updateSVGOverlay(getSVGCircle(domains[sourceIndex]));
    }
    if (destIndex != -1) {
        updateSVGOverlay(getSVGCircle(domains[destIndex]));
    }
    if (sourceIndex == -1 && destIndex == -1) {
        message("Unable to locate '" + sourceName + "' and '" + destName + "'");
        return
    } else if (sourceIndex == -1) {
        message("Unable to locate source '" + sourceName + "'");
        return
    } else if (destIndex == -1) {
        message("Unable to locate destination '" + destName + "'");
        return
    }
    var dir = directionSelect.value;
    var path = findShortestPath(sourceIndex, destIndex, dir == "bi" || dir == "in", dir == "bi" || dir == "out");
    if (path) {
        message("Shortest path: " + pathToText(path));
        markPath(path);
    } else {
        message("Unable to find path from '" + sourceName + "' to '" + destName + "'");
    }
}

var animationCallback = null;
var domainChanged = function(e) {
    if (animationCallback != null) {
        window.cancelAnimationFrame(animationCallback);
    }
    var domainInput = domainSelectorInput.value.toLowerCase();
    animationCallback = window.requestAnimationFrame(function(timestamp) {
        switch (searchType) {
        case "search":
            markMatching(domainInput);
            break;
        case "connect":
            var domainToInput = domainSelectorToInput.value.toLowerCase();
            markShortestPath(domainInput, domainToInput);
            break;
        }
    });
}
var domainToChanged = function(e) {
    if (animationCallback != null) {
        window.cancelAnimationFrame(animationCallback);
    }
    var domainInput = domainSelectorInput.value.toLowerCase();
    var domainToInput = domainSelectorToInput.value.toLowerCase();
    message("Finding shortest path from '" + domainInput + "' to '" + domainToInput + "'...");
    animationCallback = window.requestAnimationFrame(function(timestamp) {
        markShortestPath(domainInput, domainToInput);
    });
}

var searchTypeChanged = function(e) {
    searchType = document.getElementById("search-type").value;
    switch (searchType) {
    case "search":
        domainSelectorToInput.style.visibility = 'hidden';
        directionSelect.style.visibility = 'hidden';
        domainChanged();
        break
    case "connect": 
        domainSelectorToInput.style.visibility = 'visible';
        directionSelect.style.visibility = 'visible';
        domainToChanged();
       break
    default:
        console.log("Error: Unknown search type '" + searchType + "'");
    }
    
}

function clickedNode(domain, domainIndex, shift) {
    switch (searchType) {
    case "search":
        markLinks(domain.d, domainIndex, false);
        break;
    case "connect":
        if (!shift) {
            domainSelectorInput.value = ' ' + domain.d + ' ';
        } else {
            domainSelectorToInput.value = ' ' + domain.d + ' ';
        }
        domainToChanged();
        break;
    }
}

function clickedOutsideNodes(shift) {
    if (!shift) {
        clearSVGOverlay();
    }
}

var canvasClicked = function(info) {
    if (!info.quick) { // info.quick = not dragged
        return;
    }
    var relative = myDragon.viewport.pointFromPixel(info.position);
    var gx = relative.x*viewbox.x2 + viewbox.x1;
    var gy = relative.y*viewbox.x2 + viewbox.y1;
    var arrayLength = domains.length; // domains is defined in domains.js
    for (var i = 0; i < arrayLength; i++) {
        var d = domains[i];
        if (d.x-d.r <= gx && d.x+d.r >= gx &&
            d.y-d.r <= gy && d.y+d.r >= gy) {
            clickedNode(d, i, info.shift);
            //markLinks(d.d, i, !info.shift);
            return;
        }
    }
    clickedOutsideNodes(info.shift);
}

var domainSelectorInput = document.getElementById("domain-selector");
var domainSelectorToInput = document.getElementById("domain-selector-to");
var searchTypeSelect = document.getElementById("search-type");
var directionSelect = document.getElementById("connect-direction");

if (typeof myDragon == 'undefined') {
    console.error("Error: The variable 'myDragon' is not set. Unable to provide visual domain marking");
} else if (typeof domains == 'undefined') {
    console.error("Error: The variable 'domains' is not set. Unable to provide domain search");
} else {
    myDragon.addHandler('canvas-click', canvasClicked);
    if (searchTypeSelect) {
        searchTypeSelect.selectedIndex = 0;
        searchTypeSelect.addEventListener("input", searchTypeChanged);
    } else {
        searchTypeSelect = new Object(); // Dummy
        console.log("Warning: Unable to locate an search type select id 'search-type'");
    }
    if (directionSelect) {
        directionSelect.selectedIndex = 0;
        directionSelect.addEventListener("input", domainToChanged);
    } else {
        directionSelect = new Object(); // Dummy
        console.log("Warning: Unable to locate connection direction select id 'connect-direction'");
    }
    if (domainSelectorInput) {
        domainSelectorInput.addEventListener("input", domainChanged);
    } else {
        domainSelectorInput = new Object(); // Dummy
        console.log("Warning: Unable to locate an input field with id 'domain-selector': Domain selection is disabled");
    }
    if (domainSelectorToInput) {
        domainSelectorToInput.addEventListener("input", domainToChanged);
    } else {
        domainSelectorToInput = new Object(); // Dummy
    }
    if (document.getElementById("domain-feedback")) {
        var domainFeedback = document.getElementById("domain-feedback");
    } else {
        var domainFeedback = new Object(); // Dummy
        console.log("Warning: Unable to locate an element with id 'domain-feedback': Feedback on domain matching is disabled");
    }
}
