# graph_presenter
Generates searchable DeepZoom presentations of Gephi graphs

Primarily maintained by Toke Eskildsen, [toes@kb.dk](mailto:toes@kb.dk), Royal Danish Library


## Requirements

* bash, wget, GraphicsMagic, vips
* SVG exported from Gephi


## Premise
[Gephi](https://gephi.org/) graphs (connected nodes) are hard to visualise at scale in a browser:
Using a vectorised format, such as SVG, serious hardware is required for zoom & pan when the node
count gets into the 10s or 100s of thousands.

graph_presenter is a simple how-to, a small bash script and a bit of JavaScript, which aims to 
produce a DeepZoom bitmap rendering of a SVG from Gephi, presenting it using OpenSeadragon for
seamless zoom & pan on modest hardware. Using the coordinates from the SVG, nodes can be searched
and visually marked through the GUI.


## Demos
* [C64+Amiga domain graph from the Danish net archive](https://labs.statsbiblioteket.dk/linkgraph/c64/) - 57,432 nodes
* ["All" domains from 1998-2003 from the Danish net archive](https://labs.statsbiblioteket.dk/linkgraph/1998_to_2003/) - 79,012 nodes


## How-to
* Generate a graph using Gephy and export is as a SVG.
* Call `./generate_presentation.sh mygraph.svg mypresentation`
* Upload the generated folder `mypresentation` to a webserver or open `mypresentation/index.html` locally

The size of the rendered DeepZoom image can be controlled using `RENDER_SIZE`. The default is 20K pixels, suitable for testing and smaller (5K nodes) graphs. For a large graph with e.g. 100K nodes, something like 50K pixels is better:
```
RENDER_SIZE=50000 ./generate_presentation.sh mygraph.svg mypresentation
```

## De-mystifying
The `./generate_presentation.sh` script is at its core extremely simple:

1. Use GraphicsMagic to convert the SVG to PNG: `gm convert -size 20000x20000 mygraph.svg mygraph.png`
2. Create DeepZoom tiles from the `png`: `vips dzsave mygraph.png mygraph --suffix .png`
3. Extract node-names & coordinates: `tr '\n' ' ' < mygraph.svg | grep -o "<circle [^/]*/>" | sed 's/<circle.* r="\([^"]*\)".* cx="\([^"]*\)".* class="id_\([^"]*\)".* cy="\([^"]*\)".*\/>/\3 \2 \4 \1/' | LC_ALL=C sort`

The JavaScript `domain_control.js` supports search by looking sequentially through all the node-names generated in step #3 and getting their coordinates. For each of these coordinates, an overlay is added to the OpenSeadragon display.


# Notes & to-do
* Rendering in 50K is doable on a 16GB machine, but might take hours. More RAM helps a lot. GraphicsMagic is the bottleneck here. A better scaling SVG→PNG converter would be a welcome addition.
* GraphicsMagic has a problem with kerning for some renders. It should be investigated whether changing fonts could help here.
