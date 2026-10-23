
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import axios from "axios";
import { FaAirbnb } from "react-icons/fa";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiHeart,
  FiHome,
  FiMapPin,
  FiMessageSquare,
  FiStar,
  FiUsers,
} from "react-icons/fi";

import "./PropertyDetails.css";
import { useWishlist } from "./WishlistContext";
import API_URL from "./api";

const getTodayDate = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    return 0;
  }

  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  return Math.round(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
};

const readStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser") ||
      localStorage.getItem("airbnb-user");

    if (!storedUser) return null;

    const parsed = JSON.parse(storedUser);

    return parsed?.user || parsed?.data?.user || parsed;
  } catch {
    return null;
  }
};

const getStoredToken = () =>
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

function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const token = getStoredToken();
  const currentUser = readStoredUser();

  const { toggleWishlist, isWishlisted } = useWishlist();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [propertyError, setPropertyError] = useState("");

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1");
  const [guestName, setGuestName] = useState(
    currentUser?.name || ""
  );

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");

  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] =
    useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  // Fetch property details.
  const fetchProperty = useCallback(async (signal) => {
    if (!id) {
      setPropertyError("Property ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setPropertyError("");

    try {
      const response = await axios.get(
        `${API_URL}/listings/${id}`,
        { signal }
      );

      const fetchedProperty = response.data.listing;

      if (!fetchedProperty) {
        setProperty(null);
        setPropertyError("Property not found.");
        return;
      }

      setProperty(fetchedProperty);
    } catch (error) {
      if (
        error.code === "ERR_CANCELED" ||
        error.name === "CanceledError"
      ) {
        return;
      }

      setProperty(null);
      setPropertyError(
        error.response?.data?.message ||
          "Unable to load property details. Please try again."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();

    fetchProperty(controller.signal);

    return () => controller.abort();
  }, [fetchProperty]);

  // Fetch reviews and ratings.
  const fetchReviews = useCallback(async (signal) => {
    if (!id) {
      setReviews([]);
      setAverageRating(0);
      setTotalReviews(0);
      setReviewsLoading(false);
      return;
    }

    setReviewsLoading(true);

    try {
      const response = await axios.get(
        `${API_URL}/reviews/${id}`,
        { signal }
      );

      const fetchedReviews = Array.isArray(response.data?.reviews)
        ? response.data.reviews
        : [];

      const calculatedAverage =
        fetchedReviews.length > 0
          ? fetchedReviews.reduce(
              (sum, review) =>
                sum + Number(review.rating || 0),
              0
            ) / fetchedReviews.length
          : 0;

      const serverAverage =
        response.data.averageRating ??
        response.data.average;

      const rating =
        serverAverage != null
          ? Number(serverAverage)
          : calculatedAverage;

      setReviews(fetchedReviews);
      setAverageRating(
        Number.isFinite(rating) ? rating : 0
      );
      setTotalReviews(
        response.data.count ?? fetchedReviews.length
      );
    } catch (error) {
      if (
        error.code === "ERR_CANCELED" ||
        error.name === "CanceledError"
      ) {
        return;
      }

      console.error("Fetch reviews error:", error);
    } finally {
      if (!signal?.aborted) {
        setReviewsLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();

    fetchReviews(controller.signal);

    return () => controller.abort();
  }, [fetchReviews]);

  // Check availability whenever the selected dates change.
  useEffect(() => {
    const controller = new AbortController();

    const validDates =
      checkIn &&
      checkOut &&
      checkOut > checkIn &&
      checkIn >= getTodayDate();

    if (!id || !validDates) {
      setAvailability(null);
      setAvailabilityLoading(false);
      setAvailabilityError("");

      return () => controller.abort();
    }

    const checkAvailability = async () => {
      setAvailability(null);
      setAvailabilityLoading(true);
      setAvailabilityError("");

      try {
        const response = await axios.get(
          `${API_URL}/bookings/availability/${id}`,
          {
            params: { checkIn, checkOut },
            signal: controller.signal,
          }
        );

        setAvailability(response.data.available === true);
      } catch (error) {
        if (
          error.code === "ERR_CANCELED" ||
          error.name === "CanceledError"
        ) {
          return;
        }

        setAvailability(null);
        setAvailabilityError(
          error.response?.data?.message ||
            "Availability could not be checked. The server will validate your booking."
        );
      } finally {
        if (!controller.signal.aborted) {
          setAvailabilityLoading(false);
        }
      }
    };

    checkAvailability();

    return () => controller.abort();
  }, [id, checkIn, checkOut]);

  const nights = useMemo(
    () => calculateNights(checkIn, checkOut),
    [checkIn, checkOut]
  );

  const pricePerNight = Number(property?.price) || 0;
  const totalPrice = nights * pricePerNight;

  // Create a booking.
  const handleBooking = async (event) => {
    event.preventDefault();

    setBookingError("");
    setBookingMessage("");

    if (!token) {
      navigate("/login", {
        state: { from: location.pathname },
      });
      return;
    }

    if (!property) {
      setBookingError("Property details are not available.");
      return;
    }

    if (!guestName.trim() || guestName.trim().length < 2) {
      setBookingError(
        "Please enter a guest name with at least 2 characters."
      );
      return;
    }

    if (!checkIn || !checkOut) {
      setBookingError("Please select check-in and check-out dates.");
      return;
    }

    if (checkIn < getTodayDate()) {
      setBookingError("Check-in date cannot be in the past.");
      return;
    }

    if (checkOut <= checkIn) {
      setBookingError(
        "Check-out date must be after check-in date."
      );
      return;
    }

    const guestCount = Number(guests);

    if (
      !Number.isInteger(guestCount) ||
      guestCount < 1
    ) {
      setBookingError("Please select a valid number of guests.");
      return;
    }

    if (
      property.guests != null &&
      guestCount > Number(property.guests)
    ) {
      setBookingError(
        `This property allows a maximum of ${property.guests} guests.`
      );
      return;
    }

    if (availabilityLoading) {
      setBookingError(
        "Please wait while we check availability."
      );
      return;
    }

    if (availability === false) {
      setBookingError(
        "These dates are unavailable. Please select different dates."
      );
      return;
    }

    setBookingLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/bookings`,
        {
          propertyId: property._id,
          guestName: guestName.trim(),
          guests: guestCount,
          checkIn,
          checkOut,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setBookingMessage(
        response.data.message ||
          "Your booking was created successfully."
      );

      setBookingError("");
      setAvailability(false);
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuthStorage();

        navigate("/login", {
          state: { from: location.pathname },
        });

        return;
      }

      setBookingError(
        error.response?.data?.message ||
          "Booking failed. Please try again."
      );
    } finally {
      setBookingLoading(false);
    }
  };

  // Submit a guest review.
  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    setReviewError("");
    setReviewMessage("");

    if (!token) {
      navigate("/login", {
        state: { from: location.pathname },
      });
      return;
    }

    if (!property?._id) {
      setReviewError("Property details are not available.");
      return;
    }

    const cleanComment = reviewComment.trim();

    if (
      !Number.isInteger(Number(reviewRating)) ||
      Number(reviewRating) < 1 ||
      Number(reviewRating) > 5
    ) {
      setReviewError("Please select a rating from 1 to 5.");
      return;
    }

    if (
      cleanComment.length < 5 ||
      cleanComment.length > 1000
    ) {
      setReviewError(
        "Your review must contain between 5 and 1000 characters."
      );
      return;
    }

    setReviewLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/reviews`,
        {
          propertyId: property._id,
          rating: Number(reviewRating),
          comment: cleanComment,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.averageRating != null) {
        setAverageRating(Number(response.data.averageRating));
      } else if (response.data.average != null) {
        setAverageRating(Number(response.data.average));
      }

      if (response.data.totalReviews != null) {
        setTotalReviews(Number(response.data.totalReviews));
      }

      setReviewComment("");
      setReviewRating(5);

      setReviewMessage(
        response.data.message ||
          "Your review was submitted successfully."
      );

      await Promise.all([
        fetchReviews(),
        fetchProperty(),
      ]);
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuthStorage();

        navigate("/login", {
          state: { from: location.pathname },
        });

        return;
      }

      setReviewError(
        error.response?.data?.message ||
          "Could not submit your review. Please try again."
      );
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pd-page">
        <header className="pd-header">
          <Link to="/" className="pd-brand">
            <FaAirbnb />
            <span>StayFinder</span>
          </Link>
        </header>

        <div className="pd-state">
          <div className="pd-loader" />
          <h2>Loading property...</h2>
          <p>Please wait while we fetch the details.</p>
        </div>
      </div>
    );
  }

  if (propertyError || !property) {
    return (
      <div className="pd-page">
        <header className="pd-header">
          <Link to="/" className="pd-brand">
            <FaAirbnb />
            <span>StayFinder</span>
          </Link>
        </header>

        <div className="pd-state pd-error-state">
          <h2>Property not available</h2>

          <p>
            {propertyError ||
              "We could not find this property."}
          </p>

          <Link to="/" className="pd-primary-link">
            <FiArrowLeft /> Back to properties
          </Link>
        </div>
      </div>
    );
  }

  const wishlisted = isWishlisted(property._id);

  return (
    <div className="pd-page">
      <header className="pd-header">
        <Link to="/" className="pd-brand">
          <FaAirbnb />
          <span>StayFinder</span>
        </Link>

        <nav className="pd-header-links">
          <Link to="/">Explore stays</Link>
          <Link to="/my-bookings">My Bookings</Link>
          <Link to="/wishlist">Wishlist</Link>
        </nav>
      </header>

      <main className="pd-main">
        <Link to="/" className="pd-back-link">
          <FiArrowLeft />
          Back to properties
        </Link>

        <section className="pd-title-section">
          <div className="pd-title-copy">
            <p className="pd-category">
              {property.category || "Property"}
            </p>

            <h1>{property.title}</h1>

            <div className="pd-summary">
              <span>
                <FiMapPin />
                {property.location}
              </span>

              <span className="pd-summary-rating">
                <FiStar />
                {averageRating > 0
                  ? averageRating.toFixed(1)
                  : "New"}

                <span>
                  ({totalReviews}{" "}
                  {totalReviews === 1 ? "review" : "reviews"})
                </span>
              </span>
            </div>
          </div>

          <div className="pd-title-actions">
            <button
              type="button"
              className={
                wishlisted
                  ? "pd-wishlist-button is-active"
                  : "pd-wishlist-button"
              }
              onClick={() => toggleWishlist(property)}
            >
              <FiHeart />
              {wishlisted
                ? "Saved to wishlist"
                : "Save to wishlist"}
            </button>
          </div>
        </section>

        <section className="pd-gallery">
          <div className="pd-gallery-main">
            <img
              src={property.image}
              alt={property.title}
              className="pd-main-image"
              onError={(event) => {
                event.currentTarget.style.visibility = "hidden";
              }}
            />
          </div>

          <div className="pd-gallery-side">
            <div className="pd-gallery-info">
              <FiHome />
              <span>
                {property.bedrooms}{" "}
                {Number(property.bedrooms) === 1
                  ? "bedroom"
                  : "bedrooms"}
              </span>
            </div>

            <div className="pd-gallery-info">
              <FiUsers />
              <span>
                Up to {property.guests}{" "}
                {Number(property.guests) === 1
                  ? "guest"
                  : "guests"}
              </span>
            </div>

            <div className="pd-gallery-info">
              <FiMapPin />
              <span>{property.location}</span>
            </div>

            <div className="pd-gallery-price">
              <strong>
                ₹{pricePerNight.toLocaleString("en-IN")}
              </strong>
              <span>per night</span>
            </div>
          </div>
        </section>

        <div className="pd-content-layout">
          <div className="pd-details-column">
            <section className="pd-info-card">
              <div className="pd-section-heading">
                <div>
                  <h2>About this stay</h2>
                  <p>
                    Everything you need to know before booking.
                  </p>
                </div>
              </div>

              <p className="pd-description">
                {property.description}
              </p>

              <div className="pd-feature-grid">
                <div className="pd-feature">
                  <FiHome />
                  <div>
                    <strong>Bedrooms</strong>
                    <span>{property.bedrooms}</span>
                  </div>
                </div>

                <div className="pd-feature">
                  <FiUsers />
                  <div>
                    <strong>Guest capacity</strong>
                    <span>{property.guests} guests</span>
                  </div>
                </div>

                <div className="pd-feature">
                  <FiMapPin />
                  <div>
                    <strong>Location</strong>
                    <span>{property.location}</span>
                  </div>
                </div>

                <div className="pd-feature">
                  <FiStar />
                  <div>
                    <strong>Guest rating</strong>
                    <span>
                      {averageRating > 0
                        ? `${averageRating.toFixed(1)} / 5`
                        : "Not rated yet"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="pd-info-card">
              <div className="pd-section-heading">
                <div>
                  <h2>Choose your dates</h2>
                  <p>
                    Check availability before making a reservation.
                  </p>
                </div>
              </div>

              <div className="pd-date-grid">
                <div className="pd-field">
                  <label htmlFor="checkIn">
                    <FiCalendar /> Check-in
                  </label>

                  <input
                    id="checkIn"
                    type="date"
                    min={getTodayDate()}
                    value={checkIn}
                    onChange={(event) => {
                      const value = event.target.value;

                      setCheckIn(value);
                      setBookingError("");
                      setBookingMessage("");

                      if (checkOut && value >= checkOut) {
                        setCheckOut("");
                      }
                    }}
                  />
                </div>

                <div className="pd-field">
                  <label htmlFor="checkOut">
                    <FiCalendar /> Check-out
                  </label>

                  <input
                    id="checkOut"
                    type="date"
                    min={checkIn || getTodayDate()}
                    value={checkOut}
                    onChange={(event) => {
                      setCheckOut(event.target.value);
                      setBookingError("");
                      setBookingMessage("");
                    }}
                  />
                </div>

                <div className="pd-field pd-guests-field">
                  <label htmlFor="guests">
                    <FiUsers /> Guests
                  </label>

                  <select
                    id="guests"
                    value={guests}
                    onChange={(event) => {
                      setGuests(event.target.value);
                      setBookingError("");
                    }}
                  >
                    {Array.from(
                      {
                        length: Math.max(
                          1,
                          Math.min(
                            20,
                            Number(property.guests) || 1
                          )
                        ),
                      },
                      (_, index) => index + 1
                    ).map((count) => (
                      <option key={count} value={count}>
                        {count} {count === 1 ? "guest" : "guests"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {availabilityLoading && (
                <div className="pd-status pd-status-neutral">
                  <span className="pd-small-loader" />
                  Checking availability...
                </div>
              )}

              {!availabilityLoading &&
                availability === true && (
                  <div className="pd-status pd-status-success">
                    <FiCheckCircle />
                    These dates are available.
                  </div>
                )}

              {!availabilityLoading &&
                availability === false &&
                checkIn &&
                checkOut &&
                checkOut > checkIn && (
                  <div className="pd-status pd-status-error">
                    These dates are not available. Please choose
                    different dates.
                  </div>
                )}

              {availabilityError && (
                <div className="pd-status pd-status-warning">
                  {availabilityError}
                </div>
              )}

              {checkIn &&
                checkOut &&
                checkOut > checkIn && (
                  <div className="pd-price-breakdown">
                    <div>
                      <span>
                        ₹{pricePerNight.toLocaleString("en-IN")} ×{" "}
                        {nights}{" "}
                        {nights === 1 ? "night" : "nights"}
                      </span>

                      <strong>
                        ₹{totalPrice.toLocaleString("en-IN")}
                      </strong>
                    </div>

                    <div className="pd-total-row">
                      <span>Total before any additional charges</span>
                      <strong>
                        ₹{totalPrice.toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>
                )}
            </section>

            <section className="pd-info-card pd-reviews-section">
              <div className="pd-section-heading">
                <div>
                  <h2>
                    <FiStar className="pd-heading-star" />
                    Guest reviews
                  </h2>

                  <p>
                    {averageRating > 0
                      ? `${averageRating.toFixed(1)} out of 5 · ${totalReviews} ${
                          totalReviews === 1 ? "review" : "reviews"
                        }`
                      : "Be the first to review this property."}
                  </p>
                </div>
              </div>

              <div className="pd-rating-overview">
                <div className="pd-rating-number">
                  <strong>
                    {averageRating > 0
                      ? averageRating.toFixed(1)
                      : "New"}
                  </strong>

                  <div
                    className="pd-rating-stars"
                    aria-label={`Average rating ${averageRating.toFixed(1)} out of 5`}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FiStar
                        key={star}
                        className={
                          star <= Math.round(averageRating)
                            ? "pd-star-filled"
                            : "pd-star-empty"
                        }
                      />
                    ))}
                  </div>

                  <span>
                    {totalReviews}{" "}
                    {totalReviews === 1 ? "review" : "reviews"}
                  </span>
                </div>
              </div>

              <div className="pd-review-form-wrapper">
                <h3>
                  <FiMessageSquare />
                  Share your experience
                </h3>

                {token ? (
                  <form
                    className="pd-review-form"
                    onSubmit={handleReviewSubmit}
                  >
                    <label htmlFor="reviewRating">
                      Your rating
                    </label>

                    <div className="pd-rating-selector">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={
                            star <= reviewRating
                              ? "pd-rating-choice selected"
                              : "pd-rating-choice"
                          }
                          onClick={() => setReviewRating(star)}
                          aria-label={`${star} star rating`}
                          aria-pressed={reviewRating === star}
                        >
                          <FiStar />
                        </button>
                      ))}

                      <span>{reviewRating} out of 5</span>
                    </div>

                    <label htmlFor="reviewComment">
                      Your review
                    </label>

                    <textarea
                      id="reviewComment"
                      value={reviewComment}
                      onChange={(event) =>
                        setReviewComment(event.target.value)
                      }
                      placeholder="What did you like about this stay?"
                      minLength={5}
                      maxLength={1000}
                      rows={4}
                      required
                    />

                    <div className="pd-character-count">
                      {reviewComment.length}/1000 characters
                    </div>

                    {reviewError && (
                      <div
                        className="pd-form-alert pd-form-alert-error"
                        role="alert"
                      >
                        {reviewError}
                      </div>
                    )}

                    {reviewMessage && (
                      <div
                        className="pd-form-alert pd-form-alert-success"
                        role="status"
                      >
                        {reviewMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="pd-primary-button"
                      disabled={reviewLoading}
                    >
                      {reviewLoading
                        ? "Submitting..."
                        : "Submit review"}
                    </button>
                  </form>
                ) : (
                  <div className="pd-login-prompt">
                    <p>Please log in to share your review.</p>

                    <Link
                      to="/login"
                      state={{ from: location.pathname }}
                      className="pd-secondary-link"
                    >
                      Login to review <FiArrowRight />
                    </Link>
                  </div>
                )}
              </div>

              <div className="pd-review-list">
                {reviewsLoading ? (
                  <p className="pd-muted-text">
                    Loading reviews...
                  </p>
                ) : reviews.length === 0 ? (
                  <div className="pd-no-reviews">
                    <FiMessageSquare />
                    <h3>No reviews yet</h3>
                    <p>
                      Be the first guest to share your experience.
                    </p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <article
                      className="pd-review-card"
                      key={review._id}
                    >
                      <div className="pd-review-top">
                        <div className="pd-review-avatar">
                          {(review.reviewerName || "G")
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="pd-review-author">
                          <strong>
                            {review.reviewerName || "Guest"}
                          </strong>

                          <span>
                            {review.createdAt
                              ? new Date(
                                  review.createdAt
                                ).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : ""}
                          </span>
                        </div>

                        <div className="pd-review-rating">
                          <FiStar />
                          {Number(review.rating).toFixed(0)}
                        </div>
                      </div>

                      <p className="pd-review-comment">
                        {review.comment}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="pd-booking-column">
            <section className="pd-booking-card">
              <div className="pd-booking-price">
                <strong>
                  ₹{pricePerNight.toLocaleString("en-IN")}
                </strong>
                <span>/ night</span>
              </div>

              <div className="pd-booking-rating">
                <FiStar />
                <strong>
                  {averageRating > 0
                    ? averageRating.toFixed(1)
                    : "New"}
                </strong>

                <span>
                  ({totalReviews}{" "}
                  {totalReviews === 1 ? "review" : "reviews"})
                </span>
              </div>

              <form
                className="pd-booking-form"
                onSubmit={handleBooking}
              >
                <div className="pd-booking-date-fields">
                  <div className="pd-field">
                    <label htmlFor="bookingCheckIn">
                      Check-in
                    </label>

                    <input
                      id="bookingCheckIn"
                      type="date"
                      min={getTodayDate()}
                      value={checkIn}
                      onChange={(event) => {
                        const value = event.target.value;

                        setCheckIn(value);
                        setBookingError("");
                        setBookingMessage("");

                        if (checkOut && value >= checkOut) {
                          setCheckOut("");
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="pd-field">
                    <label htmlFor="bookingCheckOut">
                      Check-out
                    </label>

                    <input
                      id="bookingCheckOut"
                      type="date"
                      min={checkIn || getTodayDate()}
                      value={checkOut}
                      onChange={(event) => {
                        setCheckOut(event.target.value);
                        setBookingError("");
                        setBookingMessage("");
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="pd-field">
                  <label htmlFor="bookingGuests">Guests</label>

                  <select
                    id="bookingGuests"
                    value={guests}
                    onChange={(event) =>
                      setGuests(event.target.value)
                    }
                  >
                    {Array.from(
                      {
                        length: Math.max(
                          1,
                          Math.min(
                            20,
                            Number(property.guests) || 1
                          )
                        ),
                      },
                      (_, index) => index + 1
                    ).map((count) => (
                      <option key={count} value={count}>
                        {count} {count === 1 ? "guest" : "guests"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pd-field">
                  <label htmlFor="guestName">Guest name</label>

                  <input
                    id="guestName"
                    type="text"
                    minLength={2}
                    maxLength={100}
                    value={guestName}
                    onChange={(event) =>
                      setGuestName(event.target.value)
                    }
                    placeholder="Enter guest name"
                    required
                  />
                </div>

                {bookingError && (
                  <div
                    className="pd-form-alert pd-form-alert-error"
                    role="alert"
                  >
                    {bookingError}
                  </div>
                )}

                {bookingMessage && (
                  <div
                    className="pd-form-alert pd-form-alert-success"
                    role="status"
                  >
                    <FiCheckCircle />
                    {bookingMessage}

                    <Link to="/my-bookings">
                      View my bookings
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  className="pd-primary-button pd-reserve-button"
                  disabled={
                    bookingLoading ||
                    availabilityLoading ||
                    availability === false
                  }
                >
                  {bookingLoading
                    ? "Booking..."
                    : availabilityLoading
                      ? "Checking dates..."
                      : availability === false
                        ? "Dates unavailable"
                        : "Reserve"}
                </button>

                <p className="pd-booking-note">
                  <FiCheckCircle />
                  You will be charged only if your booking is
                  successfully processed by the backend.
                </p>

                {nights > 0 && (
                  <div className="pd-booking-total">
                    <span>
                      ₹{pricePerNight.toLocaleString("en-IN")} ×{" "}
                      {nights} {nights === 1 ? "night" : "nights"}
                    </span>

                    <strong>
                      ₹{totalPrice.toLocaleString("en-IN")}
                    </strong>
                  </div>
                )}
              </form>
            </section>

            <div className="pd-booking-help">
              <FiCheckCircle />
              <p>
                <strong>Plan your stay</strong>
                <span>
                  Review the property details and selected dates
                  before reserving.
                </span>
              </p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="pd-footer">
        <div className="pd-footer-inner">
          <Link to="/" className="pd-footer-brand">
            <FaAirbnb /> StayFinder
          </Link>

          <p>
            © {new Date().getFullYear()} StayFinder. All rights
            reserved.
          </p>

          <div>
            <Link to="/">Explore</Link>
            <Link to="/wishlist">Wishlist</Link>
            <Link to="/my-bookings">My Bookings</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PropertyDetails;
