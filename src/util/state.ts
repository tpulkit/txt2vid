import createState from 'react-universal-state';

const { hook: useGlobalState } = createState({
  voiceID: ''
}, true);

export { useGlobalState };