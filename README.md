# Siteplan plugin

Siteplan plugin for Origo.

The plugin puts a landing page in front of origo and lets users query adresses and parcels. When an object is found the user is taken straight to the the print controller and is allowed to print a siteplan for the target parcel.

The name and the code is based on a plugin from Sigtuna kommun. The original version only worked for Sigtuna Origo-fork. The intention with this plugin is to allow a standard Origo-instance to run a Siteplan as well.

Developed and tested for Origo 2.10.

#### Example usage of Siteplan plugin

**index.html:**
```
    <head>
    	<meta charset="utf-8">
    	<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    	<meta http-equiv="X-UA-Compatible" content="IE=Edge;chrome=1">
    	<title>Origo exempel</title>
    	<link href="css/style.css" rel="stylesheet">
    	<link href="plugins/siteplan.css" rel="stylesheet">
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
				'url': 'https://karta.kommun.se/situationsskiss-plus/', // Optional link shown below the search input.
				'text': 'Till avancerad karta',
				'title': 'Öppna avancerad karta',
				'target': '_blank'
			},
			'queryPrefix': 'Kommunnamn', // kommunnamn
			'urlYta': '/origoserver/lm/registerenheter/objectId/enhetsomraden?srid=3009',// Kräver registerbeteckning direkt i origo server
			'urlFastighet': '/origoserver/lm/registerenheter?srid=3009',// Kräver registerbeteckning direkt i origo server
			'urlAdress': '/origoserver/lm/addresses?srid=3009',// Kräver belägenhetsadress direkt i origo server
			'queryParameterName': 'q',
			'siteplanQueryParameter': 'siteplan', // URL parameter used to bypass the search input. Default is siteplan.
			'limit': 10, // Maximum number of autocomplete suggestions. Shared fairly by address and parcel results, grouped by type. Default is 10.
			'minLength': 4,
			'backgroundImageUrl': 'img/bakgrund.jpg', // undefined if it's not active.
			'defaultSize': 'a4',
			'printMargins': { // Estimated space reserved per side in millimeters for automatic scale selection. Default is 30/30.
				'topBottom': 30,
				'leftRight': 30
			},
			'hidePrintSettings': true, // Hides Origo's print settings control. Default is true; set to false to show it.
			'hidePrintMapInteraction': true, // Hides "change map position" in print preview. Default is true; set to false to show it.
			'printScaleBarFontSize': 16, // Optional size for all print scalebar text in pixels at 150 DPI.
			'printScaleBarRatioFontSize': 20, // Optional override for the top scale ratio, such as 1:500.
			'allowOversize': true, // If set to true, the user is allowed to pan to an appropriate extent if the selected parcel is too large for the available scales/page sizes
			'iosOversizeInfoContent': '<div><p>Fastigheten är för stor för att rymmas i utskriften. Testa att flytta kartan manuellt så att aktuellt område visas på bästa sätt.</p><br><p>Notera att IOS-enheter endast tillåter utskrifter i A4-storlek. Prova därför att göra utskriften på en stationär enhet.</p></div>',
			'oversizeInfoContent': '<div><p>Fastigheten är för stor för att rymmas i utskriften. Testa att flytta kartan manuellt så att aktuellt område visas på bästa sätt.</p></div>',
			'initialQueryErrorTitle': 'Sökfel',
			'initialQueryErrorDuration': 8000,
			'initialQueryErrorMessages': {
				'empty': 'Sökningen saknar en adress eller fastighet.',
				'noResults': 'Ingen adress eller fastighet hittades för "{query}".',
				'multipleResults': 'Flera träffar hittades för "{query}". Sök manuellt.',
				'requestFailed': 'Söktjänsten kunde inte nås. Försök igen senare.'
			}
		});
	});
</script>
```

#### Initialization styles

Both initialization styles are supported. The example above uses
`Siteplan(viewer, options)`, which attaches the component automatically.

Alternatively, create the component first and attach it explicitly:

```javascript
var siteplan = Siteplan({
	urlAdress: '/origoserver/lm/addresses?srid=3009',
	urlYta: '/origoserver/lm/registerenheter/objectid/enhetsomraden?srid=3009',
	headerText: 'TOMTKARTA'
});
viewer.addComponent(siteplan);
```

Both forms return the search component. Do not call `viewer.addComponent` again
when using `Siteplan(viewer, options)`.

#### Configurable parameters

