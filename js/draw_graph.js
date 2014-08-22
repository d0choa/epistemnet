    "use strict";

    var NETWORK_LOCAL_DATA_URI = 'data/net.json';
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
	var color = d3.scale.category20c();
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
        .on("zoom", zoomed);
		
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
		.attr('fill', 'white')
		.on("click", function(){
			$(".pop-up").fadeOut(50);
			previousd="";
			// d3.selectAll('[highlighted=true]').style("fill", function(d) { return color(d.GO_ref); });
			d3.selectAll('[highlighted=true]').style("fill", function(d) { return color(2); });
			d3.selectAll('[highlighted=true]').style("stroke", function(d) { return color(); });
			d3.selectAll('[highlighted=true]').attr("highlighted",false);
		});	
	
	var force = d3.layout.force()
      // .linkDistance(200)
      .charge(-2500)
	    // .linkDistance(10)
	    // .linkStrength(2)
	    .size([thewidth, theheight])
	
	var drag = force.drag()
	    .on("dragstart", dragstart);
	
	var link = vis.selectAll(".link"),
	    gnodes = vis.selectAll(".node");
	
	// function redraw(){
	// 	$(".pop-up").fadeOut(50);
	// 	previousd="";
	// 	trans=d3.event.translate;
	// 	scale=d3.event.scale;
	// 	vis.attr("transform","translate(" + [thewidth/2 + trans[0] - centerx, theheight/2 + trans[1] - centery] + ")"+" scale(" + scale + ")");
	// }
	
	function dragstart(d, i) {
	    d3.select(this).classed("fixed", d.fixed = true);
        $(".pop-up").fadeOut(50);
	}
	
	function updateWindow(){
		thewidth = w.innerWidth || e.clientWidth || g.clientWidth;
		theheight = w.innerHeight || e.clientHeight|| g.clientHeight;
		vis.attr("width", thewidth).attr("height", theheight);
		rect.attr("width", thewidth).attr("height", theheight);
	}
	
    function zoomed() {
      vis.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
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
	
	$('#srch-term').on('change', function (e) {
		var val = $.trim($('#srch-term').val());
		searchNodes(val);
	})
	
	$('#srch-term').typeahead({
		prefetch: 'data/nodes.json',
	    template: [
			'<div>',
			'<p class="repo-language">{{tokens}}</p>',
			'<p class="repo-name">{{value}}</p>',                                                                    
			'</div>',
			'<p class="repo-description">{{description}}</p>'                         
	    ].join(''),
		engine: Hogan
	});
	
	function searchNodes(nodeNames){
		// deletee previous
		// d3.selectAll('[highlighted=true]').style("fill", function(d) { return color(d.GO_ref); });
		d3.selectAll('[highlighted=true]').style("fill", function(d) { return color(2); });
		d3.selectAll('[highlighted=true]').style("stroke", function(d) { return color(); });
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
					// trans=[Math.abs(d.x)*scale,Math.abs(d.y)*scale];
					trans=[d.x*scale,d.y*scale];
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
		test = graph;
    // sort links first
    graph.links=sortLinks(graph.links);								
    
    // set up linkIndex and linkNumer, because it may possible multiple links share the same source and target node
    var indexAndNum =setLinkIndexAndNum(graph.links);
  		graph.links=indexAndNum[0];
  		mLinkNum = indexAndNum[1];		
		        
		//Starting with the graph			
		link = link.data(graph.links)
        .enter().append("svg:path")
        .attr("class", function(d) {return "link " + d.type;})
        .attr("fill", "none");
          
		gnodes = gnodes.data(graph.nodes)
			.enter()
			.append('g')
			// .call(node_drag)
			.call(drag)
			.on("click",mover)
			.classed('gnode', true);
		var node = gnodes.append("path")
			.attr("class", "node")
      .attr("d", d3.svg.symbol()
          .size("400")
          .type(function(d) { return d3.svg.symbolTypes[parseInt(d.shape)]; }))
      // .attr("r", r - .5)
			// .on ("mouseout",mout)
			.attr('main', function(d) {return d.Entry})
			        // .style("stroke", function(d) { return d3.rgb(color(d.GO_ref)).darker(); })
			        .style("stroke", function(d) { return color(); })
			        .style("stroke-width", 0.5)
			// .style("fill", function(d) { return color(d.GO_ref); });
			.style("fill", function(d) { return color(parseInt(d.shape)); });
		var labels = gnodes.append("text")
			    	.attr("dy", ".4em")
			    	.attr("text-anchor", "middle")
			.style("font-size","9px")
			.text(function(d) { return d.Entry; });
    
    // link.style("stroke", function(e) { return color(e.state)})
    //     .on("click",function(e){console.log(e.state)});
    
    link.on("click",function(e){lover(e)})
      .style("stroke", function(d) { return color(parseInt(d.state)) });
    
    node.append("title")
	      .text(function(d) { return d.Entry; });

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
    }
		
		// jQuery.grep(test.links, function(obj) {
		// 	if(obj.state == "5"){return(obj.linkindex)};
		// });

		//
		// link = link.data(graph.links)
		// 	        .enter().append("svg:line")
		// 	      	// .style("stroke-width", function(d) { return d.accumulated+1; })
		// 	        .attr("class", "link")
		// 	.on("click",lover);
		//
		// gnodes = gnodes.data(graph.nodes)
		// 	.enter()
		// 	.append('g')
		// 	// .call(node_drag)
		// 	.call(drag)
		// 	.on("click",mover)
		// 	.classed('gnode', true);
		// var node = gnodes.append("circle")
		// 	.attr("class", "node")
		// 	.attr("r", r - .5)
		// 	// .on ("mouseout",mout)
		// 	.attr('main', function(d) {return d.Entry})
		// 	        // .style("stroke", function(d) { return d3.rgb(color(d.GO_ref)).darker(); })
		// 	        .style("stroke", function(d) { return color(); })
		// 	        .style("stroke-width", 0.5)
		// 	// .style("fill", function(d) { return color(d.GO_ref); });
		// 	.style("fill", function(d) { return color(2); });
		// var labels = gnodes.append("text")
		// 	    	.attr("dy", ".4em")
		// 	    	.attr("text-anchor", "middle")
		// 	.style("font-size","7px")
		// 	.text(function(d) { return d.Entry; });
		//
		// 	  	  node.append("title")
		// 	  	      .text(function(d) { return d.Entry; });
		//
		//
		//   		force
		//   			.links(graph.links)
		//   			.nodes(graph.nodes)
		//   			.start()
		//   			.on("tick", tick)
		//
		// function tick() {
		//   link.attr("x1", function(d) { return d.source.x; })
		//       .attr("y1", function(d) { return d.source.y; })
		//       .attr("x2", function(d) { return d.target.x; })
		//       .attr("y2", function(d) { return d.target.y; });
		//
		//
		// 	gnodes.attr("transform", function(d) {
		// 		return "translate(" + d.x + "," + d.y + ")";
		// 	});
		// }
		
							    
		function mover(d,i) {
	        $(".pop-up").fadeOut(50);
      // if(d.name != previousd){
      //   previousd = d.name;
      //             $("#pop-up-node").fadeOut(100,function () {
      //                 // Popup content
      //                 // $("#node-title").html(d.main + " (" + d.name + ")");
      //                 // $("#nodename").html(d.Protein_names);
      //                 $("#uniprot").html(d.Entry);
      //                 // $("#gofun").html(d.GO_ref);
      //                 // $("#gofundesc").html(d.GOref_description);
      //     // var enrichpval;
      //     // if(d.reference_pval == "NA"){
      //     //   enrichpval="NA"
      //     // }else{
      //     //   enrichpval=parseFloat(d.reference_pval.toPrecision(5));
      //     // }
      //     // $("#gofunpval").html(enrichpval) ;
      //     //
      //                 // Popup position
      //                 // var popLeft = (d.x*scale) + thewidth/2 - centerx + trans[0];//lE.cL[0] + 20;
      //                 // var popTop = (d.y*scale) + theheight/2 - centery + trans[1];//lE.cL[1] + 70;
      //                 // $("#pop-up-node").css({"left":popLeft,"top":popTop});
      //                 // $("#pop-up-node").fadeIn(100);
      //             });
      // }else{
      //   previousd = "";
      // }
	    }
		
		
	    function lover(d,i) {
        $(".pop-up").fadeOut(50);
        console.log(d.state);
        var thisd = d.source.index + "-" + d.target.index;
    		if(thisd != previousd){
    			previousd = thisd;
	        $("#pop-up-link").fadeOut(100,function () {
              // Popup content
              $("#link-title").html("Interaction: " + d.state);
    				// $("#orthologs").html(d.n);
    				// $("#mt").html(Math.round(d.r).toFixed(5));
    				// var pval;
    				// if(d.p_value == 0){
    				// 	pval="< 1E-3";
    				// }else{
    				// 	pval=d.p_value;
    				// }
    				// $("#pMT").html(pval);
    				// $("#context").html(d.context_lvl10);
    				// var binary,complex,kpath,ecopath,reg;
    				// if(d.binary_physical == "NA"){
    				// 	binary="&#10008";
    				// }else{
    				// 	binary="&#10004";
    				// }
    				// if(d.ecocyc_complexes == "NA"){
    				// 	complex="&#10008";
    				// }else{
    				// 	complex="&#10004";
    				// }
    				// if(d.kegg_pathways == "NA"){
    				// 	kpath="&#10008";
    				// }else{
    				// 	kpath="&#10004";
    				// }
    				// if(d.ecocyc_pathways == "NA"){
    				// 	ecopath="&#10008";
    				// }else{
    				// 	ecopath="&#10004";
    				// }
    				// if(d.ecocyc_regulation == "NA"){
    				// 	reg="&#10008";
    				// }else{
    				// 	reg="&#10004";
    				// }
    				// $("#binary_physical").html(binary);
    				// $("#ecocyc_complexes").html(complex);
    				// $("#kegg_pathways").html(kpath);
    				// $("#ecocyc_pathways").html(ecopath);
    				// $("#ecocyc_regulation").html(reg);
    				//
            // Popup position
            var popLeft = (d.source.x*scale)+trans[0]+20;//lE.cL[0] + 20;
            var popTop = (d.source.y*scale)+trans[1]+20;//lE.cL[1] + 70;
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
		
		//Get all the states and fill panel with states
		var states = [];
		$.each(graph.links, function(i,value){states.push(parseInt(value.state))})
		var uniquestates=states.filter(function(itm,i,a){
		    return i==a.indexOf(itm);
		});
		uniquestates = uniquestates.sort(function(a,b){return a-b})
		$.each(uniquestates, function(i,state){
			var elementId = "id"+state;
			var checkboxContainer = $('<div></div>')
				.addClass('checkbox')
				.attr("id", elementId)
			var labelContainer = $('<label></label>').text("State " + state)
		        .append($('<input></input>')
					.prop('type', 'checkbox')
					.change(function() {
            //
            //Preparing new list of links
						//
            minLinks=[];
            var checkedValues = $('input:checkbox:checked').map(function() {
						    return this.value;
						}).get();
						minLinks=test.links.filter(function(d){
							if($.inArray(d.state, checkedValues) != -1){
								return d
							}
						});
						minLinks=sortLinksIndex(minLinks);
						 
					  // set up linkIndex and linkNumer, because it may possible multiple links share the same source and target node
						mLinkNum=[];
				    var indexAndNum =setLinkIndexAndNum(minLinks);
  						minLinks=indexAndNum[0];
  						mLinkNum = indexAndNum[1];
						force.links(minLinks);
						
            //link representation
        		link = link.data(minLinks)
            link.enter().append("svg:path")
              .attr("class", function(d) {return "link " + d.type;})
              .attr("fill", "none")
              .on("click",function(e){lover(e)})
            link.style("stroke", function(d) { return color(parseInt(d.state)) })
            link.exit().remove();
            keepNodesOnTop();            
						force.start();														
					})
					.prop("checked", true).val(state))
  				.attr("width","50px")
  				.attr("height","10px");
	        checkboxContainer.append(labelContainer);
			$("#mainpanel").append(checkboxContainer);
			var hashedid = "#"+elementId;
			var rect = d3.select(String(hashedid))
				  .append("svg")
				  .attr("width", 60)
				  .attr("height", 10);
				  rect.append("svg:line")
				.attr("x1", 10)
				.attr("y1", 0)
				.attr("x2", 60)
				.attr("y2", 0)
				.attr("stroke-width", 5)				
				.style("stroke", color(parseInt(state)))				
		})		
							
		// Use a timeout to allow the rest of the page to load first.
		setTimeout(function() {
 
		  // Run the layout a fixed number of times.
		  // The ideal number of times scales with graph complexity.
		  // Of course, don't run too long—you'll hang the page!
		  
			// 		  vis.selectAll("line")
			// 		      .attr("x1", function(d) { return d.source.x; })
			// 		      .attr("y1", function(d) { return d.source.y; })
			// 		      .attr("x2", function(d) { return d.target.x; })
			// 		      .attr("y2", function(d) { return d.target.y; });
			//
			// var allxs=0;
			// var counter=0;
			// var allys=0;
			// gnodes.attr("transform", function(d) {
			// 	allxs = allxs + d.x;
			// 	allys = allys + d.y;
			// 	counter++;
			//     		});
			//  			centerx = allxs/counter;
			// centery = allys/counter;
			//
			// var minx=0;
			// var maxx=0;
			// var miny=0;
			// var maxy=0;
			// gnodes.attr("transform", function(d) {
			// 	if(minx > d.x){
			// 		minx = d.x
			// 	}
			// 	if(maxx < d.x){
			// 		maxx = d.x
			// 	}
			// 	if(miny > d.y){
			// 		miny = d.y
			// 	}
			// 	if(maxy < d.y){
			// 		maxy = d.y
			// 	}
			//     		});
			// rect.attr('width', (Math.abs(minx) + Math.abs(maxx)))
			// rect.attr('height', (Math.abs(miny) + Math.abs(maxy)))
			// rect.attr("transform","translate(" + [minx, miny] + ")"+" scale(" + scale + ")");

			// force.start();
			// tick();
		    force.start();
		    for (var i = n * n; i > 0; --i) force.tick();
			force.stop() // stops the force auto positioning before you start dragging

			// vis.attr("transform","translate("+[thewidth/2 - centerx, theheight/2 - centery]+")");
			$("#loadingCon").fadeOut();
			$("#mainpanel").fadeIn();
			
			
		}, 50);
		
	    // sort the links by source, then target
	    function sortLinks(links){							
	        links.sort(function(a,b) {
	            if (a.source > b.source) 
	            {
	                return 1;
	            }
	            else if (a.source < b.source) 
	            {
	                return -1;
	            }
	            else 
	            {
	                if (a.target > b.target) 
	                {
	                    return 1;
	                }
	                if (a.target < b.target) 
	                {
	                    return -1;
	                }
	                else 
	                {
	                    return 0;
	                }
	            }
	        });
			return(links)
	    }
	    // sort the links by source, then target
	    function sortLinksIndex(links){							
	        links.sort(function(a,b) {
	            if (a.source.index > b.source.index) 
	            {
	                return 1;
	            }
	            else if (a.source.index < b.source.index) 
	            {
	                return -1;
	            }
	            else 
	            {
	                if (a.target.index > b.target.index) 
	                {
	                    return 1;
	                }
	                if (a.target.index < b.target.index) 
	                {
	                    return -1;
	                }
	                else 
	                {
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
	            if (i != 0 &&
	                links[i].source == links[i-1].source &&
	                links[i].target == links[i-1].target) 
	            {
	                links[i].linkindex = links[i-1].linkindex + 1;
	            }
	            else 
	            {
	                links[i].linkindex = 1;
	            }
	            // save the total number of links between two nodes
	            if(mLinkNum[target + "," + source] !== undefined)
	            {
	                mLinkNum[target + "," + source] = links[i].linkindex;
	            }
	            else
	            {
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
	
	// $(document).ready(function() {
	// });
