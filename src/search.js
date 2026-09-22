/* eslint-disable no-alert */

import Origo from 'Origo';
import Awesomplete from 'awesomplete';

const Search = function Search(options = {}) {
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
    idAttribute,
    layerNameAttribute,
    layerName,
    title,
    titleAttribute,
    contentAttribute,
    groupSuggestions,
    includeSearchableLayers,
    searchableDefault,
    maxZoomLevel,
    limit,
    hintText,
    minLength
  } = options;

  const {
    geometryAttribute,
    urlAdress,
    urlFastighet,
    urlYta,
    queryParameterName = 'q',
    queryPrefix = '',
    backgroundImageUrl,
    allowOversize = false,
    defaultSize = 'a4',
    printMargins = {
      topBottom: 30,
      leftRight: 30
    },
    iosOversizeInfoContent = '<div><p>Fastigheten är för stor för att rymmas i utskriften. Testa att flytta kartan manuellt så att aktuellt område visas på bästa sätt.</p><br><p>Notera att IOS-enheter endast tillåter utskrifter i A4-storlek. Prova därför att göra utskriften på en stationär enhet.</p></div>',
    oversizeInfoContent = '<div><p>Fastigheten är för stor för att rymmas i utskriften. Testa att flytta kartan manuellt så att aktuellt område visas på bästa sätt.</p></div>'
  } = options;

  let searchDb = {};
  let map;
  let overlay;
  let awesomplete;
  let viewer;
  let featureInfo;
  let searchButton;
  let closeButton;
  let containerElement;
  let wrapperElement;
  let curtainElement;
  let headerElement;
  let vectorSource;
  let sizes;
  let printResolution;

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

  function resolutionToScale(resolution, projection, dpi) {
    // const dpi = 25.4 / 0.28;
    const mpu = projection.getMetersPerUnit();
    let scale = resolution * mpu * 39.37 * dpi;
    scale = Math.round(scale);
    return scale;
  }

  function scaleToResolution(scale, projection) {
    const dpi = 25.4 / 0.28;
    const mpu = projection.getMetersPerUnit();
    const resolution = scale / (mpu * 39.37 * dpi);
    return resolution;
  }

  function getClosestScale(target, printScales) {
    const scales = printScales.map(scale => parseInt(scale.split(':')[1], 10));
    return scales.reduce((prev, curr) => (Math.abs(curr - target) < Math.abs(prev - target) && curr > target ? curr : prev));
  }

  function checkExtentSize(extent, printScales) {
    const extentWidth = extent[2] - extent[0];
    const extentHeight = extent[3] - extent[1];
    let printSize;
    let pageSize;
    let closestResolution;

    const featureOrientation = extentWidth / extentHeight >= 1 ? 'landscape' : 'portrait';
    const pixelRatio = isOnIos ? 1 : window.devicePixelRatio;
    const screenDPI = printResolution * pixelRatio;

    for (let i = 0; i < sizes.length; i += 1) {
      if (featureOrientation === 'landscape') {
        printSize = [Math.round(((sizes[i].size[1] - margins.leftRight) * screenDPI) / 25.4 / pixelRatio), Math.round(((sizes[i].size[0] - margins.topBottom) * screenDPI) / 25.4 / pixelRatio)];
      } else {
        printSize = [Math.round(((sizes[i].size[0] - margins.leftRight) * screenDPI) / 25.4 / pixelRatio), Math.round(((sizes[i].size[1] - margins.topBottom) * screenDPI) / 25.4 / pixelRatio)];
      }

      const resolutionForExtent = map.getView().getResolutionForExtent(extent, printSize);
      const scaleForExtent = resolutionToScale(resolutionForExtent, map.getView().getProjection(), screenDPI);
      const closestScale = getClosestScale(scaleForExtent, printScales);
      closestResolution = scaleToResolution(closestScale, map.getView().getProjection());
      pageSize = sizes[i].name;

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

  function showFeature(features, objTitle, content, pointCoords) { // Rename function?
    const obj = {};
    obj.feature = features[0];
    obj.title = objTitle;
    obj.content = content;
    clear();

    vectorSource = new Origo.ol.source.Vector();
    const vectorLayer = new Origo.ol.layer.Vector({
      source: vectorSource,
      style: Origo.Style.createStyle({ style: 'selection', viewer })
    });
    vectorLayer.set('name', 'lmsearch');
    vectorLayer.set('group', 'none');
    map.addLayer(vectorLayer);

    vectorSource.addFeature(features[0]);

    const geom = features[0].getGeometry();
    const printControl = viewer.getControlByName('print');
    printResolution = printControl.getPrintResolution();

    const target = checkExtentSize(geom.getExtent(), printControl.getPrintOptions().scales);
    title = obj.feature.get('name').split('Enhetsområde')[0].trim().split(' ').slice(1).join(' ');

    if (target) {
      if (target.oversize && !allowOversize) {
        alert('Fastigheten är för stor. Vänligen kontakta kommunens mätningsavdelning');
      } else {
        map.getLayers().forEach((layer) => {
          if (layer.get('inPrint')) { layer.setVisible(true); }
        });
        const fitGeom = target.oversize ? new Origo.ol.geom.Point(pointCoords) : geom;
        Origo.showLoading();
        map.getView().fit(fitGeom, {
          padding: [0, 0, 0, 0]
        });
        map.getView().setResolution(target.closestResolution);
        printControl.renderPrintComponent({
          mapInteractionsActive: target.oversize,
          orientation: target.featureOrientation,
          size: target.pageSize,
          filename: title.replace(' ', '_').replace(':', '_'),
          title
        });
        map.once('rendercomplete', () => {
          Origo.hideLoading();
          setTimeout(() => {
            if (target.oversize) {
              const modal = Origo.ui.Modal({
                title: 'OBS!',
                content: isOnIos ? iosOversizeInfoContent : oversizeInfoContent,
                target: viewer.getId(),
                style: 'max-width: 94%;'
              });
              viewer.addComponent(modal);
            }
          }, 300);
        });
      }
    } else {
      alert('Ett problem uppstod. Vänligen kontakta kommunens mätningsavdelning.');
    }
  }

  function getRelatedProperty(relatedPropertyId) {
    const fetchUrl = options.urlYta.replace('objectId', relatedPropertyId);
    return fetch(fetchUrl);
  }

  function selectHandler(evt) {
    const id = evt.text.label;
    const data = searchDb[id];
    let content;

    getRelatedProperty(data.relatedProperty)
      .then(response => response.json())
      .then((propertyData) => {
        const format = new Origo.ol.format.GeoJSON();
        const features = format.readFeatures(propertyData, { dataProjection: 'EPSG:3006' });

        const property = features.filter(prop => prop.getGeometry().intersectsCoordinate(data.coordinates));

        showFeature(property, data[titleAttribute], content, data.coordinates);
      });
  }

  function setSearchDb(data) {
    data.forEach((item) => {
      const dataItem = {};
      dataItem.label = item[options.idIndex];
      dataItem.value = item[options.valueIndex].trim();
      dataItem.coordinates = [item[options.eastingIndex], item[options.northingIndex]];
      dataItem.relatedProperty = item[options.relatedPropteryIndex];
      searchDb[item[options.idIndex]] = dataItem;
    });
  }

  function setParcelSearchDb(data) {
    const features = Array.isArray(data) ? data : data.features || [];
    features.forEach((feature, index) => {
      const { geometry, properties } = feature;
      if (!geometry || !properties || !geometry.coordinates) return;

      const label = `parcel-${properties.id}-${index}`;
      const dataItem = {};
      dataItem.label = label;
      dataItem.value = [properties.name, properties.municipality].filter(Boolean).join(', ');
      dataItem.coordinates = [geometry.coordinates[1], geometry.coordinates[0]];
      dataItem.relatedProperty = properties.id;
      searchDb[label] = dataItem;
    });
  }

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

  function groupDb(data) {
    const group = {};
    const ids = Object.keys(data);
    ids.forEach((id) => {
      const item = data[id];
      let typeTitle;
      if (layerNameAttribute && idAttribute) {
        typeTitle = viewer.getLayer(item[layerNameAttribute]).get('title');
      } else if (geometryAttribute && layerName) {
        typeTitle = viewer.getLayer(item[layerName]).get('title');
      } else if (titleAttribute && contentAttribute && geometryAttribute) {
        typeTitle = item[titleAttribute];
      } else if (geometryAttribute && title) {
        typeTitle = title;
      } else if (easting && northing && title) {
        typeTitle = title;
      }
      if (typeTitle && typeTitle in group === false) {
        group[typeTitle] = [];
        item.header = typeTitle;
      }
      if (typeTitle) {
        group[typeTitle].push(item);
      } else if (id === 0) {
        console.error('Search options are missing');
      }
    });
    return group;
  }

  function groupToList(group) {
    const types = Object.keys(group);
    let list = [];
    const selection = {};
    let nr = 0;
    let turn = 0;

    const groupList = () => {
      types.slice().forEach((type) => {
        if (nr < limit) {
          const item = group[type][turn];
          if (type in selection === false) {
            selection[type] = [];
          }
          selection[type][turn] = item;
          if (!group[type][turn + 1]) {
            types.splice(types.indexOf(type), 1);
          }
        }
        nr += 1;
      });
      turn += 1;
    };

    while (nr < limit && types.length) {
      groupList();
    }
    list = Object.keys(selection).reduce((previous, currentGroup) => previous.concat(selection[currentGroup]), []);
    return list;
  }

  /*
  The label property in Awesomplete is used to store the feature id. This way the properties
  of each feature in the search response will be available in event handling.
  The complete properties are stored in a tempory db called searchDb. This is a workaround
  for a limit in Awesomplete that can only store data in the fields label and text.
  The data-category attribute is used to make a layer division in the sugguestion list.
  */

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
        if (name && groupSuggestions) {
          list = groupToList(groupDb(searchDb));
        } else {
          list = dbToList();
        }
        awesomplete.list = list;
        awesomplete.evaluate();
      }
    };

    function getQueryUrl(searchUrl, query) {
      let queryUrl = `${searchUrl}${searchUrl.indexOf('?') !== -1 ? '&' : '?'}${queryParameterName}=${encodeURI(query)}`;
      if (includeSearchableLayers) {
        queryUrl += `&l=${viewer.getSearchableLayers(searchableDefault)}`;
      }
      return queryUrl;
    }

    function makeRequest(reqHandler, obj) {
      const query = `${queryPrefix} ${obj.value}`;
      const addressRequest = fetch(getQueryUrl(urlAdress, query))
        .then(response => response.json());
      const parcelRequest = urlFastighet
        ? fetch(getQueryUrl(urlFastighet, query)).then(response => response.json())
        : Promise.resolve([]);

      Promise.all([addressRequest, parcelRequest])
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
    onAdd(evt) {
      viewer = evt.target;
      featureInfo = viewer.getControlByName('featureInfo');
      name = options.searchAttribute;
      if (!northing) northing = undefined;
      if (!easting) easting = undefined;
      /** idAttribute in combination with layerNameAttribute
     must be defined if search result should be selected */
      idAttribute = options.idAttribute;
      if (!layerNameAttribute) layerNameAttribute = undefined;
      if (!layerName) layerName = undefined;
      if (!title) title = '';
      if (!titleAttribute) titleAttribute = undefined;
      if (!contentAttribute) contentAttribute = undefined;
      groupSuggestions = Object.prototype.hasOwnProperty.call(options, 'groupSuggestions') ? options.groupSuggestions : false;
      includeSearchableLayers = Object.prototype.hasOwnProperty.call(options, 'includeSearchableLayers') ? options.includeSearchableLayers : false;
      searchableDefault = Object.prototype.hasOwnProperty.call(options, 'searchableDefault') ? options.searchableDefault : false;
      if (!maxZoomLevel) maxZoomLevel = viewer.getResolutions().length - 2 || viewer.getResolutions();
      if (!limit) limit = 9;
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
        cls: 'o-search o-search-false flex row align-center padding-right-small',
        innerHTML: `<input id="hjl" class="o-search-field form-control text-grey-darker" type="text" placeholder="${hintText}"></input>`
      });

      wrapperElement = Origo.ui.Element({
        cls: 'o-search-wrapper relative top-center rounded-larger box-shadow bg-white',
        style: {
          'flex-wrap': 'wrap',
          overflow: 'visible',
          'z-index': 1,
          width: '80%',
          'max-width': '960px'
        }
      });

      headerElement = Origo.ui.Element({
        cls: 'relavtive width-full text-large text-white text-align-center margin-x-auto',
        innerHTML: 'TOMTKARTA',
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

      const mapEl = document.getElementById(viewer.getId());

      htmlString = curtainElement.render();
      el = Origo.ui.dom.html(htmlString);
      mapEl.appendChild(el);

      htmlString = headerElement.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(curtainElement.getId()).appendChild(el);

      htmlString = wrapperElement.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(curtainElement.getId()).appendChild(el);

      htmlString = containerElement.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(wrapperElement.getId()).appendChild(el);

      htmlString = searchButton.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(containerElement.getId()).appendChild(el);

      htmlString = closeButton.render();
      el = Origo.ui.dom.html(htmlString);
      document.getElementById(containerElement.getId()).appendChild(el);

      initAutocomplete();
      bindUIActions();

      this.dispatch('render');
    }
  });
};

export default Search;
