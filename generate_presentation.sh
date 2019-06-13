#!/bin/bash

#
# Takes a SVG as input, generates a PNG rendering, DeepZoom tiles and a JSON
# block containing node coordinates for search.
#

###############################################################################
# CONFIG
###############################################################################


if [[ -s "linkgraph.conf" ]]; then
    source "linkgraph.conf"     # Local overrides
fi
pushd ${BASH_SOURCE%/*} > /dev/null
SCRIPT_HOME="$(pwd)"

: ${SVG:="$1"}
B=${SVG%.*}
DZI="${B}.dzi"
: ${DEST:="$2"}
: ${DEST:="$B"}
: ${PNG:="${DEST}/${B}.png"}
: ${TEMPLATE:="presentation_template.html"}

# PNG & DeepZoom tile parameters
: ${RENDER_SIZE:="20000"}
: ${RENDER_WIDTH:="$RENDER_SIZE"}
: ${RENDER_HEIGHT:="$RENDER_SIZE"}
: ${FORMAT:="png"} # Gephi charts are circles, lines and text so PNG is probably best choice

# Where to get OpenSeadragon
: ${OSD_VERSION:=2.2.1}
: ${OSD_ZIP:="openseadragon-bin-${OSD_VERSION}.zip"}
: ${OSD_URL:="http://github.com/openseadragon/openseadragon/releases/download/v${OSD_VERSION}/$OSD_ZIP"}

: ${DAT_LINKS:="${DEST}/links.dat"}
: ${DAT_POS:="${DEST}/position.dat"}
: ${DAT_ALL:="${DEST}/all.dat"}
popd > /dev/null

function usage() {
    echo "Usage: ./generate_presentation mygraph.svg"
    exit $1
}

check_parameters() {
    if [[ -z "$SVG" ]]; then
        >&2 echo "Error: No input file specified"
        usage 2
    fi
    if [[ ! -s "$SVG" ]]; then
        >&2 echo "Error: Unable to read '$SVG'"
        usage 3
    fi
    mkdir -p "$DEST"

    local MISSING=false
    if [[ .$(which gm) == . ]]; then
        >&2 echo "Error: 'gm' (GraphicsMagic) not available, please install it"
        MISSING=true
    fi
    if [[ .$(which vips) == . ]]; then
        >&2 echo "Error: 'vips' not available, please install it"
        MISSING=true
    fi
    if [[ "true" == "$MISSING" ]]; then
        usage 2
    fi
    SVG_ABSOLUTE=$(echo "$(cd "$(dirname "$SVG")"; pwd)/$(basename "$SVG")")
    PNG_ABSOLUTE=$(echo "$(cd "$(dirname "$PNG")"; pwd)/$(basename "$PNG")")
    
}

################################################################################
# FUNCTIONS
################################################################################

fetch_dragon() {
    if [[ -s "$SCRIPT_HOME/osd/$OSD_ZIP" ]]; then
        return
    fi
    mkdir -p "$SCRIPT_HOME/osd/"
    echo "  - Fetching $OSD_ZIP from $OSD_URL"
    wget -q "$OSD_URL" -O  "$SCRIPT_HOME/osd/$OSD_ZIP"
    if [[ ! -s "$SCRIPT_HOME/osd/$OSD_ZIP" ]]; then
        >&2 echo "Error: Unable to fetch OpenSeadragon ZIP from $OSD_URL"
        >&2 echo "Please download is manually and store it in $SCRIPT_HOME/osd/"
        exit 3
    fi
}

# Expands variables and callbacks in the provided template
# http://stackoverflow.com/questions/14434549/how-to-expand-shell-variables-in-a-text-file
# Input: template-file
function ctemplate() {
    if [[ ! -s "$1" ]]; then
        >&2 echo "Error: Template '$1' could not be found"
        exit 8
    fi
    local TMP=$(mktemp /tmp/graph_presenter_XXXXXXXX)
    echo 'cat <<END_OF_TEXT' >  "$TMP"
    cat  "$1"                >> "$TMP"
    echo 'END_OF_TEXT'       >> "$TMP"
    . "$TMP"
    rm "$TMP"
}

create_png() {
    if [[ -s "$PNG" ]]; then
        echo "- Skipping generation of $PNG as it already exists"
        return
    fi
    echo "- Generating $PNG with dimensions ${RENDER_WIDTH}x${RENDER_HEIGHT} pixels"
    # ImageMagic does not handle large SVGs well, so we use GraphicsMagic
    gm convert -size ${RENDER_WIDTH}x${RENDER_HEIGHT} "$SVG" "$PNG"
}

create_deepzoom() {
    if [[ -d "${DEST}/${B}_files" ]]; then
        echo "- Skipping DeepZoom tile generation as '${DEST}/${B}_files' already exists"
        return
    fi
    echo "- Generating DeepZoom tiles in ${DEST}/${B}_files"
    pushd "$DEST" > /dev/null
    vips dzsave ${PNG_ABSOLUTE} ${B} --suffix .$FORMAT
    popd > /dev/null
}


#        <circle fill-opacity="1.0" fill="#ff5584" r="20.0" cx="-54.279125"
#                class="id_ekot.dk" cy="-78.99566" stroke="#000000"
#                stroke-opacity="1.0" stroke-width="1.0"/>

normalise_svg() {
    tr '\n' ' ' < "$SVG" | sed -e 's/> */>/g' -e 's/ *</</g' | xmllint --format - 
}

