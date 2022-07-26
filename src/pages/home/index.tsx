import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Theme } from 'rmwc';
import { useGlobalState } from '../../util';

const Home = () => {
  const [showSettings, setShowSettings] = useGlobalState('showSettings');
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <h1>Home (WIP)</h1>
    <Theme use="textPrimaryOnBackground" wrap><Link to="call/test" style={{ marginBottom: '3rem' }}>Join test room</Link></Theme>
    <Button label="Open Settings" onClick={() => setShowSettings(true)} />
  </div>
};

export default Home;