import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGlobalState } from '../../util';

const Home = () => {
  return <>
    <h1>Home</h1>
    <Link to="call/test">Join test room</Link>
  </>
};

export default Home;