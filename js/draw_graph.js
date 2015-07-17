"use strict";

3
var NETWORK_LOCAL_DATA_URI = 'data/mesc_directed_epigenetic_network.corrected.json';
var NETWORK_WINDOW_TAG = "#network-view";

var w = window,
    d = document,
    e = d.documentElement,
    g = $(NETWORK_WINDOW_TAG),
    thewidth = w.innerWidth|| e.clientWidth || g.clientWidth,
    theheight = w.innerHeight || e.clientHeight|| g.clientHeight;

var n = 100;
var r = 9;
var trans=[0,0];
var scale=1;
var color = d3.scale.category20();
var nodecolor = d3.scale.category10();
var fill = d3.scale.category10();
var previousd;
var counter=0;
var centerx;
var centery;
// used to store the number of links between two nodes. 
// mLinkNum[data.links[i].source + "," + data.links[i].target] = data.links[i].linkindex;
var mLinkNum = {};
var nodes = {};
var minLinks={};

var test;
var zoom = d3.behavior.zoom()
    .scaleExtent([0.5, 10])
    .on("zoom", redraw);

var vis = d3.select(NETWORK_WINDOW_TAG)
    .append("svg")
    .attr("id", "playgraph")
    .attr("viewBox", "0 0 " + thewidth + " " + theheight)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("pointer-events", "all")
    .call(zoom)
    .append('svg:g')

var rect = vis.append('svg:rect')
    .attr('width', thewidth)
    .attr('height', theheight)
    .attr('fill', 'white').on("click", function(){
        $(".pop-up").fadeOut(50);
        previousd="";
        // d3.selectAll('[highlighted=true]').style("fill", function(d) { return color(d.GO_ref); });
        d3.selectAll('[highlighted=true]').style("fill", function(d) { return d3.rgb(d.nodecolor); });
        d3.selectAll('[highlighted=true]').style("stroke", function(d) { return d3.rgb(d.nodecolor).darker(); });
        d3.selectAll('[highlighted=true]').attr("highlighted",false);
    });

// build the arrow.
var arrow = vis.append("svg:defs").selectAll("marker")
    .data(["end"])      // Different link/path types can be defined here
    .enter().append("svg:marker")    // This section adds in the arrows
    .attr("id", function(d) { return d; })
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 20)
    // .attr("refY", -1.5)
    .attr("markerWidth", 10)
    .attr("markerHeight", 7)
    .attr("orient", "auto")
    .append("svg:path")
    .style("stroke", "#BBB")
    .style("fill", "#BBB")
    .attr("d", "M0,-3L10,0L0,3")


var force = d3.layout.force()
    .charge(-2500)
    .size([thewidth, theheight])

var drag = force.drag()
    .on("dragstart", dragstart);

var link = vis.selectAll(".link"),
    gnodes = vis.selectAll(".node");

var groups;
var group;
var groupFill = function(d, i) { return fill(i & 3); };
var groupPath = function(d) {
    if(d.values.length > 0){
        return "M" + d3.geom.hull(d.values.map(function(i) { return [i.x, i.y]; })).join("L") + "Z"
    }
};

function dragstart(d, i) {
    $(".pop-up").fadeOut(50);
}
  
function updateWindow(){
    thewidth = w.innerWidth || e.clientWidth || g.clientWidth;
    theheight = w.innerHeight || e.clientHeight|| g.clientHeight;
    vis.attr("width", thewidth).attr("height", theheight);
    rect.attr("width", thewidth).attr("height", theheight);
}
	
function redraw() {
    $(".pop-up").fadeOut(50);
    previousd="";
    trans=d3.event.translate;
    scale=d3.event.scale;
    vis.attr("transform","translate(" + [thewidth/2 + trans[0] - centerx, theheight/2 + trans[1] - centery] + ")"+" scale(" + scale + ")");
}

$(window).on("resize", function() {updateWindow()}).trigger("resize");

$(".navbar-form").submit(function(e){
    e.preventDefault();
    focusOnNode($("#srch-term").val());
});

$("#srch-term").keyup(function() {
    var val = $.trim(this.value);
    searchNodes(val);
});

// constructs the suggestion engine
var nodeEngine = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    prefetch: {
        url: 'data/nodes.json',
        filter: function(list) {
            return $.map(list, function(node) { return { value: node }; });
        }
    }
});

// kicks off the loading/processing of `local` and `prefetch`
nodeEngine.initialize();

