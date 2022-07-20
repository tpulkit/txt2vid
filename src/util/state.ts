import createState from 'react-universal-state';

const { hook: useGlobalState } = createState({
  ttsID: '..',
  username: 'Guest' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
}, true);

export { useGlobalState };