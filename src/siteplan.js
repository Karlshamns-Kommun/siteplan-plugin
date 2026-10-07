import Search from './search';

const Siteplan = function Siteplan(viewerOrOptions = {}, options = {}) {
  const viewer = viewerOrOptions && typeof viewerOrOptions.addComponent === 'function' ? viewerOrOptions : undefined;
  const search = Search(viewer ? options : viewerOrOptions);
  if (viewer) viewer.addComponent(search);
  return search;
};

export default Siteplan;