$.get('data/nodes.json', function(data){
    $("#srch-term").typeahead({ source:data });
},'json');

$('#srch-term').on('change', function (e) {
    var val = $.trim($('#srch-term').val());
    searchNodes(val);
})

$('#skipbutton').on('click',function(e){
    $("#loadingCon").fadeOut();
    $("#netCon").fadeIn();
    $("#sidebar").fadeIn();
    $("#mainpanel").fadeIn();
    $("#slide-panel").fadeIn();
})

$("#about").click(function() {
    $("#loadingCon").fadeIn();
});
  
function searchNodes(nodeNames){
    // deletee previous
    d3.selectAll('[highlighted=true]').style("fill", function(d) { return d3.rgb(d.nodecolor); });
    d3.selectAll('[highlighted=true]').attr("highlighted",false);
    if(nodeNames != ''){
        //mark this
        d3.selectAll('.node[main^='+nodeNames+']').style("fill","yellow");
        d3.selectAll('.node[main^='+nodeNames+']').attr("highlighted",true);
    }
}

function focusOnNode(nodeName){
    if(d3.selectAll('.node[main^='+nodeName+']').data().length == 1){
        $(".pop-up").fadeOut(50);
        d3.selectAll('.node[main^='+nodeName+']').attr("transform",
                                                       function(d) {
                                                           trans=[d.x*scale, d.y*scale];
                                                           zoom.translate([thewidth/2 - trans[0] - (thewidth/2 - centerx),theheight/2 - trans[1] - (theheight/2 - centery)])
                                                           zoom.scale(scale);
                                                       })
        vis.transition()
            .duration(1000)
            .attr("transform","translate(" + [thewidth/2 - trans[0],theheight/2 - trans[1]] + ")"+" scale(" + scale + ")");
        trans=zoom.translate();
        scale=zoom.scale();
    }
}
	
