import { useEffect, useState, useRef } from 'react';
import { ThemeProvider, RMWCProvider, DialogQueue, Portal } from 'rmwc';
import '@rmwc/theme/styles';
import '@rmwc/button/styles';
import '@rmwc/tabs/styles';
import '@rmwc/textfield/styles';
import '@rmwc/dialog/styles';
import '@rmwc/typography/styles';
import '@rmwc/select/styles';
import '@rmwc/circular-progress/styles';
import { lightTheme, darkTheme, dialogs, useGlobalState, mlInit, alert } from '../util';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Home, Call, StartCall } from '../pages';
import Settings from './settings';
import Loading from './loading';

const App = () => {
  const [loaded, setLoaded] = useState(false);
  const [showSettings, setShowSettings] = useGlobalState('showSettings');
  const [ttsID] = useGlobalState('ttsID');
  useEffect(() => {
    mlInit.then(() => setLoaded(true))
  }, []);
  useEffect(() => {
    if (loaded && !ttsID) {
      alert({
        title: 'Welcome to Txt2Vid!',
        body: 'This is a demo of the Txt2Vid platform. Please configure your resemble.ai credentials and username on the settings page to start.',
        preventOutsideDismiss: true
      }).then(() => {
        setShowSettings(true);
      });
    } else if (loaded) {
      // TEMP
      setShowSettings(true);
    }
  }, [loaded, ttsID]);
  return (
    <ThemeProvider options={lightTheme}>
      <RMWCProvider>
        <Portal />
        <DialogQueue dialogs={dialogs} />
        <Settings open={showSettings} onClose={() => setShowSettings(false)} />
        {loaded ? <BrowserRouter>
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
