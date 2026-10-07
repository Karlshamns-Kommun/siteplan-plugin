/* eslint-disable no-alert */

import Origo from 'Origo';
import Awesomplete from 'awesomplete';
import { icon as fontawesomeIcon } from '@fortawesome/fontawesome-svg-core';
import { faMapLocationDot } from '@fortawesome/free-solid-svg-icons';

const advancedMapIcon = fontawesomeIcon(faMapLocationDot).html.join('');

const Search = function Search(options = {}) {
  const defaultInitialQueryErrorMessages = {
    empty: 'Sökningen saknar en adress eller fastighet.',
    noResults: 'Ingen adress eller fastighet hittades för "{query}".',
    multipleResults: 'Sökningen efter "{query}" gav flera träffar. Sök manuellt för att välja rätt träff.',
    requestFailed: 'Sökningen kunde inte genomföras. Försök igen eller sök manuellt.'
  };

  const keyCodes = {
    9: 'tab',
    27: 'esc',
    37: 'left',
    39: 'right',
    13: 'enter',
    38: 'up',
    40: 'down'
  };

  let {
    name,
    northing,
    easting,
    layerNameAttribute,
    layerName,
    title,
    titleAttribute,
    contentAttribute,
    maxZoomLevel,
    limit,
    hintText,
    minLength
  } = options;

  const {
    urlAdress,
    urlFastighet,
    urlYta,
    queryParameterName = 'q',
    siteplanQueryParameter = 'siteplan',
    initialQueryErrorTitle = 'Sökfel',
    initialQueryErrorDuration = 8000,
    initialQueryErrorMessages = {},
    queryPrefix = '',
    backgroundImageUrl,
    headerText = 'TOMTKARTA',
    advancedMapButton,
    allowOversize = false,
    hidePrintSettings = true,
    hidePrintMapInteraction = true,
    printScaleBarFontSize,
    printScaleBarRatioFontSize = printScaleBarFontSize,
    defaultSize = 'a4',
    printMargins = {
      topBottom: 30,
      leftRight: 30
    },
    iosOversizeInfoContent = '<div><p>Fastigheten är för stor för att rymmas i utskriften. Testa att flytta kartan manuellt så att aktuellt område visas på bästa sätt.</p><br><p>Notera att IOS-enheter endast tillåter utskrifter i A4-storlek. Prova därför att göra utskriften på en stationär enhet.</p></div>',
    oversizeInfoContent = '<div><p>Fastigheten är för stor för att rymmas i utskriften. Testa att flytta kartan manuellt så att aktuellt område visas på bästa sätt.</p></div>'
  } = options;

  const queryErrorMessages = {
    ...defaultInitialQueryErrorMessages,
    ...initialQueryErrorMessages
  };

  let searchDb = {};
  let map;
  let overlay;
  let awesomplete;
  let viewer;
  let featureInfo;
  let searchButton;
  let closeButton;
  let containerElement;
  let searchLayoutElement;
  let wrapperElement;
  let advancedMapLinkElement;
  let curtainElement;
  let headerElement;
  let vectorSource;
  let sizes;
  let printDpi;
  let initialQueryHandled = false;

  const DEFAULT_PRINT_DPI = 150;
  const MILLIMETERS_PER_INCH = 25.4;
  const CSS_PIXEL_DPI = MILLIMETERS_PER_INCH / 0.28;

  const ADDRESS_HEADER = 'Adresser';
  const PARCEL_HEADER = 'Fastigheter';
  const searchResultCollator = new Intl.Collator('sv-SE', {
    numeric: true,
    sensitivity: 'base'
  });

  const margins = {
    topBottom: printMargins.topBottom * 2,
    leftRight: printMargins.leftRight * 2
  };

  const defaultSizes = [
    {
      name: 'a4',
      size: [210, 297]
    },
    {
      name: 'a3',
      size: [297, 420]
    }
  ];

  if (isOnIos()) {
    sizes = defaultSizes.filter(size => size.size[0] < 300 && size.size[1] < 300);
  } else {
    sizes = defaultSizes;
  }

  function isOnIos() {
    return [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
      || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
  }

  function clear() {
    featureInfo.clear();
    if (vectorSource) {
      vectorSource.clear();
    }
    if (overlay) {
      viewer.removeOverlays(overlay);
    }
  }

  // Print sizing and scale helpers
  function resolutionToScale(resolution, projection, dpi) {
    const mpu = projection.getMetersPerUnit();
    let scale = resolution * mpu * 39.37 * dpi;
    scale = Math.round(scale);
    return scale;
  }

  function scaleToResolution(scale, projection) {
    const mpu = projection.getMetersPerUnit();
    const resolution = scale / (mpu * 39.37 * CSS_PIXEL_DPI);
    return resolution;
  }

  function millimetersToPixels(millimeters, dpi, pixelRatio) {
    return Math.round((millimeters * dpi) / MILLIMETERS_PER_INCH / pixelRatio);
  }

  function getClosestScale(target, printScales) {
    const scales = printScales.map(scale => parseInt(scale.split(':')[1], 10));
    return scales.reduce((prev, curr) => (Math.abs(curr - target) < Math.abs(prev - target) && curr > target ? curr : prev));
  }

  function getPrintTargetForExtent(extent, printScales) {
    const extentWidth = extent[2] - extent[0];
    const extentHeight = extent[3] - extent[1];
    let pageSize;
    let closestResolution;

    const featureOrientation = extentWidth / extentHeight >= 1 ? 'landscape' : 'portrait';
    const pixelRatio = isOnIos() ? 1 : window.devicePixelRatio;
    const screenDpi = printDpi * pixelRatio;
    const view = map.getView();
    const projection = view.getProjection();

    // Find the smallest configured page size/scale that can contain the selected property.
    for (let i = 0; i < sizes.length; i += 1) {
      const size = sizes[i];
      const pageWidth = featureOrientation === 'landscape' ? size.size[1] : size.size[0];
      const pageHeight = featureOrientation === 'landscape' ? size.size[0] : size.size[1];
      const printWidth = pageWidth - margins.leftRight;
      const printHeight = pageHeight - margins.topBottom;
      const printSize = [
        millimetersToPixels(printWidth, screenDpi, pixelRatio),
        millimetersToPixels(printHeight, screenDpi, pixelRatio)
      ];

      const resolutionForExtent = view.getResolutionForExtent(extent, printSize);
      const scaleForExtent = resolutionToScale(resolutionForExtent, projection, screenDpi);
      const closestScale = getClosestScale(scaleForExtent, printScales);
      closestResolution = scaleToResolution(closestScale, projection);
      pageSize = size.name;

      if (closestScale > scaleForExtent) {
        return {
          featureOrientation,
          pageSize,
          closestResolution,
          oversize: false
        };
      }
    }

    return {
      featureOrientation,
      pageSize: defaultSize,
      closestResolution,
      oversize: true
    };
  }

  // Map preview and print component orchestration
  function createSelectionLayer(feature) {
    vectorSource = new Origo.ol.source.Vector();
    const vectorLayer = new Origo.ol.layer.Vector({
      source: vectorSource,
      style: Origo.Style.createStyle({ style: 'selection', viewer })
    });
    vectorLayer.set('name', 'lmsearch');
    vectorLayer.set('group', 'none');
    map.addLayer(vectorLayer);

    vectorSource.addFeature(feature);
  }

  function getPrintScales(projection) {
    return viewer.getResolutions().map(resolution => `1:${resolutionToScale(resolution, projection, CSS_PIXEL_DPI)}`);
  }

  function getPrintTitle(feature) {
    return feature.get('name').split('Enhetsområde')[0].trim().split(' ').slice(1).join(' ');
  }

  function showOversizeInfo() {
    const modal = Origo.ui.Modal({
      title: 'OBS!',
      content: isOnIos() ? iosOversizeInfoContent : oversizeInfoContent,
      target: viewer.getId(),
      style: 'max-width: 94%;'
    });
    viewer.addComponent(modal);
  }

  function showOversizeInfoAfterRender(oversize) {
    map.once('rendercomplete', () => {
      setTimeout(() => {
        if (oversize) {
          showOversizeInfo();
        }
      }, 300);
    });
  }

  const printFormatListeners = new WeakSet();

  function updatePrintScaleBarFontSize(printComponent) {
    const printElement = document.getElementById(printComponent.getId());
    if (!printElement) {
      return;
    }
    const resolution = printComponent.getResolution() || DEFAULT_PRINT_DPI;
    const fontSizes = [
      [printScaleBarFontSize, 'siteplan-print', '--siteplan-scale-bar-font-size'],
      [printScaleBarRatioFontSize, 'siteplan-print-scale-ratio', '--siteplan-scale-bar-ratio-font-size']
    ];
    fontSizes.forEach(([fontSize, className, propertyName]) => {
      if (Number.isFinite(fontSize) && fontSize > 0) {
        printElement.classList.add(className);
        printElement.style.setProperty(propertyName, `${fontSize * resolution / DEFAULT_PRINT_DPI}px`);
      }
    });
  }

  function updatePrintFormat(printComponent, pageSize) {
    const printElement = document.getElementById(printComponent.getId());
    const createdElement = printElement && printElement.querySelector('.o-print-created');
    if (!createdElement) {
      return;
    }

    let formatElement = printElement.querySelector('.siteplan-print-format');
    if (!formatElement) {
      const metadataElement = document.createElement('div');
      metadataElement.className = 'text-align-right no-shrink';
      formatElement = document.createElement('div');
      formatElement.className = 'siteplan-print-format';
      createdElement.parentNode.insertBefore(metadataElement, createdElement);
      metadataElement.appendChild(formatElement);
      metadataElement.appendChild(createdElement);
    }
    formatElement.textContent = `Utskriftsformat: ${pageSize.toUpperCase()}`;
    printComponent.updatePageSize();
  }

  function showPrintComponent(printComponent, target, printTitle) {
    if (!printFormatListeners.has(printComponent)) {
      printComponent.getComponents().forEach((component) => {
        component.on('change:size', ({ size }) => {
          updatePrintScaleBarFontSize(printComponent);
          updatePrintFormat(printComponent, size);
        });
        component.on('change:resolution', () => updatePrintScaleBarFontSize(printComponent));
      });
      printFormatListeners.add(printComponent);
    }
    printComponent.render();

    const footerElement = document.getElementById(printComponent.getId()).querySelector('.o-print-footer');
    if (footerElement) {
      footerElement.classList.remove('padding-left', 'padding-right');
    }

    if (hidePrintSettings) {
      const printElement = document.getElementById(printComponent.getId());
      const printTools = printElement && printElement.querySelector('#o-print-tools-left');
      if (printTools && printTools.firstElementChild) {
        printTools.firstElementChild.style.display = 'none';
      }
    }

    if (hidePrintMapInteraction) {
      const printElement = document.getElementById(printComponent.getId());
      const printTools = printElement && printElement.querySelector('#o-print-tools-left');
      if (printTools && printTools.lastElementChild) {
        printTools.lastElementChild.style.display = 'none';
      }
    }

    printComponent.changeOrientation({ orientation: target.featureOrientation });
    printComponent.changeSize({ size: target.pageSize });
    printComponent.changeTitle({ value: printTitle });
    updatePrintScaleBarFontSize(printComponent);
    updatePrintFormat(printComponent, target.pageSize);
  }

  function showPrintLayers() {
    map.getLayers().forEach((layer) => {
      if (layer.get('inPrint')) { layer.setVisible(true); }
    });
  }

  function fitMapForPrint(target, geom, pointCoords) {
    const view = map.getView();
    const fitGeom = target.oversize && pointCoords ? new Origo.ol.geom.Point(pointCoords) : geom;
    view.fit(fitGeom, {
      padding: [0, 0, 0, 0]
    });
    view.setResolution(target.closestResolution);
  }

  function showPropertyPrintPreview(features, pointCoords) {
    const feature = features[0];
    if (!feature) {
      alert('Ett problem uppstod. ');
      return;
    }

    clear();
    createSelectionLayer(feature);

    const geom = feature.getGeometry();
    const printControl = viewer.getControlByName('print');
    const printComponent = printControl.getPrintComponent();
    const projection = map.getView().getProjection();
    printDpi = printComponent.getResolution() || DEFAULT_PRINT_DPI;
    const printScales = getPrintScales(projection);

    const target = getPrintTargetForExtent(geom.getExtent(), printScales);
    title = getPrintTitle(feature);

    if (!target) {
      alert('Ett problem uppstod. Vänligen kontakta kommunens mätningsavdelning.');
      return;
    }

    if (target.oversize && !allowOversize) {
      alert('Fastigheten är för stor. Vänligen kontakta kommunens mätningsavdelning');
      return;
    }

    showPrintLayers();
    fitMapForPrint(target, geom, pointCoords);
    showPrintComponent(printComponent, target, title);
    showOversizeInfoAfterRender(target.oversize);
  }

  function getRelatedProperty(relatedPropertyId) {
    const fetchUrl = urlYta.replace(/objectid/i, relatedPropertyId);
    return fetch(fetchUrl);
  }

  // Search response normalization
  function getParcelId(feature) {
    const { properties = {} } = feature;
    return properties.objid;
  }

  function getParcelName(properties) {
    return properties.name
      || properties.registerbeteckning
      || properties.beteckning
      || properties.fastighetsbeteckning
      || properties.registerenhet
      || properties.id;
  }

  function getParcelMunicipality(properties) {
    return properties.municipality
      || properties.kommun
      || properties.kommunnamn
      || properties.municipalityName;
  }

  function getParcelCoordinates(geometry) {
    if (geometry.type === 'Point') {
      return Array.isArray(geometry.coordinates[0]) ? geometry.coordinates[0] : geometry.coordinates;
    }

    if (geometry.type === 'Polygon') {
      return geometry.coordinates[0][0];
    }

    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates[0][0][0];
    }

    return undefined;
  }

  function readPropertyFeatures(propertyData) {
    const format = new Origo.ol.format.GeoJSON();
    // urlYta may return either a FeatureCollection or an array of Feature objects.
    const geojson = Array.isArray(propertyData)
      ? { type: 'FeatureCollection', features: propertyData }
      : propertyData;
    return format.readFeatures(geojson);
  }

  function selectSearchResult(data) {
    return getRelatedProperty(data.relatedProperty)
      .then(response => response.json())
      .then((propertyData) => {
        const features = readPropertyFeatures(propertyData);

        // Parcel searches already fetch the exact geometry by id; address searches need the related parcel filtered by coordinate.
        const property = data.useFetchedGeometry || !data.coordinates
          ? features
          : features.filter(prop => prop.getGeometry().intersectsCoordinate(data.coordinates));

        showPropertyPrintPreview(property, data.coordinates);
      });
  }

  function selectHandler(evt) {
    selectSearchResult(searchDb[evt.text.label]);
  }

  function setSearchDb(data) {
    data.forEach((item, index) => {
      const dataItem = {};
      /* Items from the /origoserver/lm/addresses endpoint are arrays organized as follows:
         [ID, VALUE, EASTING, NORTHING, RELATED_PARCEL] 
      */

      const label = `address-${item[0]}-${index}`;
      dataItem.label = label;
      dataItem.value = item[1].trim();
      dataItem.coordinates = [item[2], item[3]];
      dataItem.relatedProperty = item[4];
      dataItem.type = 'address';
      searchDb[label] = dataItem;
    });
  }

  function setParcelSearchDb(data) {
    const features = Array.isArray(data) ? data : data.features || [];
    setParcelFeatureSearchDb(features);
  }

  function setParcelFeatureSearchDb(features) {
    features.forEach((feature, index) => {
      const { geometry, properties } = feature;
      if (!geometry || !properties || !geometry.coordinates) return;

      const parcelId = getParcelId(feature);
      if (!parcelId) return;
      const coordinates = getParcelCoordinates(geometry);
      if (!coordinates) return;

      const label = `parcel-${parcelId}-${index}`;
      const dataItem = {};
      dataItem.label = label;
      dataItem.value = [getParcelName(properties), getParcelMunicipality(properties)].filter(Boolean).join(', ');
      if (!dataItem.value) return;
      dataItem.coordinates = coordinates;
      dataItem.relatedProperty = parcelId;
      dataItem.useFetchedGeometry = true;
      dataItem.type = 'parcel';
      searchDb[label] = dataItem;
    });
  }

  function getQueryUrl(searchUrl, query) {
    return `${searchUrl}${searchUrl.indexOf('?') !== -1 ? '&' : '?'}${queryParameterName}=${encodeURIComponent(query)}`;
  }

  function readJsonResponse(response) {
    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }
    return response.json();
  }

  function requestSearchResults(value) {
    const query = `${queryPrefix} ${value}`.trim();
    const addressRequest = fetch(getQueryUrl(urlAdress, query)).then(readJsonResponse);
    const parcelRequest = urlFastighet
      ? fetch(getQueryUrl(urlFastighet, query)).then(readJsonResponse)
      : Promise.resolve([]);

    return Promise.all([addressRequest, parcelRequest]);
  }

  function escapeHtml(value) {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
  }

  function showInitialQueryError(messageKey, query = '') {
    const message = queryErrorMessages[messageKey].replace(/\{query\}/g, escapeHtml(query));
    viewer.getLogger().createToast({
      status: 'danger',
      title: initialQueryErrorTitle,
      message,
      duration: initialQueryErrorDuration
    });
  }

  function setInitialQueryLoading(loading) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.classList.toggle('hide', !loading);
    }
  }

  function runInitialQuerySearch() {
    if (initialQueryHandled) return null;

    const query = new URLSearchParams(window.location.search).get(siteplanQueryParameter);
    if (query === null) return null;
    initialQueryHandled = true;

    const value = query.trim();
    if (!value) {
      showInitialQueryError('empty');
      return Promise.resolve();
    }

    return requestSearchResults(value)
      .then(([addresses, parcels]) => {
        searchDb = {};
        setSearchDb(addresses);
        setParcelSearchDb(parcels);

        const results = dbToList();
        if (results.length === 0) {
          showInitialQueryError('noResults', value);
          return;
        }
        if (results.length > 1) {
          showInitialQueryError('multipleResults', value);
          return;
        }

        return selectSearchResult(results[0]);
      })
      .catch(() => {
        showInitialQueryError('requestFailed');
      });
  }

  // Search field and autocomplete UI
  function clearSearchResults() {
    awesomplete.list = [];
    awesomplete.suggestions = [];
    setSearchDb([]);
  }

  function onClearSearch() {
    document.getElementById(`${closeButton.getId()}`).addEventListener('click', () => {
      clearSearchResults();
      clear();
      document.getElementById(`${containerElement.getId()}`).classList.remove('o-search-true');
      document.getElementById(`${containerElement.getId()}`).classList.add('o-search-false');
      document.getElementsByClassName('o-search-field')[0].value = '';
      document.getElementById(`${searchButton.getId()}`).blur();
    });
  }

  function bindUIActions() {
    document.getElementById('hjl').addEventListener('awesomplete-selectcomplete', selectHandler);

    document.getElementsByClassName('o-search-field')[0].addEventListener('input', () => {
      if (document.getElementsByClassName('o-search-field')[0].value && document.getElementById(`${containerElement.getId()}`).classList.contains('o-search-false')) {
        document.getElementById(`${containerElement.getId()}`).classList.remove('o-search-false');
        document.getElementById(`${containerElement.getId()}`).classList.add('o-search-true');
        onClearSearch();
      } else if (!(document.getElementsByClassName('o-search-field')[0].value) && document.getElementById(`${containerElement.getId()}`).classList.contains('o-search-true')) {
        document.getElementById(`${containerElement.getId()}`).classList.remove('o-search-true');
        document.getElementById(`${containerElement.getId()}`).classList.add('o-search-false');
      }
    });

    document.getElementsByClassName('o-search-field')[0].addEventListener('blur', () => {
      document.getElementById(`${wrapperElement.getId()}`).classList.remove('active');
      window.dispatchEvent(new CustomEvent('resize'));
    });
    document.getElementsByClassName('o-search-field')[0].addEventListener('focus', () => {
      document.getElementById(`${wrapperElement.getId()}`).classList.add('active');
      if (awesomplete.suggestions && awesomplete.suggestions.length > 0) {
        awesomplete.open();
      }
      window.dispatchEvent(new CustomEvent('resize'));
    });
  }

  function renderList(suggestion, input) {
    const item = searchDb[suggestion.label] || {};
    const header = 'header' in item ? `<div class="heading">${item.header}</div>` : '';
    let opts = {};
    let html = input === '' ? suggestion.value : suggestion.value.replace(RegExp(Awesomplete.$.regExpEscape(input), 'gi'), '<mark>$&</mark>');
    html = `${header}<div class="suggestion">${html}</div>`;
    opts = {
      innerHTML: html,
      'aria-selected': 'false'
    };
    if ('header' in item) {
      opts.className = 'header';
    }

    return Awesomplete.$.create('li', opts);
  }

  function dbToList() {
    const items = Object.keys(searchDb);
    return items.map(item => searchDb[item]);
  }

  function addGroupHeader(items, header) {
    if (items.length) {
      items[0].header = header;
    }
    return items;
  }

  function matchesInput(item, inputValue) {
    return item.value.toLowerCase().includes(inputValue.toLowerCase());
  }

  function sortSearchItems(items) {
    return items.sort((first, second) => searchResultCollator.compare(first.value, second.value));
  }

  function getSharedAutocompleteList(inputValue) {
    const items = dbToList().filter(item => matchesInput(item, inputValue));
    const addresses = sortSearchItems(items.filter(item => item.type === 'address'));
    const parcels = sortSearchItems(items.filter(item => item.type === 'parcel'));

    // Filter before limiting so the address/parcel split is based on the user's current text.
    if (!addresses.length || !parcels.length) {
      const sortedItems = addresses.length ? addresses : parcels;
      return addGroupHeader(sortedItems.slice(0, limit), addresses.length ? ADDRESS_HEADER : PARCEL_HEADER);
    }

    const addressLimit = Math.min(addresses.length, Math.ceil(limit / 2));
    const parcelLimit = Math.min(parcels.length, Math.floor(limit / 2));
    const selectedAddresses = addresses.slice(0, addressLimit);
    const selectedParcels = parcels.slice(0, parcelLimit);
    let remaining = limit - selectedAddresses.length - selectedParcels.length;

    if (remaining > 0) {
      selectedAddresses.push(...addresses.slice(selectedAddresses.length, selectedAddresses.length + remaining));
      remaining = limit - selectedAddresses.length - selectedParcels.length;
    }

    if (remaining > 0) {
      selectedParcels.push(...parcels.slice(selectedParcels.length, selectedParcels.length + remaining));
    }

    return addGroupHeader(selectedParcels, PARCEL_HEADER).concat(addGroupHeader(selectedAddresses, ADDRESS_HEADER));
  }

  /*
  The label property in Awesomplete is used to store the feature id. This way the properties
  of each feature in the search response will be available in event handling.
  The complete properties are stored in a temporary db called searchDb. This is a workaround
  for a limit in Awesomplete that can only store data in the fields label and text.
  The data-category attribute is used to make a layer division in the suggestion list.
  */

  // Remote search requests
  function initAutocomplete() {
    let list;
    const input = document.getElementsByClassName('o-search-field')[0];

    awesomplete = new Awesomplete('.o-search-field', {
      minChars: minLength,
      autoFirst: false,
      sort: false,
      maxItems: limit,
      item: renderList,
      filter(suggestion, userInput) {
        const { value: suggestionValue } = suggestion;
        return suggestionValue.toLowerCase().includes(userInput.toLowerCase()) ? suggestionValue : false;
      }
    });

    const handler = function func(addresses, parcels) {
      list = [];
      searchDb = {};
      setSearchDb(addresses);
      setParcelSearchDb(parcels);
      if (Object.keys(searchDb).length) {
        list = getSharedAutocompleteList(input.value);
        awesomplete.list = list;
        awesomplete.evaluate();
      }
    };

    function makeRequest(reqHandler, obj) {
      requestSearchResults(obj.value)
        .then(([addresses, parcels]) => reqHandler(addresses, parcels));
    }

    input.addEventListener('keyup', (e) => {
      const keyCode = e.keyCode;
      if (input.value.length >= minLength) {
        if (keyCode in keyCodes) {
          // empty
        } else {
          makeRequest(handler, input);
        }
      }
    });
  }

  return Origo.ui.Component({
    name: 'search',

    // Origo component lifecycle
    onAdd(evt) {
      viewer = evt.target;
      featureInfo = viewer.getControlByName('featureInfo');
      name = options.searchAttribute;
      if (!northing) northing = undefined;
      if (!easting) easting = undefined;

      if (!layerNameAttribute) layerNameAttribute = undefined;
      if (!layerName) layerName = undefined;
      if (!title) title = '';
      if (!titleAttribute) titleAttribute = undefined;
      if (!contentAttribute) contentAttribute = undefined;
      if (!maxZoomLevel) maxZoomLevel = viewer.getResolutions().length - 2 || viewer.getResolutions();
      if (!limit) limit = 10;
      if (!minLength) minLength = 4;
      map = viewer.getMap();

      this.addComponents([searchButton, closeButton, containerElement, wrapperElement, curtainElement, headerElement]);
      this.render();
    },
    onInit() {
      if (!hintText) hintText = 'Sök...';
      searchButton = Origo.ui.Button({
        cls: 'o-search-button no-shrink no-grow compact icon-small',
        icon: '#ic_search_24px',
        iconCls: 'grey'
      });

      closeButton = Origo.ui.Button({
        cls: 'o-search-button-close no-shrink no-grow compact icon-small',
        click() {
          onClearSearch();
        },
        icon: '#ic_close_24px',
        iconCls: 'grey'
      });

      containerElement = Origo.ui.Element({
        cls: 'o-search o-search-false flex row align-center padding-right-small width-full',
        innerHTML: `<input id="hjl" class="o-search-field form-control text-grey-darker" type="text" placeholder="${hintText}"></input>`
      });

      searchLayoutElement = Origo.ui.Element({
        cls: 'siteplan-search-layout relative top-center',
        style: {
          'z-index': 1,
          width: '80%',
          'max-width': '960px'
        }
      });

      wrapperElement = Origo.ui.Element({
        cls: 'o-search-wrapper relative rounded-larger box-shadow bg-white',
        style: {
          'flex-wrap': 'wrap',
          overflow: 'visible',
          width: '100%'
        }
      });

      advancedMapLinkElement = advancedMapButton && advancedMapButton.url ? Origo.ui.Element({
        cls: 'advanced-map-link-container width-full text-align-center',
        innerHTML: `<a href="${advancedMapButton.url}" target="${advancedMapButton.target || '_blank'}" rel="noopener noreferrer" class="advanced-map-link" title="${advancedMapButton.title || 'Öppna avancerad karta'}"><span class="advanced-map-link-icon" aria-hidden="true">${advancedMapIcon}</span><span class="text">${advancedMapButton.text || 'Till avancerad karta'}</span></a>`
      }) : undefined;

      headerElement = Origo.ui.Element({
        cls: 'relative width-full text-large text-white text-align-center margin-x-auto',
        innerHTML: headerText,
        style: {
          'padding-top': 'calc(16px + 2%)',
          'font-size': 'calc(32px + 2.5vw)',
          'font-weight': 400,
          'font-family': 'Josefin Sans, Arial, sans-serif',
          'line-height': 1
        }
      });

      curtainElement = Origo.ui.Element({
        cls: 'absolute height-full width-full no-margin z-index-high',
        style: {
          'background-color': '#000',
          'background-image': `url(${backgroundImageUrl})`,
          'background-position': 'center top',
          'background-repeat': 'no-repeat',
          'background-size': 'auto 100%',
          'background-attachment': 'fixed'
        }
      });
    },

    render() {
      let htmlString;
      let el;

      const hasInitialQuery = new URLSearchParams(window.location.search).has(siteplanQueryParameter);
      if (hasInitialQuery) {
        setInitialQueryLoading(true);
      }

      const mapEl = document.getElementById(viewer.getId());

      htmlString = curtainElement.render();
      el = Origo.ui.dom.html(htmlString);
      mapEl.appendChild(el);

      htmlString = headerElement.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(curtainElement.getId()).appendChild(el);

      htmlString = searchLayoutElement.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(curtainElement.getId()).appendChild(el);

      htmlString = wrapperElement.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(searchLayoutElement.getId()).appendChild(el);

      htmlString = containerElement.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(wrapperElement.getId()).appendChild(el);

      htmlString = searchButton.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(containerElement.getId()).appendChild(el);

      htmlString = closeButton.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(containerElement.getId()).appendChild(el);

      if (advancedMapLinkElement) {
        htmlString = advancedMapLinkElement.render();
        el = Origo.ui.dom.html(htmlString);
        document.getElementById(searchLayoutElement.getId()).appendChild(el);
      }

      initAutocomplete();
      bindUIActions();
      const initialQuerySearch = runInitialQuerySearch();
      if (initialQuerySearch) {
        initialQuerySearch.finally(() => setInitialQueryLoading(false));
      }

      this.dispatch('render');
    }
  });
};

export default Search;
