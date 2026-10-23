
import { Routes, Route, Navigate } from "react-router-dom";

import Home from "./Home";
import PropertyDetails from "./PropertyDetails";
import MyBookings from "./MyBookings";
import Wishlist from "./Wishlist";
import Login from "./Login";
import Signup from "./Signup";
import HostDashboard from "./HostDashboard";

import { WishlistProvider } from "./WishlistContext";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route
        path="/property/:id"
        element={<PropertyDetails />}
      />

      <Route
        path="/my-bookings"
        element={<MyBookings />}
      />

      <Route
        path="/wishlist"
        element={<Wishlist />}
      />

      <Route path="/login" element={<Login />} />

      <Route path="/signup" element={<Signup />} />

      <Route
        path="/host-dashboard"
        element={<HostDashboard />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

function App() {
  return (
    <WishlistProvider>
      <AppRoutes />
    </WishlistProvider>
  );
}

export default App;
