#!/bin/bash

#
# librsvg is limited to SVGs of either 200,000 or 1,000,000 nodes, depending
# on version:
#  https://gitlab.gnome.org/GNOME/librsvg/-/issues/574
#  https://gitlab.gnome.org/GNOME/librsvg/-/blob/main/src/limits.rs
#
# This script splits a given Gephi SVG into manageable chunks and renders them
# to a bitmap in multiple steps. It can be used as a standalone program or as
# a helper for render_presentation.sh
#
# Requirements: vips, xmllint, split
#
# Note: This script is limited to SVGs with ~10 billion entries

###############################################################################
# CONFIG
###############################################################################

if [[ -s "linkgraph.conf" ]]; then
    source "linkgraph.conf"     # Local overrides
fi
pushd ${BASH_SOURCE%/*} > /dev/null
SCRIPT_HOME="$(pwd)"

: ${SVG:="$1"}
BASE=$(basename -- "$SVG")
BASE=${BASE%.*}
: ${IMAGE:="$2"}
: ${IMAGE:="${BASE}.png"}

: ${RENDER_SIZE:="10000"}
: ${RENDER_WIDTH:="$RENDER_SIZE"}
: ${RENDER_HEIGHT:="$RENDER_SIZE"}

: ${SVG_MAX_LINES:="190000"} # Keep this well below 200k to be sure we don't hit the limit
: ${CLEAN_UP:="true"}

popd > /dev/null

function usage() {
    cat <<EOF

Usage: ./svg_render.sh mygraph.svg mygraph.tif"

See variables in source code for extra options. Specify by setting environment 
variables before the script is called, e.g.

RENDER_SIZE=5000 ./svg_render.sh wikipedia_dk.svg wikipedia_dk.tif
EOF
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
    if [[ -z "$IMAGE" ]]; then
        >&2 echo "Error: No output image specified"
        usage 4
    fi
    if [[ -s "$IMAGE" ]]; then
        >&2 echo "Error: Destination image '$IMAGE' already exists"
        usage 6
    fi
    for TOOL in xmllint vips split; do
        if [[ .$(which ${TOOL}) == . ]]; then
            >&2 echo "Error: '$TOOL' not available, please install it"
            usage 5
        fi
    done
}

################################################################################
# FUNCTIONS
################################################################################

# Returns largest DPI from wanted width & height 
get_dpi() {
    local W_DPI=$(( $RENDER_WIDTH * 72 / $(head -n 100 "$SVG" | tr '\n' ' ' | grep -o '<svg[^<]*width="[0-9.]*"' | grep -o 'width=.*' | sed 's/[^0-9]*\([0-9]*\).*/\1/') ))
    local H_DPI=$(( $RENDER_HEIGHT * 72 / $(head -n 100 "$SVG" | tr '\n' ' ' | grep -o '<svg[^<]*height="[0-9.]*"' | grep -o 'height=.*' | sed 's/[^0-9]*\([0-9]*\).*/\1/') ))
    if [[ "$W_DPI" -lt "$H_DPI" ]]; then
        echo "$H_DPI"
    else
        echo "$W_DPI"
    fi
}

normalise_svg() {
    tr '\n' ' ' < "$SVG" | sed -e 's/> */>/g' -e 's/ *</</g' | xmllint --format - 
}

extract_part() {
    local T="render_tmp"
    local PART="$1"
    
    echo "   - Extracting $PART"
    normalise_svg | grep -A 999999999 "<g id=\"$PART\">" | grep -B 999999999 '</g>' -m 1 | grep -v '</\?g' > "${T}/${PART}.xml"
    if [[ ! -s "${T}/${PART}.xml" ]]; then
        >&2 echo "Error: No $PART extracted from $SVG"
    fi
    split -l $SVG_MAX_LINES -a 4 "${T}/${PART}.xml" "${T}/${PART}-part.xml_"
}

render_part() {
    local T="render_tmp"
    local PREFIX="$1"
    local IMG="${T}/render.tif"
    local IMG_T="${T}/render_t.tif"

    echo "   - Rendering ${PREFIX}"
    while read -r PART; do

        # construct sub-SVG
        local S="${T}/current.svg"
        cat "${T}/header.xml" > "$S"
        echo "<g id=\"$PART\">" >> "$S"
        cat "${PART}" >> "${S}"
        echo "</g>" >> "$S"
        echo "</svg>" >> "$S"
        local SIN="${S}[dpi=${DPI},unlimited]"

        # Render the sub-SVG into the main image
        echo "     - $PART"
        if [[ ! -s "$IMG" ]]; then
            vips copy "$SIN" "$IMG"
        else
            mv "$IMG" "$IMG_T"
            vips merge "$IMG_T" "$SIN" "$IMG" horizontal 0 0
            rm "$IMG_T"
        fi
        rm "$S"
    done < <(find "$T" -iname "${PREFIX}-part.xml_*" | sort)
}

batch_render() {
    local T="render_tmp"
    if [[ -d "$T" ]]; then
        rm -r "$T"
    fi
    mkdir "$T"
    local PARTS="edges nodes node-labels"
    
    # Extract parts
    
    local IN="${SVG}[dpi=${DPI},unlimited]"
    local LINES=$(normalise_svg | grep '<' | wc -l)
    echo " - Splitting SVG with $LINES lines in parts of max $SVG_MAX_LINES lines"
    echo "   - Extracting header"
    normalise_svg | sed 's/<style\/>/<style><\/style>/' | grep -B 999999999 '</style>' > "${T}/header.xml"
    if [[ ! -s "${T}/header.xml" ]]; then
        >&2 echo "Error: No header extracted from $SVG"
    fi

    for PART in $PARTS; do
        extract_part "$PART"
    done

    local FOOTER='</svg>'

    # Perform rendering

    echo " - Rendering temporary image"
    for PART in $PARTS; do
        render_part "$PART"
    done
    
    # Convert to final image

    local RENDER="render_tmp/render.tif"
    local RENDER_EXT=${RENDER##*.}
    local IMAGE_EXT=${IMAGE##*.}
    if [[ "$RENDER_EXT" == "$IMAGE_EXT" ]]; then
        echo " - Copying render image directly to $IMAGE"
        cp "$RENDER" "$IMAGE"
    else
        echo " - Converting render image to $IMAGE"
        vips copy "$RENDER" "$IMAGE"
    fi

    if [[ "true" == "$CLEAN_UP" ]]; then
        rm -r "${T}"
    else
        echo " - Finished rendering. The folder 'render_tmp' can be safely deleted"
    fi
}

render() {
    local LINES=$(normalise_svg | grep '<' | wc -l)
    if [[ "$LINES" -le "$SVG_MAX_LINES" ]]; then
        echo " - Rendering directly to $IMAGE as input is only $LINES lines"
        local IN="${SVG}[dpi=${DPI},unlimited]"
        vips copy "$IN" "$IMAGE"
    else
        batch_render
    fi
}

###############################################################################
# CODE
###############################################################################

S_START=$(date +%s)
check_parameters "$@"
echo "Starting convertion of $SVG to $IMAGE $(date +"%Y-%m%d %H:%M")"
DPI=$(get_dpi)
render

S_END=$(date +%s)
echo "Finished $(date +"%Y-%m%d %H:%M") ($((S_END-S_START)) seconds), result as $IMAGE"
