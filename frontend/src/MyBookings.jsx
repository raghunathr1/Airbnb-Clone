
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import {
  FiArrowLeft,
  FiCalendar,
  FiUsers,
  FiMapPin,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiHome,
  FiLogIn,
  FiXCircle,
  FiX,
  FiClock,
  FiChevronRight,
  FiRefreshCw,
} from "react-icons/fi";

import "./MyBookings.css";
import API_BASE_URL from "./api";

const API_URL = `${API_BASE_URL}/bookings`;

const getAuthToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("airbnb-token") ||
  "";

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("airbnb-token");
  localStorage.removeItem("airbnb-user");
};

function MyBookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [activeFilter, setActiveFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch the logged-in user's bookings.
  const fetchBookings = useCallback(async () => {
    const token = getAuthToken();

    if (!token) {
      setIsAuthenticated(false);
      setBookings([]);
      setLoading(false);
      setError("");
      return;
    }

    setIsAuthenticated(true);
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = response.data?.data ?? response.data;

      const fetchedBookings = Array.isArray(payload?.bookings)
        ? payload.bookings
        : Array.isArray(payload)
          ? payload
          : null;

      if (!fetchedBookings) {
        throw new Error(
          "Invalid bookings response received from the server."
        );
      }

      setBookings(fetchedBookings);
      setError("");
    } catch (err) {
      console.error("Fetch bookings error:", err);

      if (err.response?.status === 401) {
        clearAuthStorage();
        setIsAuthenticated(false);
        setBookings([]);
        setError("Your session has expired. Please login again.");
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Bookings could not be loaded. Please check the backend."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const formatDate = (date) => {
    if (!date) return "N/A";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "N/A";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price) => {
    const amount = Number(price);

    if (!Number.isFinite(amount)) {
      return "0";
    }

    return amount.toLocaleString("en-IN");
  };

  const getToday = () => {
    const today = new Date();

    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
  };

  const getBookingCategory = (booking) => {
    if (booking.status === "cancelled") {
      return "cancelled";
    }

    if (booking.status !== "confirmed") {
      return "other";
    }

    if (!booking.checkOut) {
      return "other";
    }

    const checkOutDate = new Date(booking.checkOut);

    if (Number.isNaN(checkOutDate.getTime())) {
      return "other";
    }

    const normalizedCheckOut = new Date(
      checkOutDate.getFullYear(),
      checkOutDate.getMonth(),
      checkOutDate.getDate()
    );

    return normalizedCheckOut <= getToday()
      ? "completed"
      : "upcoming";
  };

  const filteredBookings = bookings.filter((booking) => {
    if (activeFilter === "all") {
      return true;
    }

    return getBookingCategory(booking) === activeFilter;
  });

  const filterCounts = {
    all: bookings.length,
    upcoming: bookings.filter(
      (booking) => getBookingCategory(booking) === "upcoming"
    ).length,
    completed: bookings.filter(
      (booking) => getBookingCategory(booking) === "completed"
    ).length,
    cancelled: bookings.filter(
      (booking) => getBookingCategory(booking) === "cancelled"
    ).length,
  };

  const filters = [
    { id: "all", label: "All Trips" },
    { id: "upcoming", label: "Upcoming" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  // Cancel the selected booking.
  const handleCancelBooking = async () => {
    if (!bookingToCancel || cancellingId) {
      return;
    }

    const token = getAuthToken();

    if (!token) {
      setIsAuthenticated(false);
      setError("Please login again to cancel your booking.");
      setBookingToCancel(null);
      return;
    }

    const bookingId = bookingToCancel._id;

    if (!bookingId) {
      setError("Booking ID is missing.");
      setBookingToCancel(null);
      return;
    }

    setCancellingId(bookingId);
    setError("");
    setSuccessMessage("");

    try {
      const response = await axios.patch(
        `${API_URL}/${bookingId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const payload = response.data?.data ?? response.data;
      const updatedBooking = payload?.booking || payload;

      if (
        !updatedBooking ||
        typeof updatedBooking !== "object" ||
        !updatedBooking._id
      ) {
        throw new Error(
          "The server did not return the updated booking."
        );
      }

      setBookings((previousBookings) =>
        previousBookings.map((booking) =>
          booking._id === bookingId
            ? {
                ...booking,
                ...updatedBooking,
                property:
                  updatedBooking.property || booking.property,
                status: updatedBooking.status || "cancelled",
              }
            : booking
        )
      );

      setSuccessMessage(
        payload?.message ||
          "Your booking has been cancelled successfully."
      );

      setBookingToCancel(null);
    } catch (err) {
      console.error("Cancel booking error:", err);

      if (err.response?.status === 401) {
        clearAuthStorage();
        setIsAuthenticated(false);
        setError("Your session has expired. Please login again.");
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Booking cancellation failed. Please try again."
        );
      }

      setBookingToCancel(null);
    } finally {
      setCancellingId(null);
    }
  };

  const getEmptyTitle = () => {
    switch (activeFilter) {
      case "upcoming":
        return "No upcoming trips";
      case "completed":
        return "No completed trips";
      case "cancelled":
        return "No cancelled trips";
      default:
        return "No bookings yet";
    }
  };

  const getEmptyDescription = () => {
    switch (activeFilter) {
      case "upcoming":
        return "Your upcoming confirmed bookings will appear here.";
      case "completed":
        return "Your completed stays will appear here.";
      case "cancelled":
        return "You don't have any cancelled bookings.";
      default:
        return "Start planning your next trip by exploring available stays.";
    }
  };

  return (
    <div className="my-bookings-page">
      <header className="my-bookings-navbar">
        <button
          className="my-bookings-back"
          type="button"
          onClick={() => navigate("/")}
        >
          <FiArrowLeft />
          <span>Back to home</span>
        </button>

        <button
          className="my-bookings-brand"
          type="button"
          onClick={() => navigate("/")}
        >
          <FiHome />
          <span>StayFinder</span>
        </button>

        <button
          type="button"
          className="my-bookings-refresh"
          onClick={fetchBookings}
          disabled={loading}
          aria-label="Refresh bookings"
          title="Refresh bookings"
        >
          <FiRefreshCw
            className={loading ? "refresh-spinning" : ""}
          />
        </button>
      </header>

      <main className="my-bookings-container">
        <section className="my-bookings-heading">
          <span className="my-bookings-eyebrow">
            YOUR TRIPS
          </span>

          <h1>My Bookings</h1>

          <p>
            Manage your reservations and keep track of all your
            trips in one place.
          </p>
        </section>

        {successMessage && (
          <div
            className="my-bookings-message my-bookings-success"
            role="status"
          >
            <FiCheckCircle />
            <span>{successMessage}</span>

            <button
              type="button"
              aria-label="Dismiss success message"
              onClick={() => setSuccessMessage("")}
            >
              <FiX />
            </button>
          </div>
        )}

        {error && (
          <div
            className="my-bookings-message my-bookings-error"
            role="alert"
          >
            <FiAlertCircle />
            <span>{error}</span>

            <button
              type="button"
              className="my-bookings-error-retry"
              onClick={fetchBookings}
              disabled={loading}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !isAuthenticated && (
          <div className="my-bookings-state">
            <div className="my-bookings-state-icon">
              <FiLogIn />
            </div>

            <h2>Login required</h2>

            <p>
              Login to your account to view and manage your bookings.
            </p>

            <button
              type="button"
              className="my-bookings-primary-button"
              onClick={() =>
                navigate("/login", {
                  state: { from: "/my-bookings" },
                })
              }
            >
              Login to continue
              <FiChevronRight />
            </button>
          </div>
        )}

        {loading && (
          <div className="my-bookings-state">
            <FiLoader className="my-bookings-spinner my-bookings-large-spinner" />
            <h2>Loading your trips</h2>
            <p>Please wait while we fetch your bookings.</p>
          </div>
        )}

        {!loading && isAuthenticated && (
          <section className="my-bookings-results">
            <div className="my-bookings-results-heading">
              <div>
                <span className="my-bookings-section-label">
                  RESERVATIONS
                </span>
                <h2>Your trips</h2>
              </div>

              <span className="my-bookings-count">
                {filteredBookings.length}{" "}
                {filteredBookings.length === 1
                  ? "booking"
                  : "bookings"}
              </span>
            </div>

            <div
              className="my-bookings-filters"
              aria-label="Filter bookings"
            >
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={
                    activeFilter === filter.id
                      ? "my-bookings-filter active"
                      : "my-bookings-filter"
                  }
                  onClick={() => setActiveFilter(filter.id)}
                  aria-pressed={activeFilter === filter.id}
                >
                  <span>{filter.label}</span>
                  <span className="my-bookings-filter-count">
                    {filterCounts[filter.id]}
                  </span>
                </button>
              ))}
            </div>

            {filteredBookings.length === 0 && (
              <div className="my-bookings-filter-empty">
                <div className="my-bookings-empty-icon-wrapper">
                  {activeFilter === "cancelled" ? (
                    <FiXCircle />
                  ) : (
                    <FiCalendar />
                  )}
                </div>

                <h3>{getEmptyTitle()}</h3>
                <p>{getEmptyDescription()}</p>

                {activeFilter === "all" && (
                  <button
                    type="button"
                    className="my-bookings-primary-button"
                    onClick={() => navigate("/")}
                  >
                    Explore stays
                    <FiChevronRight />
                  </button>
                )}

                {activeFilter !== "all" && (
                  <button
                    type="button"
                    className="my-bookings-secondary-button"
                    onClick={() => setActiveFilter("all")}
                  >
                    View all trips
                  </button>
                )}
              </div>
            )}

            {filteredBookings.length > 0 && (
              <div className="my-bookings-list">
                {filteredBookings.map((booking) => {
                  const property = booking.property;
                  const category = getBookingCategory(booking);
                  const isCancelled =
                    booking.status === "cancelled";

                  return (
                    <article
                      className={`my-booking-card ${
                        isCancelled
                          ? "my-booking-card-cancelled"
                          : ""
                      }`}
                      key={booking._id}
                    >
                      <div className="my-booking-image-wrapper">
                        {property?.image ? (
                          <img
                            src={property.image}
                            alt={
                              property.title || "Booked property"
                            }
                            className="my-booking-image"
                            loading="lazy"
                          />
                        ) : (
                          <div className="my-booking-image-placeholder">
                            <FiHome />
                          </div>
                        )}

                        {category === "upcoming" && (
                          <span className="my-booking-image-badge">
                            <FiClock />
                            Upcoming
                          </span>
                        )}
                      </div>

                      <div className="my-booking-content">
                        <div className="my-booking-title-row">
                          <div className="my-booking-property-info">
                            <h3>
                              {property?.title ||
                                "Property unavailable"}
                            </h3>

                            <p className="my-booking-location">
                              <FiMapPin />
                              <span>
                                {property?.location ||
                                  "Location unavailable"}
                              </span>
                            </p>
                          </div>

                          <span
                            className={`my-booking-status ${
                              isCancelled
                                ? "status-cancelled"
                                : category === "completed"
                                  ? "status-completed"
                                  : "status-confirmed"
                            }`}
                          >
                            {isCancelled ? (
                              <FiXCircle />
                            ) : (
                              <FiCheckCircle />
                            )}

                            {isCancelled
                              ? "Cancelled"
                              : category === "completed"
                                ? "Completed"
                                : "Confirmed"}
                          </span>
                        </div>

                        <div className="my-booking-details">
                          <div className="my-booking-detail-item">
                            <span className="my-booking-detail-icon">
                              <FiCalendar />
                            </span>

                            <span className="my-booking-detail-text">
                              <small>Check-in</small>
                              <strong>
                                {formatDate(booking.checkIn)}
                              </strong>
                            </span>
                          </div>

                          <div className="my-booking-detail-item">
                            <span className="my-booking-detail-icon">
                              <FiCalendar />
                            </span>

                            <span className="my-booking-detail-text">
                              <small>Check-out</small>
                              <strong>
                                {formatDate(booking.checkOut)}
                              </strong>
                            </span>
                          </div>

                          <div className="my-booking-detail-item">
                            <span className="my-booking-detail-icon">
                              <FiUsers />
                            </span>

                            <span className="my-booking-detail-text">
                              <small>Guests</small>
                              <strong>
                                {booking.guests}{" "}
                                {Number(booking.guests) === 1
                                  ? "guest"
                                  : "guests"}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="my-booking-footer">
                          <div className="my-booking-id-wrapper">
                            <small>Booking ID</small>
                            <span
                              className="my-booking-id"
                              title={booking._id}
                            >
                              {booking._id}
                            </span>
                          </div>

                          <div className="my-booking-total">
                            <small>Total price</small>
                            <strong>
                              ₹{formatPrice(booking.totalPrice)}
                            </strong>
                          </div>
                        </div>

                        {!isCancelled &&
                          category === "upcoming" && (
                            <div className="my-booking-actions">
                              <button
                                type="button"
                                className="my-booking-cancel-button"
                                onClick={() =>
                                  setBookingToCancel(booking)
                                }
                                disabled={Boolean(cancellingId)}
                              >
                                <FiXCircle />
                                Cancel booking
                              </button>
                            </div>
                          )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {bookingToCancel && (
        <div
          className="booking-cancel-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !cancellingId
            ) {
              setBookingToCancel(null);
            }
          }}
        >
          <div
            className="booking-cancel-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-cancel-title"
          >
            <button
              type="button"
              className="booking-cancel-close"
              aria-label="Close dialog"
              disabled={Boolean(cancellingId)}
              onClick={() => setBookingToCancel(null)}
            >
              <FiX />
            </button>

            <div className="booking-cancel-icon">
              <FiAlertCircle />
            </div>

            <span className="booking-cancel-eyebrow">
              BOOKING CANCELLATION
            </span>

            <h2 id="booking-cancel-title">
              Cancel this booking?
            </h2>

            <p>
              Are you sure you want to cancel your reservation for{" "}
              <strong>
                {bookingToCancel.property?.title ||
                  "this property"}
              </strong>
              ?
            </p>

            <div className="booking-cancel-summary">
              <div>
                <span>Check-in</span>
                <strong>
                  {formatDate(bookingToCancel.checkIn)}
                </strong>
              </div>

              <div>
                <span>Check-out</span>
                <strong>
                  {formatDate(bookingToCancel.checkOut)}
                </strong>
              </div>

              <div>
                <span>Booking total</span>
                <strong>
                  ₹{formatPrice(bookingToCancel.totalPrice)}
                </strong>
              </div>
            </div>

            <p className="booking-cancel-note">
              This action marks the booking as cancelled.
              Refunds are not processed automatically by this feature.
            </p>

            <div className="booking-cancel-actions">
              <button
                type="button"
                className="booking-cancel-keep"
                disabled={Boolean(cancellingId)}
                onClick={() => setBookingToCancel(null)}
              >
                Keep booking
              </button>

              <button
                type="button"
                className="booking-cancel-confirm"
                disabled={Boolean(cancellingId)}
                onClick={handleCancelBooking}
              >
                {cancellingId ? (
                  <>
                    <FiLoader className="my-bookings-spinner" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <FiXCircle />
                    Yes, cancel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="my-bookings-footer">
        <span>
          © {new Date().getFullYear()} StayFinder
        </span>

        <button
          type="button"
          onClick={() => navigate("/")}
        >
          Explore stays
          <FiChevronRight />
        </button>
      </footer>
    </div>
  );
}

export default MyBookings;
