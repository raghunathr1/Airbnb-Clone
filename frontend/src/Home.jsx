import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { FaAirbnb } from "react-icons/fa";
import {
  FiSearch,
  FiHeart,
  FiMap,
  FiGrid,
  FiMapPin,
  FiUsers,
  FiMenu,
  FiX,
  FiSliders,
  FiDollarSign,
  FiArrowRight,
  FiHome,
  FiLogOut,
} from "react-icons/fi";

import "./App.css";

import API_URL from "./api";
import PropertyMap from "./PropertyMap";
import Footer from "./Footer";
import { useWishlist } from "./WishlistContext";

const CATEGORIES = [
  "All",
  "Amazing views",
  "Beachfront",
  "Cabins",
  "Countryside",
];

// Read the saved authentication token.
const getStoredToken = () => {
  return (
    localStorage.getItem("token") || localStorage.getItem("airbnb-token") || ""
  );
};

// Read the saved user's information.
const getSavedUser = () => {
  try {
    const saved =
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser") ||
      localStorage.getItem("airbnb-user");

    if (!saved) {
      return null;
    }

    const parsed = JSON.parse(saved);

    return parsed?.user || parsed?.data?.user || parsed;
  } catch (error) {
    console.error("Could not read saved user:", error);
    return null;
  }
};

// Remove all supported authentication keys.
const clearStoredAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("airbnb-token");
  localStorage.removeItem("airbnb-user");
};

