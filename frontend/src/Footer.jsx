
import { Link } from "react-router-dom";
import { FaAirbnb } from "react-icons/fa";

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-brand">
        <Link to="/" className="footer-logo">
          <FaAirbnb />
          <span>StayFinder</span>
        </Link>
      </div>

      <p>
        © {new Date().getFullYear()} StayFinder. All rights reserved.
      </p>

      <div className="footer-links">
        <Link to="/">Explore stays</Link>
        <Link to="/wishlist">Wishlist</Link>
        <Link to="/my-bookings">My Bookings</Link>
      </div>
    </footer>
  );
}

export default Footer;
