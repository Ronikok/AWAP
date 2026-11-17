import { Routes, Route } from "react-router";
import Test from "./pages/Test.jsx";
import Home from "./pages/Home.jsx";
import SeatingMap from "./pages/SeatingMap.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Navbar from "./components/navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<Test />} />
        <Route path="/seatingmap/:id" element={<SeatingMap />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* käyttäjät */}
        <Route element={<ProtectedRoute />}>
          {/* e.g. <Route path="/my-reservations" element={<MyReservations />} /> */}
        </Route>

        {/* henkilökunta */}
        <Route element={<ProtectedRoute roles={["employee", "owner"]} />}>
          {/* e.g. <Route path="/admin" element={<Admin />} /> */}
        </Route>
      </Routes>
    </>
  );
}

export default App;
