// Marks all matching domains with divs of class domain-overlay

var heavyMarked = 150;  // Limit for heavy (animated) marking
var maxMarked =  1000;  // Overall limit for marking
var baseRadius =   20;  // TODO: Couple this to render size
var baseMargin =  200; // TODO: Should be coupled to zoom level
var browseStrokeWidth = 2.0;
var connectStrokeWidth = 5.0;

// Which links to consider when calculating shortest path between two nodes
var defaultVisitIn = false;
var defaultVisitOut = true;
// Which nodes to ignore when calculating shortest path
var illegalNodesForShortestPath = ["google.com", "google.dk", "facebook.com", "bing.com", "twitter.com", "wikipedia.dk", "wikipedia.org", "wordpress.com"];

// **************************************************
// SVGOverlay processing
// **************************************************

function clearAllOverlays() {
    myDragon.clearOverlays();
    diffusor = '';
    svgString = '';
    svg = null;
}

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

function ensureSVGOverlay() {
    if (!diffusor) {
        createSVGOverlay();
    }
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

function drawLinks(links, strokeWidth = browseStrokeWidth) {
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

// Marks node and links from and to the node by updating the SVGOverlay
function markLinks(domainName, domainIndex, clearPrevious) {
    if (clearPrevious) {
        clearAllOverlays();
    }
    //domainSelectorInput.value = " " + domainName + " ";
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

// Given an array of indexes, mark all nodes and the immediate paths between subsequent nodes
function markPath(nodeIndexes, strokeWidth = browseStrokeWidth) {
    clearSVGOverlay();
    // Links first
    for (var i = 0 ; i < nodeIndexes.length ; i++) {
        var node = domains[nodeIndexes[i]];
        if (i < nodeIndexes.length-1) {
            drawLinks(getLinkBetween(nodeIndexes[i], nodeIndexes[i+1]), strokeWidth);
        }
    }
    // Nodes second (so that they are displayed on top of links)
    for (var i = 0 ; i < nodeIndexes.length ; i++) {
        var node = domains[nodeIndexes[i]];
        updateSVGOverlay(getSVGCircle(node) + getSVGText(node));
    }
//        console.log(path[i] + ": " + domains[path[i]].d);
}

// **************************************************
// Node data extraction
// **************************************************

function isNodeIndexInLinks(linksString, nodeIndex) {
    var li = linksIndexes(linksString);
    for (var i = 0 ; i < li.length ; i++) {
        if (li[i] == nodeIndex) {
            return true;
        }
    }
    return false;
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

function linksIndexesFromNode(node, visitIn=defaultVisitIn, visitOut=defaultVisitOut) {
    var links = [];
    if (visitIn) {
        links = links.concat(linksIndexes(node.in));
    }
    if (visitOut) {
        links = links.concat(linksIndexes(node.out));
    }
    return links;
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


// **************************************************
// Viewport handling
// **************************************************

// Ensures that all nodes as given with indexes are visible
function zoomToNodes(indexes) {
    var minX = 1;
    var maxX = 0;
    var minY = 1;
    var maxY = 0;
    for (var i = 0; i < indexes.length; i++) {
        var domain = domains[indexes[i]];
        
        var rx = (domain.x - viewbox.x1)/viewbox.x2;
        var ry = (domain.y - viewbox.y1)/viewbox.x2;

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
    }

    if (indexes.length > 0) {
        var worldW = myDragon.world.getItemAt(0).getContentSize().x;
        var boundsMargin = baseMargin/worldW;
        minX -= boundsMargin;
        minY -= boundsMargin;
        maxX += boundsMargin;
        maxY += boundsMargin;
        myDragon.viewport.fitBoundsWithConstraints(new OpenSeadragon.Rect(minX, minY, maxX-minX, maxY-minY));
    } else {
        myDragon.viewport.fitHorizontally().fitVertically();
    }
}


// **************************************************
// Major fuctionality
// **************************************************

// Performs a sequential search through all domains, visually marking the ones that has the given domainInfix
function markMatching(domainInfix, clearOverlays = true) {
    if (clearOverlays) {
        clearAllOverlays(); // FIXME: Quite clumsy to freeze the OpenSeadragon instance this way
    }
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
    console.log("Matched " + matched + " nodes (max " + maxMarked + " marked) for '" + domainInfix + "' in " + (new Date().getTime() - startTime) + " ms");
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

/*
As all edges has the same weight, Dijkstra's shortest path is effectively breath-first
and we can just return the first element as JavaScript's Map iterates in insertion order
*/
function getShortest(unvisited) {
    var min = Infinity;
    var entryKey = null;
    for (var [key, value] of unvisited.entries()) {
        if (value.dist < min) { // Sanity check that should not be needed
            min = value.dist;
            entryKey = key;
            return entryKey;
        }
    }
    return entryKey;
}

// Returns indexes for illegalNodesForShortestPath, ensuring that they don't appear in the path
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
SPState holds Shortest Path state. All nodes are represented internally as a compact array
and logically as a set.

Each node has a marker that is either
0) Undefined (has not been seen during traversal)
1) Visited
2+) Unvisited (marker-2 is the distance from source, aka depth)

Each unvisited node also holds the node-index of the node linking to it, making it
possible to unravel the path back to the source.

Markers are unsigned 16-bit integers (so a path can at most be 65533 nodes long),
back-references to previous nodes are 32-bit integers (4 billion nodes).
*/
function createSPState() {
    var numDomains = domains.length;
    var markerBuffer = new ArrayBuffer(numDomains*2);
    var referenceBuffer = new ArrayBuffer(numDomains*4);
    var illegals = getIllegalVisits();
    
    // TODO: Add sparse tracking for faster hasNext-iteration
    return {
        markers: new Uint16Array(markerBuffer),
        references: new Uint32Array(referenceBuffer),
        illegals: illegals,
        maxDepth: 0,
        /*
          Iterates all entries with the given depth, calling callback(nodeIndex, SPState) for each.
          Trick: Calling with depth == -1 gives all visited, depth == -2 gives all undefined.
          If callback returns anything else than -1, iteration is stopped and the return
          value is returned. Else -1 is returned at the end.
        */
        iterate: function(depth, callback) {
            var marker = depth+2;
            for (var i = 0 ; i < this.markers.length ; i++) {
                if (this.markers[i] == marker) {
                    var result = callback(i, this);
                    if (result != -1) {
                        return result;
                    }
                }
            }
            return -1;
                
        },
        setVisited: function(nodeIndex) {
            this.markers[nodeIndex] = 1;
        },
        /*
          Sets the state to unvisited if the marker is undefined or if (the marker is
          unvisited and the existing depth > new depth)
          Returns true if the destination was updated.
        */
        updateUnvisited: function(nodeIndex, depth, parent) {
            if (this.illegals.has(Number(nodeIndex))) {
                return;
            }
            if (this.maxDepth < depth) { // TODO: Pretty bad to have it here instead of updateMultiVisited
                this.maxDepth = depth;
            }
            var existing = this.markers[nodeIndex];
            if (existing == 1) { // Already visited
                return false;
            }
            if (existing == 0 || existing-2 > depth) { // Undefined or unvisited at higher level
                this.markers[nodeIndex] = depth+2;
                this.references[nodeIndex] = parent;
                return true;
            }
            return false;
        },
        /*
          Calls updateVisited for all given nodeIndexes.
          If one of the nodeIndexes is equal to destIndex, processing is stopped and the index is returned,
          else -1 is returned.
        */
        updateMultiVisited: function(nodeIndexes, destIndex, depth, parent) {
            for (var i = 0 ; i < nodeIndexes.length ; i++) {
                this.updateUnvisited(nodeIndexes[i], depth, parent);
                if (nodeIndexes[i] == destIndex) {
                    return nodeIndexes[i];
                }
            }
            return -1;
        },
        /*
          For a given nodeIndex, follow its edges and register connected nodes as unvisited, lastly 
          marking the nodeIndex as visited.
          If the destIndex is encountered, it is returned immediately, else -1 is returned.
        */
        processNode: function(nodeIndex, depth, destIndex, visitIn=defaultVisitIn, visitOut=defaultVisitOut) {
            this.setVisited(nodeIndex);
            var nodeIndexes = linksIndexesFromNode(domains[nodeIndex], visitIn, visitOut);
            return this.updateMultiVisited(nodeIndexes, destIndex, depth+1, nodeIndex);
        },
        /*
          Iterate all nodes at a given depth, for each following its edges and registering connected
          nodes as unvisited, lastly marking the iterated node as visited.
          If at any time the destIndex is encountered, it is returned immediately, else -1 is returned.
        */
        processDepth: function(depth, destIndex, visitIn=defaultVisitIn, visitOut=defaultVisitOut) {
            return this.iterate(depth, function(nodeIndex, state) {
                // Same as processNode, but we inline for speed (just guessing here, should be measured)
                state.setVisited(nodeIndex);
                var nodeIndexes = linksIndexesFromNode(domains[nodeIndex], visitIn, visitOut);
                var result = state.updateMultiVisited(nodeIndexes, destIndex, depth+1, nodeIndex);
                return result;
            });
        },
        /*
          Performs a breadth-first search from sourceIndex to destIndex.
          Returns destIndex if found, else -1.
        */
        findDestination: function(sourceIndex, destIndex, visitIn=defaultVisitIn, visitOut=defaultVisitOut) {
            if (sourceIndex == destIndex) {
                return destIndex;
            }
            var result = this.processNode(sourceIndex, 0, destIndex, visitIn, visitOut);
            if (result != -1) {
                return result;
            }
            var depth = 1;
            while (depth <= this.maxDepth && result == -1) {
                result = this.processDepth(depth, destIndex, visitIn, visitOut);
                ++depth;
            }
            return result;
        },
        findPath: function(sourceIndex, destIndex, visitIn=defaultVisitIn, visitOut=defaultVisitOut) {
        /*
          Performs a breadth-first search from sourceIndex to destIndex.
          nodeIndexes from sourceIndex to destiIndex (both inclusive) is a path is found, else undefined
        */
            var result = this.findDestination(sourceIndex, destIndex, visitIn, visitOut);
            if (result == -1) {
                return undefined;
            }
            var path = [destIndex];
            var index = destIndex;
            while (index != sourceIndex) {
                path.push(index = this.references[index]);
            }
            return path.reverse();
        }
    }
}

/*
Finds the shortest path between two nodes, using Dijkstra's algorithm O(n^2).
While O(n^2) sounds problematic, only insanely interlinked graphs should take a long time.
Note: illegalNodesForShortestPath holds a list of domains to ignore when doing traversal: It is not very 
      interesting to see that a & b are connected by linking to google.com
*/
function findShortestPath(sourceIndex, destIndex, visitIn=defaultVisitIn, visitOut=defaultVisitOut) {
    return createSPState().findPath(sourceIndex, destIndex, visitIn, visitOut);
}

function message(m, mlog) {
    console.log(m + (mlog ? mlog : ''));
    domainFeedback.innerHTML = m;
}

// in:  node names
// out: node indexes or -1 if not matchied
function findNodeIndexes(source, destination) {
    var sourceIndex = -1;
    var destIndex = -1;
    if (source != '' || destination != '') {
        var arrayLength = domains.length;
        for (var i = 0; i < arrayLength; i++) {
            var domainName = domains[i].d;
            if (domainName == source) {
                sourceIndex = i;
                if (destIndex != -1 || destination == '') {
                    break;
                }
            }
            if (domainName == destination) {
                destIndex = i;
                if (sourceIndex != -1 || sourceIndex == '') {
                    break;
                }
            }
        }
    }
    return {sourceIndex: sourceIndex, destIndex: destIndex};
}

function markShortestPath(sourceName, destName, clearOverlays = true) {
    var start = window.performance.now();
    if (clearOverlays) {
        clearAllOverlays();
    };
    ensureSVGOverlay();
    
    sourceName = sourceName.trim();
    destName = destName.trim();
    var nodeIndexes = findNodeIndexes(sourceName, destName);
    sourceIndex = nodeIndexes.sourceIndex;
    destIndex = nodeIndexes.destIndex;
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
    var ms = window.performance.now()-start;
    if (path) {
        message("Shortest path: " + pathToText(path), " in " + ms + "ms");
        markPath(path, connectStrokeWidth);
        zoomToNodes(path);
    } else {
        message("Unable to find path from '" + sourceName + "' to '" + destName, "' in " + ms + "ms");
    }
}


// **************************************************
// Action handlers
// **************************************************

var stateToURL = function() {
    var posJSON = 'type=' + state.searchType + ';overlay=' + state.showOverlay +
        ';mark=' + state.markDomainsMatching + ';source=' + state.sourceNode + ';dest=' + state.destNode +
        ';direction=' + state.direction + ';selected=' + state.selectedNodes.toString();
    console.log("Storing " + posJSON);
    if (window.history.replaceState) {
        newLoc = window.location.href.replace(/#.*/, "") + '#' + posJSON;
        window.history.replaceState({ }, document.title, newLoc);
    }
}

// .../index.html#type=search;overlay=true;mark=;source=hvam.eu;dest=;selected=128,168
var URLToState = function(fireChange = true) {
    // TODO: Update type, source and dest without firing events
    var myRegexp = /.*#type=([^;]+);overlay=([^;]+);mark=([^;]*);source=([^;]*);dest=([^;]*);direction=([^;]*);selected=([^;]*)/
    var match = myRegexp.exec(window.location.href);
    if (match) {
        console.log("Restoring state from URL hash");
        state.searchType = match[1];
        state.showOverlay = match[2];
        state.markDomainsMatching = match[3];
        state.sourceNode = match[4];
        state.destNode = match[5];
        state.direction = match[6];
        if (match[7] != '') {
            var nodeIDs = match[7].split(",");
            state.selectedNodes = [];
            for (var i = 0 ; i < nodeIDs.length ; i++) {
                state.selectedNodes.push(Number(nodeIDs[i]));
            }
        }
        if (fireChange) {
            fireStateChange();
        }
    }
}

var stateToGUI = function() {
    switch (state.searchType) {
    case "search":
        domainSelectorToInput.style.visibility = 'hidden';
        directionSelect.style.visibility = 'hidden';
        if (searchTypeSelect.selectedIndex != 0) {
            searchTypeSelect.selectedIndex = 0;
            searchTypeSelect.options[0].selected = true;
        }
        // TODO: Update source, direction & destination
        break;
    case "connect":
        domainSelectorToInput.style.visibility = 'visible';
        directionSelect.style.visibility = 'visible';
        if (searchTypeSelect.selectedIndex != 1) {
            searchTypeSelect.selectedIndex = 1;
            searchTypeSelect.options[1].selected = true;
        }
        break;
    }

    var index = 0; // default is "bi"
    switch (state.direction) {
    case "out":
        index = 1;
        break;
    case "in":
        index = 2;
        break;
    }
    if (directionSelect.selectedIndex != index) {
        directionSelect.selectedIndex = index;
        directionSelect.options[index].selected = true;
    }
}

var stateToVisual = function() {
    clearAllOverlays(); // FIXME: Quite clumsy to freeze the OpenSeadragon instance this way

    switch (state.searchType) {
    case "search":
        if (state.showOverlay && state.selectedNodes.length > 0) {
            ensureSVGOverlay();
            for (var i = 0 ; i < state.selectedNodes.length ; i++) {
                markLinks(domains[state.selectedNodes[i]].d, state.selectedNodes[i], false);
            }
        }
        break;
    case "connect":
        var ni = findNodeIndexes(state.sourceNode, state.destNode);
        if ((state.showOverlay && (ni.sourceIndex != -1 || ni.destIndex != -1)) ||
            (ni.sourceIndex != -1 && ni.destIndex != -1)) {
            ensureSVGOverlay();
            markShortestPath(state.sourceNode, state.destNode, false);
        }
        break;
    }

    if (state.markDomainsMatching != '') {
        markMatching(state.markDomainsMatching, false);
    }
}

var handleStateChange = function() {
    stateToGUI();
    stateToVisual();
    stateToURL();
}

// searchType: search|connect
// showOverlay: true|false // true = show SVG overlay with nodes and edges
// direction: bi|out|in
var state = {
    searchType: 'search',
    showOverlay: 'false',
    markDomainsMatching: '',
    
    sourceNode: "",
    destNode: "",
    direction: "bi",
    selectedNodes: []
}

var ignoreFirstSearchTypeChange = false;
var ignoreFirstSourceNodeChange = false;
var ignoreFirstDestNodeChange = false;
var animationCallback = null;
var abortStateChange = function() {
    if (animationCallback != null) {
        window.cancelAnimationFrame(animationCallback);
    }
}
var fireStateChange = function() {
    animationCallback = window.requestAnimationFrame(function(timestamp) {
        handleStateChange();
    });
}

var searchTypeChanged = function(e) {
    if (ignoreFirstSearchTypeChange) {
        ignoreFirstSearchTypeChange = false;
        return;
    }
    abortStateChange();
    state.searchType = searchTypeSelect.value;
    state.showOverlay = false;
    state.selectedNodes = [];
    fireStateChange();
}
var sourceNodeChanged = function(e) {
    if (ignoreFirstSourceNodeChange) {
        ignoreFirstSourceNodeChange = false;
        return;
    }
    abortStateChange();
    state.sourceNode = domainSelectorInput.value.toLowerCase();
    state.markDomainsMatching = state.sourceNode;
    fireStateChange();
}
var destNodeChanged = function(e) {
    if (ignoreFirstDestNodeChange) {
        ignoreFirstDestNodeChange = false;
        return;
    }
    abortStateChange();
    state.destNode = domainSelectorToInput.value.toLowerCase();
    state.markDomainsMatching = state.destNode;
    // TODO: If both != -1 and state.searchType == connect then showOverlay = true?
    //    message("Finding shortest path from '" + domainInput + "' to '" + domainToInput + "'...");
    fireStateChange();
}
var directionChanged = function(e) {
    abortStateChange();
    switch (directionSelect.selectedIndex) {
    case 1:
        state.direction = "out";
        break;
    case 2:
        state.direction = "in";
        break;
    default:
        state.direction = "bi";
        break;
    }
    fireStateChange();
}

function clickedNode(domain, domainIndex, shift) {
   abortStateChange(); 
   switch (state.searchType) {
    case "search":
        state.sourceNode = domain.d;
        state.selectedNodes.push(domainIndex);
        state.showOverlay = true;
        state.markDomainsMatching = '';

        ignoreFirstSourceNodeChange = true;
        domainSelectorInput.value = ' ' + state.sourceNode + ' ';
        break;
    case "connect":
        if (!shift) {
            state.sourceNode = domain.d;
            state.markDomainsMatching = '';
            state.showOverlay = true;

            ignoreFirstSourceNodeChange = true;
            domainSelectorInput.value = ' ' + state.sourceNode + ' ';
        } else {
            state.destNode = domain.d;
            state.markDomainsMatching = '';
            state.showOverlay = true;

            ignoreFirstDestNodeChange = true;
            domainSelectorToInput.value = ' ' + state.destNode + ' ';
        }
        break;
    }
    fireStateChange();
}

function clickedOutsideNodes(shift) {
    if (!shift) {
        abortStateChange();
        state.showOverlay = false;
        state.selectedNodes = [];
        fireStateChange();
    }
}

// **************************************************
// Startup procedures
// **************************************************

// Remove loading message and show search box
var loader = document.getElementById("loader");
if (loader) {
    loader.parentNode.removeChild(loader);
}
var searchbox = document.getElementById("searchbox");
if (searchbox) {
    searchbox.style.visibility = 'visible';
}

// **************************************************
// Connections to GUI and event-catching
// **************************************************

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

var searchTypeSelect = document.getElementById("search-type");
var domainSelectorInput = document.getElementById("domain-selector");
var domainSelectorToInput = document.getElementById("domain-selector-to");
var directionSelect = document.getElementById("connect-direction");
if (typeof myDragon == 'undefined') {
    console.error("Error: The variable 'myDragon' is not set. Unable to provide visual domain marking");
} else if (typeof domains == 'undefined') {
    console.error("Error: The variable 'domains' is not set. Unable to provide domain search");
} else {
    URLToState(false);
    stateToGUI(); // Call this before adding handlers

    myDragon.addHandler('canvas-click', canvasClicked);
    if (searchTypeSelect) {
        searchTypeSelect.addEventListener("input", searchTypeChanged);
    } else {
        searchTypeSelect = new Object(); // Dummy
        console.log("Warning: Unable to locate an search type select id 'search-type'");
    }
    if (directionSelect) {
        directionSelect.addEventListener("input", directionChanged);
    } else {
        directionSelect = new Object(); // Dummy
        console.log("Warning: Unable to locate connection direction select id 'connect-direction'");
    }
    if (domainSelectorInput) {
        domainSelectorInput.addEventListener("input", sourceNodeChanged);
    } else {
        domainSelectorInput = new Object(); // Dummy
        console.log("Warning: Unable to locate an input field with id 'domain-selector': Domain selection is disabled");
    }
    if (domainSelectorToInput) {
        domainSelectorToInput.addEventListener("input", destNodeChanged);
    } else {
        domainSelectorToInput = new Object(); // Dummy
    }
    if (document.getElementById("domain-feedback")) {
        var domainFeedback = document.getElementById("domain-feedback");
    } else {
        var domainFeedback = new Object(); // Dummy
        console.log("Warning: Unable to locate an element with id 'domain-feedback': Feedback on domain matching is disabled");
    }
    myDragon.viewport.viewer.addHandler("open", stateToVisual);
}