d3.json(NETWORK_LOCAL_DATA_URI, function(error, graph) {
    //Backup network
    test = graph;
    // sort links first
    graph.links=sortLinks(graph.links);
    // set up linkIndex and linkNumer, because it may possible multiple links share the same source and target node
    var indexAndNum =setLinkIndexAndNum(graph.links);
    graph.links=indexAndNum[0];
    mLinkNum = indexAndNum[1];

    // var groups1  = d3.nest().key(function(d) {return(parseInt(d.id) & 3)}).entries(graph.nodes);
    // groups = d3.nest().key(function(d) {return(parseInt(d.chromenet))}).entries(graph.nodes);
    groups = [{key:null,values:[]}]
    // groups = d3.nest().key(function(d) {return(parseInt(d.id) & 3)}).entries(graph.nodes);
    
    group = vis.selectAll(".area")
        .attr("d", groupPath)
        .data(groups)
        .enter().insert("path", "circle")
        .attr("class", "area")
        .style("fill", groupFill)
        .style("stroke", groupFill)
        .style("stroke-width", 40)
        .style("stroke-linejoin", "round")
        .style("opacity", .2)

    
    //Starting with the graph
    link = link.data(graph.links)
        .enter().append("svg:path")
        .attr("class", function(d) {
            var classes = "link";
            if(d.sign == 0){
                classes = classes + " negative ";
            }
            classes = classes + " " + d.clu;
            return(classes)
         })
        .style('stroke-width', 1.5)
        .attr("fill", "none")
        .attr("chromnet", function(d){ d.clu })
        // .attr("marker-end", "url(#end)")
        .attr("marker-end", function(d) {
            if(d.directed){
                return("url(#end)")
            }
        })
        .on("click",lover);
    gnodes = gnodes.data(graph.nodes)
        .enter()
        .append('g')
        .call(drag)
        .on("click",mover)
        .classed('gnode', true);

    var node = gnodes.append("path")
        .attr("class", function(d) {return "node " + d.type;})
        .attr("d", d3.svg.symbol()
              .size(function(d) { return parseInt(d.size);})
              .type(function(d) { return d3.svg.symbolTypes[parseInt(d.shape)]; })
             )
        .attr('main', function(d) {return d.name})
        .style("stroke", function(d) { return d3.rgb(d.strokecolor) })
        .style("fill", function(d,i) { return d3.rgb(d.nodecolor); })
    var labels = gnodes.append("text")
        .attr("dy", ".4em")
        .attr("text-anchor", "middle")
        .style("font-size","12px")
        .attr("cx", function(d) { return d.x=(d.x+(thewidth/2))*0.8 })
        .attr("cy", function(d) { return d.y=(d.y+theheight/10)*0.7 })
        .text(function(d) { return d.name; });


    // link.style("stroke", function(d) { return color(parseInt(d.state)) });
    node.append("title")
        .text(function(d) { return d.name; });

    force
        .links(graph.links)
        .nodes(graph.nodes)
        .on("tick", tick)	
    
    function tick() {
        //Nodes
        gnodes.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
        // Links
        link.attr("d", function(d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = 0,
                arc = 1;
            // get the total link numbers between source and target node
            var lTotalLinkNum = mLinkNum[d.source.index+ "," + d.target.index] || mLinkNum[d.target.index + "," + d.source.index];
            if(lTotalLinkNum > 1){
                dr = Math.sqrt(dx * dx + dy * dy);
                lTotalLinkNum = Math.round((lTotalLinkNum/2)-0.1)
                if(d.linkindex % 2 == 0){
                    arc=0;
                    // if there are multiple links between these two nodes, we need generate different dr for each path
                    dr = dr/(1 + ((1/lTotalLinkNum) * ((d.linkindex)/2 - 1)) - 0.2);
                }else{
                    dr = dr/(1 + ((1/lTotalLinkNum) * ((d.linkindex+1)/2 - 1)) - 0.2);
                }
            }
            // generate svg path
            return "M" + d.source.x + "," + d.source.y +
                "A" + dr + "," + dr + " 0 0 "+arc+ "," + d.target.x + "," + d.target.y +
                "A" + dr + "," + dr + " 0 0 "+(1-arc)+ "," + d.source.x + "," + d.source.y;
        });
        group.attr("d", groupPath);
    }

    function mover(d,i) {
        $(".pop-up").fadeOut(50);
        if(d.name != previousd){
            previousd = d.name;
            $("#pop-up-node").fadeOut(100,function () {
            // Popup content
                $("#node-title").html(d.name);
                if(d.gene_names != "None"){
                    $("#genenames").html($("<div></div>")
                                         .append($("<span></span>").addClass("minititle").text("Gene Names: "))
                                         .append($("<span></span>").html(d.gene_names))
                                        )
                }else{
                    $("#genenames").html('');
		}
                if(d.complex != "None"){
                    $("#complex").html($("<div></div>")
                                       .append($("<span></span>").addClass("minititle").text("Complex: "))
                                       .append($("<span></span>").html(d.complex))
                                      )
		}else{
                    $("#complex").html('');
                }
                if(d.uniprot != "None"){
                    $("#uniprot").html($("<div></div>")
                                       .append($("<span></span>").addClass("minititle").text("Uniprot: "))
                                       .append($("<span></span>").html($("<a></a>").attr('target', '_blank').attr('href', "http://www.uniprot.org/uniprot/"+d.uniprot).text(d.uniprot)))
                                      )
                }else{
                    $("#uniprot").html('');
                }
                if(d.geo.length > 0){
                    $("#geo").html('');
                    $("#geo").append($("<span></span>").addClass("minititle").text("GEO ChipSeq: "))
                    $.each(d.geo, function(i,value){
                        var span = $("<span></span>").html($("<a></a>")
                                                           .attr('target', '_blank')
                                                           .attr('href', "http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc="+value)
                                                           .text(value)
                                                          )
                        $("#geo").append(span)
                        if(i != (d.geo.length - 1)){
                            $("#geo").append($("<span>, </span>"))
                        }
                    })
                        }else{
                            $("#geo").html('');
			}
                if(d.ensemblprotein != "None"){
                    $("#ensembl").html($("<div></div>")
                                       .append($("<span></span>").addClass("minititle").text("Ensembl: "))
                                       .append($("<span></span>").html($("<a></a>").attr('target', '_blank').attr('href', "http://www.ensembl.org/Mus_musculus/Transcript/Summary?db=core;t="+d.ensemblprotein).text(d.ensemblprotein)))
                                      )
                }else{
                    $("#ensembl").html('');
                }
                //Popup position
                var popLeft = ((d.x*scale) + trans[0]);//lE.cL[0] + 20;
                var popTop = ((d.y*scale)+trans[1]);//lE.cL[1] + 70;
                $("#pop-up-node").css({"left":popLeft,"top":popTop});
                $("#pop-up-node").fadeIn(100);
            });
      }else{
        previousd = "";
      }
    }

    function lover(d,i) {
        $(".pop-up").fadeOut(50);
        var thisd = d.source.name + "-" + d.target.name + "-" + d.clu;
        if(thisd != previousd){
            previousd = thisd;
            $("#pop-up-link").fadeOut(100,function () {
                // Popup content
                $("#link-title").html(d.source.name + "-" + d.target.name);
                if(d.sign == 0){
                    $("#type").html("Negative");
                }else{
                    $("#type").html("Positive");
                }
                // Popup position
                // $("#state").html(d.state + " (" +d.stateType+ ")");
                $("#state").html(d.clu);
                if(d.clu == 0){
                    $("#chromnet").html('');
                }else{
                    $("#chromnet").html('');
                    $("#chromnet").html($("<div></div>")
                                         .append($("<span></span>").addClass("minititle").text("ChromNet: "))
                                         .append($("<span></span>").html(d.clu)))

                    // $("#chromnet").append($("<span></span>").addClass("minititle").text("Chromnet: "))
                    //     .append($("<span></span>").html(d.clu))
                }
                // $("#score").html(parseFloat(d.score).toFixed(3));
                // Popup position
                if(typeof d.pubmedid != "undefined" | typeof d.pubmedcentralid != "undefined"){
                    $("#pubmeds").html('');
                    $("#pubmeds").append($("<span></span>").addClass("minititle").text("Literature evidence: "))
                    if (typeof d.pubmedid != "undefined") {
                        $.each(d.pubmedid, function(i,value){
                            var span = $("<span></span>").html($("<a></a>")
                                                               .attr('target', '_blank')
                                                               .attr('href', "http://www.ncbi.nlm.nih.gov/pubmed/"+value)
                                                               .text(value)
                                                              )
                            $("#pubmeds").append(span)
                            if(i != (d.pubmedid.length - 1)){
                                $("#pubmeds").append($("<span>, </span>"))
                            }
                        });
                    }
                    if (typeof d.pubmedcentralid != "undefined") {
                        if (typeof d.pubmedid != "undefined") {
                            $("#pubmeds").append($("<span>, </span>"))
                        }
                        $.each(d.pubmedidpubmedcentralid, function(i,value){
                            var span = $("<span></span>").html($("<a></a>")
                                                               .attr('target', '_blank')
                                                               .attr('href', "http://www.ncbi.nlm.nih.gov/pmc/articles/"+value)
                                                               .text(value)
                                                              )
                            $("#pubmeds").append(span)
                            if(i != (d.pubmedidpubmedcentralid.length - 1)){
                                $("#pubmeds").append($("<span>, </span>"))
                            }
                        });
                    }

                }
                else{
                    $("#pubmeds").html('');
                }
                
                var popLeft = ((d.source.x + d.target.x)/2*scale)+trans[0];//lE.cL[0] + 20;
                var popTop = ((d.source.y + d.target.y)/2*scale)+trans[1];//lE.cL[1] + 70;
                // var popLeft = (((d.source.x + d.target.x)/2)*scale)+thewidth/2-centerx+trans[0];//lE.cL[0] + 20;
                // var popTop = (((d.source.y + d.target.y)/2)*scale)+theheight/2-centery+trans[1]+20;//lE.cL[1] + 70;
                $("#pop-up-link").css({"left":popLeft,"top":popTop});
                $("#pop-up-link").fadeIn(100);
            });
        }else{
            previousd = "";
        }
    }

    $('.progress-bar').attr('aria-valuetransitiongoal', 100).progressbar();

    // //Get all the states and fill panel with states
    var states = [];
    $.each(graph.links, function(i,value){states.push(parseInt(value.clu))});
    var statetypes = [];
    $.each(graph.links, function(i,value){
        if(value.clu != 0){
            statetypes[value.clu]=value.stateType.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, "_")
        }
    });
    var uniquestates=states.filter(function(itm,i,a){
        return i==a.indexOf(itm);
    });
    uniquestates = uniquestates.sort(function(a,b){return a-b})

    var theselect = document.createElement("select");
    var firstOption = document.createElement("option")
    firstOption.innerHTML = "Select";
    firstOption.disabled = true;
    firstOption.selected = true;
    theselect.appendChild(firstOption);
    
    // d3.select("#mainpanel").append("select").on("change", change);
    for (var i = 1; i < uniquestates.length; i++) {
        var anOption = document.createElement('option');
        anOption.value = uniquestates[i];
        anOption.innerHTML = "ChromNet " + (parseInt(uniquestates[i]));
        theselect.appendChild(anOption);
    }

    theselect.onchange = function () {
        d3.selectAll(".link").style("stroke","grey");
        d3.selectAll(".link").attr("highlighted",false);
        groups[0]["values"] = [];
        if(typeof(this.value) != "undefined"){
            for(var i = 0; i < graph.nodes.length; i++) {
                for(var cn = 0; cn < graph.nodes[i].chromenet.length; cn++) {
                    if(this.value == parseInt(graph.nodes[i].chromenet[cn])){
                        groups[0]["values"].push(graph.nodes[i]);                        
                    }
                }
            }

            d3.selectAll("."+this.value).style("stroke","#FF0000");
            d3.selectAll("."+this.value).attr("highlighted",true);

            // $(".link").each(function( d ) {
            //     console.log(d.clu)
            // });
        }
    };


    // function getGroups(value){
    //     if(typeof(value) != "undefined"){
    //         groups =[] ;
    //         // Do whatever you want to do when the select changes
    //         var g = {};
    //         g.key = value;
    //         g.values = [];
    //         for(var i = 0; i < graph.nodes.length; i++) {
    //             for(var cn = 0; cn < graph.nodes[i].chromenet.length; cn++) {
    //                 if(value == parseInt(graph.nodes[i].chromenet[cn])){
    //                     g.values.push(graph.nodes[i]);
    //                 }
    //             }
    //         }
    //         groups.push(g);
    //         // vis.selectAll(".area").remove();            
    //     }
    //     return(groups)
    // }
    
    $("#mainpanel").append(theselect);
        
    // console.log(uniquestates)
    // $.each(uniquestates, function(i,state){
    //     var elementId = "id"+(state+1);
    //     var checkboxContainer = $('<div></div>')
    //         .addClass('checkbox')
    //         .attr("id", elementId)
    //     var labelContainer = $('<label></label>').text("ChromNet " + (state+1))
    //         .prepend($('<input></input>')
    //                  .prop('type', 'checkbox')
    //                  .addClass(statetypes[state])
    //                  .change(
                         // //Preparing new list of links
                         // $(".pop-up").fadeOut(50);
                         // minLinks=[];
                         // var checkedValues = $('input:checkbox:checked').map(function() {
                         //     return this.value;
                         // }).get();
                         // minLinks=test.links.filter(function(d){
                         //     if($.inArray(d.state, checkedValues) != -1){
                         //         return d;
                         //     }
                         // });
                         // minLinks=sortLinksIndex(minLinks);
                         // // set up linkIndex and linkNumer, because it may possible multiple links share the same source and target node
                         // mLinkNum=[];
                         // var indexAndNum =setLinkIndexAndNum(minLinks);
                         // minLinks=indexAndNum[0];
                         // mLinkNum = indexAndNum[1];
                         // force.links(minLinks);
                         // //link representation
                         // link = link.data(minLinks)
                         // link.enter().append("svg:path")
                         //     .attr("fill", "none")
                         //     .on("click",lover);
                         // link.style("stroke", function(d) { return color(parseInt(d.state)) })
                         // link.attr("class", function(d) {return "link " + d.type;})
                         // link.exit().remove();
                         // keepNodesOnTop();
                         // force.start();
                         // }
           //  .prop("checked", false).val(state))
           // .attr("width","50px")
           // .attr("height","10px");
           // checkboxContainer.append(labelContainer);
           // $("#mainpanel").append(checkboxContainer);
           // var hashedid = "#"+elementId;
           // var rectpanel = d3.select(String(hashedid))
           //     .append("svg")
           //     .attr("width", 60)
           //     .attr("height", 8);
           // rectpanel.append("svg:line")
           // .attr("x1", 10)
           // .attr("y1", 1)
           // .attr("x2", 60)
           // .attr("y2", 1)
           // .attr("stroke-width", 5)
           // .style("stroke", color(parseInt(state)))
          // })

        //All labels
        // var elong = $("<h5></h5>").text("Elongation ").insertBefore("#id1")
            // .append($("<span></span>").addClass("text-primary").text("[All]").on('click', function(){$('input.Elongation').prop('checked', true).trigger('change')}))
            // .append($("<span></span>").addClass("text-primary").text("[None]").on('click', function(){$('input.Elongation').prop('checked', false).trigger('change')}))
        // var hetero = $("<h5></h5>").text("Heterochromatin ").insertBefore("#id6")
            // .append($("<span></span>").addClass("text-primary").text("[All]").on('click', function(){$('input.Heterochromatin').prop('checked', true).trigger('change')}))
            // .append($("<span></span>").addClass("text-primary").text("[None]").on('click', function(){$('input.Heterochromatin').prop('checked', false).trigger('change')}))
        // var enhan = $("<h5></h5>").text("Enhancer ").insertBefore("#id11")
            // .append($("<span></span>").addClass("text-primary").text("[All]").on('click', function(){$('input.Enhancer').prop('checked', true).trigger('change')}))
            // .append($("<span></span>").addClass("text-primary").text("[None]").on('click', function(){$('input.Enhancer').prop('checked', false).trigger('change')}))
        // var active = $("<h5></h5>").text("Activation ").insertBefore("#id15")
            // .append($("<span></span>").addClass("text-primary").text("[All]").on('click', function(){$('input.Activation').prop('checked', true).trigger('change')}))
            // .append($("<span></span>").addClass("text-primary").text("[None]").on('click', function(){$('input.Activation').prop('checked', false).trigger('change')}))
        // var repress = $("<h5></h5>").text("Repression ").insertBefore("#id18")
            // .append($("<span></span>").addClass("text-primary").text("[All]").on('click', function(){$('input.Repression').prop('checked', true).trigger('change')}))
            // .append($("<span></span>").addClass("text-primary").text("[None]").on('click', function(){$('input.Repression').prop('checked', false).trigger('change')}))
        // var ctcf = $("<h5></h5>").text("CTCF/insulator ").insertBefore("#id20")
            // .append($("<span></span>").addClass("text-primary").text("[All]").on('click', function(){$('input.CTCF_Insulator').prop('checked', true).trigger('change')}))
            // .append($("<span></span>").addClass("text-primary").text("[None]").on('click', function(){$('input.CTCF_Insulator').prop('checked', false).trigger('change')}))

    // Use a timeout to allow the rest of the page to load first.
    setTimeout(function() {
        centerx = thewidth/2;
        centery = theheight/2;
        gnodes.attr("transform", function(d) {
            d.x = (d.x * thewidth);
            d.y = (d.y * theheight);
        })
        $("#loadingDiv").fadeTo( 1000, 0 );
        $("#skipbutton").prop('disabled', false);
    }, 50);

    force.start()
    
        // sort the links by source, then target
        function sortLinks(links){
            links.sort(function(a,b) {
                if (a.source > b.source){
                    return 1;
                }else if (a.source < b.source){
                    return -1;
                }else{
                    if (a.target > b.target){
                        return 1;
                    }if (a.target < b.target){
                        return -1;
                    }else{
                        return 0;
                    }
                }
            });
            return(links)
        }

        // sort the links by source, then target
        function sortLinksIndex(links){
            links.sort(function(a,b) {
                if (a.source.index > b.source.index){
                    return 1;
                } else if (a.source.index < b.source.index) {
                    return -1;
                }else{
                    if (a.target.index > b.target.index) {
                        return 1;
                    }if (a.target.index < b.target.index) {
                        return -1;
                    }
                    else {
                        return 0;
                    }
                }
            });
            return(links)
        }
        //any links with duplicate source and target get an incremented 'linknum'
        function setLinkIndexAndNum(links){
            for (var i = 0; i < links.length; i++){
                var source = links[i].source,
                    target = links[i].target;
                if(parseInt(source) !== source){
                    source = links[i].source.index;
                    target = links[i].target.index;
                }
                if (i != 0 && links[i].source == links[i-1].source && links[i].target == links[i-1].target) {
                    links[i].linkindex = links[i-1].linkindex + 1;
                }
                else {
                    links[i].linkindex = 1;
                }// save the total number of links between two nodes
                if(mLinkNum[target + "," + source] !== undefined){
                    mLinkNum[target + "," + source] = links[i].linkindex;
                }else{
                    mLinkNum[source + "," + target] = links[i].linkindex;
                }
            }
            return [links,mLinkNum];
        }
});

function keepNodesOnTop() {
    $(".node").each(function( index ) {
        var gnode = this.parentNode;
        gnode.parentNode.appendChild(gnode);
    });
}

$('#opener').on('click', function() {
    var panel = $('#slide-panel');
    if (panel.hasClass("visible")) {
        panel.removeClass('visible').animate({'margin-left':'-300px'});
    } else {
        panel.addClass('visible').animate({'margin-left':'0px'});
    }
    return false;
});
