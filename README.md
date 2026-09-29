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
			'headerText': 'TOMTKARTA',
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
			'siteplanQueryParameter': 'sitemap', // URL parameter used to bypass the search input. Default is sitemap.
			'limit': 10, // Maximum number of autocomplete suggestions. Shared fairly by address and parcel results, grouped by type. Default is 10.
			'backgroundImageUrl': 'img/bakgrund_karlshamn.jpg', // undefined if it's not active.
			'printMargins': { // Should reflect the difference between page size and map size (in pixels). Default is 30/30.
				'topBottom': 30,
				'leftRight': 30
			},
			'hidePrintSettings': true, // Hides Origo's print settings control. Default is true; set to false to show it.
			'hidePrintMapInteraction': true, // Hides "change map position" in print preview. Default is true; set to false to show it.
			'allowOversize': true // If set to true, the user is allowed to pan to an appropriate extent if the selected property is too large for the available scales/page sizes
		});
	});
</script>
```

Address and property suggestions are sorted naturally using Swedish collation before the result limit is applied. Numeric address parts are compared as numbers, so `Drottninggatan 4` appears before `Drottninggatan 40` and `Drottninggatan 46`.

#### Open a site plan from a URL

The search input can be bypassed by passing an address or property in the `sitemap` query parameter:

```
https://example.com/?sitemap=Storgatan%2015%2C%20Asarum
```

The plugin shows Origo's loading spinner before rendering the landing UI, then searches both the configured address and property endpoints. The spinner remains active through property loading, and print preview opens only when the endpoints return exactly one combined result.

If the parameter is empty, there are no results, multiple results are returned, or a request fails, the plugin shows Origo's danger toast with the title `Sökfel`. The toast remains visible for eight seconds and can be dismissed by clicking it. The normal search input remains available so the user can correct or refine the search.

Use `siteplanQueryParameter` to change the parameter name.

The toast title, duration in milliseconds, and messages can be configured in the Siteplan options. Message overrides are optional; omitted keys retain their default text. Use `{query}` to include the URL parameter value in a message.

```javascript
var siteplan = Siteplan(viewer, {
	'initialQueryErrorTitle': 'Kunde inte öppna situationsplanen',
	'initialQueryErrorDuration': 10000,
	'initialQueryErrorMessages': {
		'empty': 'Länken saknar en adress eller fastighet.',
		'noResults': 'Ingen träff hittades för "{query}".',
		'multipleResults': 'Flera träffar hittades för "{query}". Sök manuellt.',
		'requestFailed': 'Söktjänsten kunde inte nås. Försök igen senare.'
	}
});
```