function Home() {
  const navigate = useNavigate();
  const { toggleWishlist, isWishlisted } = useWishlist();

  // Property data.
  const [properties, setProperties] = useState([]);

  // Search and filters.
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minGuests, setMinGuests] = useState("1");

  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Loading and error state.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Authentication state.
  const [currentUser, setCurrentUser] = useState(getSavedUser);
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(getStoredToken()),
  );

  // Fetch property listings from the backend.
  useEffect(() => {
    const controller = new AbortController();

    const fetchProperties = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axios.get(`${API_URL}/listings`, {
          signal: controller.signal,
        });

        setProperties(
          Array.isArray(response.data?.listings) ? response.data.listings : [],
        );
      } catch (err) {
        if (err.code === "ERR_CANCELED" || err.name === "CanceledError") {
          return;
        }

        console.error("Fetch properties error:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load properties. Please check your backend connection.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProperties();

    return () => {
      controller.abort();
    };
  }, [retryCount]);

  // Sync account information when the browser window gets focus.
  useEffect(() => {
    const syncAccount = () => {
      setIsAuthenticated(Boolean(getStoredToken()));
      setCurrentUser(getSavedUser());
    };

    syncAccount();

    window.addEventListener("focus", syncAccount);

    return () => {
      window.removeEventListener("focus", syncAccount);
    };
  }, []);

  // Logout the current user.
  const handleLogout = () => {
    clearStoredAuth();
    setCurrentUser(null);
    setIsAuthenticated(false);

    navigate("/", {
      replace: true,
    });
  };

  // Filter properties using the current search and filter values.
  const filteredProperties = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return properties.filter((property) => {
      const title = (property.title || "").toLowerCase();

      const description = (property.description || "").toLowerCase();

      const location = (property.location || "").toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        location.includes(normalizedSearch);

      const matchesCategory =
        selectedCategory === "All" || property.category === selectedCategory;

      const price = Number(property.price) || 0;
      const guests = Number(property.guests) || 0;

      const matchesMinPrice = minPrice === "" || price >= Number(minPrice);

      const matchesMaxPrice = maxPrice === "" || price <= Number(maxPrice);

      const matchesGuests = guests >= Math.max(1, Number(minGuests) || 1);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesGuests
      );
    });
  }, [properties, search, selectedCategory, minPrice, maxPrice, minGuests]);

  // Open the selected property's details page.
  const openProperty = (propertyId) => {
    navigate(`/property/${propertyId}`);
  };

  // Clear all applied filters.
  const resetFilters = () => {
    setSearch("");
    setSelectedCategory("All");
    setMinPrice("");
    setMaxPrice("");
    setMinGuests("1");
  };

  return (
    <div className="app-container">
      {/* NAVBAR */}
      <header className="navbar">
        <Link to="/" className="logo">
          <FaAirbnb />
          <span>StayFinder</span>
        </Link>

        <form
          className="search-bar"
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search destinations or properties"
            aria-label="Search destinations or properties"
          />

          <button type="submit" aria-label="Search properties">
            <FiSearch />
          </button>
        </form>

        <nav className="navbar-actions">
          <Link to="/wishlist" aria-label="Wishlist">
            <FiHeart />
            <span>Wishlist</span>
          </Link>

          <Link to="/my-bookings" className="bookings-nav-link">
            My Bookings
          </Link>

          <Link to="/host-dashboard">
            {isAuthenticated ? "Host Dashboard" : "Become a Host"}
          </Link>

          {isAuthenticated ? (
            <>
              <div
                className="account-greeting"
                title={currentUser?.email || ""}
              >
                <span className="account-avatar">
                  {(currentUser?.name || currentUser?.email || "U")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </span>

                <span className="account-name">
                  {currentUser?.name || currentUser?.email || "Logged in"}
                </span>
              </div>

              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
              >
                <FiLogOut />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="profile-menu" aria-label="Login">
              <FiMenu />
              <span>Login</span>
            </Link>
          )}
        </nav>
      </header>

      {/* CATEGORY FILTERS */}
      <section className="categories-section">
        <div className="categories">
          {CATEGORIES.map((category) => (
            <button
              type="button"
              key={category}
              className={
                selectedCategory === category
                  ? "category-item active"
                  : "category-item"
              }
              onClick={() => setSelectedCategory(category)}
            >
              <span>{category}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="filter-button"
          onClick={() => setShowFilters((previous) => !previous)}
          aria-expanded={showFilters}
        >
          {showFilters ? <FiX /> : <FiSliders />}
          Filters
        </button>
      </section>

      {/* ADVANCED FILTERS */}
      {showFilters && (
        <section className="advanced-filters">
          <div className="advanced-filter-field">
            <label htmlFor="minPrice">
              <FiDollarSign />
              Minimum price per night
            </label>

            <input
              id="minPrice"
              type="number"
              min="0"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="No minimum"
            />
          </div>

          <div className="advanced-filter-field">
            <label htmlFor="maxPrice">
              <FiDollarSign />
              Maximum price per night
            </label>

            <input
              id="maxPrice"
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="No maximum"
            />
          </div>

          <div className="advanced-filter-field">
            <label htmlFor="minGuests">
              <FiUsers />
              Minimum guests
            </label>

            <input
              id="minGuests"
              type="number"
              min="1"
              step="1"
              value={minGuests}
              onChange={(event) => setMinGuests(event.target.value)}
            />
          </div>

          <button
            type="button"
            className="reset-filters-button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </section>
      )}

      {/* MAIN CONTENT */}
      <main className="home-content">
        <div className="results-heading">
          <div>
            <h1>Find your next stay</h1>

            <p>
              {loading
                ? "Loading properties..."
                : `${filteredProperties.length} ${
                    filteredProperties.length === 1 ? "property" : "properties"
                  } available`}
            </p>
          </div>

          <button
            type="button"
            className="map-toggle-button"
            onClick={() => setShowMap((previous) => !previous)}
          >
            {showMap ? <FiGrid /> : <FiMap />}
            {showMap ? "Show listings" : "Show map"}
          </button>
        </div>

        {/* ERROR AND RETRY */}
        {error && (
          <div className="error-message" role="alert">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {/* LOADING, MAP AND PROPERTY LIST */}
        {loading ? (
          <div className="loading-state">
            <p>Finding your next stay...</p>
          </div>
        ) : (
          <>
            {showMap ? (
              <section className="property-map-view">
                {filteredProperties.length > 0 ? (
                  <PropertyMap
                    properties={filteredProperties}
                    onPropertyClick={openProperty}
                  />
                ) : (
                  <div className="empty-state">
                    <FiMapPin />
                    <h2>No properties to display</h2>
                    <p>Try changing your search or filters.</p>
                  </div>
                )}
              </section>
            ) : (
              <section className="property-grid">
                {filteredProperties.map((property) => {
                  const propertyId = property._id;
                  const saved = isWishlisted(propertyId);

                  return (
                    <article key={propertyId} className="property-card">
                      <div className="property-image-container">
                        <button
                          type="button"
                          className="property-image-button"
                          onClick={() => openProperty(propertyId)}
                          aria-label={`View ${property.title}`}
                        >
                          <img
                            src={property.image}
                            alt={property.title}
                            className="property-image"
                            loading="lazy"
                          />
                        </button>

                        <button
                          type="button"
                          className={
                            saved
                              ? "wishlist-button wishlisted"
                              : "wishlist-button"
                          }
                          onClick={() => toggleWishlist(property)}
                          aria-label={
                            saved ? "Remove from wishlist" : "Add to wishlist"
                          }
                          title={
                            saved ? "Remove from wishlist" : "Add to wishlist"
                          }
                        >
                          <FiHeart />
                        </button>

                        {property.category && (
                          <span className="property-category-badge">
                            {property.category}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="property-card-details"
                        onClick={() => openProperty(propertyId)}
                      >
                        <div className="property-card-heading">
                          <h2>{property.title}</h2>

                          {Number(property.rating) > 0 && (
                            <span className="property-rating">
                              ★ {Number(property.rating).toFixed(1)}
                            </span>
                          )}
                        </div>

                        <p className="property-location">
                          <FiMapPin />
                          {property.location}
                        </p>

                        <p className="property-description">
                          {property.description}
                        </p>

                        <div className="property-info">
                          <span>
                            <FiHome />
                            {property.bedrooms} bedrooms
                          </span>

                          <span>
                            <FiUsers />
                            {property.guests} guests
                          </span>
                        </div>

                        <p className="property-price">
                          <strong>
                            ₹{Number(property.price).toLocaleString("en-IN")}
                          </strong>

                          <span> / night</span>
                        </p>

                        <span className="view-property-link">
                          View details <FiArrowRight />
                        </span>
                      </button>
                    </article>
                  );
                })}
              </section>
            )}

            {!showMap && filteredProperties.length === 0 && (
              <div className="empty-state">
                <FiSearch />
                <h2>No properties found</h2>
                <p>Try another destination or adjust your filters.</p>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="reset-filters-button"
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* SEPARATE FOOTER COMPONENT */}
      <Footer />
    </div>
  );
}

export default Home;
