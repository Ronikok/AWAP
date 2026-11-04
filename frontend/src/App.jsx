import { Routes, Route } from "react-router";
import Test from "./pages/Test.jsx";
import Home from "./pages/Home.jsx";
import Navbar from "./components/navbar.jsx";

function App() {
  return (
    <>
      <Navbar />  
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<Test />} />
      </Routes>
    </>
  );
}

export default App;
