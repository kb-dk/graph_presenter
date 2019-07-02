// Marks all matching domains with divs of class domain-overlay

var heavyMarked = 150;  // Limit for heavy (animated) marking
var maxMarked =  1000;  // Overall limit for marking
var baseRadius =   40;
var baseMargin =  200; // TODO: Should be coupled to zoom level

function markLinks(domain, domainIndex) {
    myDragon.clearOverlays(); // FIXME: Quite clumsy to freeze the OpenSeadragon instance this way
    if (document.getElementById("domain-selector")) {
        document.getElementById("domain-selector").value = " " + domain + " ";
    }
    var worldW = myDragon.world.getItemAt(0).getContentSize().x;
    var radiusFactor = baseRadius/worldW;

    /* Mark self */
    markChosen([domainIndex], 0, heavyMarked, maxMarked, radiusFactor, "domain-overlay", "domain-overlay-hp");
    /* Mark in-links */
    markChosen(domains[domainIndex].in, 1, heavyMarked, maxMarked, radiusFactor, "domain-overlay-in", "domain-overlay-in-hp", function(elt, domain, domainIndex) {
        elt.onclick = function() {
            markLinks(domain, domainIndex);
        }
    });
    /* Mark out-links */
    markChosen(domains[domainIndex].out, 1 + domains[domainIndex].in.length, heavyMarked, maxMarked, radiusFactor, "domain-overlay-out", "domain-overlay-out-hp", function(elt, domain, domainIndex) {
        elt.onclick = function() {
            markLinks(domain, domainIndex);
        }
    });
}

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
        elt.setAttribute('title', domain.d + " (in=" + domain.in.length + ", out=" + domain.out.length + ")");
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
    /* The domains are 1-indexed. Convert that to 0 as it fits better with javaScript */
    var arrayLength = domains.length; // domains is defined in domains.js
    for (var i = 0; i < arrayLength; i++) {
        var lin = domains[i].in;
        for (var j = 0; j < lin.length; j++) {
            lin[j]--;
        }
        var lout = domains[i].out;
        for (var j = 0; j < lout.length; j++) {
            lout[j]--;
        }
    }
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
    console.log("Activating click handler");
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
        }
    });
}
