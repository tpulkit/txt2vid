import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'rmwc';
import { useGlobalState } from '../../util';

const Home = () => {
  const [showSettings, setShowSettings] = useGlobalState('showSettings');
  return <>
    <h1>Home</h1>
    <Link to="call/test">Join test room</Link>
    <Button label="Open Settings" onClick={() => setShowSettings(true)} />
  </>
};

export default Home;