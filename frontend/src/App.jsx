import { Routes, Route } from "react-router";
import Test from "./pages/Test.jsx";
import Home from "./pages/Home.jsx";
import SeatingMap from "./pages/SeatingMap.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Navbar from "./components/navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PaymentSuccess from "./pages/PaymentSuccess.jsx";
import CinemaPage from "./pages/CinemaPage.jsx";
import OwnerDashboard from "./pages/OwnerDashboard.jsx";
import Profile from "./pages/Profile.jsx";

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<Test />} />
        <Route path="/seatingmap/:id" element={<SeatingMap />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oulu" element={<CinemaPage city="Oulu" />} />
        <Route path="/tampere" element={<CinemaPage city="Tampere" />} />

        {/* käyttäjät */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* omistaja */}
        <Route element={<ProtectedRoute roles={["owner"]} />}>
          <Route path="/owner" element={<OwnerDashboard />} />
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
