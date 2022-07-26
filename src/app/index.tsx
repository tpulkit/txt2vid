import { useEffect, useState, useRef } from 'react';
import { ThemeProvider, RMWCProvider, DialogQueue, Theme, SnackbarQueue, DialogQueueInput } from 'rmwc';
import '@rmwc/theme/styles';
import '@rmwc/button/styles';
import '@rmwc/tabs/styles';
import '@rmwc/textfield/styles';
import '@rmwc/dialog/styles';
import '@rmwc/snackbar/styles';
import '@rmwc/icon/styles';
import '@rmwc/select/styles';
import '@rmwc/checkbox/styles';
import '@rmwc/switch/styles';
import '@rmwc/circular-progress/styles';
import '@rmwc/tooltip/styles';
import '@rmwc/typography/styles';
import '@rmwc/radio/styles';
import { lightTheme, darkTheme, dialogs, messages, useGlobalState, mlInit, alert, themePreference, needsNewID } from '../util';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home, Call, StartCall } from '../pages';
import Settings from './settings';
import Loading from './loading';
import './index.css';

const App = () => {
  const [loadState, setLoadState] = useState(0);
  const [showSettings, setShowSettings] = useGlobalState('showSettings');
  const [darkMode, setDarkMode] = useGlobalState('darkMode');
  const [ttsID, setTTSID] = useGlobalState('ttsID');
  useEffect(() => {
    Promise.all([mlInit, needsNewID()]).then(([_, requestNewID]) => {
      setLoadState(requestNewID ? !ttsID ? 1 : 2 : ttsID == '..' ? 2 : 3);
      if (requestNewID) setTTSID('..');
    });
    const tcb = themePreference.on('darkMode', setDarkMode);
    return () => themePreference.off('darkMode', tcb);
  }, []);
  useEffect(() => {
    if (loadState && loadState < 3) {
      const prompt: Partial<DialogQueueInput> = loadState < 2 ? {
        title: 'Welcome to Txt2Vid!',
        body: 'This is a demo of the Txt2Vid platform. Please configure your resemble.ai credentials and username on the settings page to start.'
      } : {
        title: 'Credentials expired',
        body: 'Your resemble.ai credentials have expired. Please reconfigure them to start.'
      };
      const { title, body, ...rest } = prompt;
      alert({
        ...rest,
        title: <Theme use="onSurface">{title}</Theme>,
        body: <Theme use="onSurface">{body}</Theme>,
        preventOutsideDismiss: true
      }).then(() => {
        setShowSettings(true);
      });
    }
  }, [loadState]);
  return (
    <ThemeProvider options={darkMode ? darkTheme : lightTheme} theme={['background', 'textPrimaryOnBackground']} style={{
      minHeight: '100vh'
    }}>
      <RMWCProvider tooltip={{ showArrow: true }}>
        <SnackbarQueue messages={messages} />
        <DialogQueue dialogs={dialogs} />
        {loadState ? <BrowserRouter>
          <Settings open={showSettings} onClose={() => setShowSettings(false)} />
          <Routes>
            <Route path="/">
              <Route index element={<Home />} />
              <Route path="call">
                <Route index element={<StartCall />} />
                <Route path=":roomID" element={<Call />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter> : <Loading />}
      </RMWCProvider>
    </ThemeProvider>
  );
};

export default App;
