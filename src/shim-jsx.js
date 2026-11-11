const R = window.React;
const mk = (t, p, k) => R.createElement(t, k === undefined ? p : Object.assign({}, p, { key: k }));
exports.jsx = mk; exports.jsxs = mk; exports.Fragment = R.Fragment;