# domain in out total
extract_link_stats() {
    if [[ ! -s "$DAT_LINKS" ]]; then
        local T_IN=$(mktemp)
        local T_OUT=$(mktemp)
        grep -o 'class="[^ "]\+ id_[^"]*' "$SVG" | sed 's/class="[^ "]\+ id_\(.*\)/\1/' | sort | uniq -c | sed 's/\s*\([0-9]*\) \(.*\)/\2 \1/' | LC_ALL=C sort > $T_IN
        grep -o 'class="id_[^ "]* ' "$SVG" | sed 's/class="id_\(.*\) /\1/' | sort | uniq -c | sed 's/\s*\([0-9]*\) \(.*\)/\2 \1/' | LC_ALL=C sort > $T_OUT
        LC_ALL=C join -j 1 -a 1 -a 2 -e 0 -o 0 1.2 2.2 $T_IN $T_OUT | sed 's/\(.*\) \([0-9]\+\) \([0-9]\+\)$/echo "\1 \2 \3 $((\2+\3))"/e' > "$DAT_LINKS"
        rm $T_IN $T_OUT
    fi
    cat "$DAT_LINKS"
}

extract_viewbox() {
    grep -o 'viewBox="[^"]*' < "$SVG" | sed 's/.*"\([^ ]*\) *\([^ ]*\) *\([^ ]*\) *\([^ ]*\) */var viewbox= {x1: \1, y1: \2, x2: \3, y2: \4};/'
}

# domain x y r
extract_nodes_circles_raw() {
    if [[ ! -s "$DAT_POS" ]]; then
        tr '\n' ' ' < "$SVG" | grep -o "<circle [^/]*/>" | sed 's/<circle.* r="\([^"]*\)".* cx="\([^"]*\)".* class="id_\([^"]*\)".* cy="\([^"]*\)".*\/>/\3 \2 \4 \1/' | LC_ALL=C sort > "$DAT_POS"
    fi
    cat "$DAT_POS"
}

# domain x y r in out all
extract_all_raw() {
    if [[ ! -s "$DAT_ALL" ]]; then
        join -j 1 -a 1 -a 2 -e 0 -o 0 2.2 2.3 2.4 1.2 1.3 1.4 <(extract_link_stats) <(extract_nodes_circles_raw) > "$DAT_ALL"
    fi              
    cat "$DAT_ALL"
}

extract_domains() {
    echo "var domains= ["
    extract_all_raw | sed 's/\([^ ]\+\) \([^ ]\+\) \([^ ]\+\) \([^ ]\+\) \([^ ]\+\) \([^ ]\+\) \([^ ]\+\)/{d:"\1", x:\2, y:\3, r:\4, in:\5, out:\6, both:\7},/'
    echo "];"
}

extract_all_json() {
    if [[ -s "${DEST}/nodes.js" ]]; then
        echo "- Skipping node data extraction as '${DEST}/nodes.js' already exists"
        return
    fi
    echo "- Extracting node data to ${DEST}/nodes.js"
    extract_viewbox > "${DEST}/nodes.js"
    extract_domains >> "${DEST}/nodes.js"
}

copy_files() {
    echo "- Copying files and applying template $TEMPLATE to $DEST"
    if [[ ! -d "$DEST/resources" ]]; then
        cp -r "$SCRIPT_HOME/resources" "$DEST/"
    fi
    
    unzip -q -o -j -d "$DEST/resources/" "$SCRIPT_HOME/osd/openseadragon-bin-${OSD_VERSION}.zip" ${OSD_ZIP%.*}/openseadragon.min.js
    unzip -q -o -j -d "$DEST/resources/images/" "$SCRIPT_HOME/osd/openseadragon-bin-${OSD_VERSION}.zip" $(unzip -l "$SCRIPT_HOME/osd/openseadragon-bin-"*.zip | grep -o "opensea.*.png" | tr '\n' ' ')

    ctemplate "$TEMPLATE" > "$DEST/index.html"
}

###############################################################################
# CODE
###############################################################################

check_parameters "$@"
echo "Starting processing of $SVG $(date +"%Y-%m%d %H:%M")"
fetch_dragon

create_png
create_deepzoom
extract_all_json
copy_files

echo "Finished $(date +"%Y-%m%d %H:%M"), result in $DEST"
