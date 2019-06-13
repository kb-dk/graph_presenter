# graph_presenter
Generates searchable DeepZoom presentations of Gephy graphs

## Premise
[Gephy](https://gephi.org/) graphs (connected nodes) are hard to visualise at scale in a browser:
Using a vectorised format, such as SVG, serious hardware is required for zoom & pan when the node
count gets into the 10s or 100s of thousands.

graph_presenter is a simple how-to, a small bash script and a bit of JavaScript, which aims to 
produce a DeepZoom bitmap rendering of a SVG from Gephy, presenting it using OpenSeadragon for
seamless zoom & pan on modest hardware. Using the coordinates from the SVG, nodes can be searched
and visually marked through the GUI.

## Demos

* [C64+Amiga domain graph from the Danish net archive](https://labs.statsbiblioteket.dk/linkgraph/c64/) - 57,432 nodes
* [Domains from 1998-2003 from the Danish net archive](https://labs.statsbiblioteket.dk/linkgraph/1998_to_2003/) - 79,012 nodes

## Status

Under construction: Everything works locally, but is in the process of being massaged to work
generally.
