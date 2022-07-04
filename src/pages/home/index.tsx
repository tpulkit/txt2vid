import { Link } from 'react-router-dom';

const Home = () => {
  return <>
    <h1>Home</h1>
    <Link to="call/test">Join test room</Link>
  </>
};

export default Home;