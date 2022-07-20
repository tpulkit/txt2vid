import { useEffect, useState, useRef } from 'react';
import { ThemeProvider, RMWCProvider, DialogQueue, Portal } from 'rmwc';
import '@rmwc/textfield/styles';
import '@rmwc/dialog/styles';
import '@rmwc/typography/styles';
import { theme, dialogs } from '../util';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home, Call, StartCall } from '../pages';

const App = () => {
  return (
    <ThemeProvider options={theme}>
      <RMWCProvider>
        <DialogQueue dialogs={dialogs} />
        <Portal />
        <BrowserRouter>
          <Routes>
            <Route path="/">
               <Route index element={<Home />} />
              <Route path="call">
                <Route index element={<StartCall />} />
                <Route path=":roomID" element={<Call />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </RMWCProvider>
    </ThemeProvider>
  );
};

export default App;
