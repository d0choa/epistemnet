    "use strict";

    var NETWORK_LOCAL_DATA_URI = 'data/net2.json';
    var NETWORK_WINDOW_TAG = "#network-view";

	var w = window,
		d = document,
		e = d.documentElement,
		g = $(NETWORK_WINDOW_TAG),
		thewidth = w.innerWidth|| e.clientWidth || g.clientWidth,
		theheight = w.innerHeight || e.clientHeight|| g.clientHeight;

	var n = 6;
	var r = 5;
    var trans=[0,0];
    var scale=1;
	var color = d3.scale.category20();	
	var previousd;
	var counter=0;
	var centerx;
	var centery;
	var zoom = d3.behavior.zoom();
	
	var vis = d3.select(NETWORK_WINDOW_TAG)
		.append("svg")
		.attr("id", "playgraph")
		// .attr({
		// 	"width": thewidth,
		// 	"height": theheight
		// })
		.attr("viewBox", "0 0 " + thewidth + " " + theheight)
		.attr("preserveAspectRatio", "xMidYMid meet")
		.attr("pointer-events", "all")
		.call(zoom.on("zoom", redraw))
		.append('svg:g')
		// .append('svg:g')
		 
	
	var rect = vis.append('svg:rect')
		.attr('width', thewidth)
		.attr('height', theheight)
		.attr('fill', 'white')
		.on("click", function(){
			$(".pop-up").fadeOut(50);
			previousd="";
			d3.selectAll('[highlighted=true]').style("fill", function(d) { return color(d.GO_ref); });
			d3.selectAll('[highlighted=true]').attr("highlighted",false);
		});	
	
	function redraw(){
		$(".pop-up").fadeOut(50);
		previousd="";
		trans=d3.event.translate;
		scale=d3.event.scale;		
		vis.attr("transform","translate(" + [thewidth/2 + trans[0] - centerx, theheight/2 + trans[1] - centery] + ")"+" scale(" + scale + ")");
	}
	
	function updateWindow(){
		thewidth = w.innerWidth || e.clientWidth || g.clientWidth;
		theheight = w.innerHeight || e.clientHeight|| g.clientHeight;
		vis.attr("width", thewidth).attr("height", theheight);
		rect.attr("width", thewidth).attr("height", theheight);
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
		d3.selectAll('[highlighted=true]').style("fill", function(d) { return color(d.GO_ref); });
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
		
		var force = d3.layout.force()
	        // .charge(-120)
	        // .linkDistance(30)
			.links(graph.links)
			.nodes(graph.nodes)
		    .size([thewidth, theheight])
			
		var link = vis.selectAll(".link")
	        .data(graph.links)
	        .enter().append("svg:line")
	      	.style("stroke-width", function(d) { return d.accumulated+1; })
	        .attr("class", "link")
			.on("click",lover);
		var node_drag = d3.behavior.drag()
		    .on("dragstart", dragstart)
		    .on("drag", dragmove)
		    .on("dragend", dragend);
			
		function dragstart(d, i) {
		    force.stop() // stops the force auto positioning before you start dragging
	        $(".pop-up").fadeOut(50);
		}
	
		function dragmove(d, i) {
	        d.px += d3.event.dx;
	        d.py += d3.event.dy;
	        d.x += d3.event.dx;
	        d.y += d3.event.dy; 
		    tick(); // this is the key to make it work together with updating both px,py,x,y on d !
		}
	
		function dragend(d, i) {
		    // d.fixed = true; // of course set the node to fixed so the force doesn't include the node in its auto positioning stuff
		    tick();
		}
		
		var gnodes = vis.selectAll('.node')
			.data(graph.nodes)
			.enter()
			.append('g')
			.call(node_drag)
			.on("click",mover)
			.classed('gnode', true);
		var node = gnodes.append("circle")
			.attr("class", "node")
			.attr("r", r - .5)
			// .on ("mouseout",mout)
			.attr('main', function(d) {return d.main})
	        .style("stroke", function(d) { return d3.rgb(color(d.GO_ref)).darker(); })
	        .style("stroke-width", 0.5)
			.style("fill", function(d) { return color(d.GO_ref); });
		var labels = gnodes.append("text")
	    	.attr("dy", ".3em")
	    	.attr("text-anchor", "middle")
			.style("font-size","2.5px")
			.text(function(d) { return d.main; });
		
	  	  node.append("title")
	  	      .text(function(d) { return d.main; });
		
		// force.on("tick", tick);
		// force.start();
		
		function tick() {
		  link.attr("x1", function(d) { return d.source.x; })
		      .attr("y1", function(d) { return d.source.y; })
		      .attr("x2", function(d) { return d.target.x; })
		      .attr("y2", function(d) { return d.target.y; });
			
			
			gnodes.attr("transform", function(d) {
				return "translate(" + d.x + "," + d.y + ")";
			});			  
		}
							    
		function mover(d,i) {
	        $(".pop-up").fadeOut(50);
			if(d.name != previousd){
				previousd = d.name;
		        $("#pop-up-node").fadeOut(100,function () {
		            // Popup content
		            $("#node-title").html(d.main + " (" + d.name + ")");
		            $("#nodename").html(d.Protein_names);
		            $("#uniprot").html(d.Entry);
		            $("#gofun").html(d.GO_ref);
		            $("#gofundesc").html(d.GOref_description);
					var enrichpval;
					if(d.reference_pval == "NA"){
						enrichpval="NA"
					}else{
						enrichpval=parseFloat(d.reference_pval.toPrecision(5));
					}
					$("#gofunpval").html(enrichpval) ;
					
		            // $("#pop-desc").html("M+T: text text test");
	
					// vis.attr("transform","translate(" + [thewidth/2 - centerx + trans[0], theheight/2 - centery + trans[1]] + ")"+" scale(" + scale + ")");
	
		            // Popup position
		            var popLeft = (d.x*scale) + thewidth/2 - centerx + trans[0];//lE.cL[0] + 20;
		            var popTop = (d.y*scale) + theheight/2 - centery + trans[1];//lE.cL[1] + 70;
		            $("#pop-up-node").css({"left":popLeft,"top":popTop});
		            $("#pop-up-node").fadeIn(100);
		        });
			}else{
				previousd = "";
			}
	    }
		
		
	    function lover(d,i) {
	        $(".pop-up").fadeOut(50);
			if(d.name != previousd){
				previousd = d.name;
		        $("#pop-up-link").fadeOut(100,function () {
		            // Popup content
		            $("#link-title").html("Interaction: " + d.name);
					$("#orthologs").html(d.n);
					$("#mt").html(Math.round(d.r).toFixed(5));			
					var pval;
					if(d.p_value == 0){
						pval="< 1E-3";
					}else{
						pval=d.p_value;
					}
					$("#pMT").html(pval);
					$("#context").html(d.context_lvl10);
					var binary,complex,kpath,ecopath,reg;
					if(d.binary_physical == "NA"){
						binary="&#10008";
					}else{
						binary="&#10004";
					}
					if(d.ecocyc_complexes == "NA"){
						complex="&#10008";
					}else{
						complex="&#10004";
					}
					if(d.kegg_pathways == "NA"){
						kpath="&#10008";
					}else{
						kpath="&#10004";
					}
					if(d.ecocyc_pathways == "NA"){
						ecopath="&#10008";
					}else{
						ecopath="&#10004";
					}
					if(d.ecocyc_regulation == "NA"){
						reg="&#10008";
					}else{
						reg="&#10004";
					}
					$("#binary_physical").html(binary);
					$("#ecocyc_complexes").html(complex);
					$("#kegg_pathways").html(kpath);
					$("#ecocyc_pathways").html(ecopath);
					$("#ecocyc_regulation").html(reg);
					
		            // Popup position					
		            var popLeft = (((d.source.x + d.target.x)/2)*scale)+thewidth/2-centerx+trans[0];//lE.cL[0] + 20;
		            var popTop = (((d.source.y + d.target.y)/2)*scale)+theheight/2-centery+trans[1]+20;//lE.cL[1] + 70;
		            $("#pop-up-link").css({"left":popLeft,"top":popTop});
		            $("#pop-up-link").fadeIn(100);
		        });
			}else{
				previousd = "";
			}
	    }
		
		$('.progress-bar').attr('aria-valuetransitiongoal', 100).progressbar();	  
		
		// Use a timeout to allow the rest of the page to load first.
		setTimeout(function() {
 
		  // Run the layout a fixed number of times.
		  // The ideal number of times scales with graph complexity.
		  // Of course, don't run too long—you'll hang the page!
		  
		  vis.selectAll("line")
		      .attr("x1", function(d) { return d.source.x; })
		      .attr("y1", function(d) { return d.source.y; })
		      .attr("x2", function(d) { return d.target.x; })
		      .attr("y2", function(d) { return d.target.y; });
    		
			var allxs=0;
			var counter=0;
			var allys=0;
			gnodes.attr("transform", function(d) { 
				allxs = allxs + d.x;
				allys = allys + d.y;
				counter++;
    		});
 			centerx = allxs/counter;
			centery = allys/counter;
			
			var minx=0;
			var maxx=0;
			var miny=0;
			var maxy=0;
			gnodes.attr("transform", function(d) { 
				if(minx > d.x){
					minx = d.x
				}
				if(maxx < d.x){
					maxx = d.x
				}
				if(miny > d.y){
					miny = d.y
				}
				if(maxy < d.y){
					maxy = d.y
				}
    		});
			rect.attr('width', (Math.abs(minx) + Math.abs(maxx)))
			rect.attr('height', (Math.abs(miny) + Math.abs(maxy)))
			rect.attr("transform","translate(" + [minx, miny] + ")"+" scale(" + scale + ")");
			
			force.start();
			tick();
			force.stop() // stops the force auto positioning before you start dragging
		  	
			vis.attr("transform","translate("+[thewidth/2 - centerx, theheight/2 - centery]+")");
			$("#loadingCon").fadeOut();
			
		  // svg.selectAll("circle")
		  //     .data(nodes)
		  //   .enter().append("circle")
		  //     .attr("cx", function(d) { return d.x; })
		  //     .attr("cy", function(d) { return d.y; })
		  //     .attr("r", 4.5); 
		}, 10);
	});
