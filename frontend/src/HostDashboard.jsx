import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import {
  FiHome,
  FiPlusCircle,
  FiEdit2,
  FiSave,
  FiX,
  FiMapPin,
  FiUsers,
  FiDollarSign,
  FiTrash2,
} from "react-icons/fi";

import "./HostDashboard.css";
import API_URL from "./api";

const EMPTY_FORM = {
  title: "",
  description: "",
  location: "",
  price: "",
  image: "",
  bedrooms: "1",
  guests: "1",
  category: "Countryside",
  latitude: "",
  longitude: "",
};

const CATEGORIES = ["Amazing views", "Beachfront", "Cabins", "Countryside"];

const getAuthToken = () =>
  localStorage.getItem("token") || localStorage.getItem("airbnb-token") || "";

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("airbnb-token");
  localStorage.removeItem("airbnb-user");
};

function HostDashboard() {
  const navigate = useNavigate();
  const token = getAuthToken();

  const [listings, setListings] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleUnauthorized = useCallback(() => {
    clearAuthStorage();

    navigate("/login", {
      state: { from: "/host-dashboard" },
      replace: true,
    });
  }, [navigate]);

  // Fetch the current host's properties.
  const loadListings = useCallback(async () => {
    if (!token) {
      setLoading(false);

      navigate("/login", {
        state: { from: "/host-dashboard" },
        replace: true,
      });

      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(`${API_URL}/listings/mine`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setListings(
        Array.isArray(response.data?.listings) ? response.data.listings : [],
      );
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(
        err.response?.data?.message ||
          "Could not load properties. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, navigate, handleUnauthorized]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  };

  // Load a property's details into the edit form.
  const handleEdit = (listing) => {
    setEditingId(listing._id);

    setForm({
      title: listing.title || "",
      description: listing.description || "",
      location: listing.location || "",
      price: String(listing.price ?? ""),
      image: listing.image || "",
      bedrooms: String(listing.bedrooms ?? 1),
      guests: String(listing.guests ?? 1),
      category: listing.category || "Countryside",
      latitude: listing.latitude == null ? "" : String(listing.latitude),
      longitude: listing.longitude == null ? "" : String(listing.longitude),
    });

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Create or update a property.
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      navigate("/login", {
        state: { from: "/host-dashboard" },
      });
      return;
    }

    const price = Number(form.price);
    const bedrooms = Number(form.bedrooms);
    const guests = Number(form.guests);

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.location.trim() ||
      !form.image.trim()
    ) {
      setError("Please enter the title, description, location and image URL.");
      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isInteger(bedrooms) ||
      bedrooms < 1 ||
      !Number.isInteger(guests) ||
      guests < 1
    ) {
      setError("Enter a valid price, bedroom count and guest capacity.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      price,
      image: form.image.trim(),
      bedrooms,
      guests,
      category: form.category,
    };

    if (form.latitude.trim() !== "") {
      const latitude = Number(form.latitude);

      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        setError("Latitude must be between -90 and 90.");
        return;
      }

      payload.latitude = latitude;
    }

    if (form.longitude.trim() !== "") {
      const longitude = Number(form.longitude);

      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        setError("Longitude must be between -180 and 180.");
        return;
      }

      payload.longitude = longitude;
    }

    setSaving(true);

    try {
      if (editingId) {
        await axios.put(`${API_URL}/listings/${editingId}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setMessage("Property updated successfully.");
      } else {
        await axios.post(`${API_URL}/listings`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setMessage("Property added successfully.");
      }

      resetForm();
      await loadListings();
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(
        err.response?.data?.message ||
          "Could not save the property. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete a property after confirmation.
  const handleDelete = async (listing) => {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${listing.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    if (!token) {
      navigate("/login", {
        state: { from: "/host-dashboard" },
      });
      return;
    }

    setError("");
    setMessage("");
    setDeletingId(listing._id);

    try {
      await axios.delete(`${API_URL}/listings/${listing._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setListings((previous) =>
        previous.filter((item) => item._id !== listing._id),
      );

      if (editingId === listing._id) {
        resetForm();
      }

      setMessage("Property deleted successfully.");
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(
        err.response?.data?.message ||
          "Could not delete the property. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="host-dashboard">
      <header className="host-header">
        <Link to="/" className="host-brand">
          <FiHome />
          <span>StayFinder</span>
        </Link>

        <div className="host-header-right">
          <span>Host Dashboard</span>
          <Link to="/">View Website</Link>
        </div>
      </header>

      <main className="host-main">
        <section className="host-intro">
          <div>
            <p className="host-eyebrow">PROPERTY MANAGEMENT</p>

            <h1>Manage your properties</h1>

            <p>
              Add a new stay or update the details of your existing properties.
            </p>
          </div>

          <div className="host-count">
            <FiHome />

            <div>
              <strong>{listings.length}</strong>
              <span>{listings.length === 1 ? "Property" : "Properties"}</span>
            </div>
          </div>
        </section>

        {error && (
          <div className="host-alert host-alert-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="host-alert host-alert-success" role="status">
            {message}
          </div>
        )}

        <section className="host-form-section">
          <div className="host-section-heading">
            <div className="host-section-icon">
              {editingId ? <FiEdit2 /> : <FiPlusCircle />}
            </div>

            <div>
              <h2>{editingId ? "Edit Property" : "Add a Property"}</h2>

              <p>Enter accurate information about your property.</p>
            </div>
          </div>

          <form className="host-form" onSubmit={handleSubmit}>
            <div className="host-field">
              <label htmlFor="title">Property title *</label>

              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Cozy Mountain Stay"
                maxLength={150}
                required
              />
            </div>

            <div className="host-field">
              <label htmlFor="location">Location *</label>

              <input
                id="location"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="City, state or area"
                required
              />
            </div>

            <div className="host-field host-field-full">
              <label htmlFor="description">Description *</label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe your property and its features..."
                rows={4}
                required
              />
            </div>

            <div className="host-field host-field-full">
              <label htmlFor="image">Property image URL *</label>

              <input
                id="image"
                name="image"
                type="url"
                value={form.image}
                onChange={handleChange}
                placeholder="https://example.com/property-image.jpg"
                required
              />

              {form.image.trim() && (
                <img
                  key={form.image}
                  className="host-image-preview"
                  src={form.image}
                  alt="Property image preview"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  onLoad={(event) => {
                    event.currentTarget.style.display = "block";
                  }}
                />
              )}
            </div>

            <div className="host-field">
              <label htmlFor="price">Price per night (₹) *</label>

              <input
                id="price"
                name="price"
                type="number"
                min="1"
                step="any"
                value={form.price}
                onChange={handleChange}
                placeholder="2500"
                required
              />
            </div>

            <div className="host-field">
              <label htmlFor="category">Category *</label>

              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="host-field">
              <label htmlFor="bedrooms">Bedrooms *</label>

              <input
                id="bedrooms"
                name="bedrooms"
                type="number"
                min="1"
                step="1"
                value={form.bedrooms}
                onChange={handleChange}
                required
              />
            </div>

            <div className="host-field">
              <label htmlFor="guests">Maximum guests *</label>

              <input
                id="guests"
                name="guests"
                type="number"
                min="1"
                step="1"
                value={form.guests}
                onChange={handleChange}
                required
              />
            </div>

            <div className="host-field">
              <label htmlFor="latitude">Latitude (optional)</label>

              <input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={handleChange}
                placeholder="20.00"
              />
            </div>

            <div className="host-field">
              <label htmlFor="longitude">Longitude (optional)</label>

              <input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={handleChange}
                placeholder="73.78"
              />
            </div>

            <div className="host-form-actions host-field-full">
              <button
                type="submit"
                className="host-primary-button"
                disabled={saving}
              >
                {saving ? (
                  "Saving..."
                ) : editingId ? (
                  <>
                    <FiSave /> Update Property
                  </>
                ) : (
                  <>
                    <FiPlusCircle /> Add Property
                  </>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="host-secondary-button"
                  onClick={() => {
                    resetForm();
                    setError("");
                    setMessage("");
                  }}
                  disabled={saving}
                >
                  <FiX /> Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="host-listings-section">
          <div className="host-section-heading">
            <div className="host-section-icon">
              <FiHome />
            </div>

            <div>
              <h2>Your Properties</h2>
              <p>
                View and manage the properties associated with your account.
              </p>
            </div>
          </div>

          {loading ? (
            <p className="host-empty-state">Loading properties...</p>
          ) : listings.length === 0 ? (
            <div className="host-empty-state">
              <FiHome />
              <h3>No properties yet</h3>
              <p>Add your first property using the form above.</p>
            </div>
          ) : (
            <div className="host-listing-grid">
              {listings.map((listing) => (
                <article className="host-listing-card" key={listing._id}>
                  <img
                    className="host-listing-image"
                    src={listing.image}
                    alt={listing.title}
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                  />

                  <div className="host-listing-content">
                    <span className="host-category">{listing.category}</span>

                    <h3>{listing.title}</h3>

                    <p className="host-listing-location">
                      <FiMapPin />
                      {listing.location}
                    </p>

                    <div className="host-listing-details">
                      <span>
                        <FiHome />
                        {listing.bedrooms} bedrooms
                      </span>

                      <span>
                        <FiUsers />
                        {listing.guests} guests
                      </span>
                    </div>

                    <p className="host-listing-price">
                      <FiDollarSign />₹
                      {Number(listing.price).toLocaleString("en-IN")}
                      <span>/ night</span>
                    </p>

                    <div className="host-listing-actions">
                      <button
                        type="button"
                        className="host-edit-button"
                        onClick={() => handleEdit(listing)}
                        disabled={Boolean(deletingId)}
                      >
                        <FiEdit2 />
                        Edit Property
                      </button>

                      <button
                        type="button"
                        className="host-delete-button"
                        onClick={() => handleDelete(listing)}
                        disabled={Boolean(deletingId)}
                      >
                        <FiTrash2 />
                        {deletingId === listing._id
                          ? "Deleting..."
                          : "Delete Property"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="host-footer">StayFinder · Host Dashboard</footer>
    </div>
  );
}

export default HostDashboard;
