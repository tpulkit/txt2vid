import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings } from '../../components';

const Home = () => {
  const [open, setOpen] = useState(true);
  return <>
    <h1>Home</h1>
    <Link to="call/test">Join test room</Link>
    <Settings open={open} onClose={() => setOpen(false)} />
  </>
};

export default Home;