Pass the following parameters as the options object to either `Siteplan(options)`
or `Siteplan(viewer, options)`.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `urlAdress` | `string` | Required | URL for the address search endpoint. |
| `urlFastighet` | `string` | Optional | URL for the parcel search endpoint. If omitted, only address results are requested. |
| `urlYta` | `string` | Required | URL for fetching the selected parcel geometry. The URL must contain an `objectid` placeholder. |
| `queryParameterName` | `string` | `q` | Query string parameter name that is passed to Origo Server address, parcel, and geometry requests. |
| `siteplanQueryParameter` | `string` | `siteplan` | URL parameter that bypasses the search field and opens a site plan when exactly one result is found. |
| `queryPrefix` | `string` | Empty | Text prepended to every search query, usually municipality name. |
| `limit` | `number` | `10` | Maximum number of autocomplete suggestions, shared between address and parcel results. |
| `minLength` | `number` | `4` | Minimum number of characters before a search request is made. |
| `hintText` | `string` | `Sök...` | Placeholder text in the search field. |
| `headerText` | `string` | `TOMTKARTA` | Heading displayed above the search field. |
| `backgroundImageUrl` | `string` | None | Background image URL for the search view. |
| `advancedMapButton` | `object` | None | Optional link below the search field. Set `url`, and optionally `text`, `title`, and `target`. |
| `allowOversize` | `boolean` | `false` | Allows users to pan the map when the selected parcel is too large for the available print scales. |
| `hidePrintSettings` | `boolean` | `true` | Hides the print settings control in print preview when `true`. |
| `hidePrintMapInteraction` | `boolean` | `true` | Hides the control for changing the map position in print preview when `true`. |
| `printScaleBarFontSize` | `number` | Origo's default sizes | Positive font size in pixels at 150 DPI for both the print scalebar's scale ratio and distance labels. Scales proportionally with print DPI. Omit to preserve Origo's default sizes; invalid values are ignored. |
| `printScaleBarRatioFontSize` | `number` | `printScaleBarFontSize`, otherwise Origo's default | Positive font size in pixels at 150 DPI for the top scale ratio only (for example, 1:500). Overrides `printScaleBarFontSize` for that label and scales proportionally with print DPI. Invalid values are ignored. |
| `defaultSize` | `string` | `a4` | Page size used when the selected parcel is larger than all available print scales. |
| `printMargins` | `object` | `{ topBottom: 30, leftRight: 30 }` | Estimated space reserved per side in millimeters for automatic scale selection. Does not change visible margins. Set `topBottom` and `leftRight`. |
| `iosOversizeInfoContent` | `string` | Built-in HTML message | HTML shown for oversized parcels on iOS devices. |
| `oversizeInfoContent` | `string` | Built-in HTML message | HTML shown for oversized parcels on non-iOS devices. |
| `initialQueryErrorTitle` | `string` | `Sökfel` | Toast title shown when the `siteplanQueryParameter` search fails. |
| `initialQueryErrorDuration` | `number` | `8000` | Toast duration in milliseconds for initial URL-query errors. |
| `initialQueryErrorMessages` | `object` | Built-in messages | Optional overrides for `empty`, `noResults`, `multipleResults`, and `requestFailed`. Use `{query}` in a message to include the URL parameter value. |

Address and parcel suggestions are sorted naturally using Swedish collation before the result limit is applied. Numeric address parts are compared as numbers, so `Drottninggatan 4` appears before `Drottninggatan 40` and `Drottninggatan 46`.

#### Print configuration and scale selection

`printMargins` influences the space around the selected object **inside the map**, by changing the automatically selected scale. It does not resize the map container or change its CSS padding. Larger values generally select a more zoomed-out scale, making the object smaller and showing more surrounding map, or select a larger page.

Automatic scale selection uses discrete scales derived from the main Origo configuration's `resolutions` array, **not** the print control's `scales` option. Adding `1:400` to the print control therefore does not make automatic selection use it unless the map resolutions also provide that scale.

Small margin changes can cross a scale threshold and cause a large jump, while further changes have no visible effect until another threshold is crossed. However this quirk is necessairy in order to print nicely snapped print scales.

In the **main Origo configuration**, set the top-level `constrainResolution` option to `false` (not inside the print control or Siteplan plugin options):

```json
{
	"constrainResolution": false
}
```

When `constrainResolution` is `true`, the map view snaps to its allowed resolutions instead of preserving the resolution required for the intended print scale. This can produce an incorrect scale in the printed map. Keep it `false` even though the plugin's automatic scale selection itself uses discrete scales.

#### Open a site plan from a URL

The search input can be bypassed by passing an (url encoded) address or parcel in the `siteplan` query parameter:

```
https://example.com/?siteplan=Storgatan 1, Orten
```

If the parameter is empty, there are no results, multiple results are returned, or a request fails, the plugin shows Origo's danger toast with the title `Sökfel`. The toast remains visible for eight seconds and can be dismissed by clicking it. The normal search input remains available so the user can correct or refine the search.

Use `siteplanQueryParameter` to change the query parameter name. By default it is "siteplan".

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
