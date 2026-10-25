/**
 * EventON Generate Google Maps Function
 * @version  4.6.1
 */

//return;

(function($){

// map loader function 
	$.fn.evoGenmaps = function(opt){

		var defaults = {
			delay:	0,
			fnt:	5,
			cal:	'',
			SC: 	'',
			map_canvas_id:	'',
			location_type:'',
			address:'',
			styles:'',
			zoomlevel:'',
			mapformat:'',
			scroll:false,
			iconURL:'',
			trigger_point: '',
		};
		var options = $.extend({}, defaults, opt); 

		//console.log(options);

		var geocoder;

		var code = {};
		obj = this;
		code.obj = this;

		mapBox = $('#'+options.map_canvas_id);

		code = {	
			init:function(){

				//return;

				//console.log( $('#'+options.map_canvas_id).hasClass('mDrawn') ? 'y':'d');
				//console.log( mapBox.is(':visible') ? 'y':'d');

				// draw map or not
				if( !(mapBox.is(':visible')) ) return; // if map box is not visible
				if( mapBox.find('.gm-style').length > 0  ) return;

				mapBox.html( evo_general_params.html.preload_gmap);

				//if( mapBox.hasClass('mDrawn') ) return;	

				// set calendar for event
				if( obj.closest('.ajde_evcal_calendar').length>0){
					options.cal = obj.closest('.ajde_evcal_calendar');
				}

				code.process_SC();

				// various methods to draw map
				// load map on specified elements directly
				if(options.fnt==5){
					if(options.delay==0){	code.draw_map();	}else{
						setTimeout(code.draw_map, options.delay, this);
					}						
				}

				// deprecating rest 4.6
					// multiple maps at same time
					if(options.fnt==1){
						code.load_gmap();
					}
					
					if(options.fnt==2){
						if(options.delay==0){	code.load_gmap();	}else{
							setTimeout(code.load_gmap, options.delay, this);
						}			
					} 
					if(options.fnt==3){	code.load_gmap();	}
					
					// gmaps on popup
					if(options.fnt==4){
						// check if gmaps should run
						if( this.attr('data-gmtrig')=='1' && this.attr('data-gmap_status')!='null'){	
							code.load_gmap();			
						}	
					}				
			},
			// add unique id for map area
			process_unique_map_id: function(){
				var map_element = obj.closest('.eventon_list_event').find('.evo_metarow_gmap');

				if(map_element === undefined ) return false;

				var old_map_canvas_id = map_element.attr('id');	
				if(old_map_canvas_id === undefined) return false;

				// GEN
				maximum = 99;
				minimum = 10;
				var randomnumber = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;

				map_canvas_id = old_map_canvas_id+'_'+randomnumber;
				map_element.attr('id', map_canvas_id).addClass('test');
				
				options.map_canvas_id = map_canvas_id;

				return map_canvas_id;
			},
			process_SC: function(){
				CAL = options.cal;
				if( options.SC !== '') return;
				if(CAL == '') return false;
				options.SC = CAL.evo_shortcode_data();
			},

			// load google map
			load_gmap: function(){
				SC = options.SC;

				var ev_location = obj.find('.event_location_attrs');

				var location_type = ev_location.attr('data-location_type');
				if(location_type=='address'){
					options.address = ev_location.attr('data-location_address');
					options.location_type = 'add';
				}else{			
					options.address = ev_location.attr('data-latlng');
					options.location_type = 'latlng';				
				}

				// marker icons
				if( SC !== undefined && SC != '' &&  'mapiconurl' in SC) options.iconURL = SC.mapiconurl;

				// make sure there is address present to draw map
				if( options.address === undefined || options.address == ''){
					console.log( 'Location address missing in options.address'); return false;
				}

				map_canvas_id = code.process_unique_map_id();

				if(!map_canvas_id || $('#'+map_canvas_id).length == 0){
					console.log( 'Map element with id missing in page'); return false;
				} 

				var zoom = SC.mapzoom;
				options.zoomlevel = (typeof zoom !== 'undefined' && zoom !== false)? parseInt(zoom):12;				
				options.scroll = SC.mapscroll;	
				options.mapformat = SC.mapformat;	
													
				code.draw_map();
			},

			// final draw
			draw_map: function(){

				if(!options.map_canvas_id || $('body').find('#'+options.map_canvas_id).length == 0){
					console.log( 'Map element with id missing in page'); return false;
				}

				// map styles
				if( typeof gmapstyles !== 'undefined' && gmapstyles != 'default'){
					options.styles = JSON.parse(gmapstyles);
				}

				geocoder = new google.maps.Geocoder();					
				//var latlng = new google.maps.LatLng(45.524732, -122.677031);

				var latlng = 0;
				
				if(options.scroll == 'false' || options.scroll == false){

					var myOptions = {			
						//center: latlng,	
						mapTypeId: 	options.mapformat,	
						zoom: 		options.zoomlevel,	
						scrollwheel: false,
						styles: options.styles,
						zoomControl:true,
						draggable:false,
						mapId: 'DEMO_MAP_ID' 
					}
				}else{
					var myOptions = {	
						//center: latlng,	
						mapTypeId: options.mapformat,	
						zoom: options.zoomlevel,
						styles: options.styles,
						zoomControl:true,
						scrollwheel: true,
						mapId: 'DEMO_MAP_ID' 
					}
				}

				//console.log(myOptions);
				//console.log(options);
				
				var map_canvas = document.getElementById(options.map_canvas_id);
				map = new google.maps.Map(map_canvas, myOptions);
		
				// address from latlng
				if(options.location_type=='latlng' && options.address !== undefined){
					var latlngStr = options.address.split(",",2);
					var lat = parseFloat(latlngStr[0]);
					var lng = parseFloat(latlngStr[1]);
					var latlng = new google.maps.LatLng(lat, lng);

					geocoder.geocode({'latLng': latlng}, function(results, status) {
						if (status == google.maps.GeocoderStatus.OK) {				
							
							let markerOptions = {
				                map: map,
				                position: latlng
				            };

				            if (options.iconURL && options.iconURL.trim() !== '') {
				                var img = new Image();
				                img.src = options.iconURL;

				                img.onload = function () {
				                    var imgWidth = img.width;
				                    var imgHeight = img.height;

				                    var customIcon = document.createElement('div');
				                    customIcon.className = 'custom-marker';
				                    customIcon.style.width = imgWidth + 'px';
				                    customIcon.style.height = imgHeight + 'px';
				                    customIcon.style.backgroundImage = `url(${options.iconURL})`;
				                    customIcon.style.backgroundSize = 'cover';
				                    customIcon.style.position = 'absolute';

				                    markerOptions.content = customIcon;

				                    const marker = new google.maps.marker.AdvancedMarkerElement(markerOptions);
				                    map.setCenter(marker.position);
				                };

				                img.onerror = function () {
				                    console.error("Error loading marker image: " + options.iconURL);
				                    const marker = new google.maps.marker.AdvancedMarkerElement(markerOptions); // Default marker
				                    map.setCenter(marker.position);
				                };
				            } else {
				                // No custom icon, use default Google Maps marker
				                const marker = new google.maps.marker.AdvancedMarkerElement(markerOptions);
				                map.setCenter(marker.position);
				            }

						} else {				
							document.getElementById(options.map_canvas_id).style.display='none';
						}
					});
					
				}else if(options.address==''){
					//console.log('t');
				}else{
					geocoder.geocode( { 'address': options.address}, function(results, status) {
						if (status == google.maps.GeocoderStatus.OK) {		
							console.log('map '+results[0].geometry.location);
							map.setCenter(results[0].geometry.location);
							var marker = new google.maps.Marker({
								map: map,
								position: results[0].geometry.location,
								icon: options.iconURL
							});				
							
						} else {
							document.getElementById(options.map_canvas_id).style.display='none';				
						}
					});
				}

				// mark as map drawn
				$('#'+ options.map_canvas_id).addClass('mDrawn');
			}
		}


		// INIT
		code.init();		
	};


// trigger load google map on dynamic map element u4.6.1
	$.fn.evo_load_gmap = function(opt){
		var defs = {
			'map_canvas_id':'',
			'delay':0,
			trigger_point:'',
		};
		var OO = $.extend({}, defs, opt);

		EL = this;
		EL_id = EL.attr('id');

		if( ('map_canvas_id' in OO ) && OO.map_canvas_id != '' ) EL_id = OO.map_canvas_id;


		var location_type = 'add';
		var location_type = EL.data('location_type');

		if(location_type=='add'){
			var address = EL.data('address');				
		}else{			
			var address = EL.data('latlng');
			var location_type = 'latlng';				
		}
		scrollwheel = EL.data('scroll') == 'yes'? true: false;

		var elms = document.querySelectorAll("[id='"+EL_id+"']");

		// check for unique id
		if( elms.length > 1){
			// GEN
			maximum = 99;
			minimum = 10;
			var randomnumber = Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
			EL_id = EL_id+'_'+randomnumber;
			EL.attr('id', EL_id);
		}

		// get delay
			__delay = 0;
			if( EL.data('delay') ) __delay = EL.data('delay');
			if( OO.delay != 0 ) __delay = OO.delay;

		//console.log(EL_id +' '+location_type);

		// load the map
		EL.evoGenmaps({
			map_canvas_id: EL.attr('id'),
			fnt: 5,
			location_type:	location_type,
			address: address,
			zoomlevel: parseInt( EL.data('zoom') ),
			mapformat: EL.data('mty'),
			scroll: scrollwheel,
			iconURL: ( EL.data('mapicon') !== undefined ? EL.data('mapicon') : '') ,
			delay:  __delay,
			trigger_point: OO.trigger_point,
		});


	};



}(jQuery));