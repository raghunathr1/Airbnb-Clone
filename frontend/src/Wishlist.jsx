import { Link } from "react-router-dom";
import { FiHeart, FiMapPin, FiStar, FiTrash2 } from "react-icons/fi";

import { useWishlist } from "./WishlistContext.jsx";

import "./Wishlist.css";

function Wishlist() {
  const { wishlist, removeFromWishlist } = useWishlist();

  return (
    <div className="wishlist-page">
      <header className="wishlist-header">
        <Link to="/" className="wishlist-brand">
          <FiMapPin size={25} />
          <span>airbnb</span>
        </Link>

        <Link to="/" className="wishlist-back-link">
          Explore stays
        </Link>
      </header>

      <main className="wishlist-container">
        <div className="wishlist-heading">
          <div>
            <h1>My Wishlist</h1>
            <p>Your favourite stays, all in one place.</p>
          </div>

          <span className="wishlist-count">
            {wishlist.length}{" "}
            {wishlist.length === 1 ? "property" : "properties"}
          </span>
        </div>

        {wishlist.length === 0 ? (
          <div className="wishlist-empty">
            <div className="wishlist-empty-icon">
              <FiHeart size={38} />
            </div>

            <h2>Your wishlist is waiting</h2>

            <p>
              Save properties you love by clicking the heart button on any
              property card.
            </p>

            <Link to="/" className="wishlist-explore-button">
              Explore properties
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlist.map((property) => (
              <article className="wishlist-card" key={property._id}>
                <Link
                  to={`/property/${property._id}`}
                  className="wishlist-image-link"
                >
                  <img
                    src={
                      property.image ||
                      "https://placehold.co/600x400?text=Property"
                    }
                    alt={property.title || "Property"}
                    className="wishlist-image"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src =
                        "https://placehold.co/600x400?text=Image+Unavailable";
                    }}
                  />
                </Link>

                <div className="wishlist-card-content">
                  <div className="wishlist-card-heading">
                    <h3>{property.location || "Location unavailable"}</h3>

                    <span className="wishlist-rating">
                      <FiStar size={15} />
                      {Number(property.rating) > 0
                        ? Number(property.rating).toFixed(1)
                        : "New"}
                    </span>
                  </div>

                  <p className="wishlist-property-title">
                    {property.title || "Beautiful stay"}
                  </p>

                  {property.category && (
                    <p className="wishlist-category">{property.category}</p>
                  )}

                  <p className="wishlist-price">
                    <strong>
                      ₹{Number(property.price || 0).toLocaleString("en-IN")}
                    </strong>{" "}
                    <span>/ night</span>
                  </p>

                  <div className="wishlist-card-actions">
                    <Link
                      to={`/property/${property._id}`}
                      className="wishlist-view-button"
                    >
                      View property
                    </Link>

                    <button
                      type="button"
                      className="wishlist-remove-button"
                      onClick={() => removeFromWishlist(property._id)}
                      aria-label={`Remove ${
                        property.title || "property"
                      } from wishlist`}
                      title="Remove from wishlist"
                    >
                      <FiTrash2 size={18} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Wishlist;
