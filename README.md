# Siteplan plugin

Siteplan plugin for Origo.

Developed for Origo 2.10.

Based on the original version from Sigtuna kommun, with some inspiration from Haninge kommun.

#### Example usage of Siteplan plugin

**index.html:**
```
    <head>
    	<meta charset="utf-8">
    	<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    	<meta http-equiv="X-UA-Compatible" content="IE=Edge;chrome=1">
    	<title>Origo exempel</title>
    	<link href="css/style.css" rel="stylesheet">
    </head>
    <body>
    <div id="app-wrapper">
    </div>
    <script src="js/origo.js"></script>
    <script src="plugins/siteplan.min.js"></script>

<script type="text/javascript">
	var origo = Origo('index.json');
	origo.on('load', function (viewer) {
		var siteplan = Siteplan(viewer, {
			'headerText': 'TOMTCARTA',
			'hintText': 'Skriv in adress eller fastighet',
			'advancedMapButton': {
				'url': 'https://karta.karlshamn.se/situationsskiss-plus/', // Optional link shown below the search input.
				'text': 'Till avancerad karta',
				'title': 'Öppna avancerad karta'
			},
			'queryPrefix': 'Karlshamn',// kommunnamn
			'urlYta': '/origoserver/lm/registerenheter/objectId/enhetsomraden?srid=3009',// Kräver registerbeteckning direkt i origo server
			'urlFastighet': '/origoserver/lm/registerenheter?srid=3009',// Kräver registerbeteckning direkt i origo server
			'urlAdress': '/origoserver/lm/addresses?srid=3009',// Kräver belägenhetsadress direkt i origo server
			'limit': 10, // Maximum number of autocomplete suggestions. Shared fairly by address and parcel results, grouped by type. Default is 10.
			'backgroundImageUrl': 'img/bakgrund_karlshamn.jpg', // undefined if it's not active.
			'printMargins': { // Should reflect the difference between page size and map size (in pixels). Default is 30/30.
				'topBottom': 30,
				'leftRight': 30
			},
			'allowOversize': true // If set to true, the user is allowed to pan to an appropriate extent if the selected property is too large for the available scales/page sizes
		});
	});
</script>
```
