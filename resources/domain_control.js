// Marks all matching domains with divs of class domain-overlay

var heavyMarked = 150;  // Limit for heavy (animated) marking
var maxMarked =  1000;  // Overall limit for marking
var baseRadius =   10;  // TODO: Couple this to render size
var baseMargin =  200; // TODO: Should be coupled to zoom level

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

function updateSVGOverlay(svgXML) {
    svgString += svgXML;
    svg.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;z-index:10;margin:0;padding:0;top:0;left:0;width:100%;height:100%" viewBox="' + viewbox.x1 + ' ' + viewbox.y1 + ' ' + viewbox.x2 + ' ' + viewbox.y2 + '">' + svgString + '</svg>';
    diffusor.style.opacity = 0.8;
}

function drawLinks(links, counter) {
    var svgLines = '';
    for (var i = 0 ; i < links.length ; i++) {
        var link = links[i];
/*<path fill="none" stroke-width="1.0"
              d="M -170.428101,133.646652 C -151.027847,138.653076 -129.437119,175.263123 -134.443542,194.663376"
              class="id_dukkehjem.dk id_poolforum.se" stroke-opacity="1.0"
              stroke="#ff5584"/>*/
        svgLines += '<path fill="none" stroke-width="1.0" d="' + link.path + '" stroke-opacity="1.0" stroke="#' + link.color + '"><title>' + link.sourceName + '→' + link.destName + '</path>\n'
    }
    updateSVGOverlay(svgLines);
}

function getSVGCircle(domain, color) {
    return '<circle fill-opacity="1.0" fill="#' + color + '" r="' + domain.r + '" cx="' + domain.x + '" cy="' + domain.y + '" stroke="#000000" stroke-opacity="1.0" stroke-width="1.0"><title>' + domain.d + ' (in=' + linksIndexes(domain.in).length + ', out=' + linksIndexes(domain.out).length + ')</title></circle>\n';    
}

function getDomainColor(domain) {
    var links = domain.out.length == 0 ? domain.in : domain.out;
    if (links.length == 0) {
        console.log("No links");
        return "cccccc";
    }
    /* 222(-589.385315,-193.555618~-604.705933,-255.864410#c0c0c0);123... */
    return links.split(";")[0].split('#')[1].replace(')', '');
}

function drawCircles(links, counter, isInLinks) {
    var svgCircles = '';
    for (var i = 0 ; i < links.length ; i++) {
        var link = links[i];
        var external = isInLinks ? domains[link.sourceIndex] : domains[link.destIndex];
        // TODO: the color is a bit tricky as it depends on whether the node has outgoing only ingoing links
        var color = getDomainColor(external);
        svgCircles += getSVGCircle(external, color);
    }
    updateSVGOverlay(svgCircles);
}

function markLinks(domainName, domainIndex) {
    myDragon.clearOverlays(); // FIXME: Quite clumsy to freeze the OpenSeadragon instance this way
    if (document.getElementById("domain-selector")) {
        document.getElementById("domain-selector").value = " " + domain + " ";
    }
    var worldW = myDragon.world.getItemAt(0).getContentSize().x;
    var radiusFactor = baseRadius/worldW;

    createSVGOverlay();
    var domain = domains[domainIndex];
    var inLinks = expandLinks(domain, domainIndex, domain.in, true);
    var outLinks = expandLinks(domain, domainIndex, domain.out, false);
    /* Draw link lines */
    drawLinks(inLinks, 0);
    drawLinks(outLinks, inLinks.length);
    /* Draw linked circles */
    drawCircles(inLinks, inLinks.length+outLinks.length, true);
    drawCircles(outLinks, outLinks.length*2+outLinks.length, false);
    /* Draw self-circle */
    updateSVGOverlay(getSVGCircle(domain, getDomainColor(domain)));
    
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
        var coorCol = subTokens[1].split('#');
        var infixCoordinates = coorCol[0].replace('~', ' ');
        var color = coorCol[1].replace(')', '');
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
            sName = domains[dIndex].d;
            dName = source.d;
        } else {
            sIndex = sourceIndex;
            dIndex = linkIndex; 
            sCoor = sourceCoordinates;
            dCoor = destCoordinates;
            sName = source.d;
            dName = domains[sIndex].d;
            sRadius = source.r;
            dRadius = domains[dIndex].r;
        }
        links.push({sourceName: sName, destName: dName, sourceIndex: sIndex, destIndex: dIndex, sourceRadius: sRadius, destRadius: dRadius, path: "M " + sCoor + " C " + infixCoordinates + " " + dCoor, color: color});
    }
    return links;
}

function linksIndexes(linksString) {
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

/*
Performs a sequential search through all domains, visually marking the ones that has the given domainInfix
*/
function markMatching(domainInfix) {
    myDragon.clearOverlays(); // FIXME: Quite clumsy to freeze the OpenSeadragon instance this way
    if (domainInfix.length < 1) {
        myDragon.viewport.fitHorizontally().fitVertically();
        domainFeedback.innerHTML = "&nbsp;";
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
            markLinks(domain, domainIndex);
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

var animationCallback = null;
var domainChanged = function(e) {
    if (animationCallback != null) {
        window.cancelAnimationFrame(animationCallback);
    }
    var domainInput = e.target.value.toLowerCase();
    animationCallback = window.requestAnimationFrame(function(timestamp) {
        markMatching(domainInput);
    });
}

if (typeof myDragon == 'undefined') {
    console.error("Error: The variable 'myDragon' is not set. Unable to provide visual domain marking");
} else if (typeof domains == 'undefined') {
    console.error("Error: The variable 'domains' is not set. Unable to provide domain search");
} else {
    /* TODO: Consider a delay mechanism to make it smooth to type */
    if (document.getElementById("domain-selector")) {
        document.getElementById("domain-selector").addEventListener("input", domainChanged);
    } else {
        console.log("Warning: Unable to locate an input field with id 'domain-selector': Domain selection is disabled");
    }
    if (document.getElementById("domain-feedback")) {
        var domainFeedback = document.getElementById("domain-feedback");
    } else {
        var domainFeedback = new Object(); // Dummy
        console.log("Warning: Unable to locate an element with id 'domain-feedback': Feedback on domain matching is disabled");
    }
}
if (typeof myDragon != 'undefined') {
    myDragon.addHandler('canvas-click', function(info) {
        var relative = myDragon.viewport.pointFromPixel(info.position);
        var gx = relative.x*viewbox.x2 + viewbox.x1;
        var gy = relative.y*viewbox.x2 + viewbox.y1;
        var arrayLength = domains.length; // domains is defined in domains.js
        for (var i = 0; i < arrayLength; i++) {
            var d = domains[i];
            if (d.x-d.r <= gx && d.x+d.r >= gx &&
                d.y-d.r <= gy && d.y+d.r >= gy) {
                markLinks(d.d, i);
                break;
            }
            /* TODO: Avoid click-handling on drag then enable
            if (diffusor) {
                diffusor.style.opacity = 0.0;
            }
            */
        }
    });
}
