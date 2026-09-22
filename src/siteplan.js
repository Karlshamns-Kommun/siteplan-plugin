import Search from './search';

const Siteplan = function Siteplan(viewer, options = {}) {
  const search = Search(options);
  viewer.addComponent(search);
};

export default Siteplan;
